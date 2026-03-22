import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-stream-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stream-link.component.html',
  styleUrl: './stream-link.component.css',
})
export class StreamLinkComponent {
  private readonly http = inject(HttpClient);

  shortCode = input.required<string>();
  fileId = input.required<string>();
  isPublic = input<boolean>(false);
  compact = input<boolean>(true);

  visibilityChanged = output<boolean>();

  protected copied = signal<'secure' | 'public' | null>(null);
  protected toggling = signal(false);

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

  protected toggleVisibility(): void {
    this.toggling.set(true);
    const newValue = !this.isPublic();
    this.http
      .patch<{ id: string; isPublic: boolean }>(`/api/files/${this.fileId()}/visibility`, {
        isPublic: newValue,
      })
      .subscribe({
        next: (res) => {
          this.visibilityChanged.emit(res.isPublic);
          this.toggling.set(false);
        },
        error: () => this.toggling.set(false),
      });
  }
}
