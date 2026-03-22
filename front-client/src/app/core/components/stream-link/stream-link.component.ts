import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-stream-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stream-link.component.html',
  styleUrl: './stream-link.component.css',
})
export class StreamLinkComponent {
  shortCode = input.required<string>();
  compact = input<boolean>(true);

  protected copied = signal<'secure' | 'public' | null>(null);

  protected get secureUrl(): string {
    return `${location.origin}/s/${this.shortCode()}`;
  }

  protected get publicUrl(): string {
    return `${location.origin}/p/${this.shortCode()}`;
  }

  protected async copy(type: 'secure' | 'public'): Promise<void> {
    const url = type === 'secure' ? this.secureUrl : this.publicUrl;
    await navigator.clipboard.writeText(url);
    this.copied.set(type);
    setTimeout(() => this.copied.set(null), 1500);
  }
}
