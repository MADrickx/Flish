import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { VideoApiService } from '../services/video-api.service';
import { GroupedMediaItem, MediaItem } from '../../../core/models/media.models';

type PlaybackStatus = 'idle' | 'playing' | 'paused';

type VideoState = {
  groups: GroupedMediaItem[];
  nowPlaying: MediaItem | null;
  playbackStatus: PlaybackStatus;
  page: number;
  pageSize: number;
  total: number;
  query: string;
  loading: boolean;
  error: string | null;
};

const initialState: VideoState = {
  groups: [],
  nowPlaying: null,
  playbackStatus: 'idle',
  page: 1,
  pageSize: 24,
  total: 0,
  query: '',
  loading: false,
  error: null,
};

export const VideoStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ groups, total, pageSize, nowPlaying }) => ({
    count: computed(() => groups().length),
    totalPages: computed(() => Math.max(1, Math.ceil(total() / pageSize()))),
    hasItems: computed(() => groups().length > 0),
    streamUrl: computed(() => {
      const item = nowPlaying();
      return item ? `/p/${item.shortCode}` : null;
    }),
  })),

  withMethods((store, api = inject(VideoApiService)) => ({
    async load() {
      patchState(store, { loading: true, error: null });
      try {
        const res = await firstValueFrom(api.listGrouped(store.page(), store.pageSize(), store.query()));
        patchState(store, { groups: res.items, total: res.total, loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load videos' });
      }
    },

    play(item: MediaItem) {
      patchState(store, { nowPlaying: item, playbackStatus: 'playing' });
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
