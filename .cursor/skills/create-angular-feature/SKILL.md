---
name: create-angular-feature
description: Scaffold a complete Angular feature slice with folder structure, routes, page component, store, service, and types. Use when the user asks to create a new feature, module, page, or domain area in the application.
---

# Create Angular Feature

Scaffolds a full vertical feature slice following the project's feature-based architecture.

## Workflow

1. **Determine the feature name** from the user's request. Use kebab-case (e.g. `user-profile`, `auth`, `dashboard`).
2. **Create the folder structure** under `src/app/features/<feature-name>/`:

```
src/app/features/<feature-name>/
├── components/          # Presentational child components
├── pages/               # Route-level container components
│   └── <feature-name>-page.ts
├── services/
│   └── <feature-name>.service.ts
├── store/
│   └── <feature-name>.store.ts
├── types/
│   └── <feature-name>.types.ts
└── <feature-name>.routes.ts
```

3. **Create each file** using the templates below.
4. **Register the feature route** in `src/app/app.routes.ts` as a lazy-loaded child.

## Templates

### Types (`types/<feature-name>.types.ts`)

```typescript
export type <FeatureName> = {
  id: string;
  // add domain fields
};
```

### Service (`services/<feature-name>.service.ts`)

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { <FeatureName> } from '../types/<feature-name>.types';

@Injectable({ providedIn: 'root' })
export class <FeatureName>Service {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<FeatureName[]>('/api/<feature-name>s');
  }

  getById(id: string) {
    return this.http.get<FeatureName>(`/api/<feature-name>s/${id}`);
  }
}
```

### Store (`store/<feature-name>.store.ts`)

```typescript
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { <FeatureName>Service } from '../services/<feature-name>.service';
import { <FeatureName> } from '../types/<feature-name>.types';

type <FeatureName>State = {
  items: <FeatureName>[];
  loading: boolean;
  error: string | null;
};

const initialState: <FeatureName>State = {
  items: [],
  loading: false,
  error: null,
};

export const <FeatureName>Store = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ items }) => ({
    count: computed(() => items().length),
  })),

  withMethods((store, service = inject(<FeatureName>Service)) => ({
    async loadAll() {
      patchState(store, { loading: true, error: null });
      try {
        const items = await firstValueFrom(service.getAll());
        patchState(store, { items, loading: false });
      } catch (e) {
        patchState(store, { loading: false, error: 'Failed to load' });
      }
    },
  })),
);
```

### Page Component (`pages/<feature-name>-page.ts`)

```typescript
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { <FeatureName>Store } from '../store/<feature-name>.store';

@Component({
  selector: 'app-<feature-name>-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.loading()) {
      <p>Loading...</p>
    } @else if (store.error()) {
      <p>{{ store.error() }}</p>
    } @else {
      @for (item of store.items(); track item.id) {
        <div>{{ item.id }}</div>
      } @empty {
        <p>No items.</p>
      }
    }
  `,
})
export class <FeatureName>PageComponent implements OnInit {
  protected store = inject(<FeatureName>Store);

  ngOnInit() {
    this.store.loadAll();
  }
}
```

### Routes (`<feature-name>.routes.ts`)

```typescript
import { Routes } from '@angular/router';
import { <FeatureName>PageComponent } from './pages/<feature-name>-page';

export const <featureName>Routes: Routes = [
  { path: '', component: <FeatureName>PageComponent },
];
```

### Register in `app.routes.ts`

Add the lazy-loaded route to the root routes array:

```typescript
{
  path: '<feature-name>',
  loadChildren: () => import('./features/<feature-name>/<feature-name>.routes')
    .then(m => m.<featureName>Routes),
},
```

## Checklist

- [ ] All files use `ChangeDetectionStrategy.OnPush`
- [ ] All dependencies use `inject()` (no constructor injection)
- [ ] Store uses `patchState()` for immutable updates
- [ ] Types are defined in `types/` and shared across the feature
- [ ] Route is lazy-loaded from `app.routes.ts`
- [ ] No `NgModules` used anywhere
