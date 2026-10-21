# Deployment Runbook

This project has two helper scripts:

- `deploy.sh`: pull latest code, build, restart PM2 services, run health checks
- `rollback.sh`: deploy previous commit quickly

## 1) One-command deploy

Run from project root:

```bash
./deploy.sh
```

What it does by default:

1. `git fetch` + `git pull --ff-only` on `main`
2. Frontend: `npm ci` + `npm run build` + `pm2 restart ilena-frontend --update-env`
3. Backend: `npm ci` + `pm2 restart ilena-backend --update-env`
4. `pm2 save`
5. Health checks:
   - `https://ilenafurniture.net/api/health`
   - CSS chunk from `https://ilenafurniture.net/`
6. Save commit SHA to `.deploy/last_successful_commit`

## 2) Useful deploy options

```bash
./deploy.sh --frontend-only
./deploy.sh --backend-only
./deploy.sh --no-pull
./deploy.sh --branch main
./deploy.sh --skip-health-check
```

## 3) Quick rollback

Rollback to last successful deploy:

```bash
./rollback.sh last
```

Rollback to a specific commit:

```bash
./rollback.sh <commit-sha>
```

## 4) Rollback checklist (fast)

1. Confirm current issue quickly:
   - `curl -I https://ilenafurniture.net/api/health`
   - `curl -s https://ilenafurniture.net/ | grep -oE '/_next/static/chunks/[^"]+\\.css' | head -1`
2. Execute rollback:
   - `./rollback.sh last`
3. Verify services:
   - `pm2 list`
4. Verify app:
   - `curl -I https://ilenafurniture.net/api/health`
   - `curl -s https://ilenafurniture.net/ | grep -oE '/_next/static/chunks/[^"]+\\.css' | head -1`
5. If rollback fixed issue, keep traffic on rollback commit, then investigate and redeploy from fixed commit.

## 5) Notes

- `rollback.sh` checks out commit in detached HEAD intentionally.
- After rollback, return to branch for normal deploy flow:

```bash
git checkout main
./deploy.sh
```

## 6) Production backup

Run manual backup from project root:

```bash
chmod +x scripts/backup-production.sh
./scripts/backup-production.sh
```

Default output: `./backups`.

Recommended cron, daily at 02:30 server time:

```bash
30 2 * * * cd /home/aditya/projects/ilenainterior && /bin/bash scripts/backup-production.sh >> backups/backup.log 2>&1
```
