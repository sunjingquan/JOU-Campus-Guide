/**
 * @file 搜索组件 - 逻辑模块
 * @description 该模块封装了所有与搜索相关的功能，包括事件监听、
 * 执行搜索、调用模板渲染结果和高亮显示。它不再关心HTML的具体结构。
 */

// 导入我们刚刚创建的模板模块
import { createSearchResultsHTML } from './search.templates.js';
// 导入旧的 renderer，因为 performSearch 函数依赖它来解析页面内容
// 注意: 这里的路径是相对于 components/Search/ 目录的
import * as renderer from '../../js/ui/renderer.js';

// --- 模块内变量，用于存储状态和数据 ---
let dom = {};
let guideData = {};
let campusData = {};
let selectedCampus = '';
let onResultClickCallback = () => {}; // 点击结果后的回调函数

/**
 * (导出函数) 初始化搜索模块。
 * @param {object} config - 配置对象。
 * @param {object} config.domElements - 从主应用传入的缓存DOM元素。
 * @param {Array<Object>} config.gData - 指南主数据数组。
 * @param {Object} config.cData - 校区特定数据对象。
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
 * (导出函数) 更新当前选择的校区，以便搜索校区特定内容。
 * @param {string} campus - 新的校区ID。
 */
export function updateCampus(campus) {
    selectedCampus = campus;
}

/**
 * 设置所有与搜索相关的事件监听器。
 */
function setupEventListeners() {
    // 桌面端和移动端输入框的实时搜索事件
    dom.searchInput.addEventListener('input', handleLiveSearch);
    dom.mobileSearchInput.addEventListener('input', handleMobileLiveSearch);
    
    // 点击页面其他地方时，隐藏桌面端搜索结果下拉框
    document.addEventListener('click', (e) => {
        if (!dom.searchForm.contains(e.target)) {
            hideLiveSearchResults();
        }
    });

    // 为两个结果容器设置点击事件（使用事件委托）
    dom.liveSearchResultsContainer.addEventListener('click', handleResultClick);
    dom.mobileSearchResultsContainer.addEventListener('click', handleResultClick);
}

// --- 事件处理函数 ---

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
        // 调用从主应用传入的回调函数，处理页面跳转
        onResultClickCallback(item.dataset);
    }
}

// --- 核心逻辑函数 ---

/**
 * 显示搜索结果。
 * 【核心修改】此函数现在非常简洁，只负责调用模板并更新DOM。
 * @param {Array<object>} results - 搜索结果数组。
 * @param {string} query - 搜索关键词。
 * @param {HTMLElement} container - 要显示结果的容器元素。
 */
function displayLiveSearchResults(results, query, container) {
    // 调用模板模块生成HTML
    container.innerHTML = createSearchResultsHTML(results, query);

    // 如果是桌面端，需要移除 hidden class 来显示下拉框
    if (container === dom.liveSearchResultsContainer) {
        container.classList.remove('hidden');
    }
}

function hideLiveSearchResults() {
    dom.liveSearchResultsContainer.classList.add('hidden');
}

/**
 * 执行搜索的核心函数，此函数逻辑保持不变。
 * @param {string} query - 用户输入的搜索关键词。
 * @returns {Array<Object>} 搜索结果数组。
 */
function performSearch(query) {
    const results = [];
    const tempDiv = document.createElement('div');
    const queryLower = query.toLowerCase();

    // 1. 搜索通用数据 (guideData)
    guideData.forEach(category => {
        category.pages.forEach(page => {
            let searchableText = page.title;
            const content = page.structuredContent;

            if (content) {
                // 为了能搜索到内容，需要将结构化数据转换成纯文本
                tempDiv.innerHTML = renderer.renderPageContent(page);
                searchableText += ' ' + tempDiv.textContent;
            }

            if (searchableText.toLowerCase().includes(queryLower)) {
                results.push({
                    title: page.title,
                    text: searchableText,
                    categoryKey: category.key,
                    pageKey: page.pageKey
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

/**
 * 在目标区域内高亮显示关键词。
 * @param {HTMLElement} sectionElement - 需要高亮的内容区域。
 * @param {string} keyword - 要高亮的关键词。
 */
export function highlightKeywordInSection(sectionElement, keyword) {
    // 此函数逻辑保持不变
    const regex = new RegExp(renderer.escapeRegExp(keyword), 'gi'); // 复用renderer的工具函数
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
