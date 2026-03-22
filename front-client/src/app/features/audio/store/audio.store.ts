import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { AudioApiService } from '../services/audio-api.service';
import { MediaItem } from '../../../core/models/media.models';
import { AuthStateService } from '../../../core/auth/auth-state.service';

type PlaybackStatus = 'idle' | 'playing' | 'paused';

type AudioState = {
  items: MediaItem[];
  nowPlaying: MediaItem | null;
  playbackStatus: PlaybackStatus;
  queue: MediaItem[];
  page: number;
  pageSize: number;
  total: number;
  query: string;
  loading: boolean;
  error: string | null;
};

const initialState: AudioState = {
  items: [],
  nowPlaying: null,
  playbackStatus: 'idle',
  queue: [],
  page: 1,
  pageSize: 50,
  total: 0,
  query: '',
  loading: false,
  error: null,
};

export const AudioStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ items, total, pageSize, nowPlaying, queue }) => {
    const authState = inject(AuthStateService);

    return {
      count: computed(() => items().length),
      totalPages: computed(() => Math.max(1, Math.ceil(total() / pageSize()))),
      streamUrl: computed(() => {
        const item = nowPlaying();
        if (!item) return null;
        const token = authState.accessToken();
        return `/api/files/${item.id}/stream?access_token=${encodeURIComponent(token)}`;
      }),
      queueLength: computed(() => queue().length),
    };
  }),

  withMethods((store, api = inject(AudioApiService)) => ({
    async load() {
      patchState(store, { loading: true, error: null });
      try {
        const res = await firstValueFrom(api.listAudio(store.page(), store.pageSize(), store.query()));
        patchState(store, { items: res.items, total: res.total, loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load audio' });
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

    playNext() {
      const q = store.queue();
      if (q.length === 0) {
        patchState(store, { nowPlaying: null, playbackStatus: 'idle' });
        return;
      }
      const [next, ...rest] = q;
      patchState(store, { nowPlaying: next, playbackStatus: 'playing', queue: rest });
    },

    addToQueue(item: MediaItem) {
      patchState(store, (s) => ({ queue: [...s.queue, item] }));
    },

    clearQueue() {
      patchState(store, { queue: [] });
    },

    setQuery(query: string) {
      patchState(store, { query, page: 1 });
    },

    setPage(page: number) {
      patchState(store, { page });
    },
  })),
);
