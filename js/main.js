/**
 * @file 应用主入口 (Main Entry Point) - 启动流程修复版
 * @description 实现了先完成认证再加载数据的有序启动流程，解决了竞态条件问题。
 * @version 12.1.0
 */

// --- 核心服务和旧模块导入 ---
import { getGuideData, getCampusData, getMaterials, addMaterial, incrementDownloadCount, addRating, checkIfUserRated } from '../services/api.js';
import { eventBus } from '../services/eventBus.js';
import { db, app } from './cloudbase.js';

// --- 新组件导入 ---
import * as auth from '../components/Auth/auth.js';
import * as theme from '../components/Theme/theme..js';
import * as feedback from '../components/Feedback/feedback.js';
import * as search from '../components/Search/search.js';
import * as navigation from '../components/Navigation/navigation.js';

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
        this.currentUserData = null;

        this.materialFilters = {
            college: '',
            major: '',
            searchTerm: '',
            sortBy: 'createdAt',
            order: 'desc'
        };
        this.searchDebounceTimer = null;
        this.materialRatingCache = new Map();

        this._cacheDOMElements();
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
            themeToggleBtn: document.getElementById('theme-toggle-btn'),
            feedbackBtn: document.getElementById('feedback-btn'),
            feedbackModal: document.getElementById('feedback-modal'),
            feedbackDialog: document.getElementById('feedback-dialog'),
            feedbackForm: document.getElementById('feedback-form'),
            closeFeedbackBtn: document.getElementById('close-feedback-btn'),
            feedbackSuccessMsg: document.getElementById('feedback-success-msg'),
            materialsView: document.getElementById('materials-view'),
            materialsContent: document.getElementById('materials-content'),
            backToMainFromMaterialsBtn: document.getElementById('back-to-main-from-materials-btn'),
            uploadMaterialPromptBtn: document.getElementById('upload-material-prompt-btn'),
            uploadMaterialModal: document.getElementById('upload-material-modal'),
            uploadMaterialDialog: document.getElementById('upload-material-dialog'),
            closeUploadMaterialBtn: document.getElementById('close-upload-material-btn'),
            uploadMaterialForm: document.getElementById('upload-material-form'),
            materialFileInput: document.getElementById('material-file-input'),
            materialFileName: document.getElementById('material-file-name'),
            submitMaterialBtn: document.getElementById('submit-material-btn'),
            uploadProgressContainer: document.getElementById('upload-progress-container'),
            uploadProgressBar: document.getElementById('upload-progress-bar'),
            uploadStatusText: document.getElementById('upload-status-text'),
            uploadSuccessMsg: document.getElementById('upload-success-msg'),
            uploadFormFooter: document.getElementById('upload-form-footer'),
            materialCollegeSelect: document.getElementById('material-college'),
            materialMajorSelect: document.getElementById('material-major'),
            materialsCollegeFilter: document.getElementById('materials-college-filter'),
            materialsMajorFilter: document.getElementById('materials-major-filter'),
            materialsSearchInput: document.getElementById('materials-search-input'),
            materialsSortButtons: document.getElementById('materials-sort-buttons'),
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
        lucide.createIcons({
            nodes: [toast.querySelector('.toast-icon')]
        });
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 4000);
    }

    /**
     * [修复] init 函数现在只负责初始化组件和设置监听，不再直接加载数据。
     */
    async init() {
        // 1. 初始化所有不依赖核心数据的组件
        theme.init();
        feedback.init();
        auth.init(); // auth.init() 现在会触发认证流程

        // 2. 设置应用级的事件监听器
        this._setupAppEventListeners(); 
        
        // 3. 设置剩余的、待重构的事件监听
        this._setupEventListeners();
    }

    /**
     * [修复] 新增一个函数，专门用于在认证就绪后加载数据和启动应用。
     */
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
            await auth.provideCampusData(this.campusData);
            viewManager.updateCampusData(this.campusData);

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
    
    /**
     * [修复] 在这里订阅 auth:ready 事件。
     */
    _setupAppEventListeners() {
        eventBus.subscribe('toast:show', (data) => this._showToast(data));
        eventBus.subscribe('search:resultClicked', (dataset) => {
            this._handleSearchResultClick(dataset);
        });
        eventBus.subscribe('auth:stateChanged', (data) => {
            this.currentUserData = data.user;
        });

        // 新增：监听认证就绪事件，这是启动数据加载的唯一入口
        eventBus.subscribe('auth:ready', () => {
            this.loadDataAndRunApp();
        });
    }
    
    // ... runApp 和其他所有方法保持不变 ...
    runApp() {
        navigation.init({
            guideData: this.guideData,
            onLinkClick: (category, page) => {
                if (category === 'materials') {
                    this._showMaterialsView();
                } else {
                    this._hideMaterialsView();
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
        this.dom.materialsContent.addEventListener('click', (e) => {
            if (e.target.closest('.download-material-btn')) this._handleMaterialDownload(e);
            if (e.target.closest('#upload-from-empty-state-btn')) this._handleUploadPrompt();
            if (e.target.closest('.rating-star')) this._handleMaterialRating(e);
        });
        this.dom.backToMainFromMaterialsBtn.addEventListener('click', this._hideMaterialsView.bind(this));
        this.dom.uploadMaterialPromptBtn.addEventListener('click', this._handleUploadPrompt.bind(this));
        this.dom.closeUploadMaterialBtn.addEventListener('click', () => this.hideUploadMaterialModal());
        this.dom.submitMaterialBtn.addEventListener('click', this._handleUploadMaterialSubmit.bind(this));
        this.dom.materialFileInput.addEventListener('change', (e) => {
            this.dom.materialFileName.textContent = e.target.files[0] ? e.target.files[0].name : '';
        });
        this.dom.materialCollegeSelect.addEventListener('change', this._handleCollegeChange.bind(this));
        this.dom.materialsCollegeFilter.addEventListener('change', this._handleFilterCollegeChange.bind(this));
        this.dom.materialsMajorFilter.addEventListener('change', this._handleFilterChange.bind(this));
        this.dom.materialsSearchInput.addEventListener('input', this._handleSearchChange.bind(this));
        this.dom.materialsSortButtons.addEventListener('click', this._handleSortChange.bind(this));
    }

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
    
    hideUploadMaterialModal(onHidden) {
        this.dom.uploadMaterialModal.style.opacity = '0';
        this.dom.uploadMaterialDialog.style.transform = 'scale(0.95)';
        this.dom.uploadMaterialDialog.style.opacity = '0';
        setTimeout(() => {
            this.dom.uploadMaterialModal.classList.add('hidden');
            if (onHidden) onHidden();
        }, 300);
    }
    showUploadMaterialModal() {
        this.dom.uploadMaterialModal.classList.remove('hidden');
        setTimeout(() => {
            this.dom.uploadMaterialModal.style.opacity = '1';
            this.dom.uploadMaterialDialog.style.transform = 'scale(1)';
            this.dom.uploadMaterialDialog.style.opacity = '1';
        }, 10);
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
        this._hideMaterialsView();
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

    _showMaterialsView() {
        this.dom.mainView.classList.add('hidden');
        this.dom.detailView.classList.add('hidden');
        this.dom.materialsView.classList.remove('hidden');
        this.dom.materialsView.classList.add('flex');
        navigation.setActive('materials', null);
        this._populateFilterCollegeSelect();
        this._loadAndRenderMaterials();
    }

    _hideMaterialsView() {
        if (!this.dom.materialsView.classList.contains('hidden')) {
            this.dom.materialsView.classList.add('hidden');
            this.dom.materialsView.classList.remove('flex');
            this.dom.mainView.classList.remove('hidden');
        }
    }

    async _loadAndRenderMaterials() {
        this.dom.materialsContent.innerHTML = `<div class="loader mx-auto mt-16"></div>`;
        const materials = await getMaterials(this.materialFilters);

        this.materialRatingCache.clear();
        materials.forEach(m => {
            this.materialRatingCache.set(m._id, {
                rating: m.rating || 0,
                ratingCount: m.ratingCount || 0
            });
        });

        this.dom.materialsContent.innerHTML = renderer.generateMaterialsList(materials);
        lucide.createIcons();

        if (this.currentUserData) {
            this.dom.materialsContent.querySelectorAll('.material-rating-stars').forEach(async container => {
                const docId = container.dataset.docId;
                const hasRated = await checkIfUserRated(docId, this.currentUserData._id);
                if (hasRated) {
                    container.classList.add('disabled');
                    container.parentElement.setAttribute('title', '您已评过分');
                }
            });
        }
    }

    _handleUploadPrompt() {
        if (!this.currentUserData) {
            eventBus.publish('toast:show', { message: '请先登录再分享资料哦', type: 'info' });
            eventBus.publish('auth:requestLogin');
            return;
        }
        this._resetUploadForm();
        this._populateCollegeSelect();
        this.showUploadMaterialModal();
    }

    _resetUploadForm() {
        this.dom.uploadMaterialForm.reset();
        this.dom.materialFileName.textContent = '';
        this.dom.uploadProgressContainer.classList.add('hidden');
        this.dom.uploadSuccessMsg.classList.add('hidden');
        this.dom.uploadMaterialForm.classList.remove('hidden');
        this.dom.uploadFormFooter.classList.remove('hidden');
        this.dom.submitMaterialBtn.disabled = false;
        this.dom.materialMajorSelect.innerHTML = '<option value="">-- 请先选择学院 --</option>';
        this.dom.materialMajorSelect.disabled = true;
    }
    
    async _handleUploadMaterialSubmit() {
        const form = this.dom.uploadMaterialForm;
        const fileInput = this.dom.materialFileInput;
        const submitBtn = this.dom.submitMaterialBtn;

        if (!form.checkValidity()) {
            this._showToast('请填写所有必填项', 'error');
            form.reportValidity();
            return;
        }
        if (fileInput.files.length === 0) {
            this._showToast('请选择要上传的文件', 'error');
            return;
        }

        const file = fileInput.files[0];

        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'text/plain', 'application/zip', 'application/x-rar-compressed'];
        const maxSizeInMB = 20;

        if (!allowedTypes.includes(file.type)) {
            this._showToast('不支持的文件类型！', 'error');
            return;
        }
        if (file.size > maxSizeInMB * 1024 * 1024) {
            this._showToast(`文件大小不能超过 ${maxSizeInMB}MB`, 'error');
            return;
        }

        submitBtn.disabled = true;
        this.dom.uploadStatusText.textContent = '准备上传...';
        this.dom.uploadProgressContainer.classList.remove('hidden');
        this.dom.uploadProgressBar.style.width = '0%';

        const formData = new FormData(form);

        try {
            const userIdentifier = this.currentUserData.studentId || this.currentUserData._id;
            const cloudPath = `study_materials/${userIdentifier}/${Date.now()}-${file.name}`;
            
            const uploadResult = await app.uploadFile({
                cloudPath,
                filePath: file,
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    this.dom.uploadStatusText.textContent = `正在上传... ${percentCompleted}%`;
                    this.dom.uploadProgressBar.style.width = `${percentCompleted}%`;
                }
            });

            this.dom.uploadStatusText.textContent = '正在写入数据库...';

            const materialData = {
                uploaderId: this.currentUserData._id,
                uploaderStudentId: this.currentUserData.studentId || null,
                uploaderNickname: this.currentUserData.nickname,
                courseName: formData.get('courseName'),
                teacher: formData.get('teacher'),
                college: formData.get('college'),
                major: formData.get('major'),
                materialType: formData.get('materialType'),
                description: formData.get('description'),
                fileName: file.name,
                fileCloudPath: uploadResult.fileID,
                fileSize: file.size,
                downloadCount: 0,
                rating: 0,
                ratingCount: 0,
            };

            await addMaterial(materialData);
            this.dom.uploadMaterialForm.classList.add('hidden');
            this.dom.uploadFormFooter.classList.add('hidden');
            this.dom.uploadProgressContainer.classList.add('hidden');
            this.dom.uploadSuccessMsg.classList.remove('hidden');
            lucide.createIcons();
            await this._loadAndRenderMaterials();
            setTimeout(() => {
                this.hideUploadMaterialModal(() => this._resetUploadForm());
            }, 3000);

        } catch (error) {
            console.error('上传失败:', error);
            this._showToast(`上传失败: ${error.message || '未知错误'}`, 'error');
            submitBtn.disabled = false;
            this.dom.uploadProgressContainer.classList.add('hidden');
        }
    }

    async _handleMaterialDownload(e) {
        const downloadBtn = e.target.closest('.download-material-btn');
        if (!downloadBtn) return;
        if (!this.currentUserData) {
            eventBus.publish('toast:show', { message: '请先登录才能下载资料哦', type: 'info' });
            eventBus.publish('auth:requestLogin');
            return;
        }
        const { filePath, docId } = downloadBtn.dataset;
        if (!filePath || !docId) {
            this._showToast('文件信息无效，无法下载', 'error');
            return;
        }
        downloadBtn.disabled = true;
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = `<span class="loader-small"></span>正在获取链接...`;
        try {
            const { fileList } = await app.getTempFileURL({ fileList: [filePath] });
            if (fileList[0] && fileList[0].tempFileURL) {
                window.open(fileList[0].tempFileURL, '_blank');
                incrementDownloadCount(docId);
                const countElement = downloadBtn.closest('.material-card').querySelector('[data-lucide="download"] + span');
                if (countElement) {
                    const currentCount = parseInt(countElement.textContent, 10);
                    if (!isNaN(currentCount)) {
                        countElement.textContent = currentCount + 1;
                    }
                }
            } else {
                throw new Error('无法获取有效的下载链接');
            }
        } catch (error) {
            console.error('下载失败:', error);
            this._showToast(`下载失败: ${error.message || '请稍后再试'}`, 'error');
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalText;
        }
    }

    async _handleMaterialRating(e) {
        const star = e.target.closest('.rating-star');
        if (!star) return;
        if (!this.currentUserData) {
            eventBus.publish('toast:show', { message: '请先登录才能评分哦', type: 'info' });
            eventBus.publish('auth:requestLogin');
            return;
        }
        const ratingStarsContainer = star.parentElement;
        const docId = ratingStarsContainer.dataset.docId;
        const ratingValue = parseInt(star.dataset.value, 10);
        if (ratingStarsContainer.classList.contains('disabled')) {
            this._showToast('您已经评过分啦', 'info');
            return;
        }
        ratingStarsContainer.classList.add('disabled');
        ratingStarsContainer.parentElement.setAttribute('title', '正在提交...');
        try {
            await addRating(docId, this.currentUserData._id, this.currentUserData.studentId, ratingValue);
            this._showToast('感谢您的评分！', 'success');
            const oldRatingData = this.materialRatingCache.get(docId) || { rating: 0, ratingCount: 0 };
            const newRatingCount = oldRatingData.ratingCount + 1;
            const newTotalScore = (oldRatingData.rating * oldRatingData.ratingCount) + ratingValue;
            const newRating = newTotalScore / newRatingCount;
            this.materialRatingCache.set(docId, { rating: newRating, ratingCount: newRatingCount });
            this._updateRatingUI(ratingStarsContainer, newRating, newRatingCount);
            ratingStarsContainer.parentElement.setAttribute('title', '您已评过分');
        } catch (error) {
            console.error('评分失败:', error);
            this._showToast('评分失败，请稍后再试', 'error');
            ratingStarsContainer.classList.remove('disabled');
            ratingStarsContainer.parentElement.setAttribute('title', '点击评分');
        }
    }
    
    _updateRatingUI(ratingStarsContainer, newRating, newRatingCount) {
        const ratingContainer = ratingStarsContainer.closest('.material-rating-container');
        const scoreElement = ratingContainer.querySelector('.rating-score');
        const countElement = ratingContainer.querySelector('.rating-count');
        scoreElement.textContent = newRating.toFixed(1);
        if (countElement) {
            countElement.textContent = `(${newRatingCount}人)`;
        } else {
            const newCountElement = document.createElement('span');
            newCountElement.className = 'rating-count';
            newCountElement.textContent = `(${newRatingCount}人)`;
            scoreElement.after(newCountElement);
        }
        const fullStars = Math.floor(newRating);
        const halfStar = newRating % 1 >= 0.5;
        ratingStarsContainer.querySelectorAll('.rating-star').forEach((s, index) => {
            s.classList.remove('star-filled', 'hover');
            const starValue = index + 1;
            let icon = 'star';
            if (starValue <= fullStars) {
                icon = 'star';
                s.classList.add('star-filled');
            } else if (starValue === fullStars + 1 && halfStar) {
                icon = 'star-half';
                s.classList.add('star-filled');
            }
            s.setAttribute('data-lucide', icon);
        });
        lucide.createIcons({ nodes: [ratingStarsContainer] });
    }

    _populateCollegeSelect() {
        const select = this.dom.materialCollegeSelect;
        select.innerHTML = '<option value="">-- 请选择学院 --</option>';
        if (this.campusData && this.campusData.colleges) {
            const collegeNames = [...new Set(this.campusData.colleges.map(c => c.college))];
            collegeNames.sort((a, b) => a.localeCompare(b, 'zh-CN'));
            collegeNames.forEach(name => {
                const option = new Option(name, name);
                select.add(option);
            });
        }
    }

    _handleCollegeChange() {
        const collegeName = this.dom.materialCollegeSelect.value;
        const majorSelect = this.dom.materialMajorSelect;
        majorSelect.innerHTML = '<option value="">-- 请选择专业 --</option>';
        if (collegeName && this.campusData && this.campusData.colleges) {
            const college = this.campusData.colleges.find(c => c.college === collegeName);
            if (college && college.majors && college.majors.length > 0) {
                college.majors.forEach(majorName => {
                    const option = new Option(majorName, majorName);
                    majorSelect.add(option);
                });
                majorSelect.disabled = false;
            } else {
                majorSelect.innerHTML = '<option value="">-- 该学院无专业数据 --</option>';
                majorSelect.disabled = true;
            }
        } else {
            majorSelect.innerHTML = '<option value="">-- 请先选择学院 --</option>';
            majorSelect.disabled = true;
        }
    }

    _populateFilterCollegeSelect() {
        const select = this.dom.materialsCollegeFilter;
        select.innerHTML = '<option value="">所有学院</option>';
        if (this.campusData && this.campusData.colleges) {
            const collegeNames = [...new Set(this.campusData.colleges.map(c => c.college))];
            collegeNames.sort((a, b) => a.localeCompare(b, 'zh-CN'));
            collegeNames.forEach(name => {
                const option = new Option(name, name);
                select.add(option);
            });
        }
    }

    _handleFilterCollegeChange() {
        const collegeName = this.dom.materialsCollegeFilter.value;
        const majorSelect = this.dom.materialsMajorFilter;
        majorSelect.innerHTML = '<option value="">所有专业</option>';
        if (collegeName && this.campusData && this.campusData.colleges) {
            const college = this.campusData.colleges.find(c => c.college === collegeName);
            if (college && college.majors && college.majors.length > 0) {
                college.majors.forEach(majorName => {
                    const option = new Option(majorName, majorName);
                    majorSelect.add(option);
                });
                majorSelect.disabled = false;
            } else {
                majorSelect.disabled = true;
            }
        } else {
            majorSelect.disabled = true;
        }
        this._handleFilterChange();
    }

    _handleFilterChange() {
        this.materialFilters.college = this.dom.materialsCollegeFilter.value;
        this.materialFilters.major = this.dom.materialsMajorFilter.value;
        this.materialFilters.searchTerm = this.dom.materialsSearchInput.value.trim();
        this._loadAndRenderMaterials();
    }

    _handleSearchChange() {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
            this._handleFilterChange();
        }, 500);
    }

    _handleSortChange(e) {
        const button = e.target.closest('.sort-btn');
        if (!button || button.classList.contains('active')) return;
        this.dom.materialsSortButtons.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.materialFilters.sortBy = button.dataset.sort;
        this._handleFilterChange();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';

    const app = new GuideApp();
    await app.init();
});
