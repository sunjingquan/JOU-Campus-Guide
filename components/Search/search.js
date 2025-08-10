/**
 * @file 搜索组件 - 逻辑模块 (已修复)
 * @description 该模块封装了所有与搜索相关的功能。它现在独立管理自己的DOM元素，
 * 并通过事件总线与其他组件通信，实现了完全解耦。
 * @version 2.0.0
 */

import { createSearchResultsHTML } from './search.templates.js';
import { eventBus } from '../../services/eventBus.js';

// --- 模块内变量 ---
let dom = {}; // ✨ 修改：现在由本组件自己管理
let guideData = {};
let campusData = {};
let selectedCampus = '';
// ✨ 移除：onResultClickCallback 不再需要，将通过 eventBus 通信

/**
 * (导出函数) 初始化搜索模块。
 * @param {object} config - 配置对象。
 * @param {Array<Object>} config.gData - 指南主数据数组。
 * @param {Object} config.cData - 校区特定数据对象。
 * @param {string} config.campus - 当前选择的校区。
 */
export function init(config) {
    // ✨ 新增：组件自己查找和缓存DOM
    _cacheDOMElements();

    guideData = config.gData;
    campusData = config.cData;
    selectedCampus = config.campus;
    
    _setupEventListeners();
    console.log("Search Component Initialized.");
}

/**
 * (导出函数) 更新当前选择的校区。
 * @param {string} campus - 新的校区ID。
 */
export function updateCampus(campus) {
    selectedCampus = campus;
}

/**
 * ✨ 新增：缓存本组件所需的DOM元素。
 * @private
 */
function _cacheDOMElements() {
    dom = {
        searchForm: document.getElementById('search-form'),
        searchInput: document.getElementById('search-input'),
        liveSearchResultsContainer: document.getElementById('live-search-results'),
        mobileSearchInput: document.getElementById('mobile-search-input'),
        mobileSearchResultsContainer: document.getElementById('mobile-search-results-container'),
    };
}


/**
 * 设置所有与搜索相关的事件监听器。
 * @private
 */
function _setupEventListeners() {
    // 健壮性检查
    if (!dom.searchInput || !dom.mobileSearchInput) {
        console.warn("Search component: search input elements not found.");
        return;
    }

    dom.searchInput.addEventListener('input', _handleLiveSearch);
    dom.mobileSearchInput.addEventListener('input', _handleMobileLiveSearch);
    
    document.addEventListener('click', (e) => {
        if (dom.searchForm && !dom.searchForm.contains(e.target)) {
            _hideLiveSearchResults();
        }
    });

    // 使用事件委托为两个结果容器绑定点击事件
    if(dom.liveSearchResultsContainer) {
        dom.liveSearchResultsContainer.addEventListener('click', _handleResultClick);
    }
    if(dom.mobileSearchResultsContainer) {
        dom.mobileSearchResultsContainer.addEventListener('click', _handleResultClick);
    }
}

// --- 事件处理函数 ---

function _handleLiveSearch(e) {
    const query = e.target.value.trim();
    if (query.length > 0) {
        const results = _performSearch(query);
        _displayLiveSearchResults(results, query, dom.liveSearchResultsContainer);
    } else {
        _hideLiveSearchResults();
    }
}

function _handleMobileLiveSearch(e) {
    const query = e.target.value.trim();
    if (query.length > 0) {
        const results = _performSearch(query);
        _displayLiveSearchResults(results, query, dom.mobileSearchResultsContainer);
    } else {
        dom.mobileSearchResultsContainer.innerHTML = '';
    }
}

function _handleResultClick(e) {
    const item = e.target.closest('.search-result-item');
    if (item) {
        e.preventDefault();
        // ✨ 修改：通过事件总线发布结果点击事件
        eventBus.publish('search:resultClicked', item.dataset);
    }
}

// --- 核心逻辑函数 ---

function _displayLiveSearchResults(results, query, container) {
    if (!container) return;
    container.innerHTML = createSearchResultsHTML(results, query);
    if (container === dom.liveSearchResultsContainer) {
        container.classList.remove('hidden');
    }
}

function _hideLiveSearchResults() {
    if (dom.liveSearchResultsContainer) {
        dom.liveSearchResultsContainer.classList.add('hidden');
    }
}

/**
 * 在目标区域内高亮显示关键词。
 * @param {HTMLElement} sectionElement - 需要高亮的内容区域。
 * @param {string} keyword - 要高亮的关键词。
 */
export function highlightKeywordInSection(sectionElement, keyword) {
    // 此函数逻辑保持不变，但为了内部一致性，重命名为私有
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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


/**
 * 执行搜索的核心函数。
 * @param {string} query - 用户输入的搜索关键词。
 * @returns {Array<Object>} 搜索结果数组。
 * @private
 */
function _performSearch(query) {
    const results = [];
    const tempDiv = document.createElement('div');
    const queryLower = query.toLowerCase();

    // 1. 搜索通用数据 (guideData)
    guideData.forEach(category => {
        category.pages.forEach(page => {
            // 为了搜索，我们需要一个临时的、不可见的div来渲染HTML并提取纯文本
            const tempContainer = document.createElement('div');
            // 假设 ContentRenderer 有一个方法可以只返回HTML字符串
            // 我们需要一个方法来获取页面的纯文本内容
            // 这里我们简化处理，直接使用标题和已知字段
            let searchableText = page.title;
            if (page.structuredContent) {
                 // 这是一个简化的文本化过程，实际应用可能需要更完善的策略
                 searchableText += ' ' + JSON.stringify(page.structuredContent);
            }

            if (searchableText.toLowerCase().includes(queryLower)) {
                results.push({
                    title: page.title,
                    text: searchableText,
                    categoryKey: category.key,
                    pageKey: page.pageKey,
                    isDetail: false
                });
            }
        });
    });

    // 2. 搜索校区特定数据 (campusData)
    ['dormitories', 'canteens'].forEach(type => {
        const singularType = type.slice(0, -1); 
        if (campusData[type] && Array.isArray(campusData[type])) {
            const campusItems = campusData[type].filter(item => item.campusId === selectedCampus);
            
            campusItems.forEach(item => {
                let searchableText = `${item.name || ''} ${item.summary || ''}`;
                if (item.details && Array.isArray(item.details)) {
                    searchableText += item.details.map(d => Object.values(d).join(' ')).join(' ');
                }

                if (searchableText.toLowerCase().includes(queryLower)) {
                    results.push({
                        title: item.name,
                        text: searchableText,
                        isDetail: true,
                        detailType: singularType,
                        detailKey: item.id
                    });
                }
            });
        }
    });

    return results;
}
