import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../core/services/base-api.service';
import { MediaItem, PagedResponse } from '../../../core/models/media.models';

@Injectable({ providedIn: 'root' })
export class AudioApiService extends BaseApiService<MediaItem> {
  protected readonly basePath = '/api/files';

  listAudio(page: number, pageSize: number, query: string): Observable<PagedResponse<MediaItem>> {
    return this.list(page, pageSize, { query, category: 'audio' });
  }
}
