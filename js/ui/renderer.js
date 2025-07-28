/**
 * @file UI 渲染器 (UI Renderer) - 最终修复版
 * @description 该模块是所有UI渲染的核心。它接收纯净的、结构化的数据，
 * 并负责将其转换为带有完整样式的、用户可见的HTML。
 * @version 4.2.0 - 修复时间轴样式和导航链接数据
 */

// --- 辅助函数 ---
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, match => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[match]);
}

// ===================================================================================
// --- 主渲染函数 (渲染引擎入口) ---
// ===================================================================================

export function renderPageContent(page) {
    if (page.type === 'faq') return createFaqHtml(page.structuredContent.items);
    if (page.type === 'clubs') return createClubsHtml(page.structuredContent);
    if (page.type === 'campus-query-tool') return createCampusQueryToolHtml();
    if (page.structuredContent) {
        return renderStructuredContent(page.structuredContent);
    }
    return '<p class="text-center p-8">此页面内容待添加。</p>';
}

// ===================================================================================
// --- 结构化内容渲染器 (内部使用的“装修图纸”) ---
// ===================================================================================

function renderStructuredContent(content) {
    let html = '';
    if (content.hero) html += _renderHero(content.hero, content.quickNav);
    if (content.points) html += _renderPoints(content.points);
    if (content.steps) html += _renderSteps(content.steps);
    if (content.sections) html += _renderSections(content.sections);
    if (content.tips) html += _renderTips(content.tips);
    if (content.link) html += _renderLink(content.link, content.title);
    return html;
}

function _renderHero(hero, quickNav) {
    const quickNavHtml = quickNav.map(item => {
        // [关键修复] 将 link 对象直接序列化。现在 link 对象里应该包含 categoryKey 和 pageKey
        // 我们假设数据库中的 link 结构是 { "categoryKey": "preparation", "pageKey": "enrollmentProcess" }
        // 如果不是，我们需要在 dataManager 中转换它。为了简单，我们直接在这里使用中文标题，然后在 main.js 中查找。
        const navLinkData = JSON.stringify(item.link);
        return `
        <a href="#" data-navlink='${escapeHtml(navLinkData)}' class="nav-card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-2xl dark:hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center">
            <div class="bg-blue-100 text-blue-600 p-4 rounded-full mb-4"><i data-lucide="${escapeHtml(item.icon)}" class="w-8 h-8"></i></div>
            <h3 class="font-semibold text-lg text-gray-900 dark:text-gray-100">${escapeHtml(item.title)}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(item.description)}</p>
        </a>`;
    }).join('');

    return `
    <div class="flex flex-col justify-center items-center h-full">
        <div class="hero-bg text-white p-12 rounded-2xl text-center flex flex-col items-center justify-center shadow-xl mb-12">
            <h1 class="text-5xl font-extrabold mb-4 drop-shadow-lg">${escapeHtml(hero.title)}</h1>
            <p class="text-lg max-w-2xl mb-8 drop-shadow-md">${escapeHtml(hero.subtitle)}</p>
            <button id="explore-btn" class="bg-white text-blue-800 font-bold py-3 px-8 rounded-full text-lg hover:bg-blue-100 transform hover:scale-105 transition-all duration-300 shadow-lg">${escapeHtml(hero.buttonText)}</button>
        </div>
        <div>
            <h2 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8 text-center">快速导航</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                ${quickNavHtml}
            </div>
        </div>
    </div>`;
}

function _renderPoints(points) {
    const pointsHtml = points.map(point => `
    <div class="border-b dark:border-gray-700 pb-4">
        <h4 class="font-bold text-xl text-gray-800 dark:text-gray-100 flex items-center">
            <i data-lucide="${escapeHtml(point.icon)}" class="text-indigo-500 mr-3"></i>${escapeHtml(point.title)}
        </h4>
        <p class="text-gray-600 dark:text-gray-300 mt-2 pl-8">${escapeHtml(point.description)}</p>
    </div>`).join('');
    return `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><div class="space-y-6">${pointsHtml}</div></div>`;
}

/**
 * [关键修复] 重写时间轴渲染逻辑，确保样式稳定
 */
function _renderSteps(steps) {
    const stepsHtml = steps.map((step, index) => `
      <li class="mb-10 ml-6">            
          <span class="absolute flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full -left-5 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
              <span class="font-bold text-xl text-blue-800 dark:text-blue-300">${index + 1}</span>
          </span>
          <h3 class="flex items-center mb-1 text-xl font-semibold text-gray-900 dark:text-white">${escapeHtml(step.title)}</h3>
          <p class="mb-4 text-base font-normal text-gray-500 dark:text-gray-400">${escapeHtml(step.description)}</p>
      </li>
    `).join('');
    // 使用 <ol> 和 <li> 标签，这是标准的列表结构，更语义化且稳定
    return `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><ol class="relative border-l border-gray-200 dark:border-gray-700 mt-8 ml-4">${stepsHtml}</ol></div>`;
}


function _renderSections(sections) {
    const sectionsHtml = sections.map(section => {
        const itemsHtml = section.items ? `<ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
        return `
        <div class="p-6 rounded-xl w-full">
            <h3 class="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-6 border-l-4 border-blue-700 dark:border-blue-500 pl-4">${escapeHtml(section.category || section.title)}</h3>
            ${section.description ? `<p class="text-gray-700 dark:text-gray-300 mb-4">${escapeHtml(section.description)}</p>` : ''}
            ${itemsHtml}
        </div>`;
    }).join('');
    return `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">${sectionsHtml}</div>`;
}

function _renderTips(tips) {
    return `
    <div class="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 p-6 rounded-lg w-full mt-10" role="alert">
        <div class="flex">
            <div class="py-1"><i data-lucide="alert-triangle" class="w-6 h-6 text-yellow-600 mr-4 flex-shrink-0"></i></div>
            <div>
                <p class="font-bold">${escapeHtml(tips.title)}</p>
                <ul class="list-disc list-inside mt-2 text-sm">
                    ${tips.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>`;
}

function _renderLink(link, title) {
    return `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">${escapeHtml(title)}</h3><div class="overflow-x-auto"><p style="color: rgb(0, 0, 255);"><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link)}</a></p></div></div>`;
}

// --- 你的旧版渲染函数 (保持不变) ---
export function generateDormitoryDetailsHtml(details) {
    return details.map(dorm => {
        const sliderHtml = generateSliderHtml(dorm.images);
        return `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h4 class="font-bold text-xl text-blue-800 dark:text-blue-400 mb-4">${dorm.building}</h4>
            ${sliderHtml}
            <ul class="space-y-3 text-gray-700 dark:text-gray-300 mt-4">
                <li class="flex items-center"><i data-lucide="users" class="w-5 h-5 mr-3 text-blue-500"></i><strong>房型：</strong> ${dorm.roomType}</li>
                <li class="flex items-center"><i data-lucide="layout-grid" class="w-5 h-5 mr-3 text-blue-500"></i><strong>布局：</strong> ${dorm.layout}</li>
                <li class="flex items-center"><i data-lucide="wallet" class="w-5 h-5 mr-3 text-blue-500"></i><strong>费用：</strong> ${dorm.price}</li>
                <li class="flex items-center"><i data-lucide="shower-head" class="w-5 h-5 mr-3 text-blue-500"></i><strong>卫浴：</strong> ${dorm.bathroom}</li>
                <li class="flex items-center"><i data-lucide="heater" class="w-5 h-5 mr-3 text-blue-500"></i><strong>热水：</strong> ${dorm.waterHeater}</li>
                <li class="flex items-center"><i data-lucide="air-vent" class="w-5 h-5 mr-3 text-blue-500"></i><strong>空调：</strong> ${dorm.ac}</li>
                <li class="flex items-center"><i data-lucide="sun" class="w-5 h-5 mr-3 text-blue-500"></i><strong>阳台：</strong> ${dorm.balcony}</li>
                <li class="flex items-center"><i data-lucide="wifi" class="w-5 h-5 mr-3 text-blue-500"></i><strong>网络：</strong> ${dorm.network}</li>
                <li class="flex items-center"><i data-lucide="washing-machine" class="w-5 h-5 mr-3 text-blue-500"></i><strong>洗衣：</strong> ${dorm.laundry}</li>
                ${dorm.notes ? `<li class="flex items-start"><i data-lucide="info" class="w-5 h-5 mr-3 mt-1 text-blue-500 flex-shrink-0"></i><div><strong>备注：</strong> ${dorm.notes}</div></li>` : ''}
            </ul>
        </div>
    `}).join('');
}
export function generateCanteenDetailsHtml(details) {
    return details.map(canteen => {
        const sliderHtml = generateSliderHtml(canteen.images);
        return `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h4 class="font-bold text-xl text-green-800 dark:text-green-400 mb-4">${canteen.area}</h4>
            ${sliderHtml}
            <ul class="space-y-3 text-gray-700 dark:text-gray-300 mt-4">
                <li class="flex items-start"><i data-lucide="sparkles" class="w-5 h-5 mr-3 mt-1 text-green-500 flex-shrink-0"></i><div><strong>特色菜品：</strong> ${canteen.specialty.join('、 ')}</div></li>
                <li class="flex items-center"><i data-lucide="wallet" class="w-5 h-5 mr-3 text-green-500"></i><strong>价格范围：</strong> ${canteen.priceRange}</li>
                <li class="flex items-center"><i data-lucide="clock" class="w-5 h-5 mr-3 text-green-500"></i><strong>营业时间：</strong> ${canteen.openingHours}</li>
                ${canteen.notes ? `<li class="flex items-start"><i data-lucide="info" class="w-5 h-5 mr-3 mt-1 text-green-500 flex-shrink-0"></i><div><strong>备注：</strong> ${canteen.notes}</div></li>` : ''}
            </ul>
        </div>
    `}).join('');
}
export function generateCampusCards(items, type) {
    if (!Array.isArray(items) || items.length === 0) {
        return `<p class="text-gray-500 dark:text-gray-400 text-center p-8">该校区暂无相关信息。</p>`;
    }
    const cardHtml = items.map(item => {
        return `
             <a href="#" class="detail-card bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 group" data-type="${type}" data-key="${item.id}">
                 <div class="h-56 overflow-hidden">
                     <img src="${item.image}" alt="[${item.name}的图片]" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.onerror=null;this.src='https://placehold.co/600x400/fecaca/991b1b?text=图片加载失败';">
                 </div>
                 <div class="p-6">
                     <h4 class="font-bold text-xl text-gray-900 dark:text-gray-100">${item.name}</h4>
                     <p class="text-gray-600 dark:text-gray-400 text-sm mt-2">${item.summary}</p>
                 </div>
             </a>
         `;
    }).join('');

    return `<div class="w-full max-w-6xl mx-auto">
                 <h3 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8 text-center">${type === 'dormitory' ? '宿舍概览' : '美食天地'}</h3>
                 <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     ${cardHtml}
                 </div>
             </div>`;
}
export function createFaqHtml(items) {
    let html = '<div class="space-y-4 w-full max-w-4xl mx-auto">';
    items.forEach((item) => {
        html += `<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"><div class="accordion-header w-full p-5 text-left font-semibold text-gray-800 dark:text-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"><span class="text-lg">${item.q}</span><i data-lucide="chevron-down" class="accordion-icon transition-transform duration-300 w-5 h-5"></i></div><div class="accordion-content bg-gray-50 dark:bg-gray-700/50 p-5 border-t border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300" style="display: none;"><p>${item.a}</p></div></div>`;
    });
    html += '</div>';
    return html;
}
export function createClubsHtml(data) {
    const allTabHtml = `
        <button class="tab-button px-4 py-3 text-base md:text-lg text-gray-600 dark:text-gray-400" data-level="all">
            <i data-lucide="layout-grid" class="inline-block w-5 h-5 mr-2 text-blue-500"></i>
            全部
        </button>
    `;

    const tabsHtml = data.clubs.map((group, index) => `
        <button class="tab-button px-4 py-3 text-base md:text-lg text-gray-600 dark:text-gray-400 ${index === 0 ? 'active' : ''}" data-level="${group.level}">
            <i data-lucide="${group.icon}" class="inline-block w-5 h-5 mr-2 ${group.color}"></i>
            ${group.label}
        </button>
    `).join('');

    let allClubsListHtml = '';
    data.clubs.forEach(group => {
        allClubsListHtml += group.list.map(clubName => `
            <div class="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-md flex items-center space-x-3 transform hover:scale-105 hover:shadow-xl transition-all duration-300">
                <i data-lucide="${group.icon}" class="w-6 h-6 ${group.color} flex-shrink-0"></i>
                <span class="text-gray-800 dark:text-gray-200 font-medium">${clubName}</span>
            </div>
        `).join('');
    });
    const allPaneHtml = `
        <div class="club-pane" data-level="all">
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                ${allClubsListHtml}
            </div>
        </div>
    `;

    const panesHtml = data.clubs.map((group, index) => {
        const clubListHtml = group.list.map(clubName => `
            <div class="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-md flex items-center space-x-3 transform hover:scale-105 hover:shadow-xl transition-all duration-300">
                <i data-lucide="${group.icon}" class="w-6 h-6 ${group.color} flex-shrink-0"></i>
                <span class="text-gray-800 dark:text-gray-200 font-medium">${clubName}</span>
            </div>
        `).join('');

        return `
            <div class="club-pane ${index === 0 ? 'active' : ''}" data-level="${group.level}">
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    ${clubListHtml}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg w-full max-w-6xl mx-auto">
            <div class="w-full">
                <h3 class="text-2xl font-bold text-rose-800 dark:text-rose-400 mb-6 border-l-4 border-rose-700 dark:border-rose-500 pl-4">学生社团</h3>
                <p class="text-gray-700 dark:text-gray-300 mb-8">${data.introduction}</p>
                
                <div class="club-tabs border-b border-gray-200 dark:border-gray-700 mb-6 flex space-x-2 md:space-x-4 overflow-x-auto">
                    ${allTabHtml}${tabsHtml}
                </div>
                <div class="club-panes-container">
                    ${allPaneHtml}${panesHtml}
                </div>
            </div>
            <div class="w-full mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h3 class="text-2xl font-bold text-indigo-800 dark:text-indigo-400 mb-6 border-l-4 border-indigo-700 dark:border-indigo-500 pl-4">${data.organizations.title}</h3>
                <p class="text-gray-700 dark:text-gray-300">${data.organizations.content}</p>
            </div>
        </div>
    `;
}
export function createCampusQueryToolHtml() {
    return `
        <div class="campus-query-tool-container w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mx-auto" style="font-family: 'Inter', sans-serif;">
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
function generateSliderHtml(images) {
    if (!images || images.length === 0) {
        return `<img src="https://placehold.co/800x450/cccccc/ffffff?text=无图片" alt="[无图片]" class="w-full h-auto object-cover rounded-lg mb-4">`;
    }

    const slidesHtml = images.map((img, index) => `
        <div class="slider-slide" data-index="${index}">
            <img src="${img.src}" alt="${img.caption}" onerror="this.onerror=null;this.src='https://placehold.co/800x450/fecaca/991b1b?text=图片加载失败';">
        </div>
    `).join('');

    const dotsHtml = images.map((_, index) => `
        <button class="dot" data-index="${index}"></button>
    `).join('');

    return `
        <div class="image-slider relative overflow-hidden rounded-lg shadow-md mb-4">
            <div class="slider-wrapper flex">
                ${slidesHtml}
            </div>
            
            ${images.length > 1 ? `
            <button class="slider-nav prev absolute top-1/2 -translate-y-1/2 left-3 z-10">
                <i data-lucide="chevron-left" class="w-6 h-6"></i>
            </button>
            <button class="slider-nav next absolute top-1/2 -translate-y-1/2 right-3 z-10">
                <i data-lucide="chevron-right" class="w-6 h-6"></i>
            </button>
            
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-10">
                <p class="slider-caption text-white text-center text-sm font-semibold truncate"></p>
                <div class="slider-dots flex justify-center space-x-2 mt-2">
                    ${dotsHtml}
                </div>
            </div>
            ` : `
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-10">
               <p class="text-white text-center text-sm font-semibold truncate">${images[0].caption}</p>
            </div>
            `}
        </div>
    `;
}
