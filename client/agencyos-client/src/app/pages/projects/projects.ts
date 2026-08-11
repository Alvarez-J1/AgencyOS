import { Component, HostListener, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Project, ProjectStatus } from '../../models/project.model';
import { CreateProjectRequest, ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-projects',
  imports: [FormsModule, RouterLink],
  templateUrl: './projects.html',
  styleUrl: './projects.scss'
})
export class ProjectsComponent implements OnInit {
  private readonly projectService = inject(ProjectService);

  searchTerm = '';
  selectedStatus: ProjectStatus | 'All' = 'All';
  isLoading = true;
  isSaving = false;
  showCreateModal = false;
  errorMessage = '';
  formErrorMessage = '';

  readonly statusOptions: Array<ProjectStatus | 'All'> = ['All', 'Planning', 'In Progress', 'Review', 'Completed'];
  readonly createStatusOptions: ProjectStatus[] = ['Planning', 'In Progress', 'Review', 'Completed'];

  projects: Project[] = [];
  newProject: CreateProjectRequest = this.getEmptyProjectForm();

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Projects could not be loaded.';
        this.isLoading = false;
      }
    });
  }

  get filteredProjects(): Project[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.projects.filter((project) => {
      const matchesSearch =
        !search ||
        [project.name, project.client, project.status, project.dueDate, project.progress.toString()].some((value) =>
          value.toLowerCase().includes(search)
        );

      const matchesStatus = this.selectedStatus === 'All' || project.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
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

  private isStatusFilter(value: string): value is ProjectStatus | 'All' {
    return this.statusOptions.includes(value as ProjectStatus | 'All');
  }

  getProjectRouteId(project: Project): number | string {
    return project.id ?? project._id ?? '';
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.formErrorMessage = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.formErrorMessage = '';
    this.newProject = this.getEmptyProjectForm();
  }

  @HostListener('document:keydown.escape')
  closeModalWithEscape(): void {
    if (this.showCreateModal) {
      this.closeCreateModal();
    }
  }

  createProject(): void {
    if (!this.newProject.name.trim() || !this.newProject.client.trim() || !this.newProject.dueDate.trim()) {
      this.formErrorMessage = 'Project name, client, and due date are required.';
      return;
    }

    this.isSaving = true;
    this.formErrorMessage = '';

    this.projectService.createProject(this.newProject).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeCreateModal();
        this.loadProjects();
      },
      error: () => {
        this.formErrorMessage = 'Project could not be created.';
        this.isSaving = false;
      }
    });
  }

  private getEmptyProjectForm(): CreateProjectRequest {
    return {
      name: '',
      client: '',
      status: 'Planning',
      dueDate: '',
      notes: ''
    };
  }
}
