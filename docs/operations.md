# Flish Operations Runbook

## Deploy

1. Update `.env` on VPS.
2. Run:
   - `docker compose pull`
   - `docker compose up -d --remove-orphans`
3. Verify:
   - `curl -f http://localhost:8080/health/ready`

## Logs

- API: `docker compose logs -f api`
- Web: `docker compose logs -f web`
- DB: `docker compose logs -f db`

## Backups

- PostgreSQL dump:
  - `docker exec flish-db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql`
- Keep daily backups and test restore monthly.

## Recovery

1. Restore DB from latest backup.
2. Ensure master directory mount is intact.
3. Trigger rebuild:
   - `POST /api/index/rebuild`

## Security Checklist

- Enforce HTTPS at reverse proxy
- Rotate Basic Auth password regularly
- Restrict VPS firewall to required ports only
- Keep Docker images up to date

