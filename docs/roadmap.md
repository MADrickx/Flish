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
- [x] File API: paginated list (with category, extension, size range, date range filters), get by id, download, upload, delete
- [x] **Stream endpoint** `/api/files/{id}/stream` with Range header support (206 Partial Content)
- [x] **Change password endpoint** `POST /api/auth/change-password`
- [x] Index API: status, rebuild
- [x] Health checks: `/health/live`, `/health/ready`
- [x] Rate limiting on mutation endpoints
- [x] Structured JSON error responses with `UseExceptionHandler`
- [x] Strongly typed config via `IOptions<T>`
- [x] `IDbContextFactory` for singleton services (indexer)
- [x] Generic repository: `IRepository<T>` + `Repository<T>` + `FileIndexRepository`
- [x] EF Core migrations (switched from `EnsureCreated` to `MigrateAsync`)
- [x] **xUnit test project** with tests for FilePathResolver, PasswordHasher, MimeTypeMap

### Frontend (Angular 21)

- [x] Standalone components, OnPush, signals
- [x] **NgRx SignalStore** for all features (files, video, audio, photos, settings)
- [x] **BaseApiService<T>** abstract generic service
- [x] **UploadService** with progress observable
- [x] Shared `MediaItem` / `PagedResponse<T>` / `formatBytes()` in core models
- [x] Auth: login page, `AuthStateService`, `basicAuthInterceptor`, `authGuard`
- [x] **Global error interceptor** (401 redirect to login)
- [x] **App shell with sidebar navigation** (Files, Video, Audio, Photos, Settings) + mobile bottom nav
- [x] **Files feature**: paginated table with search, category filter dropdown, upload, download, delete
- [x] **Video feature**: grid page, video player with keyboard shortcuts (space, arrows, F, Esc)
- [x] **Audio feature**: track list, audio player bar with seek/progress, queue/playlist
- [x] **Photos feature**: grid page, fullscreen lightbox viewer with keyboard navigation
- [x] **Settings feature**: index status, rebuild trigger, change password
- [x] **Light/dark theme toggle** with CSS custom properties + localStorage persistence
- [x] Shared loading spinner and empty state components
- [x] Dark theme design system with full CSS token coverage (no hardcoded colors)
- [x] Responsive layout throughout
- [x] Lazy-loaded feature routes behind auth guard
- [x] Dev proxy (`proxy.conf.json`) for local development
- [x] **26 frontend tests passing** across 6 test files
- [x] **20 backend unit tests** (FilePathResolver, PasswordHasher, MimeTypeMap, ShortCode)

### Infrastructure

- [x] Docker Compose: API + PostgreSQL + nginx
- [x] `.env.example` for VPS configuration
- [x] `backup-db.sh` script
- [x] GitHub Actions CI + CD

### Docs & Skills

- [x] `README.md`, `docs/architecture.md`, `docs/api.md`, `docs/operations.md`, `docs/roadmap.md`
- [x] `.cursor/angular.mdc` rules (Angular 21 best practices)
- [x] 7 Flish-specific skills + general development skills

---

- [x] **VLC stream URLs**: short codes (`/s/{code}` authenticated + `/p/{code}` public), `StreamHelper` refactor, `stream-link` component in all media views
- [x] **ArtPlayer**: replaced native `<video>` with ArtPlayer.js (fullscreen, PiP, playback rate, hotkeys, settings)
- [x] **FFmpeg transcoding**: convert MKV/AVI/MOV to MP4 from the UI, progress tracking, auto re-index on completion

## Future Ideas

- Thumbnail generation for video/photo files
- PWA support (service worker)
- Playlist management (save/load playlists)
- Multi-user support with roles
- File tagging and favorites
- Batch upload with drag-and-drop
