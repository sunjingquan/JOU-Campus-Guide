/**
 * @file 应用主入口 (Main Entry Point)
 * @description 这是整个应用的起点。它负责导入所有必要的模块（数据、服务、UI组件），
 * 并初始化主应用逻辑。
 */

// ===================================================================================
// --- 模块导入 ---
// ===================================================================================

// 导入数据模块
import { guideData } from './data/guideData.js';
import { campusData, campusInfoData } from './data/campusData.js';

// 导入Firebase服务实例
import { auth, db } from './firebase.js';

// 从Firebase SDK导入后续会用到的具体函数
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    Timestamp
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";


// ===================================================================================
// --- 全局数据与常量 ---
// ===================================================================================
const AVATARS = Array.from({ length: 1 }, (_, i) => `avatar_${String(i + 1).padStart(2, '0')}`);
const getAvatarUrl = (id) => id ? `../images/默认头像/${id}.png` : '../images/默认头像/avatar_01.png';


// ===================================================================================
// --- 应用主类 (未来将被进一步拆分) ---
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
        this.unsubscribeUserDoc = null;

        // 缓存DOM元素
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.mainView = document.getElementById('main-view');
        this.navMenu = document.getElementById('nav-menu');
        this.contentArea = document.getElementById('content-area');
        this.contentTitle = document.getElementById('content-title');
        this.menuToggle = document.getElementById('menu-toggle');
        this.sidebar = document.getElementById('sidebar');
        this.homeButtonTop = document.getElementById('home-button-top');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');
        this.campusModal = document.getElementById('campus-selector-modal');
        this.campusDialog = document.getElementById('campus-selector-dialog');
        this.changeCampusBtn = document.getElementById('change-campus-btn');
        this.currentCampusDisplay = document.getElementById('current-campus-display');
        this.detailView = document.getElementById('detail-view');
        this.detailTitle = document.getElementById('detail-title');
        this.detailContent = document.getElementById('detail-content');
        this.backToMainBtn = document.getElementById('back-to-main-btn');
        this.searchForm = document.getElementById('search-form');
        this.searchInput = document.getElementById('search-input');
        this.liveSearchResultsContainer = document.getElementById('live-search-results');
        this.bottomNav = document.getElementById('bottom-nav');
        this.bottomNavHome = document.getElementById('bottom-nav-home');
        this.bottomNavMenu = document.getElementById('bottom-nav-menu');
        this.bottomNavSearch = document.getElementById('bottom-nav-search');
        this.bottomNavCampus = document.getElementById('bottom-nav-campus');
        this.mobileSearchOverlay = document.getElementById('mobile-search-overlay');
        this.mobileSearchInput = document.getElementById('mobile-search-input');
        this.mobileSearchResultsContainer = document.getElementById('mobile-search-results-container');
        this.closeMobileSearchBtn = document.getElementById('close-mobile-search-btn');
        this.themeToggleBtn = document.getElementById('theme-toggle-btn');
        this.feedbackBtn = document.getElementById('feedback-btn');
        this.feedbackModal = document.getElementById('feedback-modal');
        this.feedbackDialog = document.getElementById('feedback-dialog');
        this.closeFeedbackBtn = document.getElementById('close-feedback-btn');
        this.feedbackForm = document.getElementById('feedback-form');
        this.feedbackSuccessMsg = document.getElementById('feedback-success-msg');
        this.authModal = document.getElementById('auth-modal');
        this.authDialog = document.getElementById('auth-dialog');
        this.loginPromptBtn = document.getElementById('login-prompt-btn');
        this.userProfileBtn = document.getElementById('user-profile-btn');
        this.closeAuthBtn = document.getElementById('close-auth-btn');
        this.authTitle = document.getElementById('auth-title');
        this.loginFormContainer = document.getElementById('login-form-container');
        this.registerFormContainer = document.getElementById('register-form-container');
        this.resetPasswordFormContainer = document.getElementById('reset-password-form-container');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.resetPasswordForm = document.getElementById('reset-password-form');
        this.forgotPasswordLink = document.getElementById('forgot-password-link');
        this.goToRegisterLink = document.getElementById('go-to-register');
        this.goToLoginFromRegisterLink = document.getElementById('go-to-login-from-register');
        this.goToLoginFromResetLink = document.getElementById('go-to-login-from-reset');
        this.profileModal = document.getElementById('profile-modal');
        this.profileDialog = document.getElementById('profile-dialog');
        this.closeProfileBtn = document.getElementById('close-profile-btn');
        this.logoutButton = document.getElementById('logout-button');
        this.editProfileBtn = document.getElementById('edit-profile-btn');
        this.cancelEditBtn = document.getElementById('cancel-edit-btn');
        this.saveProfileBtn = document.getElementById('save-profile-btn');
        this.profileViewContainer = document.getElementById('profile-view-container');
        this.profileEditContainer = document.getElementById('profile-edit-container');
        this.sidebarAvatar = document.getElementById('sidebar-avatar');
        this.sidebarNickname = document.getElementById('sidebar-nickname');
        this.profileAvatarLarge = document.getElementById('profile-avatar-large');
        this.profileNickname = document.getElementById('profile-nickname');
        this.profileEmail = document.getElementById('profile-email');
        this.profileMajorYear = document.getElementById('profile-major-year').querySelector('span');
        this.profileBio = document.getElementById('profile-bio');
        this.avatarSelectionGrid = document.getElementById('avatar-selection-grid');
        this.editNickname = document.getElementById('edit-nickname');
        this.editBio = document.getElementById('edit-bio');
        this.editEnrollmentYear = document.getElementById('edit-enrollment-year');
        this.editMajor = document.getElementById('edit-major');
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
        this._listenForAuthStateChanges();
        this._populateProfileEditDropdowns();
        this.selectedCampus = localStorage.getItem('selectedCampus');

        if (this.selectedCampus) {
            this.runApp();
        } else {
            this._showCampusSelector();
        }

        setTimeout(() => {
            this.loadingOverlay.style.opacity = '0';
            setTimeout(() => this.loadingOverlay.style.display = 'none', 500);
        }, 500);
    }

    runApp() {
        this._createNav();
        this._renderAllContent();
        this._updateCampusDisplay();
        this._setupIntersectionObserver();
        this._updateActiveState("主页", "home");
    }

    _createNav() {
        this.navMenu.innerHTML = '';
        for (const categoryKey in this.guideData) {
            const categoryData = this.guideData[categoryKey];
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'nav-category';

            if (categoryData.isHomePage) {
                const link = this._createNavLink(categoryKey, 'home', categoryData.icon, categoryKey, true);
                this.navMenu.appendChild(link);
                continue;
            }

            const categoryHeader = document.createElement('button');
            categoryHeader.className = 'category-header w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-blue-200 dark:text-gray-300 rounded-md hover:bg-blue-800 dark:hover:bg-gray-700 transition-colors';
            categoryHeader.innerHTML = `<span class="flex items-center"><i data-lucide="${categoryData.icon}" class="w-4 h-4 mr-3"></i>${categoryKey}</span><i data-lucide="chevron-down" class="accordion-icon w-4 h-4"></i>`;
            categoryDiv.appendChild(categoryHeader);

            const pageList = document.createElement('ul');
            pageList.className = 'submenu mt-1';
            for (const pageKey in categoryData.pages) {
                const page = categoryData.pages[pageKey];
                const listItem = document.createElement('li');
                const link = this._createNavLink(categoryKey, pageKey, null, page.title, false);
                listItem.appendChild(link);
                pageList.appendChild(listItem);
            }
            categoryDiv.appendChild(pageList);
            this.navMenu.appendChild(categoryDiv);
        }
        lucide.createIcons();
    }

    _createNavLink(categoryKey, pageKey, icon, text, isHeader) {
        const link = document.createElement('a');
        link.href = `#page-${categoryKey}-${pageKey}`;
        if (isHeader) {
            link.className = 'sidebar-link flex items-center px-4 py-3 text-base font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors mb-4';
            link.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 mr-3"></i> ${text}`;
        } else {
            link.className = 'sidebar-link block pl-11 pr-4 py-2.5 text-sm rounded-md hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors';
            link.textContent = text;
        }
        link.dataset.category = categoryKey;
        link.dataset.page = pageKey;
        return link;
    }

    _renderAllContent() {
        if (this.observer) this.observer.disconnect();
        this.contentArea.innerHTML = '';

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
                        contentHtml = this._generateCampusCards(items, 'dormitory');
                    } else if (pageKey === '食堂介绍') {
                        const items = this.campusData[this.selectedCampus]?.canteen?.items;
                        contentHtml = this._generateCampusCards(items, 'canteen');
                    }
                    section.innerHTML = contentHtml;
                } else if (page.type === 'faq') {
                    section.innerHTML = this._createFaqHtml(page.items);
                    this._addFaqListeners(section);
                } else if (page.type === 'clubs') {
                    section.innerHTML = this._createClubsHtml(page.data);
                    this._addClubTabListeners(section);
                } else if (page.type === 'campus-query-tool') {
                    section.innerHTML = this._createCampusQueryToolHtml();
                    this._initCampusQueryTool(section);
                } else {
                    section.innerHTML = page.content;
                }
                this.contentArea.appendChild(section);
            }
        }

        this._addHomeListeners();
        lucide.createIcons();
    }

    _generateCampusCards(items, type) {
        if (!items) return '<p class="text-gray-500 dark:text-gray-400">该校区暂无相关信息。</p>';
        const itemKeys = Object.keys(items);
        const cardHtml = itemKeys.map(key => {
            const item = items[key];
            return `
                 <a href="#" class="detail-card bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 group" data-type="${type}" data-key="${key}">
                     <div class="h-56 overflow-hidden">
                         <img src="../${item.image}" alt="[${item.name}的图片]" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300">
                     </div>
                     <div class="p-6">
                         <h4 class="font-bold text-xl text-gray-900 dark:text-gray-100">${item.name}</h4>
                         <p class="text-gray-600 dark:text-gray-400 text-sm mt-2">${item.summary}</p>
                     </div>
                 </a>
             `;
        }).join('');

        return `<div class="w-full max-w-6xl mx-auto">
                     <h3 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8 text-center">${type === 'dormitory' ? '宿舍概览' : '美食天地'}</h3>
                     <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                         ${cardHtml}
                     </div>
                 </div>`;
    }

    _createClubsHtml(data) {
        const allTabHtml = `
            <button class="tab-button px-4 py-3 text-base md:text-lg text-gray-600 dark:text-gray-400" data-level="all">
                <i data-lucide="layout-grid" class="inline-block w-5 h-5 mr-2 text-blue-500"></i>
                全部
            </button>
        `;

        const tabsHtml = data.clubs.map((group, index) => `
            <button class="tab-button px-4 py-3 text-base md:text-lg text-gray-600 dark:text-gray-400 ${index === 0 ? 'active' : ''}" data-level="${group.level}">
                <i data-lucide="${group.icon}" class="inline-block w-5 h-5 mr-2 ${group.color}"></i>
                ${group.label}
            </button>
        `).join('');

        let allClubsListHtml = '';
        data.clubs.forEach(group => {
            allClubsListHtml += group.list.map(clubName => `
                <div class="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-md flex items-center space-x-3 transform hover:scale-105 hover:shadow-xl transition-all duration-300">
                    <i data-lucide="${group.icon}" class="w-6 h-6 ${group.color} flex-shrink-0"></i>
                    <span class="text-gray-800 dark:text-gray-200 font-medium">${clubName}</span>
                </div>
            `).join('');
        });
        const allPaneHtml = `
            <div class="club-pane" data-level="all">
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    ${allClubsListHtml}
                </div>
            </div>
        `;

        const panesHtml = data.clubs.map((group, index) => {
            const clubListHtml = group.list.map(clubName => `
                <div class="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-md flex items-center space-x-3 transform hover:scale-105 hover:shadow-xl transition-all duration-300">
                    <i data-lucide="${group.icon}" class="w-6 h-6 ${group.color} flex-shrink-0"></i>
                    <span class="text-gray-800 dark:text-gray-200 font-medium">${clubName}</span>
                </div>
            `).join('');

            return `
                <div class="club-pane ${index === 0 ? 'active' : ''}" data-level="${group.level}">
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        ${clubListHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg w-full max-w-6xl mx-auto">
                <div class="w-full">
                    <h3 class="text-2xl font-bold text-rose-800 dark:text-rose-400 mb-6 border-l-4 border-rose-700 dark:border-rose-500 pl-4">学生社团</h3>
                    <p class="text-gray-700 dark:text-gray-300 mb-8">${data.introduction}</p>
                    
                    <div class="club-tabs border-b border-gray-200 dark:border-gray-700 mb-6 flex space-x-2 md:space-x-4 overflow-x-auto">
                        ${allTabHtml}${tabsHtml}
                    </div>
                    <div class="club-panes-container">
                        ${allPaneHtml}${panesHtml}
                    </div>
                </div>
                <div class="w-full mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <h3 class="text-2xl font-bold text-indigo-800 dark:text-indigo-400 mb-6 border-l-4 border-indigo-700 dark:border-indigo-500 pl-4">${data.organizations.title}</h3>
                    <p class="text-gray-700 dark:text-gray-300">${data.organizations.content}</p>
                </div>
            </div>
        `;
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
        this.navMenu.addEventListener('click', this._handleNavClick.bind(this));
        this.homeButtonTop.addEventListener('click', this._handleHomeClick.bind(this));
        this.menuToggle.addEventListener('click', this._toggleSidebar.bind(this));
        this.sidebarOverlay.addEventListener('click', this._toggleSidebar.bind(this));
        this.campusModal.addEventListener('click', this._handleCampusSelection.bind(this));
        this.changeCampusBtn.addEventListener('click', this._showCampusSelector.bind(this));
        this.contentArea.addEventListener('click', this._handleCardClick.bind(this));
        this.backToMainBtn.addEventListener('click', this._hideDetailView.bind(this));
        this.searchForm.addEventListener('submit', e => e.preventDefault());
        this.searchInput.addEventListener('input', this._handleLiveSearch.bind(this));
        document.addEventListener('click', this._handleGlobalClick.bind(this));
        this.liveSearchResultsContainer.addEventListener('click', this._handleSearchResultClick.bind(this));
        this.bottomNavHome.addEventListener('click', this._handleHomeClick.bind(this));
        this.bottomNavMenu.addEventListener('click', this._toggleSidebar.bind(this));
        this.bottomNavSearch.addEventListener('click', this._showMobileSearch.bind(this));
        this.bottomNavCampus.addEventListener('click', this._showCampusSelector.bind(this));
        this.closeMobileSearchBtn.addEventListener('click', this._hideMobileSearch.bind(this));
        this.mobileSearchInput.addEventListener('input', this._handleMobileLiveSearch.bind(this));
        this.mobileSearchResultsContainer.addEventListener('click', this._handleSearchResultClick.bind(this));
        this.themeToggleBtn.addEventListener('click', this._handleThemeToggle.bind(this));
        this.feedbackBtn.addEventListener('click', this._showFeedbackModal.bind(this));
        this.closeFeedbackBtn.addEventListener('click', this._hideFeedbackModal.bind(this));
        this.feedbackModal.addEventListener('click', (e) => {
            if (e.target === this.feedbackModal) this._hideFeedbackModal();
        });
        this.feedbackForm.addEventListener('submit', this._handleFeedbackSubmit.bind(this));
        this.loginPromptBtn.addEventListener('click', this._showAuthModal.bind(this));
        this.closeAuthBtn.addEventListener('click', this._hideAuthModal.bind(this));
        this.authModal.addEventListener('click', (e) => {
            if (e.target === this.authModal) this._hideAuthModal();
        });
        this.registerForm.addEventListener('submit', this._handleRegisterSubmit.bind(this));
        this.loginForm.addEventListener('submit', this._handleLoginSubmit.bind(this));
        this.resetPasswordForm.addEventListener('submit', this._handlePasswordResetSubmit.bind(this));
        this.forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('reset'); });
        this.goToRegisterLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('register'); });
        this.goToLoginFromRegisterLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('login'); });
        this.goToLoginFromResetLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('login'); });
        this.userProfileBtn.addEventListener('click', this._showProfileModal.bind(this));
        this.closeProfileBtn.addEventListener('click', this._hideProfileModal.bind(this));
        this.profileModal.addEventListener('click', (e) => {
            if (e.target === this.profileModal) this._hideProfileModal();
        });
        this.logoutButton.addEventListener('click', this._handleLogout.bind(this));
        this.editProfileBtn.addEventListener('click', () => this._handleProfileViewChange('edit'));
        this.cancelEditBtn.addEventListener('click', () => this._handleProfileViewChange('view'));
        this.saveProfileBtn.addEventListener('click', this._handleProfileSave.bind(this));
        this.avatarSelectionGrid.addEventListener('click', e => {
            const target = e.target.closest('.avatar-option');
            if (!target) return;
            this.avatarSelectionGrid.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
            target.classList.add('selected');
        });
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    _showCampusSelector() {
        this.campusModal.classList.remove('hidden');
        setTimeout(() => {
            this.campusModal.style.opacity = '1';
            this.campusDialog.style.transform = 'scale(1)';
            this.campusDialog.style.opacity = '1';
        }, 10);
    }

    _handleCampusSelection(e) {
        const button = e.target.closest('.campus-select-btn');
        if (!button) return;

        const campus = button.dataset.campus;
        localStorage.setItem('selectedCampus', campus);
        this.selectedCampus = campus;

        this.campusModal.style.opacity = '0';
        this.campusDialog.style.transform = 'scale(0.95)';
        this.campusDialog.style.opacity = '0';

        setTimeout(() => {
            this.campusModal.classList.add('hidden');
            this.runApp();
        }, 300);
    }

    _updateCampusDisplay() {
        if (this.selectedCampus && this.campusData[this.selectedCampus]) {
            this.currentCampusDisplay.textContent = `当前: ${this.campusData[this.selectedCampus].name}`;
        }
    }

    _setupIntersectionObserver() {
        const options = {
            root: this.contentArea,
            threshold: 0,
            rootMargin: `-${document.querySelector('header').offsetHeight}px 0px -${this.contentArea.clientHeight - document.querySelector('header').offsetHeight - 1}px 0px`
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
                this.contentTitle.textContent = this.campusData[this.selectedCampus]?.[titleKey]?.title || pageData.title;
            } else {
                this.contentTitle.textContent = pageData.title;
            }
        }

        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.sidebar-link[data-category="${categoryKey}"][data-page="${pageKey}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            const submenu = activeLink.closest('.submenu');
            if (submenu && !submenu.classList.contains('open')) {
                document.querySelectorAll('.submenu.open').forEach(s => {
                    s.classList.remove('open');
                    s.previousElementSibling.classList.remove('open');
                });
                submenu.classList.add('open');
                submenu.previousElementSibling.classList.add('open');
            }
        }
        this.bottomNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if (categoryKey === '主页') {
            this.bottomNavHome.classList.add('active');
        }
    }

    _handleNavClick(e) {
        const link = e.target.closest('.sidebar-link');
        const header = e.target.closest('.category-header');
        if (link) {
            e.preventDefault();
            this._hideAllViews();
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                const { category, page } = link.dataset;
                this._updateActiveState(category, page);
                const targetElement = document.getElementById(href.substring(1));
                if (targetElement) this._scrollToElement(targetElement);
                if (window.innerWidth < 768) this._toggleSidebar();
            }
        } else if (header) {
            const submenu = header.nextElementSibling;
            header.classList.toggle('open');
            submenu.classList.toggle('open');
        }
    }

    _handleHomeClick(e) {
        e.preventDefault();
        this._hideAllViews();
        const homeElement = document.getElementById('page-主页-home');
        if (homeElement) {
            this._updateActiveState("主页", "home");
            this._scrollToElement(homeElement);
        }
    }

    _toggleSidebar() {
        const isHidden = this.sidebar.classList.contains('-translate-x-full');
        this.sidebar.classList.toggle('-translate-x-full');
        this.sidebarOverlay.classList.toggle('hidden', !isHidden);
        this.bottomNavMenu.classList.toggle('active', !isHidden);
    }

    _scrollToElement(targetElement, keyword = null) {
        this.isScrollingProgrammatically = true;
        const topOffset = document.querySelector('header').offsetHeight;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + this.contentArea.scrollTop - topOffset;

        this.contentArea.scrollTo({ top: offsetPosition, behavior: 'smooth' });

        if (keyword) {
            setTimeout(() => this._highlightKeywordInSection(targetElement, keyword), 500);
        }

        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => { this.isScrollingProgrammatically = false; }, 1000);
    }

    _createFaqHtml(items) {
        let html = '<div class="space-y-4 w-full max-w-4xl mx-auto">';
        items.forEach((item) => {
            html += `<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"><div class="accordion-header w-full p-5 text-left font-semibold text-gray-800 dark:text-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"><span class="text-lg">${item.q}</span><i data-lucide="chevron-down" class="accordion-icon transition-transform duration-300 w-5 h-5"></i></div><div class="accordion-content bg-gray-50 dark:bg-gray-700/50 p-5 border-t border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300" style="display: none;"><p>${item.a}</p></div></div>`;
        });
        html += '</div>';
        return html;
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
        this.contentArea.querySelectorAll('.nav-card').forEach(card => {
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

    _hideAllViews() {
        this._hideDetailView();
        this._hideMobileSearch();
    }

    _handleCardClick(e) {
        const card = e.target.closest('.detail-card');
        if (!card) return;
        e.preventDefault();

        const { type, key } = card.dataset;
        this._showDetailView(type, key);
    }

    _generateSliderHtml(images) {
        if (!images || images.length === 0) {
            return `<img src="https://placehold.co/800x450/cccccc/ffffff?text=无图片" alt="[无图片]" class="w-full h-auto object-cover rounded-lg mb-4">`;
        }

        const slidesHtml = images.map((img, index) => `
            <div class="slider-slide" data-index="${index}">
                <img src="../${img.src}" alt="${img.caption}" onerror="this.onerror=null;this.src='https://placehold.co/800x450/fecaca/991b1b?text=图片加载失败';">
            </div>
        `).join('');

        const dotsHtml = images.map((_, index) => `
            <button class="dot" data-index="${index}"></button>
        `).join('');

        return `
            <div class="image-slider relative overflow-hidden rounded-lg shadow-md mb-4">
                <div class="slider-wrapper flex">
                    ${slidesHtml}
                </div>
                
                ${images.length > 1 ? `
                <button class="slider-nav prev absolute top-1/2 -translate-y-1/2 left-3 z-10">
                    <i data-lucide="chevron-left" class="w-6 h-6"></i>
                </button>
                <button class="slider-nav next absolute top-1/2 -translate-y-1/2 right-3 z-10">
                    <i data-lucide="chevron-right" class="w-6 h-6"></i>
                </button>
                
                <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-10">
                    <p class="slider-caption text-white text-center text-sm font-semibold truncate"></p>
                    <div class="slider-dots flex justify-center space-x-2 mt-2">
                        ${dotsHtml}
                    </div>
                </div>
                ` : `
                <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-10">
                   <p class="text-white text-center text-sm font-semibold truncate">${images[0].caption}</p>
                </div>
                `}
            </div>
        `;
    }

    _generateDormitoryDetailsHtml(details) {
        return details.map(dorm => {
            const sliderHtml = this._generateSliderHtml(dorm.images);
            return `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6 shadow-md border border-gray-200 dark:border-gray-700">
                <h4 class="font-bold text-xl text-blue-800 dark:text-blue-400 mb-4">${dorm.building}</h4>
                ${sliderHtml}
                <ul class="space-y-3 text-gray-700 dark:text-gray-300 mt-4">
                    <li class="flex items-center"><i data-lucide="users" class="w-5 h-5 mr-3 text-blue-500"></i><strong>房型：</strong> ${dorm.roomType}</li>
                    <li class="flex items-center"><i data-lucide="layout-grid" class="w-5 h-5 mr-3 text-blue-500"></i><strong>布局：</strong> ${dorm.layout}</li>
                    <li class="flex items-center"><i data-lucide="wallet" class="w-5 h-5 mr-3 text-blue-500"></i><strong>费用：</strong> ${dorm.price}</li>
                    <li class="flex items-center"><i data-lucide="shower-head" class="w-5 h-5 mr-3 text-blue-500"></i><strong>卫浴：</strong> ${dorm.bathroom}</li>
                    <li class="flex items-center"><i data-lucide="heater" class="w-5 h-5 mr-3 text-blue-500"></i><strong>热水：</strong> ${dorm.waterHeater}</li>
                    <li class="flex items-center"><i data-lucide="air-vent" class="w-5 h-5 mr-3 text-blue-500"></i><strong>空调：</strong> ${dorm.ac}</li>
                    <li class="flex items-center"><i data-lucide="sun" class="w-5 h-5 mr-3 text-blue-500"></i><strong>阳台：</strong> ${dorm.balcony}</li>
                    <li class="flex items-center"><i data-lucide="wifi" class="w-5 h-5 mr-3 text-blue-500"></i><strong>网络：</strong> ${dorm.network}</li>
                    <li class="flex items-center"><i data-lucide="washing-machine" class="w-5 h-5 mr-3 text-blue-500"></i><strong>洗衣：</strong> ${dorm.laundry}</li>
                    ${dorm.notes ? `<li class="flex items-start"><i data-lucide="info" class="w-5 h-5 mr-3 mt-1 text-blue-500 flex-shrink-0"></i><div><strong>备注：</strong> ${dorm.notes}</div></li>` : ''}
                </ul>
            </div>
        `}).join('');
    }

    _generateCanteenDetailsHtml(details) {
        return details.map(canteen => {
            const sliderHtml = this._generateSliderHtml(canteen.images);
            return `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6 shadow-md border border-gray-200 dark:border-gray-700">
                <h4 class="font-bold text-xl text-green-800 dark:text-green-400 mb-4">${canteen.area}</h4>
                ${sliderHtml}
                <ul class="space-y-3 text-gray-700 dark:text-gray-300 mt-4">
                    <li class="flex items-start"><i data-lucide="sparkles" class="w-5 h-5 mr-3 mt-1 text-green-500 flex-shrink-0"></i><div><strong>特色菜品：</strong> ${canteen.specialty.join('、 ')}</div></li>
                    <li class="flex items-center"><i data-lucide="wallet" class="w-5 h-5 mr-3 text-green-500"></i><strong>价格范围：</strong> ${canteen.priceRange}</li>
                    <li class="flex items-center"><i data-lucide="clock" class="w-5 h-5 mr-3 text-green-500"></i><strong>营业时间：</strong> ${canteen.openingHours}</li>
                    ${canteen.notes ? `<li class="flex items-start"><i data-lucide="info" class="w-5 h-5 mr-3 mt-1 text-green-500 flex-shrink-0"></i><div><strong>备注：</strong> ${canteen.notes}</div></li>` : ''}
                </ul>
            </div>
        `}).join('');
    }

    _showDetailView(type, itemKey) {
        const itemData = this.campusData[this.selectedCampus]?.[type]?.items?.[itemKey];
        if (!itemData) return;

        this.detailTitle.textContent = itemData.name;

        let detailsHtml = '';
        if (Array.isArray(itemData.details)) {
            if (type === 'dormitory') {
                detailsHtml = this._generateDormitoryDetailsHtml(itemData.details);
            } else if (type === 'canteen') {
                detailsHtml = this._generateCanteenDetailsHtml(itemData.details);
            }
        } else {
            detailsHtml = `<div class="prose dark:prose-invert max-w-none">${itemData.details}</div>`;
        }

        this.detailContent.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <img src="../${itemData.image}" alt="[${itemData.name}的图片]" class="w-full h-auto max-h-[450px] object-cover rounded-xl shadow-lg mb-8">
                <div class="bg-gray-100 dark:bg-gray-800/50 p-4 sm:p-8 rounded-xl">
                    <h3 class="text-2xl font-bold mb-6 border-b pb-4 dark:border-gray-700 text-gray-800 dark:text-gray-100">详细情况概览</h3>
                    ${detailsHtml}
                </div>
            </div>
        `;

        this.mainView.classList.add('hidden');
        this.detailView.classList.remove('hidden', 'translate-x-full');
        this.detailView.classList.add('flex');
        setTimeout(() => {
            this.detailView.classList.remove('translate-x-full');
        }, 10);
        lucide.createIcons();
        this._initAllSliders(this.detailContent);
    }

    _initAllSliders(container) {
        const sliders = container.querySelectorAll('.image-slider');
        sliders.forEach(slider => {
            const wrapper = slider.querySelector('.slider-wrapper');
            const slides = slider.querySelectorAll('.slider-slide');
            const prevBtn = slider.querySelector('.slider-nav.prev');
            const nextBtn = slider.querySelector('.slider-nav.next');
            const captionEl = slider.querySelector('.slider-caption');
            const dotsContainer = slider.querySelector('.slider-dots');

            if (slides.length <= 1) return;

            const imagesData = this.campusData[this.selectedCampus];
            let currentIndex = 0;
            const totalSlides = slides.length;

            const goToSlide = (index) => {
                currentIndex = (index + totalSlides) % totalSlides;
                wrapper.style.transform = `translateX(-${currentIndex * 100}%)`;

                const slideElement = slides[currentIndex];
                const imgElement = slideElement.querySelector('img');
                captionEl.textContent = imgElement.alt;

                dotsContainer.querySelectorAll('.dot').forEach((dot, dotIndex) => {
                    dot.classList.toggle('active', dotIndex === currentIndex);
                });
            };

            prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
            nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));

            dotsContainer.querySelectorAll('.dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    goToSlide(parseInt(e.target.dataset.index));
                });
            });

            goToSlide(0);
        });
    }

    _hideDetailView() {
        if (!this.detailView.classList.contains('hidden')) {
            this.detailView.classList.add('translate-x-full');
            setTimeout(() => {
                this.detailView.classList.add('hidden');
                this.detailView.classList.remove('flex');
                this.mainView.classList.remove('hidden');
            }, 300);
        }
    }

    _handleLiveSearch(e) {
        const query = e.target.value.trim();
        if (query.length > 0) {
            const results = this._performSearch(query);
            this._displayLiveSearchResults(results, query, this.liveSearchResultsContainer);
        } else {
            this._hideLiveSearchResults();
        }
    }

    _handleMobileLiveSearch(e) {
        const query = e.target.value.trim();
        if (query.length > 0) {
            const results = this._performSearch(query);
            this._displayLiveSearchResults(results, query, this.mobileSearchResultsContainer);
        } else {
            this.mobileSearchResultsContainer.innerHTML = '';
        }
    }

    _displayLiveSearchResults(results, query, container) {
        if (results.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 p-4">未能找到与“${this._escapeHtml(query)}”相关的内容。</p>`;
        } else {
            container.innerHTML = results.map(result => {
                const snippet = this._createSnippet(result.text, query);
                const highlightedSnippet = snippet.replace(new RegExp(this._escapeRegExp(query), 'gi'), (match) => `<mark class="search-highlight">${this._escapeHtml(match)}</mark>`);

                const dataAttrs = result.isDetail
                    ? `data-is-detail="true" data-detail-type="${result.detailType}" data-detail-key="${result.detailKey}"`
                    : `data-category-key="${result.categoryKey}" data-page-key="${result.pageKey}"`;

                return `
                    <a href="#" class="search-result-item block p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0" ${dataAttrs} data-keyword="${this._escapeHtml(query)}">
                        <h4 class="font-semibold text-base text-blue-700 dark:text-blue-400 truncate">${this._escapeHtml(result.title)}</h4>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">...${highlightedSnippet}...</p>
                    </a>
                `;
            }).join('');
        }
        if (container === this.liveSearchResultsContainer) {
            container.classList.remove('hidden');
        }
    }

    _hideLiveSearchResults() {
        this.liveSearchResultsContainer.classList.add('hidden');
    }

    _handleGlobalClick(e) {
        if (!this.searchForm.contains(e.target)) {
            this._hideLiveSearchResults();
        }
    }

    _performSearch(query) {
        const results = [];
        const tempDiv = document.createElement('div');
        const queryLower = query.toLowerCase();

        for (const categoryKey in this.guideData) {
            for (const pageKey in this.guideData[categoryKey].pages) {
                const page = this.guideData[categoryKey].pages[pageKey];

                let searchableText = page.title;

                if (page.type === 'clubs') {
                    const clubData = page.data;
                    searchableText += ' ' + clubData.introduction;
                    clubData.clubs.forEach(group => {
                        searchableText += ' ' + group.list.join(' ');
                    });
                    searchableText += ' ' + clubData.organizations.title + ' ' + clubData.organizations.content;
                } else if (page.content) {
                    tempDiv.innerHTML = page.content;
                    searchableText += ' ' + tempDiv.textContent;
                } else if (page.type === 'faq') {
                    page.items.forEach(item => {
                        searchableText += ' ' + item.q + ' ' + item.a;
                    });
                }

                if (searchableText.toLowerCase().includes(queryLower)) {
                    results.push({
                        title: page.title,
                        text: searchableText,
                        categoryKey,
                        pageKey
                    });
                }
            }
        }

        const campus = this.campusData[this.selectedCampus];
        if (campus) {
            ['dormitory', 'canteen'].forEach(type => {
                if (campus[type] && campus[type].items) {
                    for (const itemKey in campus[type].items) {
                        const item = campus[type].items[itemKey];
                        let searchableText = `${item.name} ${item.summary}`;
                        if (Array.isArray(item.details)) {
                            searchableText += item.details.map(d => Object.values(d).join(' ')).join(' ');
                        } else if (typeof item.details === 'string') {
                            tempDiv.innerHTML = item.details;
                            searchableText += ' ' + tempDiv.textContent;
                        }

                        if (searchableText.toLowerCase().includes(queryLower)) {
                            results.push({
                                title: item.name,
                                text: searchableText,
                                isDetail: true,
                                detailType: type,
                                detailKey: itemKey
                            });
                        }
                    }
                }
            });
        }

        return results;
    }

    _handleSearchResultClick(e) {
        const item = e.target.closest('.search-result-item');
        if (!item) return;
        e.preventDefault();

        this._hideLiveSearchResults();
        this._hideMobileSearch();
        this.searchInput.value = '';
        this.mobileSearchInput.value = '';

        const { isDetail, detailType, detailKey, categoryKey, pageKey, keyword } = item.dataset;

        if (isDetail === 'true') {
            this._showDetailView(detailType, detailKey);
            setTimeout(() => this._highlightKeywordInSection(this.detailContent, keyword), 500);
        } else {
            const targetElement = document.getElementById(`page-${categoryKey}-${pageKey}`);
            if (targetElement) {
                this._updateActiveState(categoryKey, pageKey);
                this._scrollToElement(targetElement, keyword);
            }
        }
    }

    _createSnippet(text, query) {
        const index = text.toLowerCase().indexOf(query.toLowerCase());
        if (index === -1) return this._escapeHtml(text.substring(0, 100));

        const start = Math.max(0, index - 30);
        const end = Math.min(text.length, index + query.length + 70);
        return this._escapeHtml(text.substring(start, end));
    }

    _highlightKeywordInSection(sectionElement, keyword) {
        const regex = new RegExp(this._escapeRegExp(keyword), 'gi');
        const walker = document.createTreeWalker(sectionElement, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const nodesToReplace = [];

        while (node = walker.nextNode()) {
            if (node.textContent.toLowerCase().includes(keyword.toLowerCase())) {
                nodesToReplace.push(node);
            }
        }

        nodesToReplace.forEach(textNode => {
            const parent = textNode.parentNode;
            if (!parent || parent.nodeName === 'MARK' || parent.nodeName === 'SCRIPT' || parent.nodeName === 'STYLE') return;

            const parts = textNode.textContent.split(regex);
            const matches = textNode.textContent.match(regex);

            if (!matches) return;

            const fragment = document.createDocumentFragment();
            parts.forEach((part, index) => {
                fragment.appendChild(document.createTextNode(part));
                if (index < matches.length) {
                    const mark = document.createElement('mark');
                    mark.className = 'temp-highlight';
                    mark.textContent = matches[index];
                    fragment.appendChild(mark);
                }
            });
            parent.replaceChild(fragment, textNode);
        });
    }

    _showMobileSearch() {
        this.mobileSearchOverlay.classList.remove('hidden');
        setTimeout(() => {
            this.mobileSearchOverlay.classList.remove('translate-y-full');
            this.mobileSearchInput.focus();
        }, 10);
    }

    _hideMobileSearch() {
        this.mobileSearchOverlay.classList.add('translate-y-full');
        setTimeout(() => {
            this.mobileSearchOverlay.classList.add('hidden');
            this.mobileSearchInput.value = '';
            this.mobileSearchResultsContainer.innerHTML = '';
        }, 300);
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    _escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    _showFeedbackModal() {
        this.feedbackModal.classList.remove('hidden');
        setTimeout(() => {
            this.feedbackModal.style.opacity = '1';
            this.feedbackDialog.style.transform = 'scale(1)';
            this.feedbackDialog.style.opacity = '1';
        }, 10);
    }

    _hideFeedbackModal() {
        this.feedbackModal.style.opacity = '0';
        this.feedbackDialog.style.transform = 'scale(0.95)';
        this.feedbackDialog.style.opacity = '0';
        setTimeout(() => {
            this.feedbackModal.classList.add('hidden');
            this.feedbackForm.classList.remove('hidden');
            this.feedbackSuccessMsg.classList.add('hidden');
            this.feedbackForm.reset();
        }, 300);
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
                this.feedbackForm.classList.add('hidden');
                this.feedbackSuccessMsg.classList.remove('hidden');
                setTimeout(() => {
                    this._hideFeedbackModal();
                }, 2000);
            })
            .catch((error) => {
                console.error(error);
                const submitButton = form.querySelector('button[type="submit"]');
                submitButton.textContent = '提交失败!';
                submitButton.classList.add('bg-red-600');
            });
    }

    _showAuthModal() {
        this._handleAuthViewChange('login');
        this.authModal.classList.remove('hidden');
        setTimeout(() => {
            this.authModal.style.opacity = '1';
            this.authDialog.style.transform = 'scale(1)';
            this.authDialog.style.opacity = '1';
        }, 10);
    }

    _hideAuthModal() {
        this.authModal.style.opacity = '0';
        this.authDialog.style.transform = 'scale(0.95)';
        this.authDialog.style.opacity = '0';
        setTimeout(() => {
            this.authModal.classList.add('hidden');
        }, 300);
    }

    _handleAuthViewChange(viewName) {
        this.loginFormContainer.classList.add('hidden');
        this.registerFormContainer.classList.add('hidden');
        this.resetPasswordFormContainer.classList.add('hidden');

        if (viewName === 'login') {
            this.authTitle.textContent = "欢迎回来";
            this.loginFormContainer.classList.remove('hidden');
        } else if (viewName === 'register') {
            this.authTitle.textContent = "加入我们";
            this.registerFormContainer.classList.remove('hidden');
        } else if (viewName === 'reset') {
            this.authTitle.textContent = "重置密码";
            this.resetPasswordFormContainer.classList.remove('hidden');
        }
    }

    async _handleRegisterSubmit(e) {
        e.preventDefault();
        const emailPrefix = this.registerForm.email_prefix.value;
        const password = this.registerForm.password.value;

        if (!emailPrefix) {
            this._showToast("请输入你的学号！", "error");
            return;
        }
        const email = emailPrefix + '@jou.edu.cn';

        if (password.length < 8) {
            this._showToast("密码长度不能少于8位！", "error");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const newUserDoc = {
                email: user.email,
                nickname: "萌新" + emailPrefix.slice(-4),
                bio: "这位同学很酷，什么都还没留下~",
                avatarId: AVATARS[Math.floor(Math.random() * AVATARS.length)],
                major: "",
                enrollmentYear: new Date().getFullYear(),
                joinDate: Timestamp.fromDate(new Date())
            };
            await setDoc(doc(db, "users", user.uid), newUserDoc);

            await sendEmailVerification(user);
            this._showToast("注册成功！验证邮件已发送，请查收。", "success");
            this._hideAuthModal();

        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                this._showToast("该邮箱已被注册！", "error");
            } else {
                this._showToast("注册失败：" + error.message, "error");
            }
        }
    }

    async _handleLoginSubmit(e) {
        e.preventDefault();
        const emailPrefix = this.loginForm.email_prefix.value;
        const password = this.loginForm.password.value;

        if (!emailPrefix) {
            this._showToast("请输入你的学号！", "error");
            return;
        }
        const email = emailPrefix + '@jou.edu.cn';

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (user.emailVerified) {
                this._showToast("登录成功！", "success");
                this._hideAuthModal();
            } else {
                this._showToast("请先前往邮箱完成验证再登录。", "info");
                await signOut(auth);
            }
        } catch (error) {
            this._showToast("登录失败：学号或密码错误。", "error");
        }
    }

    async _handlePasswordResetSubmit(e) {
        e.preventDefault();
        const emailPrefix = this.resetPasswordForm.email_prefix.value;
        if (!emailPrefix) {
            this._showToast("请输入你的学号！", "error");
            return;
        }
        const email = emailPrefix + '@jou.edu.cn';

        try {
            await sendPasswordResetEmail(auth, email);
            this._showToast("密码重置邮件已发送，请查收。", "success");
            this._handleAuthViewChange('login');
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                this._showToast("发送失败：该邮箱尚未注册。", "error");
            } else {
                this._showToast("发送失败：" + error.message, "error");
            }
        }
    }

    async _handleLogout() {
        try {
            await signOut(auth);
            this._hideProfileModal();
            this._showToast("已成功退出登录。", "info");
        } catch (error) {
            this._showToast("退出失败：" + error.message, "error");
        }
    }

    _listenForAuthStateChanges() {
        onAuthStateChanged(auth, (user) => {
            if (this.unsubscribeUserDoc) {
                this.unsubscribeUserDoc();
                this.unsubscribeUserDoc = null;
            }

            if (user && user.emailVerified) {
                this.loginPromptBtn.classList.add('hidden');
                this.userProfileBtn.classList.remove('hidden');

                const userDocRef = doc(db, "users", user.uid);
                this.unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        this.currentUserData = docSnap.data();
                        this._updateUIWithUserData();
                    } else {
                        console.log("No such user document!");
                    }
                }, (error) => {
                    console.error("Error listening to user doc:", error);
                });

            } else {
                this.currentUserData = null;
                this.loginPromptBtn.classList.remove('hidden');
                this.userProfileBtn.classList.add('hidden');
            }
        });
    }

    _updateUIWithUserData() {
        if (!this.currentUserData) return;

        const avatarUrl = getAvatarUrl(this.currentUserData.avatarId);
        this.sidebarAvatar.src = avatarUrl;
        this.sidebarNickname.textContent = this.currentUserData.nickname || '未设置昵称';

        this.profileAvatarLarge.src = avatarUrl;
        this.profileNickname.textContent = this.currentUserData.nickname || '未设置昵称';
        this.profileEmail.textContent = this.currentUserData.email || '';
        this.profileMajorYear.textContent = `${this.currentUserData.enrollmentYear || '未知年份'}级 ${this.currentUserData.major || '未设置专业'}`;
        this.profileBio.textContent = this.currentUserData.bio || '这位同学很酷，什么都还没留下~';

    }

    _showProfileModal() {
        this._handleProfileViewChange('view');
        this.profileModal.classList.remove('hidden');
        setTimeout(() => {
            this.profileModal.style.opacity = '1';
            this.profileDialog.style.transform = 'scale(1)';
            this.profileDialog.style.opacity = '1';
        }, 10);
    }

    _hideProfileModal() {
        this.profileModal.style.opacity = '0';
        this.profileDialog.style.transform = 'scale(0.95)';
        this.profileDialog.style.opacity = '0';
        setTimeout(() => {
            this.profileModal.classList.add('hidden');
        }, 300);
    }

    _handleProfileViewChange(viewName) {
        this.profileDialog.querySelectorAll('.profile-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewName);
        });

        this.profileViewContainer.classList.add('hidden');
        this.profileEditContainer.classList.add('hidden');

        if (viewName === 'view') {
            this.profileViewContainer.classList.remove('hidden');
        } else if (viewName === 'edit') {
            this._populateProfileEditForm();
            this.profileEditContainer.classList.remove('hidden');
        }
    }

    _populateProfileEditForm() {
        if (!this.currentUserData) return;

        this.avatarSelectionGrid.innerHTML = AVATARS.map(id => `
    <img src="${getAvatarUrl(id)}" data-avatar-id="${id}" class="avatar-option w-12 h-12" alt="[头像${id}]">
`).join('');

        const currentAvatar = this.avatarSelectionGrid.querySelector(`[data-avatar-id="${this.currentUserData.avatarId}"]`);
        if (currentAvatar) {
            currentAvatar.classList.add('selected');
        }

        this.editNickname.value = this.currentUserData.nickname || '';
        this.editBio.value = this.currentUserData.bio || '';
        this.editEnrollmentYear.value = this.currentUserData.enrollmentYear || new Date().getFullYear();
        this.editMajor.value = this.currentUserData.major || '';
    }

    _populateProfileEditDropdowns() {
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i >= currentYear - 5; i--) {
            const option = new Option(i + '级', i);
            this.editEnrollmentYear.add(option);
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
            this.editMajor.add(option);
        });
    }

    async _handleProfileSave(e) {
        e.preventDefault();
        if (!auth.currentUser) return;

        this.saveProfileBtn.disabled = true;
        this.saveProfileBtn.innerHTML = `<span class="loader-small"></span> 保存中...`;

        const selectedAvatar = this.avatarSelectionGrid.querySelector('.selected');
        const updatedData = {
            nickname: this.editNickname.value.trim(),
            bio: this.editBio.value.trim(),
            avatarId: selectedAvatar ? selectedAvatar.dataset.avatarId : this.currentUserData.avatarId,
            enrollmentYear: parseInt(this.editEnrollmentYear.value),
            major: this.editMajor.value
        };

        try {
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userDocRef, updatedData);
            this._showToast("资料更新成功！", "success");
            this._handleProfileViewChange('view');
        } catch (error) {
            console.error("Error updating profile:", error);
            this._showToast("资料更新失败，请稍后再试。", "error");
        } finally {
            this.saveProfileBtn.disabled = false;
            this.saveProfileBtn.innerHTML = `保存更改`;
        }
    }

    _createCampusQueryToolHtml() {
        return `
            <div class="campus-query-tool-container w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mx-auto" style="font-family: 'Inter', sans-serif;">
                <div class="text-center mb-8">
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">大一新生校区查询</h1>
                    <p class="text-gray-500 dark:text-gray-400 mt-2">请选择你的学院和专业，查询你所在的校区。</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label for="college-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择学院</label>
                        <select id="college-select" class="custom-select w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                            <option value="">-- 请选择 --</option>
                        </select>
                    </div>
                    <div>
                        <label for="major-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择专业</label>
                        <select id="major-select" class="custom-select w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200" disabled>
                            <option value="">-- 请先选择学院 --</option>
                        </select>
                    </div>
                </div>
                <div id="result-display" class="bg-gray-100 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-center min-h-[150px] flex items-center justify-center transition-all duration-300 ease-in-out">
                    <p class="text-gray-500 dark:text-gray-400">查询结果将在此处显示</p>
                </div>
            </div>
        `;
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
