import { Component, HostListener, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Task, TaskPriority, TaskStatus } from '../../models/task.model';
import { CreateTaskRequest, TaskService } from '../../services/task.service';

@Component({
  selector: 'app-tasks',
  imports: [FormsModule],
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss'
})
export class TasksComponent implements OnInit {
  private readonly taskService = inject(TaskService);

  searchTerm = '';
  selectedStatus: TaskStatus | 'All' = 'All';
  selectedPriority: TaskPriority | 'All' = 'All';
  isLoading = true;
  isSaving = false;
  showCreateModal = false;
  showEditModal = false;
  errorMessage = '';
  formErrorMessage = '';
  isDeleting = false;
  updatingTaskId: number | null = null;

  readonly statusOptions: Array<TaskStatus | 'All'> = ['All', 'Todo', 'In Progress', 'Completed'];
  readonly priorityOptions: Array<TaskPriority | 'All'> = ['All', 'Low', 'Medium', 'High'];
  readonly createStatusOptions: TaskStatus[] = ['Todo', 'In Progress', 'Completed'];
  readonly createPriorityOptions: TaskPriority[] = ['Low', 'Medium', 'High'];

  tasks: Task[] = [];
  newTask: CreateTaskRequest = this.getEmptyTaskForm();
  editTask: Task | undefined;

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Tasks could not be loaded.';
        this.isLoading = false;
      }
    });
  }

  get filteredTasks(): Task[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.tasks.filter((task) => {
      const matchesSearch =
        !search ||
        [task.title, task.project, task.assignee, task.priority, task.status, task.dueDate].some((value) =>
          value.toLowerCase().includes(search)
        );

      const matchesStatus = this.selectedStatus === 'All' || task.status === this.selectedStatus;
      const matchesPriority = this.selectedPriority === 'All' || task.priority === this.selectedPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
  }

  onStatusChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;

    if (this.isStatusFilter(value)) {
      this.selectedStatus = value;
    }
  }

  onPriorityChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;

    if (this.isPriorityFilter(value)) {
      this.selectedPriority = value;
    }
  }

  private isStatusFilter(value: string): value is TaskStatus | 'All' {
    return this.statusOptions.includes(value as TaskStatus | 'All');
  }

  private isPriorityFilter(value: string): value is TaskPriority | 'All' {
    return this.priorityOptions.includes(value as TaskPriority | 'All');
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.formErrorMessage = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.formErrorMessage = '';
    this.newTask = this.getEmptyTaskForm();
  }

  createTask(): void {
    if (!this.newTask.title.trim() || !this.newTask.project.trim() || !this.newTask.dueDate.trim()) {
      this.formErrorMessage = 'Task title, project, and due date are required.';
      return;
    }

    this.isSaving = true;
    this.formErrorMessage = '';

    this.taskService.createTask(this.newTask).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeCreateModal();
        this.loadTasks();
      },
      error: () => {
        this.formErrorMessage = 'Task could not be created.';
        this.isSaving = false;
      }
    });
  }

  openEditModal(task: Task): void {
    this.editTask = { ...task };
    this.showEditModal = true;
    this.formErrorMessage = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.formErrorMessage = '';
    this.editTask = undefined;
  }

  @HostListener('document:keydown.escape')
  closeModalWithEscape(): void {
    if (this.showCreateModal) {
      this.closeCreateModal();
      return;
    }

    if (this.showEditModal) {
      this.closeEditModal();
    }
  }

  saveTask(): void {
    if (!this.editTask) {
      return;
    }

    if (!this.editTask.title.trim() || !this.editTask.project.trim() || !this.editTask.dueDate.trim()) {
      this.formErrorMessage = 'Task title, project, and due date are required.';
      return;
    }

    this.isSaving = true;
    this.formErrorMessage = '';

    this.taskService
      .updateTask(this.editTask.id, {
        title: this.editTask.title,
        project: this.editTask.project,
        assignee: this.editTask.assignee,
        priority: this.editTask.priority,
        status: this.editTask.status,
        dueDate: this.editTask.dueDate,
        notes: this.editTask.notes
      })
      .subscribe({
        next: (updatedTask) => {
          this.tasks = this.tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
          this.isSaving = false;
          this.closeEditModal();
        },
        error: () => {
          this.formErrorMessage = 'Task could not be updated.';
          this.isSaving = false;
        }
      });
  }

  deleteTask(): void {
    if (!this.editTask || !confirm(`Delete ${this.editTask.title}? This cannot be undone.`)) {
      return;
    }

    this.isDeleting = true;
    this.formErrorMessage = '';

    this.taskService.deleteTask(this.editTask.id).subscribe({
      next: () => {
        const deletedTaskId = this.editTask?.id;
        this.tasks = this.tasks.filter((task) => task.id !== deletedTaskId);
        this.isDeleting = false;
        this.closeEditModal();
      },
      error: () => {
        this.formErrorMessage = 'Task could not be deleted.';
        this.isDeleting = false;
      }
    });
  }

  markComplete(taskId: number): void {
    this.updatingTaskId = taskId;
    this.errorMessage = '';

    this.taskService.updateTaskStatus(taskId, 'Completed').subscribe({
      next: (updatedTask) => {
        this.tasks = this.tasks.map((task) => (task.id === taskId ? updatedTask : task));
        this.updatingTaskId = null;
      },
      error: () => {
        this.errorMessage = 'Task could not be updated.';
        this.updatingTaskId = null;
      }
    });
  }

  private getEmptyTaskForm(): CreateTaskRequest {
    return {
      title: '',
      project: '',
      assignee: '',
      priority: 'Medium',
      status: 'Todo',
      dueDate: '',
      notes: ''
    };
  }
}
