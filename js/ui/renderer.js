/**
 * @file UI Renderer Module
 * @description 该模块包含所有用于生成HTML字符串的纯函数。
 * 它接收数据作为输入，并返回渲染后的HTML，不直接操作DOM。
 */

/**
 * 为详情页生成图片轮播器的HTML。
 * @param {Array<Object>} images - 图片对象数组，每个对象包含 src 和 caption。
 * @returns {string} 轮播器的HTML字符串。
 */
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

/**
 * 生成宿舍详情区域的HTML。
 * @param {Array<Object>} details - 宿舍楼栋详情数组。
 * @returns {string} 宿舍详情HTML字符串。
 */
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

/**
 * 生成食堂详情区域的HTML。
 * @param {Array<Object>} details - 食堂区域详情数组。
 * @returns {string} 食堂详情HTML字符串。
 */
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

/**
 * 为校区特定内容（宿舍/食堂）生成概览卡片网格的HTML。
 * @param {Object} items - 包含多个宿舍或食堂信息的对象。
 * @param {string} type - 'dormitory' 或 'canteen'。
 * @returns {string} 卡片网格的HTML字符串。
 */
export function generateCampusCards(items, type) {
    if (!items) return '<p class="text-gray-500 dark:text-gray-400">该校区暂无相关信息。</p>';
    const itemKeys = Object.keys(items);
    const cardHtml = itemKeys.map(key => {
        const item = items[key];
        return `
             <a href="#" class="detail-card bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 group" data-type="${type}" data-key="${key}">
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

/**
 * 创建FAQ（常见问题）区域的HTML。
 * @param {Array<Object>} items - FAQ问答对数组。
 * @returns {string} FAQ区域的HTML字符串。
 */
export function createFaqHtml(items) {
    let html = '<div class="space-y-4 w-full max-w-4xl mx-auto">';
    items.forEach((item) => {
        html += `<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"><div class="accordion-header w-full p-5 text-left font-semibold text-gray-800 dark:text-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"><span class="text-lg">${item.q}</span><i data-lucide="chevron-down" class="accordion-icon transition-transform duration-300 w-5 h-5"></i></div><div class="accordion-content bg-gray-50 dark:bg-gray-700/50 p-5 border-t border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300" style="display: none;"><p>${item.a}</p></div></div>`;
    });
    html += '</div>';
    return html;
}

/**
 * 创建社团与组织页面的HTML。
 * @param {Object} data - 包含社团和组织信息的对象。
 * @returns {string} 社团页面的HTML字符串。
 */
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

/**
 * 创建大一校区查询工具的HTML。
 * @returns {string} 查询工具的HTML字符串。
 */
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
