console.log("后台控制器 main.js 加载成功！现在开始导入模块...");

/**
 * @file 管理后台主控制器 (main.js)
 * @description 负责初始化、视图切换、与各模块通信。
 */
import * as Auth from './auth.js';
import * as API from './api.js';
import * as UI from './ui.js';
import * as Views from './views.js';

// --- 全局状态 ---
const state = {
    currentView: 'dashboard',
    guideDocs: [],
    currentEditingDoc: null,
};

// --- DOM 元素缓存 ---
const dom = {
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    appContainer: document.getElementById('app-container'),
    sidebarNav: document.getElementById('sidebar-nav'),
    viewContainer: document.getElementById('view-container'),
    userProfile: {
        avatar: document.getElementById('user-avatar'),
        nickname: document.getElementById('user-nickname'),
        role: document.getElementById('user-role'),
    }
};

// --- 主流程函数 ---

/**
 * 动态生成侧边栏导航
 */
function buildSidebar() {
    const role = Auth.getCurrentUserRole();
    let navItems = [
        { view: 'dashboard', icon: 'layout-dashboard', label: '仪表盘', roles: ['editor', 'admin', 'superadmin'] },
        { view: 'content', icon: 'file-pen-line', label: '内容管理', roles: ['editor', 'admin', 'superadmin'] },
        { view: 'users', icon: 'users', label: '用户管理', roles: ['admin', 'superadmin'] },
        { view: 'feedback', icon: 'message-square-plus', label: '反馈中心', roles: ['admin', 'superadmin'] },
    ];

    // 根据用户角色过滤导航项
    const accessibleNavs = navItems.filter(item => item.roles.includes(role));
    
    dom.sidebarNav.innerHTML = `
        <ul class="space-y-2">
            ${accessibleNavs.map(item => `
                <li>
                    <a href="#${item.view}" class="sidebar-link flex items-center p-3 rounded-lg text-slate-700 hover:bg-gray-100" data-view="${item.view}">
                        <i data-lucide="${item.icon}" class="h-5 w-5 mr-3"></i>
                        <span>${item.label}</span>
                    </a>
                </li>
            `).join('')}
        </ul>
    `;
    
    // 绑定事件
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', handleViewChange);
    });
}

/**
 * 切换主视图
 * @param {string} viewName - 要切换到的视图名称
 */
async function switchView(viewName) {
    state.currentView = viewName;
    dom.viewContainer.innerHTML = `<div class="h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent mx-auto mt-20"></div>`;

    let viewHtml = '';
    try {
        switch (viewName) {
            case 'dashboard':
                viewHtml = await Views.renderDashboard();
                break;
            case 'content':
                state.guideDocs = await API.getGuideDocs();
                viewHtml = Views.renderContentManagement(state.guideDocs);
                break;
            case 'users':
                viewHtml = await Views.renderUserManagement();
                break;
            case 'feedback':
                viewHtml = await Views.renderFeedbackCenter();
                break;
            default:
                viewHtml = `<p>未知的视图: ${viewName}</p>`;
        }
    } catch (error) {
        viewHtml = `<p class="text-red-500">加载视图失败: ${error.message}</p>`;
    }
    
    dom.viewContainer.innerHTML = viewHtml;
    lucide.createIcons();
    attachViewEventListeners(viewName);
}

// --- 事件处理 ---

function handleViewChange(e) {
    e.preventDefault();
    const targetView = e.currentTarget.dataset.view;
    if (targetView === state.currentView) return;

    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.toggle('active', link.dataset.view === targetView);
    });
    switchView(targetView);
}

function handleContentDocSelect(e) {
    e.preventDefault();
    const link = e.target.closest('.doc-link');
    if (!link) return;

    const docId = link.dataset.docId;
    state.currentEditingDoc = state.guideDocs.find(d => d._id === docId);

    const editorArea = document.getElementById('content-editor-area');
    editorArea.innerHTML = `
        <div class="flex justify-between items-center mb-4 pb-4 border-b">
            <h3 class="text-xl font-bold">${state.currentEditingDoc.title}</h3>
            <button id="save-content-btn" class="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400">保存更改</button>
        </div>
        <form id="content-edit-form">${UI.buildFormForDocument(state.currentEditingDoc)}</form>
    `;
    lucide.createIcons();
    document.getElementById('save-content-btn').addEventListener('click', handleSaveContent);
}

async function handleSaveContent() {
    if (!state.currentEditingDoc) return;
    const btn = document.getElementById('save-content-btn');
    btn.disabled = true;
    btn.textContent = '保存中...';

    const form = document.getElementById('content-edit-form');
    const updatedData = UI.collectDataFromForm(form);
    
    try {
        await API.updateGuideDoc(state.currentEditingDoc._id, updatedData);
        alert('保存成功！');
        // 更新本地缓存
        const index = state.guideDocs.findIndex(d => d._id === state.currentEditingDoc._id);
        state.guideDocs[index] = { ...state.guideDocs[index], ...updatedData };
        state.currentEditingDoc = state.guideDocs[index];
    } catch (error) {
        alert(`保存失败: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = '保存更改';
    }
}

async function handleRoleChange(e) {
    const select = e.target;
    const userId = select.dataset.userId;
    const newRole = select.value;
    
    if (confirm(`确定要将该用户的角色更改为 "${newRole}" 吗？`)) {
        try {
            await API.updateUserRole(userId, newRole);
            alert('角色更新成功！');
        } catch (error) {
            alert(`角色更新失败: ${error.message}`);
            // 刷新以恢复原状
            switchView('users');
        }
    } else {
        // 用户取消，恢复选择
        switchView('users');
    }
}

async function handleFeedbackStatusChange(e) {
    const select = e.target;
    const feedbackId = select.dataset.feedbackId;
    const newStatus = select.value;
    try {
        await API.updateFeedbackStatus(feedbackId, newStatus);
        select.closest('.border-l-4').className = `bg-white p-4 rounded-lg shadow border-l-4 ${newStatus === 'resolved' ? 'border-green-500' : 'border-yellow-500'}`;
    } catch (error) {
        alert(`状态更新失败: ${error.message}`);
    }
}

/**
 * 为动态生成的视图内容附加事件监听器
 * @param {string} viewName
 */
function attachViewEventListeners(viewName) {
    if (viewName === 'content') {
        const docList = document.getElementById('content-doc-list');
        if(docList) docList.addEventListener('click', handleContentDocSelect);
    }
    if (viewName === 'users') {
        document.querySelectorAll('.role-select').forEach(select => {
            select.addEventListener('change', handleRoleChange);
        });
    }
    if (viewName === 'feedback') {
        document.querySelectorAll('.feedback-status-select').forEach(select => {
            select.addEventListener('change', handleFeedbackStatusChange);
        });
    }
}

// --- 初始化流程 ---

async function initialize() {
    const hasPermission = await Auth.initialize();
    if (!hasPermission) {
        dom.loadingText.textContent = '访问被拒绝：权限不足。';
        dom.loadingText.classList.add('text-red-500');
        return;
    }

    // 更新用户信息UI
    const user = Auth.getCurrentUser();
    dom.userProfile.nickname.textContent = user.nickname;
    dom.userProfile.role.textContent = user.role;
    dom.userProfile.avatar.src = user.avatarUrl || `https://ui-avatars.com/api/?name=${user.nickname}&background=random&color=fff`;

    // 构建并显示侧边栏
    buildSidebar();

    // 默认显示仪表盘
    document.querySelector('.sidebar-link[data-view="dashboard"]').classList.add('active');
    await switchView('dashboard');

    // 淡出加载遮罩
    dom.loadingOverlay.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
        dom.loadingOverlay.style.display = 'none';
        dom.appContainer.classList.remove('hidden');
    }, 300);
}

// --- 启动 ---
document.addEventListener('DOMContentLoaded', initialize);
