import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = dirname(fileURLToPath(import.meta.url));
const publicDirectory = await realpath(resolve(projectDirectory, 'dist'));
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

export function createAppServer() {
  return createServer(async (request, response) => {
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      response.writeHead(status, {
        'Content-Type': type,
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    };

    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      send(405, 'Method not allowed');
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      send(400, 'Bad request');
      return;
    }

    if (pathname === '/health') {
      send(200, JSON.stringify({ status: 'ok' }), contentTypes['.json']);
      return;
    }

    // Only public assets may be served, including when paths are URL-encoded.
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) {
      send(404, 'Not found');
      return;
    }

    try {
      const candidate = resolve(publicDirectory, `.${pathname === '/' ? '/index.html' : pathname}`);
      const filename = await realpath(candidate);
      if (!filename.startsWith(publicDirectory + sep) || !(await stat(filename)).isFile()) {
        send(404, 'Not found');
        return;
      }
      const body = await readFile(filename);
      send(200, body, contentTypes[extname(filename).toLowerCase()] || 'application/octet-stream');
    } catch (error) {
      if (['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'EINVAL', 'ENAMETOOLONG'].includes(error.code)) {
        send(404, 'Not found');
      } else {
        console.error('Unable to serve an asset:', error.code || error.message);
        send(500, 'Internal server error');
      }
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Fail startup if the deploy omitted the site, instead of reporting it healthy.
  await readFile(resolve(publicDirectory, 'index.html'));
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const server = createAppServer();
  server.listen(port, '0.0.0.0', () => {
    console.log(`Inflation Lab listening on 0.0.0.0:${port}`);
  });
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
