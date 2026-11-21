import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGuideServer } from '../server/index.mjs';
import {
  escapeHtml,
  formatInlineRichText,
  highlightMatch,
  safeUrl,
  resolveRouteFromPathname
} from '../js/templates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('index.html has zero external blocking CDNs, no legacy watermark/auth, and keeps health-check keyword', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /江苏海洋大学/);
  for (const banned of [
    'cdn.tailwindcss.com',
    'unpkg.com',
    'rsms.me',
    'placehold.co',
    '江海大移动',
    'sso-login-btn'
  ]) {
    assert.equal(html.includes(banned), false, `index.html must not contain ${banned}`);
  }
});

test('versioned guide.json and campus.json are typo-free, complete, and all local image assets exist', () => {
  const guide = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/guide.json'), 'utf8'));
  const campus = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/campus.json'), 'utf8'));

  const keys = guide.map((c) => c.key);
  assert.deepEqual(keys, ['home', 'preparation', 'campusLife', 'academics', 'digitalCampus', 'support']);

  const rawCombo = JSON.stringify(guide) + JSON.stringify(campus);
  for (const stale of ['待开发', '待补充', '"未知"', '马可夫洛夫', '海洋食品与生物工程学"', '水生动物和医学', '网络空间与安全']) {
    assert.equal(rawCombo.includes(stale), false, `must not contain legacy typo or placeholder: ${stale}`);
  }
  assert.match(rawCombo, /马卡洛夫海洋工程学院/);
  assert.match(rawCombo, /海洋食品与生物工程学院/);
  assert.match(rawCombo, /应用技术学院/);

  assert.equal(campus.campuses.length, 3);
  assert.ok(campus.canteens.length >= 10);
  assert.ok(campus.dormitories.length >= 5);
  assert.ok(campus.colleges.some((c) => c.campusId === 'songtiao'), 'songtiao colleges must exist');
  assert.ok(
    campus.colleges.some((c) => c.college === '海洋工程学院' && c.campusId === 'cangwu'),
    'Marine Engineering must map to cangwu'
  );

  const imageDir = path.join(ROOT, 'data/uploads/images');
  if (fs.existsSync(imageDir)) {
    const urls = [];
    for (const c of campus.campuses) {
      if (c.image) urls.push(c.image);
    }
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

test('template helpers escape untrusted HTML, highlight safely, and normalize legacy hash URLs', () => {
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(
    formatInlineRichText('账号 `学号@cmcc` **身份证后8位** <script>'),
    '账号 <code>学号@cmcc</code> <strong>身份证后8位</strong> &lt;script&gt;'
  );
  assert.equal(highlightMatch('计算机科学与技术 <script>', '计算机'), '<mark>计算机</mark>科学与技术 &lt;script&gt;');
  assert.equal(safeUrl('javascript:alert(1)'), '/');
  assert.equal(safeUrl('//evil.example/x'), '/');
  assert.equal(safeUrl('#/preparation/campusQuery'), '/preparation/campusQuery');
  assert.equal(safeUrl('https://app.jianghaidai.com/'), 'https://app.jianghaidai.com/');

  const guide = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/guide.json'), 'utf8'));
  const campus = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/campus.json'), 'utf8'));
  assert.equal(resolveRouteFromPathname('/', guide, campus).isPortal, true);
  assert.equal(resolveRouteFromPathname('/preparation/arrivalAndMap', guide, campus).valid, true);
  assert.equal(resolveRouteFromPathname('/campusLife/dormitory/cangwu_a_dorm', guide, campus).valid, true);
  assert.equal(resolveRouteFromPathname('/nonexistent/route', guide, campus).valid, false);
});

test('server serves SSR clean routes, dynamic OG tags, sitemap, community feed, ETag API, and security rules', async (t) => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      topic_list: {
        topics: [
          { id: 88, title: '海大选课经验分享 <script>', slug: 'jou-course-guide', posts_count: 15, views: 320 }
        ]
      }
    })
  });
  const server = createGuideServer({ fetchImpl: mockFetch });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  // 1. Health & Legacy redirects
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const dl = await fetch(`${base}/download`, { redirect: 'manual' });
  assert.equal(dl.status, 301);
  assert.equal(dl.headers.get('location'), 'https://app.jianghaidai.com/');

  const legacyHome = await fetch(`${base}/home/home`, { redirect: 'manual' });
  assert.equal(legacyHome.status, 301);
  assert.equal(legacyHome.headers.get('location'), '/');

  // 2. SSR Portal & Clean Inner Routes
  const portalRes = await fetch(`${base}/`);
  assert.equal(portalRes.status, 200);
  const portalHtml = await portalRes.text();
  assert.match(portalHtml, /data-view="portal"/);
  assert.match(portalHtml, /海大生活与求学，一页通透查清/);

  const dormRes = await fetch(`${base}/campusLife/dormitory/cangwu_d_dorm`);
  assert.equal(dormRes.status, 200);
  const dormHtml = await dormRes.text();
  assert.match(dormHtml, /data-view="reader"/);
  assert.match(dormHtml, /D区宿舍（东区公寓）（苍梧校区）实拍与详情/);
  assert.match(dormHtml, /property="og:image" content="https:\/\/jianghaidai\.com\/uploads\/images\//);

  const notFound = await fetch(`${base}/unknown-section/nope`);
  assert.equal(notFound.status, 404);
  assert.match(await notFound.text(), /HTTP 404/);

  // 3. Sitemap & Community Feed
  const sitemap = await fetch(`${base}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
  const xml = await sitemap.text();
  assert.match(xml, /\/preparation\/arrivalAndMap<\/loc>/);
  assert.match(xml, /\/campusLife\/dormitory\/cangwu_a_dorm<\/loc>/);

  const feed = await fetch(`${base}/api/community-feed`);
  assert.equal(feed.status, 200);
  const feedJson = await feed.json();
  assert.equal(feedJson.ok, true);
  assert.equal(feedJson.topics[0].title, '海大选课经验分享');

  // 4. ETag & Security checks
  const g1 = await fetch(`${base}/api/guide`);
  assert.equal(g1.status, 200);
  const etag = g1.headers.get('etag');
  assert.ok(etag);
  const g304 = await fetch(`${base}/api/guide`, { headers: { 'If-None-Match': etag } });
  assert.equal(g304.status, 304);

  assert.equal((await fetch(`${base}/server/index.mjs`)).status, 404);
  assert.equal((await fetch(`${base}/content/guide.json`)).status, 404);

  const badOrigin = await fetch(`${base}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ content: 'test' })
  });
  assert.equal(badOrigin.status, 403);
});
