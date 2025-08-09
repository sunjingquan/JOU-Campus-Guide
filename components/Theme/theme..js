/**
 * @file 主题切换组件 (Theme Component)
 * @description 一个独立的、自初始化的模块，负责处理应用的浅色/深色主题切换。
 * 它自己查找DOM元素并管理自己的状态，实现了高度的封装。
 */

// --- 模块内变量，用于缓存组件所需的DOM元素 ---
let themeToggleBtn;
let themeIconSun;
let themeIconMoon;

/**
 * 将指定的主题应用到文档的 <html> 元素上，并持久化存储。
 * @param {string} theme - 要应用的主题名称 ('light' 或 'dark')。
 * @private
 */
function applyTheme(theme) {
    const isDark = theme === 'dark';
    // 直接操作根元素，切换 'dark' class
    document.documentElement.classList.toggle('dark', isDark);
    // 将用户的选择保存到 localStorage，以便下次访问时记住
    localStorage.setItem('theme', theme);

    // 更新切换按钮旁的太阳/月亮图标的显示状态
    if (themeIconSun && themeIconMoon) {
        themeIconSun.classList.toggle('hidden', isDark);
        themeIconMoon.classList.toggle('hidden', !isDark);
    }
}

/**
 * 切换当前的主题。
 * 如果当前是深色模式，则切换到浅色模式，反之亦然。
 * @private
 */
function toggleTheme() {
    const currentIsDark = document.documentElement.classList.contains('dark');
    applyTheme(currentIsDark ? 'light' : 'dark');
}

/**
 * (导出函数) 初始化主题组件。
 * 这是该模块唯一的公开接口。调用此函数后，组件将自动开始工作。
 */
export function init() {
    // 组件自己负责查找它需要的DOM元素，不再依赖外部传入
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    themeIconSun = document.getElementById('theme-icon-sun');
    themeIconMoon = document.getElementById('theme-icon-moon');

    // 如果在页面上找不到切换按钮，就打印警告并优雅地退出，避免应用崩溃
    if (!themeToggleBtn) {
        console.warn("Theme Component: Toggle button ('theme-toggle-btn') not found. Component will not be interactive.");
        return;
    }

    // 决定并应用初始主题：
    // 1. 优先使用 localStorage 中保存的主题。
    // 2. 如果没有保存过，则根据用户操作系统的偏好来设置。
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    applyTheme(initialTheme);

    // 为主题切换按钮只绑定一次点击事件
    themeToggleBtn.addEventListener('click', toggleTheme);

    console.log("Theme component initialized successfully.");
}
