import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VideoStore } from '../store/video.store';
import { VideoCardComponent } from '../components/video-card.component';
import { VideoPlayerComponent } from '../components/video-player.component';
import { LoadingSpinnerComponent } from '../../../core/components/loading-spinner.component';
import { EmptyStateComponent } from '../../../core/components/empty-state.component';
import { formatBytes } from '../../../core/models/media.models';

@Component({
  selector: 'app-video-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, VideoCardComponent, VideoPlayerComponent, LoadingSpinnerComponent, EmptyStateComponent],
  styleUrl: './video-page.component.css',
  template: `
    <section class="container">
      @if (store.nowPlaying(); as playing) {
        <app-video-player
          [src]="store.streamUrl()!"
          [title]="playing.fileName"
          (closed)="store.stop()"
        />
      }

      <header>
        <h1>Videos</h1>
        <div class="search-field">
          <input
            type="text"
            [ngModel]="store.query()"
            (ngModelChange)="onQueryChange($event)"
            placeholder="Search videos..."
          />
        </div>
      </header>

      @if (store.loading()) {
        <app-loading message="Loading videos..." />
      } @else if (store.error()) {
        <p class="error">{{ store.error() }}</p>
      } @else if (!store.hasItems()) {
        <app-empty-state icon="🎬" message="No videos found." />
      } @else {
        <div class="grid">
          @for (item of store.items(); track item.id) {
            <app-video-card
              [fileName]="item.fileName"
              [extension]="item.extension"
              [size]="toBytes(item.sizeBytes)"
              (selected)="store.play(item)"
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
export class VideoPageComponent {
  protected readonly store = inject(VideoStore);
  protected readonly toBytes = formatBytes;

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
