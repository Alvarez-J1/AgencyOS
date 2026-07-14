import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
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
type MetricBadgeTone = 'positive' | 'neutral' | 'warning';

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

interface TaskActivityPoint {
  dateLabel: string;
  index: number;
  tooltipX: number;
  tooltipY: number;
  value: number;
  x: number;
  y: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clientService = inject(ClientService);
  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);
  private readonly currentUser = this.authService.getCurrentUser();
  private readonly taskActivityDays = 30;
  private readonly taskActivityChartWidth = 280;
  private readonly taskActivityChartLeftInset = 0;
  private readonly taskActivityChartRightInset = 0;
  private readonly taskActivityChartHeight = 104;
  private readonly taskActivityChartTop = 8;
  private readonly taskActivityChartBottom = 90;

  clients: Client[] = [];
  projects: Project[] = [];
  tasks: Task[] = [];
  isLoading = true;
  errorMessage = '';
  hoveredTaskActivityPoint: TaskActivityPoint | null = null;
  private hasApiError = false;

  readonly welcomeName = this.currentUser?.name.trim().split(/\s+/)[0] ?? 'there';
  readonly taskActivityGridLines = [16, 39, 62, 85];

  ngOnInit(): void {
    forkJoin({
      clients: this.clientService.getClients().pipe(catchError(() => this.handleLoadError([] as Client[]))),
      projects: this.projectService.getProjects().pipe(catchError(() => this.handleLoadError([] as Project[]))),
      tasks: this.taskService.getTasks().pipe(catchError(() => this.handleLoadError([] as Task[])))
    }).subscribe({
      next: ({ clients, projects, tasks }) => {
        this.clients = clients;
        this.projects = projects;
        this.tasks = tasks;
        this.errorMessage = this.hasApiError
          ? 'Home data could not be loaded. Check that you are logged in and the backend is running.'
          : '';
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Home data could not be loaded.';
        this.isLoading = false;
      }
    });
  }

  get hasNoClients(): boolean {
    return !this.errorMessage && this.clients.length === 0;
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

  get taskCompletionRate(): number {
    if (this.tasks.length === 0) {
      return 0;
    }

    return Math.round((this.completedTasks / this.tasks.length) * 100);
  }

  get taskCompletionCopy(): string {
    if (this.tasks.length === 0) {
      return 'No tasks yet. Create your first task to get started.';
    }

    return `${this.completedTasks} of ${this.tasks.length} tasks completed`;
  }

  get taskActivityMetricValue(): number {
    return this.completedTasks;
  }

  get taskActivityMetricLabel(): string {
    return this.taskActivityMetricValue === 1 ? 'Task completed' : 'Tasks completed';
  }

  get taskActivityTrendBadge(): string {
    const currentPeriod = this.getCompletedTaskCountBetween(0, this.taskActivityDays - 1);
    const previousPeriod = this.getCompletedTaskCountBetween(this.taskActivityDays, this.taskActivityDays * 2 - 1);

    if (previousPeriod === 0) {
      return currentPeriod > 0 ? `+${currentPeriod} vs last month` : 'No change';
    }

    const trendPercent = Math.round(((currentPeriod - previousPeriod) / previousPeriod) * 100);
    return `${trendPercent >= 0 ? '+' : ''}${trendPercent}% vs last month`;
  }

  get taskActivityLinePath(): string {
    return this.buildSmoothChartPath(this.taskActivityPoints);
  }

  get taskActivityAreaPath(): string {
    const points = this.taskActivityPoints;
    const linePath = this.buildSmoothChartPath(points);
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    if (!firstPoint || !lastPoint) {
      return '';
    }

    return `${linePath} L ${this.formatChartNumber(lastPoint.x)} ${this.taskActivityChartHeight} L ${this.formatChartNumber(
      firstPoint.x
    )} ${this.taskActivityChartHeight} Z`;
  }

  get taskActivityPoints(): TaskActivityPoint[] {
    const counts = this.getTaskActivityCounts();
    const values = this.getTaskActivityValues(counts);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    const chartRange = this.taskActivityChartBottom - this.taskActivityChartTop;
    const startDate = this.getTaskActivityStartDate();

    return values.map((value, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);

      const progress = (value - minValue) / valueRange;
      const x =
        this.taskActivityChartLeftInset +
        (index / (this.taskActivityDays - 1)) *
          (this.taskActivityChartWidth - this.taskActivityChartLeftInset - this.taskActivityChartRightInset);
      const y = this.taskActivityChartBottom - progress * chartRange;

      return {
        dateLabel: this.formatTaskActivityDate(date),
        index,
        tooltipX: Math.min(86, Math.max(14, (x / this.taskActivityChartWidth) * 100)),
        tooltipY: Math.min(78, Math.max(18, (y / this.taskActivityChartHeight) * 100)),
        value: counts[index],
        x,
        y
      };
    });
  }

  get totalClientsCopy(): string {
    return this.totalClients === 1
      ? '1 total client.'
      : `${this.totalClients} total clients.`;
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
    const clientsCreatedThisMonth = this.clients.filter((client) => this.isCurrentMonth(client.createdAt)).length;

    return clientsCreatedThisMonth > 0
      ? { text: `+${clientsCreatedThisMonth} this month`, tone: 'positive' }
      : null;
  }

  get activeProjectsBadge(): MetricBadge | null {
    const activeProjects = this.projects.filter((project) => project.status !== 'Completed');

    if (activeProjects.length === 0) {
      return null;
    }

    const projectsWithValidDueDates = activeProjects.filter((project) => this.getDaysUntilDue(project.dueDate) !== null);

    if (projectsWithValidDueDates.length === 0) {
      return null;
    }

    const overdueProjects = projectsWithValidDueDates.filter((project) => {
      const daysUntilDue = this.getDaysUntilDue(project.dueDate);
      return daysUntilDue !== null && daysUntilDue < 0;
    }).length;

    if (overdueProjects > 0) {
      return { text: overdueProjects === 1 ? '1 overdue' : `${overdueProjects} overdue`, tone: 'warning' };
    }

    return { text: 'On track', tone: 'positive' };
  }

  get completedProjectsBadge(): MetricBadge | null {
    const projectsCompletedThisMonth = this.projects.filter(
      (project) => project.status === 'Completed' && this.isCurrentMonth(project.updatedAt || project.createdAt)
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

    return dueSoonTasks > 0 ? { text: `${dueSoonTasks} due soon`, tone: 'neutral' } : null;
  }

  get completedTasksBadge(): MetricBadge | null {
    if (this.tasks.length === 0 || this.completedTasks === 0) {
      return null;
    }

    return { text: `${this.taskCompletionRate}%`, tone: 'positive' };
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
        icon: 'client'
      });
    }

    if (activeProject) {
      activity.push({
        title: 'Project created',
        description: 'Created a new project.',
        timestamp: activeProject.dueDate,
        tone: 'blue',
        icon: 'approval'
      });
    }

    if (completedTask) {
      activity.push({
        title: 'Task completed',
        description: 'Marked a task as complete.',
        timestamp: completedTask.dueDate,
        tone: 'amber',
        icon: 'report'
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
          ...this.getDeadlineMeta(project.dueDate)
        })),
      ...this.tasks
        .filter((task) => task.status !== 'Completed')
        .map((task) => ({
          title: task.title,
          label: 'Task',
          dueDate: task.dueDate,
          ...this.getDeadlineMeta(task.dueDate)
        }))
    ].slice(0, 5);
  }

  get projectStatusOverview(): Array<{ status: ProjectStatus; count: number }> {
    const statuses: ProjectStatus[] = ['Planning', 'In Progress', 'Review', 'Completed'];

    return statuses.map((status) => ({
      status,
      count: this.projects.filter((project) => project.status === status).length
    }));
  }

  get projectStatusTotal(): number {
    return this.projects.length;
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

  setHoveredTaskActivityPoint(point: TaskActivityPoint): void {
    this.hoveredTaskActivityPoint = point;
  }

  clearHoveredTaskActivityPoint(): void {
    this.hoveredTaskActivityPoint = null;
  }

  private getTaskActivityCounts(): number[] {
    const buckets = Array.from({ length: this.taskActivityDays }, () => 0);
    const millisecondsPerDay = 86_400_000;
    const windowStart = this.getTaskActivityStartDate().getTime();

    this.tasks
      .filter((task) => task.status === 'Completed')
      .forEach((task) => {
        const activityDate = this.getTaskActivityDate(task);

        if (!activityDate) {
          return;
        }

        const activityDay = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
        const bucketIndex = Math.floor((activityDay.getTime() - windowStart) / millisecondsPerDay);

        if (bucketIndex >= 0 && bucketIndex < buckets.length) {
          buckets[bucketIndex] += 1;
        }
      });

    return buckets;
  }

  private getTaskActivityValues(counts: number[]): number[] {
    return counts.map((count, index) => {
      const previousThree = counts[index - 3] ?? 0;
      const previousTwo = counts[index - 2] ?? 0;
      const previous = counts[index - 1] ?? 0;
      const next = counts[index + 1] ?? 0;
      const nextTwo = counts[index + 2] ?? 0;
      const nextThree = counts[index + 3] ?? 0;
      const completedSoFar = counts.slice(0, index + 1).reduce((total, value) => total + value, 0);
      const cumulativeProgress = completedSoFar / Math.max(1, this.completedTasks);

      return (
        count * 0.8 +
        previous * 0.52 +
        next * 0.46 +
        previousTwo * 0.3 +
        nextTwo * 0.26 +
        previousThree * 0.12 +
        nextThree * 0.1 +
        cumulativeProgress * 0.42
      );
    });
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

      const activityDay = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate()).getTime();
      return activityDay >= startTime && activityDay <= endTime;
    }).length;
  }

  private getTaskActivityStartDate(): Date {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    todayStart.setDate(todayStart.getDate() - (this.taskActivityDays - 1));
    return todayStart;
  }

  private formatTaskActivityDate(date: Date): string {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }

  private buildSmoothChartPath(points: TaskActivityPoint[]): string {
    if (points.length === 0) {
      return '';
    }

    const [firstPoint] = points;
    const path = [`M ${this.formatChartNumber(firstPoint.x)} ${this.formatChartNumber(firstPoint.y)}`];

    for (let index = 0; index < points.length - 1; index += 1) {
      const previous = points[index - 1] ?? points[index];
      const current = points[index];
      const next = points[index + 1];
      const afterNext = points[index + 2] ?? next;
      const controlPointOne = {
        x: current.x + (next.x - previous.x) / 6,
        y: current.y + (next.y - previous.y) / 6
      };
      const controlPointTwo = {
        x: next.x - (afterNext.x - current.x) / 6,
        y: next.y - (afterNext.y - current.y) / 6
      };

      path.push(
        `C ${this.formatChartNumber(controlPointOne.x)} ${this.formatChartNumber(controlPointOne.y)}, ${this.formatChartNumber(
          controlPointTwo.x
        )} ${this.formatChartNumber(controlPointTwo.y)}, ${this.formatChartNumber(next.x)} ${this.formatChartNumber(next.y)}`
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
