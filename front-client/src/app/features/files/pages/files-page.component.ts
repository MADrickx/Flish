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
        <div>
          <h1>Flish Files</h1>
          <p class="subtitle">Indexed files from your VPS master directory</p>
        </div>
        <div class="actions">
          <span class="user">{{ auth.username() }}</span>
          <button class="btn ghost" type="button" (click)="logout()">Logout</button>
        </div>
      </header>

      <div class="toolbar">
        <div class="field">
          <label for="search">Search path</label>
          <input
            id="search"
            type="text"
            [ngModel]="query()"
            (ngModelChange)="onQueryChange($event)"
            placeholder="Filter by path"
          />
        </div>
        <div class="field">
          <label for="upload">Upload file</label>
          <input id="upload" type="file" (change)="onFilePicked($event)" />
        </div>
      </div>

      @if (loading()) {
        <p class="state">Loading files...</p>
      } @else {
        <div class="table-wrap">
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
                  <td class="file-name">{{ item.fileName }}</td>
                  <td class="path">{{ item.relativePath }}</td>
                  <td>{{ formatBytes(item.sizeBytes) }}</td>
                  <td>{{ item.lastWriteUtc | date: 'medium' }}</td>
                  <td class="actions">
                    <a class="btn ghost icon-btn" [href]="downloadHref(item.id)" target="_blank" rel="noopener">
                      <span aria-hidden="true">↓</span>
                      Download
                    </a>
                    <button class="btn danger icon-btn" type="button" (click)="delete(item.id)">
                      <span aria-hidden="true">×</span>
                      Delete
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="state">No files found.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <footer class="pager">
        <button class="btn ghost" type="button" (click)="prevPage()" [disabled]="page() <= 1">Prev</button>
        <span>Page {{ page() }} / {{ totalPages() }}</span>
        <button class="btn ghost" type="button" (click)="nextPage()" [disabled]="page() >= totalPages()">
          Next
        </button>
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

  protected formatBytes(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }

    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = size / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
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

