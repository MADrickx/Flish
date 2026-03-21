import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PhotosStore } from './photos.store';
import { MediaItem } from '../../../core/models/media.models';

describe('PhotosStore', () => {
  let store: InstanceType<typeof PhotosStore>;

  const mockPhoto: MediaItem = {
    id: 'photo-1',
    relativePath: 'pics/sunset.jpg',
    fileName: 'sunset.jpg',
    extension: 'jpg',
    sizeBytes: 2048,
    mimeType: 'image/jpeg',
    category: 'photo',
    lastWriteUtc: '',
    indexedAtUtc: '',
  };

  const mockPhoto2: MediaItem = {
    ...mockPhoto,
    id: 'photo-2',
    fileName: 'beach.png',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PhotosStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(PhotosStore);
  });

  it('should start with no photo viewing', () => {
    expect(store.viewing()).toBeNull();
    expect(store.viewUrl()).toBeNull();
    expect(store.isViewing()).toBe(false);
  });

  it('should compute viewUrl when viewing a photo', () => {
    store.view(mockPhoto);
    expect(store.viewUrl()).toBe('/api/files/photo-1/download');
    expect(store.isViewing()).toBe(true);
  });

  it('should close viewer', () => {
    store.view(mockPhoto);
    store.closeViewer();
    expect(store.viewing()).toBeNull();
    expect(store.isViewing()).toBe(false);
  });

  it('should navigate to next and previous photos', async () => {
    const httpMock = TestBed.inject(
      (await import('@angular/common/http/testing')).HttpTestingController,
    );

    const loadPromise = store.load();
    const req = httpMock.expectOne((r) => r.url === '/api/files');
    req.flush({ items: [mockPhoto, mockPhoto2], page: 1, pageSize: 30, total: 2 });
    await loadPromise;

    store.view(mockPhoto);
    store.viewNext();
    expect(store.viewing()?.id).toBe('photo-2');

    store.viewPrev();
    expect(store.viewing()?.id).toBe('photo-1');

    httpMock.verify();
  });
});
