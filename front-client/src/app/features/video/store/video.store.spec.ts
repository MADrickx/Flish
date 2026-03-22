import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { VideoStore } from './video.store';
import { MediaItem } from '../../../core/models/media.models';

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
    expect(store.groups()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.nowPlaying()).toBeNull();
    expect(store.playbackStatus()).toBe('idle');
  });

  it('should load grouped videos', async () => {
    const loadPromise = store.load();

    const req = httpMock.expectOne((r) => r.url === '/api/files/grouped' && r.params.get('category') === 'video');
    req.flush({
      items: [
        {
          baseName: 'test',
          relativeDirectory: 'movies',
          variants: [
            {
              id: '1',
              relativePath: 'movies/test.mp4',
              fileName: 'test.mp4',
              extension: 'mp4',
              sizeBytes: 1024,
              mimeType: 'video/mp4',
              category: 'video',
              shortCode: 'ABC123',
              lastWriteUtc: '2026-01-01T00:00:00Z',
              indexedAtUtc: '2026-01-01T00:00:00Z',
            },
          ],
        },
      ],
      page: 1,
      pageSize: 24,
      total: 1,
    });

    await loadPromise;

    expect(store.groups().length).toBe(1);
    expect(store.groups()[0].baseName).toBe('test');
    expect(store.groups()[0].variants.length).toBe(1);
    expect(store.loading()).toBe(false);
  });

  it('should compute streamUrl from shortCode when playing', () => {
    const item: MediaItem = {
      id: 'abc',
      relativePath: 'test.mp4',
      fileName: 'test.mp4',
      extension: 'mp4',
      sizeBytes: 100,
      mimeType: 'video/mp4',
      category: 'video',
      shortCode: 'XYZ789',
      lastWriteUtc: '',
      indexedAtUtc: '',
    };

    store.play(item);

    expect(store.streamUrl()).toBe('/p/XYZ789');
    expect(store.playbackStatus()).toBe('playing');
  });

  it('should clear playback on stop', () => {
    const item: MediaItem = {
      id: 'abc',
      relativePath: 'test.mp4',
      fileName: 'test.mp4',
      extension: 'mp4',
      sizeBytes: 100,
      mimeType: 'video/mp4',
      category: 'video',
      shortCode: 'XYZ789',
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
