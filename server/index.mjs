import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.JHD_GUIDE_DATA_DIR || path.join(PROJECT_ROOT, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';

const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const DISCOURSE_BASE_URL = (process.env.DISCOURSE_BASE_URL || 'https://bbs.jianghaidai.com').replace(/\/$/, '');
const DISCOURSE_CONNECT_SECRET = process.env.DISCOURSE_CONNECT_SECRET || '';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

fs.mkdirSync(path.join(UPLOADS_DIR, 'images'), { recursive: true });
fs.mkdirSync(path.join(UPLOADS_DIR, 'materials'), { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'guide.sqlite'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS guide_categories (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'book',
    area TEXT NOT NULL DEFAULT 'official',
    is_home_page INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    pages_json TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS campus_singleton (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    discourse_id TEXT UNIQUE,
    username TEXT,
    student_id TEXT,
    nickname TEXT NOT NULL,
    email TEXT,
    avatar TEXT,
    bio TEXT DEFAULT '这个人很懒，什么都没留下...',
    enrollment_year TEXT DEFAULT '',
    major TEXT DEFAULT '',
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS study_materials (
    id TEXT PRIMARY KEY,
    uploader_id TEXT NOT NULL,
    uploader_student_id TEXT,
    uploader_nickname TEXT NOT NULL,
    course_name TEXT NOT NULL,
    teacher TEXT DEFAULT '',
    college TEXT NOT NULL,
    major TEXT NOT NULL,
    material_type TEXT NOT NULL,
    description TEXT DEFAULT '',
    file_name TEXT NOT NULL,
    file_rel_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    student_id TEXT,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TEXT NOT NULL,
    UNIQUE(material_id, user_id)
  );
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

const ALLOWED_MATERIAL_EXTS = new Set([
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  '.jpg', '.jpeg', '.png', '.txt', '.zip', '.rar'
]);

const MAX_MATERIAL_BYTES = 20 * 1024 * 1024;
const rateBuckets = new Map();

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

function hmacSign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function createSignedToken(payloadObj, ttlSeconds) {
  const payload = Buffer.from(
    JSON.stringify({ ...payloadObj, exp: Math.floor(Date.now() / 1000) + ttlSeconds })
  ).toString('base64url');
  return `${payload}.${hmacSign(payload)}`;
}

function verifySignedToken(token) {
  if (!token || typeof token !== 'string') return null;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!safeEqual(sig, hmacSign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return out;
}

function isSecureRequest(req) {
  return req.headers['x-forwarded-proto'] === 'https' || PUBLIC_BASE_URL.startsWith('https://');
}

function formatCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${opts.path || '/'}`, 'HttpOnly', 'SameSite=Lax'];
  if (opts.secure) parts.push('Secure');
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join('; ');
}

function getSessionUser(req) {
  const cookies = parseCookies(req);
  const claims = verifySignedToken(cookies.jhd_guide_session);
  if (!claims?.uid) return null;
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(claims.uid);
  if (!row) return null;
  return {
    _id: row.id,
    discourseId: row.discourse_id,
    username: row.username,
    studentId: row.student_id,
    nickname: row.nickname,
    email: row.email,
    avatar: row.avatar || '/uploads/images/%E9%BB%98%E8%AE%A4%E5%A4%B4%E5%83%8F/avatar_01.png',
    bio: row.bio || '这个人很懒，什么都没留下...',
    enrollmentYear: row.enrollment_year || '',
    major: row.major || '',
    isAdmin: Boolean(row.is_admin)
  };
}

function sendJson(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
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

async function serveStaticFile(req, res, baseDir, relSubpath, cacheControl, forceDownloadName = null) {
  const decoded = decodeURIComponent(relSubpath);
  const abs = path.resolve(baseDir, '.' + path.sep + decoded);
  if (!abs.startsWith(path.resolve(baseDir) + path.sep) && abs !== path.resolve(baseDir)) {
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
  const headers = {
    'Content-Type': forceDownloadName ? 'application/octet-stream' : (MIME_MAP[ext] || 'application/octet-stream'),
    'Content-Length': stat.size,
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff'
  };
  if (forceDownloadName) {
    const fallback = forceDownloadName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
    headers['Content-Disposition'] = `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(forceDownloadName)}`;
  }
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(abs).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url || '/', 'http://localhost');
    const pathname = urlObj.pathname;

    // --- Health ---
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true, time: new Date().toISOString() });
    }

    // --- Guide & Campus Public Read ---
    if (pathname === '/api/guide' && req.method === 'GET') {
      const rows = db.prepare('SELECT * FROM guide_categories ORDER BY sort_order ASC, key ASC').all();
      const data = rows.map((r) => ({
        _id: r.id,
        key: r.key,
        title: r.title,
        icon: r.icon,
        area: r.area,
        isHomePage: Boolean(r.is_home_page),
        order: r.sort_order,
        pages: JSON.parse(r.pages_json || '[]')
      }));
      return sendJson(res, 200, { data }, {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
      });
    }

    if (pathname === '/api/campus' && req.method === 'GET') {
      const row = db.prepare('SELECT data_json FROM campus_singleton WHERE id = 1').get();
      const data = row ? JSON.parse(row.data_json) : { campuses: [], dormitories: [], canteens: [], colleges: [] };
      return sendJson(res, 200, { data }, {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
      });
    }

    // --- Admin Write Endpoints (Strictly Admin Only) ---
    if (pathname === '/api/admin/guide' && req.method === 'PUT') {
      if (!verifySameOrigin(req)) return sendJson(res, 403, { error: 'Invalid origin' });
      const user = getSessionUser(req);
      if (!user || !user.isAdmin) return sendJson(res, 403, { error: '仅社区管理员可修改指南内容' });
      const body = await readJsonBody(req, 2 * 1024 * 1024);
      if (!Array.isArray(body.categories)) return sendJson(res, 400, { error: 'Invalid categories array' });
      db.exec('BEGIN');
      try {
        db.exec('DELETE FROM guide_categories');
        const stmt = db.prepare(`
          INSERT INTO guide_categories (id, key, title, icon, area, is_home_page, sort_order, pages_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const g of body.categories) {
          stmt.run(
            String(g._id || crypto.randomUUID()),
            String(g.key),
            String(g.title),
            String(g.icon || 'book'),
            String(g.area || 'official'),
            g.isHomePage ? 1 : 0,
            Number(g.order ?? 0),
            JSON.stringify(Array.isArray(g.pages) ? g.pages : [])
          );
        }
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return sendJson(res, 200, { ok: true });
    }

    // --- Auth & DiscourseConnect SSO ---
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = getSessionUser(req);
      return sendJson(res, 200, { user, ssoConfigured: Boolean(DISCOURSE_CONNECT_SECRET), forumUrl: DISCOURSE_BASE_URL });
    }

    if (pathname === '/api/auth/sso/login' && req.method === 'GET') {
      if (!DISCOURSE_CONNECT_SECRET) {
        return sendJson(res, 503, { error: 'DiscourseConnect SSO 尚未配置密钥' });
      }
      const nonce = crypto.randomBytes(16).toString('hex');
      const returnTo = urlObj.searchParams.get('returnTo') || '/';
      const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
      const callbackUrl = `${PUBLIC_BASE_URL}/api/auth/sso/callback`;
      const rawPayload = `nonce=${nonce}&return_sso_url=${encodeURIComponent(callbackUrl)}`;
      const sso = Buffer.from(rawPayload, 'utf8').toString('base64');
      const sig = crypto.createHmac('sha256', DISCOURSE_CONNECT_SECRET).update(sso).digest('hex');

      const nonceToken = createSignedToken({ nonce, returnTo: safeReturnTo }, 600);
      const redirectUrl = `${DISCOURSE_BASE_URL}/session/sso_provider?sso=${encodeURIComponent(sso)}&sig=${sig}`;
      res.writeHead(302, {
        Location: redirectUrl,
        'Set-Cookie': formatCookie('jhd_sso_nonce', nonceToken, { secure: isSecureRequest(req), maxAge: 600 }),
        'Cache-Control': 'no-store'
      });
      res.end();
      return;
    }

    if (pathname === '/api/auth/sso/callback' && req.method === 'GET') {
      if (!DISCOURSE_CONNECT_SECRET) {
        res.writeHead(503);
        res.end('SSO not configured');
        return;
      }
      const sso = urlObj.searchParams.get('sso') || '';
      const sig = urlObj.searchParams.get('sig') || '';
      const expectedSig = crypto.createHmac('sha256', DISCOURSE_CONNECT_SECRET).update(sso).digest('hex');
      if (!sso || !sig || !safeEqual(sig, expectedSig)) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('SSO 签名校验失败，请返回重试。');
        return;
      }

      const cookies = parseCookies(req);
      const nonceClaims = verifySignedToken(cookies.jhd_sso_nonce);
      const params = new URLSearchParams(Buffer.from(sso, 'base64').toString('utf8'));
      if (!nonceClaims || params.get('nonce') !== nonceClaims.nonce) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('SSO 会话已过期或 Nonce 不匹配，请重新发起登录。');
        return;
      }

      const discourseId = params.get('external_id') || '';
      const username = params.get('username') || '';
      const displayName = params.get('name') || username || '海带用户';
      const email = params.get('email') || '';
      let avatarUrl = params.get('avatar_url') || '';
      if (avatarUrl && avatarUrl.startsWith('/')) {
        avatarUrl = `${DISCOURSE_BASE_URL}${avatarUrl}`;
      }
      const isAdmin = params.get('admin') === 'true' || params.get('moderator') === 'true' ? 1 : 0;
      const now = new Date().toISOString();
      const userId = `bbs_${discourseId}`;

      const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (existing) {
        db.prepare(`
          UPDATE users
          SET username = ?, email = COALESCE(NULLIF(?, ''), email), avatar = COALESCE(NULLIF(?, ''), avatar), is_admin = ?, updated_at = ?
          WHERE id = ?
        `).run(username, email, avatarUrl, isAdmin, now, userId);
      } else {
        db.prepare(`
          INSERT INTO users (id, discourse_id, username, student_id, nickname, email, avatar, bio, enrollment_year, major, is_admin, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          discourseId,
          username,
          null,
          displayName.slice(0, 24),
          email,
          avatarUrl || '/uploads/images/%E9%BB%98%E8%AE%A4%E5%A4%B4%E5%83%8F/avatar_01.png',
          '来自酱海带社区',
          new Date().getFullYear().toString(),
          '',
          isAdmin,
          now,
          now
        );
      }

      const sessionToken = createSignedToken({ uid: userId }, 30 * 86400);
      const secure = isSecureRequest(req);
      res.writeHead(302, {
        Location: nonceClaims.returnTo || '/',
        'Set-Cookie': [
          formatCookie('jhd_guide_session', sessionToken, { secure, maxAge: 30 * 86400 }),
          formatCookie('jhd_sso_nonce', '', { secure, maxAge: 0 })
        ],
        'Cache-Control': 'no-store'
      });
      res.end();
      return;
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      if (!verifySameOrigin(req)) return sendJson(res, 403, { error: 'Invalid origin' });
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': formatCookie('jhd_guide_session', '', { secure: isSecureRequest(req), maxAge: 0 }),
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (pathname === '/api/users/me' && req.method === 'PATCH') {
      if (!verifySameOrigin(req)) return sendJson(res, 403, { error: 'Invalid origin' });
      const user = getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: '请先登录' });
      const body = await readJsonBody(req);
      const nickname = String(body.nickname ?? user.nickname).trim().slice(0, 20) || user.nickname;
      const bio = String(body.bio ?? user.bio).trim().slice(0, 120);
      const enrollmentYear = String(body.enrollmentYear ?? user.enrollmentYear).replace(/[^0-9]/g, '').slice(0, 4);
      const major = String(body.major ?? user.major).trim().slice(0, 40);
      let avatar = user.avatar;
      if (typeof body.avatar === 'string' && (body.avatar.startsWith('/uploads/') || body.avatar.startsWith('https://bbs.jianghaidai.com/'))) {
        avatar = body.avatar;
      }
      db.prepare(`
        UPDATE users SET nickname = ?, bio = ?, enrollment_year = ?, major = ?, avatar = ?, updated_at = ? WHERE id = ?
      `).run(nickname, bio, enrollmentYear, major, avatar, new Date().toISOString(), user._id);
      return sendJson(res, 200, { user: getSessionUser(req) });
    }

    // --- Study Materials ---
    if (pathname === '/api/materials' && req.method === 'GET') {
      const college = (urlObj.searchParams.get('college') || '').trim();
      const major = (urlObj.searchParams.get('major') || '').trim();
      const searchTerm = (urlObj.searchParams.get('searchTerm') || '').trim();
      const sortColMap = {
        createdAt: 'created_at',
        downloadCount: 'download_count',
        rating: 'rating'
      };
      const sortCol = sortColMap[urlObj.searchParams.get('sortBy')] || 'created_at';
      const sortDir = urlObj.searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';

      const clauses = [];
      const args = [];
      if (college) {
        clauses.push('college = ?');
        args.push(college);
      }
      if (major) {
        clauses.push('major = ?');
        args.push(major);
      }
      if (searchTerm) {
        clauses.push('(course_name LIKE ? OR teacher LIKE ?)');
        args.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const rows = db.prepare(`SELECT * FROM study_materials ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT 200`).all(...args);
      const user = getSessionUser(req);
      let ratedSet = new Set();
      if (user && rows.length > 0) {
        const userRatings = db.prepare('SELECT material_id FROM ratings WHERE user_id = ?').all(user._id);
        ratedSet = new Set(userRatings.map((r) => r.material_id));
      }
      const data = rows.map((r) => ({
        _id: r.id,
        uploaderId: r.uploader_id,
        uploaderStudentId: r.uploader_student_id,
        uploaderNickname: r.uploader_nickname,
        courseName: r.course_name,
        teacher: r.teacher,
        college: r.college,
        major: r.major,
        materialType: r.material_type,
        description: r.description,
        fileName: r.file_name,
        fileCloudPath: r.id,
        fileSize: r.file_size,
        downloadCount: r.download_count,
        rating: r.rating,
        ratingCount: r.rating_count,
        createdAt: r.created_at,
        userRated: ratedSet.has(r.id)
      }));
      return sendJson(res, 200, { data });
    }

    if (pathname === '/api/materials/upload' && req.method === 'POST') {
      if (!verifySameOrigin(req)) return sendJson(res, 403, { error: 'Invalid origin' });
      const user = getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: '请先使用社区账号登录' });
      if (!checkRateLimit(`upload:${user._id}`, 10, 10 * 60 * 1000)) {
        return sendJson(res, 429, { error: '上传过于频繁，请稍后再试' });
      }
      const metaHeader = req.headers['x-material-meta'];
      if (!metaHeader) return sendJson(res, 400, { error: '缺少资料元数据' });
      const meta = JSON.parse(Buffer.from(String(metaHeader), 'base64').toString('utf8'));
      const rawFileName = path.basename(String(meta.fileName || '')).trim();
      const ext = path.extname(rawFileName).toLowerCase();
      if (!rawFileName || !ALLOWED_MATERIAL_EXTS.has(ext)) {
        return sendJson(res, 400, { error: '不支持的文件类型' });
      }
      const courseName = String(meta.courseName || '').trim().slice(0, 80);
      const college = String(meta.college || '').trim().slice(0, 60);
      const major = String(meta.major || '').trim().slice(0, 60);
      const materialType = String(meta.materialType || '其他资料').trim().slice(0, 30);
      const teacher = String(meta.teacher || '').trim().slice(0, 40);
      const description = String(meta.description || '').trim().slice(0, 500);
      if (!courseName || !college || !major) {
        return sendJson(res, 400, { error: '请填写完整的必填信息' });
      }

      const fileBuf = await readBodyBuffer(req, MAX_MATERIAL_BYTES);
      if (fileBuf.length === 0) return sendJson(res, 400, { error: '文件内容为空' });

      const id = crypto.randomUUID().replace(/-/g, '');
      const storedFileName = `${id}${ext}`;
      await fsp.writeFile(path.join(UPLOADS_DIR, 'materials', storedFileName), fileBuf);

      db.prepare(`
        INSERT INTO study_materials (
          id, uploader_id, uploader_student_id, uploader_nickname,
          course_name, teacher, college, major, material_type, description,
          file_name, file_rel_path, file_size, download_count, rating, rating_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)
      `).run(
        id,
        user._id,
        user.studentId || user.username || null,
        user.nickname,
        courseName,
        teacher,
        college,
        major,
        materialType,
        description,
        rawFileName,
        storedFileName,
        fileBuf.length,
        new Date().toISOString()
      );
      return sendJson(res, 201, { id });
    }

    const matMatch = pathname.match(/^\/api\/materials\/([a-zA-Z0-9_-]+)\/(download|file|rated|rate)$/);
    if (matMatch) {
      const [, matId, action] = matMatch;
      const user = getSessionUser(req);
      if (!user) return sendJson(res, 401, { error: '请先登录' });

      if (action === 'rated' && req.method === 'GET') {
        const r = db.prepare('SELECT 1 FROM ratings WHERE material_id = ? AND user_id = ?').get(matId, user._id);
        return sendJson(res, 200, { rated: Boolean(r) });
      }

      if (action === 'rate' && req.method === 'POST') {
        if (!verifySameOrigin(req)) return sendJson(res, 403, { error: 'Invalid origin' });
        const body = await readJsonBody(req);
        const val = Number(body.rating);
        if (!Number.isInteger(val) || val < 1 || val > 5) {
          return sendJson(res, 400, { error: '评分需为 1-5 的整数' });
        }
        const exists = db.prepare('SELECT id FROM study_materials WHERE id = ?').get(matId);
        if (!exists) return sendJson(res, 404, { error: '资料不存在' });
        db.exec('BEGIN');
        try {
          db.prepare('INSERT INTO ratings (material_id, user_id, student_id, rating, created_at) VALUES (?, ?, ?, ?, ?)')
            .run(matId, user._id, user.studentId || user.username || null, val, new Date().toISOString());
          const agg = db.prepare('SELECT AVG(rating) AS avg_r, COUNT(*) AS cnt FROM ratings WHERE material_id = ?').get(matId);
          db.prepare('UPDATE study_materials SET rating = ?, rating_count = ? WHERE id = ?')
            .run(Number(agg.avg_r || 0), Number(agg.cnt || 0), matId);
          db.exec('COMMIT');
          return sendJson(res, 200, { ok: true, rating: Number(agg.avg_r || 0), ratingCount: Number(agg.cnt || 0) });
        } catch (e) {
          db.exec('ROLLBACK');
          if (String(e.message).includes('UNIQUE')) {
            return sendJson(res, 409, { error: '您已经评过分啦' });
          }
          throw e;
        }
      }

      if (action === 'download' && req.method === 'POST') {
        if (!verifySameOrigin(req)) return sendJson(res, 403, { error: 'Invalid origin' });
        const mat = db.prepare('SELECT * FROM study_materials WHERE id = ?').get(matId);
        if (!mat) return sendJson(res, 404, { error: '资料不存在' });
        db.prepare('UPDATE study_materials SET download_count = download_count + 1 WHERE id = ?').run(matId);
        return sendJson(res, 200, { downloadUrl: `/api/materials/${encodeURIComponent(matId)}/file` });
      }

      if (action === 'file' && (req.method === 'GET' || req.method === 'HEAD')) {
        const mat = db.prepare('SELECT * FROM study_materials WHERE id = ?').get(matId);
        if (!mat) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        return await serveStaticFile(
          req,
          res,
          path.join(UPLOADS_DIR, 'materials'),
          mat.file_rel_path,
          'private, no-store',
          mat.file_name
        );
      }
    }

    // --- Feedback ---
    if (pathname === '/api/feedback' && req.method === 'POST') {
      if (!verifySameOrigin(req)) return sendJson(res, 403, { error: 'Invalid origin' });
      const ip = getClientIp(req);
      if (!checkRateLimit(`fb:${ip}`, 5, 10 * 60 * 1000)) {
        return sendJson(res, 429, { error: '提交过于频繁，请稍后再试' });
      }
      const body = await readJsonBody(req);
      const content = String(body.content || '').trim().slice(0, 2000);
      const contact = String(body.contact || '').trim().slice(0, 120);
      if (!content) return sendJson(res, 400, { error: '反馈内容不能为空' });
      const user = getSessionUser(req);
      const id = crypto.randomUUID().replace(/-/g, '');
      db.prepare(`
        INSERT INTO feedback (id, content, contact, user_agent, user_id, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, content, contact, String(req.headers['user-agent'] || '').slice(0, 300), user?._id || null, new Date().toISOString());
      return sendJson(res, 201, { ok: true, id });
    }

    // --- Static Images (/uploads/images/...) ---
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

    // --- Block sensitive directories ---
    if (
      pathname.startsWith('/server') ||
      pathname.startsWith('/data') ||
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
      sendJson(res, status, { error: status === 413 ? '上传文件超过 20MB 限制' : '服务器内部错误' });
    } else {
      res.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`JOU Campus Guide server listening on http://${HOST}:${PORT}`);
});
