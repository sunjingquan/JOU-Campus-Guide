/**
 * @file 应用主入口 (Main Entry Point)
 * @description 这是整个应用的起点。它负责导入所有必要的模块（数据、服务、UI组件），
 * 并初始化主应用逻辑。
 */

// ===================================================================================
// --- 模块导入 ---
// ===================================================================================

import { guideData } from './data/guideData.js';
import { campusData, campusInfoData } from './data/campusData.js';
import * as renderer from './ui/renderer.js';
import { createNavigation, handleNavigationClick, updateActiveNav } from './ui/navigation.js';
import * as authUI from './ui/auth.js';
import * as modals from './ui/modals.js';
import * as search from './ui/search.js';
import * as viewManager from './ui/viewManager.js'; // 导入新的视图管理模块

// ===================================================================================
// --- 应用主类 (最终将被完全拆解) ---
// ===================================================================================
class GuideApp {
    constructor(commonData, specificData) {
        this.guideData = commonData;
        this.campusData = specificData;
        this.selectedCampus = null;
        this.observer = null;
        this.isScrollingProgrammatically = false;
        this.scrollTimeout = null;
        this.currentUserData = null;

        // 缓存所有需要操作的DOM元素
        this._cacheDOMElements();
        
        // 初始化依赖DOM的模块
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

        toast.innerHTML = `
            <div class="toast-icon"><i data-lucide="${iconName}"></i></div>
            <span>${message}</span>
        `;

        container.appendChild(toast);
        lucide.createIcons({ nodes: [toast.querySelector('.toast-icon')] });

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 4000);
    }

    init() {
        this._determineAndApplyInitialTheme();
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
        this._updateActiveState("主页", "home");
        
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

        for (const categoryKey in this.guideData) {
            const categoryData = this.guideData[categoryKey];
            for (const pageKey in categoryData.pages) {
                const page = categoryData.pages[pageKey];
                const section = document.createElement('div');
                section.className = 'content-section';
                section.id = `page-${categoryKey}-${pageKey}`;
                section.dataset.pageKey = pageKey;
                section.dataset.categoryKey = categoryKey;

                if (page.isCampusSpecific) {
                    let contentHtml = '';
                    if (pageKey === '宿舍介绍') {
                        const items = this.campusData[this.selectedCampus]?.dormitory?.items;
                        contentHtml = renderer.generateCampusCards(items, 'dormitory');
                    } else if (pageKey === '食堂介绍') {
                        const items = this.campusData[this.selectedCampus]?.canteen?.items;
                        contentHtml = renderer.generateCampusCards(items, 'canteen');
                    }
                    section.innerHTML = contentHtml;
                } else if (page.type === 'faq') {
                    section.innerHTML = renderer.createFaqHtml(page.items);
                    this._addFaqListeners(section);
                } else if (page.type === 'clubs') {
                    section.innerHTML = renderer.createClubsHtml(page.data);
                    this._addClubTabListeners(section);
                } else if (page.type === 'campus-query-tool') {
                    section.innerHTML = renderer.createCampusQueryToolHtml();
                    this._initCampusQueryTool(section);
                } else {
                    section.innerHTML = page.content;
                }
                this.dom.contentArea.appendChild(section);
            }
        }

        this._addHomeListeners();
        lucide.createIcons();
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
        
        this.dom.themeToggleBtn.addEventListener('click', this._handleThemeToggle.bind(this));
        
        // Modal Event Listeners
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

        // Auth Form Event Listeners
        this.dom.registerForm.addEventListener('submit', (e) => authUI.handleRegisterSubmit(e, this._showToast, modals.hideAuthModal));
        this.dom.loginForm.addEventListener('submit', (e) => authUI.handleLoginSubmit(e, this._showToast, modals.hideAuthModal));
        this.dom.resetPasswordForm.addEventListener('submit', (e) => authUI.handlePasswordResetSubmit(e, this._showToast, this._handleAuthViewChange.bind(this)));
        this.dom.forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('reset'); });
        this.dom.goToRegisterLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('register'); });
        this.dom.goToLoginFromRegisterLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('login'); });
        this.dom.goToLoginFromResetLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('login'); });
        
        // User Profile Event Listeners
        this.dom.logoutButton.addEventListener('click', () => authUI.handleLogout(this._showToast, modals.hideProfileModal));
        this.dom.editProfileBtn.addEventListener('click', () => this._handleProfileViewChange('edit'));
        this.dom.cancelEditBtn.addEventListener('click', () => this._handleProfileViewChange('view'));
        this.dom.saveProfileBtn.addEventListener('click', (e) => authUI.handleProfileSave(e, this.currentUserData, this._showToast, this._handleProfileViewChange.bind(this)));
        
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
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
        if (this.selectedCampus && this.campusData[this.selectedCampus]) {
            this.dom.currentCampusDisplay.textContent = `当前: ${this.campusData[this.selectedCampus].name}`;
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
        const pageData = this.guideData[categoryKey]?.pages[pageKey];
        if (pageData) {
            if (pageData.isCampusSpecific) {
                let titleKey = '';
                if (pageKey === '宿舍介绍') titleKey = 'dormitory';
                if (pageKey === '食堂介绍') titleKey = 'canteen';
                this.dom.contentTitle.textContent = this.campusData[this.selectedCampus]?.[titleKey]?.title || pageData.title;
            } else {
                this.dom.contentTitle.textContent = pageData.title;
            }
        }
        
        updateActiveNav(categoryKey, pageKey);

        this.dom.bottomNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if (categoryKey === '主页') {
            this.dom.bottomNavHome.classList.add('active');
        }
    }
    
    _handleHomeClick(e) {
        e.preventDefault();
        viewManager.hideAllViews();
        const homeElement = document.getElementById('page-主页-home');
        if (homeElement) {
            this._updateActiveState("主页", "home");
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

    _addHomeListeners() {
        document.getElementById('explore-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            const nextSection = document.getElementById('page-入学准备-开学必备清单');
            if (nextSection) {
                this._updateActiveState("入学准备", "开学必备清单");
                this._scrollToElement(nextSection);
            }
        });
        this.dom.contentArea.querySelectorAll('.nav-card').forEach(card => {
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

    _determineAndApplyInitialTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            this._applyTheme(savedTheme);
        } else {
            this._applyTheme(systemPrefersDark ? 'dark' : 'light');
        }
    }

    _applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);

        const isDark = theme === 'dark';
        document.getElementById('theme-icon-sun').classList.toggle('hidden', isDark);
        document.getElementById('theme-icon-moon').classList.toggle('hidden', !isDark);
    }

    _handleThemeToggle() {
        const currentIsDark = document.documentElement.classList.contains('dark');
        this._applyTheme(currentIsDark ? 'light' : 'dark');
    }

    _handleFeedbackSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(formData).toString()
        })
            .then(() => {
                this.dom.feedbackForm.classList.add('hidden');
                this.dom.feedbackSuccessMsg.classList.remove('hidden');
                setTimeout(() => {
                    modals.hideFeedbackModal();
                }, 2000);
            })
            .catch((error) => {
                console.error(error);
                const submitButton = form.querySelector('button[type="submit"]');
                submitButton.textContent = '提交失败!';
                submitButton.classList.add('bg-red-600');
            });
    }

    _handleAuthViewChange(viewName) {
        this.dom.loginFormContainer.classList.add('hidden');
        this.dom.registerFormContainer.classList.add('hidden');
        this.dom.resetPasswordFormContainer.classList.add('hidden');

        if (viewName === 'login') {
            this.dom.authTitle.textContent = "欢迎回来";
            this.dom.loginFormContainer.classList.remove('hidden');
        } else if (viewName === 'register') {
            this.dom.authTitle.textContent = "加入我们";
            this.dom.registerFormContainer.classList.remove('hidden');
        } else if (viewName === 'reset') {
            this.dom.authTitle.textContent = "重置密码";
            this.dom.resetPasswordFormContainer.classList.remove('hidden');
        }
    }
    
    _handleProfileViewChange(viewName) {
        this.dom.profileDialog.querySelectorAll('.profile-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewName);
        });

        this.dom.profileViewContainer.classList.add('hidden');
        this.dom.profileEditContainer.classList.add('hidden');

        if (viewName === 'view') {
            this.dom.profileViewContainer.classList.remove('hidden');
        } else if (viewName === 'edit') {
            authUI.populateProfileEditForm(this.currentUserData);
            this.dom.profileEditContainer.classList.remove('hidden');
        }
    }
    
    _populateProfileEditDropdowns() {
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i >= currentYear - 5; i--) {
            const option = new Option(i + '级', i);
            this.dom.editEnrollmentYear.add(option);
        }

        const allMajors = [];
        Object.values(campusInfoData).forEach(campus => {
            campus.forEach(college => {
                allMajors.push(...college.majors);
            });
        });
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

        const allColleges = [];
        for (const campus in campusInfoData) {
            campusInfoData[campus].forEach(item => allColleges.push(item.college));
        }
        const uniqueColleges = [...new Set(allColleges)].sort((a, b) => a.localeCompare(b, 'zh-CN'));

        uniqueColleges.forEach(college => {
            const option = document.createElement('option');
            option.value = college;
            option.textContent = college;
            collegeSelect.appendChild(option);
        });

        const handleCollegeChange = () => {
            const selectedCollege = collegeSelect.value;
            majorSelect.innerHTML = '<option value="">-- 请选择 --</option>';
            majorSelect.disabled = true;
            resetResult();

            if (selectedCollege) {
                let collegeInfo = null;
                for (const campus in campusInfoData) {
                    const found = campusInfoData[campus].find(c => c.college === selectedCollege);
                    if (found) {
                        collegeInfo = found;
                        break;
                    }
                }

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
                let campusResult = '';
                for (const campus in campusInfoData) {
                    const found = campusInfoData[campus].some(c =>
                        c.college === selectedCollege && c.majors.includes(selectedMajor)
                    );
                    if (found) {
                        campusResult = campus;
                        break;
                    }
                }
                displayResult(campusResult);
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
                specialNote = `
                    <div class="mt-4 bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-800 dark:text-blue-300 p-4 rounded-md" role="alert">
                        <p class="font-bold">特别提醒</p>
                        <p>到大二通灌校区的同学会搬到本部，具体搬家事宜请留意学院的统一安排。</p>
                    </div>
                `;
            }

            resultDisplay.innerHTML = `
                <div class="w-full">
                    <p class="text-lg text-gray-600 dark:text-gray-300">你所在的校区是：</p>
                    <p class="text-3xl md:text-4xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">${campus}</p>
                    ${specialNote}
                </div>
            `;
        };

        const resetResult = () => {
            resultDisplay.innerHTML = '<p class="text-gray-500 dark:text-gray-400">查询结果将在此处显示</p>';
        };

        collegeSelect.addEventListener('change', handleCollegeChange);
        majorSelect.addEventListener('change', handleMajorChange);
    }
}

// ===================================================================================
// --- 应用启动 ---
// ===================================================================================
document.addEventListener('DOMContentLoaded', () => {
    const app = new GuideApp(guideData, campusData);
    app.init();
});
