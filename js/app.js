/**
 * @file 江苏海洋大学校园指南主应用控制器（同构 SSR 水合 + History SPA 秒切）
 * @description 支持双模态门户/三栏阅读、干净路径路由（向下兼容旧 #/ 锚点）、全局模糊高亮检索与交互式小工具。
 */

import { loadAllGuideData, loadCommunityFeed, submitFeedback } from '../services/api.js';
import * as tpl from './templates.js';

const CHECKLIST_STORAGE_KEY = 'jhd-guide-checklist-v1';
const CUSTOM_ITEMS_STORAGE_KEY = 'jhd-guide-custom-items-v1';
const CAMPUS_STORAGE_KEY = 'selectedCampus';
const THEME_STORAGE_KEY = 'jhd-theme';

const state = {
  guideData: [],
  campusData: { campuses: [], canteens: [], dormitories: [], colleges: [] },
  communityTopics: tpl.DEFAULT_COMMUNITY_TOPICS,
  searchIndex: [],
  selectedCampus: 'cangwu',
  checklistChecked: new Set(),
  customChecklistItems: [],
  checklistFilter: 'all',
  activePlaceTrait: 'all',
  activeTransitHub: 'lyg_station',
  currentChapterLabel: '指南门户总览',
  lightboxPhotos: [],
  lightboxIndex: 0,
  searchResults: [],
  searchFocusIndex: 0
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let toastTimer = null;
let tocObserver = null;

function showToast(message) {
  const toast = $('#toast');
  const textEl = $('#toast-text');
  if (!toast || !textEl) return;
  textEl.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2500);
}

/* ── 旧版 #/ Hash URL 无缝迁移至干净路径 ─────────────────────── */
function migrateLegacyHashIfPresent() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#/')) return;
  const raw = hash.slice(1);
  const target = raw === '/home/home' || raw === '/home' ? '/' : raw;
  window.history.replaceState({}, '', target);
}

/* ── 本地偏好读取与持久化 ───────────────────────────────────── */
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
    const rawCustom = localStorage.getItem(CUSTOM_ITEMS_STORAGE_KEY);
    if (rawCustom) {
      const parsedCustom = JSON.parse(rawCustom);
      if (Array.isArray(parsedCustom)) {
        state.customChecklistItems = parsedCustom.filter(
          (x) => x && typeof x.id === 'string' && typeof x.text === 'string'
        );
      }
    }
  } catch {
    // 忽略隐私浏览存储限制
  }
}

function saveChecklist() {
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify([...state.checklistChecked]));
  } catch {}
}

function saveCustomChecklistItems() {
  try {
    localStorage.setItem(CUSTOM_ITEMS_STORAGE_KEY, JSON.stringify(state.customChecklistItems));
  } catch {}
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
  $$('.nav-campus-tag').forEach((badge) => {
    badge.textContent = shortName;
  });
}

function setCampus(campusId, silent = false) {
  const valid = state.campusData.campuses.some((c) => c.id === campusId);
  if (!valid) return;
  state.selectedCampus = campusId;
  state.activePlaceTrait = 'all';
  try {
    localStorage.setItem(CAMPUS_STORAGE_KEY, campusId);
  } catch {}
  syncCampusLabels();
  renderCurrentRoute({ keepScroll: true });
  if (!silent) {
    showToast(`已切换至 ${getCampusName(campusId)}`);
  }
}

/* ── 主题系统 ───────────────────────────────────────────────── */
function initTheme() {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (theme, persist = false) => {
    document.documentElement.dataset.theme = theme;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#090d14' : '#f4f6fa';
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

/* ── 全局检索索引构建（支持加权多词匹配） ─────────────────────── */
function buildSearchIndex() {
  state.searchIndex = [];

  for (const cat of state.guideData) {
    for (const page of cat.pages || []) {
      const route = tpl.toRouteHref(cat.key, page.pageKey);
      const sc = page.structuredContent || {};
      const bodyParts = [page.title, page.subtitle || ''];
      (sc.points || []).forEach((p) => bodyParts.push(p.title, p.description));
      (sc.steps || []).forEach((s) => bodyParts.push(s.title, s.description));
      (sc.hubs || []).forEach((h) => bodyParts.push(h.name, h.desc));
      (sc.sections || []).forEach((s) => {
        bodyParts.push(s.title || s.category || '');
        (s.items || []).forEach((i) => bodyParts.push(i));
      });

      state.searchIndex.push({
        title: page.title,
        subtitle: page.subtitle || `${cat.title}章节`,
        badge: cat.isHomePage ? '门户总览' : cat.title,
        route,
        titleLower: page.title.toLowerCase(),
        keywords: bodyParts.join(' ').toLowerCase()
      });

      if (page.type === 'faq' && Array.isArray(sc.items)) {
        for (const qa of sc.items) {
          state.searchIndex.push({
            title: qa.q,
            subtitle: qa.a.slice(0, 72) + (qa.a.length > 72 ? '…' : ''),
            badge: '常见问答',
            route,
            titleLower: qa.q.toLowerCase(),
            keywords: `${qa.q} ${qa.a}`.toLowerCase()
          });
        }
      }

      if (page.type === 'clubs' && Array.isArray(sc.clubs)) {
        for (const group of sc.clubs) {
          for (const clubName of group.list || []) {
            state.searchIndex.push({
              title: clubName,
              subtitle: `${group.label} · 学生社团`,
              badge: '学生社团',
              route,
              titleLower: clubName.toLowerCase(),
              keywords: `${clubName} ${group.label} 社团 百团大战`.toLowerCase()
            });
          }
        }
      }
    }
  }

  for (const item of state.campusData.canteens || []) {
    const cName = getCampusName(item.campusId);
    const foods = (item.details || []).flatMap((d) => d.specialty || []).join('、');
    const title = `${item.name}（${cName}）`;
    state.searchIndex.push({
      title,
      subtitle: foods ? `特色：${foods}` : item.summary || '',
      badge: '食堂实拍',
      route: tpl.toRouteHref('campusLife', 'canteen', item.id),
      titleLower: title.toLowerCase(),
      keywords: `${item.name} ${cName} ${item.summary || ''} ${foods} ${(item.tags || []).join(' ')} 食堂 餐厅`.toLowerCase()
    });
  }

  for (const item of state.campusData.dormitories || []) {
    const cName = getCampusName(item.campusId);
    const shortC = cName.replace('校区', '');
    const specText = (item.details || [])
      .map((d) => `${d.building || ''} ${d.layout || ''} ${d.roomType || ''} ${d.bathroom || ''}`)
      .join(' ');
    const title = item.name.includes(shortC) ? item.name : `${item.name}（${cName}）`;
    state.searchIndex.push({
      title,
      subtitle: item.summary || specText,
      badge: '宿舍实拍',
      route: tpl.toRouteHref('campusLife', 'dormitory', item.id),
      titleLower: title.toLowerCase(),
      keywords: `${item.name} ${cName} ${item.summary || ''} ${specText} ${(item.tags || []).join(' ')} 宿舍 寝室 公寓`.toLowerCase()
    });
  }

  for (const col of state.campusData.colleges || []) {
    const cName = getCampusName(col.campusId);
    for (const major of col.majors || []) {
      const title = `${major} → ${cName}`;
      state.searchIndex.push({
        title,
        subtitle: `${col.college}${col.note ? ` · ${col.note}` : ''}`,
        badge: '校区归属',
        route: `/preparation/campusQuery?q=${encodeURIComponent(major.split('（')[0])}`,
        campusId: col.campusId,
        titleLower: title.toLowerCase(),
        keywords: `${major} ${col.college} ${cName} ${col.note || ''} 校区`.toLowerCase()
      });
    }
  }
}

/* ── SPA 导航与视图渲染 ─────────────────────────────────────── */
function navigateTo(url, { replace = false } = {}) {
  const target = new URL(url, window.location.origin);
  const current = window.location.pathname + window.location.search;
  const next = target.pathname + target.search;

  if (current !== next) {
    state.activePlaceTrait = 'all';
    if (replace) window.history.replaceState({}, '', next);
    else window.history.pushState({}, '', next);
  }

  const queryMajor = target.searchParams.get('q') || '';
  renderCurrentRoute({ keepScroll: false, presetMajorQuery: queryMajor });

  if (target.hash) {
    const anchor = document.getElementById(target.hash.slice(1));
    anchor?.scrollIntoView({ behavior: 'smooth' });
  }
}

function renderCurrentRoute({ keepScroll = false, presetMajorQuery = '' } = {}) {
  const container = $('#article-container');
  const sidebarNav = $('#sidebar-nav');
  const tocAside = $('#guide-toc');
  if (!container) return;

  const resolved = tpl.resolveRouteFromPathname(
    window.location.pathname,
    state.guideData,
    state.campusData
  );

  if (resolved.detailItem?.campusId && resolved.detailItem.campusId !== state.selectedCampus) {
    state.selectedCampus = resolved.detailItem.campusId;
  }

  const bundle = tpl.buildRouteRenderBundle({
    resolved,
    guideData: state.guideData,
    campusData: state.campusData,
    selectedCampus: state.selectedCampus,
    checklistChecked: state.checklistChecked,
    customChecklistItems: state.customChecklistItems,
    checklistFilter: state.checklistFilter,
    communityTopics: state.communityTopics,
    activePlaceTrait: state.activePlaceTrait,
    activeTransitHub: state.activeTransitHub
  });

  document.body.dataset.view = bundle.viewMode;
  document.title = bundle.title;
  state.currentChapterLabel = bundle.currentChapterLabel;
  state.lightboxPhotos = bundle.lightboxPhotos || [];

  if (sidebarNav) sidebarNav.innerHTML = bundle.sidebarHtml;
  container.innerHTML = bundle.mainHtml;
  if (tocAside) tocAside.innerHTML = bundle.tocHtml;

  syncCampusLabels();

  // 同步顶栏与移动端底栏激活态
  $('[data-eco-portal]')?.classList.toggle('is-active', bundle.viewMode === 'portal');
  $('[data-eco-reader]')?.classList.toggle('is-active', bundle.viewMode === 'reader');
  $$('.mobile-tabbar [data-tab="home"]').forEach((el) => {
    el.classList.toggle('is-active', bundle.viewMode === 'portal');
  });

  // 初始化当前页专属交互模块
  const page = resolved.page;
  if (resolved.valid && !resolved.isPortal && !resolved.detailId && page) {
    const urlQuery = presetMajorQuery || new URLSearchParams(window.location.search).get('q') || '';
    if (page.type === 'campusQuery') initCampusQueryInteractive(container, urlQuery);
    if (page.type === 'transitMap') initTransitMapInteractive(container, page.structuredContent);
    if (page.type === 'checklist') initChecklistInteractive(container, page.structuredContent);
    if (page.type === 'clubs') initClubsInteractive(container, page.structuredContent);
    if (page.tool === 'pppoeGenerator') initPppoeGeneratorInteractive(container);
    if (page.isCampusSpecific) initCampusPlacesFilter(container);
  }

  bindRenderedEnhancements(container);
  initRightTocScrollSpy();

  if (!keepScroll) {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

/* ── 绑定页面内通用增强 ─────────────────────────────────────── */
function bindRenderedEnhancements(container) {
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

  $$('[data-apply-campus]', container).forEach((btn) => {
    btn.addEventListener('click', () => {
      setCampus(btn.dataset.applyCampus, true);
      showToast(`已切换至 ${getCampusName(btn.dataset.applyCampus)}`);
      if (btn.dataset.goto) navigateTo(btn.dataset.goto);
    });
  });

  $$('[data-open-search]', container).forEach((btn) => {
    btn.addEventListener('click', () => openSearchModal());
  });

  $('[data-copy-link]', container)?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('本页链接已复制，微信/QQ 转发将自动显示专属标题');
    } catch {
      showToast('请直接复制浏览器地址栏链接');
    }
  });

  $$('[data-open-feedback]').forEach((btn) => {
    btn.onclick = () => openFeedbackDialog();
  });

  $('[data-scroll-top]')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

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

function initRightTocScrollSpy() {
  tocObserver?.disconnect();
  const links = $$('#toc-list a[data-toc-target]');
  if (!links.length) return;

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(link.dataset.tocTarget);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  if (!('IntersectionObserver' in window)) return;
  const targets = links
    .map((l) => document.getElementById(l.dataset.tocTarget))
    .filter(Boolean);
  if (!targets.length) return;

  tocObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((en) => en.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      links.forEach((l) => {
        l.classList.toggle('is-active', l.dataset.tocTarget === visible.target.id);
      });
    },
    { rootMargin: '-84px 0px -68% 0px', threshold: [0, 1] }
  );
  targets.forEach((el) => tocObserver.observe(el));
}

/* ── 交互模块 1：大一校区查询 ───────────────────────────────── */
function initCampusQueryInteractive(container, presetQuery = '') {
  const searchInput = $('#major-instant-input', container);
  const collegeSelect = $('#query-college-select', container);
  const pills = $$('[data-query-campus]', container);
  const resultStage = $('#query-result-stage', container);
  const colleges = state.campusData.colleges || [];
  let campusFilter = 'all';

  const renderResults = () => {
    const q = (searchInput?.value || '').trim();
    const qLower = q.toLowerCase();
    const selectedColId = collegeSelect?.value || '';

    const matchedCards = [];
    for (const col of colleges) {
      if (campusFilter !== 'all' && col.campusId !== campusFilter) continue;
      if (selectedColId && col.id !== selectedColId) continue;

      if (!qLower) {
        matchedCards.push({
          title: col.college,
          subtitle: (col.majors || []).join(' · '),
          note: col.note || '',
          campusId: col.campusId
        });
      } else {
        const hitMajors = (col.majors || []).filter(
          (m) => m.toLowerCase().includes(qLower) || col.college.toLowerCase().includes(qLower)
        );
        for (const m of hitMajors) {
          matchedCards.push({
            title: m,
            subtitle: `所属学院：${col.college}`,
            note: col.note || '',
            campusId: col.campusId
          });
        }
      }
    }

    if (!matchedCards.length) {
      resultStage.innerHTML = `<div class="empty-state-box"><p>未找到匹配的专业或学院，请尝试更短关键词（如“计算机”“建筑”“会计”“应用技术”）或切换至「全部校区」。</p></div>`;
      return;
    }

    resultStage.innerHTML = `
      <div class="query-matches">
        ${matchedCards
          .slice(0, 18)
          .map((item) => {
            const cName = getCampusName(item.campusId);
            return `
            <div class="query-match-card" data-campus-tone="${tpl.escapeHtml(item.campusId)}">
              <div class="query-match-info">
                <strong>${tpl.highlightMatch(item.title, q)}</strong>
                <small>${tpl.highlightMatch(item.subtitle, q)}</small>
                ${item.note ? `<span class="query-match-note">${tpl.escapeHtml(item.note)}</span>` : ''}
              </div>
              <div class="query-match-campus">
                <span class="campus-badge-lg"><svg><use href="#i-map-pin"/></svg>${tpl.escapeHtml(cName)}</span>
                <div class="query-card-btns">
                  <button type="button" class="btn btn-secondary btn-sm" data-apply-campus="${tpl.escapeHtml(item.campusId)}" data-goto="/campusLife/dormitory">看宿舍</button>
                  <button type="button" class="btn btn-secondary btn-sm" data-apply-campus="${tpl.escapeHtml(item.campusId)}" data-goto="/campusLife/canteen">看食堂</button>
                  <a class="btn btn-ghost btn-sm" href="/preparation/arrivalAndMap" data-link>乘车路线</a>
                </div>
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
        showToast(`已切换至 ${getCampusName(btn.dataset.applyCampus)}`);
        navigateTo(btn.dataset.goto);
      });
    });
  };

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      campusFilter = pill.dataset.queryCampus;
      if (collegeSelect) collegeSelect.value = '';
      pills.forEach((p) => p.classList.toggle('is-active', p === pill));
      renderResults();
    });
  });

  collegeSelect?.addEventListener('change', () => {
    if (searchInput) searchInput.value = '';
    campusFilter = 'all';
    pills.forEach((p) => p.classList.toggle('is-active', p.dataset.queryCampus === 'all'));
    renderResults();
  });

  searchInput?.addEventListener('input', () => {
    if (collegeSelect) collegeSelect.value = '';
    renderResults();
  });

  if (presetQuery && searchInput) {
    searchInput.value = presetQuery;
    renderResults();
  }
}

/* ── 交互模块 2：到校交通枢纽切换 ───────────────────────────── */
function initTransitMapInteractive(container, content = {}) {
  const tabs = $$('[data-transit-hub]', container);
  const descEl = $('#transit-hub-desc', container);
  const gridEl = $('#transit-routes-grid', container);
  const hubs = content.hubs || [];

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const hubId = tab.dataset.transitHub;
      state.activeTransitHub = hubId;
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });
      const hubObj = hubs.find((h) => h.id === hubId);
      if (descEl && hubObj) descEl.textContent = hubObj.desc || '';
      if (gridEl) {
        gridEl.innerHTML = tpl.renderTransitRouteCards(state.campusData.campuses || [], hubId);
      }
    });
  });
}

/* ── 交互模块 3：必备清单（状态过滤 + 自定义增删） ─────────── */
function initChecklistInteractive(container, content = {}) {
  const sections = content.sections || [];
  const sectionsWrap = $('.checklist-sections', container);

  const computeAndSyncProgress = () => {
    let total = state.customChecklistItems.length;
    let done = 0;
    sections.forEach((sec) => {
      const secKey = sec.id || sec.category;
      (sec.items || []).forEach((_, idx) => {
        total += 1;
        if (state.checklistChecked.has(`${secKey}::${idx}`)) done += 1;
      });
    });
    state.customChecklistItems.forEach((ci) => {
      if (state.checklistChecked.has(`custom::${ci.id}`)) done += 1;
    });
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const label = $('#checklist-progress-label', container);
    const fill = $('#checklist-progress-fill', container);
    if (label) label.textContent = `${done} / ${total} 项 (${pct}%)`;
    if (fill) fill.style.width = `${pct}%`;
  };

  const bindCheckbox = (checkbox) => {
    checkbox.addEventListener('change', () => {
      const key = checkbox.dataset.checkKey;
      const row = checkbox.closest('.check-row');
      if (checkbox.checked) {
        state.checklistChecked.add(key);
        row?.classList.add('is-checked');
        if (row) row.dataset.itemChecked = '1';
      } else {
        state.checklistChecked.delete(key);
        row?.classList.remove('is-checked');
        if (row) row.dataset.itemChecked = '0';
      }
      saveChecklist();
      computeAndSyncProgress();
    });
  };

  $$('input[data-check-key]', container).forEach(bindCheckbox);

  $$('[data-check-filter]', container).forEach((pill) => {
    pill.addEventListener('click', () => {
      state.checklistFilter = pill.dataset.checkFilter;
      $$('[data-check-filter]', container).forEach((p) => p.classList.toggle('is-active', p === pill));
      if (sectionsWrap) sectionsWrap.dataset.checkFilterMode = state.checklistFilter;
    });
  });

  const bindDeleteBtn = (btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteCustom;
      state.customChecklistItems = state.customChecklistItems.filter((x) => x.id !== id);
      state.checklistChecked.delete(`custom::${id}`);
      saveCustomChecklistItems();
      saveChecklist();
      renderCurrentRoute({ keepScroll: true });
      showToast('已移除自定义物品');
    });
  };
  $$('[data-delete-custom]', container).forEach(bindDeleteBtn);

  $('#custom-check-form', container)?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#custom-check-input', container);
    const text = (input?.value || '').trim();
    if (!text) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    state.customChecklistItems.unshift({ id, text });
    saveCustomChecklistItems();
    renderCurrentRoute({ keepScroll: true });
    showToast(`已添加「${text}」`);
  });

  $('#reset-checklist-btn', container)?.addEventListener('click', () => {
    if (state.checklistChecked.size === 0) return;
    state.checklistChecked.clear();
    saveChecklist();
    renderCurrentRoute({ keepScroll: true });
    showToast('勾选进度已重置');
  });
}

/* ── 交互模块 4：宽带 PPPoE 拨号账号一键生成器 ──────────────── */
function initPppoeGeneratorInteractive(container) {
  const sidInput = $('#pppoe-sid-input', container);
  const pills = $$('[data-carrier]', container);
  const codeEl = $('#pppoe-result-code', container);
  const copyBtn = $('#pppoe-copy-btn', container);
  let suffix = '@cmcc';

  const updatePreview = () => {
    const sid = (sidInput?.value || '').trim().replace(/\s+/g, '') || '2026123456';
    if (codeEl) codeEl.textContent = `${sid}${suffix}`;
  };

  sidInput?.addEventListener('input', updatePreview);
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      suffix = pill.dataset.carrier;
      pills.forEach((p) => p.classList.toggle('is-active', p === pill));
      updatePreview();
    });
  });

  copyBtn?.addEventListener('click', async () => {
    const rawSid = (sidInput?.value || '').trim();
    const value = codeEl?.textContent || '';
    try {
      await navigator.clipboard.writeText(value);
      showToast(rawSid ? `已复制宽带账号：${value}` : `已复制示例账号（输入你的学号可生成专属账号）`);
    } catch {
      showToast(`请手动复制：${value}`);
    }
  });
}

/* ── 交互模块 5：宿舍/食堂特征筛选与社团检索 ────────────────── */
function initCampusPlacesFilter(container) {
  $$('[data-place-trait]', container).forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activePlaceTrait = btn.dataset.placeTrait;
      renderCurrentRoute({ keepScroll: true });
    });
  });
}

function initClubsInteractive(container, content = {}) {
  const groups = content.clubs || [];
  const grid = $('#clubs-chip-grid', container);
  const tabs = $$('[data-club-level]', container);
  const input = $('#club-search-input', container);
  let activeLevel = 'all';

  const renderGrid = () => {
    const q = (input?.value || '').trim();
    const qLower = q.toLowerCase();
    const items = [];
    for (const g of groups) {
      if (activeLevel !== 'all' && String(g.level) !== activeLevel) continue;
      for (const name of g.list || []) {
        if (qLower && !name.toLowerCase().includes(qLower)) continue;
        items.push({ name, level: g.level, label: g.label });
      }
    }
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state-box" style="grid-column: 1 / -1;"><p>没有找到匹配的社团，试试更短的关键词。</p></div>`;
      return;
    }
    grid.innerHTML = items
      .map((c) => {
        const stars = c.level > 0 ? '★'.repeat(c.level) : '观察期';
        return `
          <div class="club-chip">
            <span>${tpl.highlightMatch(c.name, q)}</span>
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
}

/* ── 壳层控制：抽屉、SPA 拦截、搜索弹窗 (Cmd/Ctrl+K)、灯箱 ─── */
function openSearchModal() {
  const dialog = $('#search-dialog');
  const input = $('#global-search-input');
  if (!dialog) return;
  dialog.showModal();
  window.dispatchEvent(new CustomEvent('jhd-refresh-search'));
  requestAnimationFrame(() => input?.focus());
}

function openFeedbackDialog() {
  const ctxEl = $('#feedback-page-context');
  if (ctxEl) ctxEl.textContent = `关联页面：${state.currentChapterLabel}`;
  $('#feedback-dialog')?.showModal();
}

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

  // 全站事件委托：拦截所有同源 data-link 实现零刷新秒切
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:')) return;
    e.preventDefault();
    setSidebarOpen(false);
    navigateTo(href);
  });

  window.addEventListener('popstate', () => {
    renderCurrentRoute({ keepScroll: false });
  });

  // 通用 Dialog 遮罩与关闭
  $$('dialog.modal-dialog').forEach((dlg) => {
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) dlg.close();
    });
  });
  $$('[data-close-dialog]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.closeDialog)?.close();
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

  // 勘误反馈提交
  $('#sidebar-feedback-btn')?.addEventListener('click', () => {
    setSidebarOpen(false);
    openFeedbackDialog();
  });
  $('#footer-feedback-btn')?.addEventListener('click', openFeedbackDialog);

  const form = $('#feedback-form');
  const submitBtn = $('#feedback-submit-btn');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = $('#feedback-content')?.value.trim() || '';
    const contact = $('#feedback-contact')?.value.trim() || '';
    if (!content) {
      showToast('请填写勘误或建议内容');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    try {
      await submitFeedback({ content, contact, page: state.currentChapterLabel });
      form.reset();
      $('#feedback-dialog')?.close();
      showToast('感谢你的勘误反馈，我们将尽快核实修订！');
    } catch (err) {
      showToast(err.message || '提交失败，请稍后重试');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '提交勘误';
    }
  });

  initGlobalSearch();
  initLightboxControls();
}

function initGlobalSearch() {
  const dialog = $('#search-dialog');
  const input = $('#global-search-input');
  const resultsEl = $('#global-search-results');

  const scoreItem = (item, tokens) => {
    let score = 0;
    for (const tk of tokens) {
      if (!item.keywords.includes(tk)) return 0;
      if (item.titleLower.startsWith(tk)) score += 12;
      else if (item.titleLower.includes(tk)) score += 8;
      else score += 3;
    }
    return score;
  };

  const renderSearchHits = () => {
    const raw = (input?.value || '').trim();
    const tokens = raw.toLowerCase().split(/\s+/).filter(Boolean);

    const hits = tokens.length
      ? state.searchIndex
          .map((item) => ({ item, score: scoreItem(item, tokens) }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 16)
          .map((x) => x.item)
      : state.searchIndex.slice(0, 8);

    state.searchResults = hits;
    state.searchFocusIndex = 0;

    if (!hits.length) {
      resultsEl.innerHTML = `<div class="search-empty">未找到与「${tpl.escapeHtml(raw)}」相关的内容，试试搜“计算机”“上床下桌”“连云港站”或“宽带”。</div>`;
      return;
    }

    resultsEl.innerHTML = hits
      .map(
        (hit, idx) => `
        <button
          type="button"
          class="search-hit-row ${idx === 0 ? 'is-focused' : ''}"
          data-hit-index="${idx}"
          role="option"
          aria-selected="${idx === 0 ? 'true' : 'false'}"
        >
          <div>
            <strong>${tpl.highlightMatch(hit.title, raw)}</strong>
            <small>${tpl.highlightMatch(hit.subtitle, raw)}</small>
          </div>
          <span class="hit-badge">${tpl.escapeHtml(hit.badge)}</span>
        </button>
      `
      )
      .join('');

    $$('[data-hit-index]', resultsEl).forEach((row) => {
      row.addEventListener('click', () => activateHit(Number(row.dataset.hitIndex)));
    });
  };

  const activateHit = (idx) => {
    const hit = state.searchResults[idx];
    if (!hit) return;
    dialog?.close();
    if (hit.campusId) setCampus(hit.campusId, true);
    navigateTo(hit.route);
  };

  const updateFocusRow = () => {
    const rows = $$('[data-hit-index]', resultsEl);
    rows.forEach((r, i) => {
      const focused = i === state.searchFocusIndex;
      r.classList.toggle('is-focused', focused);
      r.setAttribute('aria-selected', String(focused));
      if (focused) r.scrollIntoView({ block: 'nearest' });
    });
  };

  $('#open-search-btn')?.addEventListener('click', openSearchModal);
  $('#mobile-tab-search')?.addEventListener('click', openSearchModal);
  $('#close-search-btn')?.addEventListener('click', () => dialog?.close());
  window.addEventListener('jhd-refresh-search', renderSearchHits);
  input?.addEventListener('input', renderSearchHits);

  input?.addEventListener('keydown', (e) => {
    if (!state.searchResults.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.searchFocusIndex = (state.searchFocusIndex + 1) % state.searchResults.length;
      updateFocusRow();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.searchFocusIndex =
        (state.searchFocusIndex - 1 + state.searchResults.length) % state.searchResults.length;
      updateFocusRow();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activateHit(state.searchFocusIndex);
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearchModal();
      return;
    }
    if (e.key === '/' && !dialog?.open) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      openSearchModal();
    }
  });
}

/* ── 全屏图片灯箱 ───────────────────────────────────────────── */
function openLightbox(index) {
  if (!state.lightboxPhotos.length) return;
  state.lightboxIndex =
    ((index % state.lightboxPhotos.length) + state.lightboxPhotos.length) %
    state.lightboxPhotos.length;
  syncLightboxSlide();
  $('#lightbox-dialog')?.showModal();
}

function syncLightboxSlide() {
  const photo = state.lightboxPhotos[state.lightboxIndex];
  if (!photo) return;
  const img = $('#lightbox-img');
  const cap = $('#lightbox-caption');
  if (img) {
    img.src = photo.src;
    img.alt = photo.caption || '';
  }
  if (cap) {
    cap.textContent = `${state.lightboxIndex + 1} / ${state.lightboxPhotos.length} · ${photo.caption || ''}`;
  }
}

function initLightboxControls() {
  const step = (delta) => {
    if (!state.lightboxPhotos.length) return;
    state.lightboxIndex =
      (state.lightboxIndex + delta + state.lightboxPhotos.length) % state.lightboxPhotos.length;
    syncLightboxSlide();
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
async function bootstrap() {
  migrateLegacyHashIfPresent();
  const yearEl = $('#footer-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  initTheme();
  loadLocalPreferences();
  initShellControls();

  try {
    const [{ guideData, campusData }, topics] = await Promise.all([
      loadAllGuideData(),
      loadCommunityFeed()
    ]);
    state.guideData = guideData;
    state.campusData = campusData;
    if (topics.length) state.communityTopics = topics;

    buildSearchIndex();
    renderCurrentRoute({ keepScroll: true });
  } catch (err) {
    console.error('Failed to hydrate guide data:', err);
  }
}

bootstrap();
