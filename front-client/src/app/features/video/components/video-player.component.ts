import { ChangeDetectionStrategy, Component, input, output, viewChild, ElementRef, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: #000;
      overflow: hidden;
      box-shadow: var(--shadow);
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
    }
    .close-btn:hover {
      color: var(--text);
    }
    video {
      width: 100%;
      display: block;
      max-height: 75dvh;
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
}
