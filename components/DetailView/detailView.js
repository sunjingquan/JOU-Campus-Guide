/**
 * @file 详情视图组件 (DetailView Component)
 * @description 负责管理详情页的显示、隐藏和内容渲染。
 * @version 1.0.0
 */

import { createDormitoryDetailsHtml, createCanteenDetailsHtml, createSliderHtml } from '../ContentRenderer/content.templates.js';
import { eventBus } from '../../services/eventBus.js';

// --- 模块内变量 ---
let dom = {};
let campusData = {};

// =============================================================================
// --- 公共接口 (Public API) ---
// =============================================================================

/**
 * 初始化详情视图组件。
 * @param {object} config - 配置对象
 */
export function init(config) {
    dom = {
        mainView: document.getElementById('main-view'),
        detailView: document.getElementById('detail-view'),
        detailTitle: document.getElementById('detail-title'),
        detailContent: document.getElementById('detail-content'),
        backToMainBtn: document.getElementById('back-to-main-btn'),
    };
    campusData = config.cData;
    _setupEventListeners();
    console.log("DetailView Component Initialized.");
}

/**
 * 显示详情视图。
 * @param {string} type - 'dormitory' 或 'canteen'
 * @param {string} key - 具体项目的唯一ID
 */
function show(type, key) {
    const dataKey = type === 'dormitory' ? 'dormitories' : type + 's';
    
    if (!campusData || !campusData[dataKey]) {
        console.error(`DetailView Error: 校区数据尚未加载或不包含 '${dataKey}'。`);
        dom.detailTitle.textContent = '数据加载中...';
        dom.detailContent.innerHTML = '<p class="text-center p-8">数据正在加载，请稍候...</p>';
        return;
    }
    
    const itemData = campusData[dataKey].find(item => item.id === key);

    if (!itemData) {
        console.error(`DetailView Error: Item with key "${key}" not found in "${dataKey}"`);
        dom.detailTitle.textContent = '内容未找到';
        dom.detailContent.innerHTML = '<p class="text-center p-8">抱歉，我们没有找到您想查看的具体信息。</p>';
    } else {
        dom.detailTitle.textContent = itemData.name;
        let detailsHtml = '';
        if (type === 'dormitory') {
            detailsHtml = createDormitoryDetailsHtml(itemData.details);
        } else if (type === 'canteen') {
            detailsHtml = createCanteenDetailsHtml(itemData.details);
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
    setTimeout(() => dom.detailView.classList.remove('translate-x-full'), 10);
    
    lucide.createIcons();
    _initAllSliders(dom.detailContent);
}

/**
 * 隐藏详情视图。
 */
function hide() {
    if (!dom.detailView.classList.contains('hidden')) {
        dom.detailView.classList.add('translate-x-full');
        setTimeout(() => {
            dom.detailView.classList.add('hidden');
            dom.detailView.classList.remove('flex');
            dom.mainView.classList.remove('hidden');
        }, 300);
    }
}

// =============================================================================
// --- 事件处理与私有函数 ---
// =============================================================================

/**
 * 为组件内的DOM元素绑定事件监听。
 * @private
 */
function _setupEventListeners() {
    dom.backToMainBtn.addEventListener('click', hide);

    // 监听由ContentRenderer发布的显示请求
    eventBus.subscribe('detail:show', ({ type, key }) => {
        show(type, key);
    });
}

/**
 * 初始化容器内所有的图片轮播器。
 * @param {HTMLElement} container - 包含一个或多个轮播器的父元素。
 * @private
 */
function _initAllSliders(container) {
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
            if (captionEl) captionEl.textContent = imgElement.alt;

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
        
        goToSlide(0);
    });
}
