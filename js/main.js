/**
 * @file 应用主入口 (Main Entry Point)
 * @description
 * 这是整个应用的启动脚本。它不再包含任何类。
 * 它的职责是：
 * 1. 导入所有功能模块。
 * 2. 缓存DOM元素。
 * 3. 初始化各个模块，并将它们连接起来。
 * 4. 定义模块之间交互所需的回调函数和核心应用逻辑。
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
import * as viewManager from './ui/viewManager.js';
import * as theme from './ui/theme.js';

// ===================================================================================
// --- DOM 元素缓存 ---
// ===================================================================================

const dom = {
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
    themeIconSun: document.getElementById('theme-icon-sun'),
    themeIconMoon: document.getElementById('theme-icon-moon'),
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

// ===================================================================================
// --- 应用状态与核心逻辑 ---
// ===================================================================================

let appState = {
    selectedCampus: null,
    currentUserData: null,
    observer: null,
    isScrollingProgrammatically: false,
    scrollTimeout: null,
};

/**
 * 渲染所有内容到主内容区。
 */
function renderAllContent() {
    if (appState.observer) appState.observer.disconnect();
    dom.contentArea.innerHTML = '';

    for (const categoryKey in guideData) {
        const categoryData = guideData[categoryKey];
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
                    const items = campusData[appState.selectedCampus]?.dormitory?.items;
                    contentHtml = renderer.generateCampusCards(items, 'dormitory');
                } else if (pageKey === '食堂介绍') {
                    const items = campusData[appState.selectedCampus]?.canteen?.items;
                    contentHtml = renderer.generateCampusCards(items, 'canteen');
                }
                section.innerHTML = contentHtml;
            } else if (page.type === 'faq') {
                section.innerHTML = renderer.createFaqHtml(page.items);
                addFaqListeners(section);
            } else if (page.type === 'clubs') {
                section.innerHTML = renderer.createClubsHtml(page.data);
                addClubTabListeners(section);
            } else if (page.type === 'campus-query-tool') {
                section.innerHTML = renderer.createCampusQueryToolHtml();
                initCampusQueryTool(section);
            } else {
                section.innerHTML = page.content;
            }
            dom.contentArea.appendChild(section);
        }
    }

    addHomeListeners();
    lucide.createIcons();
    setupIntersectionObserver();
}

/**
 * 设置滚动监听，以实现导航栏的自动高亮。
 */
function setupIntersectionObserver() {
    const options = {
        root: dom.contentArea,
        threshold: 0,
        rootMargin: `-${dom.contentTitle.offsetHeight}px 0px -${dom.contentArea.clientHeight - dom.contentTitle.offsetHeight - 1}px 0px`
    };

    appState.observer = new IntersectionObserver((entries) => {
        if (appState.isScrollingProgrammatically) return;
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const { categoryKey, pageKey } = entry.target.dataset;
                updateActiveState(categoryKey, pageKey);
            }
        });
    }, options);

    document.querySelectorAll('.content-section').forEach(section => {
        appState.observer.observe(section);
    });
}

/**
 * 更新当前激活的导航状态和页面标题。
 * @param {string} categoryKey - 分类键名。
 * @param {string} pageKey - 页面键名。
 */
function updateActiveState(categoryKey, pageKey) {
    const pageData = guideData[categoryKey]?.pages[pageKey];
    if (pageData) {
        if (pageData.isCampusSpecific) {
            let titleKey = '';
            if (pageKey === '宿舍介绍') titleKey = 'dormitory';
            if (pageKey === '食堂介绍') titleKey = 'canteen';
            dom.contentTitle.textContent = campusData[appState.selectedCampus]?.[titleKey]?.title || pageData.title;
        } else {
            dom.contentTitle.textContent = pageData.title;
        }
    }
    
    updateActiveNav(categoryKey, pageKey);

    dom.bottomNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (categoryKey === '主页') {
        dom.bottomNavHome.classList.add('active');
    }
}

/**
 * 平滑滚动到指定元素。
 * @param {HTMLElement} targetElement - 目标元素。
 * @param {string|null} [keyword=null] - 需要高亮的关键词。
 */
function scrollToElement(targetElement, keyword = null) {
    appState.isScrollingProgrammatically = true;
    const topOffset = dom.contentTitle.offsetHeight;
    const elementPosition = targetElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + dom.contentArea.scrollTop - topOffset;

    dom.contentArea.scrollTo({ top: offsetPosition, behavior: 'smooth' });

    if (keyword) {
        setTimeout(() => search.highlightKeywordInSection(targetElement, keyword), 500);
    }

    clearTimeout(appState.scrollTimeout);
    appState.scrollTimeout = setTimeout(() => { appState.isScrollingProgrammatically = false; }, 1000);
}

// ===================================================================================
// --- 事件处理器与回调函数 ---
// ===================================================================================

function showToast(message, type = 'info') {
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

function handleCampusSelection(e) {
    const button = e.target.closest('.campus-select-btn');
    if (!button) return;

    const campus = button.dataset.campus;
    localStorage.setItem('selectedCampus', campus);
    appState.selectedCampus = campus;
    search.updateCampus(campus);
    viewManager.updateCampus(campus);

    modals.hideCampusSelector(runApp);
}

function handleHomeClick(e) {
    e.preventDefault();
    viewManager.hideAllViews();
    const homeElement = document.getElementById('page-主页-home');
    if (homeElement) {
        updateActiveState("主页", "home");
        scrollToElement(homeElement);
    }
}

function handleCardClick(e) {
    const card = e.target.closest('.detail-card');
    if (!card) return;
    e.preventDefault();
    const { type, key } = card.dataset;
    viewManager.showDetailView(type, key);
}

function handleSearchResultClick(dataset) {
    viewManager.hideAllViews();
    dom.searchInput.value = '';
    dom.mobileSearchInput.value = '';

    const { isDetail, detailType, detailKey, categoryKey, pageKey, keyword } = dataset;

    if (isDetail === 'true') {
        viewManager.showDetailView(detailType, detailKey);
        setTimeout(() => search.highlightKeywordInSection(dom.detailContent, keyword), 500);
    } else {
        const targetElement = document.getElementById(`page-${categoryKey}-${pageKey}`);
        if (targetElement) {
            updateActiveState(categoryKey, pageKey);
            scrollToElement(targetElement, keyword);
        }
    }
}

function handleFeedbackSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData).toString()
    })
    .then(() => {
        dom.feedbackForm.classList.add('hidden');
        dom.feedbackSuccessMsg.classList.remove('hidden');
        setTimeout(() => modals.hideFeedbackModal(), 2000);
    })
    .catch((error) => {
        console.error(error);
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.textContent = '提交失败!';
        submitButton.classList.add('bg-red-600');
    });
}

function handleAuthViewChange(viewName) {
    dom.loginFormContainer.classList.add('hidden');
    dom.registerFormContainer.classList.add('hidden');
    dom.resetPasswordFormContainer.classList.add('hidden');
    if (viewName === 'login') {
        dom.authTitle.textContent = "欢迎回来";
        dom.loginFormContainer.classList.remove('hidden');
    } else if (viewName === 'register') {
        dom.authTitle.textContent = "加入我们";
        dom.registerFormContainer.classList.remove('hidden');
    } else if (viewName === 'reset') {
        dom.authTitle.textContent = "重置密码";
        dom.resetPasswordFormContainer.classList.remove('hidden');
    }
}

function handleProfileViewChange(viewName) {
    dom.profileViewContainer.classList.add('hidden');
    dom.profileEditContainer.classList.add('hidden');
    if (viewName === 'view') {
        dom.profileViewContainer.classList.remove('hidden');
    } else if (viewName === 'edit') {
        authUI.populateProfileEditForm(appState.currentUserData);
        dom.profileEditContainer.classList.remove('hidden');
    }
}

// ===================================================================================
// --- 事件监听器绑定 ---
// ===================================================================================

function setupEventListeners() {
    dom.navMenu.addEventListener('click', (e) => handleNavigationClick(e, (category, page) => {
        viewManager.hideAllViews();
        updateActiveState(category, page);
        const targetElement = document.getElementById(`page-${category}-${page}`);
        if (targetElement) scrollToElement(targetElement);
        if (window.innerWidth < 768) viewManager.toggleSidebar();
    }));

    dom.homeButtonTop.addEventListener('click', handleHomeClick);
    dom.menuToggle.addEventListener('click', viewManager.toggleSidebar);
    dom.sidebarOverlay.addEventListener('click', viewManager.toggleSidebar);
    dom.campusModal.addEventListener('click', handleCampusSelection);
    dom.changeCampusBtn.addEventListener('click', modals.showCampusSelector);
    dom.contentArea.addEventListener('click', handleCardClick);
    dom.backToMainBtn.addEventListener('click', viewManager.hideDetailView);
    
    dom.bottomNavHome.addEventListener('click', handleHomeClick);
    dom.bottomNavMenu.addEventListener('click', viewManager.toggleSidebar);
    dom.bottomNavSearch.addEventListener('click', viewManager.showMobileSearch);
    dom.bottomNavCampus.addEventListener('click', modals.showCampusSelector);
    dom.closeMobileSearchBtn.addEventListener('click', viewManager.hideMobileSearch);
    
    dom.feedbackBtn.addEventListener('click', modals.showFeedbackModal);
    dom.closeFeedbackBtn.addEventListener('click', modals.hideFeedbackModal);
    dom.feedbackModal.addEventListener('click', (e) => { if (e.target === dom.feedbackModal) modals.hideFeedbackModal(); });
    dom.feedbackForm.addEventListener('submit', handleFeedbackSubmit);
    
    dom.loginPromptBtn.addEventListener('click', () => { handleAuthViewChange('login'); modals.showAuthModal(); });
    dom.closeAuthBtn.addEventListener('click', modals.hideAuthModal);
    dom.authModal.addEventListener('click', (e) => { if (e.target === dom.authModal) modals.hideAuthModal(); });
    
    dom.userProfileBtn.addEventListener('click', () => { handleProfileViewChange('view'); modals.showProfileModal(); });
    dom.closeProfileBtn.addEventListener('click', modals.hideProfileModal);
    dom.profileModal.addEventListener('click', (e) => { if (e.target === dom.profileModal) modals.hideProfileModal(); });

    dom.registerForm.addEventListener('submit', (e) => authUI.handleRegisterSubmit(e, showToast, modals.hideAuthModal));
    dom.loginForm.addEventListener('submit', (e) => authUI.handleLoginSubmit(e, showToast, modals.hideAuthModal));
    dom.resetPasswordForm.addEventListener('submit', (e) => authUI.handlePasswordResetSubmit(e, showToast, handleAuthViewChange));
    dom.forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); handleAuthViewChange('reset'); });
    dom.goToRegisterLink.addEventListener('click', (e) => { e.preventDefault(); handleAuthViewChange('register'); });
    dom.goToLoginFromRegisterLink.addEventListener('click', (e) => { e.preventDefault(); handleAuthViewChange('login'); });
    dom.goToLoginFromResetLink.addEventListener('click', (e) => { e.preventDefault(); handleAuthViewChange('login'); });
    
    dom.logoutButton.addEventListener('click', () => authUI.handleLogout(showToast, modals.hideProfileModal));
    dom.editProfileBtn.addEventListener('click', () => handleProfileViewChange('edit'));
    dom.cancelEditBtn.addEventListener('click', () => handleProfileViewChange('view'));
    dom.saveProfileBtn.addEventListener('click', (e) => authUI.handleProfileSave(e, appState.currentUserData, showToast, handleProfileViewChange));
    
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
}

// ===================================================================================
// --- 辅助函数 (无法归类到其他模块的) ---
// ===================================================================================

function addFaqListeners(container) {
    container.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            header.classList.toggle('open');
            content.style.display = header.classList.contains('open') ? 'block' : 'none';
            header.querySelector('.accordion-icon').classList.toggle('rotate-180');
        });
    });
}

function addHomeListeners() {
    document.getElementById('explore-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        const nextSection = document.getElementById('page-入学准备-开学必备清单');
        if (nextSection) {
            updateActiveState("入学准备", "开学必备清单");
            scrollToElement(nextSection);
        }
    });
    dom.contentArea.querySelectorAll('.nav-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const navData = JSON.parse(card.dataset.navlink);
            const targetElement = document.getElementById(`page-${navData.category}-${navData.page}`);
            if (targetElement) {
                updateActiveState(navData.category, navData.page);
                scrollToElement(targetElement);
            }
        });
    });
}

function populateProfileEditDropdowns() {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 5; i--) {
        dom.editEnrollmentYear.add(new Option(i + '级', i));
    }
    const allMajors = [...new Set(Object.values(campusInfoData).flatMap(campus => campus.flatMap(college => college.majors)))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    allMajors.forEach(major => dom.editMajor.add(new Option(major, major)));
}

function initCampusQueryTool(container) {
    const collegeSelect = container.querySelector('#college-select');
    const majorSelect = container.querySelector('#major-select');
    const resultDisplay = container.querySelector('#result-display');
    if (!collegeSelect || !majorSelect || !resultDisplay) return;

    const allColleges = [...new Set(Object.values(campusInfoData).flatMap(campus => campus.map(college => college.college)))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    allColleges.forEach(college => collegeSelect.add(new Option(college, college)));

    const resetResult = () => { resultDisplay.innerHTML = '<p class="text-gray-500 dark:text-gray-400">查询结果将在此处显示</p>'; };

    collegeSelect.addEventListener('change', () => {
        const selectedCollege = collegeSelect.value;
        majorSelect.innerHTML = '<option value="">-- 请选择 --</option>';
        majorSelect.disabled = true;
        resetResult();
        if (selectedCollege) {
            let collegeInfo;
            for (const campus in campusInfoData) {
                collegeInfo = campusInfoData[campus].find(c => c.college === selectedCollege);
                if (collegeInfo) break;
            }
            if (collegeInfo) {
                collegeInfo.majors.forEach(major => majorSelect.add(new Option(major, major)));
                majorSelect.disabled = false;
                if (collegeInfo.majors.length === 1) {
                    majorSelect.value = collegeInfo.majors[0];
                    majorSelect.dispatchEvent(new Event('change'));
                }
            }
        }
    });

    majorSelect.addEventListener('change', () => {
        const selectedCollege = collegeSelect.value;
        const selectedMajor = majorSelect.value;
        if (selectedCollege && selectedMajor) {
            let campusResult = '';
            for (const campus in campusInfoData) {
                if (campusInfoData[campus].some(c => c.college === selectedCollege && c.majors.includes(selectedMajor))) {
                    campusResult = campusData[campus.toLowerCase().replace('校区', '')]?.name || campus;
                    break;
                }
            }
            let specialNote = campusResult.includes('通灌') ? `<div class="mt-4 bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-800 dark:text-blue-300 p-4 rounded-md" role="alert"><p class="font-bold">特别提醒</p><p>到大二通灌校区的同学会搬到本部，具体搬家事宜请留意学院的统一安排。</p></div>` : '';
            resultDisplay.innerHTML = `<div class="w-full"><p class="text-lg text-gray-600 dark:text-gray-300">你所在的校区是：</p><p class="text-3xl md:text-4xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">${campusResult}</p>${specialNote}</div>`;
        } else {
            resetResult();
        }
    });
}

// ===================================================================================
// --- 应用启动 ---
// ===================================================================================

function runApp() {
    createNavigation(dom.navMenu, guideData);
    renderAllContent();
    if (appState.selectedCampus && campusData[appState.selectedCampus]) {
        dom.currentCampusDisplay.textContent = `当前: ${campusData[appState.selectedCampus].name}`;
    }
    updateActiveState("主页", "home");
}

document.addEventListener('DOMContentLoaded', () => {
    theme.init(dom);
    authUI.cacheAuthDOMElements(dom);
    modals.init(dom);
    
    authUI.listenForAuthStateChanges((userData) => {
        appState.currentUserData = userData;
    });
    
    populateProfileEditDropdowns();
    
    appState.selectedCampus = localStorage.getItem('selectedCampus');

    viewManager.init({
        domElements: dom,
        cData: campusData,
    });
    
    search.init({
        domElements: dom,
        gData: guideData,
        cData: campusData,
        campus: appState.selectedCampus,
        onResultClick: handleSearchResultClick
    });

    if (appState.selectedCampus) {
        runApp();
    } else {
        modals.showCampusSelector();
    }
    
    setupEventListeners();

    setTimeout(() => {
        dom.loadingOverlay.style.opacity = '0';
        setTimeout(() => dom.loadingOverlay.style.display = 'none', 500);
    }, 500);
});
