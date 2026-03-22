import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type TranscodeJobStatus = {
  id: string;
  fileId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progressPercent: number;
  outputPath: string | null;
  error: string | null;
};

@Injectable({ providedIn: 'root' })
export class TranscodeApiService {
  private readonly http = inject(HttpClient);

  start(fileId: string): Observable<{ jobId: string }> {
    return this.http.post<{ jobId: string }>(`/api/files/${fileId}/transcode`, {});
  }

  getStatus(jobId: string): Observable<TranscodeJobStatus> {
    return this.http.get<TranscodeJobStatus>(`/api/transcode/${jobId}/status`);
  }
}
