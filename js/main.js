/**
 * @file 应用主入口 (Main Entry Point) - 重构版 V2
 * @description 负责应用的整体流程控制。个人资料编辑器的UI逻辑已移交给 auth.js。
 * @version 6.0.0
 */

// 导入重构后的模块
import { getGuideData, getCampusData } from './data/dataManager.js';
import * as renderer from './ui/renderer.js';
import { createNavigation, handleNavigationClick, updateActiveNav } from './ui/navigation.js';
import * as authUI from './ui/auth.js';
import * as modals from './ui/modals.js';
import * as search from './ui/search.js';
import * as viewManager from './ui/viewManager.js';
import * as theme from './ui/theme.js';
import { db } from './cloudbase.js';

class GuideApp {
    constructor(guideData, campusData) {
        this.guideData = guideData;
        this.campusData = campusData;
        this.selectedCampus = null;
        this.observer = null;
        this.isScrollingProgrammatically = false;
        this.scrollTimeout = null;
        this.currentUserData = null;

        this._cacheDOMElements();
        this.dom.showToast = this._showToast.bind(this);
        authUI.cacheAuthDOMElements(this.dom);
        modals.init(this.dom);
        viewManager.init({
            domElements: this.dom,
            cData: this.campusData
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
            editMajor: document.getElementById('edit-major')
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

    init() {
        theme.init(this.dom);
        this._setupEventListeners();

        // [修改] 1. 在这里一次性调用 auth.js 的初始化函数，传入所需数据
        // 这个函数会负责准备好个人中心编辑界面的所有下拉菜单和头像选项
        authUI.initializeProfileEditor(this.campusData);

        authUI.listenForAuthStateChanges((userData) => {
            this.currentUserData = userData;
            // 此处不再需要调用 populateProfileEditForm，
            // 因为事件监听器中会在需要时（如点击“编辑资料”）再调用。
        });
        
        // [已删除] _populateProfileEditDropdowns 方法已被彻底移除。
        
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
                if (page.type === 'campus-query-tool') this._initCampusQueryTool(section);
            });
        });

        this._addHomeListeners();
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    _setupEventListeners() {
        this.dom.navMenu.addEventListener('click', (e) => handleNavigationClick(e, (category, page) => {
            viewManager.hideAllViews();
            this._updateActiveState(category, page);
            const targetElement = document.getElementById(`page-${category}-${page}`);
            if (targetElement) this._scrollToElement(targetElement);
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
        this.dom.goToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            authUI.handleAuthViewChange('register');
        });
        this.dom.goToLoginFromRegister.addEventListener('click', (e) => {
            e.preventDefault();
            authUI.handleAuthViewChange('login');
        });
        this.dom.forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            authUI.handleAuthViewChange('reset');
        });
        this.dom.goToLoginFromReset.addEventListener('click', (e) => {
            e.preventDefault();
            authUI.handleAuthViewChange('login');
        });
        this.dom.userProfileBtn.addEventListener('click', () => {
            authUI.handleProfileViewChange('view');
            modals.showProfileModal();
        });
        this.dom.closeProfileBtn.addEventListener('click', modals.hideProfileModal);
        this.dom.logoutButton.addEventListener('click', () => {
            authUI.handleLogout();
            modals.hideProfileModal();
        });
        this.dom.editProfileBtn.addEventListener('click', () => {
            // [修改] 2. 在切换到编辑视图前，确保表单填充了最新的用户数据
            authUI.populateProfileEditForm(this.currentUserData);
            authUI.handleProfileViewChange('edit');
        });
        this.dom.cancelEditBtn.addEventListener('click', () => authUI.handleProfileViewChange('view'));
        this.dom.profileEditContainer.addEventListener('submit', (e) => authUI.handleProfileSave(e, this.currentUserData));
        this.dom.avatarSelectionGrid.addEventListener('click', (e) => {
            const selectedAvatar = e.target.closest('.avatar-option');
            if (selectedAvatar) {
                this.dom.avatarSelectionGrid.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
                selectedAvatar.classList.add('selected');
            }
        });
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
            if (!this.guideData || this.guideData.length === 0) {
                location.reload();
            } else {
                this.runApp();
            }
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
        viewManager.hideAllViews();
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
                const targetElement = document.getElementById(`page-${navData.category}-${navData.page}`);
                if (targetElement) {
                    this._updateActiveState(navData.category, navData.page);
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

    // [已删除] _populateProfileEditDropdowns 方法已从类中完全删除。

    _initCampusQueryTool(container) { /* ... */ }
}

document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    try {
        loadingOverlay.style.display = 'flex';
        console.log("Main: 开始获取应用数据...");
        const [guideData, campusData] = await Promise.all([
            getGuideData(),
            getCampusData()
        ]);
        console.log("Main: 应用数据获取成功。");
        const app = new GuideApp(guideData, campusData);
        app.init();
    } catch (error) {
        console.error("Main: 初始化应用失败!", error);
        loadingOverlay.innerHTML = `<div class="text-center text-red-500 p-4"><p class="font-bold">应用加载失败</p><p class="text-sm mt-2">请检查网络连接或联系管理员。</p><p class="text-xs mt-2 text-gray-400">${error.message}</p></div>`;
    }
});
