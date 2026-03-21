import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { formatBytes, MediaCategory } from '../../../core/models/media.models';
import { FilesApiService } from '../services/files-api.service';
import { FilesStore } from '../store/files.store';

const CATEGORIES: { value: MediaCategory | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'photo', label: 'Photo' },
  { value: 'document', label: 'Document' },
  { value: 'other', label: 'Other' },
];

@Component({
  selector: 'app-files-page',
  imports: [FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './files-page.component.css',
  template: `
    <section class="container">
      <header>
        <div>
          <h1>All Files</h1>
          <p class="subtitle">Indexed files from your VPS master directory</p>
        </div>
      </header>

      <div class="toolbar">
        <div class="field">
          <label for="search">Search path</label>
          <input
            id="search"
            type="text"
            [ngModel]="store.query()"
            (ngModelChange)="onQueryChange($event)"
            placeholder="Filter by path"
          />
        </div>
        <div class="field">
          <label for="category">Category</label>
          <select id="category" [ngModel]="store.category()" (ngModelChange)="onCategoryChange($event)">
            @for (cat of categories; track cat.value) {
              <option [value]="cat.value">{{ cat.label }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="upload">Upload file</label>
          <input id="upload" type="file" (change)="onFilePicked($event)" />
        </div>
      </div>

      @if (store.loading()) {
        <p class="state">Loading files...</p>
      } @else if (store.error()) {
        <p class="state error">{{ store.error() }}</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Path</th>
                <th>Type</th>
                <th>Size</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of store.items(); track item.id) {
                <tr>
                  <td class="file-name">{{ item.fileName }}</td>
                  <td class="path">{{ item.relativePath }}</td>
                  <td>{{ item.category }}</td>
                  <td>{{ toBytes(item.sizeBytes) }}</td>
                  <td>{{ item.lastWriteUtc | date: 'medium' }}</td>
                  <td class="row-actions">
                    <a class="btn ghost icon-btn" [href]="api.downloadUrl(item.id)" target="_blank" rel="noopener">
                      <span aria-hidden="true">↓</span> Download
                    </a>
                    <button class="btn danger icon-btn" type="button" (click)="onDelete(item.id)">
                      <span aria-hidden="true">×</span> Delete
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="state">No files found.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <footer class="pager">
        <button class="btn ghost" type="button" (click)="prevPage()" [disabled]="store.page() <= 1">Prev</button>
        <span>Page {{ store.page() }} / {{ store.totalPages() }}</span>
        <button class="btn ghost" type="button" (click)="nextPage()" [disabled]="store.page() >= store.totalPages()">Next</button>
      </footer>
    </section>
  `,
})
export class FilesPageComponent {
  protected readonly store = inject(FilesStore);
  protected readonly api = inject(FilesApiService);
  protected readonly toBytes = formatBytes;
  protected readonly categories = CATEGORIES;

  constructor() {
    this.store.load();
  }

  protected onQueryChange(value: string): void {
    this.store.setQuery(value);
    this.store.load();
  }

  protected onCategoryChange(value: MediaCategory | ''): void {
    this.store.setCategory(value);
    this.store.load();
  }

  protected prevPage(): void {
    if (this.store.page() <= 1) return;
    this.store.setPage(this.store.page() - 1);
    this.store.load();
  }

  protected nextPage(): void {
    if (this.store.page() >= this.store.totalPages()) return;
    this.store.setPage(this.store.page() + 1);
    this.store.load();
  }

  protected onDelete(id: string): void {
    this.store.deleteItem(id);
  }

  protected onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.api.upload(file).subscribe({
      next: () => {
        input.value = '';
        this.store.load();
      },
    });
  }
}
