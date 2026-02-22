import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedFilesResponse } from '../models/file.models';

@Injectable({ providedIn: 'root' })
export class FilesApiService {
  private readonly http = inject(HttpClient);

  list(page: number, pageSize: number, query: string): Observable<PagedFilesResponse> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (query !== '') {
      params = params.set('query', query);
    }

    return this.http.get<PagedFilesResponse>('/api/files', { params });
  }

  upload(file: File): Observable<{ path: string }> {
    const data = new FormData();
    data.append('file', file);
    return this.http.post<{ path: string }>('/api/files/upload', data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/files/${id}`);
  }
}

