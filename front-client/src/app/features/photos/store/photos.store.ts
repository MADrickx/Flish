import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { PhotosApiService } from '../services/photos-api.service';
import { MediaItem } from '../../../core/models/media.models';

type PhotosState = {
  items: MediaItem[];
  viewing: MediaItem | null;
  page: number;
  pageSize: number;
  total: number;
  query: string;
  loading: boolean;
  error: string | null;
};

const initialState: PhotosState = {
  items: [],
  viewing: null,
  page: 1,
  pageSize: 30,
  total: 0,
  query: '',
  loading: false,
  error: null,
};

export const PhotosStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ items, total, pageSize, viewing }) => ({
    count: computed(() => items().length),
    totalPages: computed(() => Math.max(1, Math.ceil(total() / pageSize()))),
    viewUrl: computed(() => {
      const item = viewing();
      return item ? `/api/files/${item.id}/download` : null;
    }),
    isViewing: computed(() => viewing() !== null),
  })),

  withMethods((store, api = inject(PhotosApiService)) => ({
    async load() {
      patchState(store, { loading: true, error: null });
      try {
        const res = await firstValueFrom(api.listPhotos(store.page(), store.pageSize(), store.query()));
        patchState(store, { items: res.items, total: res.total, loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load photos' });
      }
    },

    view(item: MediaItem) {
      patchState(store, { viewing: item });
    },

    closeViewer() {
      patchState(store, { viewing: null });
    },

    viewNext() {
      const items = store.items();
      const current = store.viewing();
      if (!current) return;
      const idx = items.findIndex((i) => i.id === current.id);
      if (idx < items.length - 1) {
        patchState(store, { viewing: items[idx + 1] });
      }
    },

    viewPrev() {
      const items = store.items();
      const current = store.viewing();
      if (!current) return;
      const idx = items.findIndex((i) => i.id === current.id);
      if (idx > 0) {
        patchState(store, { viewing: items[idx - 1] });
      }
    },

    setQuery(query: string) {
      patchState(store, { query, page: 1 });
    },

    setPage(page: number) {
      patchState(store, { page });
    },
  })),
);
