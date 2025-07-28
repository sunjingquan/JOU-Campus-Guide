/**
 * @file 应用主入口 (Main Entry Point) - 重构版
 * @description 负责应用的整体流程控制：初始化、获取数据、调用渲染器、设置事件监听。
 * @version 5.0.0
 */

// 导入重构后的模块
import { getGuideData, getCampusData } from './data/dataManager.js';
import * as renderer from './ui/renderer.js'; // 导入重构后的渲染器
import { createNavigation, handleNavigationClick, updateActiveNav } from './ui/navigation.js';
import * as authUI from './ui/auth.js';
import * as modals from './ui/modals.js';
import * as search from './ui/search.js';
import * as viewManager from './ui/viewManager.js';
import * as theme from './ui/theme.js';

class GuideApp {
    constructor(guideData, campusData) {
        this.guideData = guideData;
        this.campusData = campusData;
        this.selectedCampus = null;
        this.observer = null;
        this.isScrollingProgrammatically = false;
        this.scrollTimeout = null;
        this.currentUserData = null;

        // 缓存DOM元素，这是一个好习惯，可以提高性能
        this._cacheDOMElements();
        this.dom.showToast = this._showToast.bind(this);
        authUI.cacheAuthDOMElements(this.dom);
        modals.init(this.dom);
        viewManager.init({
            domElements: this.dom,
            cData: this.campusData
        });
    }

    // 缓存所有需要操作的DOM元素
    _cacheDOMElements() {
        this.dom = {
            loadingOverlay: document.getElementById('loading-overlay'),
            mainView: document.getElementById('main-view'),
            navMenu: document.getElementById('nav-menu'),
            contentArea: document.getElementById('content-area'),
            contentTitle: document.getElementById('content-title'),
            menuToggle: document.getElementById('menu-toggle'),
            sidebar: document.getElementById('sidebar'),
            homeButtonTop: document.getElementById('home-button-top'),
            sidebarOverlay: document.getElementById('sidebar-overlay'),
            campusModal: document.getElementById('campus-selector-modal'),
            campusDialog: document.getElementById('campus-selector-dialog'),
            changeCampusBtn: document.getElementById('change-campus-btn'),
            currentCampusDisplay: document.getElementById('current-campus-display'),
            detailView: document.getElementById('detail-view'),
            detailTitle: document.getElementById('detail-title'),
            detailContent: document.getElementById('detail-content'),
            backToMainBtn: document.getElementById('back-to-main-btn'),
            searchForm: document.getElementById('search-form'),
            searchInput: document.getElementById('search-input'),
            liveSearchResultsContainer: document.getElementById('live-search-results'),
            bottomNav: document.getElementById('bottom-nav'),
            bottomNavHome: document.getElementById('bottom-nav-home'),
            bottomNavMenu: document.getElementById('bottom-nav-menu'),
            bottomNavSearch: document.getElementById('bottom-nav-search'),
            bottomNavCampus: document.getElementById('bottom-nav-campus'),
            mobileSearchOverlay: document.getElementById('mobile-search-overlay'),
            mobileSearchInput: document.getElementById('mobile-search-input'),
            mobileSearchResultsContainer: document.getElementById('mobile-search-results-container'),
            closeMobileSearchBtn: document.getElementById('close-mobile-search-btn'),
            themeToggleBtn: document.getElementById('theme-toggle-btn'),
            feedbackBtn: document.getElementById('feedback-btn'),
            feedbackModal: document.getElementById('feedback-modal'),
            // ... 其他DOM元素
        };
    }

    // 显示一个toast消息
    _showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-circle';
        toast.innerHTML = `<div class="toast-icon"><i data-lucide="${iconName}"></i></div><span>${message}</span>`;
        container.appendChild(toast);
        lucide.createIcons({
            nodes: [toast.querySelector('.toast-icon')]
        });
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 4000);
    }

    // 初始化应用
    init() {
        theme.init(this.dom);
        this._setupEventListeners();
        authUI.listenForAuthStateChanges((userData) => {
            this.currentUserData = userData;
        });
        this._populateProfileEditDropdowns();
        this.selectedCampus = localStorage.getItem('selectedCampus');
        if (this.selectedCampus) {
            this.runApp();
        } else {
            modals.showCampusSelector();
        }
        // 隐藏加载动画
        setTimeout(() => {
            this.dom.loadingOverlay.style.opacity = '0';
            setTimeout(() => this.dom.loadingOverlay.style.display = 'none', 500);
        }, 500);
    }

    // 运行主应用逻辑
    runApp() {
        createNavigation(this.dom.navMenu, this.guideData);
        this._renderAllContent(); // 核心渲染流程
        this._updateCampusDisplay();
        this._setupIntersectionObserver();
        this._updateActiveState("home", "home");
        search.init({
            domElements: this.dom,
            gData: this.guideData,
            cData: this.campusData,
            campus: this.selectedCampus,
            onResultClick: this._handleSearchResultClick.bind(this)
        });
        viewManager.updateCampus(this.selectedCampus);
    }

    // 【核心改造】渲染所有内容
    _renderAllContent() {
        if (this.observer) this.observer.disconnect();
        this.dom.contentArea.innerHTML = ''; // 清空旧内容

        this.guideData.forEach(categoryData => {
            categoryData.pages.forEach(page => {
                const section = document.createElement('div');
                section.className = 'content-section';
                section.id = `page-${categoryData.key}-${page.pageKey}`;
                section.dataset.pageKey = page.pageKey;
                section.dataset.categoryKey = categoryData.key;

                let htmlContent = '';
                if (page.isCampusSpecific) {
                    // 对于校区特定内容 (宿舍/食堂)
                    const keyMap = {
                        'dormitory': 'dormitories',
                        'canteen': 'canteens'
                    };
                    const dataKey = keyMap[page.pageKey];
                    // 从聚合后的 campusData 中筛选出当前校区的数据
                    const items = this.campusData[dataKey]?.filter(item => item.campusId === this.selectedCampus) || [];
                    // 调用 renderer 中的函数生成卡片列表
                    htmlContent = renderer.generateCampusCards(items, page.pageKey);
                } else {
                    // 对于通用页面，直接调用 renderer 渲染
                    htmlContent = renderer.renderPageContent(page);
                }

                section.innerHTML = htmlContent;
                this.dom.contentArea.appendChild(section);

                // 【重要】为动态添加的内容绑定事件监听器
                if (page.type === 'faq') this._addFaqListeners(section);
                if (page.type === 'clubs') this._addClubTabListeners(section);
                if (page.type === 'campus-query-tool') this._initCampusQueryTool(section);
            });
        });

        // 为主页的特殊按钮绑定事件
        this._addHomeListeners();

        // 重新渲染所有lucide图标
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // 设置所有事件监听
    _setupEventListeners() {
        // 左侧导航栏点击
        this.dom.navMenu.addEventListener('click', (e) => handleNavigationClick(e, (category, page) => {
            viewManager.hideAllViews();
            this._updateActiveState(category, page);
            const targetElement = document.getElementById(`page-${category}-${page}`);
            if (targetElement) this._scrollToElement(targetElement);
            if (window.innerWidth < 768) viewManager.toggleSidebar();
        }));

        // 顶部Home按钮点击
        this.dom.homeButtonTop.addEventListener('click', this._handleHomeClick.bind(this));
        // 汉堡菜单点击
        this.dom.menuToggle.addEventListener('click', viewManager.toggleSidebar);
        // 侧边栏遮罩点击
        this.dom.sidebarOverlay.addEventListener('click', viewManager.toggleSidebar);
        // 校区选择
        this.dom.campusModal.addEventListener('click', this._handleCampusSelection.bind(this));
        this.dom.changeCampusBtn.addEventListener('click', modals.showCampusSelector);
        // 内容区的卡片点击 (宿舍/食堂)
        this.dom.contentArea.addEventListener('click', this._handleCardClick.bind(this));
        // 详情页返回按钮
        this.dom.backToMainBtn.addEventListener('click', viewManager.hideDetailView);
        // 底部导航栏
        this.dom.bottomNavHome.addEventListener('click', this._handleHomeClick.bind(this));
        this.dom.bottomNavMenu.addEventListener('click', viewManager.toggleSidebar);
        this.dom.bottomNavSearch.addEventListener('click', viewManager.showMobileSearch);
        this.dom.bottomNavCampus.addEventListener('click', modals.showCampusSelector);
        this.dom.closeMobileSearchBtn.addEventListener('click', viewManager.hideMobileSearch);
        // ... 其他事件监听
    }

    // 处理校区选择
    _handleCampusSelection(e) {
        const button = e.target.closest('.campus-select-btn');
        if (!button) return;
        const campus = button.dataset.campus;
        localStorage.setItem('selectedCampus', campus);
        this.selectedCampus = campus;
        search.updateCampus(campus);
        viewManager.updateCampus(campus);
        modals.hideCampusSelector(() => {
            this.runApp(); // 重新渲染应用
        });
    }

    // 更新顶部显示的校区名称
    _updateCampusDisplay() {
        const campusInfo = this.campusData.campuses.find(c => c.id === this.selectedCampus);
        if (campusInfo) {
            this.dom.currentCampusDisplay.textContent = `当前: ${campusInfo.name}`;
        }
    }

    // 设置滚动监听，用于自动更新左侧导航栏状态
    _setupIntersectionObserver() {
        const options = {
            root: this.dom.contentArea,
            threshold: 0,
            rootMargin: `-${document.querySelector('header').offsetHeight}px 0px -${this.dom.contentArea.clientHeight - document.querySelector('header').offsetHeight - 1}px 0px`
        };
        this.observer = new IntersectionObserver((entries) => {
            if (this.isScrollingProgrammatically) return;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const {
                        categoryKey,
                        pageKey
                    } = entry.target.dataset;
                    this._updateActiveState(categoryKey, pageKey);
                }
            });
        }, options);
        document.querySelectorAll('.content-section').forEach(section => {
            this.observer.observe(section);
        });
    }

    // 更新激活的导航项和标题
    _updateActiveState(categoryKey, pageKey) {
        const category = this.guideData.find(c => c.key === categoryKey);
        const pageData = category?.pages.find(p => p.pageKey === pageKey);
        if (pageData) {
            this.dom.contentTitle.textContent = pageData.title;
        }
        updateActiveNav(categoryKey, pageKey);
        this.dom.bottomNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if (categoryKey === 'home') {
            this.dom.bottomNavHome.classList.add('active');
        }
    }

    // 处理Home按钮点击，滚动到页面顶部
    _handleHomeClick(e) {
        e.preventDefault();
        viewManager.hideAllViews();
        const homeElement = document.getElementById('page-home-home');
        if (homeElement) {
            this._updateActiveState("home", "home");
            this._scrollToElement(homeElement);
        }
    }

    // 平滑滚动到指定元素
    _scrollToElement(targetElement, keyword = null) {
        this.isScrollingProgrammatically = true;
        const topOffset = document.querySelector('header').offsetHeight;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + this.dom.contentArea.scrollTop - topOffset;
        this.dom.contentArea.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
        if (keyword) {
            setTimeout(() => search.highlightKeywordInSection(targetElement, keyword), 500);
        }
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.isScrollingProgrammatically = false;
        }, 1000);
    }

    // 为FAQ内容添加折叠/展开事件监听
    _addFaqListeners(container) {
        const headers = container.querySelectorAll('.accordion-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const icon = header.querySelector('.accordion-icon');
                const isOpen = header.classList.toggle('open');
                content.style.display = isOpen ? 'block' : 'none';
                icon.classList.toggle('rotate-180', isOpen);
            });
        });
    }

    // 为社团页面的Tabs添加点击事件
    _addClubTabListeners(container) {
        const tabContainer = container.querySelector('.club-tabs');
        if (!tabContainer) return;
        tabContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.tab-button');
            if (!button) return;
            const level = button.dataset.level;
            tabContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const paneContainer = container.querySelector('.club-panes-container');
            paneContainer.querySelectorAll('.club-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            const targetPane = paneContainer.querySelector(`.club-pane[data-level="${level}"]`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    }
    
    // 为主页的快速导航和探索按钮添加事件监听
    _addHomeListeners() {
        const homeSection = document.getElementById('page-home-home');
        if (!homeSection) return;

        homeSection.querySelector('#explore-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            const preparationCategory = this.guideData.find(cat => cat.key === 'preparation');
            if (preparationCategory && preparationCategory.pages.length > 0) {
                const firstPage = preparationCategory.pages[0];
                const nextSection = document.getElementById(`page-${preparationCategory.key}-${firstPage.pageKey}`);
                if (nextSection) {
                    this._updateActiveState(preparationCategory.key, firstPage.pageKey);
                    this._scrollToElement(nextSection);
                }
            }
        });

        homeSection.querySelectorAll('.nav-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const navData = JSON.parse(card.dataset.navlink);
                const targetElement = document.getElementById(`page-${navData.category}-${navData.page}`);
                if (targetElement) {
                    this._updateActiveState(navData.category, navData.page);
                    this._scrollToElement(targetElement);
                }
            });
        });
    }

    // 处理宿舍/食堂卡片点击，显示详情页
    _handleCardClick(e) {
        const card = e.target.closest('.detail-card');
        if (!card) return;
        e.preventDefault();
        const {
            type,
            key
        } = card.dataset;
        viewManager.showDetailView(type, key);
    }

    // 处理搜索结果点击
    _handleSearchResultClick(dataset) {
        viewManager.hideAllViews();
        this.dom.searchInput.value = '';
        this.dom.mobileSearchInput.value = '';
        const {
            isDetail,
            detailType,
            detailKey,
            categoryKey,
            pageKey,
            keyword
        } = dataset;
        if (isDetail === 'true') {
            viewManager.showDetailView(detailType, detailKey);
            setTimeout(() => search.highlightKeywordInSection(this.dom.detailContent, keyword), 500);
        } else {
            const targetElement = document.getElementById(`page-${categoryKey}-${pageKey}`);
            if (targetElement) {
                this._updateActiveState(categoryKey, pageKey);
                this._scrollToElement(targetElement, keyword);
            }
        }
    }
    
    // 初始化校区查询工具的逻辑
    _initCampusQueryTool(container) {
        const collegeSelect = container.querySelector('#college-select');
        const majorSelect = container.querySelector('#major-select');
        const resultDisplay = container.querySelector('#result-display');
        if (!collegeSelect || !majorSelect || !resultDisplay) return;

        const allColleges = this.campusData.colleges;
        const uniqueColleges = [...new Set(allColleges.map(c => c.college))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
        
        uniqueColleges.forEach(collegeName => {
            const option = document.createElement('option');
            option.value = collegeName;
            option.textContent = collegeName;
            collegeSelect.appendChild(option);
        });

        const handleCollegeChange = () => {
            // ... (省略内部实现)
        };
        const handleMajorChange = () => {
            // ... (省略内部实现)
        };
        
        collegeSelect.addEventListener('change', handleCollegeChange);
        majorSelect.addEventListener('change', handleMajorChange);
    }

    // 省略其他未改动的函数...
    _populateProfileEditDropdowns() { /* ... */ }
    _handleFeedbackSubmit(e) { /* ... */ }
    _handleAuthViewChange(viewName) { /* ... */ }
    _handleProfileViewChange(viewName) { /* ... */ }
}

// DOM加载完成后，启动应用
document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    try {
        loadingOverlay.style.display = 'flex';
        console.log("Main: 开始获取应用数据...");
        // 并行获取两份数据
        const [guideData, campusData] = await Promise.all([
            getGuideData(),
            getCampusData()
        ]);
        console.log("Main: 应用数据获取成功。");
        // 实例化并初始化应用
        const app = new GuideApp(guideData, campusData);
        app.init();
    } catch (error) {
        console.error("Main: 初始化应用失败!", error);
        loadingOverlay.innerHTML = `<div class="text-center text-red-500 p-4"><p class="font-bold">应用加载失败</p><p class="text-sm mt-2">请检查网络连接或联系管理员。</p><p class="text-xs mt-2 text-gray-400">${error.message}</p></div>`;
    }
});
