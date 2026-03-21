import { ChangeDetectionStrategy, Component, input, output, ElementRef, viewChild, afterNextRender } from '@angular/core';

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
      outline: none;
    }
    .viewer-content {
      position: relative;
      max-width: 92vw;
      max-height: 92dvh;
      cursor: default;
      animation: fadeIn 0.2s ease;
    }
    img {
      max-width: 90vw;
      max-height: 82dvh;
      object-fit: contain;
      border-radius: var(--radius);
      display: block;
    }
    .caption {
      text-align: center;
      margin-top: 0.45rem;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.88rem;
    }
    .hint {
      text-align: center;
      margin-top: 0.2rem;
      color: rgba(255, 255, 255, 0.35);
      font-size: 0.72rem;
    }
    .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      color: #fff;
      width: 2.8rem;
      height: 2.8rem;
      font-size: 1.3rem;
      cursor: pointer;
      display: grid;
      place-items: center;
      transition: background 0.15s ease, transform 0.1s ease;
    }
    .nav-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .nav-btn:active {
      transform: translateY(-50%) scale(0.95);
    }
    .prev { left: 1rem; }
    .next { right: 1rem; }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
    @media (max-width: 600px) {
      .nav-btn { width: 2.2rem; height: 2.2rem; font-size: 1.1rem; }
      .prev { left: 0.4rem; }
      .next { right: 0.4rem; }
    }
  `,
  template: `
    <div class="viewer-content" #viewer (click)="$event.stopPropagation()">
      <button class="nav-btn prev" type="button" (click)="prev.emit()">&#8249;</button>
      <img [src]="src()" [alt]="title()" />
      <button class="nav-btn next" type="button" (click)="next.emit()">&#8250;</button>
      <div class="caption">{{ title() }}</div>
      <div class="hint">Arrow keys: navigate &middot; Esc: close</div>
    </div>
  `,
})
export class PhotoViewerComponent {
  src = input.required<string>();
  title = input<string>('');
  closed = output<void>();
  next = output<void>();
  prev = output<void>();

  private readonly viewer = viewChild.required<ElementRef>('viewer');

  constructor() {
    afterNextRender(() => {
      const host = (this.viewer().nativeElement as HTMLElement).closest('app-photo-viewer') as HTMLElement | null;
      host?.focus();
    });
  }
}
