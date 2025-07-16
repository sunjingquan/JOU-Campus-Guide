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
import * as authUI from './ui/auth.js'; // 导入新的认证模块

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
        
        // 将需要的DOM元素传递给认证模块
        authUI.cacheAuthDOMElements(this.dom);
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
        
        // 使用认证模块来监听状态
        authUI.listenForAuthStateChanges((userData) => {
            this.currentUserData = userData;
        });

        this._populateProfileEditDropdowns();
        this.selectedCampus = localStorage.getItem('selectedCampus');

        if (this.selectedCampus) {
            this.runApp();
        } else {
            this._showCampusSelector();
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
            this._hideAllViews();
            this._updateActiveState(category, page);
            const targetElement = document.getElementById(`page-${category}-${page}`);
            if (targetElement) this._scrollToElement(targetElement);
            if (window.innerWidth < 768) this._toggleSidebar();
        }));

        this.dom.homeButtonTop.addEventListener('click', this._handleHomeClick.bind(this));
        this.dom.menuToggle.addEventListener('click', this._toggleSidebar.bind(this));
        this.dom.sidebarOverlay.addEventListener('click', this._toggleSidebar.bind(this));
        this.dom.campusModal.addEventListener('click', this._handleCampusSelection.bind(this));
        this.dom.changeCampusBtn.addEventListener('click', this._showCampusSelector.bind(this));
        this.dom.contentArea.addEventListener('click', this._handleCardClick.bind(this));
        this.dom.backToMainBtn.addEventListener('click', this._hideDetailView.bind(this));
        this.dom.searchForm.addEventListener('submit', e => e.preventDefault());
        this.dom.searchInput.addEventListener('input', this._handleLiveSearch.bind(this));
        document.addEventListener('click', this._handleGlobalClick.bind(this));
        this.dom.liveSearchResultsContainer.addEventListener('click', this._handleSearchResultClick.bind(this));
        this.dom.bottomNavHome.addEventListener('click', this._handleHomeClick.bind(this));
        this.dom.bottomNavMenu.addEventListener('click', this._toggleSidebar.bind(this));
        this.dom.bottomNavSearch.addEventListener('click', this._showMobileSearch.bind(this));
        this.dom.bottomNavCampus.addEventListener('click', this._showCampusSelector.bind(this));
        this.dom.closeMobileSearchBtn.addEventListener('click', this._hideMobileSearch.bind(this));
        this.dom.mobileSearchInput.addEventListener('input', this._handleMobileLiveSearch.bind(this));
        this.dom.mobileSearchResultsContainer.addEventListener('click', this._handleSearchResultClick.bind(this));
        this.dom.themeToggleBtn.addEventListener('click', this._handleThemeToggle.bind(this));
        this.dom.feedbackBtn.addEventListener('click', this._showFeedbackModal.bind(this));
        this.dom.closeFeedbackBtn.addEventListener('click', this._hideFeedbackModal.bind(this));
        this.dom.feedbackModal.addEventListener('click', (e) => {
            if (e.target === this.dom.feedbackModal) this._hideFeedbackModal();
        });
        this.dom.feedbackForm.addEventListener('submit', this._handleFeedbackSubmit.bind(this));
        
        // 认证相关的事件监听
        this.dom.loginPromptBtn.addEventListener('click', this._showAuthModal.bind(this));
        this.dom.closeAuthBtn.addEventListener('click', this._hideAuthModal.bind(this));
        this.dom.authModal.addEventListener('click', (e) => {
            if (e.target === this.dom.authModal) this._hideAuthModal();
        });
        this.dom.registerForm.addEventListener('submit', (e) => authUI.handleRegisterSubmit(e, this._showToast, this._hideAuthModal.bind(this)));
        this.dom.loginForm.addEventListener('submit', (e) => authUI.handleLoginSubmit(e, this._showToast, this._hideAuthModal.bind(this)));
        this.dom.resetPasswordForm.addEventListener('submit', (e) => authUI.handlePasswordResetSubmit(e, this._showToast, this._handleAuthViewChange.bind(this)));
        this.dom.forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('reset'); });
        this.dom.goToRegisterLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('register'); });
        this.dom.goToLoginFromRegisterLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('login'); });
        this.dom.goToLoginFromResetLink.addEventListener('click', (e) => { e.preventDefault(); this._handleAuthViewChange('login'); });
        
        // 用户中心相关的事件监听
        this.dom.userProfileBtn.addEventListener('click', this._showProfileModal.bind(this));
        this.dom.closeProfileBtn.addEventListener('click', this._hideProfileModal.bind(this));
        this.dom.profileModal.addEventListener('click', (e) => {
            if (e.target === this.dom.profileModal) this._hideProfileModal();
        });
        this.dom.logoutButton.addEventListener('click', () => authUI.handleLogout(this._showToast, this._hideProfileModal.bind(this)));
        this.dom.editProfileBtn.addEventListener('click', () => this._handleProfileViewChange('edit'));
        this.dom.cancelEditBtn.addEventListener('click', () => this._handleProfileViewChange('view'));
        this.dom.saveProfileBtn.addEventListener('click', (e) => authUI.handleProfileSave(e, this.currentUserData, this._showToast, this._handleProfileViewChange.bind(this)));
        this.dom.avatarSelectionGrid.addEventListener('click', e => {
            const target = e.target.closest('.avatar-option');
            if (!target) return;
            this.dom.avatarSelectionGrid.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
            target.classList.add('selected');
        });

        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    _showCampusSelector() {
        this.dom.campusModal.classList.remove('hidden');
        setTimeout(() => {
            this.dom.campusModal.style.opacity = '1';
            this.dom.campusDialog.style.transform = 'scale(1)';
            this.dom.campusDialog.style.opacity = '1';
        }, 10);
    }

    _handleCampusSelection(e) {
        const button = e.target.closest('.campus-select-btn');
        if (!button) return;

        const campus = button.dataset.campus;
        localStorage.setItem('selectedCampus', campus);
        this.selectedCampus = campus;

        this.dom.campusModal.style.opacity = '0';
        this.dom.campusDialog.style.transform = 'scale(0.95)';
        this.dom.campusDialog.style.opacity = '0';

        setTimeout(() => {
            this.dom.campusModal.classList.add('hidden');
            this.runApp();
        }, 300);
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
        this._hideAllViews();
        const homeElement = document.getElementById('page-主页-home');
        if (homeElement) {
            this._updateActiveState("主页", "home");
            this._scrollToElement(homeElement);
        }
    }

    _toggleSidebar() {
        const isHidden = this.dom.sidebar.classList.contains('-translate-x-full');
        this.dom.sidebar.classList.toggle('-translate-x-full');
        this.dom.sidebarOverlay.classList.toggle('hidden', !isHidden);
        this.dom.bottomNavMenu.classList.toggle('active', !isHidden);
    }

    _scrollToElement(targetElement, keyword = null) {
        this.isScrollingProgrammatically = true;
        const topOffset = document.querySelector('header').offsetHeight;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + this.dom.contentArea.scrollTop - topOffset;

        this.dom.contentArea.scrollTo({ top: offsetPosition, behavior: 'smooth' });

        if (keyword) {
            setTimeout(() => this._highlightKeywordInSection(targetElement, keyword), 500);
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

    _showDetailView(type, itemKey) {
        const itemData = this.campusData[this.selectedCampus]?.[type]?.items?.[itemKey];
        if (!itemData) return;

        this.dom.detailTitle.textContent = itemData.name;

        let detailsHtml = '';
        if (Array.isArray(itemData.details)) {
            if (type === 'dormitory') {
                detailsHtml = renderer.generateDormitoryDetailsHtml(itemData.details);
            } else if (type === 'canteen') {
                detailsHtml = renderer.generateCanteenDetailsHtml(itemData.details);
            }
        } else {
            detailsHtml = `<div class="prose dark:prose-invert max-w-none">${itemData.details}</div>`;
        }

        this.dom.detailContent.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <img src="../${itemData.image}" alt="[${itemData.name}的图片]" class="w-full h-auto max-h-[450px] object-cover rounded-xl shadow-lg mb-8">
                <div class="bg-gray-100 dark:bg-gray-800/50 p-4 sm:p-8 rounded-xl">
                    <h3 class="text-2xl font-bold mb-6 border-b pb-4 dark:border-gray-700 text-gray-800 dark:text-gray-100">详细情况概览</h3>
                    ${detailsHtml}
                </div>
            </div>
        `;

        this.dom.mainView.classList.add('hidden');
        this.dom.detailView.classList.remove('hidden', 'translate-x-full');
        this.dom.detailView.classList.add('flex');
        setTimeout(() => {
            this.dom.detailView.classList.remove('translate-x-full');
        }, 10);
        lucide.createIcons();
        this._initAllSliders(this.dom.detailContent);
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
        if (!this.dom.detailView.classList.contains('hidden')) {
            this.dom.detailView.classList.add('translate-x-full');
            setTimeout(() => {
                this.dom.detailView.classList.add('hidden');
                this.dom.detailView.classList.remove('flex');
                this.dom.mainView.classList.remove('hidden');
            }, 300);
        }
    }

    _handleLiveSearch(e) {
        const query = e.target.value.trim();
        if (query.length > 0) {
            const results = this._performSearch(query);
            this._displayLiveSearchResults(results, query, this.dom.liveSearchResultsContainer);
        } else {
            this._hideLiveSearchResults();
        }
    }

    _handleMobileLiveSearch(e) {
        const query = e.target.value.trim();
        if (query.length > 0) {
            const results = this._performSearch(query);
            this._displayLiveSearchResults(results, query, this.dom.mobileSearchResultsContainer);
        } else {
            this.dom.mobileSearchResultsContainer.innerHTML = '';
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
        if (container === this.dom.liveSearchResultsContainer) {
            container.classList.remove('hidden');
        }
    }

    _hideLiveSearchResults() {
        this.dom.liveSearchResultsContainer.classList.add('hidden');
    }

    _handleGlobalClick(e) {
        if (!this.dom.searchForm.contains(e.target)) {
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
        this.dom.searchInput.value = '';
        this.dom.mobileSearchInput.value = '';

        const { isDetail, detailType, detailKey, categoryKey, pageKey, keyword } = item.dataset;

        if (isDetail === 'true') {
            this._showDetailView(detailType, detailKey);
            setTimeout(() => this._highlightKeywordInSection(this.dom.detailContent, keyword), 500);
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
        this.dom.mobileSearchOverlay.classList.remove('hidden');
        setTimeout(() => {
            this.dom.mobileSearchOverlay.classList.remove('translate-y-full');
            this.dom.mobileSearchInput.focus();
        }, 10);
    }

    _hideMobileSearch() {
        this.dom.mobileSearchOverlay.classList.add('translate-y-full');
        setTimeout(() => {
            this.dom.mobileSearchOverlay.classList.add('hidden');
            this.dom.mobileSearchInput.value = '';
            this.dom.mobileSearchResultsContainer.innerHTML = '';
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
        this.dom.feedbackModal.classList.remove('hidden');
        setTimeout(() => {
            this.dom.feedbackModal.style.opacity = '1';
            this.dom.feedbackDialog.style.transform = 'scale(1)';
            this.dom.feedbackDialog.style.opacity = '1';
        }, 10);
    }

    _hideFeedbackModal() {
        this.dom.feedbackModal.style.opacity = '0';
        this.dom.feedbackDialog.style.transform = 'scale(0.95)';
        this.dom.feedbackDialog.style.opacity = '0';
        setTimeout(() => {
            this.dom.feedbackModal.classList.add('hidden');
            this.dom.feedbackForm.classList.remove('hidden');
            this.dom.feedbackSuccessMsg.classList.add('hidden');
            this.dom.feedbackForm.reset();
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
                this.dom.feedbackForm.classList.add('hidden');
                this.dom.feedbackSuccessMsg.classList.remove('hidden');
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
        this.dom.authModal.classList.remove('hidden');
        setTimeout(() => {
            this.dom.authModal.style.opacity = '1';
            this.dom.authDialog.style.transform = 'scale(1)';
            this.dom.authDialog.style.opacity = '1';
        }, 10);
    }

    _hideAuthModal() {
        this.dom.authModal.style.opacity = '0';
        this.dom.authDialog.style.transform = 'scale(0.95)';
        this.dom.authDialog.style.opacity = '0';
        setTimeout(() => {
            this.dom.authModal.classList.add('hidden');
        }, 300);
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
    
    _showProfileModal() {
        this._handleProfileViewChange('view');
        this.dom.profileModal.classList.remove('hidden');
        setTimeout(() => {
            this.dom.profileModal.style.opacity = '1';
            this.dom.profileDialog.style.transform = 'scale(1)';
            this.dom.profileDialog.style.opacity = '1';
        }, 10);
    }

    _hideProfileModal() {
        this.dom.profileModal.style.opacity = '0';
        this.dom.profileDialog.style.transform = 'scale(0.95)';
        this.dom.profileDialog.style.opacity = '0';
        setTimeout(() => {
            this.dom.profileModal.classList.add('hidden');
        }, 300);
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
