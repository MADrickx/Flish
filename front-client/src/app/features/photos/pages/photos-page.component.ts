import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PhotosStore } from '../store/photos.store';
import { PhotoCardComponent } from '../components/photo-card.component';
import { PhotoViewerComponent } from '../components/photo-viewer.component';
import { PhotosApiService } from '../services/photos-api.service';
import { LoadingSpinnerComponent } from '../../../core/components/loading-spinner.component';
import { EmptyStateComponent } from '../../../core/components/empty-state.component';

@Component({
  selector: 'app-photos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PhotoCardComponent, PhotoViewerComponent, LoadingSpinnerComponent, EmptyStateComponent],
  styleUrl: './photos-page.component.css',
  template: `
    @if (store.viewing(); as photo) {
      <app-photo-viewer
        [src]="store.viewUrl()!"
        [title]="photo.fileName"
        (closed)="store.closeViewer()"
        (next)="store.viewNext()"
        (prev)="store.viewPrev()"
      />
    }

    <section class="container">
      <header>
        <h1>Photos</h1>
        <div class="search-field">
          <input
            type="text"
            [ngModel]="store.query()"
            (ngModelChange)="onQueryChange($event)"
            placeholder="Search photos..."
          />
        </div>
      </header>

      @if (store.loading()) {
        <app-loading message="Loading photos..." />
      } @else if (store.error()) {
        <p class="error">{{ store.error() }}</p>
      } @else if (store.count() === 0) {
        <app-empty-state icon="📷" message="No photos found." />
      } @else {
        <div class="grid">
          @for (item of store.items(); track item.id) {
            <app-photo-card
              [thumbUrl]="api.downloadUrl(item.id)"
              [fileName]="item.fileName"
              (selected)="store.view(item)"
            />
          }
        </div>
      }

      @if (store.totalPages() > 1) {
        <footer class="pager">
          <button class="btn" (click)="prevPage()" [disabled]="store.page() <= 1">Prev</button>
          <span>{{ store.page() }} / {{ store.totalPages() }}</span>
          <button class="btn" (click)="nextPage()" [disabled]="store.page() >= store.totalPages()">Next</button>
        </footer>
      }
    </section>
  `,
})
export class PhotosPageComponent {
  protected readonly store = inject(PhotosStore);
  protected readonly api = inject(PhotosApiService);

  constructor() {
    this.store.load();
  }

  protected onQueryChange(value: string): void {
    this.store.setQuery(value);
    this.store.load();
  }

  protected prevPage(): void {
    this.store.setPage(this.store.page() - 1);
    this.store.load();
  }

  protected nextPage(): void {
    this.store.setPage(this.store.page() + 1);
    this.store.load();
  }
}
