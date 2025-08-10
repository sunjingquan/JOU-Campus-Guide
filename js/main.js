/**
 * @file 应用主入口 (Main Entry Point) - 应用启动器 (已修复)
 * @description 负责初始化所有组件和服务，并协调它们之间的基本交互。
 * @version 14.1.0
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

        this._cacheDOMElements();
    }

    _cacheDOMElements() {
        // main.js 只关心最高层级的元素
        this.dom = {
            loadingOverlay: document.getElementById('loading-overlay'),
            contentArea: document.getElementById('content-area'),
            contentTitle: document.getElementById('content-title'),
            menuToggle: document.getElementById('menu-toggle'),
            sidebarOverlay: document.getElementById('sidebar-overlay'),
            campusModal: document.getElementById('campus-selector-modal'),
            campusDialog: document.getElementById('campus-selector-dialog'),
            changeCampusBtn: document.getElementById('change-campus-btn'),
            currentCampusDisplay: document.getElementById('current-campus-display'),
            bottomNav: document.getElementById('bottom-nav'),
            bottomNavHome: document.getElementById('bottom-nav-home'),
            bottomNavMenu: document.getElementById('bottom-nav-menu'),
            bottomNavSearch: document.getElementById('bottom-nav-search'),
            bottomNavCampus: document.getElementById('bottom-nav-campus'),
            mobileSearchOverlay: document.getElementById('mobile-search-overlay'),
            closeMobileSearchBtn: document.getElementById('close-mobile-search-btn'),
        };
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

    async init() {
        theme.init();
        feedback.init();
        auth.init();
        this._setupAppEventListeners();
    }

    async loadDataAndRunApp() {
        try {
            [this.guideData, this.campusData] = await Promise.all([getGuideData(), getCampusData()]);

            if (!this.guideData || !this.campusData) throw new Error("核心数据加载失败。");

            auth.provideCampusData(this.campusData);
            materials.init({ cData: this.campusData });
            detailView.init({ cData: this.campusData });

            this.selectedCampus = localStorage.getItem('selectedCampus');
            if (this.selectedCampus) {
                this.runApp();
            } else {
                this.showCampusSelector();
            }

            this.dom.loadingOverlay.style.opacity = '0';
            setTimeout(() => this.dom.loadingOverlay.style.display = 'none', 500);

        } catch (error) {
            console.error("Main: 应用启动失败!", error);
            this.dom.loadingOverlay.innerHTML = `<p class="text-red-500">应用加载失败，请刷新重试。</p>`;
        }
    }
    
    _setupAppEventListeners() {
        eventBus.subscribe('toast:show', (data) => this._showToast(data));
        eventBus.subscribe('auth:ready', () => this.loadDataAndRunApp());
        
        eventBus.subscribe('nav:requestScroll', ({ categoryKey, pageKey }) => {
            this._updateActiveState(categoryKey, pageKey);
            const targetElement = document.getElementById(`page-${categoryKey}-${pageKey}`);
            if (targetElement) this._scrollToElement(targetElement);
        });

        // ✨ 修复：现在从事件中接收dataset，并正确处理跳转
        eventBus.subscribe('search:resultClicked', (dataset) => {
            document.getElementById('search-input').value = '';
            const liveResults = document.getElementById('live-search-results');
            if (liveResults) liveResults.classList.add('hidden');
            this.hideMobileSearch();

            if (dataset.isDetail === 'true') {
                eventBus.publish('detail:show', { type: dataset.detailType, key: dataset.detailKey });
            } else {
                eventBus.publish('nav:requestScroll', { categoryKey: dataset.categoryKey, pageKey: dataset.pageKey });
            }
        });
    }
    
    runApp() {
        navigation.init({
            guideData: this.guideData,
            onLinkClick: (category, page) => {
                if (category === 'materials') {
                    materials.show();
                } else {
                    materials.hide();
                    this._updateActiveState(category, page);
                    const targetElement = document.getElementById(`page-${category}-${page}`);
                    if (targetElement) this._scrollToElement(targetElement);
                }
                if (window.innerWidth < 768) this.toggleSidebar();
            }
        });

        contentRenderer.init({
            gData: this.guideData,
            cData: this.campusData,
            campus: this.selectedCampus
        });
        
        // ✨ 修复：在这里调用 search.init 并传入所有需要的数据
        search.init({
            gData: this.guideData,
            cData: this.campusData,
            campus: this.selectedCampus
        });

        contentRenderer.renderAll();
        this._updateCampusDisplay();
        this._setupIntersectionObserver();
        this._updateActiveState("home", "home");
        this._setupEventListeners();
    }
    
    _setupEventListeners() {
        this.dom.menuToggle.addEventListener('click', () => this.toggleSidebar());
        this.dom.sidebarOverlay.addEventListener('click', () => this.toggleSidebar());
        this.dom.campusModal.addEventListener('click', (e) => this._handleCampusSelection(e));
        this.dom.changeCampusBtn.addEventListener('click', () => this.showCampusSelector());
        
        this.dom.bottomNavHome.addEventListener('click', (e) => {
            e.preventDefault();
            materials.hide();
            eventBus.publish('nav:requestScroll', { categoryKey: 'home', pageKey: 'home' });
        });
        this.dom.bottomNavMenu.addEventListener('click', () => this.toggleSidebar());
        this.dom.bottomNavSearch.addEventListener('click', () => this.showMobileSearch());
        this.dom.bottomNavCampus.addEventListener('click', () => this.showCampusSelector());
        this.dom.closeMobileSearchBtn.addEventListener('click', () => this.hideMobileSearch());
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const isHidden = sidebar.classList.contains('-translate-x-full');
        sidebar.classList.toggle('-translate-x-full');
        this.dom.sidebarOverlay.classList.toggle('hidden', !isHidden);
        this.dom.bottomNavMenu.classList.toggle('active', !isHidden);
    }

    showMobileSearch() {
        this.dom.mobileSearchOverlay.classList.remove('hidden');
        setTimeout(() => {
            this.dom.mobileSearchOverlay.classList.remove('translate-y-full');
            document.getElementById('mobile-search-input').focus();
        }, 10);
    }

    hideMobileSearch() {
        this.dom.mobileSearchOverlay.classList.add('translate-y-full');
        setTimeout(() => {
            this.dom.mobileSearchOverlay.classList.add('hidden');
            document.getElementById('mobile-search-input').value = '';
            document.getElementById('mobile-search-results-container').innerHTML = '';
        }, 300);
    }
    
    _handleCampusSelection(e) {
        const button = e.target.closest('.campus-select-btn');
        if (!button) return;
        this.selectedCampus = button.dataset.campus;
        localStorage.setItem('selectedCampus', this.selectedCampus);
        
        this.hideCampusSelector(() => {
            // 更新所有需要校区信息的组件
            contentRenderer.updateCampus(this.selectedCampus);
            search.updateCampus(this.selectedCampus);
            // 重新渲染主内容
            contentRenderer.renderAll();
            this._updateCampusDisplay();
        });
    }

    _updateCampusDisplay() {
        const campusInfo = this.campusData.campuses.find(c => c.id === this.selectedCampus);
        if (campusInfo) this.dom.currentCampusDisplay.textContent = `当前: ${campusInfo.name}`;
    }

    _updateActiveState(categoryKey, pageKey) {
        const category = this.guideData.find(c => c.key === categoryKey);
        const pageData = category?.pages.find(p => p.pageKey === pageKey);
        if (pageData) this.dom.contentTitle.textContent = pageData.title;
        
        navigation.setActive(categoryKey, pageKey); 
        
        this.dom.bottomNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if (categoryKey === 'home') this.dom.bottomNavHome.classList.add('active');
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

    showCampusSelector() {
        this.dom.campusModal.classList.remove('hidden');
        setTimeout(() => {
            this.dom.campusModal.style.opacity = '1';
            this.dom.campusDialog.style.transform = 'scale(1)';
            this.dom.campusDialog.style.opacity = '1';
        }, 10);
    }

    hideCampusSelector(onHidden) {
        this.dom.campusModal.style.opacity = '0';
        this.dom.campusDialog.style.transform = 'scale(0.95)';
        this.dom.campusDialog.style.opacity = '0';
        setTimeout(() => {
            this.dom.campusModal.classList.add('hidden');
            if (onHidden) onHidden();
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const app = new GuideApp();
    await app.init();
});
