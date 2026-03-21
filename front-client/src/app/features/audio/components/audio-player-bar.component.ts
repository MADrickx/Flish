import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
  ElementRef,
  signal,
  effect,
} from '@angular/core';

@Component({
  selector: 'app-audio-player-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      padding: 0.6rem 0.85rem;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .track-name {
      flex: 1;
      font-weight: 600;
      font-size: 0.92rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .controls {
      display: flex;
      gap: 0.4rem;
    }
    button {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text);
      padding: 0.3rem 0.55rem;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      transition: border-color 0.15s ease;
    }
    button:hover {
      border-color: var(--primary);
    }
    .progress-wrap {
      margin-top: 0.4rem;
    }
    input[type='range'] {
      width: 100%;
      accent-color: var(--primary);
      cursor: pointer;
    }
    audio {
      display: none;
    }
  `,
  template: `
    <div class="row">
      <span class="track-name">{{ title() }}</span>
      <div class="controls">
        @if (isPlaying()) {
          <button type="button" (click)="onPause()">⏸</button>
        } @else {
          <button type="button" (click)="onResume()">▶</button>
        }
        <button type="button" (click)="onNext()">⏭</button>
        <button type="button" (click)="stopped.emit()">⏹</button>
      </div>
    </div>
    <div class="progress-wrap">
      <input
        type="range"
        min="0"
        [max]="duration()"
        [value]="currentTime()"
        (input)="onSeek($event)"
      />
    </div>
    <audio
      #audioEl
      [src]="src()"
      (timeupdate)="onTimeUpdate()"
      (loadedmetadata)="onMetadata()"
      (ended)="onEnded()"
    ></audio>
  `,
})
export class AudioPlayerBarComponent {
  src = input.required<string>();
  title = input<string>('');
  playing = input<boolean>(false);
  paused = output<void>();
  resumed = output<void>();
  ended = output<void>();
  stopped = output<void>();

  private readonly audioEl = viewChild.required<ElementRef<HTMLAudioElement>>('audioEl');
  protected readonly duration = signal(0);
  protected readonly currentTime = signal(0);
  protected readonly isPlaying = signal(false);

  constructor() {
    effect(() => {
      const el = this.audioEl().nativeElement;
      if (this.playing()) {
        el.play().catch(() => {});
        this.isPlaying.set(true);
      } else {
        el.pause();
        this.isPlaying.set(false);
      }
    });
  }

  protected onPause(): void {
    this.audioEl().nativeElement.pause();
    this.isPlaying.set(false);
    this.paused.emit();
  }

  protected onResume(): void {
    this.audioEl().nativeElement.play().catch(() => {});
    this.isPlaying.set(true);
    this.resumed.emit();
  }

  protected onNext(): void {
    this.ended.emit();
  }

  protected onTimeUpdate(): void {
    this.currentTime.set(Math.floor(this.audioEl().nativeElement.currentTime));
  }

  protected onMetadata(): void {
    this.duration.set(Math.floor(this.audioEl().nativeElement.duration));
  }

  protected onEnded(): void {
    this.isPlaying.set(false);
    this.ended.emit();
  }

  protected onSeek(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.audioEl().nativeElement.currentTime = value;
    this.currentTime.set(value);
  }
}
