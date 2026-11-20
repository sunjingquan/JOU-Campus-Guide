import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGuideServer } from '../server/index.mjs';
import { escapeHtml, formatInlineRichText, safeUrl } from '../js/templates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('index.html has zero external blocking CDNs, no legacy watermark/auth, and keeps health-check keyword', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /江苏海洋大学/);
  for (const banned of ['cdn.tailwindcss.com', 'unpkg.com', 'rsms.me', 'placehold.co', '江海大移动', 'sso-login-btn']) {
    assert.equal(html.includes(banned), false, `index.html must not contain ${banned}`);
  }
});

test('versioned guide.json and campus.json are complete, clean, and all local image assets exist', () => {
  const guide = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/guide.json'), 'utf8'));
  const campus = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/campus.json'), 'utf8'));

  const keys = guide.map((c) => c.key);
  assert.deepEqual(keys, ['home', 'preparation', 'campusLife', 'academics', 'digitalCampus', 'support']);
  assert.equal(JSON.stringify(guide).includes('待开发'), false, 'no placeholder 待开发 text remains');

  assert.equal(campus.campuses.length, 3);
  assert.ok(campus.canteens.length >= 10);
  assert.ok(campus.dormitories.length >= 5);
  assert.ok(campus.colleges.length >= 17);

  const imageDir = path.join(ROOT, 'data/uploads/images');
  if (fs.existsSync(imageDir)) {
    const urls = [];
    for (const item of [...campus.canteens, ...campus.dormitories]) {
      if (item.image) urls.push(item.image);
      for (const d of item.details || []) {
        for (const img of d.images || []) {
          if (img.src) urls.push(img.src);
        }
      }
    }
    for (const u of urls) {
      assert.ok(u.startsWith('/uploads/images/'), `unexpected image URL: ${u}`);
      const rel = decodeURIComponent(u.slice('/uploads/images/'.length));
      assert.equal(fs.existsSync(path.join(imageDir, rel)), true, `missing image file: ${rel}`);
    }
  }
});

test('template helpers escape untrusted HTML and block unsafe URLs', () => {
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(
    formatInlineRichText('账号 `学号@cmcc` **身份证后8位** <script>'),
    '账号 <code>学号@cmcc</code> <strong>身份证后8位</strong> &lt;script&gt;'
  );
  assert.equal(safeUrl('javascript:alert(1)'), '#/home/home');
  assert.equal(safeUrl('https://app.jianghaidai.com/'), 'https://app.jianghaidai.com/');
});

test('server endpoints serve health, ETag-cached content, 301 /download, feedback validation, and block internal paths', async (t) => {
  const server = createGuideServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const dl = await fetch(`${base}/download`, { redirect: 'manual' });
  assert.equal(dl.status, 301);
  assert.equal(dl.headers.get('location'), 'https://app.jianghaidai.com/');

  const g1 = await fetch(`${base}/api/guide`);
  assert.equal(g1.status, 200);
  const etag = g1.headers.get('etag');
  assert.ok(etag);
  const gJson = await g1.json();
  assert.equal(gJson.data.length, 6);

  const g304 = await fetch(`${base}/api/guide`, { headers: { 'If-None-Match': etag } });
  assert.equal(g304.status, 304);

  const blocked = await fetch(`${base}/server/index.mjs`);
  assert.equal(blocked.status, 404);
  const blockedContent = await fetch(`${base}/content/guide.json`);
  assert.equal(blockedContent.status, 404);

  const badOrigin = await fetch(`${base}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ content: 'test' })
  });
  assert.equal(badOrigin.status, 403);

  const emptyFb = await fetch(`${base}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ content: '   ' })
  });
  assert.equal(emptyFb.status, 400);
});
