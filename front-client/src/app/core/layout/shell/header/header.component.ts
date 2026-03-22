import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { TranscodeTrackerService } from '../../../services/transcode-tracker.service';
import { TranscodeJobStatus } from '../../../services/transcode-api.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  protected readonly tracker = inject(TranscodeTrackerService);
  protected readonly panelOpen = signal(false);

  ngOnInit(): void {
    this.tracker.loadAll();
  }

  protected togglePanel(): void {
    this.panelOpen.update((v) => !v);
  }

  protected cancel(job: TranscodeJobStatus): void {
    this.tracker.cancelJob(job.fileId);
  }

  protected statusLabel(status: string): string {
    switch (status) {
      case 'queued':
        return 'Queued';
      case 'running':
        return 'Running';
      case 'completed':
        return 'Done';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }
}
