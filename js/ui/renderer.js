/**
 * @file UI 渲染器 (UI Renderer) - 重构版
 * @description 该模块是所有UI渲染的核心。它导入模板函数，
 * 接收纯净的JSON数据，然后调用模板生成HTML。
 * 它本身不包含任何HTML结构。
 * @version 2.0.0
 */

// 从我们新建的模板文件中，导入所有导出的模板函数
import * as tpl from './templates.js';

/**
 * 渲染一个通用页面。
 * 这是渲染逻辑的主要入口，它会根据页面数据的 `type` 字段或内容结构来决定使用哪个模板。
 * @param {object} page - 从 guideData 中获取的单个页面对象。
 * @returns {string} 渲染好的 HTML 字符串。
 */
export function renderPageContent(page) {
    // 确保 page 和 structuredContent 存在
    if (!page || !page.structuredContent) {
        // 检查是否有特殊页面类型
        if (page && page.type === 'campus-query-tool') {
            return tpl.createCampusQueryToolHtml();
        }
        // 对于没有内容或结构不符的页面，返回提示
        return '<p class="text-center p-8">此页面内容待添加或格式不正确。</p>';
    }

    const content = page.structuredContent;

    // 根据页面类型或内容特征调用不同的模板
    switch (page.type) {
        case 'faq':
            return tpl.createFaqHtml(content.items);
        case 'clubs':
            return tpl.createClubsHtml(content);
        case 'campus-query-tool':
            return tpl.createCampusQueryToolHtml();
        default:
            // 如果没有特定类型，则根据内容结构判断
            if (content.hero && content.quickNav) {
                return tpl.createHomePage(content.hero, content.quickNav);
            }
            if (content.steps) {
                return tpl.createStepsHtml(content.steps);
            }
            if (content.points) {
                return tpl.createPointsHtml(content.points);
            }
            if (content.sections) {
                return tpl.createSectionsHtml(content.sections, content.tips);
            }
            if (content.link) {
                return tpl.createLinkHtml(content.link, page.title);
            }
            // 默认回退
            return '<p class="text-center p-8">此页面内容待添加。</p>';
    }
}

/**
 * 生成校区特定内容（宿舍/食堂）的卡片列表HTML。
 * 这个函数现在只是一个简单的包装，直接调用模板文件中的相应函数。
 * @param {Array<object>} items - 宿舍或食堂列表数据。
 * @param {string} type - 'dormitory' 或 'canteen'。
 * @returns {string} 渲染好的HTML。
 */
export function generateCampusCards(items, type) {
    return tpl.createCampusCardsHtml(items, type);
}

/**
 * 生成宿舍详情页的HTML。
 * 内部实现已替换为调用模板函数。
 * @param {Array<object>} details - 宿舍楼栋的详细信息数组。
 * @returns {string} 渲染好的HTML。
 */
export function generateDormitoryDetailsHtml(details) {
    return tpl.createDormitoryDetailsHtml(details);
}

/**
 * 生成食堂详情页的HTML。
 * 内部实现已替换为调用模板函数。
 * @param {Array<object>} details - 食堂区域的详细信息数组。
 * @returns {string} 渲染好的HTML。
 */
export function generateCanteenDetailsHtml(details) {
    return tpl.createCanteenDetailsHtml(details);
}
