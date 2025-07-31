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
    // --- 修改: 为新功能设置一个特殊的 href ---
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

/**
 * [关键修复] 创建完整的导航菜单，适配数组格式的数据。
 * @param {HTMLElement} navMenuElement - 需要填充的<nav>元素。
 * @param {Array<Object>} guideData - 从数据库获取的指南主数据数组。
 */
export function createNavigation(navMenuElement, guideData) {
    // 清空任何现有的菜单
    navMenuElement.innerHTML = '';

    // [修复] 使用 forEach 遍历数组，因为从数据库获取的数据是数组
    guideData.forEach(categoryData => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'nav-category';

        if (categoryData.isHomePage) {
            // [修复] 使用 categoryData.title 作为链接文本
            const link = createNavLink(categoryData.key, 'home', categoryData.icon, categoryData.title, true);
            navMenuElement.appendChild(link);
            return; // 在 forEach 循环中，使用 return 来跳过当前项的后续处理
        }

        const categoryHeader = document.createElement('button');
        categoryHeader.className = 'category-header w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-blue-200 dark:text-gray-300 rounded-md hover:bg-blue-800 dark:hover:bg-gray-700 transition-colors';
        // [修复] 使用 categoryData.title 作为分类标题
        categoryHeader.innerHTML = `<span class="flex items-center"><i data-lucide="${categoryData.icon}" class="w-4 h-4 mr-3"></i>${categoryData.title}</span><i data-lucide="chevron-down" class="accordion-icon w-4 h-4"></i>`;
        categoryDiv.appendChild(categoryHeader);

        const pageList = document.createElement('ul');
        pageList.className = 'submenu mt-1';
        
        // [修复] 同样使用 forEach 遍历 pages 数组
        if (categoryData.pages && Array.isArray(categoryData.pages)) {
            categoryData.pages.forEach(page => {
                const listItem = document.createElement('li');
                // 使用 page.pageKey 和 page.title
                const link = createNavLink(categoryData.key, page.pageKey, null, page.title, false);
                listItem.appendChild(link);
                pageList.appendChild(listItem);
            });
        }
        categoryDiv.appendChild(pageList);
        navMenuElement.appendChild(categoryDiv);
    });

    // --- 新增: 手动添加入口到学习资料共享中心 ---
    // 创建一个新的、独立的导航链接
    const materialsLink = createNavLink('materials', 'list', 'book-marked', '学习资料共享', true);
    
    // 将其插入到主页链接之后 (如果主页存在)
    const homeLink = navMenuElement.querySelector('a[data-category="home"]');
    if (homeLink && homeLink.nextSibling) {
        navMenuElement.insertBefore(materialsLink, homeLink.nextSibling);
    } else if (homeLink) {
        navMenuElement.appendChild(materialsLink);
    } else {
        // 如果没有主页链接，就插在最前面
        navMenuElement.prepend(materialsLink);
    }
    // --- 新增结束 ---
    
    // 创建完所有元素后，让Lucide渲染图标
    if (window.lucide) {
        lucide.createIcons();
    }
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
 * @param {string|null} pageKey - 当前激活页面的键名。
 */
export function updateActiveNav(categoryKey, pageKey) {
    // 首先停用所有链接
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

    // --- 修改: 兼容没有 pageKey 的顶级导航项 ---
    let activeLink;
    if (pageKey) {
        activeLink = document.querySelector(`.sidebar-link[data-category="${categoryKey}"][data-page="${pageKey}"]`);
    } else {
        // 如果 pageKey 为 null 或 undefined，只根据 categoryKey 查找
        activeLink = document.querySelector(`.sidebar-link[data-category="${categoryKey}"]`);
    }
    
    if (activeLink) {
        activeLink.classList.add('active');
        const submenu = activeLink.closest('.submenu');
        // 如果激活的链接位于一个折叠的子菜单内，则将其展开
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
