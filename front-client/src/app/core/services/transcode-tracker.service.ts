import { Injectable, inject, signal, computed } from '@angular/core';
import { Subject, interval, switchMap, takeWhile, Subscription } from 'rxjs';
import { TranscodeApiService, TranscodeJobStatus } from './transcode-api.service';

@Injectable({ providedIn: 'root' })
export class TranscodeTrackerService {
  private readonly api = inject(TranscodeApiService);
  private readonly jobs = signal<Map<string, TranscodeJobStatus>>(new Map());
  private readonly pollers = new Map<string, Subscription>();
  private readonly completedSubject = new Subject<string>();

  readonly completed$ = this.completedSubject.asObservable();

  readonly activeJobs = computed(() => {
    const all = [...this.jobs().values()];
    return all.filter((j) => j.status === 'queued' || j.status === 'running');
  });

  readonly allJobs = computed(() => [...this.jobs().values()]);

  readonly runningCount = computed(() => this.activeJobs().length);

  loadAll(): void {
    this.api.listAll().subscribe({
      next: (serverJobs) => {
        this.jobs.update((map) => {
          const next = new Map(map);
          for (const job of serverJobs) {
            next.set(job.fileId, job);
          }
          return next;
        });
        for (const job of serverJobs) {
          if ((job.status === 'queued' || job.status === 'running') && !this.pollers.has(job.fileId)) {
            this.startPolling(job.fileId, job.id);
          }
        }
      },
    });
  }

  startTranscode(fileId: string): void {
    this.api.start(fileId).subscribe({
      next: ({ jobId }) => {
        const initial: TranscodeJobStatus = {
          id: jobId,
          fileId,
          fileName: '',
          status: 'queued',
          progressPercent: 0,
          outputPath: null,
          error: null,
        };
        this.updateJob(fileId, initial);
        this.startPolling(fileId, jobId);
      },
    });
  }

  cancelJob(fileId: string): void {
    const job = this.jobs().get(fileId);
    if (!job) return;

    this.api.cancel(job.id).subscribe({
      next: () => {
        this.updateJob(fileId, { ...job, status: 'cancelled' });
        this.pollers.get(fileId)?.unsubscribe();
        this.pollers.delete(fileId);
      },
    });
  }

  getJobForFile(fileId: string): TranscodeJobStatus | null {
    return this.jobs().get(fileId) ?? null;
  }

  private startPolling(fileId: string, jobId: string): void {
    this.pollers.get(fileId)?.unsubscribe();

    const sub = interval(2000)
      .pipe(
        switchMap(() => this.api.getStatus(jobId)),
        takeWhile((job) => job.status === 'queued' || job.status === 'running', true),
      )
      .subscribe({
        next: (job) => {
          this.updateJob(fileId, job);
          if (job.status === 'completed') {
            this.completedSubject.next(fileId);
            this.pollers.delete(fileId);
          } else if (job.status === 'failed' || job.status === 'cancelled') {
            this.pollers.delete(fileId);
          }
        },
        error: () => {
          this.pollers.delete(fileId);
        },
      });

    this.pollers.set(fileId, sub);
  }

  private updateJob(fileId: string, job: TranscodeJobStatus): void {
    this.jobs.update((map) => {
      const next = new Map(map);
      next.set(fileId, job);
      return next;
    });
  }
}
