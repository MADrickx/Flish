import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { FilesStore } from './files.store';

describe('FilesStore', () => {
  let store: InstanceType<typeof FilesStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FilesStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(FilesStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should start with empty state', () => {
    expect(store.items()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.query()).toBe('');
    expect(store.category()).toBe('');
    expect(store.page()).toBe(1);
  });

  it('should load files and update state', async () => {
    const loadPromise = store.load();

    const req = httpMock.expectOne((r) => r.url === '/api/files');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('25');
    req.flush({
      items: [
        {
          id: '1',
          relativePath: 'docs/readme.txt',
          fileName: 'readme.txt',
          extension: 'txt',
          sizeBytes: 512,
          mimeType: 'text/plain',
          category: 'document',
          lastWriteUtc: '2026-01-01T00:00:00Z',
          indexedAtUtc: '2026-01-01T00:00:00Z',
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    });

    await loadPromise;

    expect(store.items().length).toBe(1);
    expect(store.total()).toBe(1);
    expect(store.loading()).toBe(false);
  });

  it('should send category filter when set', async () => {
    store.setCategory('video');
    const loadPromise = store.load();

    const req = httpMock.expectOne((r) => r.url === '/api/files' && r.params.get('category') === 'video');
    req.flush({ items: [], page: 1, pageSize: 25, total: 0 });

    await loadPromise;

    expect(store.category()).toBe('video');
    expect(store.page()).toBe(1);
  });

  it('should send query filter when set', async () => {
    store.setQuery('movies');
    const loadPromise = store.load();

    const req = httpMock.expectOne((r) => r.url === '/api/files' && r.params.get('query') === 'movies');
    req.flush({ items: [], page: 1, pageSize: 25, total: 0 });

    await loadPromise;

    expect(store.query()).toBe('movies');
  });

  it('should reset page when setting query or category', () => {
    store.setPage(3);
    expect(store.page()).toBe(3);

    store.setQuery('test');
    expect(store.page()).toBe(1);

    store.setPage(5);
    store.setCategory('audio');
    expect(store.page()).toBe(1);
  });

  it('should compute totalPages', async () => {
    const loadPromise = store.load();

    const req = httpMock.expectOne((r) => r.url === '/api/files');
    req.flush({ items: [], page: 1, pageSize: 25, total: 75 });

    await loadPromise;

    expect(store.totalPages()).toBe(3);
  });

  it('should remove item on deleteItem', async () => {
    const loadPromise = store.load();
    const req = httpMock.expectOne((r) => r.url === '/api/files');
    req.flush({
      items: [
        { id: 'a', relativePath: 'a.txt', fileName: 'a.txt', extension: 'txt', sizeBytes: 1, mimeType: 'text/plain', category: 'document', lastWriteUtc: '', indexedAtUtc: '' },
        { id: 'b', relativePath: 'b.txt', fileName: 'b.txt', extension: 'txt', sizeBytes: 1, mimeType: 'text/plain', category: 'document', lastWriteUtc: '', indexedAtUtc: '' },
      ],
      page: 1,
      pageSize: 25,
      total: 2,
    });
    await loadPromise;

    expect(store.items().length).toBe(2);

    const deletePromise = store.deleteItem('a');
    const deleteReq = httpMock.expectOne('/api/files/a');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null, { status: 204, statusText: 'No Content' });
    await deletePromise;

    expect(store.items().length).toBe(1);
    expect(store.items()[0].id).toBe('b');
  });
});
