import { HttpClient, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';

export type UploadProgress = {
  status: 'uploading' | 'done';
  percent: number;
  path?: string;
};

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);

  upload(file: File, relativeDirectory?: string): Observable<UploadProgress> {
    const data = new FormData();
    data.append('file', file);
    if (relativeDirectory) {
      data.append('relativeDirectory', relativeDirectory);
    }

    return this.http
      .post<{ path: string }>('/api/files/upload', data, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        filter((event) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
        map((event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const percent = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
            return { status: 'uploading' as const, percent };
          }
          const body = 'body' in event ? (event.body as { path: string } | null) : null;
          return { status: 'done' as const, percent: 100, path: body?.path };
        }),
      );
  }
}
