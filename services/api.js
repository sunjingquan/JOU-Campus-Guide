/**
 * @file API 服务层
 * @description 该模块是应用与后端 CloudBase 通信的唯一出口。
 * 它封装了所有数据库查询、文件操作等异步请求，为上层组件提供清晰、语义化的接口。
 */

// 从 cloudbase.js 模块中导入已经初始化好的数据库实例和数据库命令对象
import { db } from '../js/cloudbase.js';

// --- 定义数据集合的常量，方便管理和维护 ---
const GUIDE_COLLECTION = 'guide_data';
const CAMPUS_COLLECTION = 'campus_data';
const STUDY_MATERIALS_COLLECTION = 'study_materials';
const RATINGS_COLLECTION = 'ratings';
const FEEDBACK_COLLECTION = 'feedback'; // 新增：为反馈功能准备

// =============================================================================
// --- 核心数据获取 API ---
// =============================================================================

/**
 * 获取完整的指南数据。
 * @returns {Promise<Array>} 返回按 'order' 字段排序后的导航类别数组。
 */
export async function getGuideData() {
  try {
    console.log(`API Service: Fetching from '${GUIDE_COLLECTION}'...`);
    const result = await db.collection(GUIDE_COLLECTION).orderBy('order', 'asc').get();
    console.log("API Service: Successfully fetched guide_data:", result.data);
    return result.data;
  } catch (error) {
    console.error(`API Service: Failed to fetch '${GUIDE_COLLECTION}'!`, error);
    // 在真实应用中，这里可以抛出错误，由上层统一处理错误UI
    return [];
  }
}

/**
 * 获取所有校区的聚合数据。
 * @returns {Promise<Object>} 返回一个包含所有校区信息的聚合对象。
 */
export async function getCampusData() {
  try {
    console.log(`API Service: Fetching aggregated data from '${CAMPUS_COLLECTION}'...`);
    const result = await db.collection(CAMPUS_COLLECTION).where({ colleges: db.command.exists(true) }).get();

    if (result.data && result.data.length > 0) {
      if (result.data.length > 1) {
        console.warn(`API Service Warning: Found multiple documents with 'colleges' field in '${CAMPUS_COLLECTION}'. Using the first one.`);
      }
      const finalData = result.data[0];
      console.log("API Service: Successfully fetched aggregated campus_data:", finalData);
      return finalData;
    } else {
      console.error(`API Service Critical Error: No document with 'colleges' field found in '${CAMPUS_COLLECTION}'.`);
      // 返回一个默认的空结构，防止应用崩溃
      return { campuses: [], dormitories: [], canteens: [], colleges: [] };
    }
  } catch (error) {
    console.error(`API Service: A critical error occurred while fetching '${CAMPUS_COLLECTION}'!`, error);
    return { campuses: [], dormitories: [], canteens: [], colleges: [] };
  }
}

// =============================================================================
// --- 学习资料模块 API ---
// =============================================================================

/**
 * 根据筛选和排序条件，获取学习资料列表。
 * @param {object} [options={}] - 筛选条件对象。
 * @returns {Promise<Array>} 返回资料列表数组。
 */
export async function getMaterials(options = {}) {
    const {
        college = '',
        major = '',
        searchTerm = '',
        sortBy = 'createdAt',
        order = 'desc'
    } = options;

    try {
        console.log(`API Service: Fetching materials with options:`, options);
        let query = db.collection(STUDY_MATERIALS_COLLECTION);
        const _ = db.command;

        // 构建动态查询条件
        const whereClauses = [];
        if (college) whereClauses.push({ college: college });
        if (major) whereClauses.push({ major: major });
        if (searchTerm) {
            const regex = db.RegExp({ regexp: searchTerm, options: 'i' });
            whereClauses.push(_.or([{ courseName: regex }, { teacher: regex }]));
        }

        if (whereClauses.length > 0) {
            query = query.where(_.and(whereClauses));
        }

        const result = await query.orderBy(sortBy, order).get();
        console.log("API Service: Successfully fetched materials:", result.data);
        return result.data;
    } catch (error) {
        console.error(`API Service: Failed to fetch '${STUDY_MATERIALS_COLLECTION}'!`, error);
        return [];
    }
}

/**
 * 向数据库中添加一条新的学习资料记录。
 * @param {object} materialData - 待添加的资料数据。
 * @returns {Promise<object>} 返回 CloudBase 的操作结果。
 */
export async function addMaterial(materialData) {
    try {
        console.log(`API Service: Adding new material to '${STUDY_MATERIALS_COLLECTION}'...`, materialData);
        return await db.collection(STUDY_MATERIALS_COLLECTION).add({
            ...materialData,
            createdAt: db.serverDate(), // 在服务端生成时间戳
            downloadCount: 0,
            rating: 0,
            ratingCount: 0,
        });
    } catch (error) {
        console.error(`API Service: Failed to add new material!`, error);
        throw error; // 抛出错误，让调用方处理
    }
}

/**
 * 增加指定资料文档的下载次数。
 * @param {string} docId - 资料的文档ID。
 */
export async function incrementDownloadCount(docId) {
    try {
        console.log(`API Service: Incrementing download count for doc ${docId}...`);
        const _ = db.command;
        await db.collection(STUDY_MATERIALS_COLLECTION).doc(docId).update({
            downloadCount: _.inc(1)
        });
    } catch (error) {
        console.error(`API Service: Failed to update download count for doc ${docId}!`, error);
    }
}

// =============================================================================
// --- 评分系统 API ---
// =============================================================================

/**
 * 检查用户是否已经对某个资料评过分。
 * @param {string} materialId - 资料的文档ID。
 * @param {string} userId - 评分用户的ID。
 * @returns {Promise<boolean>} 如果已评分则返回 true，否则返回 false。
 */
export async function checkIfUserRated(materialId, userId) {
    try {
        const result = await db.collection(RATINGS_COLLECTION).where({ materialId, userId }).count();
        return result.total > 0;
    } catch (error) {
        console.error("API Service: Failed to check user rating!", error);
        return true; // 查询失败时，为防止重复刷分，默认返回true
    }
}

/**
 * 添加一条新的评分记录。
 * @param {string} materialId - 资料的文档ID。
 * @param {string} userId - 评分用户的ID。
 * @param {string} studentId - 评分用户的学号。
 * @param {number} rating - 用户给出的评分 (1-5的整数)。
 * @returns {Promise<object>} 返回 CloudBase 的操作结果。
 */
export async function addRating(materialId, userId, studentId, rating) {
    try {
        console.log(`API Service: User ${userId} (Student ID: ${studentId}) is rating material ${materialId} with ${rating} stars.`);
        return await db.collection(RATINGS_COLLECTION).add({
            materialId,
            userId,
            studentId,
            rating,
            createdAt: db.serverDate()
        });
    } catch (error) {
        console.error(`API Service: Failed to add new rating!`, error);
        throw error;
    }
}

// =============================================================================
// --- 反馈 API ---
// =============================================================================

/**
 * 提交一条新的用户反馈。
 * @param {object} feedbackData - 包含反馈内容、联系方式等信息的对象。
 * @returns {Promise<object>} 返回 CloudBase 的操作结果。
 */
export async function submitFeedback(feedbackData) {
    try {
        console.log(`API Service: Submitting feedback...`, feedbackData);
        return await db.collection(FEEDBACK_COLLECTION).add({
            ...feedbackData,
            submittedAt: db.serverDate(),
            userAgent: navigator.userAgent, // 自动记录浏览器信息
        });
    } catch (error) {
        console.error(`API Service: Failed to submit feedback!`, error);
        throw error;
    }
}
