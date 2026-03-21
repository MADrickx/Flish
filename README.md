# Flish

Flish is a multimedia VPS server -- index, browse, stream, and manage your video, audio, and photo files from anywhere through a modern Angular client.

## Features

- **Video streaming** with seeking support (HTTP Range requests)
- **Audio playback** with queue and player bar
- **Photo gallery** with fullscreen lightbox viewer
- **File management**: upload, download, delete, search
- **Auto-indexing**: background scanner catalogs your master directory
- **Responsive UI**: sidebar on desktop, bottom nav on mobile

## Architecture

- **Backend**: ASP.NET Core (.NET 10), PostgreSQL, minimal APIs
- **Frontend**: Angular 21, NgRx SignalStore, signals-first
- **Infra**: Docker Compose (API + PostgreSQL + nginx)

## Repository Structure

- `back-end/flish/flish/` -- ASP.NET Core API
- `front-client/` -- Angular 21 client
- `infra/` -- Docker Compose and deployment
- `docs/` -- architecture, API reference, operations, roadmap

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

## VPS Deployment

```bash
cd infra
cp .env.example .env   # edit with your values
docker compose up -d
```

See [docs/operations.md](docs/operations.md) for the full deployment runbook.

## Configuration

Backend configuration lives in `back-end/flish/flish/appsettings*.json`:

- `Storage:MasterDirectory` -- root directory to index and serve
- `Storage:MaxUploadBytes` -- upload size limit (default 500 MB)
- `Indexing:ScanIntervalSeconds` -- periodic scan interval
- `BasicAuth:SeedUser` -- initial admin credentials
- `ConnectionStrings:DefaultConnection` -- PostgreSQL connection

## API

See [docs/api.md](docs/api.md) for the full endpoint reference, including the streaming endpoint with Range request support.
