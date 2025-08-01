/**
 * @file 应用主入口 (Main Entry Point) - 优化第一版
 * @description 负责应用的整体流程控制。
 * @version 7.1.0
 * @changes
 * - [安全增强] 在 `_handleUploadMaterialSubmit` 中增加了前端文件类型和大小校验。
 * - [体验优化] 在 `_handleMaterialDownload` 中实现了下载计数的实时前端更新。
 * - [体验优化] 在 `_setupEventListeners` 中为“空状态”下的上传按钮添加了事件监听。
 */

// 导入重构后的模块
// --- 修改: 导入 app 实例和新的 dataManager 函数 ---
import { getGuideData, getCampusData, getMaterials, addMaterial, incrementDownloadCount } from './data/dataManager.js';
import * as renderer from './ui/renderer.js';
import { createNavigation, handleNavigationClick, updateActiveNav } from './ui/navigation.js';
import * as authUI from './ui/auth.js';
import * as modals from './ui/modals.js';
import * as search from './ui/search.js';
import * as viewManager from './ui/viewManager.js';
import * as theme from './ui/theme.js';
import { db, app } from './cloudbase.js'; // 导入 app 用于文件上传下载

class GuideApp {
    constructor() {
        // 数据在认证成功后才会被填充
        this.guideData = null;
        this.campusData = null;
        this.selectedCampus = null;
        this.observer = null;
        this.isScrollingProgrammatically = false;
        this.scrollTimeout = null;
        this.currentUserData = null;

        // --- 新增: 资料筛选状态和搜索防抖计时器 ---
        this.materialFilters = {
            college: '',
            major: '',
            searchTerm: '',
            sortBy: 'createdAt',
            order: 'desc'
        };
        this.searchDebounceTimer = null;


        this._cacheDOMElements();
        // 将 showToast 方法绑定到实例，以便在其他模块中正确调用
        this.dom.showToast = this._showToast.bind(this);
        authUI.cacheAuthDOMElements(this.dom);
        modals.init(this.dom);
        viewManager.init({
            domElements: this.dom,
            // 初始时 campusData 为 null，后续会更新
            cData: () => this.campusData
        });
    }

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
            feedbackDialog: document.getElementById('feedback-dialog'),
            feedbackForm: document.getElementById('feedback-form'),
            closeFeedbackBtn: document.getElementById('close-feedback-btn'),
            feedbackSuccessMsg: document.getElementById('feedback-success-msg'),
            authModal: document.getElementById('auth-modal'),
            authDialog: document.getElementById('auth-dialog'),
            closeAuthBtn: document.getElementById('close-auth-btn'),
            authTitle: document.getElementById('auth-title'),
            loginPromptBtn: document.getElementById('login-prompt-btn'),
            loginFormContainer: document.getElementById('login-form-container'),
            loginForm: document.getElementById('login-form'),
            registerFormContainer: document.getElementById('register-form-container'),
            registerForm: document.getElementById('register-form'),
            resetPasswordFormContainer: document.getElementById('reset-password-form-container'),
            resetPasswordForm: document.getElementById('reset-password-form'),
            goToRegister: document.getElementById('go-to-register'),
            goToLoginFromRegister: document.getElementById('go-to-login-from-register'),
            forgotPasswordLink: document.getElementById('forgot-password-link'),
            goToLoginFromReset: document.getElementById('go-to-login-from-reset'),
            sendVerificationCodeBtn: document.getElementById('send-verification-code-btn'),
            userProfileBtn: document.getElementById('user-profile-btn'),
            sidebarAvatar: document.getElementById('sidebar-avatar'),
            sidebarNickname: document.getElementById('sidebar-nickname'),
            profileModal: document.getElementById('profile-modal'),
            profileDialog: document.getElementById('profile-dialog'),
            closeProfileBtn: document.getElementById('close-profile-btn'),
            profileViewContainer: document.getElementById('profile-view-container'),
            profileEditContainer: document.getElementById('profile-edit-container'),
            profileAvatarLarge: document.getElementById('profile-avatar-large'),
            profileNickname: document.getElementById('profile-nickname'),
            profileEmail: document.getElementById('profile-email'),
            profileMajorYear: document.getElementById('profile-major-year'),
            profileBio: document.getElementById('profile-bio'),
            editProfileBtn: document.getElementById('edit-profile-btn'),
            logoutButton: document.getElementById('logout-button'),
            cancelEditBtn: document.getElementById('cancel-edit-btn'),
            saveProfileBtn: document.getElementById('save-profile-btn'),
            avatarSelectionGrid: document.getElementById('avatar-selection-grid'),
            editNickname: document.getElementById('edit-nickname'),
            editBio: document.getElementById('edit-bio'),
            editEnrollmentYear: document.getElementById('edit-enrollment-year'),
            editMajor: document.getElementById('edit-major'),

            // --- 学习资料共享相关的DOM元素 ---
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
            // --- 新增: 缓存筛选栏的DOM元素 ---
            materialsCollegeFilter: document.getElementById('materials-college-filter'),
            materialsMajorFilter: document.getElementById('materials-major-filter'),
            materialsSearchInput: document.getElementById('materials-search-input'),
            materialsSortButtons: document.getElementById('materials-sort-buttons'),
        };
    }

    _showToast(message, type = 'info') {
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
        theme.init(this.dom);
        this._setupEventListeners();

        authUI.listenForAuthStateChanges(async (userData) => {
            this.currentUserData = userData;

            try {
                console.log("Main: 认证完成，现在开始获取应用数据...");
                [this.guideData, this.campusData] = await Promise.all([
                    getGuideData(),
                    getCampusData()
                ]);

                if (!this.guideData || this.guideData.length === 0) {
                   throw new Error("指南数据加载失败或为空。");
                }
                 if (!this.campusData || !this.campusData.colleges) {
                   throw new Error("校区数据加载失败或为空。");
                }

                console.log("Main: 应用数据获取成功。");

                await this.initializeDataDependentModules();

                this.selectedCampus = localStorage.getItem('selectedCampus');
                if (this.selectedCampus) {
                    this.runApp();
                } else {
                    modals.showCampusSelector();
                }

                setTimeout(() => {
                    this.dom.loadingOverlay.style.opacity = '0';
                    setTimeout(() => this.dom.loadingOverlay.style.display = 'none', 500);
                }, 500);

            } catch (error) {
                console.error("Main: 获取或处理应用数据时失败!", error);
                this.dom.loadingOverlay.innerHTML = `<div class="text-center text-red-500 p-4"><p class="font-bold">应用加载失败</p><p class="text-sm mt-2">无法连接到服务器，请检查网络后重试。</p><p class="text-xs mt-2 text-gray-400">${error.message}</p></div>`;
            }
        });
    }

    async initializeDataDependentModules() {
        if (this.campusData && this.campusData.colleges) {
            try {
                const campusDataCopy = JSON.parse(JSON.stringify(this.campusData));
                await authUI.initializeProfileEditor(campusDataCopy);
            } catch (e) {
                console.error("无法为个人中心编辑器创建数据副本:", e);
                await authUI.initializeProfileEditor(this.campusData);
            }
        }
        viewManager.updateCampusData(this.campusData);
    }

    runApp() {
        createNavigation(this.dom.navMenu, this.guideData);
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

    _setupEventListeners() {
        // --- 原有事件监听 ---
        this.dom.navMenu.addEventListener('click', (e) => handleNavigationClick(e, (category, page) => {
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
        }));

        this.dom.homeButtonTop.addEventListener('click', this._handleHomeClick.bind(this));
        this.dom.menuToggle.addEventListener('click', viewManager.toggleSidebar);
        this.dom.sidebarOverlay.addEventListener('click', viewManager.toggleSidebar);
        this.dom.campusModal.addEventListener('click', this._handleCampusSelection.bind(this));
        this.dom.changeCampusBtn.addEventListener('click', modals.showCampusSelector);
        this.dom.contentArea.addEventListener('click', this._handleCardClick.bind(this));
        this.dom.backToMainBtn.addEventListener('click', viewManager.hideDetailView);
        this.dom.bottomNavHome.addEventListener('click', this._handleHomeClick.bind(this));
        this.dom.bottomNavMenu.addEventListener('click', viewManager.toggleSidebar);
        this.dom.bottomNavSearch.addEventListener('click', viewManager.showMobileSearch);
        this.dom.bottomNavCampus.addEventListener('click', modals.showCampusSelector);
        this.dom.closeMobileSearchBtn.addEventListener('click', viewManager.hideMobileSearch);
        this.dom.feedbackForm.addEventListener('submit', this._handleFeedbackSubmit.bind(this));
        this.dom.feedbackBtn.addEventListener('click', modals.showFeedbackModal);
        this.dom.closeFeedbackBtn.addEventListener('click', modals.hideFeedbackModal);
        this.dom.loginPromptBtn.addEventListener('click', () => {
            authUI.handleAuthViewChange('login');
            modals.showAuthModal();
        });
        this.dom.closeAuthBtn.addEventListener('click', modals.hideAuthModal);
        this.dom.loginForm.addEventListener('submit', (e) => authUI.handleLoginSubmit(e));
        this.dom.registerForm.addEventListener('submit', (e) => authUI.handleRegisterSubmit(e));
        this.dom.resetPasswordForm.addEventListener('submit', (e) => authUI.handlePasswordResetSubmit(e));
        this.dom.sendVerificationCodeBtn.addEventListener('click', () => authUI.handleSendVerificationCode());
        this.dom.goToRegister.addEventListener('click', (e) => { e.preventDefault(); authUI.handleAuthViewChange('register'); });
        this.dom.goToLoginFromRegister.addEventListener('click', (e) => { e.preventDefault(); authUI.handleAuthViewChange('login'); });
        this.dom.forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); authUI.handleAuthViewChange('reset'); });
        this.dom.goToLoginFromReset.addEventListener('click', (e) => { e.preventDefault(); authUI.handleAuthViewChange('login'); });
        this.dom.userProfileBtn.addEventListener('click', () => { authUI.handleProfileViewChange('view'); modals.showProfileModal(); });
        this.dom.closeProfileBtn.addEventListener('click', modals.hideProfileModal);
        this.dom.logoutButton.addEventListener('click', () => { authUI.handleLogout(); modals.hideProfileModal(); });
        this.dom.editProfileBtn.addEventListener('click', () => { authUI.populateProfileEditForm(this.currentUserData); authUI.handleProfileViewChange('edit'); });
        this.dom.cancelEditBtn.addEventListener('click', () => authUI.handleProfileViewChange('view'));
        this.dom.profileEditContainer.addEventListener('submit', (e) => authUI.handleProfileSave(e, this.currentUserData));
        this.dom.avatarSelectionGrid.addEventListener('click', (e) => {
            const selectedAvatar = e.target.closest('.avatar-option');
            if (selectedAvatar) {
                this.dom.avatarSelectionGrid.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
                selectedAvatar.classList.add('selected');
            }
        });

        // --- 学习资料共享功能的事件监听 ---
        this.dom.backToMainFromMaterialsBtn.addEventListener('click', this._hideMaterialsView.bind(this));
        this.dom.uploadMaterialPromptBtn.addEventListener('click', this._handleUploadPrompt.bind(this));
        this.dom.closeUploadMaterialBtn.addEventListener('click', () => modals.hideUploadMaterialModal());
        this.dom.submitMaterialBtn.addEventListener('click', this._handleUploadMaterialSubmit.bind(this));
        this.dom.materialFileInput.addEventListener('change', (e) => {
            this.dom.materialFileName.textContent = e.target.files[0] ? e.target.files[0].name : '';
        });
        this.dom.materialsContent.addEventListener('click', this._handleMaterialDownload.bind(this));

        // [体验优化] 为空状态下的上传按钮添加事件监听 (使用事件委托)
        this.dom.materialsContent.addEventListener('click', (e) => {
            if (e.target.id === 'upload-from-empty-state-btn') {
                this._handleUploadPrompt();
            }
        });

        this.dom.materialCollegeSelect.addEventListener('change', this._handleCollegeChange.bind(this));

        // --- 新增: 筛选栏的事件监听 ---
        this.dom.materialsCollegeFilter.addEventListener('change', this._handleFilterCollegeChange.bind(this));
        this.dom.materialsMajorFilter.addEventListener('change', this._handleFilterChange.bind(this));
        this.dom.materialsSearchInput.addEventListener('input', this._handleSearchChange.bind(this));
        this.dom.materialsSortButtons.addEventListener('click', this._handleSortChange.bind(this));
    }

    async _handleFeedbackSubmit(e) {
        e.preventDefault();
        const submitButton = this.dom.feedbackForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = '提交中...';

        const content = this.dom.feedbackForm.content.value.trim();
        const contact = this.dom.feedbackForm.contact.value.trim();

        if (!content) {
            this._showToast('反馈内容不能为空', 'error');
            submitButton.disabled = false;
            submitButton.textContent = '提交';
            return;
        }

        try {
            await db.collection('feedback').add({
                content: content,
                contact: contact,
                submittedAt: db.serverDate(),
                userAgent: navigator.userAgent,
                campus: this.selectedCampus,
                userId: this.currentUserData ? this.currentUserData._id : 'anonymous'
            });

            this.dom.feedbackForm.classList.add('hidden');
            this.dom.feedbackSuccessMsg.classList.remove('hidden');

            setTimeout(() => {
                modals.hideFeedbackModal();
            }, 3000);

        } catch (error) {
            console.error('提交反馈失败:', error);
            this._showToast('提交失败，请稍后再试', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '提交';
        }
    }

    _handleCampusSelection(e) {
        const button = e.target.closest('.campus-select-btn');
        if (!button) return;
        const campus = button.dataset.campus;
        localStorage.setItem('selectedCampus', campus);
        this.selectedCampus = campus;
        search.updateCampus(campus);
        viewManager.updateCampus(campus);
        modals.hideCampusSelector(() => {
            this.runApp();
        });
    }

    _updateCampusDisplay() {
        const campusInfo = this.campusData.campuses.find(c => c.id === this.selectedCampus);
        if (campusInfo) {
            this.dom.currentCampusDisplay.textContent = `当前: ${campusInfo.name}`;
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
                if (!targetCategory) {
                    console.warn(`快速导航失败: 未找到分类 "${navData.category}"`);
                    return;
                }

                const targetPage = targetCategory.pages.find(p => p.title.startsWith(navData.page));
                if (!targetPage) {
                    console.warn(`快速导航失败: 在分类 "${navData.category}" 中未找到页面 "${navData.page}"`);
                    return;
                }

                const categoryKey = targetCategory.key;
                const pageKey = targetPage.pageKey;
                const targetElement = document.getElementById(`page-${categoryKey}-${pageKey}`);

                if (targetElement) {
                    this._updateActiveState(categoryKey, pageKey);
                    this._scrollToElement(targetElement);
                } else {
                    console.warn(`快速导航失败: 找不到ID为 "page-${categoryKey}-${pageKey}" 的元素`);
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
                    if (window.lucide) {
                        lucide.createIcons({ nodes: [resultDisplay] });
                    }
                }
            } else {
                resultDisplay.innerHTML = '<p class="text-gray-500 dark:text-gray-400">查询结果将在此处显示</p>';
            }
        });
    }

    // ===================================================================================
    // --- 学习资料共享中心的核心逻辑方法 ---
    // ===================================================================================

    _showMaterialsView() {
        this.dom.mainView.classList.add('hidden');
        this.dom.detailView.classList.add('hidden');
        this.dom.materialsView.classList.remove('hidden');
        this.dom.materialsView.classList.add('flex');
        updateActiveNav('materials', null);
        // --- 新增: 进入页面时，填充筛选器并加载数据 ---
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

    /**
     * [已修改] 根据当前的筛选条件加载并渲染资料
     */
    async _loadAndRenderMaterials() {
        this.dom.materialsContent.innerHTML = `<div class="loader mx-auto mt-16"></div>`;
        // 将当前的筛选状态传给 dataManager
        const materials = await getMaterials(this.materialFilters);
        this.dom.materialsContent.innerHTML = renderer.generateMaterialsList(materials);
        lucide.createIcons();
    }

    _handleUploadPrompt() {
        if (!this.currentUserData) {
            this._showToast('请先登录再分享资料哦', 'info');
            authUI.handleAuthViewChange('login');
            modals.showAuthModal();
            return;
        }
        this._resetUploadForm();
        this._populateCollegeSelect();
        modals.showUploadMaterialModal();
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

        // =================================================================
        // [安全增强] 任务2：在这里增加前端的文件类型和大小校验
        // =================================================================
        const allowedTypes = [
            'application/pdf', // PDF
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/vnd.ms-powerpoint', // .ppt
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
            'image/jpeg', // .jpg, .jpeg
            'image/png', // .png
            'application/zip', // .zip
            'application/x-rar-compressed', // .rar
        ];
        const maxSizeInMB = 20;

        if (!allowedTypes.includes(file.type)) {
            this._showToast('不支持的文件类型！仅支持PDF, Word, PPT, 图片和压缩包。', 'error');
            return;
        }

        if (file.size > maxSizeInMB * 1024 * 1024) {
            this._showToast(`文件大小不能超过 ${maxSizeInMB}MB`, 'error');
            return;
        }
        // =================================================================
        // 文件校验结束
        // =================================================================


        submitBtn.disabled = true;
        this.dom.uploadStatusText.textContent = '准备上传...';
        this.dom.uploadProgressContainer.classList.remove('hidden');
        this.dom.uploadProgressBar.style.width = '0%';

        const formData = new FormData(form);

        try {
            const cloudPath = `study_materials/${this.currentUserData._id}/${Date.now()}-${file.name}`;
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
                modals.hideUploadMaterialModal(() => {
                    this._resetUploadForm();
                });
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
                const tempUrl = fileList[0].tempFileURL;
                window.open(tempUrl, '_blank');
                incrementDownloadCount(docId); // 后台更新下载计数

                // =================================================================
                // [体验优化] 任务3：在这里增加前端下载计数的实时更新
                // =================================================================
                const countElement = downloadBtn.closest('.material-card').querySelector('[data-lucide="download"] + span');
                if (countElement) {
                    const currentCount = parseInt(countElement.textContent, 10);
                    if (!isNaN(currentCount)) {
                        countElement.textContent = currentCount + 1;
                    }
                }
                // =================================================================
                // 实时更新结束
                // =================================================================

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

    // --- 新增: 筛选栏相关的所有逻辑 ---

    /**
     * 填充筛选栏的学院下拉框
     */
    _populateFilterCollegeSelect() {
        const select = this.dom.materialsCollegeFilter;
        select.innerHTML = '<option value="">所有学院</option>'; // 重置

        if (this.campusData && this.campusData.colleges) {
            const collegeNames = [...new Set(this.campusData.colleges.map(c => c.college))];
            collegeNames.sort((a, b) => a.localeCompare(b, 'zh-CN'));
            collegeNames.forEach(name => {
                const option = new Option(name, name);
                select.add(option);
            });
        }
    }

    /**
     * 处理筛选栏学院选择的变化，并联动专业
     */
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
        // 触发筛选更新
        this._handleFilterChange();
    }

    /**
     * 统一处理筛选条件变化，并重新加载数据
     */
    _handleFilterChange() {
        this.materialFilters.college = this.dom.materialsCollegeFilter.value;
        this.materialFilters.major = this.dom.materialsMajorFilter.value;
        this.materialFilters.searchTerm = this.dom.materialsSearchInput.value.trim();
        this._loadAndRenderMaterials();
    }

    /**
     * 处理搜索框输入（带防抖）
     */
    _handleSearchChange() {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
            this._handleFilterChange();
        }, 500); // 500ms 延迟
    }

    /**
     * 处理排序按钮点击
     */
    _handleSortChange(e) {
        const button = e.target.closest('.sort-btn');
        if (!button || button.classList.contains('active')) return;

        this.dom.materialsSortButtons.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        this.materialFilters.sortBy = button.dataset.sort;
        this._handleFilterChange();
    }
}

// [关键改动] 重构后的应用启动入口
document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';

    const app = new GuideApp();
    await app.init();
});
