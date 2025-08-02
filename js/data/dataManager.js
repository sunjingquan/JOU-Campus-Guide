/**
 * @file 数据管理器 (Data Manager) - 已集成学号
 * @description 负责所有与后端数据库的交互。
 * @version 8.0.0
 * @changes
 * - [功能新增] addRating 函数现在可以接收并存储 studentId。
 */

import { db } from '../cloudbase.js';

// 定义数据集合的名称
const GUIDE_COLLECTION = 'guide_data';
const CAMPUS_COLLECTION = 'campus_data';
const STUDY_MATERIALS_COLLECTION = 'study_materials';
const RATINGS_COLLECTION = 'ratings';


/**
 * 从 CloudBase 异步获取原始的 guide_data
 * @returns {Promise<Array>} 返回一个按 'order' 字段排序后的导航类别数组
 */
export async function getGuideData() {
  try {
    console.log(`DataManager: 正在从 CloudBase 集合 '${GUIDE_COLLECTION}' 拉取原始数据...`);
    const result = await db.collection(GUIDE_COLLECTION).orderBy('order', 'asc').get();
    console.log("DataManager: 成功拉取 guide_data:", result.data);
    return result.data;
  } catch (error) {
    console.error(`DataManager: 拉取 '${GUIDE_COLLECTION}' 数据失败!`, error);
    return [];
  }
}

/**
 * [最终防御性优化] 从 CloudBase 异步获取所有校区数据。
 * @returns {Promise<Object>} 返回一个包含所有校区信息的聚合对象。
 */
export async function getCampusData() {
  try {
    console.log(`DataManager: 正在从 '${CAMPUS_COLLECTION}' 集合中查找包含 'colleges' 字段的聚合文档...`);

    const result = await db.collection(CAMPUS_COLLECTION)
      .where({
        colleges: db.command.exists(true)
      })
      .get();

    if (result.data && result.data.length > 0) {
      const finalData = result.data[0];
      if (result.data.length > 1) {
          console.warn(`DataManager 警告: '${CAMPUS_COLLECTION}' 集合中发现了多个包含 'colleges' 字段的文档。`);
      }
      console.log("DataManager: 成功拉取到聚合的 campus_data:", finalData);
      return finalData;
    } else {
      console.error(`DataManager: 关键错误! 未能在 '${CAMPUS_COLLECTION}' 集合中找到任何包含 'colleges' 字段的文档。`);
      return { campuses: [], dormitories: [], canteens: [], colleges: [] };
    }
  } catch (error) {
    console.error(`DataManager: 拉取 '${CAMPUS_COLLECTION}' 数据时发生严重错误!`, error);
    return { campuses: [], dormitories: [], canteens: [], colleges: [] };
  }
}


// ===================================================================================
// --- 学习资料共享中心的数据操作函数 ---
// ===================================================================================

/**
 * 从 study_materials 集合获取资料列表。
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
        console.log(`DataManager: 正在拉取资料列表，筛选条件:`, options);
        let query = db.collection(STUDY_MATERIALS_COLLECTION);
        const _ = db.command;

        const whereClauses = [];

        if (college) {
            whereClauses.push({ college: college });
        }
        if (major) {
            whereClauses.push({ major: major });
        }
        if (searchTerm) {
            const regex = db.RegExp({ regexp: searchTerm, options: 'i' });
            whereClauses.push(_.or([
                { courseName: regex },
                { teacher: regex }
            ]));
        }

        if (whereClauses.length > 0) {
            query = query.where(_.and(whereClauses));
        }

        const result = await query.orderBy(sortBy, order).get();
        console.log("DataManager: 成功拉取资料列表:", result.data);
        return result.data;
    } catch (error) {
        console.error(`DataManager: 拉取 '${STUDY_MATERIALS_COLLECTION}' 数据失败!`, error);
        return [];
    }
}

/**
 * 向数据库中添加一条新的学习资料记录。
 */
export async function addMaterial(materialData) {
    try {
        console.log(`DataManager: 正在向 '${STUDY_MATERIALS_COLLECTION}' 添加新资料...`, materialData);
        return await db.collection(STUDY_MATERIALS_COLLECTION).add({
            ...materialData,
            createdAt: db.serverDate()
        });
    } catch (error) {
        console.error(`DataManager: 添加新资料失败!`, error);
        throw error;
    }
}

/**
 * 增加指定资料文档的下载次数。
 */
export async function incrementDownloadCount(docId) {
    try {
        console.log(`DataManager: 正在为文档 ${docId} 增加下载次数...`);
        const _ = db.command;
        await db.collection(STUDY_MATERIALS_COLLECTION).doc(docId).update({
            downloadCount: _.inc(1)
        });
    } catch (error) {
        console.error(`DataManager: 更新文档 ${docId} 下载次数失败!`, error);
    }
}

/**
 * 检查用户是否已经对某个资料评过分（查票）。
 */
export async function checkIfUserRated(materialId, userId) {
    try {
        const result = await db.collection(RATINGS_COLLECTION)
            .where({
                materialId: materialId,
                userId: userId
            })
            .count();
        
        return result.total > 0;
    } catch (error) {
        console.error("DataManager: 检查用户评分记录失败!", error);
        return true; 
    }
}

/**
 * [修改] 向 ratings 集合中添加一条新的评分记录（投票）。
 * @param {string} materialId - 资料的文档ID。
 * @param {string} userId - 评分用户的ID。
 * @param {string} studentId - [新增] 评分用户的学号。
 * @param {number} rating - 用户给出的评分 (1-5的整数)。
 * @returns {Promise<object>} 返回 CloudBase 的操作结果。
 */
export async function addRating(materialId, userId, studentId, rating) {
    try {
        console.log(`DataManager: 用户 ${userId} (学号: ${studentId}) 正在为资料 ${materialId} 评分为 ${rating} 星...`);
        return await db.collection(RATINGS_COLLECTION).add({
            materialId,
            userId,
            studentId, // [新增] 将学号存入评分记录
            rating,
            createdAt: db.serverDate()
        });
    } catch (error) {
        console.error(`DataManager: 添加新评分失败!`, error);
        throw error;
    }
}
