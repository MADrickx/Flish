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
  styleUrl: './photo-viewer.component.css',
  templateUrl: './photo-viewer.component.html',
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
