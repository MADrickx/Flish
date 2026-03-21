# Flish Roadmap

Status of what's been built and what remains to deliver v1 of the multimedia VPS server.

## Done

### Backend (ASP.NET Core / .NET 10)

- [x] Minimal API with endpoint grouping in `Program.cs`
- [x] PostgreSQL via EF Core (`FlishDbContext`, `Npgsql`)
- [x] `FileIndexEntry` entity with metadata (path, name, extension, size, MIME, timestamps, soft delete)
- [x] `AppUser` entity with hashed passwords (PBKDF2)
- [x] File indexer: full scan at startup + periodic background scan (`IndexingBackgroundService`)
- [x] `FilePathResolver` with path traversal protection
- [x] HTTP Basic Auth handler + seed user on startup
- [x] File API: paginated list, get by id, download (range support), upload (multipart), delete
- [x] Index API: status, rebuild
- [x] Health checks: `/health/live`, `/health/ready`
- [x] Rate limiting on mutation endpoints
- [x] Strongly typed config via `IOptions<T>` (`StorageOptions`, `IndexingOptions`, `BasicAuthOptions`)
- [x] `IDbContextFactory` for singleton services (indexer)

### Frontend (Angular 21)

- [x] Standalone components, OnPush, signals
- [x] Auth: login page, `AuthStateService` (session storage), `basicAuthInterceptor`, `authGuard`
- [x] Files: paginated list page with search, upload, download, delete
- [x] Dark theme design system with CSS custom properties
- [x] Responsive layout: desktop table + mobile card view
- [x] Sticky table header, action buttons with icons, entrance animations
- [x] Lazy-loaded feature routes

### Infrastructure

- [x] Docker Compose: API + PostgreSQL + nginx (Angular static + reverse proxy)
- [x] `.env.example` for VPS configuration
- [x] `backup-db.sh` script
- [x] GitHub Actions CI (build + test backend/frontend)
- [x] GitHub Actions CD (SCP + docker compose deploy + health check)

### Docs & Skills

- [x] `README.md`, `docs/architecture.md`, `docs/api.md`, `docs/operations.md`
- [x] `.cursor/angular.mdc` rules (Angular 21 best practices)
- [x] 7 Flish-specific skills (feature, component, store, service, media endpoint, dotnet feature, generic repository)

---

## To Do

### Phase 1 -- Media Foundation (high priority)

- [ ] **Expand MIME types in FileIndexer**: add video (`mp4`, `mkv`, `webm`, `mov`, `avi`), audio (`mp3`, `flac`, `wav`, `ogg`, `aac`), image (`gif`, `webp`, `bmp`, `svg`) mappings
- [ ] **Add `/api/files/{id}/stream` endpoint**: dedicated streaming with proper `Range` header parsing, `206 Partial Content`, `Content-Range` responses for video/audio seeking
- [ ] **Add media category to `FileIndexEntry`**: computed or stored `category` field (`video` | `audio` | `photo` | `other`) based on extension
- [ ] **Install `@ngrx/signals`** in frontend and wire up SignalStore pattern

### Phase 2 -- Media Features (high priority)

- [ ] **App shell / navigation**: sidebar or top nav to switch between Video, Audio, Photos, Files, Settings
- [ ] **Video feature**: grid page with thumbnails, video player page with `<video>` element using stream URL, video store with playback state
- [ ] **Audio feature**: list page, audio player with `<audio>` element, playlist/queue support, audio store
- [ ] **Photos feature**: grid page with thumbnails, lightbox/fullscreen viewer, photos store
- [ ] **Upload with progress**: add `reportProgress: true` to upload service, show progress bar in UI

### Phase 3 -- Generic Patterns (medium priority)

- [ ] **Backend generic repository**: `IRepository<T>` + `Repository<T>` base classes with EF Core, extract from inline `Program.cs` lambdas
- [ ] **Frontend generic API service**: `BaseApiService<T>` abstract class with `list()`, `getById()`, `delete()`, `streamUrl()`, `downloadUrl()`
- [ ] **Refactor files feature** to extend the generic base on both sides
- [ ] **Extension filter in UI**: expose the backend `?extension=` filter as a dropdown/chip selector per media category

### Phase 4 -- Quality & Hardening (medium priority)

- [ ] **Backend test project**: add xUnit/NUnit project, test FilePathResolver, PasswordHasher, FileIndexer logic
- [ ] **Frontend tests**: add specs for auth guard, interceptor, files service, store
- [ ] **EF Core migrations**: switch from `EnsureCreated` to proper migration workflow
- [ ] **Error handling**: global error interceptor on frontend, structured error responses on backend
- [ ] **Settings feature**: UI page to view index status, trigger rebuild, change password

### Phase 5 -- Polish (lower priority)

- [ ] **Thumbnail generation**: backend generates image thumbnails for video/photo files on index
- [ ] **Search improvements**: full-text search on file names, filter by size range, date range
- [ ] **Keyboard shortcuts**: play/pause, next/previous in media player
- [ ] **PWA support**: service worker for offline-capable UI shell
- [ ] **Light theme toggle**: CSS custom property swap
