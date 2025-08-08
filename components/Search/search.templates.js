/**
 * @file 搜索组件 - 模板模块
 * @description 该文件专门负责生成“搜索”功能所需的所有HTML结构。
 * 它接收纯净的JS数据，并返回HTML字符串，实现了视图和逻辑的彻底分离。
 */

/**
 * 根据搜索结果数据，生成单个结果项的 HTML。
 * 这是一个内部辅助函数，由 createSearchResultsHTML 调用。
 * @param {object} result - 单个搜索结果对象
 * @param {string} query - 用户输入的查询词
 * @returns {string} - 单个结果项的 HTML 字符串
 */
function createSearchResultItemHTML(result, query) {
    // 这部分逻辑是从旧的 displayLiveSearchResults 函数中完整抽离出来的
    const snippet = createSnippet(result.text, query);
    // 使用正则表达式高亮显示关键词
    const highlightedSnippet = snippet.replace(new RegExp(escapeRegExp(query), 'gi'), (match) => `<mark class="search-highlight">${escapeHtml(match)}</mark>`);

    // 根据结果类型（是详情页还是主内容区页面）生成不同的 data-* 属性，用于点击跳转
    const dataAttrs = result.isDetail
        ? `data-is-detail="true" data-detail-type="${result.detailType}" data-detail-key="${result.detailKey}"`
        : `data-category-key="${result.categoryKey}" data-page-key="${result.pageKey}"`;

    return `
        <a href="#" class="search-result-item block p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0" ${dataAttrs} data-keyword="${escapeHtml(query)}">
            <h4 class="font-semibold text-base text-blue-700 dark:text-blue-400 truncate">${escapeHtml(result.title)}</h4>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">...${highlightedSnippet}...</p>
        </a>
    `;
}

/**
 * (导出函数) 根据完整的搜索结果数组，生成整个下拉列表的 HTML。
 * 这是该模块唯一需要对外暴露的接口。
 * @param {Array<object>} results - 搜索结果数组
 * @param {string} query - 用户输入的查询词
 * @returns {string} - 包含所有结果项的完整 HTML 字符串
 */
export function createSearchResultsHTML(results, query) {
    // 如果没有结果，显示提示信息
    if (results.length === 0) {
        return `<p class="text-center text-gray-500 dark:text-gray-400 p-4">未能找到与“${escapeHtml(query)}”相关的内容。</p>`;
    }
    // 如果有结果，则遍历数组，调用内部函数生成每一项的HTML，最后拼接起来
    return results.map(result => createSearchResultItemHTML(result, query)).join('');
}

// --- 下面是同样从旧文件迁移过来的辅助函数，保持私有 ---

/**
 * 在一段长文本中，根据关键词截取一段摘要（代码片段）。
 * @param {string} text - 原始长文本
 * @param {string} query - 搜索关键词
 * @returns {string} - 截取并处理后的摘要文本
 */
function createSnippet(text, query) {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return escapeHtml(text.substring(0, 100)); // 未找到则直接截取开头

    // 尝试在关键词前后各截取一部分上下文
    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + query.length + 70);
    return escapeHtml(text.substring(start, end));
}

/**
 * 对HTML特殊字符进行转义，防止XSS攻击。
 * @param {string} str - 需要转义的字符串
 * @returns {string} - 转义后的安全字符串
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

/**
 * 对字符串中的正则表达式特殊字符进行转义。
 * @param {string} string - 需要转义的字符串
 * @returns {string} - 转义后的字符串
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
