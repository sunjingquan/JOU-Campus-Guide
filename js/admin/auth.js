/**
 * @file 权限与用户管理模块 (auth.js)
 * @description 负责后台用户登录、权限验证和用户数据获取。
 */
import { auth, db } from '../cloudbase.js';

let currentUser = null;
let currentUserRole = 'user'; // 默认角色

/**
 * 初始化模块，检查登录状态并获取用户角色
 * @returns {Promise<boolean>} 如果用户已登录且有权访问后台，则返回 true
 */
export async function initialize() {
    const loginState = await auth.getLoginState();
    if (!loginState) {
        return false;
    }

    try {
        const userRes = await db.collection('users').doc(loginState.user.uid).get();
        if (userRes.data && userRes.data.length > 0) {
            currentUser = { ...loginState.user, ...userRes.data[0] };
            currentUserRole = currentUser.role || 'user';
            // 只有这三类角色可以访问后台
            return ['superadmin', 'admin', 'editor'].includes(currentUserRole);
        }
        return false;
    } catch (error) {
        console.error("Auth: 获取用户信息失败", error);
        return false;
    }
}

/**
 * 获取当前登录的用户对象
 * @returns {object | null}
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * 获取当前用户的角色
 * @returns {string} 'superadmin', 'admin', 'editor', 或 'user'
 */
export function getCurrentUserRole() {
    return currentUserRole;
}

/**
 * 检查当前用户是否为超级管理员
 * @returns {boolean}
 */
export function isSuperAdmin() {
    return currentUserRole === 'superadmin';
}

/**
 * 检查当前用户是否为管理员或更高级别
 * @returns {boolean}
 */
export function isAdminOrHigher() {
    return ['superadmin', 'admin'].includes(currentUserRole);
}

/**
 * 检查当前用户是否为内容编辑或更高级别
 * @returns {boolean}
 */
export function isEditorOrHigher() {
    return ['superadmin', 'admin', 'editor'].includes(currentUserRole);
}
