# Flish Operations Runbook

## Deploy

1. Update `.env` on VPS.
2. Run:
   - `docker compose pull`
   - `docker compose up -d --remove-orphans`
3. Verify:
   - `curl -f http://localhost:1604/health/ready` (or whatever `WEB_PORT` is in `infra/.env`)

## Logs

- API: `docker compose logs -f api`
- Web: `docker compose logs -f web`
- DB: `docker compose logs -f db`

## Backups

- PostgreSQL dump:
  - `sh infra/scripts/backup-db.sh`
- Keep daily backups and test restore monthly.

## Recovery

1. Restore DB from latest backup.
2. Ensure master directory mount is intact.
3. Trigger rebuild:
   - `POST /api/index/rebuild`

## Database Migrations

Migrations run automatically on startup (`MigrateAsync`).

To create a new migration after changing entities or `FlishDbContext.OnModelCreating`:

```bash
cd back-end/flish/flish
dotnet ef migrations add <MigrationName>
```

To apply manually (normally not needed since startup handles it):

```bash
dotnet ef database update
```

To revert the last migration:

```bash
dotnet ef migrations remove
```

## Security Checklist

- Enforce HTTPS at reverse proxy
- Rotate Basic Auth password regularly
- Restrict VPS firewall to required ports only
- Keep Docker images up to date

