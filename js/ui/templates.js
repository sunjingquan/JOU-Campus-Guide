/**
 * @file UI 模板模块 (UI Templates)
 * @description 这个模块是所有UI组件的“HTML蓝图”。它包含一系列纯函数，
 * 每个函数接收纯净的JSON数据，并返回对应的HTML字符串。
 * 这使得视图和数据完全分离，方便独立维护。
 * @version 2.0.0
 */

// --- 辅助函数 ---

/**
 * 对HTML内容进行转义，防止XSS攻击。
 * @param {string | number} str - 需要转义的字符串。
 * @returns {string} 转义后的安全HTML字符串。
 */
function escapeHtml(str) {
    if (typeof str !== 'string' && typeof str !== 'number') return '';
    const strConv = String(str);
    return strConv.replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[match]);
}

// ===================================================================================
// --- 组件级模板 (可复用的UI片段) ---
// ===================================================================================

/**
 * 创建一个图片轮播组件。
 * @param {Array<object>} images - 图片对象数组，每个对象应包含 src 和 caption。
 * @returns {string} 轮播组件的HTML。
 */
export function createSliderHtml(images) {
    if (!images || images.length === 0) {
        return `<img src="https://placehold.co/800x450/cccccc/ffffff?text=无图片" alt="无图片" class="w-full h-auto object-cover rounded-lg mb-4">`;
    }

    const slidesHtml = images.map((img, index) => `
        <div class="slider-slide" data-index="${index}">
            <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.caption)}" onerror="this.onerror=null;this.src='https://placehold.co/800x450/fecaca/991b1b?text=图片加载失败';">
        </div>
    `).join('');

    const dotsHtml = images.map((_, index) => `
        <button class="dot" data-index="${index}"></button>
    `).join('');

    const singleImageCaption = images.length === 1 ? `<p class="text-white text-center text-sm font-semibold truncate">${escapeHtml(images[0].caption)}</p>` : `<p class="slider-caption text-white text-center text-sm font-semibold truncate"></p>`;

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
            ` : ''}
            
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-10">
                ${singleImageCaption}
                ${images.length > 1 ? `
                <div class="slider-dots flex justify-center space-x-2 mt-2">
                    ${dotsHtml}
                </div>
                ` : ''}
            </div>
        </div>
    `;
}


// ===================================================================================
// --- 页面级模板 (完整的页面或大型区块) ---
// ===================================================================================

/**
 * 创建主页内容 (Hero section 和 快速导航)。
 * @param {object} heroData - Hero区域的数据。
 * @param {Array<object>} quickNavData - 快速导航的数据。
 * @returns {string} 主页内容的HTML。
 */
export function createHomePage(heroData, quickNavData) {
    const navCards = (quickNavData || []).map(item => {
        const navLinkData = JSON.stringify(item.link || {});
        const colors = {
            blue: { bg: 'bg-blue-100', text: 'text-blue-600', shadow: 'dark:hover:shadow-blue-500/20' },
            green: { bg: 'bg-green-100', text: 'text-green-600', shadow: 'dark:hover:shadow-green-500/20' },
            purple: { bg: 'bg-purple-100', text: 'text-purple-600', shadow: 'dark:hover:shadow-purple-500/20' },
            red: { bg: 'bg-red-100', text: 'text-red-600', shadow: 'dark:hover:shadow-red-500/20' }
        };
        const color = colors[item.color] || colors.blue;

        return `
        <a href="#" data-navlink='${escapeHtml(navLinkData)}' class="nav-card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-2xl ${color.shadow} hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center">
            <div class="${color.bg} ${color.text} p-4 rounded-full mb-4"><i data-lucide="${escapeHtml(item.icon)}" class="w-8 h-8"></i></div>
            <h3 class="font-semibold text-lg text-gray-900 dark:text-gray-100">${escapeHtml(item.title)}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(item.description)}</p>
        </a>`;
    }).join('');

    return `
    <div class="flex flex-col justify-center items-center h-full">
        <div class="hero-bg text-white p-12 rounded-2xl text-center flex flex-col items-center justify-center shadow-xl mb-12">
            <h1 class="text-5xl font-extrabold mb-4 drop-shadow-lg">${escapeHtml(heroData.title)}</h1>
            <p class="text-lg max-w-2xl mb-8 drop-shadow-md">${escapeHtml(heroData.subtitle)}</p>
            <button id="explore-btn" class="bg-white text-blue-800 font-bold py-3 px-8 rounded-full text-lg hover:bg-blue-100 transform hover:scale-105 transition-all duration-300 shadow-lg">${escapeHtml(heroData.buttonText)}</button>
        </div>
        <div>
            <h2 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8 text-center">快速导航</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                ${navCards}
            </div>
        </div>
    </div>`;
}

/**
 * 创建校区查询工具的HTML。
 * @returns {string} 校区查询工具的HTML。
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
 * 创建通用内容区块页面 (例如：开学必备清单)。
 * @param {Array<object>} sections - 内容区块的数据。
 * @param {object} [tips] - 可选的提示信息数据。
 * @returns {string} 内容区块页面的HTML。
 */
export function createSectionsHtml(sections, tips) {
    const sectionsHtml = (sections || []).map(section => {
        const itemsHtml = section.items ? `<ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
        const specialItemsHtml = section.specialItems ? `<ul class="list-none space-y-4 text-gray-700 dark:text-gray-300">${section.specialItems.map(item => `<li class="flex items-start"><i data-lucide="check-circle-2" class="text-green-500 w-5 h-5 mr-3 mt-1 flex-shrink-0"></i><div><strong>${escapeHtml(item.label)}：</strong>${escapeHtml(item.value)}</div></li>`).join('')}</ul>` : '';
        const color = section.color || 'blue';
        return `
        <div class="p-6 rounded-xl w-full">
            <h3 class="text-2xl font-bold text-${color}-800 dark:text-${color}-400 mb-6 border-l-4 border-${color}-700 dark:border-${color}-500 pl-4">${escapeHtml(section.title)}</h3>
            ${section.description ? `<p class="text-gray-700 dark:text-gray-300 mb-4">${escapeHtml(section.description)}</p>` : ''}
            ${itemsHtml}
            ${specialItemsHtml}
        </div>`;
    }).join('');

    const tipsHtml = tips ? `
    <div class="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 p-6 rounded-lg w-full mt-10" role="alert">
        <div class="flex">
            <div class="py-1"><i data-lucide="alert-triangle" class="w-6 h-6 text-yellow-600 mr-4 flex-shrink-0"></i></div>
            <div>
                <p class="font-bold">${escapeHtml(tips.title)}</p>
                <ul class="list-disc list-inside mt-2 text-sm">
                    ${(tips.items || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>` : '';

    return `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">${sectionsHtml}${tipsHtml}</div>`;
}

/**
 * 创建时间轴/步骤列表 (例如：入学流程)。
 * @param {Array<object>} stepsData - 步骤列表的数据。
 * @returns {string} 时间轴的HTML。
 */
export function createStepsHtml(stepsData) {
    const stepsHtml = (stepsData || []).map((step, index) => `
      <div class="relative">
          <div class="absolute w-4 h-4 bg-blue-600 rounded-full -left-2 ring-8 ring-white dark:ring-gray-800" style="top: 0.25rem;"></div>
          <h3 class="text-xl font-bold text-blue-800 dark:text-blue-400">${escapeHtml(index + 1)}. ${escapeHtml(step.title)}</h3>
          <p class="text-gray-600 dark:text-gray-300 mt-2">${escapeHtml(step.description)}</p>
      </div>
    `).join('');
    return `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><div class="relative border-l-4 border-blue-500 pl-10 space-y-12 py-4">${stepsHtml}</div></div>`;
}

/**
 * 创建要点列表 (例如：开学须知)。
 * @param {Array<object>} pointsData - 要点列表的数据。
 * @returns {string} 要点列表的HTML。
 */
export function createPointsHtml(pointsData) {
    const pointsHtml = (pointsData || []).map(point => `
    <div class="border-b dark:border-gray-700 pb-4 last:border-b-0">
        <h4 class="font-bold text-xl text-gray-800 dark:text-gray-100 flex items-center">
            <i data-lucide="${escapeHtml(point.icon)}" class="${escapeHtml(point.color) || 'text-indigo-500'} mr-3"></i>${escapeHtml(point.title)}
        </h4>
        <p class="text-gray-600 dark:text-gray-300 mt-2 pl-8">${escapeHtml(point.description)}</p>
    </div>`).join('');
    return `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><div class="space-y-6">${pointsHtml}</div></div>`;
}

/**
 * 创建校区特定内容（宿舍/食堂）的卡片列表。
 * @param {Array<object>} items - 项目列表数据 (宿舍或食堂)。
 * @param {string} type - 'dormitory' 或 'canteen'。
 * @returns {string} 卡片列表的HTML。
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

    return `<div class="w-full max-w-6xl mx-auto">
                 <h3 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8 text-center">${type === 'dormitory' ? '宿舍概览' : '美食天地'}</h3>
                 <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     ${cardHtml}
                 </div>
             </div>`;
}

/**
 * 创建宿舍详情页的HTML。
 * @param {Array<object>} details - 宿舍楼栋的详细信息数组。
 * @returns {string} 宿舍详情页的HTML。
 */
export function createDormitoryDetailsHtml(details) {
    return (details || []).map(dorm => {
        const sliderHtml = createSliderHtml(dorm.images);
        return `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h4 class="font-bold text-xl text-blue-800 dark:text-blue-400 mb-4">${escapeHtml(dorm.building)}</h4>
            ${sliderHtml}
            <ul class="space-y-3 text-gray-700 dark:text-gray-300 mt-4">
                <li class="flex items-center"><i data-lucide="users" class="w-5 h-5 mr-3 text-blue-500"></i><strong>房型：</strong> ${escapeHtml(dorm.roomType)}</li>
                <li class="flex items-center"><i data-lucide="layout-grid" class="w-5 h-5 mr-3 text-blue-500"></i><strong>布局：</strong> ${escapeHtml(dorm.layout)}</li>
                <li class="flex items-center"><i data-lucide="wallet" class="w-5 h-5 mr-3 text-blue-500"></i><strong>费用：</strong> ${escapeHtml(dorm.price)}</li>
                <li class="flex items-center"><i data-lucide="shower-head" class="w-5 h-5 mr-3 text-blue-500"></i><strong>卫浴：</strong> ${escapeHtml(dorm.bathroom)}</li>
                <li class="flex items-center"><i data-lucide="heater" class="w-5 h-5 mr-3 text-blue-500"></i><strong>热水：</strong> ${escapeHtml(dorm.waterHeater)}</li>
                <li class="flex items-center"><i data-lucide="air-vent" class="w-5 h-5 mr-3 text-blue-500"></i><strong>空调：</strong> ${escapeHtml(dorm.ac)}</li>
                <li class="flex items-center"><i data-lucide="sun" class="w-5 h-5 mr-3 text-blue-500"></i><strong>阳台：</strong> ${escapeHtml(dorm.balcony)}</li>
                <li class="flex items-center"><i data-lucide="wifi" class="w-5 h-5 mr-3 text-blue-500"></i><strong>网络：</strong> ${escapeHtml(dorm.network)}</li>
                <li class="flex items-center"><i data-lucide="washing-machine" class="w-5 h-5 mr-3 text-blue-500"></i><strong>洗衣：</strong> ${escapeHtml(dorm.laundry)}</li>
                ${dorm.notes ? `<li class="flex items-start"><i data-lucide="info" class="w-5 h-5 mr-3 mt-1 text-blue-500 flex-shrink-0"></i><div><strong>备注：</strong> ${escapeHtml(dorm.notes)}</div></li>` : ''}
            </ul>
        </div>
    `}).join('');
}

/**
 * 创建食堂详情页的HTML。
 * @param {Array<object>} details - 食堂区域的详细信息数组。
 * @returns {string} 食堂详情页的HTML。
 */
export function createCanteenDetailsHtml(details) {
    return (details || []).map(canteen => {
        const sliderHtml = createSliderHtml(canteen.images);
        return `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h4 class="font-bold text-xl text-green-800 dark:text-green-400 mb-4">${escapeHtml(canteen.area)}</h4>
            ${sliderHtml}
            <ul class="space-y-3 text-gray-700 dark:text-gray-300 mt-4">
                <li class="flex items-start"><i data-lucide="sparkles" class="w-5 h-5 mr-3 mt-1 text-green-500 flex-shrink-0"></i><div><strong>特色菜品：</strong> ${escapeHtml((canteen.specialty || []).join('、 '))}</div></li>
                <li class="flex items-center"><i data-lucide="wallet" class="w-5 h-5 mr-3 text-green-500"></i><strong>价格范围：</strong> ${escapeHtml(canteen.priceRange)}</li>
                <li class="flex items-center"><i data-lucide="clock" class="w-5 h-5 mr-3 text-green-500"></i><strong>营业时间：</strong> ${escapeHtml(canteen.openingHours)}</li>
                ${canteen.notes ? `<li class="flex items-start"><i data-lucide="info" class="w-5 h-5 mr-3 mt-1 text-green-500 flex-shrink-0"></i><div><strong>备注：</strong> ${escapeHtml(canteen.notes)}</div></li>` : ''}
            </ul>
        </div>
    `}).join('');
}

/**
 * 创建常见问题 (FAQ) 页面的HTML。
 * @param {Array<object>} items - FAQ问答对列表。
 * @returns {string} FAQ页面的HTML。
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
    return `<div class="space-y-4 w-full max-w-4xl mx-auto">${faqItems}</div>`;
}

/**
 * 创建社团与组织页面的HTML。
 * @param {object} data - 包含社团和组织信息的对象。
 * @returns {string} 社团页面的完整HTML。
 */
export function createClubsHtml(data) {
    if (!data) return '';

    const createClubItem = (clubName, icon, color) => `
        <div class="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-md flex items-center space-x-3 transform hover:scale-105 hover:shadow-xl transition-all duration-300">
            <i data-lucide="${escapeHtml(icon)}" class="w-6 h-6 ${escapeHtml(color)} flex-shrink-0"></i>
            <span class="text-gray-800 dark:text-gray-200 font-medium">${escapeHtml(clubName)}</span>
        </div>`;

    const tabsHtml = (data.clubs || []).map((group, index) => `
        <button class="tab-button px-4 py-3 text-base md:text-lg text-gray-600 dark:text-gray-400 whitespace-nowrap" data-level="${escapeHtml(String(group.level))}">
            <i data-lucide="${escapeHtml(group.icon)}" class="inline-block w-5 h-5 mr-2 ${escapeHtml(group.color)}"></i>
            ${escapeHtml(group.label)}
        </button>
    `).join('');

    const panesHtml = (data.clubs || []).map((group, index) => {
        const clubListHtml = (group.list || []).map(clubName => createClubItem(clubName, group.icon, group.color)).join('');
        return `
            <div class="club-pane" data-level="${escapeHtml(String(group.level))}">
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    ${clubListHtml}
                </div>
            </div>
        `;
    }).join('');
    
    // Create 'All' tab content
    const allClubsListHtml = (data.clubs || []).flatMap(group => 
        (group.list || []).map(clubName => createClubItem(clubName, group.icon, group.color))
    ).join('');

    const allPaneHtml = `
        <div class="club-pane active" data-level="all">
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                ${allClubsListHtml}
            </div>
        </div>
    `;

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
                    ${allPaneHtml}${panesHtml}
                </div>
            </div>
            ${data.organizations ? `
            <div class="w-full mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h3 class="text-2xl font-bold text-indigo-800 dark:text-indigo-400 mb-6 border-l-4 border-indigo-700 dark:border-indigo-500 pl-4">${escapeHtml(data.organizations.title)}</h3>
                <p class="text-gray-700 dark:text-gray-300">${escapeHtml(data.organizations.content)}</p>
            </div>
            ` : ''}
        </div>
    `;
}

/**
 * 创建一个简单的链接页面。
 * @param {string} link - 链接URL。
 * @param {string} title - 页面标题。
 * @returns {string} 链接页面的HTML。
 */
export function createLinkHtml(link, title) {
    return `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">${escapeHtml(title)}</h3><div class="overflow-x-auto"><p class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 break-all"><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link)}</a></p></div></div>`;
}
