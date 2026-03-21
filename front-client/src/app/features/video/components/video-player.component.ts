import { ChangeDetectionStrategy, Component, input, output, viewChild, ElementRef, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown)': 'onKeydown($event)',
    tabindex: '-1',
  },
  styles: `
    :host {
      display: block;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: #000;
      overflow: hidden;
      box-shadow: var(--shadow);
      outline: none;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .title {
      font-weight: 600;
      font-size: 0.95rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .close-btn {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text-soft);
      padding: 0.25rem 0.5rem;
      cursor: pointer;
      font-size: 0.85rem;
      flex-shrink: 0;
    }
    .close-btn:hover {
      color: var(--text);
    }
    video {
      width: 100%;
      display: block;
      max-height: 75dvh;
    }
    .hint {
      text-align: center;
      padding: 0.3rem;
      font-size: 0.72rem;
      color: var(--text-soft);
      background: var(--surface);
      border-top: 1px solid var(--border);
    }
  `,
  template: `
    <div class="header">
      <span class="title">{{ title() }}</span>
      <button class="close-btn" type="button" (click)="closed.emit()">Close</button>
    </div>
    <video
      #videoEl
      [src]="src()"
      controls
      autoplay
      preload="metadata"
    ></video>
    <div class="hint">Space: play/pause &middot; Left/Right: seek 10s &middot; F: fullscreen &middot; Esc: close</div>
  `,
})
export class VideoPlayerComponent {
  src = input.required<string>();
  title = input<string>('');
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
