import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-video-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: linear-gradient(180deg, var(--surface-elev), var(--surface));
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.15s ease, transform 0.1s ease;
    }
    :host:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
    }
    .thumb {
      aspect-ratio: 16 / 9;
      background: var(--bg);
      display: grid;
      place-items: center;
      font-size: 2.5rem;
      color: var(--text-soft);
      position: relative;
    }
    .play-overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      background: rgba(0, 0, 0, 0.3);
      opacity: 0;
      transition: opacity 0.15s ease;
      font-size: 3rem;
      color: #fff;
    }
    :host:hover .play-overlay {
      opacity: 1;
    }
    .info {
      padding: 0.55rem 0.65rem;
    }
    .name {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.9rem;
    }
    .meta {
      font-size: 0.8rem;
      color: var(--text-soft);
      margin-top: 0.15rem;
    }
  `,
  template: `
    <div class="thumb" (click)="selected.emit()">
      <span>🎬</span>
      <div class="play-overlay">▶</div>
    </div>
    <div class="info">
      <div class="name">{{ fileName() }}</div>
      <div class="meta">{{ size() }} &middot; {{ extension() }}</div>
    </div>
  `,
})
export class VideoCardComponent {
  fileName = input.required<string>();
  extension = input.required<string>();
  size = input.required<string>();
  selected = output<void>();
}
