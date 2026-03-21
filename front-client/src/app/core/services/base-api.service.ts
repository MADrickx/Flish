import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResponse } from '../models/media.models';

export abstract class BaseApiService<T extends { id: string }> {
  protected readonly http = inject(HttpClient);
  protected abstract readonly basePath: string;

  list(page: number, pageSize: number, extra?: Record<string, string>): Observable<PagedResponse<T>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        if (value !== '') {
          params = params.set(key, value);
        }
      }
    }
    return this.http.get<PagedResponse<T>>(this.basePath, { params });
  }

  getById(id: string): Observable<T> {
    return this.http.get<T>(`${this.basePath}/${id}`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/${id}`);
  }

  streamUrl(id: string): string {
    return `${this.basePath}/${id}/stream`;
  }

  downloadUrl(id: string): string {
    return `${this.basePath}/${id}/download`;
  }
}
