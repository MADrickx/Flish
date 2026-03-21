import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SettingsStore } from './settings.store';

describe('SettingsStore', () => {
  let store: InstanceType<typeof SettingsStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SettingsStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(SettingsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.match(() => true);
  });

  it('should start with null index status', () => {
    expect(store.indexStatus()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.rebuilding()).toBe(false);
  });

  it('should load index status', async () => {
    const loadPromise = store.loadStatus();

    const req = httpMock.expectOne('/api/index/status');
    req.flush({
      isRunning: false,
      lastCompletedAtUtc: '2026-01-01T12:00:00Z',
      lastSeenFiles: 42,
      lastUpsertedFiles: 42,
      lastSoftDeletedFiles: 0,
      lastError: null,
    });

    await loadPromise;

    expect(store.indexStatus()!.lastSeenFiles).toBe(42);
    expect(store.loading()).toBe(false);
  });

  it('should handle successful password change', async () => {
    const changePromise = store.changePassword('old', 'newpassword');

    const req = httpMock.expectOne('/api/auth/change-password');
    expect(req.request.body).toEqual({ currentPassword: 'old', newPassword: 'newpassword' });
    req.flush({ message: 'Password changed.' });

    await changePromise;

    expect(store.passwordMessage()).toBe('Password changed.');
    expect(store.passwordError()).toBe('');
  });

  it('should handle failed password change', async () => {
    const changePromise = store.changePassword('wrong', 'newpassword');

    const req = httpMock.expectOne('/api/auth/change-password');
    req.flush(
      { error: 'Current password is incorrect.', status: 400 },
      { status: 400, statusText: 'Bad Request' },
    );

    await changePromise;

    expect(store.passwordError()).toBe('Current password is incorrect.');
    expect(store.passwordMessage()).toBe('');
  });
});
