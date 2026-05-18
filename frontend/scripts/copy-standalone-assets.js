// Copy public/ and .next/static/ into the standalone build.
//
// Next.js `output: 'standalone'` produces .next/standalone/server.js which
// serves the app, but does NOT include the public/ folder or the static
// chunks at .next/static/. Per the Next.js docs we have to copy them
// ourselves after every build. Without this:
//   - /sw.js, /favicon.ico, /offline.html, /uploads/* → 404
//   - /_next/static/chunks/*.js → 404 → ChunkLoadError on every page load
//
// Runs cross-platform (Windows + Linux) via fs.cpSync (Node >=16.7).

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const standaloneDir = path.join(root, '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.log('[copy-standalone-assets] Skipped: .next/standalone not found (output: standalone not enabled).');
  process.exit(0);
}

const pairs = [
  { from: path.join(root, 'public'),         to: path.join(standaloneDir, 'public') },
  { from: path.join(root, '.next', 'static'), to: path.join(standaloneDir, '.next', 'static') },
];

for (const { from, to } of pairs) {
  if (!fs.existsSync(from)) {
    console.warn(`[copy-standalone-assets] Skipped: source missing ${from}`);
    continue;
  }
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`[copy-standalone-assets] Copied ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}
