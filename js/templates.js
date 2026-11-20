/**
 * @file 校园指南安全模板渲染器
 * @description 所有动态数据均经过严格 HTML 转义与协议白名单校验，内置离线 SVG 占位图（零外部依赖）。
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
  if (
    str.startsWith('/') ||
    str.startsWith('#/') ||
    str.startsWith('https://') ||
    str.startsWith('http://')
  ) {
    return escapeHtml(str);
  }
  return '#/home/home';
}

export function safeIcon(name) {
  const clean = String(name || 'compass').replace(/[^a-z0-9-]/gi, '');
  return clean || 'compass';
}

export function formatInlineRichText(raw) {
  const escaped = escapeHtml(raw);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export const FALLBACK_IMG_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'%3E%3Crect width='800' height='500' fill='%23eef2f8'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23667085' font-family='sans-serif' font-size='24'%3E%E6%9A%82%E6%97%A0%E5%AE%9E%E6%99%AF%E5%9B%BE%E7%89%87%3C/text%3E%3C/svg%3E";

export function renderCampusSegments(campuses, selectedCampus) {
  return `
    <div class="segmented-campuses" role="group" aria-label="切换校区">
      ${campuses
        .map(
          (c) => `
        <button type="button" data-switch-campus="${escapeHtml(c.id)}" class="${
            c.id === selectedCampus ? 'is-active' : ''
          }">
          ${escapeHtml(c.name)}
        </button>
      `
        )
        .join('')}
    </div>
  `;
}

export function renderArticleHeader({ categoryTitle, categoryRoute, pageTitle, subtitle, detailParent }) {
  const parentCrumb = detailParent
    ? `<svg><use href="#i-chevron-right"/></svg><a href="${safeUrl(detailParent.route)}">${escapeHtml(detailParent.title)}</a>`
    : '';
  return `
    <header class="article-header">
      <div class="article-topbar">
        <nav class="breadcrumbs" aria-label="面包屑导航">
          <a href="#/home/home">指南总览</a>
          <svg><use href="#i-chevron-right"/></svg>
          <a href="${safeUrl(categoryRoute)}">${escapeHtml(categoryTitle)}</a>
          ${parentCrumb}
          <svg><use href="#i-chevron-right"/></svg>
          <span aria-current="page">${escapeHtml(pageTitle)}</span>
        </nav>
        <div class="article-tools">
          <button type="button" class="tool-chip" data-copy-link>
            <svg><use href="#i-share"/></svg>
            <span>分享本页</span>
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
          ? `<a class="pager-card" href="#/${escapeHtml(prev.categoryKey)}/${escapeHtml(prev.pageKey)}">
              <small>← 上一章 · ${escapeHtml(prev.categoryTitle)}</small>
              <strong>${escapeHtml(prev.title)}</strong>
            </a>`
          : '<div></div>'
      }
      ${
        next
          ? `<a class="pager-card is-next" href="#/${escapeHtml(next.categoryKey)}/${escapeHtml(next.pageKey)}">
              <small>下一章 · ${escapeHtml(next.categoryTitle)} →</small>
              <strong>${escapeHtml(next.title)}</strong>
            </a>`
          : '<div></div>'
      }
    </nav>
  `;
}

export function renderHomeView(page, campuses, selectedCampus, firstNext) {
  const sc = page.structuredContent || {};
  const hero = sc.hero || {};
  const quickTools = sc.quickTools || [];
  const eco = sc.ecosystem || [];

  return `
    <section class="home-hero">
      <span class="home-badge">${escapeHtml(hero.badge || '江苏海洋大学校园指南')}</span>
      <h1>${escapeHtml(hero.title || '欢迎来到江苏海洋大学')}</h1>
      <p>${escapeHtml(hero.subtitle || '')}</p>
      <div class="home-hero-actions">
        ${
          hero.primaryAction
            ? `<a class="btn btn-primary" href="#/${escapeHtml(hero.primaryAction.route)}">
                <svg><use href="#i-map-pin"/></svg>
                <span>${escapeHtml(hero.primaryAction.label)}</span>
              </a>`
            : ''
        }
        ${
          hero.secondaryAction
            ? `<a class="btn btn-secondary" href="#/${escapeHtml(hero.secondaryAction.route)}">
                <svg><use href="#i-check-square"/></svg>
                <span>${escapeHtml(hero.secondaryAction.label)}</span>
              </a>`
            : ''
        }
      </div>
      <div class="home-campus-strip">
        <span>当前浏览校区偏好（影响食堂与宿舍默认展示）：</span>
        ${renderCampusSegments(campuses, selectedCampus)}
      </div>
    </section>

    <div class="block-heading">
      <h2>高频速查入口</h2>
      <small>按 <kbd>/</kbd> 键可随时调出全局搜索</small>
    </div>
    <div class="quick-grid">
      ${quickTools
        .map(
          (item) => `
        <a class="quick-card" href="#/${escapeHtml(item.route)}">
          <div class="quick-card-top">
            <span class="quick-icon"><svg><use href="#i-${safeIcon(item.icon)}"/></svg></span>
            ${item.tag ? `<span class="quick-tag">${escapeHtml(item.tag)}</span>` : ''}
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </a>
      `
        )
        .join('')}
    </div>

    <div class="block-heading">
      <h2>酱海带校园生态</h2>
      <small>指南 · 社区 · 客户端无缝协同</small>
    </div>
    <div class="eco-cards">
      ${eco
        .map(
          (card) => `
        <div class="eco-card" data-accent="${escapeHtml(card.accent || 'brand')}">
          <div>
            <span class="eco-badge">${escapeHtml(card.badge)}</span>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.description)}</p>
          </div>
          <a class="eco-cta" href="${safeUrl(card.href)}" target="_blank" rel="noopener">
            <span>${escapeHtml(card.cta)}</span>
            <svg><use href="#i-arrow-right"/></svg>
          </a>
        </div>
      `
        )
        .join('')}
    </div>

    ${renderChapterPager(null, firstNext)}
  `;
}

export function renderCampusQueryView(colleges) {
  return `
    <div class="query-panel">
      <div class="query-search-box">
        <svg><use href="#i-search"/></svg>
        <input
          type="search"
          id="major-instant-input"
          placeholder="直接输入专业或学院名称秒查（例如：计算机、海洋、会计、视觉传达）..."
          autocomplete="off"
        />
      </div>
      <div class="query-select-grid">
        <div class="field-group">
          <label for="query-college-select">或按学院筛选</label>
          <select id="query-college-select">
            <option value="">-- 选择所属学院 (${colleges.length} 个学院) --</option>
            ${colleges
              .map(
                (c) => `<option value="${escapeHtml(c.college)}">${escapeHtml(c.college)}</option>`
              )
              .join('')}
          </select>
        </div>
        <div class="field-group">
          <label for="query-major-select">选择具体专业</label>
          <select id="query-major-select" disabled>
            <option value="">-- 请先选择学院 --</option>
          </select>
        </div>
      </div>
      <div class="query-result-stage" id="query-result-stage" aria-live="polite">
        <p class="query-empty">输入专业关键词或在上方选择学院后，将立即显示对应校区与食宿直达入口。</p>
      </div>
    </div>
  `;
}

export function renderChecklistView(content, checkedSet) {
  const sections = content.sections || [];
  const tips = content.tips || {};
  let total = 0;
  let done = 0;
  sections.forEach((sec) => {
    (sec.items || []).forEach((_, idx) => {
      total += 1;
      if (checkedSet.has(`${sec.id || sec.category}::${idx}`)) done += 1;
    });
  });
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return `
    <div class="checklist-progress-card">
      <div style="flex:1; min-width: 220px;">
        <div class="progress-meta">
          <strong>行前准备进度</strong>
          <span id="checklist-progress-label">${done} / ${total} 项 (${pct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="checklist-progress-fill" style="width: ${pct}%"></div>
        </div>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" id="reset-checklist-btn">
        <svg><use href="#i-rotate-ccw"/></svg>
        <span>重置勾选</span>
      </button>
    </div>

    <div class="checklist-sections">
      ${sections
        .map((sec) => {
          const secKey = sec.id || sec.category;
          return `
          <section class="checklist-group">
            <div class="checklist-group-head">
              <h2>${escapeHtml(sec.category)}</h2>
              ${sec.badge ? `<span class="quick-tag">${escapeHtml(sec.badge)}</span>` : ''}
            </div>
            <div class="checklist-items">
              ${(sec.items || [])
                .map((item, idx) => {
                  const key = `${secKey}::${idx}`;
                  const checked = checkedSet.has(key);
                  return `
                  <label class="check-row ${checked ? 'is-checked' : ''}">
                    <input type="checkbox" data-check-key="${escapeHtml(key)}" ${
                    checked ? 'checked' : ''
                  } />
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
      <div class="tips-box">
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

export function renderStepsView(content) {
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
        <article class="step-card">
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

export function renderPointsOrCardsView(content) {
  const noticeHtml = content.notice
    ? `<div class="notice-callout"><svg><use href="#i-info"/></svg><span>${escapeHtml(content.notice)}</span></div>`
    : '';
  const list = content.points || content.sections || [];

  return `
    ${noticeHtml}
    <div class="info-cards-stack">
      ${list
        .map((entry) => {
          const actions = entry.actions || (entry.action ? [entry.action] : []);
          const bodyHtml = Array.isArray(entry.items)
            ? `<ul>${entry.items.map((li) => `<li>${formatInlineRichText(li)}</li>`).join('')}</ul>`
            : `<p>${formatInlineRichText(entry.description || '')}</p>`;
          return `
          <section class="info-card">
            <div class="info-card-head">
              <span class="info-card-icon"><svg><use href="#i-${safeIcon(entry.icon || 'info')}"/></svg></span>
              <h2>${escapeHtml(entry.title)}</h2>
            </div>
            ${bodyHtml}
            ${
              actions.length
                ? `<div class="card-actions-row">
                    ${actions
                      .map(
                        (act) => `
                      <a class="btn btn-secondary btn-sm" href="${safeUrl(act.href)}" target="_blank" rel="noopener">
                        <span>${escapeHtml(act.label)}</span>
                        <svg><use href="#i-external"/></svg>
                      </a>
                    `
                      )
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

export function renderCampusPlacesView({ items, pageKey, campuses, selectedCampus }) {
  const campusObj = campuses.find((c) => c.id === selectedCampus);
  const campusName = campusObj ? campusObj.name : '当前校区';

  return `
    <div class="campus-bar">
      <span class="campus-bar-note">正在查看 <strong>${escapeHtml(campusName)}</strong> 共 ${items.length} 处导览：</span>
      ${renderCampusSegments(campuses, selectedCampus)}
    </div>

    ${
      items.length === 0
        ? `<div class="info-card"><p>该校区暂无此项录入，欢迎点击右上角「本页勘误」补充实拍信息。</p></div>`
        : `
      <div class="place-grid">
        ${items
          .map((item) => {
            const tags = [];
            if (pageKey === 'dormitory' && Array.isArray(item.details) && item.details[0]) {
              const d = item.details[0];
              if (d.roomType) tags.push(d.roomType);
              if (d.layout) tags.push(d.layout);
              if (d.ac === '有') tags.push('配空调');
              if (d.price) tags.push(d.price);
            } else if (pageKey === 'canteen' && Array.isArray(item.details) && item.details[0]) {
              const specs = item.details.flatMap((d) => d.specialty || []).slice(0, 3);
              tags.push(...specs);
            }
            return `
            <a class="place-card" href="#/campusLife/${escapeHtml(pageKey)}/${escapeHtml(item.id)}">
              <div class="place-thumb">
                <img
                  src="${safeUrl(item.image)}"
                  alt="${escapeHtml(item.name)}"
                  loading="lazy"
                  data-fallback-img
                />
              </div>
              <div class="place-body">
                <h2>${escapeHtml(item.name)}</h2>
                <p>${escapeHtml(item.summary || '')}</p>
                ${
                  tags.length
                    ? `<div class="place-tags">${tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>`
                    : ''
                }
                <span class="place-more">
                  <span>查看实拍与详情</span>
                  <svg><use href="#i-arrow-right"/></svg>
                </span>
              </div>
            </a>
          `;
          })
          .join('')}
      </div>
    `
    }
  `;
}

export function renderPlaceDetailView(item, pageKey) {
  const details = Array.isArray(item.details) ? item.details : [];
  const allPhotos = [];
  if (item.image) {
    allPhotos.push({ src: item.image, caption: `${item.name} 外观` });
  }
  details.forEach((sub) => {
    (sub.images || []).forEach((img) => {
      if (img?.src) allPhotos.push({ src: img.src, caption: img.caption || item.name });
    });
  });

  const blocksHtml = details
    .map((sub) => {
      if (pageKey === 'dormitory') {
        const specs = [
          ['包含楼栋', sub.building],
          ['房间规格', sub.roomType],
          ['床桌结构', sub.layout],
          ['住宿标准', sub.price],
          ['空调配置', sub.ac],
          ['独立阳台', sub.balcony],
          ['卫浴洗漱', sub.bathroom],
          ['热水供应', sub.waterHeater],
          ['公共洗衣', sub.laundry],
          ['校园网络', sub.network]
        ].filter(([, val]) => val);

        return `
          <section class="sub-block">
            <h2>${escapeHtml(sub.building || item.name)}</h2>
            <div class="spec-grid">
              ${specs
                .map(
                  ([k, v]) => `
                <div class="spec-item">
                  <small>${escapeHtml(k)}</small>
                  <strong>${escapeHtml(v)}</strong>
                </div>
              `
                )
                .join('')}
            </div>
            ${sub.notes ? `<p style="margin:0;color:var(--ink-2);font-size:14px;">${escapeHtml(sub.notes)}</p>` : ''}
            ${renderSubGallery(sub.images, allPhotos)}
          </section>
        `;
      }

      // canteen
      const specialties = Array.isArray(sub.specialty) ? sub.specialty : [];
      return `
        <section class="sub-block">
          <h2>${escapeHtml(sub.area || item.name)}</h2>
          ${
            specialties.length
              ? `<div class="place-tags" style="margin-bottom:12px;">
                  ${specialties.map((s) => `<span>${escapeHtml(s)}</span>`).join('')}
                </div>`
              : ''
          }
          ${sub.notes ? `<p style="margin:0;color:var(--ink-2);font-size:14.5px;">${escapeHtml(sub.notes)}</p>` : ''}
          ${renderSubGallery(sub.images, allPhotos)}
        </section>
      `;
    })
    .join('');

  return {
    allPhotos,
    html: `
      ${
        item.image
          ? `
        <div class="detail-hero-img" data-lightbox-index="0" role="button" tabindex="0" aria-label="点击放大查看外观大图">
          <img src="${safeUrl(item.image)}" alt="${escapeHtml(item.name)}" data-fallback-img />
          <span class="zoom-badge"><svg><use href="#i-zoom-in"/></svg><span>点击放大实拍 (${allPhotos.length} 张)</span></span>
        </div>
      `
          : ''
      }
      <div class="sub-block-stack">
        ${blocksHtml}
      </div>
    `
  };
}

function renderSubGallery(images, allPhotos) {
  if (!Array.isArray(images) || images.length === 0) return '';
  return `
    <div class="gallery-grid">
      ${images
        .map((img) => {
          const idx = allPhotos.findIndex((p) => p.src === img.src);
          return `
          <figure class="gallery-item" data-lightbox-index="${idx >= 0 ? idx : 0}" role="button" tabindex="0">
            <img src="${safeUrl(img.src)}" alt="${escapeHtml(img.caption || '')}" loading="lazy" data-fallback-img />
            <figcaption>${escapeHtml(img.caption || '实拍预览')}</figcaption>
          </figure>
        `;
        })
        .join('')}
    </div>
  `;
}

export function renderClubsView(content) {
  const groups = content.clubs || [];
  const orgs = content.organizations || {};
  return `
    <div class="info-card" style="margin-bottom: 18px;">
      <p style="margin:0;">${escapeHtml(content.introduction || '')}</p>
    </div>

    <div class="clubs-toolbar">
      <div class="club-filter-tabs" id="club-filter-tabs" role="tablist" aria-label="按社团星级筛选">
        <button type="button" class="is-active" data-club-level="all">全部社团</button>
        ${groups
          .map(
            (g) => `
          <button type="button" data-club-level="${escapeHtml(g.level)}">${escapeHtml(g.label)} (${g.list.length})</button>
        `
          )
          .join('')}
      </div>
      <input
        type="search"
        class="club-search-input"
        id="club-search-input"
        placeholder="搜索社团名称..."
        aria-label="搜索社团名称"
      />
    </div>

    <div class="clubs-chip-grid" id="clubs-chip-grid"></div>

    ${
      orgs.title
        ? `
      <section class="info-card" style="margin-top: 22px;">
        <div class="info-card-head">
          <span class="info-card-icon"><svg><use href="#i-award"/></svg></span>
          <h2>${escapeHtml(orgs.title)}</h2>
        </div>
        <p>${escapeHtml(orgs.content)}</p>
      </section>
    `
        : ''
    }
  `;
}

export function renderFaqView(content) {
  const items = content.items || [];
  return `
    <div class="faq-stack">
      ${items
        .map(
          (item, idx) => `
        <details class="faq-item" ${idx === 0 ? 'open' : ''}>
          <summary>
            <span>${escapeHtml(item.q)}</span>
            <svg><use href="#i-chevron-down"/></svg>
          </summary>
          <div class="faq-answer">${formatInlineRichText(item.a)}</div>
        </details>
      `
        )
        .join('')}
    </div>
  `;
}

export function renderLinksView(content) {
  const groups = content.groups || [];
  return `
    ${groups
      .map(
        (group) => `
      <section class="links-group">
        <h2>${escapeHtml(group.title)}</h2>
        <div class="links-grid">
          ${(group.items || [])
            .map(
              (item) => `
            <a class="link-card" href="${safeUrl(item.url)}" target="_blank" rel="noopener">
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <p>${escapeHtml(item.desc || '')}</p>
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
    ${
      content.disclaimer
        ? `<div class="notice-callout" style="margin-top: 8px;"><svg><use href="#i-shield"/></svg><span>${escapeHtml(content.disclaimer)}</span></div>`
        : ''
    }
  `;
}
