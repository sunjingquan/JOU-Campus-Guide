/**
 * @file API 模块 (api.js)
 * @description 封装所有与 CloudBase 数据库的交互，为上层逻辑提供清晰、统一的数据接口。
 */
import { db } from '../cloudbase.js';

/**
 * 获取所有指南文档
 * @returns {Promise<Array>}
 */
export async function getGuideDocs() {
    try {
        const res = await db.collection('guide_data').orderBy('order', 'asc').limit(100).get();
        return res.data;
    } catch (error) {
        console.error("API: 获取指南文档失败", error);
        throw error; // 将错误向上抛出，让调用者处理
    }
}

/**
 * 更新指定的指南文档
 * @param {string} docId - 文档的 _id
 * @param {object} data - 要更新的数据对象
 * @returns {Promise<object>}
 */
export async function updateGuideDoc(docId, data) {
    try {
        // 更新时不需要传入 _id
        const updateData = { ...data };
        delete updateData._id;
        return await db.collection('guide_data').doc(docId).update(updateData);
    } catch (error) {
        console.error(`API: 更新文档 ${docId} 失败`, error);
        throw error;
    }
}

/**
 * 获取所有用户列表
 * @returns {Promise<Array>}
 */
export async function getAllUsers() {
    try {
        const res = await db.collection('users').limit(100).get();
        return res.data;
    } catch (error) {
        console.error("API: 获取用户列表失败", error);
        throw error;
    }
}

/**
 * 更新指定用户的角色
 * @param {string} userId - 用户的 _id
 * @param {string} newRole - 新角色
 * @returns {Promise<object>}
 */
export async function updateUserRole(userId, newRole) {
    try {
        return await db.collection('users').doc(userId).update({ role: newRole });
    } catch (error) {
        console.error(`API: 更新用户 ${userId} 角色失败`, error);
        throw error;
    }
}

/**
 * 获取所有反馈信息
 * @returns {Promise<Array>}
 */
export async function getFeedback() {
    try {
        const res = await db.collection('feedback').orderBy('submittedAt', 'desc').limit(100).get();
        return res.data;
    } catch (error) {
        console.error("API: 获取反馈列表失败", error);
        throw error;
    }
}

/**
 * 更新反馈的状态
 * @param {string} feedbackId - 反馈的 _id
 * @param {string} status - 新状态
 * @returns {Promise<object>}
 */
export async function updateFeedbackStatus(feedbackId, status) {
    try {
        return await db.collection('feedback').doc(feedbackId).update({ status });
    } catch (error) {
        console.error(`API: 更新反馈 ${feedbackId} 状态失败`, error);
        throw error;
    }
}
