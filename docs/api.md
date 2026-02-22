# Flish API (v1)

Base path: `/api`

Authentication: HTTP Basic Auth.

## Auth

- `POST /api/auth/login`
  - Validates credentials from Authorization header
  - Response:
    - `200 OK` `{ "username": "..." }`

## Files

- `GET /api/files?page=1&pageSize=50&query=&extension=`
  - Paged list of indexed files
- `GET /api/files/{id}`
  - Metadata by id
- `GET /api/files/{id}/download`
  - Streams file bytes
- `POST /api/files/upload` (multipart/form-data)
  - Fields:
    - `file` (required)
    - `relativeDirectory` (optional)
- `DELETE /api/files/{id}`
  - Deletes physical file and marks metadata as deleted

## Indexing

- `GET /api/index/status`
  - Returns scanner status and last scan stats
- `POST /api/index/rebuild`
  - Triggers on-demand full scan

## Health

- `GET /health/live`
- `GET /health/ready`

