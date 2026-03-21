import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type IndexStatus = {
  isRunning: boolean;
  lastCompletedAtUtc: string | null;
  lastSeenFiles: number;
  lastUpsertedFiles: number;
  lastSoftDeletedFiles: number;
  lastError: string | null;
};

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly http = inject(HttpClient);

  getIndexStatus(): Observable<IndexStatus> {
    return this.http.get<IndexStatus>('/api/index/status');
  }

  rebuildIndex(): Observable<void> {
    return this.http.post<void>('/api/index/rebuild', {});
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/change-password', { currentPassword, newPassword });
  }
}
