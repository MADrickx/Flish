import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { StreamLinkComponent } from '../../../../core/components/stream-link/stream-link.component';
import { TranscodeTrackerService } from '../../../../core/services/transcode-tracker.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { GroupedMediaItem, MediaItem, formatBytes } from '../../../../core/models/media.models';

@Component({
  selector: 'app-video-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UpperCasePipe, StreamLinkComponent],
  templateUrl: './video-card.component.html',
  styleUrl: './video-card.component.css',
})
export class VideoCardComponent {
  private readonly tracker = inject(TranscodeTrackerService);
  private readonly auth = inject(AuthStateService);

  group = input.required<GroupedMediaItem>();
  played = output<MediaItem>();

  protected readonly selectedIndex = signal(0);

  protected readonly variants = computed(() => this.group().variants);
  protected readonly selected = computed(() => this.variants()[this.selectedIndex()] ?? this.variants()[0]);
  protected readonly baseName = computed(() => this.group().baseName);

  protected readonly hasMp4 = computed(() => this.variants().some((v) => v.extension === 'mp4'));
  protected readonly canTranscode = computed(() => !this.hasMp4() && this.variants().length > 0);

  protected readonly transcodeFileId = computed(() => this.variants()[0]?.id ?? '');
  protected readonly job = computed(() => this.tracker.getJobForFile(this.transcodeFileId()));
  protected readonly transcoding = computed(() => {
    const j = this.job();
    return j !== null && (j.status === 'queued' || j.status === 'running');
  });
  protected readonly transcodeProgress = computed(() => this.job()?.progressPercent ?? 0);

  protected readonly showDropdown = signal(false);

  protected selectVariant(index: number): void {
    this.selectedIndex.set(index);
  }

  protected play(): void {
    this.played.emit(this.selected());
  }

  protected startTranscode(event: Event): void {
    event.stopPropagation();
    this.tracker.startTranscode(this.transcodeFileId());
  }

  protected toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.showDropdown.update((v) => !v);
  }

  protected formatSize(bytes: number): string {
    return formatBytes(bytes);
  }

  protected pillClass(ext: string): string {
    return `pill pill-${ext.toLowerCase()}`;
  }

  protected downloadUrl(id: string): string {
    return `/api/files/${id}/download?access_token=${encodeURIComponent(this.auth.accessToken())}`;
  }
}
