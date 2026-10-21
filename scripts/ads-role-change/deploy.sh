#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=/home/aditya/projects/ilenainterior
RELEASE="$ROOT/.deploy/ads-analyst-20261021"
cd "$ROOT"
exec > >(tee -a "$RELEASE/deploy.log") 2>&1
test ! -f "$RELEASE/original.tar"
curl -fsS -o /dev/null -w 'BASELINE: health HTTP %{http_code}\n' https://ilenafurniture.net/api/health
mkdir -p "$RELEASE/build" "$RELEASE/rollback-test"
: > "$RELEASE/existing.txt"
: > "$RELEASE/added.txt"
while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  if [[ -f "$file" ]]; then echo "$file" >> "$RELEASE/existing.txt"; else echo "$file" >> "$RELEASE/added.txt"; fi
done < "$RELEASE/files.txt"
tar -cpf "$RELEASE/original.tar" -T "$RELEASE/existing.txt"
chmod 600 "$RELEASE/original.tar"
while IFS= read -r file; do sha256sum "$file"; done < "$RELEASE/existing.txt" > "$RELEASE/original-sha256.txt"
tar --exclude=frontend/node_modules --exclude=frontend/.next -cf - frontend | tar -xf - -C "$RELEASE/build"
tar -xzf "$RELEASE/source.tgz" -C "$RELEASE/build"
cp -a frontend/node_modules "$RELEASE/build/frontend/node_modules"
(cd "$RELEASE/build/frontend" && npm run build)
test -f "$RELEASE/build/frontend/.next/standalone/server.js"
cp -a frontend/.next "$RELEASE/previous-next"
cp "$RELEASE/build/backend/scripts/rollback-ads-account.cjs" "$RELEASE/rollback-account.cjs"
cat > "$RELEASE/ROLLBACK.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=/home/aditya/projects/ilenainterior
R="$ROOT/.deploy/ads-analyst-20261021"
TARGET="${1:-$ROOT}"
[[ "$TARGET" == "$ROOT" || "$TARGET" == "$R/rollback-test" ]] || exit 2
tar -xpf "$R/original.tar" -C "$TARGET"
while IFS= read -r f; do [[ -z "$f" ]] || rm -f -- "$TARGET/$f"; done < "$R/added.txt"
(cd "$TARGET" && sha256sum --check "$R/original-sha256.txt")
if [[ "$TARGET" == "$ROOT" ]]; then
  if [[ -f "$R/account-before.json" ]]; then
    cp "$R/rollback-account.cjs" "$ROOT/backend/rollback-ads-account.cjs"
    (cd "$ROOT/backend" && node rollback-ads-account.cjs "$R/account-before.json")
    rm -f -- "$ROOT/backend/rollback-ads-account.cjs"
  fi
  pm2 stop ilena-frontend
  mv "$ROOT/frontend/.next" "$R/failed-next-$(date +%s)"
  cp -a "$R/previous-next" "$ROOT/frontend/.next"
  pm2 restart ilena-backend ilena-frontend --update-env
fi
echo 'ROLLBACK: PASS; source hashes restored; prior behavior retained'
ROLLBACK
chmod +x "$RELEASE/ROLLBACK.sh"
tar -xzf "$RELEASE/source.tgz" -C "$RELEASE/rollback-test"
bash "$RELEASE/ROLLBACK.sh" "$RELEASE/rollback-test"
sha256sum --check "$RELEASE/original-sha256.txt"
trap 'code=$?; if [[ $code != 0 ]]; then bash "$RELEASE/ROLLBACK.sh"; fi; exit $code' EXIT
tar -xzf "$RELEASE/source.tgz" -C "$ROOT"
(cd backend && ADS_ANALYST_BACKUP="$RELEASE/account-before.json" node scripts/provision-ads-analyst.cjs)
pm2 stop ilena-frontend
mv frontend/.next "$RELEASE/pre-swap-next"
cp -a "$RELEASE/build/frontend/.next" frontend/.next
pm2 restart ilena-backend ilena-frontend --update-env
sleep 5
node scripts/ads-role-change/verify-live.cjs
pm2 save
echo 'DEPLOY: PASS; analyst account and dashboard live; existing server changes retained'
trap - EXIT
