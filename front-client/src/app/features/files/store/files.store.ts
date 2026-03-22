import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { FilesApiService } from '../services/files-api.service';
import { MediaItem, MediaCategory } from '../../../core/models/media.models';

type FilesState = {
  items: MediaItem[];
  page: number;
  pageSize: number;
  total: number;
  query: string;
  category: MediaCategory | '';
  loading: boolean;
  error: string | null;
};

const initialState: FilesState = {
  items: [],
  page: 1,
  pageSize: 25,
  total: 0,
  query: '',
  category: '',
  loading: false,
  error: null,
};

export const FilesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ items, total, pageSize }) => ({
    count: computed(() => items().length),
    totalPages: computed(() => Math.max(1, Math.ceil(total() / pageSize()))),
    hasItems: computed(() => items().length > 0),
  })),

  withMethods((store, api = inject(FilesApiService)) => ({
    async load() {
      patchState(store, { loading: true, error: null });
      try {
        const extra: Record<string, string> = {};
        const q = store.query();
        const cat = store.category();
        if (q) extra['query'] = q;
        if (cat) extra['category'] = cat;

        const res = await firstValueFrom(api.list(store.page(), store.pageSize(), extra));
        patchState(store, { items: res.items, total: res.total, loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load files' });
      }
    },

    setQuery(query: string) {
      patchState(store, { query, page: 1 });
    },

    setCategory(category: MediaCategory | '') {
      patchState(store, { category, page: 1 });
    },

    setPage(page: number) {
      patchState(store, { page });
    },

    async deleteItem(id: string) {
      await firstValueFrom(api.delete(id));
      patchState(store, (s) => ({ items: s.items.filter((i) => i.id !== id) }));
    },

    async renameItem(id: string, newFileName: string) {
      const updated = await firstValueFrom(api.rename(id, newFileName));
      patchState(store, (s) => ({
        items: s.items.map((i) => (i.id === id ? updated : i)),
      }));
    },
  })),
);
