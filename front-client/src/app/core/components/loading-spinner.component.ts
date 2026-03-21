import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 1.5rem 0;
      color: var(--text-soft);
    }
    .spinner {
      width: 1.2rem;
      height: 1.2rem;
      border: 2px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `,
  template: `
    <div class="spinner"></div>
    <span>{{ message() }}</span>
  `,
})
export class LoadingSpinnerComponent {
  message = input<string>('Loading...');
}
