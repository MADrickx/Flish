import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-photo-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      border-radius: var(--radius);
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.12s ease, box-shadow 0.12s ease;
    }
    :host:hover {
      transform: scale(1.02);
      box-shadow: var(--shadow);
    }
    img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      display: block;
      background: var(--bg);
    }
    .name {
      padding: 0.35rem 0.5rem;
      background: var(--surface);
      font-size: 0.8rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border: 1px solid var(--border);
      border-top: none;
      border-radius: 0 0 var(--radius) var(--radius);
    }
  `,
  template: `
    <img [src]="thumbUrl()" [alt]="fileName()" loading="lazy" (click)="selected.emit()" />
    <div class="name">{{ fileName() }}</div>
  `,
})
export class PhotoCardComponent {
  thumbUrl = input.required<string>();
  fileName = input.required<string>();
  selected = output<void>();
}
