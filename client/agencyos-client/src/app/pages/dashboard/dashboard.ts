import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, registerables, type Plugin, type TooltipItem } from 'chart.js';
import { catchError, forkJoin, of } from 'rxjs';

import { Client } from '../../models/client.model';
import { Project, ProjectStatus } from '../../models/project.model';
import { Task } from '../../models/task.model';
import { ClientService } from '../../services/client.service';
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';

type ActivityTone = 'blue' | 'green' | 'amber';
type ActivityIcon = 'approval' | 'client' | 'report';
type DeadlineUrgency = 'due-soon' | 'upcoming' | 'scheduled';
type MetricBadgeTone = 'positive' | 'neutral' | 'warning' | 'destructive';
type MetricIcon =
  | 'clients'
  | 'activeProjects'
  | 'completedProjects'
  | 'pendingTasks'
  | 'completedTasks';
type PerformanceRange = '30d' | '6w' | 'quarter';

Chart.register(...registerables);

interface ActivityItem {
  title: string;
  description: string;
  timestamp: string;
  tone: ActivityTone;
  icon: ActivityIcon;
}

interface DashboardDeadline {
  title: string;
  label: string;
  dueDate: string;
  urgency: DeadlineUrgency;
  urgencyLabel: string;
}

interface MetricBadge {
  text: string;
  tone: MetricBadgeTone;
}

interface DateBucket {
  endTime: number;
  label: string;
  startTime: number;
}

interface DashboardMetric {
  badge: MetricBadge | null;
  description: string;
  icon: MetricIcon;
  sparklineAreaPath: string;
  sparklineFillColor: string;
  sparklineLineColor: string;
  sparklineLinePath: string;
  sparklinePoints: MetricSparklinePoint[];
  supportingText: string;
  title: string;
  trend: MetricBadge;
  value: number;
}

interface DashboardMetricDefinition {
  badge: MetricBadge | null;
  description: string;
  icon: MetricIcon;
  lowerIsBetter?: boolean;
  series: number[];
  supportingText: string;
  title: string;
  value: number;
}

interface MetricSparklinePoint {
  formattedValue: string;
  hitWidth: number;
  hitX: number;
  index: number;
  label: string;
  tooltipX: number;
  tooltipY: number;
  value: number;
  x: number;
  y: number;
}

interface ProjectStatusSegment {
  color: string;
  count: number;
  label: 'Active' | 'Completed' | 'Pending' | 'Delayed';
  percentage: number;
}

interface AgencyInsight {
  label: string;
  meta: string;
  tone: MetricBadgeTone;
  value: string;
}

interface PerformanceSummaryStat {
  label: string;
  meta: string;
  value: string;
}

interface PerformanceRangeOption {
  label: string;
  value: PerformanceRange;
}

type PriorityActionIcon = 'alert' | 'calendar' | 'task' | 'milestone';

interface PriorityAction {
  badgeText: string;
  description: string;
  icon: PriorityActionIcon;
  route: string;
  title: string;
  tone: MetricBadgeTone;
}

interface WorkspaceHealthPoint {
  activeProjects: number;
  completionPercentage: number;
  dateLabel: string;
  index: number;
  tasksCompleted: number;
  tooltipX: number;
  tooltipY: number;
  value: number;
  x: number;
  y: number;
}

const performanceHoverGuidePlugin: Plugin<'line'> = {
  id: 'performanceHoverGuide',
  afterDatasetsDraw(chart) {
    const activeElements = chart.getActiveElements();

    if (activeElements.length === 0) {
      return;
    }

    const activePoint = activeElements[0]?.element;

    if (!activePoint) {
      return;
    }

    const { bottom, top } = chart.chartArea;
    const { ctx } = chart;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(229, 231, 235, 0.22)';
    ctx.moveTo(activePoint.x, top);
    ctx.lineTo(activePoint.x, bottom);
    ctx.stroke();

    for (const activeElement of activeElements) {
      const dataset = chart.data.datasets[activeElement.datasetIndex];
      const color = typeof dataset.borderColor === 'string' ? dataset.borderColor : '#7c9cff';
      const radius = dataset.label === 'Completed tasks' ? 4.4 : 3.6;

      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.shadowBlur = 8;
      ctx.shadowColor = color;
      ctx.fillStyle = '#e5e7eb';
      ctx.strokeStyle = color;
      ctx.lineWidth = dataset.label === 'Completed tasks' ? 2.2 : 1.8;
      ctx.arc(activeElement.element.x, activeElement.element.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  },
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('performanceChartCanvas')
  private performanceChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('projectStatusChartCanvas')
  private projectStatusChartCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly authService = inject(AuthService);
  private readonly clientService = inject(ClientService);
  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);
  private readonly currentUser = this.authService.getCurrentUser();
  private readonly analyticsWeeks = 6;
  private readonly workspaceHealthChartWidth = 280;
  private readonly workspaceHealthChartHeight = 68;
  private readonly workspaceHealthChartTop = 8;
  private readonly workspaceHealthChartBottom = 58;
  private readonly metricSparklineColors: Record<MetricIcon, { fill: string; line: string }> = {
    activeProjects: { fill: 'rgba(167, 139, 250, 0.1)', line: '#a78bfa' },
    clients: { fill: 'rgba(124, 156, 255, 0.1)', line: '#7c9cff' },
    completedProjects: { fill: 'rgba(52, 211, 153, 0.1)', line: '#34d399' },
    completedTasks: { fill: 'rgba(45, 212, 191, 0.1)', line: '#2dd4bf' },
    pendingTasks: { fill: 'rgba(251, 191, 36, 0.11)', line: '#fbbf24' },
  };

  clients: Client[] = [];
  projects: Project[] = [];
  tasks: Task[] = [];
  isLoading = true;
  errorMessage = '';
  selectedPerformanceRange: PerformanceRange = '6w';
  hoveredMetricSparkline: {
    metricTitle: string;
    point: MetricSparklinePoint;
  } | null = null;
  hoveredWorkspaceHealthPoint: WorkspaceHealthPoint | null = null;
  private performanceChart: Chart | null = null;
  private projectStatusChart: Chart | null = null;
  private chartRenderTimer: number | null = null;
  private hasApiError = false;

  readonly welcomeName = this.currentUser?.name.trim().split(/\s+/)[0] ?? 'there';
  readonly workspaceHealthGridLines = [17, 34, 51];
  readonly performanceRangeOptions: PerformanceRangeOption[] = [
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 6 weeks', value: '6w' },
    { label: 'Last quarter', value: 'quarter' },
  ];

  ngOnInit(): void {
    forkJoin({
      clients: this.clientService
        .getClients()
        .pipe(catchError(() => this.handleLoadError([] as Client[]))),
      projects: this.projectService
        .getProjects()
        .pipe(catchError(() => this.handleLoadError([] as Project[]))),
      tasks: this.taskService.getTasks().pipe(catchError(() => this.handleLoadError([] as Task[]))),
    }).subscribe({
      next: ({ clients, projects, tasks }) => {
        this.clients = clients;
        this.projects = projects;
        this.tasks = tasks;
        this.errorMessage = this.hasApiError
          ? 'Home data could not be loaded. Check that you are logged in and the backend is running.'
          : '';
        this.isLoading = false;
        this.scheduleAnalyticsChartsRender();
      },
      error: () => {
        this.errorMessage = 'Home data could not be loaded.';
        this.isLoading = false;
      },
    });
  }

  ngAfterViewInit(): void {
    this.scheduleAnalyticsChartsRender();
  }

  ngOnDestroy(): void {
    if (this.chartRenderTimer !== null) {
      window.clearTimeout(this.chartRenderTimer);
    }

    this.performanceChart?.destroy();
    this.projectStatusChart?.destroy();
  }

  get hasNoClients(): boolean {
    return !this.errorMessage && this.clients.length === 0;
  }

  get overviewSubtitle(): string {
    if (this.isLoading) {
      return 'Preparing a live view of client work, project delivery, and task momentum.';
    }

    return `Managing ${this.totalClients} clients, ${this.activeProjects} active projects, and ${this.pendingTasks} open tasks across the agency workspace.`;
  }

  get totalClients(): number {
    return this.clients.length;
  }

  get activeProjects(): number {
    return this.projects.filter((project) => project.status !== 'Completed').length;
  }

  get completedProjects(): number {
    return this.projects.filter((project) => project.status === 'Completed').length;
  }

  get pendingTasks(): number {
    return this.tasks.filter((task) => task.status !== 'Completed').length;
  }

  get completedTasks(): number {
    return this.tasks.filter((task) => task.status === 'Completed').length;
  }

  get delayedProjects(): number {
    return this.projects.filter(
      (project) => project.status !== 'Completed' && this.isPastDue(project.dueDate),
    ).length;
  }

  get dueSoonTasks(): number {
    return this.tasks.filter((task) => {
      if (task.status === 'Completed') {
        return false;
      }

      const daysUntilDue = this.getDaysUntilDue(task.dueDate);
      return daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;
    }).length;
  }

  get highPriorityOpenTasks(): number {
    return this.tasks.filter((task) => task.status !== 'Completed' && task.priority === 'High')
      .length;
  }

  get averageActiveProjectProgress(): number {
    const activeProjects = this.projects.filter((project) => project.status !== 'Completed');

    if (activeProjects.length === 0) {
      return 0;
    }

    return Math.round(
      activeProjects.reduce(
        (total, project) => total + Math.max(0, Math.min(100, project.progress)),
        0,
      ) / activeProjects.length,
    );
  }

  get dashboardMetrics(): DashboardMetric[] {
    const buckets = this.getRecentWeekBuckets();
    const labels = buckets.map((bucket) => bucket.label);

    return this.getDashboardMetricDefinitions(buckets).map((metric) => {
      const series = this.getMetricSeriesEndingAtCurrentValue(metric.series, metric.value);

      return {
        badge: metric.badge,
        description: metric.description,
        icon: metric.icon,
        supportingText: metric.supportingText,
        title: metric.title,
        trend: this.getMetricTrendFromSeries(series, metric.lowerIsBetter),
        value: metric.value,
        ...this.getMetricSparkline(metric.icon, series, labels),
      };
    });
  }

  private getDashboardMetricDefinitions(buckets: DateBucket[]): DashboardMetricDefinition[] {
    return [
      {
        badge: this.totalClientsBadge,
        description: this.totalClientsCopy,
        icon: 'clients',
        series: this.getMetricSparklineValues('clients', buckets),
        supportingText: `${this.clients.filter((client) => client.status === 'Active').length} active accounts`,
        title: 'Total clients',
        value: this.totalClients,
      },
      {
        badge: this.activeProjectsBadge,
        description: this.activeProjectsCopy,
        icon: 'activeProjects',
        series: this.getMetricSparklineValues('activeProjects', buckets),
        supportingText: `${this.averageActiveProjectProgress}% avg progress`,
        title: 'Active projects',
        value: this.activeProjects,
      },
      {
        badge: this.completedProjectsBadge,
        description: this.completedProjectsCopy,
        icon: 'completedProjects',
        series: this.getMetricSparklineValues('completedProjects', buckets),
        supportingText: `${this.projectCompletionRate}% delivery rate`,
        title: 'Completed projects',
        value: this.completedProjects,
      },
      {
        badge: this.pendingTasksBadge,
        description: this.pendingTasksCopy,
        icon: 'pendingTasks',
        lowerIsBetter: true,
        series: this.getMetricSparklineValues('pendingTasks', buckets),
        supportingText: `${this.dueSoonTasks} due this week`,
        title: 'Pending tasks',
        value: this.pendingTasks,
      },
      {
        badge: this.completedTasksBadge,
        description: this.completedTasksCopy,
        icon: 'completedTasks',
        series: this.getMetricSparklineValues('completedTasks', buckets),
        supportingText: `${this.taskCompletionRate}% completion rate`,
        title: 'Completed tasks',
        value: this.completedTasks,
      },
    ];
  }

  get taskCompletionRate(): number {
    if (this.tasks.length === 0) {
      return 0;
    }

    return Math.round((this.completedTasks / this.tasks.length) * 100);
  }

  get averageTaskCompletionTime(): string {
    const durations = this.tasks
      .filter((task) => task.status === 'Completed')
      .map((task) => {
        const startedAt = this.parseDate(task.createdAt);
        const completedAt = this.parseDate(task.completedAt || task.updatedAt || task.dueDate);

        if (!startedAt || !completedAt || completedAt.getTime() < startedAt.getTime()) {
          return null;
        }

        return (completedAt.getTime() - startedAt.getTime()) / 86_400_000;
      })
      .filter((duration): duration is number => duration !== null);

    if (durations.length === 0) {
      return 'N/A';
    }

    const averageDays =
      durations.reduce((total, duration) => total + duration, 0) / durations.length;

    if (averageDays < 1) {
      return '<1d';
    }

    return averageDays < 10 ? `${averageDays.toFixed(1)}d` : `${Math.round(averageDays)}d`;
  }

  get projectCompletionRate(): number {
    if (this.projects.length === 0) {
      return 0;
    }

    return Math.round((this.completedProjects / this.projects.length) * 100);
  }

  get taskCompletionCopy(): string {
    if (this.tasks.length === 0) {
      return 'No tasks yet. Create your first task to get started.';
    }

    return `${this.completedTasks} of ${this.tasks.length} tasks completed`;
  }

  get workspaceCompletionRate(): number {
    return this.taskCompletionRate;
  }

  get workspaceHealthStatusLabel(): string {
    return 'On track';
  }

  get workspaceHealthStatusTone(): MetricBadgeTone {
    return 'positive';
  }

  get workspaceHealthTrendBadge(): MetricBadge {
    const currentPeriodScore = this.getWorkspaceActivityScoreBetween(0, 29);
    const previousPeriodScore = this.getWorkspaceActivityScoreBetween(30, 59);
    const trendPercent = this.getPercentChange(currentPeriodScore, previousPeriodScore);

    return {
      text: `${trendPercent >= 0 ? '+' : ''}${trendPercent}% vs last month`,
      tone: trendPercent < 0 ? 'destructive' : trendPercent > 0 ? 'positive' : 'neutral',
    };
  }

  get workspaceHealthStats(): Array<{ label: string; value: number }> {
    return [
      { label: 'Active Projects', value: this.activeProjects },
      { label: 'Total Clients', value: this.totalClients },
      { label: 'Pending Tasks', value: this.pendingTasks },
    ];
  }

  get workspaceHealthLinePath(): string {
    return this.buildSmoothChartPath(this.workspaceHealthPoints);
  }

  get workspaceHealthAreaPath(): string {
    const points = this.workspaceHealthPoints;
    const linePath = this.buildSmoothChartPath(points);
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    if (!firstPoint || !lastPoint) {
      return '';
    }

    return `${linePath} L ${this.formatChartNumber(lastPoint.x)} ${this.workspaceHealthChartHeight} L ${this.formatChartNumber(
      firstPoint.x,
    )} ${this.workspaceHealthChartHeight} Z`;
  }

  get workspaceHealthPoints(): WorkspaceHealthPoint[] {
    const samples = this.getWorkspaceHealthSamples();
    const values = samples.map((sample) => sample.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    const chartRange = this.workspaceHealthChartBottom - this.workspaceHealthChartTop;

    return samples.map((sample, index) => {
      const value = sample.value;
      const progress = (value - minValue) / valueRange;
      const x = (index / Math.max(1, values.length - 1)) * this.workspaceHealthChartWidth;
      const y = this.workspaceHealthChartBottom - progress * chartRange;

      return {
        activeProjects: sample.activeProjects,
        completionPercentage: sample.completionPercentage,
        dateLabel: this.formatWorkspaceHealthDate(sample.date),
        index,
        tasksCompleted: sample.tasksCompleted,
        tooltipX: Math.min(86, Math.max(14, (x / this.workspaceHealthChartWidth) * 100)),
        tooltipY: Math.min(78, Math.max(20, (y / this.workspaceHealthChartHeight) * 100)),
        value,
        x,
        y,
      };
    });
  }

  get totalClientsCopy(): string {
    return this.totalClients === 1 ? '1 total client.' : `${this.totalClients} total clients.`;
  }

  get activeProjectsCopy(): string {
    return `${this.activeProjects} active ${this.activeProjects === 1 ? 'project' : 'projects'}.`;
  }

  get completedProjectsCopy(): string {
    return `${this.completedProjects} completed ${this.completedProjects === 1 ? 'project' : 'projects'}.`;
  }

  get pendingTasksCopy(): string {
    return `${this.pendingTasks} pending ${this.pendingTasks === 1 ? 'task' : 'tasks'}.`;
  }

  get completedTasksCopy(): string {
    return `${this.completedTasks} completed ${this.completedTasks === 1 ? 'task' : 'tasks'}.`;
  }

  get totalClientsBadge(): MetricBadge | null {
    const clientsCreatedThisMonth = this.clients.filter((client) =>
      this.isCurrentMonth(client.createdAt),
    ).length;

    return clientsCreatedThisMonth > 0
      ? { text: `+${clientsCreatedThisMonth} this month`, tone: 'positive' }
      : null;
  }

  get activeProjectsBadge(): MetricBadge | null {
    const activeProjects = this.projects.filter((project) => project.status !== 'Completed');

    if (activeProjects.length === 0) {
      return null;
    }

    const projectsWithValidDueDates = activeProjects.filter(
      (project) => this.getDaysUntilDue(project.dueDate) !== null,
    );

    if (projectsWithValidDueDates.length === 0) {
      return null;
    }

    const overdueProjects = projectsWithValidDueDates.filter((project) => {
      const daysUntilDue = this.getDaysUntilDue(project.dueDate);
      return daysUntilDue !== null && daysUntilDue < 0;
    }).length;

    if (overdueProjects > 0) {
      return {
        text: overdueProjects === 1 ? '1 overdue' : `${overdueProjects} overdue`,
        tone: 'warning',
      };
    }

    return { text: 'On track', tone: 'positive' };
  }

  get completedProjectsBadge(): MetricBadge | null {
    const projectsCompletedThisMonth = this.projects.filter(
      (project) =>
        project.status === 'Completed' &&
        this.isCurrentMonth(project.updatedAt || project.createdAt),
    ).length;

    return projectsCompletedThisMonth > 0
      ? { text: `+${projectsCompletedThisMonth} this month`, tone: 'positive' }
      : null;
  }

  get pendingTasksBadge(): MetricBadge | null {
    const pendingTasks = this.tasks.filter((task) => task.status !== 'Completed');

    if (pendingTasks.length === 0) {
      return null;
    }

    const urgentTasks = pendingTasks.filter((task) => {
      const daysUntilDue = this.getDaysUntilDue(task.dueDate);
      return task.priority === 'High' || (daysUntilDue !== null && daysUntilDue <= 0);
    }).length;

    if (urgentTasks > 0) {
      return { text: 'Needs attention', tone: 'warning' };
    }

    const dueSoonTasks = pendingTasks.filter((task) => {
      const daysUntilDue = this.getDaysUntilDue(task.dueDate);
      return daysUntilDue !== null && daysUntilDue <= 3;
    }).length;

    return dueSoonTasks > 0 ? { text: `${dueSoonTasks} due soon`, tone: 'warning' } : null;
  }

  get completedTasksBadge(): MetricBadge | null {
    if (this.tasks.length === 0 || this.completedTasks === 0) {
      return null;
    }

    return { text: `${this.taskCompletionRate}%`, tone: 'positive' };
  }

  get performanceTrendBadge(): MetricBadge {
    return this.getMetricTrend(
      this.getCompletedTaskCountBetween(0, 29),
      this.getCompletedTaskCountBetween(30, 59),
    );
  }

  get selectedPerformanceRangeLabel(): string {
    return (
      this.performanceRangeOptions.find((option) => option.value === this.selectedPerformanceRange)
        ?.label ?? 'Last 6 weeks'
    );
  }

  get performanceSummaryStats(): PerformanceSummaryStat[] {
    const series = this.getPerformanceSeries();
    const completedTasks = series.completedTasks.reduce((total, value) => total + value, 0);
    const projectUpdates = series.projectUpdates.reduce((total, value) => total + value, 0);

    return [
      {
        label: 'Completed tasks',
        meta: this.selectedPerformanceRangeLabel.toLowerCase(),
        value: completedTasks.toLocaleString('en-US'),
      },
      {
        label: 'Project updates',
        meta: 'delivery events',
        value: projectUpdates.toLocaleString('en-US'),
      },
      {
        label: 'Delivery rate',
        meta: 'task completion',
        value: `${this.taskCompletionRate}%`,
      },
      {
        label: 'Avg completion',
        meta: 'cycle time',
        value: this.averageTaskCompletionTime,
      },
    ];
  }

  get priorityActions(): PriorityAction[] {
    const overdueProjects = this.getOverdueProjects();
    const nextDeadline = this.getNextPriorityDeadline();
    const highPriorityTasks = this.highPriorityOpenTasks;
    const completedThisWeek = this.getCompletedTaskCountBetween(0, 6);

    return [
      {
        badgeText: overdueProjects.length === 1 ? '1 overdue' : `${overdueProjects.length} overdue`,
        description:
          overdueProjects.length > 0
            ? `${overdueProjects[0]?.name} requires attention`
            : 'No active projects are past due',
        icon: 'alert',
        route: '/projects',
        title: 'Overdue projects',
        tone: overdueProjects.length > 0 ? 'destructive' : 'positive',
      },
      {
        badgeText: nextDeadline?.urgencyLabel ?? 'Clear',
        description: nextDeadline ? `${nextDeadline.label} deadline` : 'No upcoming deadlines',
        icon: 'calendar',
        route: nextDeadline?.label === 'Task' ? '/tasks' : '/projects',
        title: nextDeadline?.title ?? 'Upcoming deadlines',
        tone: nextDeadline
          ? nextDeadline.urgency === 'due-soon'
            ? 'warning'
            : 'neutral'
          : 'positive',
      },
      {
        badgeText: highPriorityTasks > 0 ? `${highPriorityTasks} open` : 'Clear',
        description:
          highPriorityTasks > 0
            ? `${highPriorityTasks} high-priority ${highPriorityTasks === 1 ? 'task' : 'tasks'} remaining`
            : 'No urgent tasks in queue',
        icon: 'task',
        route: '/tasks',
        title: 'High-priority tasks',
        tone: highPriorityTasks > 0 ? 'warning' : 'positive',
      },
      {
        badgeText: `+${completedThisWeek}`,
        description: `${completedThisWeek} ${completedThisWeek === 1 ? 'task' : 'tasks'} completed this week`,
        icon: 'milestone',
        route: '/tasks',
        title: 'Completed milestone',
        tone: 'positive',
      },
    ];
  }

  get projectStatusSegments(): ProjectStatusSegment[] {
    const delayedProjectIds = new Set(
      this.projects
        .filter((project) => project.status !== 'Completed' && this.isPastDue(project.dueDate))
        .map((project) => this.getProjectKey(project)),
    );
    const segments: Omit<ProjectStatusSegment, 'percentage'>[] = [
      {
        color: '#7c9cff',
        count: this.projects.filter(
          (project) =>
            project.status !== 'Completed' &&
            project.status !== 'Planning' &&
            !delayedProjectIds.has(this.getProjectKey(project)),
        ).length,
        label: 'Active',
      },
      {
        color: '#34d399',
        count: this.completedProjects,
        label: 'Completed',
      },
      {
        color: '#a78bfa',
        count: this.projects.filter(
          (project) =>
            project.status === 'Planning' && !delayedProjectIds.has(this.getProjectKey(project)),
        ).length,
        label: 'Pending',
      },
      {
        color: '#fbbf24',
        count: delayedProjectIds.size,
        label: 'Delayed',
      },
    ];
    const total = segments.reduce((sum, segment) => sum + segment.count, 0);

    return segments.map((segment) => ({
      ...segment,
      percentage: total === 0 ? 0 : Math.round((segment.count / total) * 100),
    }));
  }

  get agencyInsights(): AgencyInsight[] {
    return [
      {
        label: 'Client growth',
        meta: 'New accounts in the last 30 days',
        tone: 'positive',
        value: `+${this.getCreatedClientCountBetween(0, 29)}`,
      },
      {
        label: 'Project health',
        meta:
          this.delayedProjects === 0
            ? 'No delayed active projects'
            : `${this.delayedProjects} delayed projects`,
        tone: this.delayedProjects === 0 ? 'positive' : 'warning',
        value: `${Math.max(0, 100 - Math.round((this.delayedProjects / Math.max(1, this.activeProjects)) * 100))}%`,
      },
      {
        label: 'Workload focus',
        meta: `${this.highPriorityOpenTasks} high-priority open tasks`,
        tone: this.highPriorityOpenTasks > 4 ? 'warning' : 'neutral',
        value: `${this.dueSoonTasks}`,
      },
    ];
  }

  get insightHeadline(): string {
    return `${this.taskCompletionRate}% completion rate`;
  }

  get insightSummary(): string {
    if (this.delayedProjects > 0) {
      return `${this.delayedProjects} active ${this.delayedProjects === 1 ? 'project requires' : 'projects require'} attention while overall delivery remains on track.`;
    }

    return `Delivery is moving cleanly with ${this.completedTasks} completed tasks and no delayed active projects.`;
  }

  get recentActivity(): ActivityItem[] {
    const activity: ActivityItem[] = [];
    const latestClient = this.clients[0];
    const activeProject = this.projects.find((project) => project.status !== 'Completed');
    const completedTask = this.tasks.find((task) => task.status === 'Completed');

    if (latestClient) {
      activity.push({
        title: 'Client created',
        description: `Added ${latestClient.name} to your workspace.`,
        timestamp: latestClient.lastContact,
        tone: 'green',
        icon: 'client',
      });
    }

    if (activeProject) {
      activity.push({
        title: 'Project created',
        description: 'Created a new project.',
        timestamp: activeProject.dueDate,
        tone: 'blue',
        icon: 'approval',
      });
    }

    if (completedTask) {
      activity.push({
        title: 'Task completed',
        description: 'Marked a task as complete.',
        timestamp: completedTask.dueDate,
        tone: 'amber',
        icon: 'report',
      });
    }

    return activity.slice(0, 3);
  }

  get upcomingDeadlines(): DashboardDeadline[] {
    return [
      ...this.projects
        .filter((project) => project.status !== 'Completed')
        .map((project) => ({
          title: project.name,
          label: 'Project',
          dueDate: project.dueDate,
          ...this.getDeadlineMeta(project.dueDate),
        })),
      ...this.tasks
        .filter((task) => task.status !== 'Completed')
        .map((task) => ({
          title: task.title,
          label: 'Task',
          dueDate: task.dueDate,
          ...this.getDeadlineMeta(task.dueDate),
        })),
    ].slice(0, 5);
  }

  get projectStatusOverview(): Array<{ status: ProjectStatus; count: number }> {
    const statuses: ProjectStatus[] = ['Planning', 'In Progress', 'Review', 'Completed'];

    return statuses.map((status) => ({
      status,
      count: this.projects.filter((project) => project.status === status).length,
    }));
  }

  get projectStatusTotal(): number {
    return this.projects.length;
  }

  onPerformanceRangeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    if (!this.isPerformanceRange(value) || value === this.selectedPerformanceRange) {
      return;
    }

    this.selectedPerformanceRange = value;
    this.renderPerformanceChart();
  }

  private scheduleAnalyticsChartsRender(): void {
    if (typeof window === 'undefined' || this.isLoading || this.errorMessage || this.hasNoClients) {
      return;
    }

    if (this.chartRenderTimer !== null) {
      window.clearTimeout(this.chartRenderTimer);
    }

    this.chartRenderTimer = window.setTimeout(() => {
      this.chartRenderTimer = null;
      this.renderAnalyticsCharts();
    }, 0);
  }

  private renderAnalyticsCharts(): void {
    this.renderPerformanceChart();
    this.renderProjectStatusChart();
  }

  private renderPerformanceChart(): void {
    const canvas = this.performanceChartCanvas?.nativeElement;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    const series = this.getPerformanceSeries();
    const chartHeight = canvas.clientHeight || 260;
    const completedTasksGradient = context.createLinearGradient(0, 0, 0, chartHeight);
    completedTasksGradient.addColorStop(0, 'rgba(124, 156, 255, 0.14)');
    completedTasksGradient.addColorStop(0.5, 'rgba(124, 156, 255, 0.06)');
    completedTasksGradient.addColorStop(1, 'rgba(124, 156, 255, 0)');

    const projectUpdatesGradient = context.createLinearGradient(0, 0, 0, chartHeight);
    projectUpdatesGradient.addColorStop(0, 'rgba(52, 211, 153, 0.12)');
    projectUpdatesGradient.addColorStop(0.5, 'rgba(52, 211, 153, 0.05)');
    projectUpdatesGradient.addColorStop(1, 'rgba(52, 211, 153, 0)');

    if (this.performanceChart) {
      this.performanceChart.data.labels = series.labels;
      this.performanceChart.data.datasets[0].data = series.completedTasks;
      this.performanceChart.data.datasets[0].backgroundColor = completedTasksGradient;
      this.performanceChart.data.datasets[1].data = series.projectUpdates;
      this.performanceChart.data.datasets[1].backgroundColor = projectUpdatesGradient;
      this.performanceChart.update();
      return;
    }

    this.performanceChart = new Chart(context, {
      type: 'line',
      data: {
        labels: series.labels,
        datasets: [
          {
            label: 'Completed tasks',
            data: series.completedTasks,
            backgroundColor: completedTasksGradient,
            borderCapStyle: 'round',
            borderColor: '#7c9cff',
            borderJoinStyle: 'round',
            borderWidth: 2.1,
            fill: true,
            order: 1,
            pointBackgroundColor: '#e5e7eb',
            pointBorderColor: '#7c9cff',
            pointHitRadius: 16,
            pointHoverBackgroundColor: '#e5e7eb',
            pointHoverBorderWidth: 2,
            pointHoverRadius: 0,
            pointRadius: 0,
            tension: 0.4,
          },
          {
            label: 'Project updates',
            data: series.projectUpdates,
            backgroundColor: projectUpdatesGradient,
            borderCapStyle: 'round',
            borderColor: '#34d399',
            borderJoinStyle: 'round',
            borderWidth: 1.45,
            fill: true,
            order: 2,
            pointBackgroundColor: '#e5e7eb',
            pointBorderColor: '#34d399',
            pointHitRadius: 16,
            pointHoverBackgroundColor: '#e5e7eb',
            pointHoverBorderWidth: 2,
            pointHoverRadius: 0,
            pointRadius: 0,
            tension: 0.36,
          },
        ],
      },
      plugins: [performanceHoverGuidePlugin],
      options: {
        animation: {
          duration: 820,
          easing: 'easeOutCubic',
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(10, 11, 15, 0.96)',
            borderColor: 'rgba(229, 231, 235, 0.14)',
            borderWidth: 1,
            bodyColor: '#d6dcf5',
            bodyFont: {
              size: 12,
              weight: 700,
            },
            bodySpacing: 4,
            boxHeight: 7,
            boxPadding: 4,
            boxWidth: 7,
            callbacks: {
              label: (context: TooltipItem<'line'>) => {
                const value =
                  typeof context.parsed.y === 'number'
                    ? context.parsed.y.toLocaleString('en-US')
                    : '0';

                return `${context.dataset.label}: ${value}`;
              },
              title: (items: TooltipItem<'line'>[]) => items[0]?.label ?? '',
            },
            caretPadding: 8,
            caretSize: 6,
            cornerRadius: 9,
            displayColors: true,
            itemSort: (first, second) => first.datasetIndex - second.datasetIndex,
            padding: 10,
            titleColor: '#f8fafc',
            titleFont: {
              size: 12,
              weight: 900,
            },
            titleMarginBottom: 6,
            usePointStyle: true,
          },
        },
        responsive: true,
        scales: {
          x: {
            border: {
              display: false,
            },
            grid: {
              display: false,
            },
            ticks: {
              color: '#8ea0bc',
              font: {
                size: 11,
                weight: 800,
              },
              maxTicksLimit: 5,
            },
          },
          y: {
            beginAtZero: true,
            border: {
              display: false,
            },
            grid: {
              color: 'rgba(229, 231, 235, 0.09)',
            },
            ticks: {
              display: false,
            },
          },
        },
      },
    });
  }

  private renderProjectStatusChart(): void {
    const canvas = this.projectStatusChartCanvas?.nativeElement;
    const context = canvas?.getContext('2d');

    if (!context) {
      return;
    }

    const segments = this.projectStatusSegments;

    this.projectStatusChart?.destroy();
    this.projectStatusChart = new Chart(context, {
      type: 'doughnut',
      data: {
        labels: segments.map((segment) => segment.label),
        datasets: [
          {
            data: segments.map((segment) => segment.count),
            backgroundColor: segments.map((segment) => segment.color),
            borderColor: '#11151d',
            borderWidth: 4,
            hoverBorderColor: '#161b25',
            hoverOffset: 3,
          },
        ],
      },
      options: {
        animation: {
          duration: 760,
          easing: 'easeOutCubic',
        },
        cutout: '72%',
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(10, 11, 15, 0.96)',
            borderColor: 'rgba(229, 231, 235, 0.14)',
            borderWidth: 1,
            bodyColor: '#c7d2fe',
            displayColors: false,
            padding: 10,
            titleColor: '#e5e7eb',
          },
        },
        responsive: true,
      },
    });
  }

  private getPerformanceSeries(): {
    completedTasks: number[];
    labels: string[];
    projectUpdates: number[];
  } {
    const buckets = this.getPerformanceBuckets();

    return {
      completedTasks: this.getBucketedCounts(
        this.tasks
          .filter((task) => task.status === 'Completed')
          .map((task) => this.getTaskActivityDate(task)),
        buckets,
      ),
      labels: buckets.map((bucket) => bucket.label),
      projectUpdates: this.getBucketedCounts(
        this.projects.map((project) =>
          this.parseDate(project.updatedAt || project.createdAt || project.dueDate),
        ),
        buckets,
      ),
    };
  }

  private getOverdueProjects(): Project[] {
    return this.projects
      .filter((project) => project.status !== 'Completed' && this.isPastDue(project.dueDate))
      .sort((projectA, projectB) => {
        const projectADueDate =
          this.parseDate(projectA.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const projectBDueDate =
          this.parseDate(projectB.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;

        return projectADueDate - projectBDueDate;
      });
  }

  private getNextPriorityDeadline(): DashboardDeadline | null {
    const upcomingItems = [
      ...this.projects
        .filter((project) => project.status !== 'Completed')
        .map((project) => ({
          dueTime: this.parseDate(project.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER,
          item: {
            title: project.name,
            label: 'Project',
            dueDate: project.dueDate,
            ...this.getDeadlineMeta(project.dueDate),
          },
        })),
      ...this.tasks
        .filter((task) => task.status !== 'Completed')
        .map((task) => ({
          dueTime: this.parseDate(task.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER,
          item: {
            title: task.title,
            label: 'Task',
            dueDate: task.dueDate,
            ...this.getDeadlineMeta(task.dueDate),
          },
        })),
    ].filter((entry) => {
      const daysUntilDue = this.getDaysUntilDue(entry.item.dueDate);
      return daysUntilDue !== null && daysUntilDue >= 0;
    });

    upcomingItems.sort((itemA, itemB) => itemA.dueTime - itemB.dueTime);

    return upcomingItems[0]?.item ?? null;
  }

  private getMetricTrend(
    currentValue: number,
    previousValue: number,
    lowerIsBetter = false,
  ): MetricBadge {
    const trendPercent = this.getPercentChange(currentValue, previousValue);

    return {
      text: `${trendPercent >= 0 ? '+' : ''}${trendPercent}%`,
      tone:
        trendPercent === 0
          ? 'neutral'
          : lowerIsBetter
            ? trendPercent < 0
              ? 'positive'
              : 'destructive'
            : trendPercent > 0
              ? 'positive'
              : 'destructive',
    };
  }

  private getMetricTrendFromSeries(values: number[], lowerIsBetter = false): MetricBadge {
    const safeValues = values.length > 0 ? values : [0, 0];
    const firstValue = safeValues[0] ?? 0;
    const lastValue = safeValues[safeValues.length - 1] ?? firstValue;

    return this.getMetricTrend(lastValue, firstValue, lowerIsBetter);
  }

  private getPercentChange(currentValue: number, previousValue: number): number {
    if (previousValue === 0) {
      return currentValue > 0 ? 100 : 0;
    }

    return Math.round(((currentValue - previousValue) / previousValue) * 100);
  }

  private getMetricSparkline(
    kind: MetricIcon,
    values: number[],
    labels: string[],
  ): Pick<
    DashboardMetric,
    | 'sparklineAreaPath'
    | 'sparklineFillColor'
    | 'sparklineLineColor'
    | 'sparklineLinePath'
    | 'sparklinePoints'
  > {
    const colors = this.metricSparklineColors[kind];

    return {
      ...this.buildSparkline(values, labels),
      sparklineFillColor: colors.fill,
      sparklineLineColor: colors.line,
    };
  }

  private getMetricSparklineValues(kind: MetricIcon, buckets: DateBucket[]): number[] {
    switch (kind) {
      case 'clients':
        return buckets.map(
          (bucket) =>
            this.clients.filter((client) => {
              const createdDate = this.parseDate(client.createdAt || client.lastContact);
              return this.isKnownByDate(createdDate, bucket.endTime);
            }).length,
        );
      case 'activeProjects':
        return buckets.map(
          (bucket) =>
            this.projects.filter((project) => this.isProjectActiveOnDate(project, bucket.endTime))
              .length,
        );
      case 'completedProjects':
        return buckets.map(
          (bucket) =>
            this.projects.filter((project) => {
              if (project.status !== 'Completed') {
                return false;
              }

              const completedDate = this.parseDate(
                project.updatedAt || project.createdAt || project.dueDate,
              );
              return this.isKnownByDate(completedDate, bucket.endTime);
            }).length,
        );
      case 'pendingTasks':
        return buckets.map(
          (bucket) =>
            this.tasks.filter((task) => this.isTaskPendingOnDate(task, bucket.endTime)).length,
        );
      case 'completedTasks':
        return buckets.map(
          (bucket) =>
            this.tasks.filter((task) => {
              if (task.status !== 'Completed') {
                return false;
              }

              return this.isKnownByDate(this.getTaskActivityDate(task), bucket.endTime);
            }).length,
        );
    }
  }

  private getMetricSeriesEndingAtCurrentValue(series: number[], currentValue: number): number[] {
    const values = series.length > 0 ? series.map((value) => Math.max(0, value)) : [currentValue];

    if (values.length === 1) {
      values.unshift(currentValue);
    }

    values[values.length - 1] = currentValue;

    return this.getPercentChange(values[values.length - 1] ?? 0, values[0] ?? 0) === 0
      ? values.map(() => currentValue)
      : values;
  }

  private buildSparkline(
    values: number[],
    labels: string[],
  ): Pick<DashboardMetric, 'sparklineAreaPath' | 'sparklineLinePath' | 'sparklinePoints'> {
    const width = 108;
    const height = 30;
    const padding = 3;
    const safeValues = values.length > 0 ? values : [0, 0];
    const minValue = Math.min(...safeValues);
    const maxValue = Math.max(...safeValues);
    const hasRange = maxValue !== minValue;
    const range = hasRange ? maxValue - minValue : 1;
    const points = safeValues.map((value, index) => ({
      x: padding + (index / Math.max(1, safeValues.length - 1)) * (width - padding * 2),
      y: hasRange ? height - padding - ((value - minValue) / range) * (height - padding * 2) : height / 2,
    }));
    const hitWidth = width / Math.max(1, safeValues.length);
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const linePath = points
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${this.formatChartNumber(point.x)} ${this.formatChartNumber(point.y)}`,
      )
      .join(' ');

    return {
      sparklineAreaPath: `${linePath} L ${this.formatChartNumber(lastPoint.x)} ${height - padding} L ${this.formatChartNumber(
        firstPoint.x,
      )} ${height - padding} Z`,
      sparklineLinePath: linePath,
      sparklinePoints: points.map((point, index) => ({
        formattedValue: safeValues[index].toLocaleString('en-US'),
        hitWidth,
        hitX: Math.max(0, Math.min(width - hitWidth, point.x - hitWidth / 2)),
        index,
        label: labels[index] || `Period ${index + 1}`,
        tooltipX: Math.max(18, Math.min(82, (point.x / width) * 100)),
        tooltipY: Math.max(14, Math.min(86, (point.y / height) * 100)),
        value: safeValues[index],
        x: point.x,
        y: point.y,
      })),
    };
  }

  private getPerformanceBuckets(): DateBucket[] {
    switch (this.selectedPerformanceRange) {
      case '30d':
        return this.getRecentDayBuckets(30).map((bucket) => ({
          endTime: bucket.endTime,
          label: bucket.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          startTime: bucket.startTime,
        }));
      case 'quarter':
        return this.getRecentWeekBuckets(13);
      case '6w':
      default:
        return this.getRecentWeekBuckets(this.analyticsWeeks);
    }
  }

  private getRecentWeekBuckets(weeks = this.analyticsWeeks): DateBucket[] {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    todayStart.setDate(todayStart.getDate() - (weeks - 1) * 7);

    return Array.from({ length: weeks }, (_, index) => {
      const start = new Date(todayStart);
      start.setDate(todayStart.getDate() + index * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      return {
        endTime: end.getTime(),
        label: start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        startTime: start.getTime(),
      };
    });
  }

  private getWeeklyCounts(dates: Array<Date | null>, buckets: DateBucket[]): number[] {
    return this.getBucketedCounts(dates, buckets);
  }

  private getBucketedCounts(dates: Array<Date | null>, buckets: DateBucket[]): number[] {
    return buckets.map(
      (bucket) =>
        dates.filter(
          (date) =>
            date !== null && date.getTime() >= bucket.startTime && date.getTime() <= bucket.endTime,
        ).length,
    );
  }

  private isPerformanceRange(value: string): value is PerformanceRange {
    return this.performanceRangeOptions.some((option) => option.value === value);
  }

  private getCreatedClientCountBetween(startDaysAgo: number, endDaysAgo: number): number {
    return this.getCountBetween(
      this.clients,
      (client) => this.parseDate(client.createdAt || client.lastContact),
      startDaysAgo,
      endDaysAgo,
    );
  }

  private getCreatedProjectCountBetween(
    startDaysAgo: number,
    endDaysAgo: number,
    includeCompleted = true,
  ): number {
    return this.getCountBetween(
      this.projects.filter((project) => includeCompleted || project.status !== 'Completed'),
      (project) => this.parseDate(project.createdAt || project.dueDate),
      startDaysAgo,
      endDaysAgo,
    );
  }

  private getCompletedProjectCountBetween(startDaysAgo: number, endDaysAgo: number): number {
    return this.getCountBetween(
      this.projects.filter((project) => project.status === 'Completed'),
      (project) => this.parseDate(project.updatedAt || project.createdAt || project.dueDate),
      startDaysAgo,
      endDaysAgo,
    );
  }

  private getPendingTaskCountBetween(startDaysAgo: number, endDaysAgo: number): number {
    return this.getCountBetween(
      this.tasks.filter((task) => task.status !== 'Completed'),
      (task) => this.parseDate(task.createdAt || task.dueDate),
      startDaysAgo,
      endDaysAgo,
    );
  }

  private getCountBetween<T>(
    items: T[],
    getDate: (item: T) => Date | null,
    startDaysAgo: number,
    endDaysAgo: number,
  ): number {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startTime = todayStart.getTime() - endDaysAgo * 86_400_000;
    const endTime = todayStart.getTime() - startDaysAgo * 86_400_000;

    return items.filter((item) => {
      const date = getDate(item);

      if (!date) {
        return false;
      }

      const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      return day >= startTime && day <= endTime;
    }).length;
  }

  private isPastDue(dateValue: string): boolean {
    const daysUntilDue = this.getDaysUntilDue(dateValue);
    return daysUntilDue !== null && daysUntilDue < 0;
  }

  private getProjectKey(project: Project): string {
    return project._id || `${project.id}-${project.name}`;
  }

  private parseDate(dateValue?: string): Date | null {
    if (!dateValue) {
      return null;
    }

    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getDeadlineMeta(dueDate: string): Pick<DashboardDeadline, 'urgency' | 'urgencyLabel'> {
    const daysUntilDue = this.getDaysUntilDue(dueDate);

    if (daysUntilDue === null) {
      return { urgency: 'scheduled', urgencyLabel: 'Scheduled' };
    }

    if (daysUntilDue <= 0) {
      return { urgency: 'due-soon', urgencyLabel: daysUntilDue === 0 ? 'Due today' : 'Overdue' };
    }

    if (daysUntilDue <= 3) {
      return { urgency: 'due-soon', urgencyLabel: `Due in ${daysUntilDue}d` };
    }

    if (daysUntilDue <= 10) {
      return { urgency: 'upcoming', urgencyLabel: `Due in ${daysUntilDue}d` };
    }

    return { urgency: 'scheduled', urgencyLabel: 'Scheduled' };
  }

  private getDaysUntilDue(dueDate: string): number | null {
    const due = new Date(dueDate);

    if (Number.isNaN(due.getTime())) {
      return null;
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    return Math.ceil((dueStart.getTime() - todayStart.getTime()) / 86_400_000);
  }

  private isCurrentMonth(dateValue?: string): boolean {
    if (!dateValue) {
      return false;
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  setHoveredWorkspaceHealthPoint(point: WorkspaceHealthPoint): void {
    this.hoveredWorkspaceHealthPoint = point;
  }

  clearHoveredWorkspaceHealthPoint(): void {
    this.hoveredWorkspaceHealthPoint = null;
  }

  setHoveredMetricSparklinePoint(metric: DashboardMetric, point: MetricSparklinePoint): void {
    this.hoveredMetricSparkline = {
      metricTitle: metric.title,
      point,
    };
  }

  clearHoveredMetricSparklinePoint(metric: DashboardMetric): void {
    if (this.hoveredMetricSparkline?.metricTitle === metric.title) {
      this.hoveredMetricSparkline = null;
    }
  }

  getHoveredMetricSparklinePoint(metric: DashboardMetric): MetricSparklinePoint | null {
    return this.hoveredMetricSparkline?.metricTitle === metric.title
      ? this.hoveredMetricSparkline.point
      : null;
  }

  private getWorkspaceHealthSamples(): Array<{
    activeProjects: number;
    completionPercentage: number;
    date: Date;
    tasksCompleted: number;
    value: number;
  }> {
    const days = this.getRecentDayBuckets(30);
    const activeProjectTarget = Math.max(1, this.activeProjects);

    return days.map((day, index) => {
      const tasksCompleted = this.tasks.filter((task) => {
        if (task.status !== 'Completed') {
          return false;
        }

        const activityDate = this.getTaskActivityDate(task);
        return (
          activityDate !== null &&
          activityDate.getTime() >= day.startTime &&
          activityDate.getTime() <= day.endTime
        );
      }).length;
      const completedThroughDate = this.tasks.filter((task) => {
        if (task.status !== 'Completed') {
          return false;
        }

        const activityDate = this.getTaskActivityDate(task);
        return activityDate !== null && activityDate.getTime() <= day.endTime;
      }).length;
      const tasksKnownByDate = this.tasks.filter((task) => {
        const createdDate =
          this.parseDate(task.createdAt) ||
          this.parseDate(task.completedAt) ||
          this.parseDate(task.dueDate);
        const activityDate = this.getTaskActivityDate(task);

        return (
          (createdDate !== null && createdDate.getTime() <= day.endTime) ||
          (activityDate !== null && activityDate.getTime() <= day.endTime)
        );
      }).length;
      const activeProjects = this.projects.filter((project) =>
        this.isProjectActiveOnDate(project, day.endTime),
      ).length;
      const projectUpdates = this.projects.filter((project) => {
        const updateDate = this.parseDate(
          project.updatedAt || project.createdAt || project.dueDate,
        );
        return (
          updateDate !== null &&
          updateDate.getTime() >= day.startTime &&
          updateDate.getTime() <= day.endTime
        );
      }).length;
      const clientAdds = this.clients.filter((client) => {
        const createdDate = this.parseDate(client.createdAt || client.lastContact);
        return (
          createdDate !== null &&
          createdDate.getTime() >= day.startTime &&
          createdDate.getTime() <= day.endTime
        );
      }).length;
      const completionPercentage =
        tasksKnownByDate === 0
          ? 0
          : Math.round((completedThroughDate / Math.max(1, tasksKnownByDate)) * 100);
      const activeProjectLift = Math.min(1, activeProjects / activeProjectTarget) * 10;
      const activityLift = Math.min(
        14,
        tasksCompleted * 2.6 + projectUpdates * 1.15 + clientAdds * 1.4,
      );
      const trendLift = (index / Math.max(1, days.length - 1)) * 5;
      const value = Math.max(
        24,
        Math.min(96, completionPercentage * 0.78 + activeProjectLift + activityLift + trendLift),
      );

      return {
        activeProjects,
        completionPercentage,
        date: day.date,
        tasksCompleted,
        value,
      };
    });
  }

  private getWorkspaceActivityScoreBetween(startDaysAgo: number, endDaysAgo: number): number {
    const completedTasks = this.getCompletedTaskCountBetween(startDaysAgo, endDaysAgo);
    const projectUpdates = this.getCountBetween(
      this.projects,
      (project) => this.parseDate(project.updatedAt || project.createdAt || project.dueDate),
      startDaysAgo,
      endDaysAgo,
    );
    const clientAdds = this.getCreatedClientCountBetween(startDaysAgo, endDaysAgo);

    return completedTasks * 1.2 + projectUpdates * 0.85 + clientAdds * 1.3;
  }

  private getRecentDayBuckets(days: number): Array<{
    date: Date;
    endTime: number;
    startTime: number;
  }> {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    firstDay.setDate(firstDay.getDate() - (days - 1));

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + index);
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      return {
        date,
        endTime: end.getTime(),
        startTime: start.getTime(),
      };
    });
  }

  private isProjectActiveOnDate(project: Project, dayEndTime: number): boolean {
    const createdDate = this.parseDate(project.createdAt || project.dueDate);
    const completedDate =
      project.status === 'Completed' ? this.parseDate(project.updatedAt || project.dueDate) : null;

    if (createdDate !== null && createdDate.getTime() > dayEndTime) {
      return false;
    }

    return completedDate === null || completedDate.getTime() > dayEndTime;
  }

  private isTaskPendingOnDate(task: Task, dayEndTime: number): boolean {
    const createdDate = this.parseDate(task.createdAt || task.dueDate);

    if (createdDate !== null && createdDate.getTime() > dayEndTime) {
      return false;
    }

    if (task.status !== 'Completed') {
      return true;
    }

    const completedDate = this.getTaskActivityDate(task);
    return completedDate !== null && completedDate.getTime() > dayEndTime;
  }

  private isKnownByDate(date: Date | null, dayEndTime: number): boolean {
    return date === null || date.getTime() <= dayEndTime;
  }

  private formatWorkspaceHealthDate(date: Date): string {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }

  private getTaskActivityDate(task: Task): Date | null {
    const dateValue = task.completedAt || task.dueDate || task.updatedAt || task.createdAt;

    if (!dateValue) {
      return null;
    }

    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getCompletedTaskCountBetween(startDaysAgo: number, endDaysAgo: number): number {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startTime = todayStart.getTime() - endDaysAgo * 86_400_000;
    const endTime = todayStart.getTime() - startDaysAgo * 86_400_000;

    return this.tasks.filter((task) => {
      if (task.status !== 'Completed') {
        return false;
      }

      const activityDate = this.getTaskActivityDate(task);

      if (!activityDate) {
        return false;
      }

      const activityDay = new Date(
        activityDate.getFullYear(),
        activityDate.getMonth(),
        activityDate.getDate(),
      ).getTime();
      return activityDay >= startTime && activityDay <= endTime;
    }).length;
  }

  private buildSmoothChartPath(points: WorkspaceHealthPoint[]): string {
    if (points.length === 0) {
      return '';
    }

    const [firstPoint] = points;
    const path = [
      `M ${this.formatChartNumber(firstPoint.x)} ${this.formatChartNumber(firstPoint.y)}`,
    ];

    for (let index = 0; index < points.length - 1; index += 1) {
      const previous = points[index - 1] ?? points[index];
      const current = points[index];
      const next = points[index + 1];
      const afterNext = points[index + 2] ?? next;
      const controlPointOne = {
        x: current.x + (next.x - previous.x) / 6,
        y: current.y + (next.y - previous.y) / 6,
      };
      const controlPointTwo = {
        x: next.x - (afterNext.x - current.x) / 6,
        y: next.y - (afterNext.y - current.y) / 6,
      };

      path.push(
        `C ${this.formatChartNumber(controlPointOne.x)} ${this.formatChartNumber(controlPointOne.y)}, ${this.formatChartNumber(
          controlPointTwo.x,
        )} ${this.formatChartNumber(controlPointTwo.y)}, ${this.formatChartNumber(next.x)} ${this.formatChartNumber(next.y)}`,
      );
    }

    return path.join(' ');
  }

  private formatChartNumber(value: number): string {
    return Number(value.toFixed(2)).toString();
  }

  private handleLoadError<T>(fallback: T) {
    this.hasApiError = true;
    return of(fallback);
  }
}
