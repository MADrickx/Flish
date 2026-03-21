import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 3rem 1rem;
      color: var(--text-soft);
    }
    .icon {
      font-size: 2.5rem;
      opacity: 0.5;
    }
    .message {
      font-size: 0.95rem;
    }
  `,
  template: `
    <span class="icon" aria-hidden="true">{{ icon() }}</span>
    <span class="message">{{ message() }}</span>
  `,
})
export class EmptyStateComponent {
  icon = input<string>('📂');
  message = input<string>('Nothing here yet.');
}
