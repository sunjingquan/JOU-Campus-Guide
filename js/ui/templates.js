/**
 * @file UI 模板模块 (UI Templates)
 * @description 该模块是所有UI组件的“HTML蓝图”。它包含一系列纯函数，
 * 每个函数接收从 guide_data.json 获取的纯净JSON数据，并返回与旧版 guideData.js 视觉效果完全一致的HTML字符串。
 * @version 4.3.0
 * @changes
 * - [体验优化] 在 `createMaterialsListHtml` 的空状态视图中增加了一个“立即上传”按钮，以引导用户贡献内容。
 */

// --- 辅助函数 ---
function escapeHtml(str) {
    if (typeof str !== 'string' && typeof str !== 'number') return '';
    const strConv = String(str);
    return strConv.replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[match]);
}

// ===================================================================================
// --- 组件级模板 (可复用的UI片段) ---
// ===================================================================================

export function createSliderHtml(images) {
    if (!images || images.length === 0) {
        return `
            <img src="https://placehold.co/800x450/cccccc/ffffff?text=无图片" 
                 alt="[无图片]" 
                 class="w-full h-auto object-cover rounded-lg mb-4">
        `;
    }

    const slidesHtml = images.map((img, index) => `
        <div class="slider-slide" data-index="${index}">
            <img src="${escapeHtml(img.src)}" 
                 alt="${escapeHtml(img.caption)}" 
                 onerror="this.onerror=null;this.src='https://placehold.co/800x450/fecaca/991b1b?text=图片加载失败';">
        </div>
    `).join('');

    const dotsHtml = images.map((_, index) => `
        <button class="dot" data-index="${index}"></button>
    `).join('');

    const singleImageCaption = images.length === 1
        ? `<p class="text-white text-center text-sm font-semibold truncate">${escapeHtml(images[0].caption)}</p>`
        : `<p class="slider-caption text-white text-center text-sm font-semibold truncate"></p>`;

    const navButtonsHtml = images.length > 1 ? `
        <button class="slider-nav prev absolute top-1/2 -translate-y-1/2 left-3 z-10">
            <i data-lucide="chevron-left" class="w-6 h-6"></i>
        </button>
        <button class="slider-nav next absolute top-1/2 -translate-y-1/2 right-3 z-10">
            <i data-lucide="chevron-right" class="w-6 h-6"></i>
        </button>
    ` : '';

    const dotsContainerHtml = images.length > 1 ? `
        <div class="slider-dots flex justify-center space-x-2 mt-2">
            ${dotsHtml}
        </div>
    ` : '';

    return `
        <div class="image-slider relative overflow-hidden rounded-lg shadow-md mb-4">
            <div class="slider-wrapper flex">
                ${slidesHtml}
            </div>
            ${navButtonsHtml}
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-10">
                ${singleImageCaption}
                ${dotsContainerHtml}
            </div>
        </div>
    `;
}


// ===================================================================================
// --- 页面级模板 (根据 pageKey 调用) ---
// ===================================================================================

/**
 * 模板: 主页 (pageKey: 'home')
 */
export function createHomePage(content) {
    const hero = content.hero || {};
    const quickNav = content.quickNav || [];

    const navCards = quickNav.map(item => {
        const colors = {
            "入学流程": { bg: 'bg-blue-100', text: 'text-blue-600', shadow: 'dark:hover:shadow-blue-500/20' },
            "宿舍介绍": { bg: 'bg-green-100', text: 'text-green-600', shadow: 'dark:hover:shadow-green-500/20' },
            "学业发展": { bg: 'bg-purple-100', text: 'text-purple-600', shadow: 'dark:hover:shadow-purple-500/20' },
            "常见问题": { bg: 'bg-red-100', text: 'text-red-600', shadow: 'dark:hover:shadow-red-500/20' }
        };
        const color = colors[item.title] || { bg: 'bg-gray-100', text: 'text-gray-600', shadow: '' };
        
        const navLinkData = JSON.stringify(item.link);

        return `
            <a href="#" data-navlink='${navLinkData}' class="nav-card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-2xl ${color.shadow} hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center">
                <div class="${color.bg} ${color.text} p-4 rounded-full mb-4">
                    <i data-lucide="${escapeHtml(item.icon)}" class="w-8 h-8"></i>
                </div>
                <h3 class="font-semibold text-lg text-gray-900 dark:text-gray-100">${escapeHtml(item.title)}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(item.description)}</p>
            </a>
        `;
    }).join('');

    return `
        <div class="flex flex-col justify-center items-center h-full">
            <div class="hero-bg text-white p-12 rounded-2xl text-center flex flex-col items-center justify-center shadow-xl mb-12">
                <h1 class="text-5xl font-extrabold mb-4 drop-shadow-lg">${escapeHtml(hero.title)}</h1>
                <p class="text-lg max-w-2xl mb-8 drop-shadow-md">${escapeHtml(hero.subtitle)}</p>
                <button id="explore-btn" class="bg-white text-blue-800 font-bold py-3 px-8 rounded-full text-lg hover:bg-blue-100 transform hover:scale-105 transition-all duration-300 shadow-lg">
                    ${escapeHtml(hero.buttonText)}
                </button>
            </div>
            <div>
                <h2 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8 text-center">快速导航</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                    ${navCards}
                </div>
            </div>
        </div>
    `;
}

/**
 * 模板: 大一校区查询 (pageKey: 'campusQuery')
 */
export function createCampusQueryToolHtml() {
    return `
        <div class="campus-query-tool-container w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mx-auto">
            <div class="text-center mb-8">
                <h1 class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">大一新生校区查询</h1>
                <p class="text-gray-500 dark:text-gray-400 mt-2">请选择你的学院和专业，查询你所在的校区。</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <label for="college-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择学院</label>
                    <select id="college-select" class="custom-select w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                        <option value="">-- 请选择 --</option>
                    </select>
                </div>
                <div>
                    <label for="major-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择专业</label>
                    <select id="major-select" class="custom-select w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200" disabled>
                        <option value="">-- 请先选择学院 --</option>
                    </select>
                </div>
            </div>
            <div id="result-display" class="bg-gray-100 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-center min-h-[150px] flex items-center justify-center transition-all duration-300 ease-in-out">
                <p class="text-gray-500 dark:text-gray-400">查询结果将在此处显示</p>
            </div>
        </div>
    `;
}

/**
 * 模板: 开学必备清单 (pageKey: 'checklist')
 */
export function createChecklistHtml(content) {
    const sections = content.sections || [];
    const tips = content.tips || {};
    const sectionColors = { "床上用品": "green", "洗漱用品": "cyan", "衣物鞋袜": "purple", "电子产品及其它": "orange" };

    const mainSection = sections.find(s => s.category && s.category.includes('证件'));
    const otherSections = sections.filter(s => !s.category || !s.category.includes('证件'));

    const mainSectionHtml = mainSection ? `
        <div class="p-6 rounded-xl w-full">
            <h3 class="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-6 border-l-4 border-blue-700 dark:border-blue-500 pl-4">${escapeHtml(mainSection.category)}</h3>
            <ul class="list-none space-y-4 text-gray-700 dark:text-gray-300">
                ${(mainSection.items || []).map(item => {
                    const parts = item.split('：');
                    const label = parts[0];
                    const value = parts.slice(1).join('：');
                    return `
                        <li class="flex items-start">
                            <i data-lucide="check-circle-2" class="text-green-500 w-5 h-5 mr-3 mt-1 flex-shrink-0"></i>
                            <div><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</div>
                        </li>
                    `;
                }).join('')}
            </ul>
        </div>` : '';

    const otherSectionsHtml = otherSections.map((section, index) => {
        const color = sectionColors[section.category] || 'gray';
        const itemsHtml = (section.items || []).map(item => `<li>${escapeHtml(item)}</li>`).join('');
        return `
            <div class="p-6 rounded-xl w-full ${index >= 2 ? 'mt-4' : ''}">
                <h3 class="text-2xl font-bold text-${color}-800 dark:text-${color}-400 mb-6 border-l-4 border-${color}-700 dark:border-${color}-500 pl-4">${escapeHtml(section.category)}</h3>
                <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                    ${itemsHtml}
                </ul>
            </div>
        `;
    }).join('');

    const tipsHtml = tips.title ? `
        <div class="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 p-6 rounded-lg w-full mt-10" role="alert">
            <div class="flex">
                <div class="py-1">
                    <i data-lucide="alert-triangle" class="w-6 h-6 text-yellow-600 mr-4 flex-shrink-0"></i>
                </div>
                <div>
                    <p class="font-bold">${escapeHtml(tips.title)}</p>
                    <ul class="list-disc list-inside mt-2 text-sm">
                        ${(tips.items || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    ` : '';

    return `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
            ${mainSectionHtml}
            <div class="grid md:grid-cols-2 gap-x-8 mt-8">
                ${otherSectionsHtml}
            </div>
            ${tipsHtml}
        </div>
    `;
}


/**
 * 模板: 新生入学流程 (pageKey: 'enrollmentProcess')
 */
export function createStepsHtml(content) {
    const steps = content.steps || [];

    // 第一部分: 生成所有绝对定位的“圆点”
    const dotsHtml = steps.map((_, index) => {
        const topStyleMapping = { 0: 'top: 6px;', 1: 'top: 33.33%;', 2: 'top: 66.66%;', 3: 'bottom: 6px;' };
        const style = topStyleMapping[index] || '';
        const ringClass = (index === 0 || index === steps.length - 1) ? 'ring-8 ring-white dark:ring-gray-800' : '';

        return `<div class="absolute w-4 h-4 bg-blue-600 rounded-full -left-2 ${ringClass}" style="${style}"></div>`;
    }).join('');

    // 第二部分: 生成所有按顺序排列的“文本块”
    const textBlocksHtml = steps.map((step, index) => {
        const title = step.title.replace(/第.步：/, '');
        return `
            <div>
                <h3 class="text-xl font-bold text-blue-800 dark:text-blue-400">
                    ${index + 1}. ${escapeHtml(title)}
                </h3>
                <p class="text-gray-600 dark:text-gray-300 mt-2">
                    ${escapeHtml(step.description)}
                </p>
            </div>
        `;
    }).join('');

    // 第三部分: 组合成最终的HTML
    // 外部容器是相对定位的参考系，内部包含“圆点”和“文本块容器”
    return `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
            <div class="relative border-l-4 border-blue-500 py-6">
                ${dotsHtml}
                <div class="pl-10 space-y-16">
                    ${textBlocksHtml}
                </div>
            </div>
        </div>
    `;
}

/**
 * 模板: 开学须知 (pageKey: 'mustKnow')
 */
export function createPointsHtml(content) {
    const points = content.points || [];

    // 【样式已修复】在这里定义图标和颜色的映射关系，以还原旧版样式
    const iconConfig = {
        'calendar-days': { color: 'text-indigo-500' },
        'shield-check': { color: 'text-red-500' },
        'file-archive': { color: 'text-yellow-500' }
    };

    const pointsHtml = points.map(point => {
        const config = iconConfig[point.icon] || { color: 'text-gray-500' };
        return `
            <div class="border-b dark:border-gray-700 pb-4 last:border-b-0">
                <h4 class="font-bold text-xl text-gray-800 dark:text-gray-100 flex items-center">
                    <i data-lucide="${escapeHtml(point.icon)}" class="mr-3 ${config.color}"></i>
                    ${escapeHtml(point.title)}
                </h4>
                <p class="text-gray-600 dark:text-gray-300 mt-2 pl-8">
                    ${escapeHtml(point.description)}
                </p>
            </div>
        `;
    }).join('');

    return `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
            <div class="space-y-6">
                ${pointsHtml}
            </div>
        </div>
    `;
}

/**
 * 模板: 军训攻略 (pageKey: 'militaryTraining')
 */
export function createMilitaryTrainingPage(content) {
    const sections = content.sections || [];
    const sectionHtml = sections.map(section => `
        <div class="p-6 rounded-xl">
            <h3 class="text-2xl font-bold text-teal-800 dark:text-teal-400 mb-6 border-l-4 border-teal-700 dark:border-teal-500 pl-4">
                ${escapeHtml(section.title)}
            </h3>
            <ul class="list-disc list-inside space-y-3 text-gray-700 dark:text-gray-300">
                ${(section.items || []).map(item => `<li><strong>${escapeHtml(item)}</strong></li>`).join('')}
            </ul>
        </div>
    `).join('');

    return `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-6xl mx-auto">
            <div class="grid md:grid-cols-2 gap-8">
                ${sectionHtml}
            </div>
        </div>
    `;
}

/**
 * 模板: 校园超市与共享单车 (pageKey: 'supermarketAndBike')
 */
export function createMultiSectionPage(content) {
    const sections = content.sections || [];
    const sectionColors = ['purple', 'sky'];

    const sectionsHtml = sections.map((section, index) => {
        const color = sectionColors[index % sectionColors.length];
        return `
            <div class="p-6 rounded-xl w-full ${index > 0 ? 'mt-8' : ''}">
                <h3 class="text-2xl font-bold text-${color}-800 dark:text-${color}-400 mb-4 border-l-4 border-${color}-700 dark:border-${color}-500 pl-4">
                    ${escapeHtml(section.title)}
                </h3>
                <p class="text-gray-700 dark:text-gray-300">
                    ${escapeHtml(section.description)}
                </p>
            </div>
        `;
    }).join('');

    return `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
            ${sectionsHtml}
        </div>
    `;
}

/**
 * 模板: 社团与组织 (pageKey: 'clubsAndOrgs')
 */
export function createClubsHtml(content) {
    const data = content || {};
    const createClubItem = (clubName, icon, color) => `
        <div class="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-md flex items-center space-x-3 transform hover:scale-105 hover:shadow-xl transition-all duration-300">
            <i data-lucide="${escapeHtml(icon)}" class="w-6 h-6 ${escapeHtml(color)} flex-shrink-0"></i>
            <span class="text-gray-800 dark:text-gray-200 font-medium">${escapeHtml(clubName)}</span>
        </div>
    `;

    const iconMap = { 5: 'star', 4: 'award', 3: 'medal', 2: 'gem', 1: 'sparkle' };
    const colorMap = { 5: 'text-yellow-400', 4: 'text-slate-400', 3: 'text-orange-400', 2: 'text-cyan-400', 1: 'text-green-400' };

    const tabsHtml = (data.clubs || []).map(group => `
        <button class="tab-button px-4 py-3 text-base md:text-lg text-gray-600 dark:text-gray-400 whitespace-nowrap" data-level="${escapeHtml(String(group.level))}">
            <i data-lucide="${iconMap[group.level]}" class="inline-block w-5 h-5 mr-2 ${colorMap[group.level]}"></i>
            ${escapeHtml(group.label)}
        </button>
    `).join('');

    const panesHtml = (data.clubs || []).map(group => {
        const clubListHtml = (group.list || []).map(clubName => createClubItem(clubName, iconMap[group.level], colorMap[group.level])).join('');
        return `
            <div class="club-pane" data-level="${escapeHtml(String(group.level))}">
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    ${clubListHtml}
                </div>
            </div>
        `;
    }).join('');

    const allClubsListHtml = (data.clubs || [])
        .flatMap(group => (group.list || []).map(clubName => createClubItem(clubName, iconMap[group.level], colorMap[group.level])))
        .join('');

    const allPaneHtml = `
        <div class="club-pane active" data-level="all">
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                ${allClubsListHtml}
            </div>
        </div>
    `;

    const organizationsHtml = data.organizations ? `
        <div class="w-full mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h3 class="text-2xl font-bold text-indigo-800 dark:text-indigo-400 mb-6 border-l-4 border-indigo-700 dark:border-indigo-500 pl-4">
                ${escapeHtml(data.organizations.title)}
            </h3>
            <p class="text-gray-700 dark:text-gray-300">
                ${data.organizations.content}
            </p>
        </div>
    ` : '';

    return `
        <div class="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg w-full max-w-6xl mx-auto">
            <div class="w-full">
                <h3 class="text-2xl font-bold text-rose-800 dark:text-rose-400 mb-6 border-l-4 border-rose-700 dark:border-rose-500 pl-4">学生社团</h3>
                <p class="text-gray-700 dark:text-gray-300 mb-8">${escapeHtml(data.introduction)}</p>
                
                <div class="club-tabs border-b border-gray-200 dark:border-gray-700 mb-6 flex space-x-2 md:space-x-4 overflow-x-auto">
                    <button class="tab-button active px-4 py-3 text-base md:text-lg text-gray-600 dark:text-gray-400 whitespace-nowrap" data-level="all">
                        <i data-lucide="layout-grid" class="inline-block w-5 h-5 mr-2 text-blue-500"></i>全部
                    </button>
                    ${tabsHtml}
                </div>
                <div class="club-panes-container">
                    ${allPaneHtml}
                    ${panesHtml}
                </div>
            </div>
            ${organizationsHtml}
        </div>
    `;
}

/**
 * 模板: 关于绩点和学分 (pageKey: 'gpaAndCredits')
 */
export function createGpaAndCreditsPage(content) {
    const points = content.points || [];
    const sectionsHtml = points.map((point, index) => {
        const icon = point.icon || 'circle-dot';
        const color = icon === 'star' ? 'text-yellow-500' : 'text-green-500';
        const descriptionHtml = escapeHtml(point.description).replace(/总学分|各类课程|奖学金评定、评优评先/g, '<strong>$&</strong>');

        return `
            ${index > 0 ? `<div class="border-t my-6 dark:border-gray-700"></div>` : ''}
            <div>
                <h4 class="font-bold text-2xl text-gray-800 dark:text-gray-100 flex items-center mb-4">
                    <i data-lucide="${escapeHtml(icon)}" class="${color} mr-3"></i>
                    ${escapeHtml(point.title)}
                </h4>
                <p class="text-gray-600 dark:text-gray-300 text-lg">${descriptionHtml}</p>
            </div>
        `;
    }).join('');

    return `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
            <div class="space-y-8">
                ${sectionsHtml}
            </div>
        </div>
    `;
}

/**
 * 模板: 简单信息页 (pageKey: 'changeMajor', 'contestsAndCerts', 'campusCardAndApp')
 */
export function createSimpleInfoPage(content) {
    return `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
            <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">${escapeHtml(content.title)}</h3>
            <p class="text-gray-600 dark:text-gray-300">${escapeHtml(content.description)}</p>
        </div>
    `;
}

/**
 * 模板: 宽带与电费 (pageKey: 'internetAndElectricity')
 */
export function createStepsListPage(content) {
    const sections = content.sections || [];
    const sectionColors = ['cyan', 'amber'];

    const sectionsHtml = sections.map((section, index) => {
        const color = sectionColors[index % sectionColors.length];
        const stepsHtml = section.steps ? `
            <ol class="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                ${(section.steps || []).map(step => {
                    const parts = step.split('：');
                    const label = parts[0];
                    const value = parts.slice(1).join('：');
                    return `<li><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</li>`;
                }).join('')}
            </ol>
        ` : '';

        return `
            <div class="w-full ${index > 0 ? 'mt-8' : ''}">
                <h3 class="text-2xl font-bold text-${color}-800 dark:text-${color}-400 mb-6 border-l-4 border-${color}-700 dark:border-${color}-500 pl-4">
                    ${escapeHtml(section.title)}
                </h3>
                <p class="text-gray-700 dark:text-gray-300 mb-4">
                    ${escapeHtml(section.description)}
                </p>
                ${stepsHtml}
            </div>
        `;
    }).join('');

    return `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
            ${sectionsHtml}
        </div>
    `;
}

/**
 * 模板: WebVPN系统 (pageKey: 'webVpn')
 */
export function createWebVPNPage(content) {
    const sections = content.sections || [];
    const sectionsHtml = sections.map(section => `
        <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            ${escapeHtml(section.title)}
        </h3>
        <p class="text-gray-600 dark:text-gray-300">
            ${escapeHtml(section.description)}
        </p>
    `).join('');

    return `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
            ${sectionsHtml}
        </div>
    `;
}

/**
 * 模板: 常见问题 (pageKey: 'faq')
 */
export function createFaqHtml(items) {
    const faqItems = (items || []).map(item => `
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div class="accordion-header w-full p-5 text-left font-semibold text-gray-800 dark:text-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <span class="text-lg">${escapeHtml(item.q)}</span>
                <i data-lucide="chevron-down" class="accordion-icon transition-transform duration-300 w-5 h-5"></i>
            </div>
            <div class="accordion-content bg-gray-50 dark:bg-gray-700/50 p-5 border-t border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300" style="display: none;">
                <p>${escapeHtml(item.a)}</p>
            </div>
        </div>
    `).join('');

    return `
        <div class="space-y-4 w-full max-w-4xl mx-auto">
            ${faqItems}
        </div>
    `;
}

/**
 * 模板: 重要部门联系方式 (pageKey: 'contacts')
 */
export function createLinkPage(content, pageTitle) {
    return `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
            <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">${escapeHtml(pageTitle)}</h3>
            <div class="overflow-x-auto">
                <p class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 break-all">
                    <a href="${escapeHtml(content.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(content.link)}</a>
                </p>
            </div>
        </div>
    `;
}


// --- 校区相关模板 ---

/**
 * 模板: 校区特定内容卡片列表 (宿舍/食堂)
 */
export function createCampusCardsHtml(items, type) {
    if (!Array.isArray(items) || items.length === 0) {
        return `<p class="text-gray-500 dark:text-gray-400 text-center p-8">该校区暂无相关信息。</p>`;
    }

    const cardHtml = items.map(item => `
        <a href="#" class="detail-card bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 group" data-type="${escapeHtml(type)}" data-key="${escapeHtml(item.id)}">
            <div class="h-56 overflow-hidden">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.onerror=null;this.src='https://placehold.co/600x400/fecaca/991b1b?text=图片加载失败';">
            </div>
            <div class="p-6">
                <h4 class="font-bold text-xl text-gray-900 dark:text-gray-100">${escapeHtml(item.name)}</h4>
                <p class="text-gray-600 dark:text-gray-400 text-sm mt-2">${escapeHtml(item.summary)}</p>
            </div>
        </a>
    `).join('');

    return `
        <div class="w-full max-w-6xl mx-auto">
            <h3 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8 text-center">
                ${type === 'dormitory' ? '宿舍概览' : '美食天地'}
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${cardHtml}
            </div>
        </div>
    `;
}

/**
 * 模板: 宿舍详情页
 */
export function createDormitoryDetailsHtml(details) {
    return (details || []).map(dorm => {
        const sliderHtml = createSliderHtml(dorm.images);
        const listItems = [
            { icon: 'users', label: '房型', value: dorm.roomType },
            { icon: 'layout-grid', label: '布局', value: dorm.layout },
            { icon: 'wallet', label: '费用', value: dorm.price },
            { icon: 'shower-head', label: '卫浴', value: dorm.bathroom },
            { icon: 'heater', label: '热水', value: dorm.waterHeater },
            { icon: 'air-vent', label: '空调', value: dorm.ac },
            { icon: 'sun', label: '阳台', value: dorm.balcony },
            { icon: 'wifi', label: '网络', value: dorm.network },
            { icon: 'washing-machine', label: '洗衣', value: dorm.laundry },
        ];

        const listHtml = listItems.map(item => `
            <li class="flex items-center">
                <i data-lucide="${item.icon}" class="w-5 h-5 mr-3 text-blue-500"></i>
                <strong>${item.label}：</strong> ${escapeHtml(item.value)}
            </li>
        `).join('');

        const notesHtml = dorm.notes ? `
            <li class="flex items-start">
                <i data-lucide="info" class="w-5 h-5 mr-3 mt-1 text-blue-500 flex-shrink-0"></i>
                <div><strong>备注：</strong> ${escapeHtml(dorm.notes)}</div>
            </li>
        ` : '';

        return `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6 shadow-md border border-gray-200 dark:border-gray-700">
                <h4 class="font-bold text-xl text-blue-800 dark:text-blue-400 mb-4">${escapeHtml(dorm.building)}</h4>
                ${sliderHtml}
                <ul class="space-y-3 text-gray-700 dark:text-gray-300 mt-4">
                    ${listHtml}
                    ${notesHtml}
                </ul>
            </div>
        `;
    }).join('');
}

/**
 * 模板: 食堂详情页
 */
export function createCanteenDetailsHtml(details) {
    return (details || []).map(canteen => {
        const sliderHtml = createSliderHtml(canteen.images);
        const listItems = [
            { icon: 'sparkles', label: '特色菜品', value: (canteen.specialty || []).join('、 '), isFlexStart: true },
            { icon: 'wallet', label: '价格范围', value: canteen.priceRange },
            { icon: 'clock', label: '营业时间', value: canteen.openingHours },
        ];

        const listHtml = listItems.map(item => `
            <li class="flex ${item.isFlexStart ? 'items-start' : 'items-center'}">
                <i data-lucide="${item.icon}" class="w-5 h-5 mr-3 ${item.isFlexStart ? 'mt-1' : ''} text-green-500 flex-shrink-0"></i>
                <div><strong>${item.label}：</strong> ${escapeHtml(item.value)}</div>
            </li>
        `).join('');

        const notesHtml = canteen.notes ? `
             <li class="flex items-start">
                <i data-lucide="info" class="w-5 h-5 mr-3 mt-1 text-green-500 flex-shrink-0"></i>
                <div><strong>备注：</strong> ${escapeHtml(canteen.notes)}</div>
            </li>
        ` : '';

        return `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6 shadow-md border border-gray-200 dark:border-gray-700">
                <h4 class="font-bold text-xl text-green-800 dark:text-green-400 mb-4">${escapeHtml(canteen.area)}</h4>
                ${sliderHtml}
                <ul class="space-y-3 text-gray-700 dark:text-gray-300 mt-4">
                    ${listHtml}
                    ${notesHtml}
                </ul>
            </div>
        `;
    }).join('');
}

// ===================================================================================
// --- 新增: 学习资料共享模板 ---
// ===================================================================================

/**
 * 模板: 单个学习资料卡片
 * @param {object} material - 从 'study_materials' 集合获取的单个资料对象
 * @returns {string} 渲染好的HTML字符串
 */
export function createMaterialCardHtml(material) {
    // 根据文件类型选择不同的图标和颜色
    const fileTypeMap = {
        '历年考卷': { icon: 'file-text', color: 'text-red-500' },
        '复习笔记': { icon: 'notebook-pen', color: 'text-blue-500' },
        '课程作业': { icon: 'file-pen-line', color: 'text-green-500' },
        '课件PPT': { icon: 'presentation', color: 'text-orange-500' },
        '其他资料': { icon: 'file-question', color: 'text-gray-500' }
    };
    const typeInfo = fileTypeMap[material.materialType] || fileTypeMap['其他资料'];

    // 格式化上传时间
    const uploadDate = material.createdAt ? new Date(material.createdAt).toLocaleDateString() : '未知日期';

    return `
        <div class="material-card bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div class="p-5 flex-grow">
                <div class="flex items-start justify-between">
                    <div class="flex items-center min-w-0">
                        <i data-lucide="${typeInfo.icon}" class="w-8 h-8 ${typeInfo.color} flex-shrink-0 mr-4"></i>
                        <div class="min-w-0">
                            <h4 class="font-bold text-lg text-gray-900 dark:text-gray-100 truncate" title="${escapeHtml(material.courseName)}">${escapeHtml(material.courseName)}</h4>
                            <p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(material.teacher) || '未知教师'}</p>
                        </div>
                    </div>
                    <span class="text-xs font-semibold ${typeInfo.color} bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full whitespace-nowrap">${escapeHtml(material.materialType)}</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-300 mt-4 h-10 overflow-hidden">
                    ${escapeHtml(material.description) || '上传者没有留下任何描述...'}
                </p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800/50 px-5 py-3 border-t dark:border-gray-700">
                <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <div class="flex items-center" title="上传者">
                        <i data-lucide="user" class="w-3 h-3 mr-1.5"></i>
                        <span class="truncate">${escapeHtml(material.uploaderNickname) || '匿名用户'}</span>
                    </div>
                    <div class="flex items-center" title="上传日期">
                        <i data-lucide="calendar" class="w-3 h-3 mr-1.5"></i>
                        <span>${uploadDate}</span>
                    </div>
                </div>
                <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                     <div class="flex items-center" title="下载次数">
                        <i data-lucide="download" class="w-3 h-3 mr-1.5"></i>
                        <span>${material.downloadCount || 0}</span>
                    </div>
                    <div class="flex items-center" title="评分">
                        <i data-lucide="star" class="w-3 h-3 mr-1.5 text-yellow-500"></i>
                        <span>${material.rating ? material.rating.toFixed(1) : '暂无评分'}</span>
                    </div>
                </div>
                 <button class="download-material-btn mt-4 w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center justify-center" data-file-path="${escapeHtml(material.fileCloudPath)}" data-doc-id="${escapeHtml(material._id)}">
                    <i data-lucide="download-cloud" class="w-4 h-4 mr-2"></i>
                    <span>下载</span>
                </button>
            </div>
        </div>
    `;
}

/**
 * 模板: 学习资料列表
 * @param {Array<object>} materials - 从 'study_materials' 集合获取的资料对象数组
 * @returns {string} 渲染好的HTML字符串
 */
export function createMaterialsListHtml(materials) {
    if (!materials || materials.length === 0) {
        // =================================================================
        // [体验优化] 任务4：在这里修改空状态的 HTML，增加一个上传按钮
        // =================================================================
        return `
            <div class="text-center py-16">
                <i data-lucide="folder-search" class="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto"></i>
                <h3 class="mt-4 text-xl font-semibold text-gray-800 dark:text-gray-200">空空如也</h3>
                <p class="mt-2 text-gray-500 dark:text-gray-400">还没有人分享资料，快来当第一个贡献者吧！</p>
                <button id="upload-from-empty-state-btn" class="mt-6 bg-blue-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center justify-center mx-auto">
                    <i data-lucide="upload-cloud" class="w-5 h-5 mr-2"></i>
                    <span>立即上传</span>
                </button>
            </div>
        `;
        // =================================================================
        // HTML 修改结束
        // =================================================================
    }

    const cardsHtml = materials.map(createMaterialCardHtml).join('');

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            ${cardsHtml}
        </div>
    `;
}
