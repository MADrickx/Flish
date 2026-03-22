import { ChangeDetectionStrategy, Component, input, output, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { StreamLinkComponent } from '../../../../core/components/stream-link/stream-link.component';

@Component({
  selector: 'app-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StreamLinkComponent],
  host: {
    '(keydown)': 'onKeydown($event)',
    tabindex: '-1',
  },
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.css',
})
export class VideoPlayerComponent {
  src = input.required<string>();
  title = input<string>('');
  shortCode = input<string>('');
  closed = output<void>();

  private readonly videoEl = viewChild.required<ElementRef<HTMLVideoElement>>('videoEl');

  constructor() {
    afterNextRender(() => {
      this.videoEl().nativeElement.focus();
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const video = this.videoEl().nativeElement;
    switch (event.key) {
      case ' ':
        event.preventDefault();
        video.paused ? video.play() : video.pause();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
        break;
      case 'ArrowRight':
        event.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
        break;
      case 'f':
        event.preventDefault();
        document.fullscreenElement ? document.exitFullscreen() : video.requestFullscreen();
        break;
      case 'Escape':
        event.preventDefault();
        this.closed.emit();
        break;
    }
  }
}
