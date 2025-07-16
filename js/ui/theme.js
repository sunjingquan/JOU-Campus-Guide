/**
 * @file 主题管理模块
 * @description 负责处理应用的深色/浅色主题切换和持久化。
 */

let dom = {};

/**
 * 初始化主题模块。
 * @param {object} domElements - 缓存的DOM元素。
 */
export function init(domElements) {
    dom = domElements;
    determineAndApplyInitialTheme();
    setupEventListeners();
}

/**
 * 设置事件监听器。
 */
function setupEventListeners() {
    dom.themeToggleBtn.addEventListener('click', handleThemeToggle);
}

/**
 * 根据本地存储或系统偏好，决定并应用初始主题。
 */
function determineAndApplyInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme(systemPrefersDark ? 'dark' : 'light');
    }
}

/**
 * 应用指定的主题（'light' 或 'dark'）。
 * @param {string} theme - 要应用的主题名称。
 */
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);

    const isDark = theme === 'dark';
    // 此处假设 theme-icon-sun 和 theme-icon-moon 元素存在于 dom 对象中
    if (dom.themeIconSun && dom.themeIconMoon) {
        dom.themeIconSun.classList.toggle('hidden', isDark);
        dom.themeIconMoon.classList.toggle('hidden', !isDark);
    }
}

/**
 * 处理主题切换按钮的点击事件。
 */
function handleThemeToggle() {
    const currentIsDark = document.documentElement.classList.contains('dark');
    applyTheme(currentIsDark ? 'light' : 'dark');
}
