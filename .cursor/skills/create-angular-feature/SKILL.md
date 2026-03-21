---
name: create-angular-feature
description: Scaffold a complete Flish Angular feature slice with folder structure, routes, page component, SignalStore, API service, and types. Use when the user asks to create a new feature, module, page, or domain area (e.g. video, audio, photos, settings).
---

# Create Angular Feature (Flish)

Scaffolds a full vertical feature slice for the Flish multimedia VPS client.

## Workflow

1. **Determine the feature name** from the user's request. Use kebab-case (e.g. `video`, `audio`, `photos`, `settings`).
2. **Create the folder structure** under `front-client/src/app/features/<feature-name>/`:

```
front-client/src/app/features/<feature-name>/
├── components/          # Presentational child components
├── pages/               # Route-level container components
│   └── <feature-name>-page.component.ts
│   └── <feature-name>-page.component.css
├── services/
│   └── <feature-name>-api.service.ts
├── store/
│   └── <feature-name>.store.ts
├── models/
│   └── <feature-name>.models.ts
└── <feature-name>.routes.ts
```

3. **Create each file** using the templates below.
4. **Register the feature route** in `front-client/src/app/app.routes.ts` as a lazy-loaded child behind `authGuard`.

## Templates

### Models (`models/<feature-name>.models.ts`)

```typescript
export type MediaCategory = 'video' | 'audio' | 'photo';

export type <FeatureName>Item = {
  id: string;
  relativePath: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  mimeType: string;
  lastWriteUtc: string;
  indexedAtUtc: string;
};

export type Paged<FeatureName>Response = {
  items: <FeatureName>Item[];
  page: number;
  pageSize: number;
  total: number;
};
```

### Service (`services/<feature-name>-api.service.ts`)

```typescript
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Paged<FeatureName>Response } from '../models/<feature-name>.models';

@Injectable({ providedIn: 'root' })
export class <FeatureName>ApiService {
  private readonly http = inject(HttpClient);

  list(page: number, pageSize: number, query: string): Observable<Paged<FeatureName>Response> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('extension', '<relevant-extensions>');
    if (query !== '') {
      params = params.set('query', query);
    }
    return this.http.get<Paged<FeatureName>Response>('/api/files', { params });
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

### Store (`store/<feature-name>.store.ts`)

```typescript
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { <FeatureName>ApiService } from '../services/<feature-name>-api.service';
import { <FeatureName>Item } from '../models/<feature-name>.models';

type <FeatureName>State = {
  items: <FeatureName>Item[];
  selected: <FeatureName>Item | null;
  page: number;
  pageSize: number;
  total: number;
  query: string;
  loading: boolean;
  error: string | null;
};

const initialState: <FeatureName>State = {
  items: [],
  selected: null,
  page: 1,
  pageSize: 25,
  total: 0,
  query: '',
  loading: false,
  error: null,
};

export const <FeatureName>Store = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ items, total, pageSize }) => ({
    count: computed(() => items().length),
    totalPages: computed(() => Math.max(1, Math.ceil(total() / pageSize()))),
  })),

  withMethods((store, api = inject(<FeatureName>ApiService)) => ({
    async load() {
      patchState(store, { loading: true, error: null });
      try {
        const res = await firstValueFrom(api.list(store.page(), store.pageSize(), store.query()));
        patchState(store, { items: res.items, total: res.total, loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load' });
      }
    },

    select(item: <FeatureName>Item | null) {
      patchState(store, { selected: item });
    },

    setQuery(query: string) {
      patchState(store, { query, page: 1 });
    },

    setPage(page: number) {
      patchState(store, { page });
    },
  })),
);
```

### Page Component (`pages/<feature-name>-page.component.ts`)

```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { <FeatureName>Store } from '../store/<feature-name>.store';

@Component({
  selector: 'app-<feature-name>-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './<feature-name>-page.component.css',
  template: `
    <section class="container">
      <h1><FeatureTitle></h1>
      @if (store.loading()) {
        <p class="state">Loading...</p>
      } @else if (store.error()) {
        <p class="state error">{{ store.error() }}</p>
      } @else {
        @for (item of store.items(); track item.id) {
          <div>{{ item.fileName }}</div>
        } @empty {
          <p class="state">No items found.</p>
        }
      }
    </section>
  `,
})
export class <FeatureName>PageComponent {
  protected readonly store = inject(<FeatureName>Store);

  constructor() {
    this.store.load();
  }
}
```

### Page Styles (`pages/<feature-name>-page.component.css`)

```css
:host {
  display: block;
}

.container {
  padding: 1.15rem;
  max-width: 76rem;
  margin: 0 auto;
}

h1 {
  margin: 0 0 1rem;
  font-size: 1.45rem;
}

.state {
  color: var(--text-soft);
}

.error {
  color: var(--danger);
}
```

### Routes (`<feature-name>.routes.ts`)

```typescript
import { Routes } from '@angular/router';
import { <FeatureName>PageComponent } from './pages/<feature-name>-page.component';

export const <featureName>Routes: Routes = [
  { path: '', component: <FeatureName>PageComponent },
];
```

### Register in `front-client/src/app/app.routes.ts`

```typescript
{
  path: '<feature-name>',
  canActivate: [authGuard],
  loadChildren: () => import('./features/<feature-name>/<feature-name>.routes')
    .then(m => m.<featureName>Routes),
},
```

## Checklist

- [ ] All files use `ChangeDetectionStrategy.OnPush`
- [ ] All dependencies use `inject()` (no constructor injection)
- [ ] Store uses `patchState()` for immutable updates
- [ ] Store models loading + error state
- [ ] Service uses Flish paginated API pattern (`/api/files?page=&pageSize=&extension=`)
- [ ] Types are in `models/` and shared across the feature
- [ ] Route is lazy-loaded and protected by `authGuard`
- [ ] CSS uses design tokens from `styles.scss` (`--bg`, `--surface`, `--border`, `--text-soft`, etc.)
- [ ] No `NgModules` used anywhere
