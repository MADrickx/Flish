import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-photo-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'closed.emit()',
    '(keydown.escape)': 'closed.emit()',
    '(keydown.arrowRight)': 'next.emit()',
    '(keydown.arrowLeft)': 'prev.emit()',
    tabindex: '0',
  },
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: grid;
      place-items: center;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(8px);
      cursor: zoom-out;
    }
    .viewer-content {
      position: relative;
      max-width: 90vw;
      max-height: 90dvh;
      cursor: default;
    }
    img {
      max-width: 90vw;
      max-height: 85dvh;
      object-fit: contain;
      border-radius: var(--radius);
      display: block;
    }
    .caption {
      text-align: center;
      margin-top: 0.5rem;
      color: var(--text-soft);
      font-size: 0.9rem;
    }
    .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      color: #fff;
      width: 2.5rem;
      height: 2.5rem;
      font-size: 1.2rem;
      cursor: pointer;
      display: grid;
      place-items: center;
      transition: background 0.15s ease;
    }
    .nav-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .prev { left: -3.5rem; }
    .next { right: -3.5rem; }
  `,
  template: `
    <div class="viewer-content" (click)="$event.stopPropagation()">
      <button class="nav-btn prev" type="button" (click)="prev.emit()">&#8249;</button>
      <img [src]="src()" [alt]="title()" />
      <button class="nav-btn next" type="button" (click)="next.emit()">&#8250;</button>
      <div class="caption">{{ title() }}</div>
    </div>
  `,
})
export class PhotoViewerComponent {
  src = input.required<string>();
  title = input<string>('');
  closed = output<void>();
  next = output<void>();
  prev = output<void>();
}
