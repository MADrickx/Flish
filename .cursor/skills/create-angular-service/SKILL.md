---
name: create-angular-service
description: Create an Angular service for the Flish multimedia client with paginated API calls, streaming URL builders, upload with FormData, and functional interceptors/guards. Use when the user asks to create a new service, API client, data access layer, or utility service.
---

# Create Angular Service (Flish)

Creates a strongly-typed Angular service following Flish conventions.

## Workflow

1. **Determine the service name and location** from the user's request.
   - Feature services go in `front-client/src/app/features/<feature>/services/`
   - Core/shared services go in `front-client/src/app/core/services/`
2. **Determine the service type**: data access (HTTP), streaming, upload, or utility.
3. **Create the file** using the appropriate template.

## Flish API Conventions

- Base API: `/api/files` (all media goes through the file index)
- Pagination: `?page=1&pageSize=25`
- Filtering: `?query=<path>&extension=<ext>`
- Streaming: `/api/files/{id}/stream` (range-request aware)
- Download: `/api/files/{id}/download`
- Upload: `POST /api/files/upload` (multipart/form-data)
- Auth: Basic Auth header injected by `front-client/src/app/core/auth/basic-auth.interceptor.ts`

## Template: Media API Service

Standard service for a media feature (video, audio, photos):

```typescript
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedMediaResponse, MediaItem } from '../models/<feature-name>.models';

@Injectable({ providedIn: 'root' })
export class <FeatureName>ApiService {
  private readonly http = inject(HttpClient);
  private readonly extensions = '<comma-separated-exts>';

  list(page: number, pageSize: number, query: string): Observable<PagedMediaResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('extension', this.extensions);
    if (query !== '') {
      params = params.set('query', query);
    }
    return this.http.get<PagedMediaResponse>('/api/files', { params });
  }

  getById(id: string): Observable<MediaItem> {
    return this.http.get<MediaItem>(`/api/files/${id}`);
  }

  streamUrl(id: string): string {
    return `/api/files/${id}/stream`;
  }

  downloadUrl(id: string): string {
    return `/api/files/${id}/download`;
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/files/${id}`);
  }
}
```

Extension examples by feature:
- Video: `'mp4,mkv,avi,webm,mov'`
- Audio: `'mp3,flac,wav,ogg,aac'`
- Photos: `'jpg,jpeg,png,gif,webp,bmp'`

## Template: Upload Service

For uploading files to the VPS master directory:

```typescript
import { HttpClient, HttpEventType, HttpEvent } from '@angular/common/http';
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
        filter(
          (event): event is HttpEvent<{ path: string }> =>
            event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response,
        ),
        map((event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const percent = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
            return { status: 'uploading' as const, percent };
          }
          return { status: 'done' as const, percent: 100, path: (event as any).body?.path };
        }),
      );
  }
}
```

## Template: Utility Service

```typescript
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class <ServiceName>Service {
  // stateless utility methods here
}
```

## Template: Functional Interceptor

```typescript
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

export const <interceptorName>Interceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
```

Register in `front-client/src/app/app.config.ts`:
```typescript
provideHttpClient(withInterceptors([<interceptorName>Interceptor]))
```

## Template: Functional Guard

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const <guardName>Guard: CanActivateFn = () => {
  const router = inject(Router);
  return true;
};
```

## Rules

- **Always** use `inject()` for dependencies -- never constructor injection
- **Always** use `@Injectable({ providedIn: 'root' })` unless scoped to a route
- **Always** type HTTP responses with generics (`http.get<T>()`)
- **Always** use `Omit`, `Partial`, `Pick` for payload types derived from entities
- **Never** use class-based interceptors or guards -- use functional alternatives
- **Never** manage state with `BehaviorSubject` -- use NgRx SignalStore instead
- **Keep** services focused on data access and URL building; put state logic in stores
- **Use** `streamUrl()` / `downloadUrl()` methods that return plain strings for `<video src>`, `<audio src>`, and `<a href>`
