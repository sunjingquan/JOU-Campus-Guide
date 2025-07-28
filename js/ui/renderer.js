/**
 * @file UI 渲染器 (UI Renderer)
 * @description 该模块是所有UI渲染的核心。它接收从后端获取的纯净页面数据，
 * 并根据页面的唯一标识 (pageKey) 调用相应的模板函数来生成HTML。
 * @version 3.0.0
 */

// 导入所有模板函数
import * as tpl from './templates.js';

/**
 * 渲染页面内容的核心函数。
 * @param {object} page - 从 guide_data.json 的 pages 数组中获取的单个页面对象。
 * @returns {string} 渲染好的 HTML 字符串。
 */
export function renderPageContent(page) {
    // 如果页面数据或其唯一标识不存在，则返回错误提示
    if (!page || !page.pageKey) {
        return '<p class="text-center p-8">页面数据无效，缺少 pageKey。</p>';
    }

    // 从页面数据中获取结构化内容，如果不存在则使用空对象
    const content = page.structuredContent || {};

    // 根据页面的唯一标识 (pageKey) 来决定调用哪个模板函数
    // 这种方法精准、健壮，且易于扩展
    switch (page.pageKey) {
        // --- 主页 ---
        case 'home':
            return tpl.createHomePage(content);

        // --- 入学准备 ---
        case 'campusQuery':
            return tpl.createCampusQueryToolHtml();
        case 'checklist':
            return tpl.createChecklistHtml(content);
        case 'enrollmentProcess':
            return tpl.createStepsHtml(content);
        case 'mustKnow':
            return tpl.createPointsHtml(content);
        case 'militaryTraining':
            return tpl.createMilitaryTrainingPage(content);

        // --- 校园生活 ---
        case 'supermarketAndBike':
            return tpl.createMultiSectionPage(content);
        case 'clubsAndOrgs':
            // 注意：旧数据中此页面有 type: 'clubs' 和一个 data 属性
            // 新数据中是 structuredContent，我们将它直接传入
            return tpl.createClubsHtml(content);

        // --- 学习科研 ---
        case 'gpaAndCredits':
            return tpl.createGpaAndCreditsPage(content);
        case 'changeMajor':
            return tpl.createSimpleInfoPage(content);
        case 'contestsAndCerts':
            return tpl.createSimpleInfoPage(content);

        // --- 数字化校园 ---
        case 'campusCardAndApp':
            return tpl.createSimpleInfoPage(content);
        case 'internetAndElectricity':
            return tpl.createStepsListPage(content);
        case 'webVpn':
            return tpl.createWebVPNPage(content);

        // --- 答疑与支持 ---
        case 'faq':
            // 注意：旧数据中此页面有 type: 'faq' 和一个 items 属性
            // 新数据中是 structuredContent.items
            return tpl.createFaqHtml(content.items);
        case 'contacts':
            return tpl.createLinkPage(content, page.title);

        default:
            // 如果遇到未知的 pageKey，返回提示
            return `<p class="text-center p-8">此页面内容待添加 (未知 pageKey: ${page.pageKey})。</p>`;
    }
}


/**
 * 生成校区特定内容（宿舍/食堂）的卡片列表HTML。
 * @param {Array<object>} items - 从 campus_data.json 获取的宿舍或食堂列表。
 * @param {string} type - 'dormitory' 或 'canteen'。
 * @returns {string} 渲染好的HTML。
 */
export function generateCampusCards(items, type) {
    // 将 items 对象转换为数组
    const itemsArray = Object.keys(items).map(key => ({ id: key, ...items[key] }));
    return tpl.createCampusCardsHtml(itemsArray, type);
}

/**
 * 生成宿舍详情页的HTML。
 * @param {Array<object>} details - 宿舍楼栋的详细信息数组。
 * @returns {string} 渲染好的HTML。
 */
export function generateDormitoryDetailsHtml(details) {
    return tpl.createDormitoryDetailsHtml(details);
}

/**
 * 生成食堂详情页的HTML。
 * @param {Array<object>} details - 食堂区域的详细信息数组。
 * @returns {string} 渲染好的HTML。
 */
export function generateCanteenDetailsHtml(details) {
    return tpl.createCanteenDetailsHtml(details);
}
