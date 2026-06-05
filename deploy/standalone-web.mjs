import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../frontend/dist');
const port = Number(process.env.WEB_PORT || 8002);
const apiTarget = process.env.API_TARGET || 'http://127.0.0.1:3000';

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
]);

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

async function serveStatic(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const candidate = path.resolve(root, `.${rel}`);
  const insideRoot = candidate === root || candidate.startsWith(root + path.sep);
  const file = insideRoot ? candidate : path.join(root, 'index.html');

  try {
    const stat = await fs.stat(file);
    if (!stat.isFile()) throw new Error('not a file');
    res.writeHead(200, { 'Content-Type': mime.get(path.extname(file)) || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch {
    const index = path.join(root, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    createReadStream(index).pipe(res);
  }
}

function proxyApi(req, res) {
  const target = new URL(req.url || '/', apiTarget);
  const proxyReq = http.request(
    target,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: target.host,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on('error', (err) => {
    send(res, 502, JSON.stringify({ error: 'api proxy failed', message: err.message }), 'application/json');
  });
  req.pipe(proxyReq);
}

http.createServer((req, res) => {
  if ((req.url || '').startsWith('/api/')) {
    proxyApi(req, res);
    return;
  }
  if (req.url === '/health') {
    send(res, 200, JSON.stringify({ ok: true, service: 'product-composer-web' }), 'application/json');
    return;
  }
  void serveStatic(req, res);
}).listen(port, '0.0.0.0', () => {
  console.log(`product-composer web listening on http://0.0.0.0:${port}`);
});
