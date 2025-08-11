/**
 * @file 应用启动器 (App Launcher)
 * @description 应用的唯一入口。负责初始化所有服务和组件，并协调它们之间的核心数据流和交互。
 * @version 15.0.0 (Final)
 */

// --- 核心服务导入 ---
import { getGuideData, getCampusData } from '../services/api.js';
import { eventBus } from '../services/eventBus.js';

// --- 组件导入 ---
import * as auth from '../components/Auth/auth.js';
import * as theme from '../components/Theme/theme..js';
import * as feedback from '../components/Feedback/feedback.js';
import * as search from '../components/Search/search.js';
import * as navigation from '../components/Navigation/navigation.js';
import * as materials from '../components/Materials/materials.js';
import * as contentRenderer from '../components/ContentRenderer/contentRenderer.js';
import * as detailView from '../components/DetailView/detailView.js';

class GuideApp {
    constructor() {
        this.guideData = null;
        this.campusData = null;
        this.selectedCampus = null;
        this.observer = null;
        this.isScrollingProgrammatically = false;
        this.scrollTimeout = null;

        // 启动器只关心最顶层的几个元素
        this.dom = {
            loadingOverlay: document.getElementById('loading-overlay'),
            contentArea: document.getElementById('content-area'),
            contentTitle: document.getElementById('content-title'),
        };
    }
    
    /**
     * 启动应用的入口
     */
    async start() {
        this._setupEventListeners();
        
        // 初始化无数据依赖的组件
        theme.init();
        feedback.init();
        auth.init(); // auth.init() 将触发 'auth:ready' 事件
    }

    /**
     * 监听应用级的核心事件
     */
    _setupEventListeners() {
        eventBus.subscribe('toast:show', (data) => this._showToast(data));
        eventBus.subscribe('auth:ready', () => this._loadDataAndRunApp());
        
        eventBus.subscribe('nav:requestScroll', ({ categoryKey, pageKey }) => {
            this._updateActiveState(categoryKey, pageKey);
            const targetElement = document.getElementById(`page-${categoryKey}-${pageKey}`);
            if (targetElement) this._scrollToElement(targetElement);
        });

        eventBus.subscribe('search:resultClicked', (dataset) => {
            if (dataset.isDetail === 'true') {
                eventBus.publish('detail:show', { type: dataset.detailType, key: dataset.detailKey });
            } else {
                eventBus.publish('nav:requestScroll', { categoryKey: dataset.categoryKey, pageKey: dataset.pageKey });
            }
        });
    }

    /**
     * 加载核心数据并初始化所有依赖数据的组件
     */
    async _loadDataAndRunApp() {
        try {
            [this.guideData, this.campusData] = await Promise.all([getGuideData(), getCampusData()]);
            if (!this.guideData || !this.campusData) throw new Error("核心数据加载失败。");

            this.selectedCampus = localStorage.getItem('selectedCampus') || 'cangwu'; // 提供一个默认值
            localStorage.setItem('selectedCampus', this.selectedCampus);

            // 注入数据并初始化所有组件
            this._initComponents();
            
            // 执行首次渲染
            contentRenderer.renderAll();
            this._setupIntersectionObserver();
            this._updateActiveState("home", "home");

            // 隐藏加载动画
            this.dom.loadingOverlay.style.opacity = '0';
            setTimeout(() => this.dom.loadingOverlay.style.display = 'none', 500);

        } catch (error) {
            console.error("App Launcher: 应用启动失败!", error);
            this.dom.loadingOverlay.innerHTML = `<p class="text-red-500">应用加载失败，请刷新重试。</p>`;
        }
    }
    
    /**
     * 统一初始化所有组件
     */
    _initComponents() {
        auth.provideCampusData(this.campusData);
        materials.init({ cData: this.campusData });
        detailView.init({ cData: this.campusData });
        
        contentRenderer.init({
            gData: this.guideData,
            cData: this.campusData,
            campus: this.selectedCampus
        });
        
        search.init({
            gData: this.guideData,
            cData: this.campusData,
            campus: this.selectedCampus
        });

        navigation.init({
            guideData: this.guideData,
            cData: this.campusData,
            campus: this.selectedCampus,
            onLinkClick: (category, page) => {
                if (category === 'materials') {
                    materials.show();
                } else {
                    materials.hide();
                    eventBus.publish('nav:requestScroll', { categoryKey: category, pageKey: page });
                }
                // 侧边栏的开关逻辑已在navigation组件内部处理
            },
            onCampusChange: (newCampus) => {
                this.selectedCampus = newCampus;
                localStorage.setItem('selectedCampus', this.selectedCampus);
                // 通知其他组件校区已变更
                contentRenderer.updateCampus(this.selectedCampus);
                search.updateCampus(this.selectedCampus);
                // 重新渲染主内容
                contentRenderer.renderAll();
            }
        });
    }

    _updateActiveState(categoryKey, pageKey) {
        const category = this.guideData.find(c => c.key === categoryKey);
        const pageData = category?.pages.find(p => p.pageKey === pageKey);
        if (pageData) this.dom.contentTitle.textContent = pageData.title;
        navigation.setActive(categoryKey, pageKey);
    }
    
    _setupIntersectionObserver() {
        if (this.observer) this.observer.disconnect();
        const options = {
            root: this.dom.contentArea,
            threshold: 0,
            rootMargin: `-${document.querySelector('header').offsetHeight}px 0px -${this.dom.contentArea.clientHeight - document.querySelector('header').offsetHeight - 1}px 0px`
        };
        this.observer = new IntersectionObserver((entries) => {
            if (this.isScrollingProgrammatically) return;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const { categoryKey, pageKey } = entry.target.dataset;
                    this._updateActiveState(categoryKey, pageKey);
                }
            });
        }, options);
        document.querySelectorAll('.content-section').forEach(section => {
            this.observer.observe(section);
        });
    }

    _scrollToElement(targetElement) {
        this.isScrollingProgrammatically = true;
        const topOffset = document.querySelector('header').offsetHeight;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + this.dom.contentArea.scrollTop - topOffset;
        this.dom.contentArea.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => { this.isScrollingProgrammatically = false; }, 1000);
    }

    _showToast({ message, type = 'info' }) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-circle';
        toast.innerHTML = `<div class="toast-icon"><i data-lucide="${iconName}"></i></div><span>${message}</span>`;
        container.appendChild(toast);
        lucide.createIcons({ nodes: [toast.querySelector('.toast-icon')] });
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 4000);
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', async () => {
    const app = new GuideApp();
    await app.start();
});
