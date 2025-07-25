/**
 * @file 导航UI模块
 * @description
 * 该模块负责创建和管理侧边栏导航菜单，
 * 包括其展开/折叠子菜单等交互行为。
 */

/**
 * 创建一个导航链接元素。这是一个私有的辅助函数。
 * @param {string} categoryKey - 分类的键名。
 * @param {string} pageKey - 页面的键名。
 * @param {string|null} icon - Lucide图标的名称（如果有）。
 * @param {string} text - 链接显示的文本。
 * @param {boolean} isHeader - 如果是主分类链接则为true，子链接则为false。
 * @returns {HTMLAnchorElement} 创建的a标签元素。
 */
function createNavLink(categoryKey, pageKey, icon, text, isHeader) {
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

/**
 * 创建完整的导航菜单，并将其附加到提供的DOM元素上。
 * @param {HTMLElement} navMenuElement - 需要填充的<nav>元素。
 * @param {Object} guideData - 指南的主数据对象。
 */
export function createNavigation(navMenuElement, guideData) {
    // 清空任何现有的菜单
    navMenuElement.innerHTML = '';
    for (const categoryKey in guideData) {
        const categoryData = guideData[categoryKey];
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'nav-category';

        if (categoryData.isHomePage) {
            const link = createNavLink(categoryKey, 'home', categoryData.icon, categoryKey, true);
            navMenuElement.appendChild(link);
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
            const link = createNavLink(categoryKey, pageKey, null, page.title, false);
            listItem.appendChild(link);
            pageList.appendChild(listItem);
        }
        categoryDiv.appendChild(pageList);
        navMenuElement.appendChild(categoryDiv);
    }
    // 创建完所有元素后，让Lucide渲染图标
    lucide.createIcons();
}

/**
 * 处理导航菜单内的点击事件，包括链接和可折叠的标题。
 * @param {Event} e - 点击事件对象。
 * @param {function} onLinkClick - 当链接被点击时执行的回调函数。它会接收到分类和页面的键名。
 */
export function handleNavigationClick(e, onLinkClick) {
    const link = e.target.closest('.sidebar-link');
    const header = e.target.closest('.category-header');

    if (link) {
        e.preventDefault();
        const { category, page } = link.dataset;
        if (onLinkClick) {
            onLinkClick(category, page);
        }
    } else if (header) {
        const submenu = header.nextElementSibling;
        header.classList.toggle('open');
        submenu.classList.toggle('open');
    }
}

/**
 * 根据当前可见的区域，更新导航链接的激活状态。
 * @param {string} categoryKey - 当前激活分类的键名。
 * @param {string} pageKey - 当前激活页面的键名。
 */
export function updateActiveNav(categoryKey, pageKey) {
    // 首先停用所有链接
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

    // 激活正确的链接
    const activeLink = document.querySelector(`.sidebar-link[data-category="${categoryKey}"][data-page="${pageKey}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        const submenu = activeLink.closest('.submenu');
        // 如果激活的链接位于一个折叠的子菜单内，则将其展开
        if (submenu && !submenu.classList.contains('open')) {
            // （可选）折叠其他已展开的子菜单
            document.querySelectorAll('.submenu.open').forEach(s => {
                s.classList.remove('open');
                s.previousElementSibling.classList.remove('open');
            });
            submenu.classList.add('open');
            submenu.previousElementSibling.classList.add('open');
        }
    }
}
