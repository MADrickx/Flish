import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { FileItem } from '../models/file.models';
import { FilesApiService } from '../services/files-api.service';

@Component({
  selector: 'app-files-page',
  imports: [FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './files-page.component.css',
  template: `
    <section class="container">
      <header>
        <h1>Flish Files</h1>
        <div class="actions">
          <span class="user">{{ auth.username() }}</span>
          <button type="button" (click)="logout()">Logout</button>
        </div>
      </header>

      <div class="toolbar">
        <input
          type="text"
          [ngModel]="query()"
          (ngModelChange)="onQueryChange($event)"
          placeholder="Filter by path"
        />
        <input type="file" (change)="onFilePicked($event)" />
      </div>

      @if (loading()) {
        <p>Loading files...</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Path</th>
              <th>Size</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (item of files(); track item.id) {
              <tr>
                <td>{{ item.fileName }}</td>
                <td>{{ item.relativePath }}</td>
                <td>{{ item.sizeBytes }}</td>
                <td>{{ item.lastWriteUtc | date: 'medium' }}</td>
                <td class="actions">
                  <a [href]="downloadHref(item.id)" target="_blank" rel="noopener">Download</a>
                  <button type="button" (click)="delete(item.id)">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">No files found.</td>
              </tr>
            }
          </tbody>
        </table>
      }

      <footer class="pager">
        <button type="button" (click)="prevPage()" [disabled]="page() <= 1">Prev</button>
        <span>Page {{ page() }} / {{ totalPages() }}</span>
        <button type="button" (click)="nextPage()" [disabled]="page() >= totalPages()">Next</button>
      </footer>
    </section>
  `
})
export class FilesPageComponent {
  protected readonly auth = inject(AuthStateService);
  private readonly api = inject(FilesApiService);
  private readonly router = inject(Router);

  protected readonly files = signal<FileItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);
  protected readonly total = signal(0);
  protected readonly query = signal('');
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  constructor() {
    this.load();
  }

  protected onQueryChange(value: string): void {
    this.query.set(value);
    this.page.set(1);
    this.load();
  }

  protected prevPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((v) => v - 1);
    this.load();
  }

  protected nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((v) => v + 1);
    this.load();
  }

  protected delete(id: string): void {
    this.api.delete(id).subscribe({
      next: () => this.load()
    });
  }

  protected downloadHref(id: string): string {
    return `/api/files/${id}/download`;
  }

  protected onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file === undefined) {
      return;
    }

    this.api.upload(file).subscribe({
      next: () => {
        input.value = '';
        this.load();
      }
    });
  }

  protected logout(): void {
    this.auth.clear();
    void this.router.navigateByUrl('/login');
  }

  private load(): void {
    this.loading.set(true);
    this.api.list(this.page(), this.pageSize(), this.query()).subscribe({
      next: (response) => {
        this.files.set(response.items);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}

