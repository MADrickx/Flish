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
  templateUrl: './audio-player-bar.component.html',
  styleUrl: './audio-player-bar.component.css',
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
