import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AudioStore } from '../../store/audio.store';
import { AudioPlayerBarComponent } from '../../components/audio-player-bar/audio-player-bar.component';
import { LoadingSpinnerComponent } from '../../../../core/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';
import { formatBytes, MediaItem } from '../../../../core/models/media.models';
import { StreamLinkComponent } from '../../../../core/components/stream-link/stream-link.component';

@Component({
  selector: 'app-audio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AudioPlayerBarComponent, LoadingSpinnerComponent, EmptyStateComponent, StreamLinkComponent],
  templateUrl: './audio-page.component.html',
  styleUrl: './audio-page.component.css',
})
export class AudioPageComponent {
  protected readonly store = inject(AudioStore);
  protected readonly toBytes = formatBytes;

  constructor() {
    this.store.load();
  }

  protected onQueryChange(value: string): void {
    this.store.setQuery(value);
    this.store.load();
  }

  protected onAddToQueue(event: Event, item: MediaItem): void {
    event.stopPropagation();
    this.store.addToQueue(item);
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
