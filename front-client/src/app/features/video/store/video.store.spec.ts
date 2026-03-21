import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { VideoStore } from './video.store';

describe('VideoStore', () => {
  let store: InstanceType<typeof VideoStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VideoStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(VideoStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should start with empty state', () => {
    expect(store.items()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.nowPlaying()).toBeNull();
    expect(store.playbackStatus()).toBe('idle');
  });

  it('should load videos and update state', async () => {
    const loadPromise = store.load();

    const req = httpMock.expectOne((r) => r.url === '/api/files' && r.params.get('category') === 'video');
    req.flush({
      items: [
        {
          id: '1',
          relativePath: 'movies/test.mp4',
          fileName: 'test.mp4',
          extension: 'mp4',
          sizeBytes: 1024,
          mimeType: 'video/mp4',
          category: 'video',
          lastWriteUtc: '2026-01-01T00:00:00Z',
          indexedAtUtc: '2026-01-01T00:00:00Z',
        },
      ],
      page: 1,
      pageSize: 24,
      total: 1,
    });

    await loadPromise;

    expect(store.items().length).toBe(1);
    expect(store.items()[0].fileName).toBe('test.mp4');
    expect(store.total()).toBe(1);
    expect(store.loading()).toBe(false);
  });

  it('should compute streamUrl when playing', () => {
    const item = {
      id: 'abc',
      relativePath: 'test.mp4',
      fileName: 'test.mp4',
      extension: 'mp4',
      sizeBytes: 100,
      mimeType: 'video/mp4',
      category: 'video' as const,
      lastWriteUtc: '',
      indexedAtUtc: '',
    };

    store.play(item);

    expect(store.streamUrl()).toBe('/api/files/abc/stream');
    expect(store.playbackStatus()).toBe('playing');
  });

  it('should clear playback on stop', () => {
    const item = {
      id: 'abc',
      relativePath: 'test.mp4',
      fileName: 'test.mp4',
      extension: 'mp4',
      sizeBytes: 100,
      mimeType: 'video/mp4',
      category: 'video' as const,
      lastWriteUtc: '',
      indexedAtUtc: '',
    };

    store.play(item);
    store.stop();

    expect(store.nowPlaying()).toBeNull();
    expect(store.streamUrl()).toBeNull();
    expect(store.playbackStatus()).toBe('idle');
  });
});
