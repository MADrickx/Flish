# Next Feature: VLC / External Player Stream URLs

## Goal

Allow streaming Flish media on VLC, Apple TV, or any external player by typing a short URL like `http://your-vps:8080/s/X7K9AB` instead of a full GUID-based stream URL.

## Why

- Current stream URLs contain full GUIDs: `/api/files/a1b2c3d4-e5f6-7890-abcd-1234567890ab/stream`
- Impossible to type on an Apple TV remote or similar device
- VLC supports "Open Network Stream" which just needs a URL

## Design

### Short Code System

- Each indexed file gets a **6-character short code** generated during indexing
- Alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 chars, no O/0/I/1/L to avoid confusion on TV screens)
- 32^6 = ~1 billion combinations -- practically unguessable on a private VPS
- Codes are stored in `FileIndexEntry.ShortCode` with a unique DB index
- Codes are stable (once generated, they don't change unless the file is re-indexed as new)

### Two Streaming Modes

Both endpoints exist simultaneously. The user can choose which to use.

#### Mode 1: Authenticated (`/s/{code}`)

- Endpoint requires Basic Auth (same as all `/api` endpoints)
- VLC natively supports Basic Auth: it prompts for username/password on first use and caches them for the session
- More secure: short code + credentials
- URL to type: `http://your-vps:8080/s/X7K9AB` (VLC asks for login once)
- Or embed credentials: `http://admin:password@your-vps:8080/s/X7K9AB`

#### Mode 2: Public (`/p/{code}`)

- Endpoint requires NO auth
- Short code is the only protection (~1B combinations)
- Simplest UX: just type the URL and it plays
- URL to type: `http://your-vps:8080/p/X7K9AB`

### Architecture

```
Mode 1 (authenticated):
  User types http://vps:8080/s/X7K9AB
    --> GET /s/{code} (requires Basic Auth -- VLC prompts once)
    --> Lookup FileIndexEntry by ShortCode
    --> Stream with Range support
    --> VLC plays with full seek

Mode 2 (public):
  User types http://vps:8080/p/X7K9AB
    --> GET /p/{code} (no auth)
    --> Lookup FileIndexEntry by ShortCode
    --> Stream with Range support
    --> VLC plays with full seek
```

### Frontend Display

The `stream-link` component shows BOTH URLs so the user can pick:
- Authenticated: `http://host/s/X7K9AB` (labeled "Secure - VLC will ask for login")
- Public: `http://host/p/X7K9AB` (labeled "Quick - no login needed")
- Copy button for each

## Implementation Steps

### Backend (7 changes)

#### 1. Add `ShortCode` to `FileIndexEntry`

File: `back-end/flish/flish/Infrastructure/Persistence/Entities/FileIndexEntry.cs`

Add:
```csharp
public string ShortCode { get; set; } = string.Empty;
```

#### 2. Update `FlishDbContext` model config

File: `back-end/flish/flish/Infrastructure/Persistence/FlishDbContext.cs`

Add to `FileIndexEntry` config:
```csharp
entity.Property(x => x.ShortCode).HasMaxLength(8).IsRequired();
entity.HasIndex(x => x.ShortCode).IsUnique();
```

#### 3. Generate codes in `FileIndexer`

File: `back-end/flish/flish/Features/Indexing/FileIndexer.cs`

When creating a new `FileIndexEntry`, generate a short code:
```csharp
private static readonly char[] Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();

private static string GenerateShortCode()
{
    var bytes = RandomNumberGenerator.GetBytes(6);
    return new string(bytes.Select(b => Alphabet[b % Alphabet.Length]).ToArray());
}
```

Set `ShortCode = GenerateShortCode()` only when creating NEW entries (not on upsert of existing ones, to keep codes stable).

#### 4. Add lookup method to `FileIndexRepository`

File: `back-end/flish/flish/Infrastructure/Persistence/FileIndexRepository.cs`

Add:
```csharp
public async Task<FileIndexEntry?> GetByShortCodeAsync(string code, CancellationToken ct)
{
    return await DbSet.FirstOrDefaultAsync(x => x.ShortCode == code && !x.IsDeleted, ct);
}
```

#### 5. Add `ShortCode` to `FileItemDto`

File: `back-end/flish/flish/Contracts/Files/GetFilesResponse.cs`

Add `string ShortCode` to the record. Update ALL projections in `FileIndexRepository` and `Program.cs` that create `FileItemDto` to include `ShortCode`.

#### 6. Add `GET /s/{code}` authenticated streaming endpoint

File: `back-end/flish/flish/Program.cs`

Add INSIDE the authenticated section (after the `api` group, or as a separate authenticated endpoint):
```csharp
app.MapGet("/s/{code}", async (
    string code,
    FileIndexRepository repo,
    FilePathResolver pathResolver,
    HttpContext httpContext,
    CancellationToken ct) =>
{
    var entry = await repo.GetByShortCodeAsync(code, ct);
    if (entry is null) return Results.NotFound();

    var absolutePath = pathResolver.ToAbsolutePath(entry.RelativePath);
    if (!File.Exists(absolutePath)) return Results.NotFound();

    // Same Range-request streaming logic as /api/files/{id}/stream
    // (extract into a shared helper method to avoid duplication)
}).RequireAuthorization();
```

#### 7. Add `GET /p/{code}` public streaming endpoint

File: `back-end/flish/flish/Program.cs`

Add OUTSIDE authenticated sections (no `.RequireAuthorization()`):
```csharp
app.MapGet("/p/{code}", async (
    string code,
    FileIndexRepository repo,
    FilePathResolver pathResolver,
    HttpContext httpContext,
    CancellationToken ct) =>
{
    // Same logic as /s/{code} but no auth
}).AllowAnonymous();
```

**Important refactor**: Extract the Range-request streaming logic from the current `/api/files/{id}/stream` endpoint into a shared static helper method (e.g. `StreamHelper.StreamFileAsync(absolutePath, mimeType, httpContext, ct)`) so that `/api/files/{id}/stream`, `/s/{code}`, and `/p/{code}` all use the same code. No duplication.

### Frontend (3 changes)

#### 8. Add `shortCode` to `MediaItem` type

File: `front-client/src/app/core/models/media.models.ts`

Add `shortCode: string` to the `MediaItem` type.

#### 9. Create `stream-link` component

New folder: `front-client/src/app/core/components/stream-link/`

Files:
- `stream-link.component.ts`
- `stream-link.component.html`
- `stream-link.component.css`

Inputs:
- `shortCode: string` (required)

Behavior:
- Computes full URLs from `window.location.origin`:
  - Authenticated: `{origin}/s/{shortCode}`
  - Public: `{origin}/p/{shortCode}`
- Shows the short code in large monospace font (easy to read on TV)
- Shows both URLs with labels
- Copy-to-clipboard button for each URL
- Compact mode (for cards/rows) vs expanded mode (for player view)

#### 10. Wire `stream-link` into media views

- **Video card** (`front-client/src/app/features/video/components/video-card/`): show short code below filename
- **Video player** (`front-client/src/app/features/video/components/video-player/`): show both stream URLs in a panel below the video
- **Audio track row** (`front-client/src/app/features/audio/pages/audio-page/`): show code in track row, expandable on click
- **Files table** (`front-client/src/app/features/files/pages/files-page/`): add "Code" column for all files

### Tests

#### Backend
- Test `GenerateShortCode()`: correct length (6), uses only valid alphabet chars, no O/0/I/1/L
- Test uniqueness: generate 1000 codes, all distinct
- Test `/s/{code}`: returns 401 without auth, streams with auth, 404 for unknown code
- Test `/p/{code}`: streams without auth, 404 for unknown code

#### Frontend
- Update ALL store spec mock data to include `shortCode: 'ABC123'` field
- Add stream-link component test (renders both URLs, copy works)

## Shared Streaming Helper (important refactor)

To avoid duplicating the Range-request streaming logic across 3 endpoints (`/api/files/{id}/stream`, `/s/{code}`, `/p/{code}`), extract it into a static helper:

File: `back-end/flish/flish/Infrastructure/Storage/StreamHelper.cs`

```csharp
public static class StreamHelper
{
    public static async Task<IResult> StreamFileAsync(
        string absolutePath, string mimeType, HttpContext httpContext, CancellationToken ct)
    {
        var fileLength = new FileInfo(absolutePath).Length;
        var rangeHeader = httpContext.Request.Headers.Range.ToString();

        if (!string.IsNullOrWhiteSpace(rangeHeader) && rangeHeader.StartsWith("bytes="))
        {
            // Parse range, write 206 response with chunked streaming
            // (move existing logic from Program.cs here)
        }

        httpContext.Response.Headers.AcceptRanges = "bytes";
        var fullStream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, true);
        return Results.File(fullStream, mimeType, enableRangeProcessing: true);
    }
}
```

Then all 3 endpoints just call:
```csharp
return await StreamHelper.StreamFileAsync(absolutePath, entry.MimeType, httpContext, ct);
```

## Files That Need Changes

### Backend (modify)
- `back-end/flish/flish/Infrastructure/Persistence/Entities/FileIndexEntry.cs` -- add ShortCode
- `back-end/flish/flish/Infrastructure/Persistence/FlishDbContext.cs` -- add ShortCode config + index
- `back-end/flish/flish/Features/Indexing/FileIndexer.cs` -- generate codes for new files
- `back-end/flish/flish/Contracts/Files/GetFilesResponse.cs` -- add ShortCode to DTO
- `back-end/flish/flish/Infrastructure/Persistence/FileIndexRepository.cs` -- add GetByShortCodeAsync + update DTO projections
- `back-end/flish/flish/Program.cs` -- add /s/{code} and /p/{code} endpoints, refactor /api/files/{id}/stream to use StreamHelper

### Backend (create)
- `back-end/flish/flish/Infrastructure/Storage/StreamHelper.cs` -- shared Range-request streaming logic

### Frontend (modify)
- `front-client/src/app/core/models/media.models.ts` -- add shortCode to MediaItem
- `front-client/src/app/features/video/components/video-card/video-card.component.*` -- show short code
- `front-client/src/app/features/video/components/video-player/video-player.component.*` -- show stream URLs
- `front-client/src/app/features/audio/pages/audio-page/audio-page.component.*` -- show code in track rows
- `front-client/src/app/features/files/pages/files-page/files-page.component.*` -- add Code column
- All store spec files (add `shortCode` to mock data)

### Frontend (create)
- `front-client/src/app/core/components/stream-link/stream-link.component.ts`
- `front-client/src/app/core/components/stream-link/stream-link.component.html`
- `front-client/src/app/core/components/stream-link/stream-link.component.css`

### Docs (update after implementation)
- `docs/api.md` -- add `/s/{code}` and `/p/{code}` endpoints
- `docs/roadmap.md` -- add to completed features
- `docs/architecture.md` -- mention short code system
