import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Client } from '../../models/client.model';
import { ClientService, CreateClientRequest } from '../../services/client.service';

@Component({
  selector: 'app-clients',
  imports: [FormsModule, RouterLink],
  templateUrl: './clients.html',
  styleUrl: './clients.scss'
})
export class ClientsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clientService = inject(ClientService);

  searchTerm = '';
  isLoading = true;
  isSaving = false;
  showCreateForm = false;
  errorMessage = '';
  formErrorMessage = '';

  clients: Client[] = [];
  newClient: CreateClientRequest = this.getEmptyClientForm();

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('newClient') === 'true') {
      this.openCreateForm();
    }

    this.loadClients();
  }

  loadClients(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.clients = clients;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Clients could not be loaded.';
        this.isLoading = false;
      }
    });
  }

  get filteredClients(): Client[] {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.clients;
    }

    return this.clients.filter((client) =>
      [
        client.name,
        client.company,
        client.email,
        client.status,
        client.activeProjects.toString(),
        client.lastContact
      ].some((value) => value.toLowerCase().includes(search))
    );
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
  }

  getClientRouteId(client: Client): number | string {
    return client.id ?? client._id ?? '';
  }

  openCreateForm(): void {
    this.showCreateForm = true;
    this.formErrorMessage = '';
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
    this.formErrorMessage = '';
    this.newClient = this.getEmptyClientForm();
  }

  createClient(): void {
    if (!this.newClient.name.trim() || !this.newClient.company.trim() || !this.newClient.email.trim()) {
      this.formErrorMessage = 'Name, company, and email are required.';
      return;
    }

    this.isSaving = true;
    this.formErrorMessage = '';

    this.clientService.createClient(this.newClient).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeCreateForm();
        this.loadClients();
      },
      error: () => {
        this.formErrorMessage = 'Client could not be created.';
        this.isSaving = false;
      }
    });
  }

  private getEmptyClientForm(): CreateClientRequest {
    return {
      name: '',
      company: '',
      email: '',
      status: 'Active'
    };
  }
}
