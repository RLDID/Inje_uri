// @ts-check
const { createServer } = require('node:http');
const { createReadStream } = require('node:fs');
const { stat } = require('node:fs/promises');
const path = require('node:path');
const { parse } = require('node:url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME ?? '0.0.0.0';
const port = parseInt(process.env.PORT ?? '3000', 10);

const UPLOADS_URL_PREFIX = '/uploads/';
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

const MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    const parsedUrl = parse(req.url ?? '/', true);
    const { pathname } = parsedUrl;

    if (pathname && pathname.startsWith(UPLOADS_URL_PREFIX)) {
      const relativePath = pathname.slice(UPLOADS_URL_PREFIX.length);
      const filePath = path.resolve(UPLOADS_DIR, relativePath);
      const isOutsideUploadsDir = !filePath.startsWith(path.resolve(UPLOADS_DIR));
      if (isOutsideUploadsDir) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      try {
        await stat(filePath);
        const ext = path.extname(filePath).slice(1).toLowerCase();
        const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
      return;
    }

    await handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
