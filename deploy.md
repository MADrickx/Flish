# Deploy Flish to a Debian VPS (HTTP, public IP, Webmin/Virtualmin)

This document describes how to run **Postgres**, the **.NET API**, and the **Angular front** (via Nginx) using the existing `infra/docker-compose.yml`, with **GitHub Actions** deploying from the **`deploy`** branch in one push.

---

## How this fits together (plain language)

1. **Public IP** — The address of your VPS on the Internet. Browsers use it to reach your server.
2. **Port** — A “door number” on that IP. This project serves the web UI on host port **1604** by default (`WEB_PORT` in `infra/.env`), so users open **`http://YOUR_IP:1604`**. That avoids fighting Virtualmin/Apache for port **80**.
3. **Firewall** — On the VPS, only ports you **open** accept traffic from outside. You must allow **1604/tcp** (and **22** for SSH).
4. **Webmin / Virtualmin** — Webmin often uses **10000** (HTTPS). **Virtualmin** often runs **Apache** on **80** and **443**. Flish on **1604** leaves those free.

**Traffic in this repo**

- Browser → `http://YOUR_IP:WEB_PORT` → **Nginx** container (`flish-web`) → static Angular.
- Paths under **`/api/`** are proxied by Nginx to the **API** container (`flish-api` on port 8080 inside the network).
- **Postgres** is only used by the API over the Docker network (`Host=db` in the connection string).

Production Angular uses `apiBaseUrl: ''` in `environment.prod.ts`, so API calls go to the same origin; Nginx forwards `/api/` — no extra CORS setup for IP-only HTTP.

### Production URL and ports (how the front talks to the back)

| Layer | Port / address | Notes |
|--------|----------------|--------|
| **Browser** | `http://77.37.87.231:1604` | One public URL: static UI + all `/api/` calls (example IP; use your VPS IP the same way). |
| **Host (VPS)** | **1604** → `web` container | `WEB_PORT` in `infra/.env`; maps to Nginx **80** inside the container. |
| **Nginx (`web`)** | listens on **80** (internal) | Serves Angular; `location /api/` → reverse proxy to the API. |
| **API (`api`)** | **8080** (internal only) | Kestrel: `ASPNETCORE_URLS=http://+:8080` in `back-end/flish/flish/Dockerfile`. Not exposed on the host; only `expose: "8080"` in `infra/docker-compose.yml` for the Docker network. |
| **Postgres (`db`)** | **5432** on `db` hostname | API connects with `Host=db`; host bind is **127.0.0.1:5432** only. |

**End-to-end:** the SPA loads from `http://77.37.87.231:1604`. HTTP calls like `/api/...` go to **the same host and port** (`:1604`). Nginx forwards them to `http://api:8080/api/...` inside Compose. You do **not** configure a second public port for the API.

**What launches the .NET web service?** **Docker Compose** starts the **`api`** service (container name `flish-api`). The image is built from `back-end/flish/flish/Dockerfile`; the container **ENTRYPOINT** is `dotnet flish.dll`, which runs **Kestrel** on port **8080** inside the container (`ASPNETCORE_URLS=http://+:8080`). You do **not** install .NET on the host or run a separate systemd unit for the API in this setup—`docker compose up -d` (from CI or by hand) is what starts and restarts it (`restart: unless-stopped` in `infra/docker-compose.yml`).

---

## What you need before starting

- A **Debian** VPS with SSH access.
- **Docker Engine** and the **Docker Compose plugin** on the VPS.
- A **GitHub** repo with Actions enabled.
- Optional: **Webmin/Virtualmin** — Apache can stay on **80**; Flish uses **1604** by default.

---

## One-time: VPS preparation

### 1. SSH into the server

From your PC:

```bash
ssh youruser@YOUR_VPS_IP
```

Ensure port **22/tcp** is allowed in your firewall (see below).

### 2. Install Docker and Compose

Follow the official Docker documentation for **Debian** (install `docker-ce`, `docker-ce-cli`, `containerd`, and the Compose **plugin**).

Add your user to the `docker` group (optional but convenient):

```bash
sudo usermod -aG docker "$USER"
```

Log out and log back in so the group applies.

### 3. HTTP port (default **1604**)

Keep **`WEB_PORT=1604`** in `infra/.env` (see `.env.example`). Users reach the app at **`http://YOUR_VPS_IP:1604`**. The Nginx container still listens on **80 inside Docker**; Compose maps **host 1604 → container 80**.

To use another port, change `WEB_PORT` in `.env` and open that port in the firewall.

### 4. Media storage (`MASTER_DIRECTORY` and the Docker bind mount)

The .NET API runs **inside** a container. It does **not** read arbitrary paths like `/home/flish/storage` unless you **mount** that folder into the container.

**How it works**

| Where | Path | Role |
|--------|------|------|
| **On the VPS** (host) | `MASTER_DIRECTORY` in `infra/.env` | Real folder for uploads and indexed media (you choose the absolute path). |
| **Inside the `api` container** | `/data/master` | Path the app uses (`Storage__MasterDirectory` in `infra/docker-compose.yml`). |

Compose wires them together:

```yaml
volumes:
  - ${MASTER_DIRECTORY}:/data/master
```

So if you set `MASTER_DIRECTORY=/home/flish/storage` on the host, that directory appears inside the container as `/data/master`, and the API reads and writes there.

**One-time setup on the VPS**

1. Pick a **host** path (examples below). Use the **same** value in `MASTER_DIRECTORY` in `infra/.env` on the server.

2. Create the directory and ownership (replace `youruser` with your SSH user if needed):

```bash
sudo mkdir -p /home/flish/storage
sudo chown -R youruser:youruser /home/flish/storage
```

Common choices:

- **`/home/flish/storage`** — home-style layout (matches `infra/.env.example`).
- **`/srv/flish/master`** — layout under `/srv` if you prefer system-style paths.

3. **Permissions:** If uploads or indexing fail with permission errors, check `docker compose logs api`. The container may run as a non-root user; you may need to adjust ownership (e.g. match the UID/GID used by the `aspnet` image) or permissions on `MASTER_DIRECTORY` until the process can read and write.

4. **Disk space:** `MAX_UPLOAD_BYTES` in `.env` caps upload size; ensure the filesystem has enough free space for your library.

### 5. Environment file on the server

After the first deploy (or copy manually), ensure `infra/.env` exists:

```bash
cd /YOUR/DEPLOY/PATH/infra
cp .env.example .env
nano .env   # or edit via Webmin file manager
```

Set at least:

| Variable | Notes |
|----------|--------|
| `POSTGRES_*` | Strong, unique passwords |
| `FLISH_BASIC_*` | Seed admin user for basic auth |
| `JWT_SECRET_KEY` | Long random secret for signing tokens |
| `MASTER_DIRECTORY` | **Absolute host path** bind-mounted to `/data/master` in the `api` container (e.g. `/home/flish/storage`; must match the directory you created in step 4) |
| `WEB_PORT` | Host port mapped to Nginx (default **1604**) |

Never commit real `.env` values to git.

### 6. Firewall (**firewalld**)

Allow SSH and Flish’s HTTP port (default **1604**; match `WEB_PORT` in `infra/.env` if you change it), then reload:

```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-port=1604/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

If `ssh` is not a known service in your zone, use `--add-port=22/tcp` instead of `--add-service=ssh`.

Webmin (optional): only if you need it from the internet — prefer VPN or source-restricted rules when possible.

```bash
sudo firewall-cmd --permanent --add-port=10000/tcp
sudo firewall-cmd --reload
```

If you use a non-default zone for your public interface, add `--zone=public` (or your zone name) to each `firewall-cmd` line above.

**Postgres:** The compose file binds Postgres to **127.0.0.1:5432** only, so it is not exposed on the public interface. Do **not** open **5432** in the firewall unless you intentionally want remote DB access.

---

## One-time: GitHub configuration

### 7. Deploy branch

Deployments are triggered by pushes to **`deploy`** (see `.github/workflows/deploy.yml`). Create and use that branch when you want a release:

```bash
git checkout -b deploy
git push -u origin deploy
```

### 8. Repository secrets

In GitHub: **Settings → Secrets and variables → Actions**, add:

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS public **IP** or DNS name |
| `VPS_USER` | SSH user (e.g. `debian`, `root`) |
| `VPS_SSH_KEY` | **Private** SSH key (PEM), matching a public key in `~/.ssh/authorized_keys` on the server |
| `VPS_DEPLOY_PATH` | Absolute path on the server where the repo files are uploaded (no trailing slash). Example: `/home/flish` |

Use a **dedicated deploy key** (not your personal daily key) for `VPS_SSH_KEY`.

---

## Every deploy (single command)

### 9. Push to `deploy`

```bash
git push origin deploy
```

GitHub Actions will:

1. Upload `back-end`, `front-client`, `infra`, `README.md`, and `docs` to `VPS_DEPLOY_PATH`.
2. SSH into the VPS, `cd` into `infra`, ensure `.env` exists (from `.env.example` if missing), then `docker compose build` and `up -d`.
3. Run a **health check** against `http://127.0.0.1:$WEB_PORT/health/ready` (with `WEB_PORT` loaded from `.env`).

### 10. Verify manually

On the VPS:

```bash
cd "$VPS_DEPLOY_PATH/infra"
set -a && source .env && set +a
curl -f "http://127.0.0.1:${WEB_PORT}/health/ready"
```

From your PC browser:

- `http://YOUR_VPS_IP:1604` (default; or `http://YOUR_VPS_IP:PORT` if you changed `WEB_PORT`)

---

## Webmin / Virtualmin notes

- **Apache on 80:** Flish uses **1604** on the host by default, so it does not need port 80.
- **Disk space:** Ensure enough space under Docker’s data root and under `MASTER_DIRECTORY` for uploads (`MAX_UPLOAD_BYTES` in `.env`).

---

## Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| Connection refused from browser | Firewall, wrong `WEB_PORT`, or container not running (`docker compose ps` in `infra`) |
| 502 / bad gateway on `/api/` | API container logs: `docker compose logs api` |
| Deploy fails on health check | API not ready yet (retry), or `WEB_PORT` in `.env` doesn’t match the mapped port |
| Out of disk | `df -h`, Docker prune if appropriate |
| Uploads / indexing fail, permission denied on files | `MASTER_DIRECTORY` exists on the host, matches `.env`, and is writable by the API process; see §4 and `docker compose logs api` |

---

## Repo files involved

| Path | Role |
|------|------|
| `infra/docker-compose.yml` | Postgres, API, Nginx front; `MASTER_DIRECTORY` → `/data/master` for the API; `WEB_PORT` (default **1604**) maps host → Nginx **80** inside the container |
| `infra/.env.example` | Template for server-side `.env` |
| `front-client/nginx.conf` | Serves Angular; proxies `/api/` and `/health/` to the API |
| `.github/workflows/deploy.yml` | SCP + SSH deploy on push to **`deploy`** |
