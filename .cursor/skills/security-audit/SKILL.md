---
name: security-audit
description: Perform security audits on the Flish codebase. Use when the user asks to check for security issues, vulnerabilities, hardening, or when reviewing code before deployment.
---

# Security Audit (Flish)

Checklist for auditing Flish security across backend, frontend, and infrastructure.

## Path Traversal

- `FilePathResolver` must append `Path.DirectorySeparatorChar` to `_masterDirectory` before `StartsWith` checks
- All user-supplied paths must go through `FilePathResolver.ToAbsolutePath()` before filesystem access
- Filenames in rename/upload must be validated: no `/`, `\`, `..`
- `Path.GetFileName()` should be used on user-supplied filenames to strip directory components

## Authentication

- JWT Bearer tokens used for all authenticated requests
- Login endpoint (`/api/auth/login`) is anonymous, validates credentials, returns JWT token
- Tokens are signed with HMAC-SHA256 using a configurable secret key (min 64 chars)
- Token expiration configurable via `Jwt:ExpirationMinutes` (default 480 = 8 hours)
- JWT stored in `sessionStorage` (not raw passwords)
- Auth endpoints rate-limited: login (`"auth"` policy), change-password (`"writes"` policy)
- Password hashing uses PBKDF2-SHA256 with 120K iterations + random salt
- Verification uses `CryptographicOperations.FixedTimeEquals` (timing-safe)
- Login returns same error for "user not found" and "wrong password" (prevents enumeration)

## Secrets Management

- `appsettings.json` and `appsettings.Development.json` must use `CHANGE_ME` placeholders
- Real secrets go in environment variables or .NET User Secrets
- `.env` files must be in `.gitignore`
- `.env.example` must use placeholder values, never real passwords
- Docker Compose uses env vars for all secrets

## Rate Limiting

Three policies exist in `Program.cs`:
- `"writes"` (20/min) -- upload, delete, transcode, rename, rebuild, change-password
- `"auth"` (10/min) -- login
- `"public-stream"` (60/min) -- `/s/{code}` and `/p/{code}` short-link streaming

## Streaming / Range Requests

- `StreamHelper.StreamFileAsync` must validate Range header:
  - `TryParse` instead of `Parse` for start value
  - Handle suffix-byte ranges (`bytes=-500`)
  - Return `416 Range Not Satisfiable` for invalid ranges
  - Validate `start >= 0` and `start < fileLength`
- Use `FileShare.ReadWrite` to handle concurrent access during transcoding

## Frontend

- JWT token stored in `sessionStorage` (no raw passwords stored client-side)
- Bearer token interceptor attaches `Authorization: Bearer <token>` to all requests
- Error interceptor catches 401 and redirects to login + clears session
- No `innerHTML`, `bypassSecurityTrust`, or unsafe DOM manipulation
- All API calls use relative paths proxied through Angular dev server or nginx

## Upload / File Operations

- Extension validation applies when `AllowedExtensions` config is set
- `Path.GetFileName()` used on all user-supplied filenames to strip directory components
- `FileSignatureValidator` checks magic bytes against claimed extension (prevents spoofed-filename attacks)
- Supported signatures: MP4/MOV/M4V/M4A (ftyp), MKV/WebM (EBML), AVI/WAV/WebP (RIFF), MP3 (ID3/sync), FLAC, OGG/Opus, AAC, WMV/WMA (ASF), JPEG, PNG, GIF, BMP, TIFF, ICO, PDF
- Upload size limited by `Storage:MaxUploadBytes` and `FormOptions.MultipartBodyLengthLimit`

## FFmpeg / Transcoding

- `UseShellExecute = false` prevents shell injection
- Input path comes from DB (indexed by `FilePathResolver`), not directly from user input
- Output path is derived from input path with `.mp4` extension
- FFmpeg runs with `CreateNoWindow = true`

## Infrastructure

- HTTPS enforced via `UseHttpsRedirection()` (TLS terminates at nginx/reverse proxy)
- Health checks at `/health/live` and `/health/ready` (unauthenticated by design)
- PostgreSQL data persisted in Docker volume
- API container exposes only port 8080 internally
- nginx handles SSL termination and static file serving

## Pre-Deployment Checklist

- [ ] All `CHANGE_ME` values replaced in appsettings and .env
- [ ] HTTPS configured at reverse proxy level
- [ ] VPS firewall restricts ports (only 80/443 exposed)
- [ ] Docker images up to date
- [ ] Database backup cron configured
- [ ] Basic Auth password is strong (12+ chars, mixed case, numbers, symbols)
- [ ] `AllowedExtensions` set if upload should be restricted
- [ ] Rate limiting policies reviewed for production load
