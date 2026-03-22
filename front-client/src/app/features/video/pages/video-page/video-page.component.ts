import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { VideoStore } from '../../store/video.store';
import { VideoCardComponent } from '../../components/video-card/video-card.component';
import { VideoPlayerComponent } from '../../components/video-player/video-player.component';
import { LoadingSpinnerComponent } from '../../../../core/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';
import { TranscodeTrackerService } from '../../../../core/services/transcode-tracker.service';
import { formatBytes } from '../../../../core/models/media.models';

@Component({
  selector: 'app-video-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, VideoCardComponent, VideoPlayerComponent, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './video-page.component.html',
  styleUrl: './video-page.component.css',
})
export class VideoPageComponent {
  protected readonly store = inject(VideoStore);
  protected readonly toBytes = formatBytes;

  constructor() {
    this.store.load();

    inject(TranscodeTrackerService)
      .completed$.pipe(takeUntilDestroyed())
      .subscribe(() => this.store.load());
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
