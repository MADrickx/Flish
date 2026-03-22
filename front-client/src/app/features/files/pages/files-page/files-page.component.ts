import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { formatBytes, MediaCategory } from '../../../../core/models/media.models';
import { FilesApiService } from '../../services/files-api.service';
import { FilesStore } from '../../store/files.store';
import { LoadingSpinnerComponent } from '../../../../core/components/loading-spinner/loading-spinner.component';
import { StreamLinkComponent } from '../../../../core/components/stream-link/stream-link.component';

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
  imports: [FormsModule, DatePipe, LoadingSpinnerComponent, StreamLinkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './files-page.component.css',
  templateUrl: './files-page.component.html',
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
