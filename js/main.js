/**
 * @file 应用主入口 (Main Entry Point) - 最终专业版
 * @description 负责流程控制：获取数据 -> 传递给渲染器 -> 设置事件监听。
 * @version 4.1.0 - 修复了快速导航跳转
 */

import { getGuideData, getCampusData } from './data/dataManager.js';
import * as renderer from './ui/renderer.js';
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
            closeFeedbackBtn: document.getElementById('close-feedback-btn'),
            feedbackForm: document.getElementById('feedback-form'),
            feedbackSuccessMsg: document.getElementById('feedback-success-msg'),
            authModal: document.getElementById('auth-modal'),
            authDialog: document.getElementById('auth-dialog'),
            loginPromptBtn: document.getElementById('login-prompt-btn'),
            userProfileBtn: document.getElementById('user-profile-btn'),
            closeAuthBtn: document.getElementById('close-auth-btn'),
            authTitle: document.getElementById('auth-title'),
            loginFormContainer: document.getElementById('login-form-container'),
            registerFormContainer: document.getElementById('register-form-container'),
            resetPasswordFormContainer: document.getElementById('reset-password-form-container'),
            loginForm: document.getElementById('login-form'),
            registerForm: document.getElementById('register-form'),
            resetPasswordForm: document.getElementById('reset-password-form'),
            forgotPasswordLink: document.getElementById('forgot-password-link'),
            goToRegisterLink: document.getElementById('go-to-register'),
            goToLoginFromRegisterLink: document.getElementById('go-to-login-from-register'),
            goToLoginFromResetLink: document.getElementById('go-to-login-from-reset'),
            profileModal: document.getElementById('profile-modal'),
            profileDialog: document.getElementById('profile-dialog'),
            closeProfileBtn: document.getElementById('close-profile-btn'),
            logoutButton: document.getElementById('logout-button'),
            editProfileBtn: document.getElementById('edit-profile-btn'),
            cancelEditBtn: document.getElementById('cancel-edit-btn'),
            saveProfileBtn: document.getElementById('save-profile-btn'),
            profileViewContainer: document.getElementById('profile-view-container'),
            profileEditContainer: document.getElementById('profile-edit-container'),
            sidebarAvatar: document.getElementById('sidebar-avatar'),
            sidebarNickname: document.getElementById('sidebar-nickname'),
            profileAvatarLarge: document.getElementById('profile-avatar-large'),
            profileNickname: document.getElementById('profile-nickname'),
            profileEmail: document.getElementById('profile-email'),
            profileMajorYear: document.getElementById('profile-major-year').querySelector('span'),
            profileBio: document.getElementById('profile-bio'),
            avatarSelectionGrid: document.getElementById('avatar-selection-grid'),
            editNickname: document.getElementById('edit-nickname'),
            editBio: document.getElementById('edit-bio'),
            editEnrollmentYear: document.getElementById('edit-enrollment-year'),
            editMajor: document.getElementById('edit-major'),
        };
    }

    _showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
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
                if (page.isCampusSpecific) {
                    const keyMap = { 'dormitory': 'dormitories', 'canteen': 'canteens' };
                    const dataKey = keyMap[page.pageKey];
                    const items = this.campusData[dataKey]?.filter(item => item.campusId === this.selectedCampus) || [];
                    section.innerHTML = renderer.generateCampusCards(items, page.pageKey);
                } else {
                    section.innerHTML = renderer.renderPageContent(page);
                }
                this.dom.contentArea.appendChild(section);
            });
        });
        this._addHomeListeners();
        // 因为内容是动态添加的，每次渲染完都需要重新调用 createIcons
        if (window.lucide) {
            lucide.createIcons();
        }
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
        this.dom.feedbackBtn.addEventListener('click', modals.showFeedbackModal);
        this.dom.closeFeedbackBtn.addEventListener('click', modals.hideFeedbackModal);
        this.dom.feedbackModal.addEventListener('click', (e) => {
            if (e.target === this.dom.feedbackModal) modals.hideFeedbackModal();
        });
        this.dom.feedbackForm.addEventListener('submit', this._handleFeedbackSubmit.bind(this));
        this.dom.loginPromptBtn.addEventListener('click', () => {
            this._handleAuthViewChange('login');
            modals.showAuthModal();
        });
        this.dom.closeAuthBtn.addEventListener('click', modals.hideAuthModal);
        this.dom.authModal.addEventListener('click', (e) => {
            if (e.target === this.dom.authModal) modals.hideAuthModal();
        });
        this.dom.userProfileBtn.addEventListener('click', () => {
            this._handleProfileViewChange('view');
            modals.showProfileModal();
        });
        this.dom.closeProfileBtn.addEventListener('click', modals.hideProfileModal);
        this.dom.profileModal.addEventListener('click', (e) => {
            if (e.target === this.dom.profileModal) modals.hideProfileModal();
        });
        this.dom.registerForm.addEventListener('submit', (e) => authUI.handleRegisterSubmit(e, this._showToast.bind(this), modals.hideAuthModal));
        this.dom.loginForm.addEventListener('submit', (e) => authUI.handleLoginSubmit(e, this._showToast.bind(this), modals.hideAuthModal));
        this.dom.resetPasswordForm.addEventListener('submit', (e) => authUI.handlePasswordResetSubmit(e, this._showToast.bind(this), this._handleAuthViewChange.bind(this)));
        this.dom.forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('reset'); });
        this.dom.goToRegisterLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('register'); });
        this.dom.goToLoginFromRegisterLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('login'); });
        this.dom.goToLoginFromResetLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('login'); });
        this.dom.logoutButton.addEventListener('click', () => authUI.handleLogout(this._showToast.bind(this), modals.hideProfileModal));
        this.dom.editProfileBtn.addEventListener('click', () => this._handleProfileViewChange('edit'));
        this.dom.cancelEditBtn.addEventListener('click', () => this._handleProfileViewChange('view'));
        this.dom.saveProfileBtn.addEventListener('click', (e) => authUI.handleProfileSave(e, this.currentUserData, this._showToast.bind(this), this._handleProfileViewChange.bind(this)));
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) e.preventDefault();
        }, { passive: false });
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
        this.dom.contentArea.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        if (keyword) {
            setTimeout(() => search.highlightKeywordInSection(targetElement, keyword), 500);
        }
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => { this.isScrollingProgrammatically = false; }, 1000);
    }

    _addFaqListeners(container) {
        const headers = container.querySelectorAll('.accordion-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                header.classList.toggle('open');
                content.style.display = header.classList.contains('open') ? 'block' : 'none';
                header.querySelector('.accordion-icon').classList.toggle('rotate-180');
            });
        });
    }

    /**
     * [关键修复] 修复快速导航卡片的点击事件
     */
    _addHomeListeners() {
        // 探索按钮的跳转
        this.dom.contentArea.querySelector('#explore-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            // 找到数据库中定义的下一页的 key
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
        
        // 快速导航卡片的跳转
        this.dom.contentArea.querySelectorAll('.nav-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const navData = JSON.parse(card.dataset.navlink);
                // 从 navData 中获取分类和页面的 key
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

    _handleFeedbackSubmit(e) {
        e.preventDefault();
        // ... (省略)
    }

    _handleAuthViewChange(viewName) {
        // ... (省略)
    }
    
    _handleProfileViewChange(viewName) {
        // ... (省略)
    }
    
    _populateProfileEditDropdowns() {
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i >= currentYear - 5; i--) {
            const option = new Option(i + '级', i);
            this.dom.editEnrollmentYear.add(option);
        }
        const allMajors = this.campusData.colleges.flatMap(college => college.majors);
        const uniqueMajors = [...new Set(allMajors)].sort((a, b) => a.localeCompare(b, 'zh-CN'));
        uniqueMajors.forEach(major => {
            const option = new Option(major, major);
            this.dom.editMajor.add(option);
        });
    }

    _initCampusQueryTool(container) {
        const collegeSelect = container.querySelector('#college-select');
        const majorSelect = container.querySelector('#major-select');
        const resultDisplay = container.querySelector('#result-display');
        if (!collegeSelect || !majorSelect || !resultDisplay) return;
        const allColleges = this.campusData.colleges;
        const uniqueColleges = [...new Set(allColleges.map(c => c.college))].sort((a,b) => a.localeCompare(b, 'zh-CN'));
        uniqueColleges.forEach(collegeName => {
            const option = document.createElement('option');
            option.value = collegeName;
            option.textContent = collegeName;
            collegeSelect.appendChild(option);
        });
        const handleCollegeChange = () => {
            const selectedCollege = collegeSelect.value;
            majorSelect.innerHTML = '<option value="">-- 请选择 --</option>';
            majorSelect.disabled = true;
            resetResult();
            if (selectedCollege) {
                const collegeInfo = allColleges.find(c => c.college === selectedCollege);
                if (collegeInfo) {
                    collegeInfo.majors.forEach(major => {
                        const option = document.createElement('option');
                        option.value = major;
                        option.textContent = major;
                        majorSelect.appendChild(option);
                    });
                    majorSelect.disabled = false;
                    if (collegeInfo.majors.length === 1) {
                        majorSelect.value = collegeInfo.majors[0];
                        handleMajorChange();
                    }
                }
            }
        };
        const handleMajorChange = () => {
            const selectedCollege = collegeSelect.value;
            const selectedMajor = majorSelect.value;
            if (selectedCollege && selectedMajor) {
                const collegeInfo = allColleges.find(c => c.college === selectedCollege && c.majors.includes(selectedMajor));
                if (collegeInfo) {
                    const campusInfo = this.campusData.campuses.find(c => c.id === collegeInfo.campusId);
                    displayResult(campusInfo?.name);
                } else {
                    resetResult();
                }
            } else {
                resetResult();
            }
        };
        const displayResult = (campus) => {
            if (!campus) {
                resetResult();
                return;
            }
            let specialNote = '';
            if (campus === '通灌校区') {
                specialNote = `<div class="mt-4 bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-800 dark:text-blue-300 p-4 rounded-md" role="alert"><p class="font-bold">特别提醒</p><p>到大二通灌校区的同学会搬到本部，具体搬家事宜请留意学院的统一安排。</p></div>`;
            }
            resultDisplay.innerHTML = `<div class="w-full"><p class="text-lg text-gray-600 dark:text-gray-300">你所在的校区是：</p><p class="text-3xl md:text-4xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">${campus}</p>${specialNote}</div>`;
        };
        const resetResult = () => {
            resultDisplay.innerHTML = '<p class="text-gray-500 dark:text-gray-400">查询结果将在此处显示</p>';
        };
        collegeSelect.addEventListener('change', handleCollegeChange);
        majorSelect.addEventListener('change', handleMajorChange);
    }
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
