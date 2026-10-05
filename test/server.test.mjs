import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { request } from 'node:http';
import { after, before, test } from 'node:test';
import { createAppServer } from '../server.mjs';

let server;
let port;

before(async () => {
  server = createAppServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  port = server.address().port;
});

after(async () => {
  const closed = once(server, 'close');
  server.close();
  server.closeAllConnections();
  await closed;
});

function get(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('serves the simulator, challenge mode, and every linked script and stylesheet', async () => {
  const response = await get('/');
  const html = response.body.toString();
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /^text\/html/);
  assert.match(html, /id="simulator"/);
  assert.match(html, /id="challenge-view"/);
  const assets = [...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g)].map(match => match[1]);
  assert.equal(assets.length, 4);
  for (const asset of assets) {
    const result = await get(`/${asset}?v=test`);
    assert.equal(result.status, 200, asset);
    assert.deepEqual(result.body, await readFile(new URL(`../dist/${asset}`, import.meta.url)));
    assert.match(result.headers['content-type'], asset.endsWith('.js') ? /^text\/javascript/ : /^text\/css/);
  }
});

test('health checks and HEAD requests work without response bodies for HEAD', async () => {
  const health = await get('/health');
  assert.equal(health.status, 200);
  assert.deepEqual(JSON.parse(health.body), { status: 'ok' });
  const head = await get('/', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.ok(Number(head.headers['content-length']) > 0);
});

test('missing assets and private project files are not served as the home page', async () => {
  for (const path of ['/missing.js', '/README.md', '/server.mjs', '/package.json', '/.git/config', '/%2e%2e%2fREADME.md', '/%2e%2e%5cREADME.md', '/index.html%00']) {
    assert.equal((await get(path)).status, 404, path);
  }
  assert.equal((await get('/%ZZ')).status, 400);
});

test('unsupported methods receive 405 and advertise supported methods', async () => {
  const response = await get('/', 'POST');
  assert.equal(response.status, 405);
  assert.equal(response.headers.allow, 'GET, HEAD');
});
