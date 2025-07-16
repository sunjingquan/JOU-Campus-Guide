/**
 * @file 搜索UI模块
 * @description 该模块封装了所有与搜索相关的功能，包括事件监听、
 * 执行搜索、渲染结果和高亮显示。
 */

// --- 模块内变量 ---
let dom = {};
let guideData = {};
let campusData = {};
let selectedCampus = '';
let onResultClickCallback = () => {};

/**
 * 初始化搜索模块。
 * @param {object} config - 配置对象。
 * @param {object} config.domElements - 缓存的DOM元素。
 * @param {object} config.gData - 指南主数据。
 * @param {object} config.cData - 校区特定数据。
 * @param {string} config.campus - 当前选择的校区。
 * @param {function} config.onResultClick - 点击搜索结果时的回调函数。
 */
export function init(config) {
    dom = config.domElements;
    guideData = config.gData;
    campusData = config.cData;
    selectedCampus = config.campus;
    onResultClickCallback = config.onResultClick;

    setupEventListeners();
}

/**
 * 更新当前选择的校区，以便搜索校区特定内容。
 * @param {string} campus - 新的校区ID。
 */
export function updateCampus(campus) {
    selectedCampus = campus;
}

/**
 * 设置搜索相关的事件监听器。
 */
function setupEventListeners() {
    dom.searchInput.addEventListener('input', handleLiveSearch);
    dom.mobileSearchInput.addEventListener('input', handleMobileLiveSearch);
    
    // 点击外部区域隐藏桌面端搜索结果
    document.addEventListener('click', (e) => {
        if (!dom.searchForm.contains(e.target)) {
            hideLiveSearchResults();
        }
    });

    // 将点击事件委托给父容器处理
    dom.liveSearchResultsContainer.addEventListener('click', handleResultClick);
    dom.mobileSearchResultsContainer.addEventListener('click', handleResultClick);
}

function handleLiveSearch(e) {
    const query = e.target.value.trim();
    if (query.length > 0) {
        const results = performSearch(query);
        displayLiveSearchResults(results, query, dom.liveSearchResultsContainer);
    } else {
        hideLiveSearchResults();
    }
}

function handleMobileLiveSearch(e) {
    const query = e.target.value.trim();
    if (query.length > 0) {
        const results = performSearch(query);
        displayLiveSearchResults(results, query, dom.mobileSearchResultsContainer);
    } else {
        dom.mobileSearchResultsContainer.innerHTML = '';
    }
}

function handleResultClick(e) {
    const item = e.target.closest('.search-result-item');
    if (item) {
        e.preventDefault();
        onResultClickCallback(item.dataset);
    }
}

function displayLiveSearchResults(results, query, container) {
    if (results.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 p-4">未能找到与“${escapeHtml(query)}”相关的内容。</p>`;
    } else {
        container.innerHTML = results.map(result => {
            const snippet = createSnippet(result.text, query);
            const highlightedSnippet = snippet.replace(new RegExp(escapeRegExp(query), 'gi'), (match) => `<mark class="search-highlight">${escapeHtml(match)}</mark>`);

            const dataAttrs = result.isDetail
                ? `data-is-detail="true" data-detail-type="${result.detailType}" data-detail-key="${result.detailKey}"`
                : `data-category-key="${result.categoryKey}" data-page-key="${result.pageKey}"`;

            return `
                <a href="#" class="search-result-item block p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0" ${dataAttrs} data-keyword="${escapeHtml(query)}">
                    <h4 class="font-semibold text-base text-blue-700 dark:text-blue-400 truncate">${escapeHtml(result.title)}</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">...${highlightedSnippet}...</p>
                </a>
            `;
        }).join('');
    }
    if (container === dom.liveSearchResultsContainer) {
        container.classList.remove('hidden');
    }
}

function hideLiveSearchResults() {
    dom.liveSearchResultsContainer.classList.add('hidden');
}

function performSearch(query) {
    const results = [];
    const tempDiv = document.createElement('div');
    const queryLower = query.toLowerCase();

    // 搜索通用数据
    for (const categoryKey in guideData) {
        for (const pageKey in guideData[categoryKey].pages) {
            const page = guideData[categoryKey].pages[pageKey];
            let searchableText = page.title;

            if (page.type === 'clubs') {
                const clubData = page.data;
                searchableText += ' ' + clubData.introduction;
                clubData.clubs.forEach(group => { searchableText += ' ' + group.list.join(' '); });
                searchableText += ' ' + clubData.organizations.title + ' ' + clubData.organizations.content;
            } else if (page.content) {
                tempDiv.innerHTML = page.content;
                searchableText += ' ' + tempDiv.textContent;
            } else if (page.type === 'faq') {
                page.items.forEach(item => { searchableText += ' ' + item.q + ' ' + item.a; });
            }

            if (searchableText.toLowerCase().includes(queryLower)) {
                results.push({ title: page.title, text: searchableText, categoryKey, pageKey });
            }
        }
    }

    // 搜索校区特定数据
    const campus = campusData[selectedCampus];
    if (campus) {
        ['dormitory', 'canteen'].forEach(type => {
            if (campus[type] && campus[type].items) {
                for (const itemKey in campus[type].items) {
                    const item = campus[type].items[itemKey];
                    let searchableText = `${item.name} ${item.summary}`;
                    if (Array.isArray(item.details)) {
                        searchableText += item.details.map(d => Object.values(d).join(' ')).join(' ');
                    } else if (typeof item.details === 'string') {
                        tempDiv.innerHTML = item.details;
                        searchableText += ' ' + tempDiv.textContent;
                    }

                    if (searchableText.toLowerCase().includes(queryLower)) {
                        results.push({ title: item.name, text: searchableText, isDetail: true, detailType: type, detailKey: itemKey });
                    }
                }
            }
        });
    }

    return results;
}

function createSnippet(text, query) {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return escapeHtml(text.substring(0, 100));

    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + query.length + 70);
    return escapeHtml(text.substring(start, end));
}

export function highlightKeywordInSection(sectionElement, keyword) {
    const regex = new RegExp(escapeRegExp(keyword), 'gi');
    const walker = document.createTreeWalker(sectionElement, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const nodesToReplace = [];

    while (node = walker.nextNode()) {
        if (node.textContent.toLowerCase().includes(keyword.toLowerCase())) {
            nodesToReplace.push(node);
        }
    }

    nodesToReplace.forEach(textNode => {
        const parent = textNode.parentNode;
        if (!parent || ['MARK', 'SCRIPT', 'STYLE'].includes(parent.nodeName)) return;

        const parts = textNode.textContent.split(regex);
        const matches = textNode.textContent.match(regex);

        if (!matches) return;

        const fragment = document.createDocumentFragment();
        parts.forEach((part, index) => {
            fragment.appendChild(document.createTextNode(part));
            if (index < matches.length) {
                const mark = document.createElement('mark');
                mark.className = 'temp-highlight';
                mark.textContent = matches[index];
                fragment.appendChild(mark);
            }
        });
        parent.replaceChild(fragment, textNode);
    });
}

// --- 辅助函数 ---
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
