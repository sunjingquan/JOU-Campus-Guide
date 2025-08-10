/**
 * @file 内容渲染器组件 (ContentRenderer Component)
 * @description 负责渲染应用的主内容区域 (#content-area)，并为动态内容绑定交互事件。
 * @version 1.0.0
 */

// 从新位置导入模板
import * as tpl from './content.templates.js';
import { eventBus } from '../../services/eventBus.js';

// --- 模块内变量 ---
let dom = {};
let guideData = [];
let campusData = {};
let selectedCampus = '';

// =============================================================================
// --- 公共接口 (Public API) ---
// =============================================================================

/**
 * 初始化内容渲染器组件。
 * @param {object} config - 配置对象
 */
export function init(config) {
    dom = {
        contentArea: document.getElementById('content-area')
    };
    guideData = config.gData;
    campusData = config.cData;
    selectedCampus = config.campus;
    _setupEventListeners();
    console.log("ContentRenderer Component Initialized.");
}

/**
 * 渲染所有页面内容到主区域。
 */
export function renderAll() {
    if (!dom.contentArea) return;

    dom.contentArea.innerHTML = ''; // 清空内容

    guideData.forEach(categoryData => {
        categoryData.pages.forEach(page => {
            const section = document.createElement('div');
            section.className = 'content-section';
            section.id = `page-${categoryData.key}-${page.pageKey}`;
            section.dataset.pageKey = page.pageKey;
            section.dataset.categoryKey = categoryData.key;

            let htmlContent = _getPageContent(page);
            section.innerHTML = htmlContent;
            dom.contentArea.appendChild(section);

            // 为特定类型的页面绑定交互
            if (page.type === 'faq') _addFaqListeners(section);
            if (page.type === 'clubs') _addClubTabListeners(section);
            if (page.pageKey === 'campusQuery') _initCampusQueryTool(section);
        });
    });

    _addHomeListeners(); // 为主页的特殊卡片绑定事件
    if (window.lucide) {
        lucide.createIcons();
    }
}

/**
 * 更新组件内部的校区选择。
 * @param {string} campus - 新选择的校区ID
 */
export function updateCampus(campus) {
    selectedCampus = campus;
}

// =============================================================================
// --- 核心逻辑与事件处理 ---
// =============================================================================

/**
 * 根据页面数据对象，调用相应的模板函数生成HTML。
 * @param {object} page - 单个页面数据对象
 * @returns {string} - 渲染好的HTML字符串
 * @private
 */
function _getPageContent(page) {
    if (!page || !page.pageKey) {
        return '<p class="text-center p-8">页面数据无效，缺少 pageKey。</p>';
    }

    // 如果是校区特定内容
    if (page.isCampusSpecific) {
        const keyMap = { 'dormitory': 'dormitories', 'canteen': 'canteens' };
        const dataKey = keyMap[page.pageKey];
        const items = campusData[dataKey]?.filter(item => item.campusId === selectedCampus) || [];
        return tpl.createCampusCardsHtml(items, page.pageKey);
    }

    // 如果是通用内容
    const content = page.structuredContent || {};
    switch (page.pageKey) {
        case 'home': return tpl.createHomePage(content);
        case 'campusQuery': return tpl.createCampusQueryToolHtml();
        case 'checklist': return tpl.createChecklistHtml(content);
        case 'enrollmentProcess': return tpl.createStepsHtml(content);
        case 'mustKnow': return tpl.createPointsHtml(content);
        case 'militaryTraining': return tpl.createMilitaryTrainingPage(content);
        case 'supermarketAndBike': return tpl.createMultiSectionPage(content);
        case 'clubsAndOrgs': return tpl.createClubsHtml(content);
        case 'gpaAndCredits': return tpl.createGpaAndCreditsPage(content);
        case 'changeMajor': return tpl.createSimpleInfoPage(content);
        case 'contestsAndCerts': return tpl.createSimpleInfoPage(content);
        case 'campusCardAndApp': return tpl.createSimpleInfoPage(content);
        case 'internetAndElectricity': return tpl.createStepsListPage(content);
        case 'webVpn': return tpl.createWebVPNPage(content);
        case 'faq': return tpl.createFaqHtml(content.items);
        case 'contacts': return tpl.createLinkPage(content, page.title);
        default: return `<p class="text-center p-8">此页面内容待添加 (未知 pageKey: ${page.pageKey})。</p>`;
    }
}

/**
 * 为组件内的DOM元素绑定事件监听。
 * @private
 */
function _setupEventListeners() {
    // 使用事件委托处理详情卡片的点击
    dom.contentArea.addEventListener('click', (e) => {
        const card = e.target.closest('.detail-card');
        if (card) {
            e.preventDefault();
            const { type, key } = card.dataset;
            // 发布事件，通知DetailView组件显示详情
            eventBus.publish('detail:show', { type, key });
        }
    });
}


// =============================================================================
// --- 动态内容交互逻辑 (原main.js中的私有方法) ---
// =============================================================================

function _addFaqListeners(container) {
    const headers = container.querySelectorAll('.accordion-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const icon = header.querySelector('.accordion-icon');
            const isOpen = header.classList.toggle('open');
            content.style.display = isOpen ? 'block' : 'none';
            icon.classList.toggle('rotate-180', isOpen);
        });
    });
}

function _addClubTabListeners(container) {
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

function _addHomeListeners() {
    const homeSection = document.getElementById('page-home-home');
    if (!homeSection) return;

    homeSection.querySelector('#explore-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        eventBus.publish('nav:requestScroll', { categoryKey: 'preparation', pageKey: 'checklist' });
    });

    homeSection.querySelectorAll('.nav-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const navData = JSON.parse(card.dataset.navlink);
            const targetCategory = guideData.find(cat => cat.title === navData.category);
            if (!targetCategory) return;
            const targetPage = targetCategory.pages.find(p => p.title.startsWith(navData.page));
            if (!targetPage) return;
            
            eventBus.publish('nav:requestScroll', { categoryKey: targetCategory.key, pageKey: targetPage.pageKey });
        });
    });
}

function _initCampusQueryTool(container) {
    const collegeSelect = container.querySelector('#college-select');
    const majorSelect = container.querySelector('#major-select');
    const resultDisplay = container.querySelector('#result-display');

    const colleges = campusData.colleges || [];
    const campuses = campusData.campuses || [];

    if (colleges.length === 0) {
        collegeSelect.disabled = true;
        majorSelect.disabled = true;
        resultDisplay.innerHTML = '<p class="text-red-500">无法加载学院数据，功能暂时无法使用。</p>';
        return;
    }

    collegeSelect.innerHTML = '<option value="">-- 请选择学院 --</option>';
    colleges.forEach(college => {
        const option = new Option(college.college, college.college);
        collegeSelect.add(option);
    });

    collegeSelect.addEventListener('change', () => {
        const selectedCollegeName = collegeSelect.value;
        majorSelect.innerHTML = '<option value="">-- 请先选择学院 --</option>';
        majorSelect.disabled = true;
        resultDisplay.innerHTML = '<p class="text-gray-500 dark:text-gray-400">查询结果将在此处显示</p>';

        if (selectedCollegeName) {
            const selectedCollege = colleges.find(c => c.college === selectedCollegeName);
            if (selectedCollege && selectedCollege.majors && selectedCollege.majors.length > 0) {
                majorSelect.innerHTML = '<option value="">-- 请选择专业 --</option>';
                selectedCollege.majors.forEach(major => {
                    const option = new Option(major, major);
                    majorSelect.add(option);
                });
                majorSelect.disabled = false;
            } else {
                majorSelect.innerHTML = '<option value="">-- 该学院无专业数据 --</option>';
            }
        }
    });

    majorSelect.addEventListener('change', () => {
        const selectedCollegeName = collegeSelect.value;
        const selectedMajorName = majorSelect.value;

        if (selectedCollegeName && selectedMajorName) {
            const college = colleges.find(c => c.college === selectedCollegeName);
            if (college) {
                const campusId = college.campusId;
                const campus = campuses.find(c => c.id === campusId);
                const campusName = campus ? campus.name : '未知校区';

                resultDisplay.innerHTML = `
                    <div class="text-left w-full">
                        <p class="text-gray-600 dark:text-gray-400 text-sm mb-2">查询结果:</p>
                        <p class="text-lg font-semibold text-gray-800 dark:text-gray-100">
                            <span class="font-normal">${college.college}</span> - <strong>${selectedMajorName}</strong>
                        </p>
                        <p class="mt-4 text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <i data-lucide="map-pin" class="w-6 h-6 mr-3"></i>
                            <span>${campusName}</span>
                        </p>
                    </div>
                `;
                if (window.lucide) lucide.createIcons({ nodes: [resultDisplay] });
            }
        } else {
            resultDisplay.innerHTML = '<p class="text-gray-500 dark:text-gray-400">查询结果将在此处显示</p>';
        }
    });
}
