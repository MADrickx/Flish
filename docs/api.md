# Flish API (v1)

Base path: `/api`

Authentication: HTTP Basic Auth.

## Auth

- `POST /api/auth/login`
  - Validates credentials from Authorization header
  - Response: `200 OK` `{ "username": "..." }`

- `POST /api/auth/change-password`
  - Body: `{ "currentPassword": "...", "newPassword": "..." }`
  - New password must be at least 8 characters
  - Rate-limited
  - Response: `200 OK` `{ "message": "Password changed." }`

## Files

- `GET /api/files?page=1&pageSize=50&query=&extension=&category=`
  - Paged list of indexed files
  - `category`: filter by `video`, `audio`, `photo`, `document`, `other`
  - `extension`: comma-separated list (e.g. `mp4,mkv,webm`)
  - Response: `{ items: FileItemDto[], page, pageSize, total }`

- `GET /api/files/{id}`
  - Single file metadata including `category` field

- `GET /api/files/{id}/download`
  - Streams file bytes (with `enableRangeProcessing`)
  - Sets `Content-Disposition` for download

- `GET /api/files/{id}/stream`
  - Optimized for media playback (video/audio)
  - Supports HTTP `Range` header for seeking
  - Returns `206 Partial Content` with `Content-Range` header
  - 64 KB chunked async streaming (handles 1 GB files on 10 Mbps)

- `POST /api/files/upload` (multipart/form-data)
  - Fields: `file` (required), `relativeDirectory` (optional)
  - Rate-limited

- `DELETE /api/files/{id}`
  - Deletes physical file and marks metadata as deleted
  - Rate-limited

## Indexing

- `GET /api/index/status`
  - Returns scanner status and last scan stats

- `POST /api/index/rebuild`
  - Triggers on-demand full scan
  - Rate-limited

## Health

- `GET /health/live`
- `GET /health/ready`

## Error Responses

All errors return structured JSON:

```json
{ "error": "description", "status": 400 }
```

- `400` for validation errors (path traversal, bad input)
- `401` for unauthorized requests
- `404` for missing resources
- `500` for unexpected server errors (message hidden in production)

## DTOs

### FileItemDto

```json
{
  "id": "guid",
  "relativePath": "movies/vacation.mp4",
  "fileName": "vacation.mp4",
  "extension": "mp4",
  "sizeBytes": 1073741824,
  "mimeType": "video/mp4",
  "category": "video",
  "lastWriteUtc": "2026-01-15T10:30:00Z",
  "indexedAtUtc": "2026-01-15T12:00:00Z"
}
```

### Supported Categories

| Category | Extensions |
|----------|-----------|
| video | mp4, mkv, webm, avi, mov, m4v, wmv |
| audio | mp3, flac, wav, ogg, aac, m4a, wma, opus |
| photo | jpg, jpeg, png, gif, webp, bmp, svg, tiff, ico |
| document | pdf, txt, json, xml, csv, md |
| other | everything else |
