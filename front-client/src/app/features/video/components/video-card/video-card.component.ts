import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { StreamLinkComponent } from '../../../../core/components/stream-link/stream-link.component';
import { TranscodeTrackerService } from '../../../../core/services/transcode-tracker.service';

@Component({
  selector: 'app-video-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StreamLinkComponent],
  templateUrl: './video-card.component.html',
  styleUrl: './video-card.component.css',
})
export class VideoCardComponent {
  private readonly tracker = inject(TranscodeTrackerService);

  fileId = input.required<string>();
  fileName = input.required<string>();
  extension = input.required<string>();
  size = input.required<string>();
  shortCode = input.required<string>();
  selected = output<void>();

  protected readonly canTranscode = computed(() => {
    const ext = this.extension().toLowerCase();
    return ext !== 'mp4' && ext !== 'webm';
  });

  protected readonly job = computed(() => this.tracker.getJobForFile(this.fileId()));

  protected readonly transcoding = computed(() => {
    const j = this.job();
    return j !== null && (j.status === 'queued' || j.status === 'running');
  });

  protected readonly transcodeProgress = computed(() => this.job()?.progressPercent ?? 0);

  protected startTranscode(event: Event): void {
    event.stopPropagation();
    this.tracker.startTranscode(this.fileId());
  }
}
