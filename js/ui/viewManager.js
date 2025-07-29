/**
 * @file 视图管理模块 - 最终修复版
 * @description 负责处理应用中不同视图（如主视图、详情页、侧边栏、移动搜索）的显示、隐藏和切换。
 * [已修复] 添加了 main.js 需要的 updateCampusData 函数，以确保模块能接收到动态加载的数据。
 * @version 3.0.0
 */

import * as renderer from './renderer.js';

// --- 模块内变量 ---
let dom = {};
let campusData = {}; // 初始为空，将由 updateCampusData 函数填充
let selectedCampus = '';

/**
 * 初始化视图管理器。
 * @param {object} config - 配置对象。
 * @param {object} config.domElements - 缓存的DOM元素。
 * @param {function} config.cData - 一个返回校区数据的函数 (在旧版 main.js 中使用)。
 */
export function init(config) {
    dom = config.domElements;
    // 尝试在初始化时获取一次数据，但在我们的新流程中，它很可能为 null。
    // 关键的数据更新将通过下面的 updateCampusData 函数完成。
    if (typeof config.cData === 'function') {
        campusData = config.cData();
    } else {
        campusData = config.cData;
    }
}

/**
 * [新增的关键函数] 更新模块内部的校区数据。
 * 这个函数由 main.js 在成功从服务器获取数据后调用。
 * @param {object} newData - 最新的校区数据。
 */
export function updateCampusData(newData) {
    console.log("ViewManager: 已接收到最新的校区数据。", newData);
    campusData = newData;
}


/**
 * 更新当前选择的校区。
 * @param {string} campus - 新的校区ID。
 */
export function updateCampus(campus) {
    selectedCampus = campus;
}

/**
 * 切换侧边栏的显示状态。
 */
export function toggleSidebar() {
    const isHidden = dom.sidebar.classList.contains('-translate-x-full');
    dom.sidebar.classList.toggle('-translate-x-full');
    dom.sidebarOverlay.classList.toggle('hidden', !isHidden);
    dom.bottomNavMenu.classList.toggle('active', !isHidden);
}

/**
 * 显示移动端搜索浮层。
 */
export function showMobileSearch() {
    dom.mobileSearchOverlay.classList.remove('hidden');
    setTimeout(() => {
        dom.mobileSearchOverlay.classList.remove('translate-y-full');
        dom.mobileSearchInput.focus();
    }, 10);
}

/**
 * 隐藏移动端搜索浮层。
 */
export function hideMobileSearch() {
    dom.mobileSearchOverlay.classList.add('translate-y-full');
    setTimeout(() => {
        dom.mobileSearchOverlay.classList.add('hidden');
        dom.mobileSearchInput.value = '';
        dom.mobileSearchResultsContainer.innerHTML = '';
    }, 300);
}

/**
 * 显示详情视图。
 * @param {string} type - 'dormitory' 或 'canteen'。
 * @param {string} key - 具体项目（如'cangwu_a_dorm'）的唯一ID。
 */
export function showDetailView(type, key) {
    const dataKey = type === 'dormitory' ? 'dormitories' : type + 's';
    
    // 检查 campusData 是否已经有数据
    if (!campusData || !campusData[dataKey]) {
        console.error(`ViewManager Error: 校区数据尚未加载或不包含 '${dataKey}'。`);
        dom.detailTitle.textContent = '数据加载中...';
        dom.detailContent.innerHTML = '<p class="text-center p-8">数据正在加载，请稍候...</p>';
        return;
    }
    
    const dataArray = campusData[dataKey];

    if (!Array.isArray(dataArray)) {
        console.error(`ViewManager Error: Invalid data source for type "${type}" (key: ${dataKey})`);
        return;
    }

    const itemData = dataArray.find(item => item.id === key);

    if (!itemData) {
        console.error(`ViewManager Error: Item with key "${key}" not found in "${dataKey}"`);
        dom.detailTitle.textContent = '内容未找到';
        dom.detailContent.innerHTML = '<p class="text-center p-8">抱歉，我们没有找到您想查看的具体信息。</p>';
    } else {
        dom.detailTitle.textContent = itemData.name;

        let detailsHtml = '';
        if (Array.isArray(itemData.details)) {
            if (type === 'dormitory') {
                detailsHtml = renderer.generateDormitoryDetailsHtml(itemData.details);
            } else if (type === 'canteen') {
                detailsHtml = renderer.generateCanteenDetailsHtml(itemData.details);
            }
        } else {
            detailsHtml = `<div class="prose dark:prose-invert max-w-none">${itemData.details}</div>`;
        }
        
        dom.detailContent.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <img src="${itemData.image}" alt="[${itemData.name}的图片]" class="w-full h-auto max-h-[450px] object-cover rounded-xl shadow-lg mb-8" onerror="this.onerror=null;this.src='https://placehold.co/1200x675/fecaca/991b1b?text=图片加载失败';">
                <div class="bg-gray-100 dark:bg-gray-800/50 p-4 sm:p-8 rounded-xl">
                    <h3 class="text-2xl font-bold mb-6 border-b pb-4 dark:border-gray-700 text-gray-800 dark:text-gray-100">详细情况概览</h3>
                    ${detailsHtml}
                </div>
            </div>
        `;
    }

    dom.mainView.classList.add('hidden');
    dom.detailView.classList.remove('hidden', 'translate-x-full');
    dom.detailView.classList.add('flex');
    setTimeout(() => {
        dom.detailView.classList.remove('translate-x-full');
    }, 10);
    lucide.createIcons();
    initAllSliders(dom.detailContent);
}


/**
 * 隐藏详情视图。
 */
export function hideDetailView() {
    if (!dom.detailView.classList.contains('hidden')) {
        dom.detailView.classList.add('translate-x-full');
        setTimeout(() => {
            dom.detailView.classList.add('hidden');
            dom.detailView.classList.remove('flex');
            dom.mainView.classList.remove('hidden');
        }, 300);
    }
}

/**
 * 隐藏所有可能打开的浮层或视图（详情页、移动搜索页）。
 */
export function hideAllViews() {
    hideDetailView();
    hideMobileSearch();
}

/**
 * 初始化容器内所有的图片轮播器。
 * @param {HTMLElement} container - 包含一个或多个轮播器的父元素。
 */
function initAllSliders(container) {
    const sliders = container.querySelectorAll('.image-slider');
    sliders.forEach(slider => {
        const wrapper = slider.querySelector('.slider-wrapper');
        const slides = slider.querySelectorAll('.slider-slide');
        const prevBtn = slider.querySelector('.slider-nav.prev');
        const nextBtn = slider.querySelector('.slider-nav.next');
        const captionEl = slider.querySelector('.slider-caption');
        const dotsContainer = slider.querySelector('.slider-dots');

        if (slides.length <= 1) return;

        let currentIndex = 0;
        const totalSlides = slides.length;

        const goToSlide = (index) => {
            currentIndex = (index + totalSlides) % totalSlides;
            wrapper.style.transform = `translateX(-${currentIndex * 100}%)`;

            const slideElement = slides[currentIndex];
            const imgElement = slideElement.querySelector('img');
            if (captionEl) {
                captionEl.textContent = imgElement.alt;
            }

            if (dotsContainer) {
                dotsContainer.querySelectorAll('.dot').forEach((dot, dotIndex) => {
                    dot.classList.toggle('active', dotIndex === currentIndex);
                });
            }
        };

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
            nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));
        }

        if (dotsContainer) {
            dotsContainer.querySelectorAll('.dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    goToSlide(parseInt(e.target.dataset.index));
                });
            });
        }
        
        goToSlide(0); // 初始化到第一张
    });
}
