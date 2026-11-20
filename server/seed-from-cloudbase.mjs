import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.JHD_GUIDE_DATA_DIR || path.join(PROJECT_ROOT, 'data');
const EXPORT_DIR = process.argv[2] || path.resolve(PROJECT_ROOT, '..', 'ops', 'backups', 'cloudbase-export');

const DB_PATH = path.join(DATA_DIR, 'guide.sqlite');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(path.join(UPLOADS_DIR, 'images'), { recursive: true });
fs.mkdirSync(path.join(UPLOADS_DIR, 'materials'), { recursive: true });

function encodeSegments(relPath) {
  return relPath
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function rewriteCloudUrl(value) {
  if (typeof value !== 'string') return value;
  const bucketPrefix = 'cloud://jou-campus-guide-9f57jf08ece0812.6a6f-jou-campus-guide-9f57jf08ece0812-1367578274/';
  if (value.startsWith(bucketPrefix)) {
    const rel = value.slice(bucketPrefix.length);
    return `/uploads/${encodeSegments(rel)}`;
  }
  if (value.includes('6a6f-jou-campus-guide-9f57jf08ece0812-1367578274.tcb.qcloud.la/')) {
    try {
      const u = new URL(value);
      const decodedRel = decodeURIComponent(u.pathname.replace(/^\//, ''));
      return `/uploads/${encodeSegments(decodedRel)}`;
    } catch {
      return value;
    }
  }
  return value;
}

function deepRewrite(node) {
  if (typeof node === 'string') return rewriteCloudUrl(node);
  if (Array.isArray(node)) return node.map(deepRewrite);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = deepRewrite(v);
    }
    return out;
  }
  return node;
}

function initSchema(db) {
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
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyDirRecursive(s, d);
    } else if (entry.isFile() && !entry.name.startsWith('.')) {
      fs.copyFileSync(s, d);
      count += 1;
    }
  }
  return count;
}

const db = new DatabaseSync(DB_PATH);
initSchema(db);

const collectionsDir = path.join(EXPORT_DIR, 'collections');
const guideRaw = JSON.parse(fs.readFileSync(path.join(collectionsDir, 'guide_data.json'), 'utf8'));
const campusRaw = JSON.parse(fs.readFileSync(path.join(collectionsDir, 'campus_data.json'), 'utf8'));
const feedbackPath = path.join(collectionsDir, 'feedback.json');
const feedbackRaw = fs.existsSync(feedbackPath) ? JSON.parse(fs.readFileSync(feedbackPath, 'utf8')) : [];

// 1. Clean & import guide_data (exclude xsscanary7f3 / untrusted _openid probes)
const cleanGuide = guideRaw
  .filter((doc) => doc.key !== 'xsscanary7f3' && !String(doc.title || '').includes('__sideXss'))
  .map(deepRewrite);

db.exec('DELETE FROM guide_categories;');
const insertGuide = db.prepare(`
  INSERT INTO guide_categories (id, key, title, icon, area, is_home_page, sort_order, pages_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const g of cleanGuide) {
  insertGuide.run(
    String(g._id),
    String(g.key),
    String(g.title),
    String(g.icon || 'book'),
    String(g.area || 'official'),
    g.isHomePage ? 1 : 0,
    Number(g.order ?? 0),
    JSON.stringify(Array.isArray(g.pages) ? g.pages : [])
  );
}

// 2. Clean & import campus_data (select authoritative doc with non-empty colleges)
const mainCampusDoc = campusRaw.find((d) => Array.isArray(d.colleges) && d.colleges.length > 0 && !d._openid);
if (!mainCampusDoc) {
  throw new Error('Could not find authoritative campus_data document!');
}
const cleanCampus = deepRewrite({
  _id: mainCampusDoc._id,
  campuses: mainCampusDoc.campuses || [],
  canteens: mainCampusDoc.canteens || [],
  colleges: mainCampusDoc.colleges || [],
  dormitories: mainCampusDoc.dormitories || []
});
db.prepare(`
  INSERT INTO campus_singleton (id, data_json, updated_at)
  VALUES (1, ?, ?)
  ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
`).run(JSON.stringify(cleanCampus), new Date().toISOString());

// 3. Import legitimate historical feedback
const insertFeedback = db.prepare(`
  INSERT OR IGNORE INTO feedback (id, content, contact, user_agent, user_id, submitted_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);
for (const fb of feedbackRaw) {
  if (!fb.content || String(fb.content).includes('XSSCANARY') || fb.SECURITYTEST) continue;
  const ts = typeof fb.submittedAt === 'string'
    ? fb.submittedAt
    : (fb.submittedAt?.$date ? new Date(fb.submittedAt.$date).toISOString() : new Date().toISOString());
  insertFeedback.run(
    String(fb._id),
    String(fb.content),
    String(fb.contact || ''),
    String(fb.userAgent || ''),
    fb._openid ? String(fb._openid) : null,
    ts
  );
}

// 4. Copy static images from export
const copiedImages = copyDirRecursive(
  path.join(EXPORT_DIR, 'files', 'images'),
  path.join(UPLOADS_DIR, 'images')
);

console.log(`Seed complete: ${cleanGuide.length} guide categories, 1 campus dataset, ${copiedImages} image files copied to ${UPLOADS_DIR}/images.`);
