/**
 * @file 导航组件 (Navigation Component)
 * @description 一个独立的、高内聚的模块，负责创建、管理和更新应用的所有导航元素（侧边栏、底部导航等）。
 * 它能响应认证状态的变化来更新UI。
 * @version 1.0.0
 */

// --- 依赖导入 ---
import { eventBus } from '../../services/eventBus.js';
import { getAvatarUrl } from '../Auth/auth.js'; // [新] 导入Auth组件提供的公共函数

// --- 模块内变量 ---
let dom = {}; // 缓存本组件需要操作的DOM元素
let guideData = []; // 存储用于生成菜单的指南数据
let onLinkClickCallback = () => {}; // 存储点击导航链接后的回调函数

// =============================================================================
// --- 核心功能函数 ---
// =============================================================================

/**
 * 根据指南数据，创建完整的导航菜单HTML结构。
 * @param {Array<Object>} data - 从API获取的指南主数据数组。
 */
function createNavigationMenu(data) {
    guideData = data;
    dom.navMenu.innerHTML = ''; // 清空现有菜单

    guideData.forEach(categoryData => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'nav-category';

        if (categoryData.isHomePage) {
            const link = createNavLink(categoryData.key, 'home', categoryData.icon, categoryData.title, true);
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
                const link = createNavLink(categoryData.key, page.pageKey, null, page.title, false);
                listItem.appendChild(link);
                pageList.appendChild(listItem);
            });
        }
        categoryDiv.appendChild(pageList);
        dom.navMenu.appendChild(categoryDiv);
    });

    // 手动添加入口到学习资料共享中心
    const materialsLink = createNavLink('materials', 'list', 'book-marked', '学习资料共享', true);
    const homeLink = dom.navMenu.querySelector('a[data-category="home"]');
    if (homeLink && homeLink.nextSibling) {
        dom.navMenu.insertBefore(materialsLink, homeLink.nextSibling);
    } else if (homeLink) {
        dom.navMenu.appendChild(materialsLink);
    } else {
        dom.navMenu.prepend(materialsLink);
    }
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

/**
 * 根据当前可见的区域，更新导航链接的激活状态。
 * @param {string} categoryKey - 当前激活分类的键名。
 * @param {string|null} pageKey - 当前激活页面的键名。
 */
function updateActiveNav(categoryKey, pageKey) {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

    let activeLink;
    if (pageKey) {
        activeLink = document.querySelector(`.sidebar-link[data-category="${categoryKey}"][data-page="${pageKey}"]`);
    } else {
        activeLink = document.querySelector(`.sidebar-link[data-category="${categoryKey}"]`);
    }
    
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
}

/**
 * [新] 订阅 auth:stateChanged 事件后，更新侧边栏的用户信息UI。
 * @param {object|null} userData - 从Auth组件获取的用户数据。
 */
async function updateUserUI(userData) {
    // 这个函数现在由 Navigation 组件自己管理
    const isLoggedIn = !!userData;
    dom.loginPromptBtn.classList.toggle('hidden', isLoggedIn);
    dom.userProfileBtn.classList.toggle('hidden', !isLoggedIn);

    if (isLoggedIn) {
        const avatarUrl = await getAvatarUrl(userData.avatar);
        dom.sidebarAvatar.src = avatarUrl;
        dom.sidebarNickname.textContent = userData.nickname || '设置昵称';
    } else {
        // 当用户退出时，恢复默认状态
        const defaultAvatarUrl = await getAvatarUrl(null); // 传入null来获取默认头像
        dom.sidebarAvatar.src = defaultAvatarUrl;
        dom.sidebarNickname.textContent = '登录 / 注册';
    }
}


// =============================================================================
// --- 事件处理函数 ---
// =============================================================================

/**
 * 处理导航菜单内的点击事件。
 * @param {Event} e - 点击事件对象。
 */
function handleNavigationClick(e) {
    const link = e.target.closest('.sidebar-link');
    const header = e.target.closest('.category-header');

    if (link) {
        e.preventDefault();
        const { category, page } = link.dataset;
        if (onLinkClickCallback) {
            // 调用从 main.js 传入的回调，通知主应用页面需要跳转
            onLinkClickCallback(category, page);
        }
    } else if (header) {
        const submenu = header.nextElementSibling;
        header.classList.toggle('open');
        submenu.classList.toggle('open');
    }
}

// =============================================================================
// --- 初始化与设置 ---
// =============================================================================

/**
 * 缓存本组件需要操作的DOM元素。
 */
function cacheDOMElements() {
    dom = {
        navMenu: document.getElementById('nav-menu'),
        // [新] 将 Auth 组件相关的UI元素也纳入管理范围
        loginPromptBtn: document.getElementById('login-prompt-btn'),
        userProfileBtn: document.getElementById('user-profile-btn'),
        sidebarAvatar: document.getElementById('sidebar-avatar'),
        sidebarNickname: document.getElementById('sidebar-nickname'),
    };
}

/**
 * 为本组件的所有DOM元素绑定事件监听。
 */
function setupEventListeners() {
    if (dom.navMenu) {
        dom.navMenu.addEventListener('click', handleNavigationClick);
    }
    
    // [新] 订阅来自 Auth 组件的事件
    eventBus.subscribe('auth:stateChanged', (data) => {
        updateUserUI(data.user);
    });
}

/**
 * (导出函数) 组件的唯一初始化入口。
 * @param {object} config - 配置对象。
 * @param {Array<Object>} config.guideData - 用于生成菜单的指南数据。
 * @param {function} config.onLinkClick - 点击链接时的回调函数。
 */
export function init(config) {
    onLinkClickCallback = config.onLinkClick;
    cacheDOMElements();
    setupEventListeners();
    createNavigationMenu(config.guideData);
    console.log("Navigation Component Initialized.");
}

/**
 * (导出函数) 暴露给外部的接口，用于更新激活状态。
 */
export const setActive = updateActiveNav;


// =============================================================================
// --- 私有辅助函数 ---
// =============================================================================

/**
 * 创建一个导航链接元素。
 * @returns {HTMLAnchorElement}
 */
function createNavLink(categoryKey, pageKey, icon, text, isHeader) {
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
