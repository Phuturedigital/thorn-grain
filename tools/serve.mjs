/* Minimal static server that reproduces Vercel's cleanUrls behaviour.
 *
 * Without this, local testing lies: every internal link on this site is written
 * `href="shop"` (no .html) because vercel.json sets cleanUrls, so opening the
 * pages over file:// 404s on every click and the whole store looks broken.
 *
 * Exported as a function so the QA scripts can start it in-process rather than
 * juggling a background shell.
 *
 * Usage:  node tools/serve.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
};

const exists = async (p) => { try { return (await stat(p)).isFile(); } catch { return false; } };

export function serve(port = 4321) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index';

    let file = join(ROOT, path);
    /* cleanUrls: an extensionless request resolves to <name>.html */
    if (!extname(file)) {
      if (await exists(`${file}.html`)) file = `${file}.html`;
      else if (await exists(join(file, 'index.html'))) file = join(file, 'index.html');
    }

    if (!(await exists(file))) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 ${path}`);
      return;
    }

    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  });

  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

/* Run-directly check. `process.argv[1]` is undefined under `node -e`, where this
   module is imported rather than executed — guard it or importing serve() throws. */
const invokedDirectly = process.argv[1]
  && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;

if (invokedDirectly) {
  const port = Number(process.argv[2]) || 4321;
  await serve(port);
  console.log(`serving ${ROOT} on http://localhost:${port} (cleanUrls)`);
}
