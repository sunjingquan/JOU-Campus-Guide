/**
 * @file 江苏海洋大学校园指南主应用控制器
 * @description 现代知识库单页阅读 + Hash 深度路由 + 全局检索 + 交互式工具，零外部依赖。
 */

import { loadAllGuideData, submitFeedback } from '../services/api.js';
import * as tpl from './templates.js';

const CHECKLIST_STORAGE_KEY = 'jhd-guide-checklist-v1';
const CAMPUS_STORAGE_KEY = 'selectedCampus';
const THEME_STORAGE_KEY = 'jhd-theme';

const state = {
  guideData: [],
  campusData: { campuses: [], canteens: [], dormitories: [], colleges: [] },
  flatChapters: [],
  searchIndex: [],
  selectedCampus: 'cangwu',
  checklistChecked: new Set(),
  currentRoute: { categoryKey: 'home', pageKey: 'home', detailId: null },
  currentChapterLabel: '指南总览',
  lightboxPhotos: [],
  lightboxIndex: 0,
  searchResults: [],
  searchFocusIndex: 0
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let toastTimer = null;

function showToast(message) {
  const toast = $('#toast');
  const textEl = $('#toast-text');
  if (!toast || !textEl) return;
  textEl.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

/* ── 本地状态读取与持久化 ───────────────────────────────────── */
function loadLocalPreferences() {
  try {
    const savedCampus = localStorage.getItem(CAMPUS_STORAGE_KEY);
    if (savedCampus && ['cangwu', 'tongguan', 'songtiao'].includes(savedCampus)) {
      state.selectedCampus = savedCampus;
    }
    const rawChecks = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (rawChecks) {
      const parsed = JSON.parse(rawChecks);
      if (Array.isArray(parsed)) state.checklistChecked = new Set(parsed);
    }
  } catch {
    // 忽略隐私模式存储限制
  }
}

function saveChecklist() {
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify([...state.checklistChecked]));
  } catch {}
}

function setCampus(campusId, silent = false) {
  const valid = state.campusData.campuses.some((c) => c.id === campusId);
  if (!valid) return;
  state.selectedCampus = campusId;
  try {
    localStorage.setItem(CAMPUS_STORAGE_KEY, campusId);
  } catch {}
  syncCampusLabels();
  renderCurrentRoute({ keepScroll: true });
  if (!silent) {
    const name = getCampusName(campusId);
    showToast(`已切换至 ${name}`);
  }
}

function getCampusName(campusId) {
  return state.campusData.campuses.find((c) => c.id === campusId)?.name || '苍梧校区';
}

function syncCampusLabels() {
  const fullName = getCampusName(state.selectedCampus);
  const shortName = fullName.replace('校区', '');
  const headerLabel = $('#header-campus-label');
  const mobileLabel = $('#mobile-campus-label');
  if (headerLabel) headerLabel.textContent = fullName;
  if (mobileLabel) mobileLabel.textContent = shortName;
  $$('[data-select-campus]').forEach((card) => {
    card.classList.toggle('is-selected', card.dataset.selectCampus === state.selectedCampus);
  });
  // 更新目录树里的校区角标
  $$('.nav-campus-tag').forEach((badge) => {
    badge.textContent = shortName;
  });
}

/* ── 主题系统 ───────────────────────────────────────────────── */
function initTheme() {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (theme, persist = false) => {
    document.documentElement.dataset.theme = theme;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0b0e14' : '#f4f6fa';
    if (persist) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        localStorage.setItem('theme', theme);
      } catch {}
    }
  };

  $('#theme-toggle-btn')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next, true);
    showToast(next === 'dark' ? '已切换深色模式' : '已切换浅色模式');
  });

  systemDark.addEventListener?.('change', () => {
    try {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        apply(systemDark.matches ? 'dark' : 'light', false);
      }
    } catch {}
  });
}

/* ── 构建章节扁平序列与全局搜索索引 ─────────────────────────── */
function buildChaptersAndSearchIndex() {
  state.flatChapters = [];
  state.searchIndex = [];

  for (const cat of state.guideData) {
    for (const page of cat.pages || []) {
      state.flatChapters.push({
        categoryKey: cat.key,
        categoryTitle: cat.title,
        pageKey: page.pageKey,
        title: page.title
      });

      const sc = page.structuredContent || {};
      const bodyParts = [page.title, page.subtitle || ''];
      (sc.points || []).forEach((p) => bodyParts.push(p.title, p.description));
      (sc.steps || []).forEach((s) => bodyParts.push(s.title, s.description));
      (sc.sections || []).forEach((s) => {
        bodyParts.push(s.title || s.category || '');
        (s.items || []).forEach((i) => bodyParts.push(i));
      });

      state.searchIndex.push({
        title: page.title,
        subtitle: page.subtitle || `${cat.title}章节`,
        badge: cat.title,
        route: `#/${cat.key}/${page.pageKey}`,
        keywords: bodyParts.join(' ').toLowerCase()
      });

      // FAQ 细粒度索引
      if (page.type === 'faq' && Array.isArray(sc.items)) {
        for (const qa of sc.items) {
          state.searchIndex.push({
            title: qa.q,
            subtitle: qa.a.slice(0, 64) + (qa.a.length > 64 ? '...' : ''),
            badge: '常见问答',
            route: `#/${cat.key}/${page.pageKey}`,
            keywords: `${qa.q} ${qa.a}`.toLowerCase()
          });
        }
      }

      // 社团索引
      if (page.type === 'clubs' && Array.isArray(sc.clubs)) {
        for (const group of sc.clubs) {
          for (const clubName of group.list || []) {
            state.searchIndex.push({
              title: clubName,
              subtitle: `${group.label} · 社团与学生组织`,
              badge: '学生社团',
              route: `#/${cat.key}/${page.pageKey}`,
              keywords: `${clubName} ${group.label} 社团`.toLowerCase()
            });
          }
        }
      }
    }
  }

  // 食堂与宿舍索引
  for (const item of state.campusData.canteens || []) {
    const cName = getCampusName(item.campusId);
    const foods = (item.details || []).flatMap((d) => d.specialty || []).join('、');
    state.searchIndex.push({
      title: `${item.name}（${cName}）`,
      subtitle: foods ? `特色：${foods}` : item.summary || '',
      badge: '食堂实拍',
      route: `#/campusLife/canteen/${item.id}`,
      keywords: `${item.name} ${cName} ${item.summary || ''} ${foods} 食堂 餐厅`.toLowerCase()
    });
  }

  for (const item of state.campusData.dormitories || []) {
    const cName = getCampusName(item.campusId);
    const buildings = (item.details || []).map((d) => `${d.building || ''} ${d.layout || ''}`).join(' ');
    state.searchIndex.push({
      title: `${item.name}（${cName}）`,
      subtitle: item.summary || buildings,
      badge: '宿舍实拍',
      route: `#/campusLife/dormitory/${item.id}`,
      keywords: `${item.name} ${cName} ${item.summary || ''} ${buildings} 宿舍 寝室`.toLowerCase()
    });
  }

  // 学院与专业所属校区索引
  for (const col of state.campusData.colleges || []) {
    const cName = getCampusName(col.campusId);
    for (const major of col.majors || []) {
      state.searchIndex.push({
        title: `${major} → ${cName}`,
        subtitle: `所属学院：${col.college}`,
        badge: '校区查询',
        route: `#/preparation/campusQuery`,
        campusId: col.campusId,
        majorQuery: major,
        keywords: `${major} ${col.college} ${cName}`.toLowerCase()
      });
    }
  }
}

/* ── 左侧目录树渲染 ─────────────────────────────────────────── */
function renderSidebarNav() {
  const nav = $('#sidebar-nav');
  if (!nav) return;
  nav.innerHTML = '';

  const shortCampus = getCampusName(state.selectedCampus).replace('校区', '');

  for (const cat of state.guideData) {
    if (cat.isHomePage) {
      const homeLink = document.createElement('a');
      homeLink.href = '#/home/home';
      homeLink.className = 'nav-item nav-item-home';
      homeLink.dataset.navKey = 'home/home';
      homeLink.innerHTML = `
        <span class="nav-item-left">
          <svg><use href="#i-${tpl.safeIcon(cat.icon)}"/></svg>
          <span>${tpl.escapeHtml(cat.title)}</span>
        </span>
      `;
      nav.appendChild(homeLink);
      continue;
    }

    const group = document.createElement('div');
    group.className = 'nav-group';

    const label = document.createElement('div');
    label.className = 'nav-group-label';
    label.innerHTML = `
      <svg><use href="#i-${tpl.safeIcon(cat.icon)}"/></svg>
      <span>${tpl.escapeHtml(cat.title)}</span>
    `;
    group.appendChild(label);

    for (const page of cat.pages || []) {
      const link = document.createElement('a');
      link.href = `#/${cat.key}/${page.pageKey}`;
      link.className = 'nav-item';
      link.dataset.navKey = `${cat.key}/${page.pageKey}`;
      const nameSpan = document.createElement('span');
      nameSpan.textContent = page.title;
      link.appendChild(nameSpan);

      if (page.isCampusSpecific) {
        const tag = document.createElement('span');
        tag.className = 'nav-campus-tag';
        tag.textContent = shortCampus;
        link.appendChild(tag);
      }
      group.appendChild(link);
    }

    nav.appendChild(group);
  }
}

/* ── 路由解析与视图渲染 ─────────────────────────────────────── */
function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  if (!raw) return { categoryKey: 'home', pageKey: 'home', detailId: null };
  const parts = raw.split('/').map((s) => decodeURIComponent(s));
  if (parts.length >= 3) {
    return { categoryKey: parts[0], pageKey: parts[1], detailId: parts[2] };
  }
  if (parts.length === 2) {
    return { categoryKey: parts[0], pageKey: parts[1], detailId: null };
  }
  // 兼容旧单段锚点如 #preparation
  const matchedCat = state.guideData.find((c) => c.key === parts[0]);
  if (matchedCat && matchedCat.pages?.[0]) {
    return { categoryKey: matchedCat.key, pageKey: matchedCat.pages[0].pageKey, detailId: null };
  }
  return { categoryKey: 'home', pageKey: 'home', detailId: null };
}

function renderCurrentRoute({ keepScroll = false, presetMajorQuery = '' } = {}) {
  const route = parseHash();
  state.currentRoute = route;
  const container = $('#article-container');
  if (!container) return;

  // 同步侧栏激活态与移动端底栏
  const activeNavKey = `${route.categoryKey}/${route.pageKey}`;
  $$('.nav-item', $('#sidebar-nav')).forEach((el) => {
    el.classList.toggle('is-active', el.dataset.navKey === activeNavKey);
  });
  $$('.mobile-tabbar [data-tab="home"]').forEach((el) => {
    el.classList.toggle('is-active', activeNavKey === 'home/home');
  });

  // 1. 食堂或宿舍三级详情路由
  if (route.categoryKey === 'campusLife' && route.detailId && ['canteen', 'dormitory'].includes(route.pageKey)) {
    const listKey = route.pageKey === 'dormitory' ? 'dormitories' : 'canteens';
    const item = (state.campusData[listKey] || []).find((x) => x.id === route.detailId);
    if (item) {
      if (item.campusId && item.campusId !== state.selectedCampus) {
        state.selectedCampus = item.campusId;
        syncCampusLabels();
      }
      const parentTitle = route.pageKey === 'dormitory' ? '宿舍导览' : '食堂导览';
      const campusName = getCampusName(item.campusId);
      state.currentChapterLabel = `${campusName} · ${item.name}`;
      document.title = `${item.name}（${campusName}） · 江苏海洋大学校园指南`;

      const { html, allPhotos } = tpl.renderPlaceDetailView(item, route.pageKey);
      state.lightboxPhotos = allPhotos;

      container.innerHTML =
        tpl.renderArticleHeader({
          categoryTitle: '校园生活',
          categoryRoute: `#/campusLife/${route.pageKey}`,
          pageTitle: `${item.name}（${campusName}）`,
          subtitle: item.summary || '',
          detailParent: { title: parentTitle, route: `#/campusLife/${route.pageKey}` }
        }) +
        html +
        `<div class="chapter-pager">
          <a class="pager-card" href="#/campusLife/${tpl.escapeHtml(route.pageKey)}">
            <small>← 返回列表</small>
            <strong>查看${tpl.escapeHtml(campusName)}全部${tpl.escapeHtml(parentTitle)}</strong>
          </a>
          <div></div>
        </div>`;

      bindRenderedArticleEnhancements(container);
      if (!keepScroll) window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
  }

  // 2. 常规章节路由
  let category = state.guideData.find((c) => c.key === route.categoryKey);
  let page = category?.pages?.find((p) => p.pageKey === route.pageKey);
  if (!category || !page) {
    category = state.guideData[0];
    page = category?.pages?.[0];
  }
  if (!category || !page) return;

  const flatIdx = state.flatChapters.findIndex(
    (ch) => ch.categoryKey === category.key && ch.pageKey === page.pageKey
  );
  const prevChapter = flatIdx > 0 ? state.flatChapters[flatIdx - 1] : null;
  const nextChapter =
    flatIdx >= 0 && flatIdx < state.flatChapters.length - 1 ? state.flatChapters[flatIdx + 1] : null;

  state.currentChapterLabel = `${category.title} · ${page.title}`;
  document.title =
    category.isHomePage ? '江苏海洋大学校园指南 · 酱海带' : `${page.title} · 江苏海洋大学校园指南`;

  if (category.isHomePage) {
    container.innerHTML = tpl.renderHomeView(
      page,
      state.campusData.campuses || [],
      state.selectedCampus,
      nextChapter
    );
  } else {
    let bodyHtml = '';
    const sc = page.structuredContent || {};
    if (page.isCampusSpecific) {
      const listKey = page.pageKey === 'dormitory' ? 'dormitories' : 'canteens';
      const items = (state.campusData[listKey] || []).filter(
        (x) => x.campusId === state.selectedCampus
      );
      bodyHtml = tpl.renderCampusPlacesView({
        items,
        pageKey: page.pageKey,
        campuses: state.campusData.campuses || [],
        selectedCampus: state.selectedCampus
      });
    } else {
      switch (page.type) {
        case 'campusQuery':
          bodyHtml = tpl.renderCampusQueryView(state.campusData.colleges || []);
          break;
        case 'checklist':
          bodyHtml = tpl.renderChecklistView(sc, state.checklistChecked);
          break;
        case 'steps':
          bodyHtml = tpl.renderStepsView(sc);
          break;
        case 'clubs':
          bodyHtml = tpl.renderClubsView(sc);
          break;
        case 'faq':
          bodyHtml = tpl.renderFaqView(sc);
          break;
        case 'links':
          bodyHtml = tpl.renderLinksView(sc);
          break;
        default:
          bodyHtml = tpl.renderPointsOrCardsView(sc);
          break;
      }
    }

    container.innerHTML =
      tpl.renderArticleHeader({
        categoryTitle: category.title,
        categoryRoute: `#/${category.key}/${category.pages[0].pageKey}`,
        pageTitle: page.title,
        subtitle: page.subtitle
      }) +
      bodyHtml +
      tpl.renderChapterPager(prevChapter, nextChapter);

    if (page.type === 'campusQuery') initCampusQueryInteractive(container, presetMajorQuery);
    if (page.type === 'checklist') initChecklistInteractive(container, sc);
    if (page.type === 'clubs') initClubsInteractive(container, sc);
  }

  bindRenderedArticleEnhancements(container);
  if (!keepScroll) window.scrollTo({ top: 0, behavior: 'auto' });
}

/* ── 绑定文章内通用增强（图片兜底、校区胶囊、分享链接、灯箱） ─ */
function bindRenderedArticleEnhancements(container) {
  $$('img[data-fallback-img]', container).forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        if (img.src !== tpl.FALLBACK_IMG_URI) img.src = tpl.FALLBACK_IMG_URI;
      },
      { once: true }
    );
  });

  $$('[data-switch-campus]', container).forEach((btn) => {
    btn.addEventListener('click', () => setCampus(btn.dataset.switchCampus));
  });

  $('[data-copy-link]', container)?.addEventListener('click', async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast('本页链接已复制，可直接分享给同学');
    } catch {
      showToast('请直接复制浏览器地址栏链接');
    }
  });

  $('[data-open-feedback]', container)?.addEventListener('click', () => openFeedbackDialog());

  $$('[data-lightbox-index]', container).forEach((el) => {
    const open = () => openLightbox(Number(el.dataset.lightboxIndex || 0));
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });
}

/* ── 交互工具 1：大一校区查询（即时搜索 + 下拉联动） ────────── */
function initCampusQueryInteractive(container, presetQuery = '') {
  const searchInput = $('#major-instant-input', container);
  const collegeSelect = $('#query-college-select', container);
  const majorSelect = $('#query-major-select', container);
  const resultStage = $('#query-result-stage', container);
  const colleges = state.campusData.colleges || [];

  const renderMatches = (matches) => {
    if (!matches.length) {
      resultStage.innerHTML = `<p class="query-empty">未找到匹配的专业或学院，请尝试更短的关键词（如“软件”“英语”“机械”）。</p>`;
      return;
    }
    resultStage.innerHTML = `
      <div class="query-matches">
        ${matches
          .slice(0, 12)
          .map((m) => {
            const cName = getCampusName(m.campusId);
            return `
            <div class="query-match-card">
              <div class="query-match-info">
                <strong>${tpl.escapeHtml(m.major)}</strong>
                <small>${tpl.escapeHtml(m.college)}</small>
              </div>
              <div class="query-match-campus">
                <span class="campus-badge-lg"><svg><use href="#i-map-pin"/></svg>${tpl.escapeHtml(cName)}</span>
                <button type="button" class="btn btn-secondary btn-sm" data-apply-campus="${tpl.escapeHtml(
                  m.campusId
                )}" data-goto="#/campusLife/dormitory">看宿舍</button>
                <button type="button" class="btn btn-secondary btn-sm" data-apply-campus="${tpl.escapeHtml(
                  m.campusId
                )}" data-goto="#/campusLife/canteen">看食堂</button>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    `;

    $$('[data-apply-campus]', resultStage).forEach((btn) => {
      btn.addEventListener('click', () => {
        setCampus(btn.dataset.applyCampus, true);
        showToast(`已切换至${getCampusName(btn.dataset.applyCampus)}`);
        window.location.hash = btn.dataset.goto;
      });
    });
  };

  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      resultStage.innerHTML = `<p class="query-empty">输入专业关键词或在上方选择学院后，将立即显示对应校区与食宿直达入口。</p>`;
      return;
    }
    const matches = [];
    for (const col of colleges) {
      for (const major of col.majors || []) {
        if (major.toLowerCase().includes(q) || col.college.toLowerCase().includes(q)) {
          matches.push({ major, college: col.college, campusId: col.campusId });
        }
      }
    }
    renderMatches(matches);
  });

  collegeSelect?.addEventListener('change', () => {
    const colName = collegeSelect.value;
    if (searchInput) searchInput.value = '';
    if (!colName) {
      majorSelect.innerHTML = '<option value="">-- 请先选择学院 --</option>';
      majorSelect.disabled = true;
      resultStage.innerHTML = `<p class="query-empty">输入专业关键词或在上方选择学院后，将立即显示对应校区与食宿直达入口。</p>`;
      return;
    }
    const col = colleges.find((c) => c.college === colName);
    if (!col) return;
    majorSelect.innerHTML =
      `<option value="__all__">全部专业 (${col.majors.length} 个)</option>` +
      col.majors.map((m) => `<option value="${tpl.escapeHtml(m)}">${tpl.escapeHtml(m)}</option>`).join('');
    majorSelect.disabled = false;
    renderMatches(col.majors.map((m) => ({ major: m, college: col.college, campusId: col.campusId })));
  });

  majorSelect?.addEventListener('change', () => {
    const col = colleges.find((c) => c.college === collegeSelect.value);
    if (!col) return;
    const val = majorSelect.value;
    const list = val === '__all__' ? col.majors : [val];
    renderMatches(list.map((m) => ({ major: m, college: col.college, campusId: col.campusId })));
  });

  if (presetQuery && searchInput) {
    searchInput.value = presetQuery;
    searchInput.dispatchEvent(new Event('input'));
  }
}

/* ── 交互工具 2：可勾选进度清单 ─────────────────────────────── */
function initChecklistInteractive(container, content) {
  const sections = content.sections || [];
  let total = 0;
  sections.forEach((s) => {
    total += (s.items || []).length;
  });

  const updateProgressBar = () => {
    let done = 0;
    sections.forEach((sec) => {
      const secKey = sec.id || sec.category;
      (sec.items || []).forEach((_, idx) => {
        if (state.checklistChecked.has(`${secKey}::${idx}`)) done += 1;
      });
    });
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const label = $('#checklist-progress-label', container);
    const fill = $('#checklist-progress-fill', container);
    if (label) label.textContent = `${done} / ${total} 项 (${pct}%)`;
    if (fill) fill.style.width = `${pct}%`;
  };

  $$('input[data-check-key]', container).forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const key = checkbox.dataset.checkKey;
      const row = checkbox.closest('.check-row');
      if (checkbox.checked) {
        state.checklistChecked.add(key);
        row?.classList.add('is-checked');
      } else {
        state.checklistChecked.delete(key);
        row?.classList.remove('is-checked');
      }
      saveChecklist();
      updateProgressBar();
    });
  });

  $('#reset-checklist-btn', container)?.addEventListener('click', () => {
    if (state.checklistChecked.size === 0) return;
    state.checklistChecked.clear();
    saveChecklist();
    $$('input[data-check-key]', container).forEach((cb) => {
      cb.checked = false;
      cb.closest('.check-row')?.classList.remove('is-checked');
    });
    updateProgressBar();
    showToast('清单勾选状态已重置');
  });
}

/* ── 交互工具 3：社团星级与关键词检索 ───────────────────────── */
function initClubsInteractive(container, content) {
  const groups = content.clubs || [];
  const grid = $('#clubs-chip-grid', container);
  const tabs = $$('[data-club-level]', container);
  const input = $('#club-search-input', container);
  let activeLevel = 'all';

  const renderGrid = () => {
    const q = (input?.value || '').trim().toLowerCase();
    const items = [];
    for (const g of groups) {
      if (activeLevel !== 'all' && String(g.level) !== activeLevel) continue;
      for (const name of g.list || []) {
        if (q && !name.toLowerCase().includes(q)) continue;
        items.push({ name, level: g.level, label: g.label });
      }
    }
    if (!items.length) {
      grid.innerHTML = `<p class="query-empty" style="grid-column: 1 / -1;">没有找到匹配的社团。</p>`;
      return;
    }
    grid.innerHTML = items
      .map((c) => {
        const stars = c.level > 0 ? '★'.repeat(c.level) : '待整改';
        return `
          <div class="club-chip">
            <span>${tpl.escapeHtml(c.name)}</span>
            <span class="club-stars" title="${tpl.escapeHtml(c.label)}">${tpl.escapeHtml(stars)}</span>
          </div>
        `;
      })
      .join('');
  };

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeLevel = btn.dataset.clubLevel;
      tabs.forEach((b) => b.classList.toggle('is-active', b === btn));
      renderGrid();
    });
  });

  input?.addEventListener('input', renderGrid);
  renderGrid();
}

/* ── 移动端侧栏抽屉、弹窗与全屏灯箱 ─────────────────────────── */
function initShellControls() {
  const sidebar = $('#guide-sidebar');
  const backdrop = $('#sidebar-backdrop');
  const toggleBtn = $('#sidebar-toggle-btn');

  const setSidebarOpen = (open) => {
    sidebar?.classList.toggle('is-open', open);
    if (backdrop) backdrop.hidden = !open;
    toggleBtn?.setAttribute('aria-expanded', String(open));
  };

  toggleBtn?.addEventListener('click', () => {
    setSidebarOpen(!sidebar?.classList.contains('is-open'));
  });
  $('#mobile-tab-menu')?.addEventListener('click', () => setSidebarOpen(true));
  $('#sidebar-close-btn')?.addEventListener('click', () => setSidebarOpen(false));
  backdrop?.addEventListener('click', () => setSidebarOpen(false));

  // 点击目录项后自动收起抽屉
  $('#sidebar-nav')?.addEventListener('click', (e) => {
    if (e.target.closest('a')) setSidebarOpen(false);
  });

  // 通用 Dialog 点击外部遮罩与关闭按钮
  $$('dialog.modal-dialog').forEach((dlg) => {
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) dlg.close();
    });
  });
  $$('[data-close-dialog]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dlg = document.getElementById(btn.dataset.closeDialog);
      dlg?.close();
    });
  });

  // 校区选择弹窗
  const openCampusModal = () => {
    syncCampusLabels();
    $('#campus-dialog')?.showModal();
  };
  $('#open-campus-btn')?.addEventListener('click', openCampusModal);
  $('#mobile-tab-campus')?.addEventListener('click', openCampusModal);
  $$('[data-select-campus]').forEach((card) => {
    card.addEventListener('click', () => {
      setCampus(card.dataset.selectCampus);
      $('#campus-dialog')?.close();
    });
  });

  // 勘误反馈弹窗
  $('#sidebar-feedback-btn')?.addEventListener('click', () => {
    setSidebarOpen(false);
    openFeedbackDialog();
  });
  $('#footer-feedback-btn')?.addEventListener('click', openFeedbackDialog);
  initFeedbackForm();

  // 全局搜索弹窗与快捷键
  initGlobalSearch();

  // 灯箱控制
  initLightboxControls();
}

function openFeedbackDialog() {
  const ctxEl = $('#feedback-page-context');
  if (ctxEl) ctxEl.textContent = `关联章节：${state.currentChapterLabel}`;
  $('#feedback-dialog')?.showModal();
}

function initFeedbackForm() {
  const form = $('#feedback-form');
  const submitBtn = $('#feedback-submit-btn');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = $('#feedback-content')?.value.trim() || '';
    const contact = $('#feedback-contact')?.value.trim() || '';
    if (!content) {
      showToast('请填写反馈或勘误内容');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    try {
      await submitFeedback({ content, contact, page: state.currentChapterLabel });
      form.reset();
      $('#feedback-dialog')?.close();
      showToast('感谢你的勘误反馈，我们会尽快核实更新！');
    } catch (err) {
      showToast(err.message || '提交失败，请稍后重试');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '提交反馈';
    }
  });
}

function initGlobalSearch() {
  const dialog = $('#search-dialog');
  const input = $('#global-search-input');
  const resultsEl = $('#global-search-results');

  const renderSearchHits = () => {
    const q = (input?.value || '').trim().toLowerCase();
    const hits = q
      ? state.searchIndex.filter((item) => item.keywords.includes(q)).slice(0, 18)
      : state.searchIndex.slice(0, 8);
    state.searchResults = hits;
    state.searchFocusIndex = 0;

    if (!hits.length) {
      resultsEl.innerHTML = `<p class="query-empty" style="padding: 24px 12px;">没有匹配“${tpl.escapeHtml(
        input.value
      )}”的结果，试试“宿舍”“宽带”“转专业”或具体专业名。</p>`;
      return;
    }

    resultsEl.innerHTML = hits
      .map(
        (hit, idx) => `
      <a
        href="${tpl.safeUrl(hit.route)}"
        class="search-hit ${idx === 0 ? 'is-focused' : ''}"
        data-hit-index="${idx}"
      >
        <div>
          <strong>${tpl.escapeHtml(hit.title)}</strong>
          <small>${tpl.escapeHtml(hit.subtitle)}</small>
        </div>
        <span class="search-hit-badge">${tpl.escapeHtml(hit.badge)}</span>
      </a>
    `
      )
      .join('');
  };

  const selectHit = (hit) => {
    if (!hit) return;
    dialog?.close();
    if (hit.campusId) {
      setCampus(hit.campusId, true);
    }
    if (hit.majorQuery && window.location.hash === '#/preparation/campusQuery') {
      renderCurrentRoute({ presetMajorQuery: hit.majorQuery });
    } else if (hit.majorQuery) {
      window.location.hash = hit.route;
      window.setTimeout(() => renderCurrentRoute({ presetMajorQuery: hit.majorQuery }), 20);
    } else {
      window.location.hash = hit.route;
    }
  };

  const openSearch = () => {
    if (!dialog) return;
    renderSearchHits();
    dialog.showModal();
    input?.focus();
    input?.select();
  };

  $('#open-search-btn')?.addEventListener('click', openSearch);
  $('#mobile-tab-search')?.addEventListener('click', openSearch);
  $('#close-search-btn')?.addEventListener('click', () => dialog?.close());

  input?.addEventListener('input', renderSearchHits);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      dialog?.close();
      return;
    }
    const items = $$('.search-hit', resultsEl);
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.searchFocusIndex = (state.searchFocusIndex + 1) % items.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.searchFocusIndex = (state.searchFocusIndex - 1 + items.length) % items.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectHit(state.searchResults[state.searchFocusIndex]);
      return;
    } else {
      return;
    }
    items.forEach((el, i) => el.classList.toggle('is-focused', i === state.searchFocusIndex));
    items[state.searchFocusIndex]?.scrollIntoView({ block: 'nearest' });
  });

  resultsEl?.addEventListener('click', (e) => {
    const link = e.target.closest('.search-hit');
    if (!link) return;
    e.preventDefault();
    selectHit(state.searchResults[Number(link.dataset.hitIndex || 0)]);
  });

  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const tag = active?.tagName;
    const inputType = active?.type?.toLowerCase?.() || '';
    const isTextInput =
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      active?.isContentEditable ||
      (tag === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(inputType));
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
    } else if (e.key === '/' && !isTextInput && !$('dialog[open]')) {
      e.preventDefault();
      openSearch();
    }
  });
}

function openLightbox(index) {
  if (!state.lightboxPhotos.length) return;
  state.lightboxIndex = (index + state.lightboxPhotos.length) % state.lightboxPhotos.length;
  updateLightboxImage();
  $('#lightbox-dialog')?.showModal();
}

function updateLightboxImage() {
  const photo = state.lightboxPhotos[state.lightboxIndex];
  if (!photo) return;
  const img = $('#lightbox-img');
  const cap = $('#lightbox-caption');
  if (img) {
    img.src = photo.src;
    img.alt = photo.caption || '';
  }
  if (cap) {
    cap.textContent = `${photo.caption || ''} (${state.lightboxIndex + 1} / ${state.lightboxPhotos.length})`;
  }
  const multi = state.lightboxPhotos.length > 1;
  const prev = $('#lightbox-prev');
  const next = $('#lightbox-next');
  if (prev) prev.hidden = !multi;
  if (next) next.hidden = !multi;
}

function initLightboxControls() {
  const step = (delta) => {
    if (!state.lightboxPhotos.length) return;
    state.lightboxIndex =
      (state.lightboxIndex + delta + state.lightboxPhotos.length) % state.lightboxPhotos.length;
    updateLightboxImage();
  };
  $('#lightbox-prev')?.addEventListener('click', () => step(-1));
  $('#lightbox-next')?.addEventListener('click', () => step(1));
  document.addEventListener('keydown', (e) => {
    if (!$('#lightbox-dialog')?.open) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
}

/* ── 启动入口 ───────────────────────────────────────────────── */
async function boot() {
  const yearEl = $('#footer-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  initTheme();
  loadLocalPreferences();
  initShellControls();

  try {
    const { guideData, campusData } = await loadAllGuideData();
    if (!guideData.length) throw new Error('指南数据为空');
    state.guideData = guideData;
    state.campusData = campusData;

    buildChaptersAndSearchIndex();
    renderSidebarNav();
    syncCampusLabels();
    renderCurrentRoute();
    window.addEventListener('hashchange', () => renderCurrentRoute());
  } catch (err) {
    console.error('Guide boot failed:', err);
    const container = $('#article-container');
    if (container) {
      container.innerHTML = `
        <div class="info-card" style="text-align:center; padding: 40px 24px;">
          <h2>指南加载遇到一点问题</h2>
          <p>${tpl.escapeHtml(err.message || '请检查网络连接后刷新页面重试。')}</p>
          <div style="margin-top: 18px;">
            <button type="button" class="btn btn-primary" onclick="location.reload()">重新加载</button>
          </div>
        </div>
      `;
    }
  }
}

boot();
