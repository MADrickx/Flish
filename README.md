# Flish

Flish is a VPS-hosted file management system:

- ASP.NET Core backend indexes files from a configured master directory
- PostgreSQL stores file metadata and auth users
- Angular client manages files (list, upload, download, delete)
- Docker Compose runs API + DB + Web on the VPS

## Repository Structure

- `back-end/flish/flish/` - ASP.NET Core API
- `front-client/` - Angular 21 client
- `infra/` - Docker and deployment assets
- `docs/` - architecture, API, operations

## Local Development

### Backend

```bash
cd back-end/flish/flish
dotnet restore
dotnet run
```

### Frontend

```bash
cd front-client
npm install
npm start
```

## Configuration Overview

Backend configuration lives in `back-end/flish/flish/appsettings*.json`.

Important settings:

- `Storage:MasterDirectory` - root directory Flish can manage
- `Storage:MaxUploadBytes` - upload size limit
- `Indexing:ScanIntervalSeconds` - periodic scanner interval
- `BasicAuth:SeedUser` - first admin user for v1
- `ConnectionStrings:DefaultConnection` - PostgreSQL connection

## CI/CD

GitHub Actions workflows are in `.github/workflows/`:

- `ci.yml` - build + test checks
- `deploy.yml` - deploy to VPS over SSH and run Docker Compose

