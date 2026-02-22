---
name: create-angular-service
description: Create an Angular service with inject(), providedIn root, strong typing, and HttpClient patterns. Use when the user asks to create a new service, API client, data access layer, or utility service.
---

# Create Angular Service

Creates a strongly-typed Angular service following project conventions.

## Workflow

1. **Determine the service name and location** from the user's request.
   - Feature services go in `src/app/features/<feature>/services/`
   - Core/shared services go in `src/app/core/services/`
2. **Determine the service type**: data access (HTTP), utility, or state.
3. **Create the file** using the appropriate template.

## Naming

- File: `<service-name>.service.ts`
- Class: `<ServiceName>Service`

## Template: Data Access Service (HTTP)

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { <EntityName> } from '../types/<feature-name>.types';

@Injectable({ providedIn: 'root' })
export class <ServiceName>Service {
  private http = inject(HttpClient);
  private baseUrl = '/api/<entity-name>s';

  getAll() {
    return this.http.get<EntityName[]>(this.baseUrl);
  }

  getById(id: string) {
    return this.http.get<EntityName>(`${this.baseUrl}/${id}`);
  }

  create(payload: Omit<EntityName, 'id'>) {
    return this.http.post<EntityName>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<EntityName>) {
    return this.http.patch<EntityName>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  search(query: string) {
    const params = new HttpParams().set('q', query);
    return this.http.get<EntityName[]>(this.baseUrl, { params });
  }
}
```

## Template: Utility Service

For services that provide helper functionality without HTTP:

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
  // modify req or handle response
  return next(req);
};
```

Register in `app.config.ts`:
```typescript
provideHttpClient(withInterceptors([<interceptorName>Interceptor]))
```

## Template: Functional Guard

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const <guardName>Guard: CanActivateFn = () => {
  const router = inject(Router);
  // return true, false, or UrlTree
  return true;
};
```

## Rules

- **Always** use `inject()` for dependencies — never constructor injection
- **Always** use `@Injectable({ providedIn: 'root' })` unless the service is scoped to a route
- **Always** type HTTP responses with generics (`http.get<T>()`)
- **Always** use `Omit`, `Partial`, `Pick` for payload types derived from entities
- **Never** use class-based interceptors or guards — use functional alternatives
- **Never** manage state with `BehaviorSubject` — use NgRx SignalStore instead
- **Keep** services focused on data access; put state logic in stores
