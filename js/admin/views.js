/**
 * @file 视图渲染模块 (views.js)
 * @description 包含所有主视图的 HTML 模板生成函数。
 */
import * as Auth from './auth.js';
import * as API from './api.js';
import * as UI from './ui.js';

/**
 * 渲染仪表盘视图
 * @returns {Promise<string>}
 */
export async function renderDashboard() {
    const user = Auth.getCurrentUser();
    const userCount = (await API.getAllUsers()).length;
    const feedbackCount = (await API.getFeedback()).length;

    return `
        <h1 class="text-3xl font-bold text-slate-800 mb-6">仪表盘</h1>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-lg font-semibold text-slate-600">欢迎回来！</h2>
                <p class="text-2xl font-bold text-blue-600 mt-2 truncate">${user.nickname}</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-lg font-semibold text-slate-600">注册用户总数</h2>
                <p class="text-2xl font-bold text-blue-600 mt-2">${userCount}</p>
            </div>
             <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-lg font-semibold text-slate-600">待处理反馈</h2>
                <p class="text-2xl font-bold text-blue-600 mt-2">${feedbackCount}</p>
            </div>
        </div>
    `;
}

/**
 * 渲染内容管理视图
 * @param {Array} guideDocs - 指南文档列表
 * @returns {string}
 */
export function renderContentManagement(guideDocs) {
    const docListHtml = guideDocs.map(doc => `
        <a href="#" class="doc-link block p-3 rounded-md hover:bg-gray-100 transition-colors" data-doc-id="${doc._id}">
            ${doc.title} <span class="text-xs text-gray-400">(${doc.key})</span>
        </a>
    `).join('');

    return `
        <h1 class="text-3xl font-bold text-slate-800 mb-6">内容管理</h1>
        <div class="flex flex-col md:flex-row md:space-x-6 h-[calc(100vh-12rem)]">
            <div class="w-full md:w-1/3 bg-white p-4 rounded-lg shadow overflow-y-auto mb-4 md:mb-0">
                <h2 class="text-lg font-semibold mb-2 p-3">指南模块</h2>
                <div id="content-doc-list">${docListHtml}</div>
            </div>
            <div id="content-editor-area" class="w-full md:w-2/3 bg-white p-6 rounded-lg shadow overflow-y-auto flex items-center justify-center">
                <p class="text-slate-500 text-center">
                    <i data-lucide="arrow-left" class="mx-auto h-10 w-10 text-gray-300 mb-2"></i>
                    请从左侧选择一个文档进行编辑
                </p>
            </div>
        </div>
    `;
}

/**
 * 渲染用户管理视图
 * @returns {Promise<string>}
 */
export async function renderUserManagement() {
    if (!Auth.isAdminOrHigher()) return `<p>权限不足</p>`;
    const users = await API.getAllUsers();
    
    const userRows = users.map(user => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3"><img src="https://ui-avatars.com/api/?name=${user.nickname}&background=random" class="h-10 w-10 rounded-full"></td>
            <td class="p-3 font-medium">${user.nickname}</td>
            <td class="p-3 text-gray-600">${user.email}</td>
            <td class="p-3">
                <select data-user-id="${user._id}" class="role-select form-input py-1 px-2 text-sm" ${!Auth.isSuperAdmin() ? 'disabled' : ''}>
                    <option value="user" ${user.role === 'user' || !user.role ? 'selected' : ''}>普通用户</option>
                    <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>内容编辑</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理员</option>
                    <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>超级管理员</option>
                </select>
            </td>
        </tr>
    `).join('');

    return `
        <h1 class="text-3xl font-bold text-slate-800 mb-6">用户管理</h1>
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="w-full text-sm text-left">
                <thead class="bg-gray-50 text-xs text-gray-700 uppercase">
                    <tr>
                        <th class="p-3">头像</th>
                        <th class="p-3">昵称</th>
                        <th class="p-3">邮箱</th>
                        <th class="p-3">角色 ${!Auth.isSuperAdmin() ? '<span class="text-xs font-normal normal-case text-gray-500">(仅超级管理员可修改)</span>' : ''}</th>
                    </tr>
                </thead>
                <tbody>${userRows}</tbody>
            </table>
        </div>
    `;
}

/**
 * 渲染反馈中心视图
 * @returns {Promise<string>}
 */
export async function renderFeedbackCenter() {
    const feedbacks = await API.getFeedback();
    if (feedbacks.length === 0) {
        return `<h1 class="text-3xl font-bold text-slate-800 mb-6">反馈中心</h1><p>暂无反馈信息。</p>`;
    }

    const feedbackCards = feedbacks.map(fb => `
        <div class="bg-white p-4 rounded-lg shadow border-l-4 ${fb.status === 'resolved' ? 'border-green-500' : 'border-yellow-500'}">
            <p class="text-gray-800">${fb.content}</p>
            <div class="text-xs text-gray-500 mt-3 pt-3 border-t flex justify-between items-center">
                <span>联系方式: ${fb.contact || '未提供'}</span>
                <span>${new Date(fb.submittedAt).toLocaleString()}</span>
                <select data-feedback-id="${fb._id}" class="feedback-status-select form-input py-1 px-2 text-xs">
                    <option value="new" ${!fb.status || fb.status === 'new' ? 'selected' : ''}>未处理</option>
                    <option value="resolved" ${fb.status === 'resolved' ? 'selected' : ''}>已解决</option>
                </select>
            </div>
        </div>
    `).join('');

    return `
        <h1 class="text-3xl font-bold text-slate-800 mb-6">反馈中心</h1>
        <div class="space-y-4">${feedbackCards}</div>
    `;
}
