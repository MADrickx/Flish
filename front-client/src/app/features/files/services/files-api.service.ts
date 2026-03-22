import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../core/services/base-api.service';
import { MediaItem, PagedResponse } from '../../../core/models/media.models';

@Injectable({ providedIn: 'root' })
export class FilesApiService extends BaseApiService<MediaItem> {
  protected readonly basePath = '/api/files';

  listFiles(page: number, pageSize: number, query: string): Observable<PagedResponse<MediaItem>> {
    return this.list(page, pageSize, { query });
  }

  upload(file: File): Observable<{ path: string }> {
    const data = new FormData();
    data.append('file', file);
    return this.http.post<{ path: string }>(`${this.basePath}/upload`, data);
  }

  rename(id: string, newFileName: string): Observable<MediaItem> {
    return this.http.patch<MediaItem>(`${this.basePath}/${id}/rename`, { newFileName });
  }
}
