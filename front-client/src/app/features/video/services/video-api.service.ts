import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../core/services/base-api.service';
import { GroupedMediaItem, MediaItem, PagedResponse } from '../../../core/models/media.models';

@Injectable({ providedIn: 'root' })
export class VideoApiService extends BaseApiService<MediaItem> {
  protected readonly basePath = '/api/files';

  listVideos(page: number, pageSize: number, query: string): Observable<PagedResponse<MediaItem>> {
    return this.list(page, pageSize, { query, category: 'video' });
  }

  listGrouped(page: number, pageSize: number, query: string): Observable<PagedResponse<GroupedMediaItem>> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('category', 'video');
    if (query) {
      params = params.set('query', query);
    }
    return this.http.get<PagedResponse<GroupedMediaItem>>('/api/files/grouped', { params });
  }
}
