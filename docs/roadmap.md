# Flish Roadmap

Status of what's been built and what remains to deliver v1 of the multimedia VPS server.

## Done

### Backend (ASP.NET Core / .NET 10)

- [x] Minimal API with endpoint grouping in `Program.cs`
- [x] PostgreSQL via EF Core (`FlishDbContext`, `Npgsql`)
- [x] `FileIndexEntry` entity with metadata (path, name, extension, size, MIME, category, timestamps, soft delete)
- [x] `AppUser` entity with hashed passwords (PBKDF2)
- [x] File indexer: full scan at startup + periodic background scan (`IndexingBackgroundService`)
- [x] `MimeTypeMap` with ~25 media types (video, audio, photo, document) + category inference
- [x] `FilePathResolver` with path traversal protection
- [x] HTTP Basic Auth handler + seed user on startup
- [x] File API: paginated list (with category + extension filters), get by id, download, upload, delete
- [x] **Stream endpoint** `/api/files/{id}/stream` with Range header support (206 Partial Content) for video/audio seeking
- [x] Index API: status, rebuild
- [x] Health checks: `/health/live`, `/health/ready`
- [x] Rate limiting on mutation endpoints
- [x] Strongly typed config via `IOptions<T>` (`StorageOptions`, `IndexingOptions`, `BasicAuthOptions`)
- [x] `IDbContextFactory` for singleton services (indexer)

### Frontend (Angular 21)

- [x] Standalone components, OnPush, signals
- [x] **NgRx SignalStore** for feature-level state management (video, audio, photos)
- [x] **BaseApiService<T>** abstract generic service with list, getById, delete, streamUrl, downloadUrl
- [x] **UploadService** with `reportProgress` and progress observable
- [x] Shared `MediaItem` / `PagedResponse<T>` / `formatBytes()` in core models
- [x] Auth: login page, `AuthStateService`, `basicAuthInterceptor`, `authGuard`
- [x] **App shell with sidebar navigation** (Files, Video, Audio, Photos) + mobile bottom nav
- [x] **Files feature**: paginated table with search, upload, download, delete, category column
- [x] **Video feature**: grid page with video cards, video player with `<video>` + stream URL, SignalStore with playback state
- [x] **Audio feature**: track list, audio player bar with seek/progress, queue/playlist, SignalStore with playback + queue state
- [x] **Photos feature**: grid page with photo cards, fullscreen lightbox viewer with prev/next navigation, SignalStore
- [x] Dark theme design system with CSS custom properties
- [x] Responsive layout throughout (sidebar -> bottom nav, grid -> list)
- [x] Lazy-loaded feature routes behind auth guard
- [x] **15 tests passing** (video store, audio store, photos store, app)

### Infrastructure

- [x] Docker Compose: API + PostgreSQL + nginx (Angular static + reverse proxy)
- [x] `.env.example` for VPS configuration
- [x] `backup-db.sh` script
- [x] GitHub Actions CI (build + test backend/frontend)
- [x] GitHub Actions CD (SCP + docker compose deploy + health check)

### Docs & Skills

- [x] `README.md`, `docs/architecture.md`, `docs/api.md`, `docs/operations.md`, `docs/roadmap.md`
- [x] `.cursor/angular.mdc` rules (Angular 21 best practices)
- [x] 7 Flish-specific skills + 9 general development skills

---

## To Do

### Phase 3 -- Generic Patterns (done)

- [x] **Backend generic repository**: `IRepository<T>` + `Repository<T>` + `FileIndexRepository` with EF Core
- [x] **Refactored files feature**: FilesStore (SignalStore), all endpoints use repository instead of raw DbContext
- [x] **Category filter in UI**: dropdown in files page toolbar filters by video/audio/photo/document/other
- [x] **22 tests passing** across 5 test files (files, video, audio, photos stores + app)

### Phase 4 -- Quality & Hardening (done)

- [x] **Backend test project**: xUnit project with tests for FilePathResolver, PasswordHasher, MimeTypeMap
- [x] **EF Core migrations**: switched from `EnsureCreated` to `MigrateAsync`, documented commands
- [x] **Error handling**: structured JSON error responses on backend + global error interceptor on frontend (401 redirect)
- [x] **Settings feature**: index status page, rebuild trigger, change password (frontend + backend endpoint)
- [x] **Dev proxy**: `proxy.conf.json` for `ng serve` API forwarding
- [x] **26 frontend tests passing** across 6 test files

### Phase 5 -- Polish (lower priority)

- [ ] **Thumbnail generation**: backend generates thumbnails for video/photo files on index
- [ ] **Search improvements**: full-text search on file names, filter by size range, date range
- [ ] **Keyboard shortcuts**: play/pause, next/previous in media player
- [ ] **PWA support**: service worker for offline-capable UI shell
- [ ] **Light theme toggle**: CSS custom property swap
