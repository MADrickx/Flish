import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AudioStore } from '../store/audio.store';
import { AudioPlayerBarComponent } from '../components/audio-player-bar.component';
import { formatBytes, MediaItem } from '../../../core/models/media.models';

@Component({
  selector: 'app-audio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AudioPlayerBarComponent],
  styleUrl: './audio-page.component.css',
  template: `
    <section class="container">
      @if (store.nowPlaying(); as track) {
        <app-audio-player-bar
          [src]="store.streamUrl()!"
          [title]="track.fileName"
          [playing]="store.playbackStatus() === 'playing'"
          (paused)="store.pause()"
          (resumed)="store.resume()"
          (ended)="store.playNext()"
          (stopped)="store.stop()"
        />
      }

      <header>
        <h1>Audio</h1>
        <div class="search-field">
          <input
            type="text"
            [ngModel]="store.query()"
            (ngModelChange)="onQueryChange($event)"
            placeholder="Search audio..."
          />
        </div>
      </header>

      @if (store.loading()) {
        <p class="state">Loading audio...</p>
      } @else if (store.error()) {
        <p class="state error">{{ store.error() }}</p>
      } @else {
        <ul class="track-list">
          @for (item of store.items(); track item.id) {
            <li
              class="track-row"
              [class.active]="store.nowPlaying()?.id === item.id"
              (click)="store.play(item)"
            >
              <span class="icon">🎵</span>
              <span class="name">{{ item.fileName }}</span>
              <span class="meta">{{ toBytes(item.sizeBytes) }}</span>
              <button class="queue-btn" type="button" (click)="onAddToQueue($event, item)">+Q</button>
            </li>
          } @empty {
            <li class="state">No audio files found.</li>
          }
        </ul>
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
