/**
 * @file 江苏海洋大学校园指南 · 同构安全模板与路由解析引擎
 * @description 同时供 Node 服务端直出（SSR）与浏览器端单页秒切（SPA）复用，零外部依赖，全量转义防 XSS。
 */

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[ch]);
}

export function safeUrl(value) {
  const str = String(value || '').trim();
  if (!str) return '/';
  if (str.startsWith('#/')) {
    const clean = str.slice(1);
    return clean === '/home/home' ? '/' : escapeHtml(clean);
  }
  if (
    (str.startsWith('/') && !str.startsWith('//')) ||
    str.startsWith('https://') ||
    str.startsWith('http://')
  ) {
    return escapeHtml(str);
  }
  return '/';
}

export function safeIcon(name) {
  const clean = String(name || 'compass').replace(/[^a-z0-9-]/gi, '');
  return clean || 'compass';
}

export function formatInlineRichText(raw) {
  const escaped = escapeHtml(raw);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br />');
}

export function highlightMatch(text, query) {
  const raw = String(text || '');
  const q = String(query || '').trim();
  if (!q) return escapeHtml(raw);
  const tokens = q
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!tokens.length) return escapeHtml(raw);
  const regex = new RegExp(`(${tokens.join('|')})`, 'gi');
  const parts = raw.split(regex);
  return parts
    .map((part, idx) => (idx % 2 === 1 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)))
    .join('');
}

export const FALLBACK_IMG_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23e8f1fb'/%3E%3Cstop offset='1' stop-color='%23e5f6f3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='500' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2352657a' font-family='sans-serif' font-size='22'%3E%E6%B5%B7%E5%A4%A7%E6%A0%A1%E5%9B%AD%E5%AE%9E%E6%99%AF%3C/text%3E%3C/svg%3E";

export function toRouteHref(categoryKey, pageKey, detailId = null) {
  if (!categoryKey || categoryKey === 'home') return '/';
  const base = `/${encodeURIComponent(categoryKey)}/${encodeURIComponent(pageKey)}`;
  return detailId ? `${base}/${encodeURIComponent(detailId)}` : base;
}

export function buildFlatChapters(guideData) {
  const flat = [];
  for (const cat of guideData || []) {
    if (cat.isHomePage) continue;
    for (const page of cat.pages || []) {
      flat.push({
        categoryKey: cat.key,
        categoryTitle: cat.title,
        pageKey: page.pageKey,
        title: page.title
      });
    }
  }
  return flat;
}

/**
 * 解析 URL pathname 并校验是否为合法指南路由（供 Node SSR 与浏览器 Router 共用）
 */
export function resolveRouteFromPathname(pathname, guideData = [], campusData = {}) {
  const cleanPath = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (cleanPath === '/' || cleanPath === '/home' || cleanPath === '/home/home') {
    const homeCat = guideData.find((c) => c.isHomePage) || guideData[0];
    const homePage = homeCat?.pages?.[0];
    return {
      valid: true,
      isPortal: true,
      categoryKey: 'home',
      pageKey: 'home',
      detailId: null,
      category: homeCat,
      page: homePage,
      canonicalPath: '/'
    };
  }

  const parts = cleanPath
    .replace(/^\//, '')
    .split('/')
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });

  // 三级详情：/campusLife/dormitory/:id 或 /campusLife/canteen/:id
  if (parts.length === 3 && parts[0] === 'campusLife' && ['canteen', 'dormitory'].includes(parts[1])) {
    const listKey = parts[1] === 'dormitory' ? 'dormitories' : 'canteens';
    const item = (campusData[listKey] || []).find((x) => x.id === parts[2]);
    if (item) {
      const cat = guideData.find((c) => c.key === 'campusLife');
      const page = cat?.pages?.find((p) => p.pageKey === parts[1]);
      return {
        valid: true,
        isPortal: false,
        categoryKey: 'campusLife',
        pageKey: parts[1],
        detailId: item.id,
        category: cat,
        page,
        detailItem: item,
        canonicalPath: toRouteHref('campusLife', parts[1], item.id)
      };
    }
    return { valid: false, isPortal: false, canonicalPath: cleanPath };
  }

  // 二级章节：/:categoryKey/:pageKey
  if (parts.length === 2) {
    const cat = guideData.find((c) => c.key === parts[0] && !c.isHomePage);
    const page = cat?.pages?.find((p) => p.pageKey === parts[1]);
    if (cat && page) {
      return {
        valid: true,
        isPortal: false,
        categoryKey: cat.key,
        pageKey: page.pageKey,
        detailId: null,
        category: cat,
        page,
        canonicalPath: toRouteHref(cat.key, page.pageKey)
      };
    }
  }

  // 一级分类简写：/:categoryKey -> 首章
  if (parts.length === 1) {
    const cat = guideData.find((c) => c.key === parts[0] && !c.isHomePage);
    const firstPage = cat?.pages?.[0];
    if (cat && firstPage) {
      return {
        valid: true,
        isPortal: false,
        categoryKey: cat.key,
        pageKey: firstPage.pageKey,
        detailId: null,
        category: cat,
        page: firstPage,
        canonicalPath: toRouteHref(cat.key, firstPage.pageKey)
      };
    }
  }

  return { valid: false, isPortal: false, canonicalPath: cleanPath };
}

export function renderSidebarNavHtml(guideData, activeNavKey, selectedCampus, campuses = []) {
  const campusObj = campuses.find((c) => c.id === selectedCampus);
  const shortCampus = (campusObj?.shortName || campusObj?.name || '苍梧').replace('校区', '');

  const parts = [];
  parts.push(`
    <a href="/" data-link class="nav-item nav-item-home ${activeNavKey === 'home/home' ? 'is-active' : ''}" data-nav-key="home/home">
      <span class="nav-item-left">
        <svg><use href="#i-compass"/></svg>
        <span>门户总览</span>
      </span>
      <span class="nav-home-pill">首页</span>
    </a>
  `);

  for (const cat of guideData || []) {
    if (cat.isHomePage) continue;
    const linksHtml = (cat.pages || [])
      .map((page) => {
        const navKey = `${cat.key}/${page.pageKey}`;
        const href = toRouteHref(cat.key, page.pageKey);
        const isActive = activeNavKey === navKey;
        return `
          <a href="${escapeHtml(href)}" data-link class="nav-item ${isActive ? 'is-active' : ''}" data-nav-key="${escapeHtml(navKey)}">
            <span>${escapeHtml(page.title)}</span>
            ${page.isCampusSpecific ? `<span class="nav-campus-tag">${escapeHtml(shortCampus)}</span>` : ''}
          </a>
        `;
      })
      .join('');

    parts.push(`
      <div class="nav-group">
        <div class="nav-group-label">
          <svg><use href="#i-${safeIcon(cat.icon)}"/></svg>
          <span>${escapeHtml(cat.title)}</span>
        </div>
        ${linksHtml}
      </div>
    `);
  }

  return parts.join('');
}

export function renderRightTocHtml(tocItems = []) {
  if (!tocItems.length) {
    return `
      <div class="toc-card">
        <span class="toc-kicker">Quick Actions</span>
        <p class="toc-empty">本页为交互工具视图，可直接检索或筛选下方卡片。</p>
        <div class="toc-actions">
          <button type="button" class="toc-action-btn" data-open-feedback>
            <svg><use href="#i-message"/></svg>
            <span>提交本页勘误</span>
          </button>
          <a class="toc-action-btn" href="https://bbs.jianghaidai.com/" target="_blank" rel="noopener">
            <svg><use href="#i-message-circle"/></svg>
            <span>去社区讨论</span>
          </a>
        </div>
      </div>
    `;
  }

  return `
    <div class="toc-card">
      <span class="toc-kicker">本页大纲</span>
      <ul class="toc-list" id="toc-list">
        ${tocItems
          .map(
            (item, idx) => `
          <li>
            <a href="#${escapeHtml(item.id)}" data-toc-target="${escapeHtml(item.id)}" class="${idx === 0 ? 'is-active' : ''}">
              ${escapeHtml(item.label)}
            </a>
          </li>
        `
          )
          .join('')}
      </ul>
      <div class="toc-actions">
        <button type="button" class="toc-action-btn" data-scroll-top>
          <svg><use href="#i-arrow-up"/></svg>
          <span>回到顶部</span>
        </button>
        <button type="button" class="toc-action-btn" data-open-feedback>
          <svg><use href="#i-message"/></svg>
          <span>本页勘误</span>
        </button>
      </div>
    </div>
  `;
}

export function renderCampusSegments(campuses, selectedCampus) {
  return `
    <div class="segmented-campuses" role="group" aria-label="切换关注校区">
      ${(campuses || [])
        .map(
          (c) => `
        <button type="button" data-switch-campus="${escapeHtml(c.id)}" class="${
            c.id === selectedCampus ? 'is-active' : ''
          }">
          <span>${escapeHtml(c.name)}</span>
        </button>
      `
        )
        .join('')}
    </div>
  `;
}

export function renderArticleHeader({
  categoryTitle,
  categoryRoute,
  pageTitle,
  subtitle,
  detailParent,
  metaBadge
}) {
  const parentCrumb = detailParent
    ? `<svg><use href="#i-chevron-right"/></svg><a href="${safeUrl(detailParent.route)}" data-link>${escapeHtml(detailParent.title)}</a>`
    : '';
  return `
    <header class="article-header">
      <div class="article-topbar">
        <nav class="breadcrumbs" aria-label="面包屑导航">
          <a href="/" data-link>门户总览</a>
          <svg><use href="#i-chevron-right"/></svg>
          <a href="${safeUrl(categoryRoute)}" data-link>${escapeHtml(categoryTitle)}</a>
          ${parentCrumb}
          <svg><use href="#i-chevron-right"/></svg>
          <span aria-current="page">${escapeHtml(pageTitle)}</span>
        </nav>
        <div class="article-tools">
          ${metaBadge ? `<span class="meta-chip">${escapeHtml(metaBadge)}</span>` : ''}
          <button type="button" class="tool-chip" data-copy-link>
            <svg><use href="#i-share"/></svg>
            <span>分享链接</span>
          </button>
          <button type="button" class="tool-chip" data-open-feedback>
            <svg><use href="#i-message"/></svg>
            <span>本页勘误</span>
          </button>
        </div>
      </div>
      <h1>${escapeHtml(pageTitle)}</h1>
      ${subtitle ? `<p class="article-subtitle">${escapeHtml(subtitle)}</p>` : ''}
    </header>
  `;
}

export function renderChapterPager(prev, next) {
  if (!prev && !next) return '';
  return `
    <nav class="chapter-pager" aria-label="上下章节切换">
      ${
        prev
          ? `<a class="pager-card" href="${escapeHtml(toRouteHref(prev.categoryKey, prev.pageKey))}" data-link>
              <small>← 上一章 · ${escapeHtml(prev.categoryTitle)}</small>
              <strong>${escapeHtml(prev.title)}</strong>
            </a>`
          : '<div></div>'
      }
      ${
        next
          ? `<a class="pager-card is-next" href="${escapeHtml(toRouteHref(next.categoryKey, next.pageKey))}" data-link>
              <small>下一章 · ${escapeHtml(next.categoryTitle)} →</small>
              <strong>${escapeHtml(next.title)}</strong>
            </a>`
          : '<div></div>'
      }
    </nav>
  `;
}

export const DEFAULT_COMMUNITY_TOPICS = [
  {
    id: 1,
    title: '新生报到与大一选课高频疑问集中答疑帖（欢迎学弟学妹提问）',
    category: '迎新互助',
    postsCount: 42,
    views: 1680,
    url: 'https://bbs.jianghaidai.com/'
  },
  {
    id: 2,
    title: '苍梧 / 通灌 / 宋跳三校区食堂红黑榜与宝藏窗口长期连载',
    category: '校园生活',
    postsCount: 68,
    views: 2450,
    url: 'https://bbs.jianghaidai.com/'
  },
  {
    id: 3,
    title: '体育俱乐部选什么不踩雷？羽毛球/乒乓球/网球等修读体验汇总',
    category: '课程评价',
    postsCount: 35,
    views: 1890,
    url: 'https://bbs.jianghaidai.com/'
  },
  {
    id: 4,
    title: '大一春季转专业笔面试复盘与各学院接收门槛经验整理',
    category: '学习科研',
    postsCount: 29,
    views: 2120,
    url: 'https://bbs.jianghaidai.com/'
  }
];

export function renderCommunityTopicRows(topics = []) {
  const list = topics.length ? topics.slice(0, 5) : DEFAULT_COMMUNITY_TOPICS;
  return list
    .map(
      (t) => `
    <a class="pulse-topic-row" href="${safeUrl(t.url)}" target="_blank" rel="noopener">
      <div class="pulse-topic-main">
        ${t.category ? `<span class="pulse-cat-tag">${escapeHtml(t.category)}</span>` : ''}
        <strong>${escapeHtml(t.title)}</strong>
      </div>
      <div class="pulse-topic-meta">
        <span>${Number(t.postsCount || 1)} 回复</span>
        ${t.views ? `<span>· ${Number(t.views)} 浏览</span>` : ''}
        <svg><use href="#i-external"/></svg>
      </div>
    </a>
  `
    )
    .join('');
}

/* ── 全宽生态门户首页（/） ───────────────────────────────────── */
export function renderPortalHomeView({
  page,
  guideData = [],
  campusData = {},
  selectedCampus = 'cangwu',
  checklistStats = { done: 0, total: 26 },
  communityTopics = []
}) {
  const sc = page?.structuredContent || {};
  const hero = sc.hero || {};
  const quickTools = sc.quickTools || [];
  const campuses = campusData.campuses || [];
  const canteens = campusData.canteens || [];
  const dorms = campusData.dormitories || [];
  const colleges = campusData.colleges || [];

  return `
    <section class="portal-hero">
      <div class="portal-hero-glow portal-glow-a" aria-hidden="true"></div>
      <div class="portal-hero-glow portal-glow-b" aria-hidden="true"></div>

      <div class="portal-hero-grid">
        <div class="portal-hero-copy">
          <span class="portal-eyebrow">
            <span class="eyebrow-dot"></span>
            <span>${escapeHtml(hero.badge || '江苏海洋大学 · 酱海带数字门户')}</span>
          </span>
          <h1>${escapeHtml(hero.title || '海大生活与求学，一页通透查清。')}</h1>
          <p class="portal-lead">${escapeHtml(hero.subtitle || '')}</p>

          <button type="button" class="portal-spotlight-bar" data-open-search aria-label="打开全站智能检索">
            <svg class="spotlight-icon"><use href="#i-search"/></svg>
            <span class="spotlight-placeholder">搜专业所属校区、上床下桌宿舍、食堂窗口、宽带后缀...</span>
            <span class="spotlight-keys"><kbd>⌘K</kbd><kbd>/</kbd></span>
          </button>

          <div class="portal-hot-chips" aria-label="热门速查词">
            <span>常搜：</span>
            <a href="/preparation/campusQuery?q=%E8%AE%A1%E7%AE%97%E6%9C%BA" data-link>计算机校区</a>
            <a href="/preparation/campusQuery?q=%E5%BB%BA%E7%AD%91%E5%AD%A6" data-link>建筑学分流</a>
            <a href="/preparation/campusQuery?q=%E5%BA%94%E7%94%A8%E6%8A%80%E6%9C%AF" data-link>应用技术学院</a>
            <a href="/preparation/arrivalAndMap" data-link>连云港站乘车</a>
            <a href="/digitalCampus/internetAndElectricity" data-link>宽带拨号生成</a>
          </div>
        </div>

        <aside class="portal-hero-panel" aria-label="当前校区偏好与快捷入口">
          <div class="hero-panel-head">
            <div>
              <small>当前偏好校区</small>
              <strong>实时联动食宿与路线推荐</strong>
            </div>
            <svg><use href="#i-map-pin"/></svg>
          </div>
          ${renderCampusSegments(campuses, selectedCampus)}
          <div class="hero-panel-stats">
            <div>
              <b>3</b>
              <span>覆盖校区</span>
            </div>
            <div>
              <b>${colleges.length}</b>
              <span>院系分流组</span>
            </div>
            <div>
              <b>${dorms.length + canteens.length}</b>
              <span>食宿实拍专题</span>
            </div>
          </div>
          <div class="hero-panel-actions">
            <a class="btn btn-primary" href="${safeUrl(hero.primaryAction?.route || '/preparation/campusQuery')}" data-link>
              <svg><use href="#i-map-pin"/></svg>
              <span>${escapeHtml(hero.primaryAction?.label || '查询所在校区')}</span>
            </a>
            <a class="btn btn-secondary" href="${safeUrl(hero.secondaryAction?.route || '/preparation/checklist')}" data-link>
              <svg><use href="#i-check-square"/></svg>
              <span>${escapeHtml(hero.secondaryAction?.label || '核对必备清单')}</span>
            </a>
          </div>
        </aside>
      </div>
    </section>

    <section class="portal-section" aria-labelledby="bento-tools-heading">
      <div class="portal-section-head">
        <div>
          <span class="section-kicker">Interactive Utilities</span>
          <h2 id="bento-tools-heading">高频实用工具箱</h2>
        </div>
        <p>无需翻找冗长文档，直接交互查询或勾选保存</p>
      </div>

      <div class="portal-bento-grid">
        ${quickTools
          .map((item) => {
            const extraPill = item.isChecklistCard
              ? `<span class="bento-live-pill" data-home-checklist-pill>已备 ${checklistStats.done}/${checklistStats.total}</span>`
              : item.tag
                ? `<span class="quick-tag">${escapeHtml(item.tag)}</span>`
                : '';
            return `
            <a class="bento-tool-card ${item.featured ? 'is-featured' : ''}" href="${safeUrl(item.route)}" data-link>
              <div class="bento-card-top">
                <span class="quick-icon"><svg><use href="#i-${safeIcon(item.icon)}"/></svg></span>
                ${extraPill}
              </div>
              <div class="bento-card-body">
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description)}</p>
              </div>
              <span class="bento-card-arrow">立即使用 <svg><use href="#i-arrow-right"/></svg></span>
            </a>
          `;
          })
          .join('')}
      </div>
    </section>

    <section class="portal-section" aria-labelledby="campuses-overview-heading">
      <div class="portal-section-head">
        <div>
          <span class="section-kicker">Three Campuses</span>
          <h2 id="campuses-overview-heading">苍梧 · 通灌 · 宋跳 三校区全景速览</h2>
        </div>
        <a class="section-more-link" href="/preparation/arrivalAndMap" data-link>
          查看完整高铁/公交乘车指南 <svg><use href="#i-arrow-right"/></svg>
        </a>
      </div>

      <div class="campus-showcase-grid">
        ${campuses
          .map((c) => {
            const dCount = dorms.filter((d) => d.campusId === c.id).length;
            const cCount = canteens.filter((ct) => ct.campusId === c.id).length;
            const isSelected = c.id === selectedCampus;
            return `
            <article class="campus-showcase-card ${isSelected ? 'is-selected' : ''}">
              <div class="campus-showcase-media">
                <img src="${safeUrl(c.image)}" alt="${escapeHtml(c.name)}实景" loading="lazy" data-fallback-img />
                <span class="campus-media-badge">${escapeHtml(c.badge || '')}</span>
                ${isSelected ? '<span class="campus-active-flag">当前偏好</span>' : ''}
              </div>
              <div class="campus-showcase-body">
                <div class="campus-title-row">
                  <h3>${escapeHtml(c.name)}</h3>
                  <small>${escapeHtml(c.address || '')}</small>
                </div>
                <p class="campus-pos-desc">${escapeHtml(c.positioning || '')}</p>
                <div class="campus-transit-pill">
                  <svg><use href="#i-navigation"/></svg>
                  <span>${escapeHtml(c.transitSummary || '')}</span>
                </div>
                <div class="campus-card-links">
                  <button type="button" class="btn btn-secondary btn-sm" data-apply-campus="${escapeHtml(c.id)}" data-goto="/campusLife/dormitory">
                    宿舍实拍 (${dCount})
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" data-apply-campus="${escapeHtml(c.id)}" data-goto="/campusLife/canteen">
                    食堂地图 (${cCount})
                  </button>
                  <a class="btn btn-ghost btn-sm" href="/preparation/arrivalAndMap" data-link>路线</a>
                </div>
              </div>
            </article>
          `;
          })
          .join('')}
      </div>
    </section>

    <section class="portal-section" aria-labelledby="ecosystem-pulse-heading">
      <div class="portal-section-head">
        <div>
          <span class="section-kicker">Jianghaidai Ecosystem</span>
          <h2 id="ecosystem-pulse-heading">社区实时热议 &amp; 客户端联动</h2>
        </div>
        <p>静态指南查干货 · 实时社区问学长 · 手机客户端管日常</p>
      </div>

      <div class="portal-pulse-grid">
        <div class="pulse-community-card">
          <div class="pulse-card-head">
            <div>
              <span class="live-indicator"><i></i>bbs.jianghaidai.com</span>
              <h3>校园社区最新讨论</h3>
            </div>
            <a class="btn btn-secondary btn-sm" href="https://bbs.jianghaidai.com/" target="_blank" rel="noopener">
              <span>去发帖提问</span>
              <svg><use href="#i-external"/></svg>
            </a>
          </div>
          <div class="pulse-topic-list" id="portal-community-list">
            ${renderCommunityTopicRows(communityTopics)}
          </div>
        </div>

        <div class="pulse-app-card">
          <div class="pulse-app-copy">
            <span class="app-version-pill">v0.9.5 官方客户端 · 零广告</span>
            <h3>酱海带校园助手</h3>
            <p>把周课表、实验课机房变更、锁屏常驻实况胶囊提醒、加权 GPA 统计与已下载 PDF 资料应用内直看装进手机，断网也能秒开。</p>
            <ul class="app-feature-checks">
              <li><svg><use href="#i-check"/></svg><span>安卓锁屏常驻实况课程通知 &amp; 4 格验证码秒登</span></li>
              <li><svg><use href="#i-check"/></svg><span>课程 PDF / 图片 / TXT 应用内直接缩放阅读</span></li>
              <li><svg><use href="#i-check"/></svg><span>支持 Android 直装与 iPhone / iPad TestFlight</span></li>
            </ul>
            <div class="pulse-app-actions">
              <a class="btn btn-light-solid" href="https://app.jianghaidai.com/" target="_blank" rel="noopener">
                <svg><use href="#i-download"/></svg>
                <span>前往下载与在线试玩</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="portal-section" aria-labelledby="handbook-index-heading">
      <div class="portal-section-head">
        <div>
          <span class="section-kicker">Full Handbook Index</span>
          <h2 id="handbook-index-heading">全站指南章节总目录</h2>
        </div>
        <p>涵盖从录取通知书拆封到毕业深造的完整知识地图</p>
      </div>

      <div class="directory-index-grid">
        ${guideData
          .filter((c) => !c.isHomePage)
          .map(
            (cat) => `
          <div class="directory-group-card">
            <div class="directory-group-head">
              <span class="directory-icon"><svg><use href="#i-${safeIcon(cat.icon)}"/></svg></span>
              <h3>${escapeHtml(cat.title)}</h3>
            </div>
            <ul class="directory-links">
              ${(cat.pages || [])
                .map(
                  (p) => `
                <li>
                  <a href="${escapeHtml(toRouteHref(cat.key, p.pageKey))}" data-link>
                    <span>${escapeHtml(p.title)}</span>
                    <svg><use href="#i-chevron-right"/></svg>
                  </a>
                </li>
              `
                )
                .join('')}
            </ul>
          </div>
        `
          )
          .join('')}
      </div>
    </section>
  `;
}

/* ── 交互工具 1：大一校区查询 ───────────────────────────────── */
export function renderCampusQueryView(colleges = []) {
  return `
    <div class="query-panel">
      <div class="query-search-box">
        <svg><use href="#i-search"/></svg>
        <input
          type="search"
          id="major-instant-input"
          placeholder="输入专业或学院关键词秒查（如：计算机、建筑学、船舶、会计、应用技术）..."
          autocomplete="off"
        />
      </div>

      <div class="query-filter-row">
        <div class="filter-pills" id="query-campus-pills" role="group" aria-label="按校区筛选学院">
          <button type="button" class="filter-pill is-active" data-query-campus="all">全部校区 (${colleges.length})</button>
          <button type="button" class="filter-pill" data-query-campus="cangwu">苍梧主校区</button>
          <button type="button" class="filter-pill" data-query-campus="tongguan">通灌校区（大一）</button>
          <button type="button" class="filter-pill" data-query-campus="songtiao">宋跳校区</button>
        </div>
        <select id="query-college-select" class="compact-select" aria-label="按学院下拉查看">
          <option value="">按学院快速定位...</option>
          ${colleges
            .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.college)}</option>`)
            .join('')}
        </select>
      </div>

      <div class="notice-callout subtle-callout">
        <svg><use href="#i-info"/></svg>
        <span><strong>同名专业区分提示：</strong>录取至「应用技术学院」的同学统一在<strong>宋跳校区</strong>报到；土木与港海工程学院中「建筑学」在<strong>苍梧校区</strong>，其余专业大一在<strong>通灌校区</strong>。最终请以当年录取通知书为准。</span>
      </div>

      <div class="query-result-stage" id="query-result-stage" aria-live="polite">
        <div class="query-matches">
          ${colleges
            .slice(0, 6)
            .map((col) => {
              const cLabel =
                col.campusId === 'cangwu' ? '苍梧校区' : col.campusId === 'tongguan' ? '通灌校区' : '宋跳校区';
              return `
              <div class="query-match-card" data-campus-tone="${escapeHtml(col.campusId)}">
                <div class="query-match-info">
                  <strong>${escapeHtml(col.college)}</strong>
                  <small>${escapeHtml((col.majors || []).join(' · '))}</small>
                  ${col.note ? `<span class="query-match-note">${escapeHtml(col.note)}</span>` : ''}
                </div>
                <div class="query-match-campus">
                  <span class="campus-badge-lg"><svg><use href="#i-map-pin"/></svg>${escapeHtml(cLabel)}</span>
                  <div class="query-card-btns">
                    <button type="button" class="btn btn-secondary btn-sm" data-apply-campus="${escapeHtml(col.campusId)}" data-goto="/campusLife/dormitory">看宿舍</button>
                    <button type="button" class="btn btn-secondary btn-sm" data-apply-campus="${escapeHtml(col.campusId)}" data-goto="/campusLife/canteen">看食堂</button>
                  </div>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    </div>
  `;
}

/* ── 交互工具 2：到校交通与三校区空间导览 ──────────────────── */
export function renderTransitMapView(content = {}, campuses = [], activeHub = 'lyg_station') {
  const hubs = content.hubs || [];
  const currentHub = hubs.find((h) => h.id === activeHub) || hubs[0] || { id: 'lyg_station', name: '连云港站' };

  return `
    ${
      content.notice
        ? `<div class="notice-callout"><svg><use href="#i-info"/></svg><span>${escapeHtml(content.notice)}</span></div>`
        : ''
    }

    <section id="sec-transit-hub" class="transit-hub-box">
      <div class="transit-box-head">
        <div>
          <span class="section-kicker">Step 1 · 选择你的抵达枢纽</span>
          <h2>从高铁站 / 机场怎么去三个校区？</h2>
        </div>
      </div>
      <div class="hub-tabs" role="tablist" aria-label="选择交通枢纽">
        ${hubs
          .map(
            (h) => `
          <button
            type="button"
            role="tab"
            aria-selected="${h.id === currentHub.id ? 'true' : 'false'}"
            class="hub-tab-btn ${h.id === currentHub.id ? 'is-active' : ''}"
            data-transit-hub="${escapeHtml(h.id)}"
          >
            <strong>${escapeHtml(h.name)}</strong>
            <span>${escapeHtml(h.badge || '')}</span>
          </button>
        `
          )
          .join('')}
      </div>
      <p class="hub-summary" id="transit-hub-desc">${escapeHtml(currentHub.desc || '')}</p>

      <div class="transit-routes-grid" id="transit-routes-grid">
        ${renderTransitRouteCards(campuses, currentHub.id)}
      </div>
    </section>

    <section id="sec-campus-landmarks" class="landmarks-section">
      <h2 class="sub-heading">三校区核心建筑与生活区方位速览</h2>
      <div class="landmarks-grid">
        ${campuses
          .map(
            (c) => `
          <article class="landmark-card">
            <div class="landmark-card-head">
              <div>
                <span class="quick-tag">${escapeHtml(c.badge || '')}</span>
                <h3>${escapeHtml(c.name)}</h3>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" data-apply-campus="${escapeHtml(c.id)}" data-goto="/campusLife/dormitory">看宿舍</button>
            </div>
            <p class="landmark-addr"><svg><use href="#i-map-pin"/></svg><span>${escapeHtml(c.address || '')}</span></p>
            <ul class="landmark-list">
              ${(c.landmarks || []).map((lm) => `<li>${escapeHtml(lm)}</li>`).join('')}
            </ul>
          </article>
        `
          )
          .join('')}
      </div>
    </section>

    ${
      Array.isArray(content.tips) && content.tips.length
        ? `
      <section id="sec-transit-tips" class="tips-box">
        <h3>新生抵连乘车防坑贴士</h3>
        <ul>
          ${content.tips.map((t) => `<li>${formatInlineRichText(t)}</li>`).join('')}
        </ul>
      </section>
    `
        : ''
    }
  `;
}

export function renderTransitRouteCards(campuses = [], hubId = 'lyg_station') {
  return campuses
    .map((c) => {
      const route = c.routes?.[hubId] || {};
      return `
      <article class="transit-route-card">
        <div class="transit-route-top">
          <h3>前往 ${escapeHtml(c.name)}</h3>
          <span>${escapeHtml(c.address || '')}</span>
        </div>
        <div class="transit-method">
          <span class="method-badge is-bus">公共交通 / BRT</span>
          <p>${escapeHtml(route.bus || '可乘市区 BRT 或常规公交前往。')}</p>
        </div>
        <div class="transit-method">
          <span class="method-badge is-taxi">出租 / 网约车参考</span>
          <p>${escapeHtml(route.taxi || '请前往车站正规出租车或网约车上客点乘车。')}</p>
        </div>
      </article>
    `;
    })
    .join('');
}

/* ── 交互工具 3：可过滤 + 支持自定义添项的必备清单 ──────────── */
export function renderChecklistView(content = {}, checkedSet = new Set(), customItems = [], filterMode = 'all') {
  const sections = content.sections || [];
  const tips = content.tips || {};

  let total = customItems.length;
  let done = 0;
  sections.forEach((sec) => {
    const secKey = sec.id || sec.category;
    (sec.items || []).forEach((_, idx) => {
      total += 1;
      if (checkedSet.has(`${secKey}::${idx}`)) done += 1;
    });
  });
  customItems.forEach((ci) => {
    if (checkedSet.has(`custom::${ci.id}`)) done += 1;
  });
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return `
    <div class="checklist-progress-card">
      <div class="checklist-progress-main">
        <div class="progress-meta">
          <strong>行前打包完成度</strong>
          <span id="checklist-progress-label">${done} / ${total} 项 (${pct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="checklist-progress-fill" style="width: ${pct}%"></div>
        </div>
      </div>
      <div class="checklist-toolbar">
        <div class="filter-pills" id="checklist-filter-pills" role="group" aria-label="筛选清单状态">
          <button type="button" class="filter-pill ${filterMode === 'all' ? 'is-active' : ''}" data-check-filter="all">全部</button>
          <button type="button" class="filter-pill ${filterMode === 'todo' ? 'is-active' : ''}" data-check-filter="todo">待准备</button>
          <button type="button" class="filter-pill ${filterMode === 'done' ? 'is-active' : ''}" data-check-filter="done">已备齐</button>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="reset-checklist-btn">
          <svg><use href="#i-rotate-ccw"/></svg>
          <span>重置</span>
        </button>
      </div>
    </div>

    <form class="custom-check-form" id="custom-check-form">
      <input
        type="text"
        id="custom-check-input"
        maxlength="80"
        placeholder="添加你的个性化待带物品（如：眼镜备用副、吉他、家乡特产）..."
        autocomplete="off"
      />
      <button type="submit" class="btn btn-primary btn-sm">
        <span>+ 加入清单</span>
      </button>
    </form>

    <div class="checklist-sections" data-check-filter-mode="${escapeHtml(filterMode)}">
      <section class="checklist-group" id="custom-checklist-group" ${customItems.length ? '' : 'hidden'}>
        <div class="checklist-group-head">
          <h2 id="sec-check-custom">我的专属补充物品</h2>
          <span class="quick-tag">本机自定义</span>
        </div>
        <div class="checklist-items" id="custom-checklist-items">
          ${customItems
            .map((ci) => {
              const key = `custom::${ci.id}`;
              const checked = checkedSet.has(key);
              return `
              <div class="check-row check-row-custom ${checked ? 'is-checked' : ''}" data-item-checked="${checked ? '1' : '0'}">
                <label class="check-row-label">
                  <input type="checkbox" data-check-key="${escapeHtml(key)}" ${checked ? 'checked' : ''} />
                  <span class="check-box"><svg><use href="#i-check"/></svg></span>
                  <span class="check-text">${escapeHtml(ci.text)}</span>
                </label>
                <button type="button" class="check-delete-btn" data-delete-custom="${escapeHtml(ci.id)}" aria-label="删除此项">
                  <svg><use href="#i-close"/></svg>
                </button>
              </div>
            `;
            })
            .join('')}
        </div>
      </section>

      ${sections
        .map((sec, sIdx) => {
          const secKey = sec.id || sec.category;
          return `
          <section class="checklist-group">
            <div class="checklist-group-head">
              <h2 id="sec-check-${sIdx}">${escapeHtml(sec.category)}</h2>
              ${sec.badge ? `<span class="quick-tag">${escapeHtml(sec.badge)}</span>` : ''}
            </div>
            <div class="checklist-items">
              ${(sec.items || [])
                .map((item, idx) => {
                  const key = `${secKey}::${idx}`;
                  const checked = checkedSet.has(key);
                  return `
                  <label class="check-row ${checked ? 'is-checked' : ''}" data-item-checked="${checked ? '1' : '0'}">
                    <input type="checkbox" data-check-key="${escapeHtml(key)}" ${checked ? 'checked' : ''} />
                    <span class="check-box"><svg><use href="#i-check"/></svg></span>
                    <span class="check-text">${formatInlineRichText(item)}</span>
                  </label>
                `;
                })
                .join('')}
            </div>
          </section>
        `;
        })
        .join('')}
    </div>

    ${
      tips.title
        ? `
      <div class="tips-box" id="sec-check-tips">
        <h3>${escapeHtml(tips.title)}</h3>
        <ul>
          ${(tips.items || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('')}
        </ul>
      </div>
    `
        : ''
    }
  `;
}

/* ── 交互工具 4：宽带 PPPoE 拨号账号一键生成器 ──────────────── */
export function renderPppoeGeneratorWidget() {
  return `
    <section class="pppoe-generator-card" id="sec-pppoe-tool" aria-label="校园宽带拨号账号生成器">
      <div class="pppoe-head">
        <div>
          <span class="section-kicker">Broadband Account Builder</span>
          <h2>宿舍宽带 PPPoE 拨号账号一键生成器</h2>
        </div>
        <span class="quick-tag">零拼接失误 · 防 691 报错</span>
      </div>
      <div class="pppoe-controls">
        <label class="field-group">
          <span>输入你的 10 位学号</span>
          <input
            type="text"
            id="pppoe-sid-input"
            inputmode="numeric"
            maxlength="16"
            placeholder="例如：2026123456"
            autocomplete="off"
          />
        </label>
        <div class="field-group">
          <span>选择办理的校园宽带运营商</span>
          <div class="carrier-pills" id="pppoe-carrier-pills" role="group" aria-label="选择运营商">
            <button type="button" class="carrier-pill is-active" data-carrier="@cmcc">中国移动 <code>@cmcc</code></button>
            <button type="button" class="carrier-pill" data-carrier="@telecom">中国电信 <code>@telecom</code></button>
            <button type="button" class="carrier-pill" data-carrier="@unicom">中国联通 <code>@unicom</code></button>
          </div>
        </div>
      </div>
      <div class="pppoe-output-box">
        <div>
          <small>电脑 / 路由器 WAN 口拨号「用户名」填写：</small>
          <code id="pppoe-result-code">2026123456@cmcc</code>
          <span class="pppoe-pwd-hint">初始宽带密码通常为<strong>身份证后 8 位</strong>（本工具纯本地拼接，不上传任何学号）</span>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="pppoe-copy-btn">
          <svg><use href="#i-copy"/></svg>
          <span>复制账号</span>
        </button>
      </div>
    </section>
  `;
}

export function renderStepsView(content = {}) {
  const steps = content.steps || [];
  return `
    ${
      content.notice
        ? `<div class="notice-callout"><svg><use href="#i-info"/></svg><span>${escapeHtml(content.notice)}</span></div>`
        : ''
    }
    <div class="steps-timeline">
      ${steps
        .map(
          (step, idx) => `
        <article class="step-card" id="sec-step-${idx}">
          <div class="step-index">${String(idx + 1).padStart(2, '0')}</div>
          <div>
            ${step.tag ? `<span class="step-tag">${escapeHtml(step.tag)}</span>` : ''}
            <h2>${escapeHtml(step.title)}</h2>
            <p>${formatInlineRichText(step.description)}</p>
          </div>
        </article>
      `
        )
        .join('')}
    </div>
  `;
}

export function renderPointsOrCardsView(content = {}, toolName = '') {
  const noticeHtml = content.notice
    ? `<div class="notice-callout"><svg><use href="#i-info"/></svg><span>${escapeHtml(content.notice)}</span></div>`
    : '';
  const toolHtml = toolName === 'pppoeGenerator' ? renderPppoeGeneratorWidget() : '';
  const list = content.points || content.sections || [];

  return `
    ${toolHtml}
    ${noticeHtml}
    <div class="info-cards-stack">
      ${list
        .map((entry, idx) => {
          const actions = entry.actions || (entry.action ? [entry.action] : []);
          const bodyHtml = Array.isArray(entry.items)
            ? `<ul>${entry.items.map((li) => `<li>${formatInlineRichText(li)}</li>`).join('')}</ul>`
            : `<p>${formatInlineRichText(entry.description || '')}</p>`;
          return `
          <section class="info-card" id="sec-card-${idx}">
            <div class="info-card-head">
              <span class="info-card-icon"><svg><use href="#i-${safeIcon(entry.icon || 'info')}"/></svg></span>
              <h2>${escapeHtml(entry.title)}</h2>
            </div>
            ${bodyHtml}
            ${
              actions.length
                ? `<div class="card-actions-row">
                    ${actions
                      .map((act) => {
                        const isExt = String(act.href || '').startsWith('http');
                        return `
                        <a class="btn btn-secondary btn-sm" href="${safeUrl(act.href)}" ${
                          isExt ? 'target="_blank" rel="noopener"' : 'data-link'
                        }>
                          <span>${escapeHtml(act.label)}</span>
                          <svg><use href="#i-${isExt ? 'external' : 'arrow-right'}"/></svg>
                        </a>
                      `;
                      })
                      .join('')}
                  </div>`
                : ''
            }
          </section>
        `;
        })
        .join('')}
    </div>
  `;
}

/* ── 交互工具 5：宿舍与食堂多维特征筛选卡片流 ───────────────── */
export function renderCampusPlacesView({
  items = [],
  pageKey,
  campuses = [],
  selectedCampus,
  activeTrait = 'all'
}) {
  const campusObj = campuses.find((c) => c.id === selectedCampus);
  const campusName = campusObj ? campusObj.name : '当前校区';
  const isDorm = pageKey === 'dormitory';

  const traitOptions = isDorm
    ? [
        { key: 'all', label: '全部房型' },
        { key: '上床下桌', label: '上床下桌' },
        { key: '四人间', label: '四人间' },
        { key: '独立卫', label: '独立卫生间/卫浴' },
        { key: '上下铺', label: '上下铺' }
      ]
    : [
        { key: 'all', label: '全部餐厅' },
        { key: '快餐', label: '便捷快餐' },
        { key: '风味', label: '特色风味/夜宵' },
        { key: '清真', label: '清真/民族餐饮' }
      ];

  const filteredItems =
    activeTrait === 'all'
      ? items
      : items.filter((item) => {
          const blob = JSON.stringify(item);
          return blob.includes(activeTrait);
        });

  return `
    <div class="places-toolbar-card">
      <div class="places-toolbar-top">
        <span class="campus-bar-note">正在查看 <strong>${escapeHtml(campusName)}</strong> · 共 ${filteredItems.length} 处实拍专题</span>
        ${renderCampusSegments(campuses, selectedCampus)}
      </div>
      <div class="filter-pills" role="group" aria-label="按特征筛选">
        ${traitOptions
          .map(
            (opt) => `
          <button
            type="button"
            class="filter-pill ${activeTrait === opt.key ? 'is-active' : ''}"
            data-place-trait="${escapeHtml(opt.key)}"
          >
            ${escapeHtml(opt.label)}
          </button>
        `
          )
          .join('')}
      </div>
    </div>

    ${
      filteredItems.length === 0
        ? `<div class="empty-state-box">
            <p>当前校区暂无符合「${escapeHtml(activeTrait)}」筛选条件的条目，可切换至「全部」或其他校区查看。</p>
            <button type="button" class="btn btn-secondary btn-sm" data-place-trait="all">显示当前校区全部</button>
          </div>`
        : `<div class="places-grid">
            ${filteredItems
              .map((item) => {
                const detailCount = (item.details || []).length;
                const photoCount =
                  (item.image ? 1 : 0) +
                  (item.details || []).reduce((sum, d) => sum + (d.images?.length || 0), 0);

                const tags = isDorm
                  ? [
                      ...new Set(
                        (item.details || []).flatMap((d) =>
                          [d.roomType?.split('（')[0], d.layout?.split('+')[0]?.trim(), d.price].filter(Boolean)
                        )
                      )
                    ].slice(0, 4)
                  : [
                      ...(item.tags || []).slice(0, 2),
                      ...(item.details || []).flatMap((d) => d.specialty || []).slice(0, 2)
                    ].slice(0, 4);

                const priceHint = !isDorm ? item.details?.[0]?.priceRange || '' : '';
                const href = toRouteHref('campusLife', pageKey, item.id);

                return `
                <a class="place-card" href="${escapeHtml(href)}" data-link>
                  <div class="place-card-media">
                    <img
                      src="${safeUrl(item.image || FALLBACK_IMG_URI)}"
                      alt="${escapeHtml(item.name)}实景"
                      loading="lazy"
                      data-fallback-img
                    />
                    <span class="place-photo-badge">${photoCount} 张实拍</span>
                    ${priceHint ? `<span class="place-price-badge">${escapeHtml(priceHint)}</span>` : ''}
                  </div>
                  <div class="place-card-body">
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>${escapeHtml(item.summary || '')}</p>
                    <div class="place-tags">
                      ${tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}
                    </div>
                    <div class="place-card-foot">
                      <span>含 ${detailCount} 组楼栋/楼层详情</span>
                      <span class="place-more">查看实拍与参数 <svg><use href="#i-arrow-right"/></svg></span>
                    </div>
                  </div>
                </a>
              `;
              })
              .join('')}
          </div>`
    }
  `;
}

export function renderPlaceDetailView(item, pageKey) {
  const isDorm = pageKey === 'dormitory';
  const details = item.details || [];
  const allPhotos = [];

  if (item.image) {
    allPhotos.push({ src: item.image, caption: `${item.name} · 外观实景` });
  }
  details.forEach((d) => {
    const prefix = d.building || d.area || item.name;
    (d.images || []).forEach((img) => {
      if (img.src) {
        allPhotos.push({
          src: img.src,
          caption: `${prefix} · ${img.caption || '实景照片'}`
        });
      }
    });
  });

  let photoCursor = item.image ? 1 : 0;

  const html = `
    ${
      item.image
        ? `
      <figure class="detail-cover" data-lightbox-index="0" role="button" tabindex="0" aria-label="点击放大查看 ${escapeHtml(item.name)} 外观大图">
        <img src="${safeUrl(item.image)}" alt="${escapeHtml(item.name)}" data-fallback-img />
        <figcaption class="detail-cover-bar">
          <span>${escapeHtml(item.name)} · 实景外观（共 ${allPhotos.length} 张大图可左右翻看）</span>
          <span class="zoom-hint"><svg><use href="#i-zoom-in"/></svg>点击放大灯箱</span>
        </figcaption>
      </figure>
    `
        : ''
    }

    <div class="detail-sections">
      ${details
        .map((d, dIdx) => {
          const heading = d.building || d.area || '详情参数';
          const specs = isDorm
            ? [
                ['房间类型', d.roomType],
                ['床桌布局', d.layout],
                ['住宿费标准', d.price],
                ['空调配置', d.ac],
                ['阳台空间', d.balcony],
                ['卫浴与澡堂', d.bathroom],
                ['自助洗衣', d.laundry],
                ['饮水与热水', d.waterHeater],
                ['校园网作息', d.network]
              ]
            : [
                ['供餐时段参考', d.openingHours],
                ['日常消费参考', d.priceRange],
                ['人气特色窗口', Array.isArray(d.specialty) ? d.specialty.join(' · ') : d.specialty]
              ];

          const validSpecs = specs.filter(([, v]) => v && String(v).trim() !== '');
          const galleryHtml = (d.images || [])
            .map((img) => {
              const idx = photoCursor++;
              return `
                <figure class="detail-photo" data-lightbox-index="${idx}" role="button" tabindex="0" aria-label="放大查看 ${escapeHtml(img.caption || heading)}">
                  <img src="${safeUrl(img.src)}" alt="${escapeHtml(img.caption || heading)}" loading="lazy" data-fallback-img />
                  <figcaption>${escapeHtml(img.caption || heading)}</figcaption>
                </figure>
              `;
            })
            .join('');

          return `
            <section class="detail-block" id="sec-detail-${dIdx}">
              <div class="detail-block-head">
                <h2>${escapeHtml(heading)}</h2>
                ${isDorm && d.price ? `<span class="quick-tag">${escapeHtml(d.price)}</span>` : ''}
                ${!isDorm && d.priceRange ? `<span class="quick-tag">${escapeHtml(d.priceRange)}</span>` : ''}
              </div>
              ${d.notes ? `<p class="detail-notes">${escapeHtml(d.notes)}</p>` : ''}
              ${
                validSpecs.length
                  ? `<dl class="spec-grid">
                      ${validSpecs
                        .map(
                          ([k, v]) => `
                        <div class="spec-cell">
                          <dt>${escapeHtml(k)}</dt>
                          <dd>${escapeHtml(v)}</dd>
                        </div>
                      `
                        )
                        .join('')}
                    </dl>`
                  : ''
              }
              ${galleryHtml ? `<div class="detail-gallery">${galleryHtml}</div>` : ''}
            </section>
          `;
        })
        .join('')}
    </div>
  `;

  return { html, allPhotos };
}

export function renderClubsView(content = {}) {
  const groups = content.clubs || [];
  const totalCount = groups.reduce((acc, g) => acc + (g.list?.length || 0), 0);

  return `
    ${content.introduction ? `<p class="lead-paragraph">${escapeHtml(content.introduction)}</p>` : ''}
    <div class="clubs-toolbar">
      <div class="club-filter-tabs" role="tablist" aria-label="按社团星级筛选">
        <button type="button" class="is-active" data-club-level="all">全部 (${totalCount})</button>
        ${groups
          .map(
            (g) => `
          <button type="button" data-club-level="${escapeHtml(g.level)}">
            ${escapeHtml(g.label)} (${g.list?.length || 0})
          </button>
        `
          )
          .join('')}
      </div>
      <div class="club-search-input">
        <svg><use href="#i-search"/></svg>
        <input type="search" id="club-search-input" placeholder="搜社团名称（如：羽毛球、街舞、海洋、辩论）..." autocomplete="off" />
      </div>
    </div>

    <div class="clubs-chip-grid" id="clubs-chip-grid">
      ${groups
        .flatMap((g) =>
          (g.list || []).map((name) => {
            const stars = g.level > 0 ? '★'.repeat(g.level) : '观察期';
            return `
              <div class="club-chip">
                <span>${escapeHtml(name)}</span>
                <span class="club-stars" title="${escapeHtml(g.label)}">${escapeHtml(stars)}</span>
              </div>
            `;
          })
        )
        .join('')}
    </div>

    ${
      content.organizations
        ? `
      <section class="info-card" id="sec-orgs" style="margin-top: 24px;">
        <div class="info-card-head">
          <span class="info-card-icon"><svg><use href="#i-award"/></svg></span>
          <h2>${escapeHtml(content.organizations.title)}</h2>
        </div>
        <p>${formatInlineRichText(content.organizations.content)}</p>
      </section>
    `
        : ''
    }
  `;
}

export function renderFaqView(content = {}) {
  const items = content.items || [];
  return `
    <div class="faq-accordion">
      ${items
        .map(
          (qa, idx) => `
        <details class="faq-item" id="sec-faq-${idx}" ${idx < 2 ? 'open' : ''}>
          <summary>
            <span class="faq-num">${String(idx + 1).padStart(2, '0')}</span>
            <span class="faq-q">${escapeHtml(qa.q)}</span>
            <svg class="faq-chevron"><use href="#i-chevron-down"/></svg>
          </summary>
          <div class="faq-a">
            <p>${formatInlineRichText(qa.a)}</p>
          </div>
        </details>
      `
        )
        .join('')}
    </div>
  `;
}

export function renderLinksView(content = {}) {
  const groups = content.groups || [];
  return `
    <div class="links-groups">
      ${groups
        .map(
          (g, idx) => `
        <section class="links-group" id="sec-links-${idx}">
          <h2>${escapeHtml(g.title)}</h2>
          <div class="links-grid">
            ${(g.items || [])
              .map(
                (item) => `
              <a class="ext-link-card" href="${safeUrl(item.url)}" target="_blank" rel="noopener">
                <div>
                  <h3>${escapeHtml(item.name)}</h3>
                  <p>${escapeHtml(item.desc)}</p>
                </div>
                <svg><use href="#i-external"/></svg>
              </a>
            `
              )
              .join('')}
          </div>
        </section>
      `
        )
        .join('')}
    </div>
    ${content.disclaimer ? `<p class="disclaimer-box">${escapeHtml(content.disclaimer)}</p>` : ''}
  `;
}

export function renderNotFoundView(badPath = '') {
  return `
    <section class="not-found-card">
      <span class="quick-tag">HTTP 404 · 页面未找到</span>
      <h1>没有找到对应的指南章节</h1>
      <p>你访问的路径 <code>${escapeHtml(badPath)}</code> 可能已调整位置，可通过上方搜索框检索关键词或返回门户总览。</p>
      <div class="home-hero-actions">
        <a class="btn btn-primary" href="/" data-link>返回校园指南门户</a>
        <a class="btn btn-secondary" href="/preparation/campusQuery" data-link>大一校区秒查</a>
      </div>
    </section>
  `;
}

/**
 * 构建任意已解析路由的完整同构视图数据包（供 SSR 与前端路由共用）
 */
export function buildRouteRenderBundle({
  resolved,
  guideData = [],
  campusData = {},
  selectedCampus = 'cangwu',
  checklistChecked = new Set(),
  customChecklistItems = [],
  checklistFilter = 'all',
  communityTopics = [],
  activePlaceTrait = 'all',
  activeTransitHub = 'lyg_station'
}) {
  const campuses = campusData.campuses || [];
  const getCampusName = (id) => campuses.find((c) => c.id === id)?.name || '苍梧校区';
  const flatChapters = buildFlatChapters(guideData);

  if (!resolved.valid) {
    return {
      viewMode: 'portal',
      activeNavKey: '',
      title: '页面未找到 · 江苏海洋大学校园指南',
      description: '江苏海洋大学校园指南（酱海带出品）：三校区食宿导览、校区查询与入学实用手册。',
      canonicalPath: '/',
      ogImage: 'https://jianghaidai.com/uploads/images/%E8%8B%8D%E6%A2%A7%E6%A0%A1%E5%8C%BA.jpg',
      currentChapterLabel: '404 页面未找到',
      sidebarHtml: renderSidebarNavHtml(guideData, '', selectedCampus, campuses),
      mainHtml: renderNotFoundView(resolved.canonicalPath),
      tocHtml: '',
      lightboxPhotos: []
    };
  }

  // 1. 门户首页 (/)
  if (resolved.isPortal) {
    const checklistPage = guideData
      .find((c) => c.key === 'preparation')
      ?.pages?.find((p) => p.pageKey === 'checklist');
    let totalChecks = customChecklistItems.length;
    let doneChecks = 0;
    (checklistPage?.structuredContent?.sections || []).forEach((sec) => {
      const secKey = sec.id || sec.category;
      (sec.items || []).forEach((_, idx) => {
        totalChecks += 1;
        if (checklistChecked.has(`${secKey}::${idx}`)) doneChecks += 1;
      });
    });
    customChecklistItems.forEach((ci) => {
      if (checklistChecked.has(`custom::${ci.id}`)) doneChecks += 1;
    });

    return {
      viewMode: 'portal',
      activeNavKey: 'home/home',
      title: '江苏海洋大学校园指南 · 酱海带实用数字门户',
      description:
        '江苏海洋大学非官方实用门户（酱海带出品）：同步近年教务校区划分，提供专业校区秒查、高铁到校交通、开学勾选清单、苍梧/通灌/宋跳宿舍食堂实拍与宽带配置。',
      canonicalPath: '/',
      ogImage: 'https://jianghaidai.com/uploads/images/%E8%8B%8D%E6%A2%A7%E6%A0%A1%E5%8C%BA.jpg',
      currentChapterLabel: '指南门户总览',
      sidebarHtml: renderSidebarNavHtml(guideData, 'home/home', selectedCampus, campuses),
      mainHtml: renderPortalHomeView({
        page: resolved.page,
        guideData,
        campusData,
        selectedCampus,
        checklistStats: { done: doneChecks, total: totalChecks || 26 },
        communityTopics
      }),
      tocHtml: '',
      lightboxPhotos: []
    };
  }

  // 2. 宿舍 / 食堂三级详情页
  if (resolved.detailId && resolved.detailItem) {
    const item = resolved.detailItem;
    const effectiveCampus = item.campusId || selectedCampus;
    const campusName = getCampusName(effectiveCampus);
    const shortC = campusName.replace('校区', '');
    const displayItemTitle = item.name.includes(shortC) ? item.name : `${item.name}（${campusName}）`;
    const parentTitle = resolved.pageKey === 'dormitory' ? '宿舍实拍导览' : '食堂风味地图';
    const parentRoute = toRouteHref('campusLife', resolved.pageKey);
    const { html, allPhotos } = renderPlaceDetailView(item, resolved.pageKey);

    const tocItems = (item.details || []).map((d, idx) => ({
      id: `sec-detail-${idx}`,
      label: d.building || d.area || `区域 ${idx + 1}`
    }));

    const mainHtml =
      renderArticleHeader({
        categoryTitle: '校园生活',
        categoryRoute: parentRoute,
        pageTitle: displayItemTitle,
        subtitle: item.summary || '',
        detailParent: { title: parentTitle, route: parentRoute },
        metaBadge: `${allPhotos.length} 张高清实拍`
      }) +
      html +
      `<nav class="chapter-pager" aria-label="返回列表">
        <a class="pager-card" href="${escapeHtml(parentRoute)}" data-link>
          <small>← 返回${escapeHtml(campusName)}列表</small>
          <strong>查看全部${escapeHtml(parentTitle)}</strong>
        </a>
        <div></div>
      </nav>`;

    return {
      viewMode: 'reader',
      activeNavKey: `campusLife/${resolved.pageKey}`,
      effectiveCampus,
      title: `${displayItemTitle}实拍与详情 · 江苏海洋大学校园指南`,
      description: `${campusName}${item.name}实拍导览：${item.summary || ''}`,
      canonicalPath: resolved.canonicalPath,
      ogImage: item.image
        ? `https://jianghaidai.com${item.image}`
        : 'https://jianghaidai.com/uploads/images/%E8%8B%8D%E6%A2%A7%E6%A0%A1%E5%8C%BA.jpg',
      currentChapterLabel: `${campusName} · ${item.name}`,
      sidebarHtml: renderSidebarNavHtml(guideData, `campusLife/${resolved.pageKey}`, effectiveCampus, campuses),
      mainHtml,
      tocHtml: renderRightTocHtml(tocItems),
      lightboxPhotos: allPhotos
    };
  }

  // 3. 常规二级章节与交互工具页
  const { category, page } = resolved;
  const activeNavKey = `${category.key}/${page.pageKey}`;
  const flatIdx = flatChapters.findIndex(
    (ch) => ch.categoryKey === category.key && ch.pageKey === page.pageKey
  );
  const prevChapter = flatIdx > 0 ? flatChapters[flatIdx - 1] : null;
  const nextChapter =
    flatIdx >= 0 && flatIdx < flatChapters.length - 1 ? flatChapters[flatIdx + 1] : null;

  const sc = page.structuredContent || {};
  let bodyHtml = '';
  let metaBadge = '';
  const tocItems = [];

  if (page.isCampusSpecific) {
    const listKey = page.pageKey === 'dormitory' ? 'dormitories' : 'canteens';
    const items = (campusData[listKey] || []).filter((x) => x.campusId === selectedCampus);
    metaBadge = '支持多维特征筛选';
    bodyHtml = renderCampusPlacesView({
      items,
      pageKey: page.pageKey,
      campuses,
      selectedCampus,
      activeTrait: activePlaceTrait
    });
  } else {
    switch (page.type) {
      case 'campusQuery':
        metaBadge = '近年分流已校对';
        bodyHtml = renderCampusQueryView(campusData.colleges || []);
        break;
      case 'transitMap':
        metaBadge = '交互式乘车向导';
        tocItems.push(
          { id: 'sec-transit-hub', label: '高铁/机场到校路线' },
          { id: 'sec-campus-landmarks', label: '三校区核心地标' },
          { id: 'sec-transit-tips', label: '抵连乘车防坑贴士' }
        );
        bodyHtml = renderTransitMapView(sc, campuses, activeTransitHub);
        break;
      case 'checklist':
        metaBadge = '本机自动保存';
        (sc.sections || []).forEach((sec, idx) => {
          tocItems.push({ id: `sec-check-${idx}`, label: sec.category.split('（')[0] });
        });
        if (sc.tips?.title) tocItems.push({ id: 'sec-check-tips', label: sc.tips.title });
        bodyHtml = renderChecklistView(sc, checklistChecked, customChecklistItems, checklistFilter);
        break;
      case 'steps':
        metaBadge = `${(sc.steps || []).length} 步清晰指引`;
        (sc.steps || []).forEach((st, idx) => {
          tocItems.push({ id: `sec-step-${idx}`, label: st.title });
        });
        bodyHtml = renderStepsView(sc);
        break;
      case 'clubs':
        metaBadge = '星级与关键词秒筛';
        bodyHtml = renderClubsView(sc);
        break;
      case 'faq':
        metaBadge = `${(sc.items || []).length} 个高频解答`;
        (sc.items || []).forEach((qa, idx) => {
          tocItems.push({ id: `sec-faq-${idx}`, label: qa.q.slice(0, 16) + (qa.q.length > 16 ? '…' : '') });
        });
        bodyHtml = renderFaqView(sc);
        break;
      case 'links':
        metaBadge = '权威入口直达';
        (sc.groups || []).forEach((g, idx) => {
          tocItems.push({ id: `sec-links-${idx}`, label: g.title });
        });
        bodyHtml = renderLinksView(sc);
        break;
      default: {
        const list = sc.points || sc.sections || [];
        metaBadge = page.tool === 'pppoeGenerator' ? '含拨号账号生成器' : `约 ${Math.max(2, list.length)} 分钟读完`;
        if (page.tool === 'pppoeGenerator') {
          tocItems.push({ id: 'sec-pppoe-tool', label: '宽带账号一键生成' });
        }
        list.forEach((entry, idx) => {
          tocItems.push({ id: `sec-card-${idx}`, label: entry.title });
        });
        bodyHtml = renderPointsOrCardsView(sc, page.tool || '');
        break;
      }
    }
  }

  const mainHtml =
    renderArticleHeader({
      categoryTitle: category.title,
      categoryRoute: toRouteHref(category.key, category.pages[0].pageKey),
      pageTitle: page.title,
      subtitle: page.subtitle,
      metaBadge
    }) +
    bodyHtml +
    renderChapterPager(prevChapter, nextChapter);

  return {
    viewMode: 'reader',
    activeNavKey,
    title: `${page.title} · 江苏海洋大学校园指南`,
    description: page.subtitle || `${category.title} - ${page.title} · 江苏海洋大学实用校园指南`,
    canonicalPath: resolved.canonicalPath,
    ogImage: 'https://jianghaidai.com/uploads/images/%E8%8B%8D%E6%A2%A7%E6%A0%A1%E5%8C%BA.jpg',
    currentChapterLabel: `${category.title} · ${page.title}`,
    sidebarHtml: renderSidebarNavHtml(guideData, activeNavKey, selectedCampus, campuses),
    mainHtml,
    tocHtml: renderRightTocHtml(tocItems),
    lightboxPhotos: []
  };
}
