/**
 * @file 模块：主题管理
 * @description 该模块负责处理应用的浅色/深色主题切换、持久化存储及UI更新。
 */

// --- 模块内变量，用于缓存DOM元素 ---
let themeToggleBtn;
let themeIconSun;
let themeIconMoon;

/**
 * 将指定的主题应用到文档上。
 * @param {string} theme - 要应用的主题名称 ('light' 或 'dark')。
 * @private
 */
function applyTheme(theme) {
    // 在 <html> 元素上添加或移除 'dark' 类
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    // 将用户的选择保存到 localStorage，以便下次访问时记住
    localStorage.setItem('theme', theme);

    // 更新切换按钮旁的太阳/月亮图标
    const isDark = theme === 'dark';
    if (themeIconSun && themeIconMoon) {
        themeIconSun.classList.toggle('hidden', isDark);
        themeIconMoon.classList.toggle('hidden', !isDark);
    }
}

/**
 * 切换当前的主题。
 * 如果当前是深色模式，则切换到浅色模式，反之亦然。
 * @public
 */
export function toggleTheme() {
    const currentIsDark = document.documentElement.classList.contains('dark');
    applyTheme(currentIsDark ? 'light' : 'dark');
}

/**
 * 初始化主题模块。
 * 这个函数应该在应用启动时被调用一次。
 * 它会确定并应用初始主题，并为切换按钮设置事件监听器。
 * @param {Object} domElements - 从主应用传入的已缓存的DOM元素对象。
 * @public
 */
export function init(domElements) {
    // 从主应用获取必要的DOM元素
    themeToggleBtn = domElements.themeToggleBtn;
    themeIconSun = document.getElementById('theme-icon-sun');
    themeIconMoon = document.getElementById('theme-icon-moon');

    // 决定初始主题：
    // 1. 优先使用 localStorage 中保存的主题。
    // 2. 如果没有保存过，则根据操作系统的偏好来设置。
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme(systemPrefersDark ? 'dark' : 'light');
    }

    // 为主题切换按钮添加点击事件监听
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
}
