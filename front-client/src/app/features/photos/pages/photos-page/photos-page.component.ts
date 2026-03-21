import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PhotosStore } from '../../store/photos.store';
import { PhotoCardComponent } from '../../components/photo-card/photo-card.component';
import { PhotoViewerComponent } from '../../components/photo-viewer/photo-viewer.component';
import { PhotosApiService } from '../../services/photos-api.service';
import { LoadingSpinnerComponent } from '../../../../core/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';

@Component({
  selector: 'app-photos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PhotoCardComponent, PhotoViewerComponent, LoadingSpinnerComponent, EmptyStateComponent],
  styleUrl: './photos-page.component.css',
  templateUrl: './photos-page.component.html',
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
