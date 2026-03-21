---
name: create-angular-store
description: Create an NgRx SignalStore for a Flish feature with paginated media state, playback state, filtering by media category, and patchState patterns. Use when the user asks to create a store, state management, or manage feature state for video, audio, photos, or any media domain.
---

# Create Angular SignalStore (Flish)

Creates an NgRx SignalStore for a Flish multimedia feature.

> Requires `@ngrx/signals`. If not installed: `npm install @ngrx/signals`

## Workflow

1. **Determine the feature/domain** the store belongs to (video, audio, photos, etc.).
2. **Define the state shape** with proper TypeScript types.
3. **Create the store file** at `front-client/src/app/features/<feature>/store/<feature>.store.ts`.
4. **Create or update the models file** at `front-client/src/app/features/<feature>/models/<feature>.models.ts`.

## Flish Media Types

All features work with files indexed by the backend. The base shape mirrors the API:

```typescript
export type MediaCategory = 'video' | 'audio' | 'photo';

export type MediaItem = {
  id: string;
  relativePath: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  mimeType: string;
  lastWriteUtc: string;
  indexedAtUtc: string;
};

export type PagedMediaResponse = {
  items: MediaItem[];
  page: number;
  pageSize: number;
  total: number;
};
```

## Template: Paginated Media Store

Standard store for listing, filtering, paginating, and selecting media items:

```typescript
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { <FeatureName>ApiService } from '../services/<feature-name>-api.service';
import { MediaItem } from '../models/<feature-name>.models';

type <FeatureName>State = {
  items: MediaItem[];
  selected: MediaItem | null;
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
    hasItems: computed(() => items().length > 0),
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

    select(item: MediaItem | null) {
      patchState(store, { selected: item });
    },

    setQuery(query: string) {
      patchState(store, { query, page: 1 });
    },

    setPage(page: number) {
      patchState(store, { page });
    },

    async deleteItem(id: string) {
      await firstValueFrom(api.delete(id));
      patchState(store, (s) => ({ items: s.items.filter((i) => i.id !== id) }));
    },
  })),
);
```

## Template: Playback Store (Video / Audio)

For features that need player state alongside the media list:

```typescript
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { <FeatureName>ApiService } from '../services/<feature-name>-api.service';
import { MediaItem } from '../models/<feature-name>.models';

type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'ended';

type <FeatureName>State = {
  items: MediaItem[];
  nowPlaying: MediaItem | null;
  playbackStatus: PlaybackStatus;
  page: number;
  pageSize: number;
  total: number;
  query: string;
  loading: boolean;
  error: string | null;
};

const initialState: <FeatureName>State = {
  items: [],
  nowPlaying: null,
  playbackStatus: 'idle',
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

  withComputed(({ items, total, pageSize, nowPlaying }) => ({
    count: computed(() => items().length),
    totalPages: computed(() => Math.max(1, Math.ceil(total() / pageSize()))),
    isPlaying: computed(() => nowPlaying() !== null),
    streamUrl: computed(() => {
      const item = nowPlaying();
      return item ? `/api/files/${item.id}/stream` : null;
    }),
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

    play(item: MediaItem) {
      patchState(store, { nowPlaying: item, playbackStatus: 'playing' });
    },

    pause() {
      patchState(store, { playbackStatus: 'paused' });
    },

    resume() {
      patchState(store, { playbackStatus: 'playing' });
    },

    stop() {
      patchState(store, { nowPlaying: null, playbackStatus: 'idle' });
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

## Rules

- **One store per feature** -- never a single global store
- **State root must be an object** -- never a bare array
- **Always** use `patchState()` for updates -- never mutate state directly
- **Always** create new references for arrays/objects -- never mutate in place
- **Always** model `loading` and `error` state explicitly
- **Always** include pagination state (`page`, `pageSize`, `total`) for list features
- **Use** `withComputed()` for derived values (`totalPages`, `streamUrl`, `isPlaying`)
- **Use** `rxMethod()` when services return Observables that need RxJS pipelines
- **Use** layered `withMethods()` calls when one method calls another
- **Protected state** is default -- only store methods modify state
