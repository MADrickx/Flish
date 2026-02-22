---
name: create-angular-store
description: Create an NgRx SignalStore for feature-level state management with withState, withComputed, withMethods, patchState, and optional withEntities. Use when the user asks to create a store, state management, or manage feature state.
---

# Create Angular SignalStore

Creates an NgRx SignalStore following project conventions.

> Requires `@ngrx/signals`. If not installed: `npm install @ngrx/signals`

## Workflow

1. **Determine the feature/domain** the store belongs to.
2. **Define the state shape** with proper TypeScript types.
3. **Create the store file** at `src/app/features/<feature>/store/<feature>.store.ts`.
4. **Create or update the types file** at `src/app/features/<feature>/types/<feature>.types.ts`.

## Template: Basic Store

```typescript
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { <FeatureName>Service } from '../services/<feature-name>.service';
import { <FeatureName> } from '../types/<feature-name>.types';

type <FeatureName>State = {
  items: <FeatureName>[];
  selected: <FeatureName> | null;
  loading: boolean;
  error: string | null;
};

const initialState: <FeatureName>State = {
  items: [],
  selected: null,
  loading: false,
  error: null,
};

export const <FeatureName>Store = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ items }) => ({
    count: computed(() => items().length),
    hasItems: computed(() => items().length > 0),
  })),

  withMethods((store, service = inject(<FeatureName>Service)) => ({
    async loadAll() {
      patchState(store, { loading: true, error: null });
      try {
        const items = await firstValueFrom(service.getAll());
        patchState(store, { items, loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load items' });
      }
    },

    select(item: <FeatureName>) {
      patchState(store, { selected: item });
    },

    clearSelection() {
      patchState(store, { selected: null });
    },
  })),
);
```

## Template: Entity Store (collections)

For stores managing normalized entity collections:

```typescript
import { computed, inject } from '@angular/core';
import {
  signalStore, withComputed, withMethods, patchState, withHooks,
} from '@ngrx/signals';
import { withEntities, entityConfig, setAllEntities, addEntity, removeEntity, updateEntity } from '@ngrx/signals/entities';
import { type } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { <FeatureName>Service } from '../services/<feature-name>.service';
import { <FeatureName> } from '../types/<feature-name>.types';

const <featureName>Config = entityConfig({
  entity: type<<FeatureName>>(),
  collection: '<featureName>s',
  selectId: (item) => item.id,
});

export const <FeatureName>Store = signalStore(
  { providedIn: 'root' },
  withEntities(<featureName>Config),

  withComputed(({ <featureName>sEntities }) => ({
    count: computed(() => <featureName>sEntities().length),
  })),

  withMethods((store, service = inject(<FeatureName>Service)) => ({
    async loadAll() {
      const items = await firstValueFrom(service.getAll());
      patchState(store, setAllEntities(items, <featureName>Config));
    },

    add(item: <FeatureName>) {
      patchState(store, addEntity(item, <featureName>Config));
    },

    remove(id: string) {
      patchState(store, removeEntity(id, <featureName>Config));
    },
  })),
);
```

## Template: Store with rxMethod (Observable side effects)

When methods need RxJS pipelines (debounce, retry, switchMap):

```typescript
import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { <FeatureName>Service } from '../services/<feature-name>.service';
import { <FeatureName> } from '../types/<feature-name>.types';

export const <FeatureName>Store = signalStore(
  { providedIn: 'root' },
  withState({ items: [] as <FeatureName>[], loading: false }),

  withMethods((store, service = inject(<FeatureName>Service)) => ({
    loadByQuery: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap((query) =>
          service.search(query).pipe(
            tapResponse(
              (items) => patchState(store, { items, loading: false }),
              () => patchState(store, { loading: false }),
            ),
          ),
        ),
      ),
    ),
  })),
);
```

## Rules

- **One store per feature** — never a single global store
- **State root must be an object** — never a bare array
- **Always** use `patchState()` for updates — never mutate state directly
- **Always** create new references for arrays/objects — never mutate in place
- **Always** model loading/error state explicitly
- **Use** `withComputed()` for derived values — never recompute in templates
- **Use** `rxMethod()` when services return Observables
- **Use** layered `withMethods()` calls when one method calls another
- **Protected state** is default — only store methods modify state
- **Use** `{ providedIn: 'root' }` for app-wide stores, or provide in route-level `providers` for scoped stores
