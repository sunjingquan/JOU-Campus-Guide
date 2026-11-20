import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'content');
const DATA_DIR = process.env.JHD_GUIDE_DATA_DIR || path.join(PROJECT_ROOT, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const DOWNLOAD_REDIRECT_URL = 'https://app.jianghaidai.com/';

fs.mkdirSync(path.join(UPLOADS_DIR, 'images'), { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'guide.sqlite'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    contact TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    user_id TEXT,
    submitted_at TEXT NOT NULL
  );
`);

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const rateBuckets = new Map();
const jsonCache = new Map();

function loadVersionedJson(filename) {
  const filePath = path.join(CONTENT_DIR, filename);
  const stat = fs.statSync(filePath);
  const cached = jsonCache.get(filename);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const body = JSON.stringify({ data });
  const etag = `"${crypto.createHash('sha1').update(body).digest('hex').slice(0, 20)}"`;
  const entry = { mtimeMs: stat.mtimeMs, body, etag };
  jsonCache.set(filename, entry);
  return entry;
}

function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const item = rateBuckets.get(key);
  if (!item || now > item.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (item.count >= limit) return false;
  item.count += 1;
  return true;
}

function sendJson(res, status, body, extraHeaders = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(payload);
}

async function readBodyBuffer(req, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const err = new Error('Payload too large');
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(req, maxBytes = 64 * 1024) {
  const buf = await readBodyBuffer(req, maxBytes);
  if (buf.length === 0) return {};
  return JSON.parse(buf.toString('utf8'));
}

function getClientIp(req) {
  return String(
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function verifySameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const o = new URL(origin);
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    return o.host === host;
  } catch {
    return false;
  }
}

async function serveStaticFile(req, res, baseDir, relSubpath, cacheControl) {
  let decoded;
  try {
    decoded = decodeURIComponent(relSubpath);
  } catch {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }
  const resolvedBase = path.resolve(baseDir);
  const abs = path.resolve(resolvedBase, '.' + path.sep + decoded);
  if (!abs.startsWith(resolvedBase + path.sep) && abs !== resolvedBase) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  let stat;
  try {
    stat = await fsp.stat(abs);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  if (!stat.isFile()) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  const ext = path.extname(abs).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff'
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(abs).pipe(res);
}

export function createGuideServer() {
  return http.createServer(async (req, res) => {
    try {
      const urlObj = new URL(req.url || '/', 'http://localhost');
      const pathname = urlObj.pathname;

      // --- Health ---
      if (pathname === '/api/health' && (req.method === 'GET' || req.method === 'HEAD')) {
        return sendJson(res, 200, { ok: true, time: new Date().toISOString() });
      }

      // --- Download Legacy 301 Compatibility ---
      if ((pathname === '/download' || pathname === '/download/') && (req.method === 'GET' || req.method === 'HEAD')) {
        res.writeHead(301, {
          Location: DOWNLOAD_REDIRECT_URL,
          'Cache-Control': 'public, max-age=300'
        });
        res.end();
        return;
      }

      // --- Versioned Guide & Campus Read ---
      if (pathname === '/api/guide' && (req.method === 'GET' || req.method === 'HEAD')) {
        const entry = loadVersionedJson('guide.json');
        if (req.headers['if-none-match'] === entry.etag) {
          res.writeHead(304, { ETag: entry.etag });
          res.end();
          return;
        }
        return sendJson(res, 200, entry.body, {
          ETag: entry.etag,
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
        });
      }

      if (pathname === '/api/campus' && (req.method === 'GET' || req.method === 'HEAD')) {
        const entry = loadVersionedJson('campus.json');
        if (req.headers['if-none-match'] === entry.etag) {
          res.writeHead(304, { ETag: entry.etag });
          res.end();
          return;
        }
        return sendJson(res, 200, entry.body, {
          ETag: entry.etag,
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
        });
      }

      // --- Anonymous Feedback / Correction ---
      if (pathname === '/api/feedback' && req.method === 'POST') {
        if (!verifySameOrigin(req)) return sendJson(res, 403, { error: 'Invalid origin' });
        const ip = getClientIp(req);
        if (!checkRateLimit(`fb:${ip}`, 8, 10 * 60 * 1000)) {
          return sendJson(res, 429, { error: '提交过于频繁，请稍后再试' });
        }
        const body = await readJsonBody(req);
        const rawContent = String(body.content || '').trim().slice(0, 1800);
        const pageContext = String(body.page || '').trim().slice(0, 120);
        const contact = String(body.contact || '').trim().slice(0, 120);
        if (!rawContent) return sendJson(res, 400, { error: '反馈内容不能为空' });

        const content = pageContext ? `[章节: ${pageContext}] ${rawContent}` : rawContent;
        const id = crypto.randomUUID().replace(/-/g, '');
        db.prepare(`
          INSERT INTO feedback (id, content, contact, user_agent, user_id, submitted_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          id,
          content,
          contact,
          String(req.headers['user-agent'] || '').slice(0, 300),
          null,
          new Date().toISOString()
        );
        return sendJson(res, 201, { ok: true, id });
      }

      // --- Uploaded Campus Images (/uploads/images/...) ---
      if (pathname.startsWith('/uploads/images/') && (req.method === 'GET' || req.method === 'HEAD')) {
        const sub = pathname.slice('/uploads/images/'.length);
        return await serveStaticFile(
          req,
          res,
          path.join(UPLOADS_DIR, 'images'),
          sub,
          'public, max-age=86400, stale-while-revalidate=604800'
        );
      }

      // --- Block Internal Directories ---
      if (
        pathname.startsWith('/server') ||
        pathname.startsWith('/data') ||
        pathname.startsWith('/content') ||
        pathname.startsWith('/tests') ||
        pathname.startsWith('/.') ||
        pathname === '/AGENTS.md'
      ) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      // --- Static Frontend Files ---
      if (req.method === 'GET' || req.method === 'HEAD') {
        const targetRel = pathname === '/' ? 'index.html' : pathname.slice(1);
        const cache = targetRel.endsWith('.html')
          ? 'public, max-age=0, must-revalidate'
          : 'public, max-age=300, stale-while-revalidate=3600';
        return await serveStaticFile(req, res, PROJECT_ROOT, targetRel, cache);
      }

      res.writeHead(405);
      res.end('Method Not Allowed');
    } catch (err) {
      console.error('Server error:', err);
      const status = err.statusCode || 500;
      if (!res.headersSent) {
        sendJson(res, status, { error: status === 413 ? '请求内容过大' : '服务器内部错误' });
      } else {
        res.end();
      }
    }
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const server = createGuideServer();
  server.listen(PORT, HOST, () => {
    console.log(`JOU Campus Guide server listening on http://${HOST}:${PORT}`);
  });
}
