# Flish Architecture

## High-Level

```
Angular Client (sidebar nav) <--HTTPS/BasicAuth--> ASP.NET Core API <--> PostgreSQL
                                                        |
                                                   Master Directory (VPS filesystem)
                                                        |
                                                   BackgroundIndexer (periodic scan)
```

## Backend Layout

- `Features/Auth/` -- Basic Auth handler, password hashing, user seeding
- `Features/Indexing/` -- File scanner, background service, indexer status
- `Infrastructure/Persistence/` -- EF Core DbContext, entities (`FileIndexEntry`, `AppUser`)
- `Infrastructure/Storage/` -- `FilePathResolver` (path safety), `MimeTypeMap` (~25 types with category inference)
- `Contracts/` -- API request/response DTOs
- `Configuration/` -- Strongly typed `IOptions<T>` classes

## Frontend Layout

```
front-client/src/app/
├── core/
│   ├── auth/           -- AuthStateService, guard, interceptor
│   ├── layout/         -- ShellComponent (sidebar nav + router outlet)
│   ├── models/         -- MediaItem, PagedResponse, formatBytes
│   └── services/       -- BaseApiService<T>, UploadService
└── features/
    ├── auth/           -- Login page
    ├── files/          -- All-files table with search/upload/delete
    ├── video/          -- Video grid, video player, VideoStore
    ├── audio/          -- Audio list, audio player bar with queue, AudioStore
    └── photos/         -- Photo grid, lightbox viewer with nav, PhotosStore
```

## Key Patterns

- **Feature-based architecture**: each feature is a vertical slice (models, service, store, components, pages, routes)
- **NgRx SignalStore**: one store per feature (files, video, audio, photos) with pagination, loading/error state, and playback state where applicable
- **BaseApiService<T>**: abstract generic HTTP service; concrete services extend for category-specific queries
- **Generic repository (backend)**: `IRepository<T>` interface + `Repository<T>` EF Core base + `FileIndexRepository` with filtered paged queries; endpoints use repository instead of raw DbContext
- **Lazy-loaded routes**: each feature loads independently behind `authGuard`
- **Stream endpoint**: `/api/files/{id}/stream` with HTTP Range support for seeking large media files

## Security Boundaries

- Only paths under configured `Storage:MasterDirectory` are allowed
- Relative paths are normalized and validated to block traversal
- All API endpoints require authentication
- Passwords are stored hashed (PBKDF2)
- Mutation endpoints are rate-limited

## Indexing Strategy

- Initial full scan at startup (configurable)
- Periodic incremental scan in a background service
- Upsert metadata by `relative_path`
- Mark missing files as `is_deleted = true`
- `MimeTypeMap` resolves MIME type and category from file extension
