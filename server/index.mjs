import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import {
  escapeHtml,
  toRouteHref,
  resolveRouteFromPathname,
  buildRouteRenderBundle,
  DEFAULT_COMMUNITY_TOPICS
} from '../js/templates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'content');
const DATA_DIR = process.env.JHD_GUIDE_DATA_DIR || path.join(PROJECT_ROOT, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://jianghaidai.com').replace(/\/$/, '');
const DISCOURSE_LATEST_URL =
  process.env.DISCOURSE_LATEST_URL || 'https://bbs.jianghaidai.com/latest.json';
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
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const rateBuckets = new Map();
const jsonCache = new Map();
let htmlShellCache = null;

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
  const entry = { mtimeMs: stat.mtimeMs, data, body, etag };
  jsonCache.set(filename, entry);
  return entry;
}

function loadIndexHtmlTemplate() {
  const filePath = path.join(PROJECT_ROOT, 'index.html');
  const stat = fs.statSync(filePath);
  if (htmlShellCache && htmlShellCache.mtimeMs === stat.mtimeMs) {
    return htmlShellCache.template;
  }
  const template = fs.readFileSync(filePath, 'utf8');
  htmlShellCache = { mtimeMs: stat.mtimeMs, template };
  return template;
}

function createCommunityTracker(fetchImpl) {
  const tracker = {
    topics: DEFAULT_COMMUNITY_TOPICS,
    updatedAt: 0,
    inflight: null
  };

  async function refresh() {
    const now = Date.now();
    if (now - tracker.updatedAt < 5 * 60 * 1000 && tracker.updatedAt > 0) {
      return tracker.topics;
    }
    if (tracker.inflight) return tracker.inflight;

    tracker.inflight = (async () => {
      try {
        const res = await fetchImpl(DISCOURSE_LATEST_URL, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(2800)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        const rawTopics = payload?.topic_list?.topics;
        if (Array.isArray(rawTopics) && rawTopics.length > 0) {
          const parsed = rawTopics
            .filter((t) => t && t.visible !== false && t.title)
            .slice(0, 6)
            .map((t) => ({
              id: Number(t.id) || 0,
              title: String(t.fancy_title || t.title)
                .replace(/<[^>]+>/g, '')
                .trim(),
              category: t.pinned ? '置顶精选' : '社区热议',
              postsCount: Number(t.posts_count || 1),
              views: Number(t.views || 0),
              url: `https://bbs.jianghaidai.com/t/${encodeURIComponent(t.slug || 'topic')}/${Number(t.id)}`
            }));
          if (parsed.length > 0) {
            tracker.topics = parsed;
          }
        }
        tracker.updatedAt = Date.now();
      } catch {
        tracker.updatedAt = Date.now() - 4 * 60 * 1000;
      } finally {
        tracker.inflight = null;
      }
      return tracker.topics;
    })();

    return tracker.inflight;
  }

  return { tracker, refresh };
}

function buildSsrHtml(pathname, community) {
  const guideData = loadVersionedJson('guide.json').data;
  const campusData = loadVersionedJson('campus.json').data;
  const resolved = resolveRouteFromPathname(pathname, guideData, campusData);

  if (resolved.isPortal && Date.now() - community.tracker.updatedAt > 5 * 60 * 1000) {
    community.refresh().catch(() => {});
  }

  const bundle = buildRouteRenderBundle({
    resolved,
    guideData,
    campusData,
    selectedCampus: resolved.detailItem?.campusId || 'cangwu',
    communityTopics: community.tracker.topics
  });

  const canonicalUrl = `${PUBLIC_BASE_URL}${bundle.canonicalPath}`;
  const headHtml = [
    `<title>${escapeHtml(bundle.title)}</title>`,
    `<meta name="description" content="${escapeHtml(bundle.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="酱海带 · 江苏海洋大学校园指南" />`,
    `<meta property="og:title" content="${escapeHtml(bundle.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(bundle.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(bundle.ogImage)}" />`
  ].join('\n    ');

  let html = loadIndexHtmlTemplate();
  html = html.replace(
    /<!--SSR_HEAD_START-->[\s\S]*?<!--SSR_HEAD_END-->/,
    `<!--SSR_HEAD_START-->\n    ${headHtml}\n    <!--SSR_HEAD_END-->`
  );
  html = html.replace('<body data-view="portal">', `<body data-view="${escapeHtml(bundle.viewMode)}">`);
  html = html.replace('<!--SSR_SIDEBAR-->', bundle.sidebarHtml);
  html = html.replace(
    /<!--SSR_MAIN_START-->[\s\S]*?<!--SSR_MAIN_END-->/,
    `<!--SSR_MAIN_START-->${bundle.mainHtml}<!--SSR_MAIN_END-->`
  );
  html = html.replace('<!--SSR_TOC-->', bundle.tocHtml);

  return { status: resolved.valid ? 200 : 404, html, resolved };
}

function buildSitemapXml() {
  const guideData = loadVersionedJson('guide.json').data;
  const campusData = loadVersionedJson('campus.json').data;
  const urls = new Set([`${PUBLIC_BASE_URL}/`]);

  for (const cat of guideData) {
    if (cat.isHomePage) continue;
    for (const page of cat.pages || []) {
      urls.add(`${PUBLIC_BASE_URL}${toRouteHref(cat.key, page.pageKey)}`);
    }
  }
  for (const c of campusData.canteens || []) {
    urls.add(`${PUBLIC_BASE_URL}${toRouteHref('campusLife', 'canteen', c.id)}`);
  }
  for (const d of campusData.dormitories || []) {
    urls.add(`${PUBLIC_BASE_URL}${toRouteHref('campusLife', 'dormitory', d.id)}`);
  }

  const items = [...urls]
    .map((u) => `  <url><loc>${escapeHtml(u)}</loc><changefreq>weekly</changefreq></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
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
    return true;
  }
  const resolvedBase = path.resolve(baseDir);
  const abs = path.resolve(resolvedBase, '.' + path.sep + decoded);
  if (!abs.startsWith(resolvedBase + path.sep) && abs !== resolvedBase) {
    res.writeHead(403);
    res.end('Forbidden');
    return true;
  }
  let stat;
  try {
    stat = await fsp.stat(abs);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;

  const ext = path.extname(abs).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff'
  });
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  fs.createReadStream(abs).pipe(res);
  return true;
}

export function createGuideServer({ fetchImpl = globalThis.fetch } = {}) {
  const community = createCommunityTracker(fetchImpl);
  return http.createServer(async (req, res) => {
    try {
      const urlObj = new URL(req.url || '/', 'http://localhost');
      const pathname = urlObj.pathname;

      // --- Health ---
      if (pathname === '/api/health' && (req.method === 'GET' || req.method === 'HEAD')) {
        return sendJson(res, 200, { ok: true, time: new Date().toISOString() });
      }

      // --- Download Legacy 301 Compatibility (preserving safe promo channel params) ---
      if (
        (pathname === '/download' || pathname === '/download/') &&
        (req.method === 'GET' || req.method === 'HEAD')
      ) {
        const redirectTarget = new URL(DOWNLOAD_REDIRECT_URL);
        for (const key of ['s', 'src', 'utm_source', 'ch']) {
          const rawVal = (urlObj.searchParams.get(key) || '').trim().toLowerCase();
          if (/^[a-z0-9][a-z0-9_-]{0,31}$/.test(rawVal)) {
            redirectTarget.searchParams.set(key, rawVal);
          }
        }
        res.writeHead(301, {
          Location: redirectTarget.toString(),
          'Cache-Control': 'public, max-age=300'
        });
        res.end();
        return;
      }

      // --- Canonical Home Normalization ---
      if (
        (pathname === '/home' || pathname === '/home/home' || pathname === '/index.html') &&
        (req.method === 'GET' || req.method === 'HEAD')
      ) {
        res.writeHead(301, {
          Location: '/',
          'Cache-Control': 'public, max-age=300'
        });
        res.end();
        return;
      }

      // --- Sitemap & Robots ---
      if (pathname === '/sitemap.xml' && (req.method === 'GET' || req.method === 'HEAD')) {
        const xml = buildSitemapXml();
        res.writeHead(200, {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff'
        });
        res.end(req.method === 'HEAD' ? undefined : xml);
        return;
      }

      if (pathname === '/robots.txt' && (req.method === 'GET' || req.method === 'HEAD')) {
        const txt = `User-agent: *\nAllow: /\nSitemap: ${PUBLIC_BASE_URL}/sitemap.xml\n`;
        res.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff'
        });
        res.end(req.method === 'HEAD' ? undefined : txt);
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
          'Cache-Control': 'public, max-age=0, s-maxage=120, must-revalidate'
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
          'Cache-Control': 'public, max-age=0, s-maxage=120, must-revalidate'
        });
      }

      // --- Cached Discourse Community Topics ---
      if (pathname === '/api/community-feed' && (req.method === 'GET' || req.method === 'HEAD')) {
        const topics = await community.refresh();
        return sendJson(
          res,
          200,
          { ok: true, topics },
          { 'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=3600' }
        );
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

      if (pathname.startsWith('/api/')) {
        return sendJson(res, 404, { error: 'API endpoint not found' });
      }

      // --- Uploaded Campus Images (/uploads/images/...) ---
      if (
        pathname.startsWith('/uploads/images/') &&
        (req.method === 'GET' || req.method === 'HEAD')
      ) {
        const sub = pathname.slice('/uploads/images/'.length);
        const served = await serveStaticFile(
          req,
          res,
          path.join(UPLOADS_DIR, 'images'),
          sub,
          'public, max-age=86400, stale-while-revalidate=604800'
        );
        if (!served) {
          res.writeHead(404);
          res.end('Not Found');
        }
        return;
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

      // --- Static Frontend Assets & Isomorphic SSR Routes ---
      if (req.method === 'GET' || req.method === 'HEAD') {
        if (pathname !== '/' && path.extname(pathname)) {
          const served = await serveStaticFile(
            req,
            res,
            PROJECT_ROOT,
            pathname.slice(1),
            'public, max-age=300, stale-while-revalidate=3600'
          );
          if (!served) {
            res.writeHead(404);
            res.end('Not Found');
          }
          return;
        }

        const { status, html } = buildSsrHtml(pathname, community);
        const buf = Buffer.from(html, 'utf8');
        res.writeHead(status, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': buf.length,
          'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=3600',
          'X-Content-Type-Options': 'nosniff'
        });
        res.end(req.method === 'HEAD' ? undefined : buf);
        return;
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

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const server = createGuideServer();
  server.listen(PORT, HOST, () => {
    console.log(`JOU Campus Guide server listening on http://${HOST}:${PORT}`);
  });
}
