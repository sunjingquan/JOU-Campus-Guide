/**
 * @file 应用壳层管理组件 (App Shell Component)
 * @description 一个独立的、高内聚的模块，负责创建、管理和更新应用的所有导航及顶层视图元素
 * (侧边栏、底部导航、移动端搜索、校区选择器等)。
 * @version 2.0.0
 */

// --- 依赖导入 ---
import { eventBus } from '../../services/eventBus.js';
import { getAvatarUrl } from '../Auth/auth.js';

// --- 模块内变量 ---
let dom = {}; // 缓存本组件需要操作的DOM元素
let onLinkClickCallback = () => {}; // 存储点击导航链接后的回调函数
let onCampusChangeCallback = () => {}; // 存储校区变更后的回调函数
let campusData = {}; // 存储校区数据

// =============================================================================
// --- 公共接口 (Public API) ---
// =============================================================================

/**
 * (导出函数) 组件的唯一初始化入口。
 * @param {object} config - 配置对象。
 */
export function init(config) {
    onLinkClickCallback = config.onLinkClick;
    onCampusChangeCallback = config.onCampusChange;
    campusData = config.cData;
    
    _cacheDOMElements();
    _setupEventListeners();
    
    createNavigationMenu(config.guideData);
    updateCampusDisplay(config.campus); // 初始化时更新校区显示
    
    console.log("Navigation (App Shell) Component Initialized.");
}

/**
 * (导出函数) 暴露给外部的接口，用于更新激活状态。
 */
export function setActive(categoryKey, pageKey) {
    _updateActiveNav(categoryKey, pageKey);
}

// =============================================================================
// --- 核心功能：导航菜单 ---
// =============================================================================

function createNavigationMenu(data) {
    dom.navMenu.innerHTML = ''; 

    data.forEach(categoryData => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'nav-category';

        if (categoryData.isHomePage) {
            const link = _createNavLink(categoryData.key, 'home', categoryData.icon, categoryData.title, true);
            dom.navMenu.appendChild(link);
            return;
        }

        const categoryHeader = document.createElement('button');
        categoryHeader.className = 'category-header w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-blue-200 dark:text-gray-300 rounded-md hover:bg-blue-800 dark:hover:bg-gray-700 transition-colors';
        categoryHeader.innerHTML = `<span class="flex items-center"><i data-lucide="${categoryData.icon}" class="w-4 h-4 mr-3"></i>${categoryData.title}</span><i data-lucide="chevron-down" class="accordion-icon w-4 h-4"></i>`;
        categoryDiv.appendChild(categoryHeader);

        const pageList = document.createElement('ul');
        pageList.className = 'submenu mt-1';
        
        if (categoryData.pages && Array.isArray(categoryData.pages)) {
            categoryData.pages.forEach(page => {
                const listItem = document.createElement('li');
                const link = _createNavLink(categoryData.key, page.pageKey, null, page.title, false);
                listItem.appendChild(link);
                pageList.appendChild(listItem);
            });
        }
        categoryDiv.appendChild(pageList);
        dom.navMenu.appendChild(categoryDiv);
    });

    const materialsLink = _createNavLink('materials', 'list', 'book-marked', '学习资料共享', true);
    const homeLink = dom.navMenu.querySelector('a[data-category="home"]');
    if (homeLink) {
        homeLink.after(materialsLink);
    } else {
        dom.navMenu.prepend(materialsLink);
    }
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

function _updateActiveNav(categoryKey, pageKey) {
    dom.navMenu.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

    let activeLink;
    if (pageKey) {
        activeLink = dom.navMenu.querySelector(`.sidebar-link[data-category="${categoryKey}"][data-page="${pageKey}"]`);
    } else {
        activeLink = dom.navMenu.querySelector(`.sidebar-link[data-category="${categoryKey}"]`);
    }
    
    if (activeLink) {
        activeLink.classList.add('active');
        const submenu = activeLink.closest('.submenu');
        if (submenu && !submenu.classList.contains('open')) {
            dom.navMenu.querySelectorAll('.submenu.open').forEach(s => {
                s.classList.remove('open');
                s.previousElementSibling.classList.remove('open');
            });
            submenu.classList.add('open');
            submenu.previousElementSibling.classList.add('open');
        }
    }
    
    // 更新底部导航栏的激活状态
    dom.bottomNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (categoryKey === 'home') {
        dom.bottomNavHome.classList.add('active');
    }
}

// =============================================================================
// --- 核心功能：视图管理 (原 main.js 的逻辑) ---
// =============================================================================

function toggleSidebar() {
    const isHidden = dom.sidebar.classList.contains('-translate-x-full');
    dom.sidebar.classList.toggle('-translate-x-full');
    dom.sidebarOverlay.classList.toggle('hidden', !isHidden);
    dom.bottomNavMenu.classList.toggle('active', !isHidden);
}

function showMobileSearch() {
    dom.mobileSearchOverlay.classList.remove('hidden');
    setTimeout(() => {
        dom.mobileSearchOverlay.classList.remove('translate-y-full');
        dom.mobileSearchInput.focus();
    }, 10);
}

function hideMobileSearch() {
    dom.mobileSearchOverlay.classList.add('translate-y-full');
    setTimeout(() => {
        dom.mobileSearchOverlay.classList.add('hidden');
        dom.mobileSearchInput.value = '';
        dom.mobileSearchResultsContainer.innerHTML = '';
    }, 300);
}

function showCampusSelector() {
    dom.campusModal.classList.remove('hidden');
    setTimeout(() => {
        dom.campusModal.style.opacity = '1';
        dom.campusDialog.style.transform = 'scale(1)';
        dom.campusDialog.style.opacity = '1';
    }, 10);
}

function hideCampusSelector(onHidden) {
    dom.campusModal.style.opacity = '0';
    dom.campusDialog.style.transform = 'scale(0.95)';
    dom.campusDialog.style.opacity = '0';
    setTimeout(() => {
        dom.campusModal.classList.add('hidden');
        if (onHidden) onHidden();
    }, 300);
}

function updateCampusDisplay(campusId) {
    const campusInfo = campusData.campuses.find(c => c.id === campusId);
    if (campusInfo) dom.currentCampusDisplay.textContent = `当前: ${campusInfo.name}`;
}

// =============================================================================
// --- 事件处理与初始化 ---
// =============================================================================

function _cacheDOMElements() {
    dom = {
        // 导航相关
        navMenu: document.getElementById('nav-menu'),
        loginPromptBtn: document.getElementById('login-prompt-btn'),
        userProfileBtn: document.getElementById('user-profile-btn'),
        sidebarAvatar: document.getElementById('sidebar-avatar'),
        sidebarNickname: document.getElementById('sidebar-nickname'),
        // 侧边栏
        sidebar: document.getElementById('sidebar'),
        sidebarOverlay: document.getElementById('sidebar-overlay'),
        menuToggle: document.getElementById('menu-toggle'),
        // 移动端搜索
        mobileSearchOverlay: document.getElementById('mobile-search-overlay'),
        mobileSearchInput: document.getElementById('mobile-search-input'),
        mobileSearchResultsContainer: document.getElementById('mobile-search-results-container'),
        closeMobileSearchBtn: document.getElementById('close-mobile-search-btn'),
        // 校区选择
        campusModal: document.getElementById('campus-selector-modal'),
        campusDialog: document.getElementById('campus-selector-dialog'),
        changeCampusBtn: document.getElementById('change-campus-btn'),
        currentCampusDisplay: document.getElementById('current-campus-display'),
        // 底部导航
        bottomNav: document.getElementById('bottom-nav'),
        bottomNavHome: document.getElementById('bottom-nav-home'),
        bottomNavMenu: document.getElementById('bottom-nav-menu'),
        bottomNavSearch: document.getElementById('bottom-nav-search'),
        bottomNavCampus: document.getElementById('bottom-nav-campus'),
    };
}

function _setupEventListeners() {
    // 导航菜单点击
    dom.navMenu.addEventListener('click', (e) => {
        const link = e.target.closest('.sidebar-link');
        const header = e.target.closest('.category-header');
        if (link) {
            e.preventDefault();
            const { category, page } = link.dataset;
            if (onLinkClickCallback) onLinkClickCallback(category, page);
        } else if (header) {
            const submenu = header.nextElementSibling;
            header.classList.toggle('open');
            submenu.classList.toggle('open');
        }
    });

    // 认证状态变化
    eventBus.subscribe('auth:stateChanged', (data) => _updateUserUI(data.user));
    
    // 顶部和侧边栏按钮
    dom.menuToggle.addEventListener('click', toggleSidebar);
    dom.sidebarOverlay.addEventListener('click', toggleSidebar);
    dom.changeCampusBtn.addEventListener('click', showCampusSelector);

    // 底部导航按钮
    dom.bottomNavHome.addEventListener('click', (e) => {
        e.preventDefault();
        // 直接调用回调，通知主应用
        if (onLinkClickCallback) onLinkClickCallback('home', 'home');
    });
    dom.bottomNavMenu.addEventListener('click', toggleSidebar);
    dom.bottomNavSearch.addEventListener('click', showMobileSearch);
    dom.bottomNavCampus.addEventListener('click', showCampusSelector);
    
    // 各种关闭按钮
    dom.closeMobileSearchBtn.addEventListener('click', hideMobileSearch);
    dom.campusModal.addEventListener('click', (e) => {
        const button = e.target.closest('.campus-select-btn');
        if (button) {
            const campus = button.dataset.campus;
            hideCampusSelector(() => {
                updateCampusDisplay(campus);
                if (onCampusChangeCallback) onCampusChangeCallback(campus);
            });
        }
    });
}

// =============================================================================
// --- 私有辅助函数 ---
// =============================================================================

async function _updateUserUI(userData) {
    const isLoggedIn = !!userData;
    dom.loginPromptBtn.classList.toggle('hidden', isLoggedIn);
    dom.userProfileBtn.classList.toggle('hidden', !isLoggedIn);

    if (isLoggedIn) {
        const avatarUrl = await getAvatarUrl(userData.avatar);
        dom.sidebarAvatar.src = avatarUrl;
        dom.sidebarNickname.textContent = userData.nickname || '设置昵称';
    } else {
        const defaultAvatarUrl = await getAvatarUrl(null);
        dom.sidebarAvatar.src = defaultAvatarUrl;
        dom.sidebarNickname.textContent = '登录 / 注册';
    }
}

function _createNavLink(categoryKey, pageKey, icon, text, isHeader) {
    const link = document.createElement('a');
    link.href = `#${categoryKey}`;
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
