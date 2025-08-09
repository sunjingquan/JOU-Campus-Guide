/**
 * @file 学习资料组件 - 模板模块
 * @description 该文件专门负责生成“学习资料”功能所需的所有HTML结构。
 * 它接收纯净的JS数据，并返回HTML字符串，实现了视图和逻辑的彻底分离。
 * @version 1.0.0
 */

/**
 * 辅助函数: 创建五星评分组件的HTML
 * @param {string} docId - 资料的文档ID
 * @param {number} rating - 平均分 (0-5)
 * @param {number} ratingCount - 评分人数
 * @returns {string}
 */
function createRatingStarsHtml(docId, rating = 0, ratingCount = 0) {
    let starsHtml = '';
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;

    for (let i = 0; i < fullStars; i++) {
        starsHtml += `<i data-lucide="star" class="rating-star star-filled" data-value="${i + 1}"></i>`;
    }
    if (halfStar) {
        starsHtml += `<i data-lucide="star-half" class="rating-star star-filled" data-value="${fullStars + 1}"></i>`;
    }
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += `<i data-lucide="star" class="rating-star" data-value="${fullStars + halfStar + i + 1}"></i>`;
    }

    const ratingText = ratingCount > 0
        ? `<span class="rating-score">${rating.toFixed(1)}</span><span class="rating-count">(${ratingCount}人)</span>`
        : `<span class="rating-score">暂无评分</span>`;

    return `
        <div class="material-rating-container flex items-center" title="点击评分">
            <div class="material-rating-stars flex text-yellow-400 cursor-pointer" data-doc-id="${escapeHtml(docId)}">
                ${starsHtml}
            </div>
            <div class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                ${ratingText}
            </div>
        </div>
    `;
}

/**
 * 模板: 单个学习资料卡片
 * @param {object} material - 从 'study_materials' 集合获取的单个资料对象
 * @returns {string} 渲染好的HTML字符串
 */
function createMaterialCardHtml(material) {
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

    const ratingComponentHtml = createRatingStarsHtml(material._id, material.rating, material.ratingCount);

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
                    ${ratingComponentHtml}
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
 * (导出函数) 模板: 学习资料列表
 * @param {Array<object>} materials - 从 'study_materials' 集合获取的资料对象数组
 * @returns {string} 渲染好的HTML字符串
 */
export function createMaterialsListHtml(materials) {
    if (!materials || materials.length === 0) {
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
    }

    const cardsHtml = materials.map(createMaterialCardHtml).join('');

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            ${cardsHtml}
        </div>
    `;
}


// --- 私有辅助函数 ---
function escapeHtml(str) {
    if (typeof str !== 'string' && typeof str !== 'number') return '';
    const strConv = String(str);
    return strConv.replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[match]);
}
