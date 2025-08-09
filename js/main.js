/**
 * @file 应用主入口 (Main Entry Point) - Materials模块重构版
 * @description 移除了所有与学习资料相关的逻辑，转而调用新的 Materials 组件。
 * @version 13.0.0
 */

// --- 核心服务和旧模块导入 ---
import { getGuideData, getCampusData } from '../services/api.js';
import { eventBus } from '../services/eventBus.js';
import { app } from './cloudbase.js'; // db 已在各组件内部按需导入

// --- 新组件导入 ---
import * as auth from '../components/Auth/auth.js';
import * as theme from '../components/Theme/theme..js';
import * as feedback from '../components/Feedback/feedback.js';
import * as search from '../components/Search/search.js';
import * as navigation from '../components/Navigation/navigation.js';
import * as materials from '../components/Materials/materials.js'; // ✨ 新增：导入Materials组件

// --- 旧UI模块导入 (待重构) ---
import * as renderer from './ui/renderer.js';
import * as viewManager from './ui/viewManager.js';

class GuideApp {
    constructor() {
        this.guideData = null;
        this.campusData = null;
        this.selectedCampus = null;
        this.observer = null;
        this.isScrollingProgrammatically = false;
        this.scrollTimeout = null;
        // currentUserData 将由 Auth 组件内部管理，main.js不再直接持有

        this._cacheDOMElements();
        // viewManager 仍然暂时保留，用于处理详情页等
        viewManager.init({
            domElements: this.dom,
            cData: () => this.campusData
        });
    }

    _cacheDOMElements() {
        this.dom = {
            loadingOverlay: document.getElementById('loading-overlay'),
            mainView: document.getElementById('main-view'),
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
            // 注意：所有与feedback, theme, auth, materials相关的DOM元素已从这里移除
            // 因为它们现在由各自的组件自己管理
        };
    }
    
    _showToast({ message, type = 'info' }) {
        // Toast的逻辑保持不变
        const container = document.getElementById('toast-container');
        if (!container) return;
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

    async init() {
        // 1. 初始化所有不依赖核心数据的组件
        theme.init();
        feedback.init();
        auth.init();
        
        // 2. 设置应用级的事件监听器
        this._setupAppEventListeners(); 
        
        // 3. 设置剩余的、待重构的事件监听
        this._setupEventListeners();
    }

    async loadDataAndRunApp() {
        try {
            console.log("Main: 接收到 auth:ready 信号，开始加载核心数据...");
            [this.guideData, this.campusData] = await Promise.all([
                getGuideData(),
                getCampusData()
            ]);

            if (!this.guideData || this.guideData.length === 0 || !this.campusData || !this.campusData.colleges) {
               throw new Error("核心数据加载失败或为空。");
            }

            console.log("Main: 核心数据获取成功。");

            // 将数据注入给需要它的组件
            auth.provideCampusData(this.campusData);
            viewManager.updateCampusData(this.campusData);
            materials.init({ cData: this.campusData }); // ✨ 新增：初始化Materials组件并传入校区数据

            // 启动应用主逻辑
            this.selectedCampus = localStorage.getItem('selectedCampus');
            if (this.selectedCampus) {
                this.runApp();
            } else {
                this.showCampusSelector();
            }

            // 隐藏加载动画
            setTimeout(() => {
                this.dom.loadingOverlay.style.opacity = '0';
                setTimeout(() => this.dom.loadingOverlay.style.display = 'none', 500);
            }, 500);

        } catch (error) {
            console.error("Main: 加载或处理核心数据时失败!", error);
            this.dom.loadingOverlay.innerHTML = `<div class="text-center text-red-500 p-4"><p class="font-bold">应用加载失败</p><p class="text-sm mt-2">无法连接到服务器，请检查网络后重试。</p><p class="text-xs mt-2 text-gray-400">${error.message}</p></div>`;
        }
    }
    
    _setupAppEventListeners() {
        eventBus.subscribe('toast:show', (data) => this._showToast(data));
        eventBus.subscribe('search:resultClicked', (dataset) => {
            this._handleSearchResultClick(dataset);
        });
        // main.js不再需要监听 'auth:stateChanged'，因为UI更新已下放给Navigation和Materials组件

        eventBus.subscribe('auth:ready', () => {
            this.loadDataAndRunApp();
        });
    }
    
    runApp() {
        navigation.init({
            guideData: this.guideData,
            onLinkClick: (category, page) => {
                // ✨ 修改：导航点击逻辑现在更清晰
                if (category === 'materials') {
                    // 如果点击的是“学习资料共享”，则调用 materials 组件的 show 方法
                    materials.show();
                    viewManager.hideDetailView(); // 确保详情页是隐藏的
                } else {
                    // 否则，隐藏资料视图，显示主内容区
                    materials.hide();
                    viewManager.hideDetailView();
                    this._updateActiveState(category, page);
                    const targetElement = document.getElementById(`page-${category}-${page}`);
                    if (targetElement) this._scrollToElement(targetElement);
                }
                if (window.innerWidth < 768) viewManager.toggleSidebar();
            }
        });

        this._renderAllContent();
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
    
    _setupEventListeners() {
        this.dom.homeButtonTop.addEventListener('click', this._handleHomeClick.bind(this));
        this.dom.menuToggle.addEventListener('click', viewManager.toggleSidebar);
        this.dom.sidebarOverlay.addEventListener('click', viewManager.toggleSidebar);
        this.dom.campusModal.addEventListener('click', this._handleCampusSelection.bind(this));
        this.dom.changeCampusBtn.addEventListener('click', () => this.showCampusSelector());
        this.dom.contentArea.addEventListener('click', this._handleCardClick.bind(this));
        this.dom.backToMainBtn.addEventListener('click', viewManager.hideDetailView);
        this.dom.bottomNavHome.addEventListener('click', this._handleHomeClick.bind(this));
        this.dom.bottomNavMenu.addEventListener('click', viewManager.toggleSidebar);
        this.dom.bottomNavSearch.addEventListener('click', viewManager.showMobileSearch);
        this.dom.bottomNavCampus.addEventListener('click', () => this.showCampusSelector());
        this.dom.closeMobileSearchBtn.addEventListener('click', viewManager.hideMobileSearch);
        // ✨ 移除：所有与 materials 相关的事件监听器都已被移到 materials.js 中
    }
    
    // ... 从这里开始，其他所有未被迁移到 materials.js 的方法保持不变 ...
    // 例如 _updateActiveState, showCampusSelector, _renderAllContent 等

    _updateActiveState(categoryKey, pageKey) {
        const category = this.guideData.find(c => c.key === categoryKey);
        const pageData = category?.pages.find(p => p.pageKey === pageKey);
        if (pageData) {
            this.dom.contentTitle.textContent = pageData.title;
        }
        navigation.setActive(categoryKey, pageKey); 
        
        this.dom.bottomNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if (categoryKey === 'home') {
            this.dom.bottomNavHome.classList.add('active');
        }
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

    _handleCampusSelection(e) {
        const button = e.target.closest('.campus-select-btn');
        if (!button) return;
        const campus = button.dataset.campus;
        localStorage.setItem('selectedCampus', campus);
        this.selectedCampus = campus;
        search.updateCampus(campus);
        viewManager.updateCampus(campus);
        this.hideCampusSelector(() => {
            this.runApp();
        });
    }

    _updateCampusDisplay() {
        const campusInfo = this.campusData.campuses.find(c => c.id === this.selectedCampus);
        if (campusInfo) {
            this.dom.currentCampusDisplay.textContent = `当前: ${campusInfo.name}`;
        }
    }

    _renderAllContent() {
        if (this.observer) this.observer.disconnect();
        this.dom.contentArea.innerHTML = '';

        this.guideData.forEach(categoryData => {
            categoryData.pages.forEach(page => {
                const section = document.createElement('div');
                section.className = 'content-section';
                section.id = `page-${categoryData.key}-${page.pageKey}`;
                section.dataset.pageKey = page.pageKey;
                section.dataset.categoryKey = categoryData.key;

                let htmlContent = '';
                if (page.isCampusSpecific) {
                    const keyMap = { 'dormitory': 'dormitories', 'canteen': 'canteens' };
                    const dataKey = keyMap[page.pageKey];
                    const items = this.campusData[dataKey]?.filter(item => item.campusId === this.selectedCampus) || [];
                    htmlContent = renderer.generateCampusCards(items, page.pageKey);
                } else {
                    htmlContent = renderer.renderPageContent(page);
                }

                section.innerHTML = htmlContent;
                this.dom.contentArea.appendChild(section);

                if (page.type === 'faq') this._addFaqListeners(section);
                if (page.type === 'clubs') this._addClubTabListeners(section);
                if (page.pageKey === 'campusQuery') this._initCampusQueryTool(section);
            });
        });

        this._addHomeListeners();
        if (window.lucide) {
            lucide.createIcons();
        }
    }

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
                    const { categoryKey, pageKey } = entry.target.dataset;
                    this._updateActiveState(categoryKey, pageKey);
                }
            });
        }, options);
        document.querySelectorAll('.content-section').forEach(section => {
            this.observer.observe(section);
        });
    }

    _handleHomeClick(e) {
        e.preventDefault();
        materials.hide(); // ✨ 确保点击主页时，资料视图是隐藏的
        viewManager.hideDetailView();
        const homeElement = document.getElementById('page-home-home');
        if (homeElement) {
            this._updateActiveState("home", "home");
            this._scrollToElement(homeElement);
        }
    }

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

                const targetCategory = this.guideData.find(cat => cat.title === navData.category);
                if (!targetCategory) return;
                
                const targetPage = targetCategory.pages.find(p => p.title.startsWith(navData.page));
                if (!targetPage) return;

                const categoryKey = targetCategory.key;
                const pageKey = targetPage.pageKey;
                const targetElement = document.getElementById(`page-${categoryKey}-${pageKey}`);

                if (targetElement) {
                    this._updateActiveState(categoryKey, pageKey);
                    this._scrollToElement(targetElement);
                }
            });
        });
    }

    _handleCardClick(e) {
        const card = e.target.closest('.detail-card');
        if (!card) return;
        e.preventDefault();
        const { type, key } = card.dataset;
        viewManager.showDetailView(type, key);
    }

    _handleSearchResultClick(dataset) {
        viewManager.hideAllViews();
        materials.hide(); // ✨ 确保搜索后，资料视图是隐藏的
        this.dom.searchInput.value = '';
        this.dom.mobileSearchInput.value = '';
        const { isDetail, detailType, detailKey, categoryKey, pageKey, keyword } = dataset;
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

    _initCampusQueryTool(container) {
        const collegeSelect = container.querySelector('#college-select');
        const majorSelect = container.querySelector('#major-select');
        const resultDisplay = container.querySelector('#result-display');

        const colleges = this.campusData.colleges || [];
        const campuses = this.campusData.campuses || [];

        if (colleges.length === 0) {
            collegeSelect.disabled = true;
            majorSelect.disabled = true;
            resultDisplay.innerHTML = '<p class="text-red-500">无法加载学院数据，功能暂时无法使用。</p>';
            return;
        }

        collegeSelect.innerHTML = '<option value="">-- 请选择学院 --</option>';
        colleges.forEach(college => {
            const option = new Option(college.college, college.college);
            collegeSelect.add(option);
        });

        collegeSelect.addEventListener('change', () => {
            const selectedCollegeName = collegeSelect.value;
            majorSelect.innerHTML = '<option value="">-- 请先选择学院 --</option>';
            majorSelect.disabled = true;
            resultDisplay.innerHTML = '<p class="text-gray-500 dark:text-gray-400">查询结果将在此处显示</p>';

            if (selectedCollegeName) {
                const selectedCollege = colleges.find(c => c.college === selectedCollegeName);
                if (selectedCollege && selectedCollege.majors && selectedCollege.majors.length > 0) {
                    majorSelect.innerHTML = '<option value="">-- 请选择专业 --</option>';
                    selectedCollege.majors.forEach(major => {
                        const option = new Option(major, major);
                        majorSelect.add(option);
                    });
                    majorSelect.disabled = false;
                } else {
                    majorSelect.innerHTML = '<option value="">-- 该学院无专业数据 --</option>';
                }
            }
        });

        majorSelect.addEventListener('change', () => {
            const selectedCollegeName = collegeSelect.value;
            const selectedMajorName = majorSelect.value;

            if (selectedCollegeName && selectedMajorName) {
                const college = colleges.find(c => c.college === selectedCollegeName);
                if (college) {
                    const campusId = college.campusId;
                    const campus = campuses.find(c => c.id === campusId);
                    const campusName = campus ? campus.name : '未知校区';

                    resultDisplay.innerHTML = `
                        <div class="text-left w-full">
                            <p class="text-gray-600 dark:text-gray-400 text-sm mb-2">查询结果:</p>
                            <p class="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                <span class="font-normal">${college.college}</span> - <strong>${selectedMajorName}</strong>
                            </p>
                            <p class="mt-4 text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <i data-lucide="map-pin" class="w-6 h-6 mr-3"></i>
                                <span>${campusName}</span>
                            </p>
                        </div>
                    `;
                    if (window.lucide) lucide.createIcons({ nodes: [resultDisplay] });
                }
            } else {
                resultDisplay.innerHTML = '<p class="text-gray-500 dark:text-gray-400">查询结果将在此处显示</p>';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';

    const app = new GuideApp();
    await app.init();
});
