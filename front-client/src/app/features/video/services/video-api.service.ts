import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../core/services/base-api.service';
import { MediaItem, PagedResponse } from '../../../core/models/media.models';

@Injectable({ providedIn: 'root' })
export class VideoApiService extends BaseApiService<MediaItem> {
  protected readonly basePath = '/api/files';

  listVideos(page: number, pageSize: number, query: string): Observable<PagedResponse<MediaItem>> {
    return this.list(page, pageSize, { query, category: 'video' });
  }
}
