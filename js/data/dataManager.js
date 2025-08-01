/**
 * @file 数据管理器 (Data Manager) - 优化版
 * @description 本模块是应用所有数据的唯一出入口。
 * 它直接从 CloudBase 云数据库获取最原始、纯净的 JSON 数据。
 * @version 5.3.1
 * @changes
 * - [错误修复] 修复了 `rateMaterial` 函数中因在事务内使用 `_.inc()` 操作符而导致的 INVALID_ACTION 错误。
 * - [功能新增] 添加 rateMaterial 函数，用于处理用户对学习资料的评分。
 */

import { db } from '../cloudbase.js';

// 定义数据集合的名称
const GUIDE_COLLECTION = 'guide_data';
const CAMPUS_COLLECTION = 'campus_data';
const STUDY_MATERIALS_COLLECTION = 'study_materials';


/**
 * 从 CloudBase 异步获取原始的 guide_data
 * @returns {Promise<Array>} 返回一个按 'order' 字段排序后的导航类别数组
 */
export async function getGuideData() {
  try {
    console.log(`DataManager: 正在从 CloudBase 集合 '${GUIDE_COLLECTION}' 拉取原始数据...`);
    // 使用 orderBy 对获取的文档进行排序
    const result = await db.collection(GUIDE_COLLECTION).orderBy('order', 'asc').get();
    console.log("DataManager: 成功拉取 guide_data:", result.data);
    return result.data;
  } catch (error) {
    console.error(`DataManager: 拉取 '${GUIDE_COLLECTION}' 数据失败!`, error);
    // 如果获取失败，返回一个空数组以防止应用崩溃
    return [];
  }
}

/**
 * [最终防御性优化] 从 CloudBase 异步获取所有校区数据。
 * 此版本使用 where 查询精准查找那个聚合了所有信息的文档。
 * @returns {Promise<Object>} 返回一个包含所有校区信息的聚合对象。
 */
export async function getCampusData() {
  try {
    console.log(`DataManager: 正在从 '${CAMPUS_COLLECTION}' 集合中查找包含 'colleges' 字段的聚合文档...`);

    // [新策略] 使用 where 查询，确保我们只获取包含 'colleges' 字段的文档。
    // 这是为了防止加载到旧的、不完整的数据文档。
    const result = await db.collection(CAMPUS_COLLECTION)
      .where({
        colleges: db.command.exists(true) // 只匹配存在 'colleges' 字段的文档
      })
      .get();

    // 检查是否成功获取到了数据，并且至少有一个匹配的文档
    if (result.data && result.data.length > 0) {
      // CloudBase V2 SDK 的 get() 返回一个数组，我们取第一个元素
      const finalData = result.data[0];

      // 添加一个警告，以防集合中有多个符合条件的文档，这可能表示配置错误
      if (result.data.length > 1) {
          console.warn(`DataManager 警告: '${CAMPUS_COLLECTION}' 集合中发现了多个包含 'colleges' 字段的文档。系统将使用第一个。建议清理多余的文档。`);
      }

      console.log("DataManager: 成功拉取到聚合的 campus_data:", finalData);
      return finalData;
    } else {
      // 如果数据库中没有找到任何符合条件的文档，打印错误并返回空结构
      console.error(`DataManager: 关键错误! 未能在 '${CAMPUS_COLLECTION}' 集合中找到任何包含 'colleges' 字段的文档。请检查数据库，确保那个完整的聚合文档存在并且包含了 'colleges' 数组。`);
      return { campuses: [], dormitories: [], canteens: [], colleges: [] };
    }
  } catch (error) {
    // 如果网络或数据库发生其他错误，也返回空结构
    console.error(`DataManager: 拉取 '${CAMPUS_COLLECTION}' 数据时发生严重错误!`, error);
    return { campuses: [], dormitories: [], canteens: [], colleges: [] };
  }
}


// ===================================================================================
// --- 学习资料共享中心的数据操作函数 ---
// ===================================================================================

/**
 * [已升级] 从 CloudBase 获取学习资料列表，支持复杂的筛选和排序。
 * @param {object} options - 查询选项对象。
 * @param {string} [options.college] - 按学院筛选。
 * @param {string} [options.major] - 按专业筛选。
 * @param {string} [options.searchTerm] - 按课程名或教师名搜索的关键词。
 * @param {string} [options.sortBy='createdAt'] - 用于排序的字段名。
 * @param {string} [options.order='desc'] - 排序顺序 ('desc' 或 'asc')。
 * @returns {Promise<Array>} 返回一个资料对象数组。
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

        // 使用一个数组来存储所有的 where 条件
        const whereClauses = [];

        if (college) {
            whereClauses.push({ college: college });
        }
        if (major) {
            whereClauses.push({ major: major });
        }
        if (searchTerm) {
            // 使用正则表达式进行模糊搜索，'i' 表示不区分大小写
            const regex = db.RegExp({ regexp: searchTerm, options: 'i' });
            // 使用 _.or 来匹配课程名或教师名
            whereClauses.push(_.or([
                { courseName: regex },
                { teacher: regex }
            ]));
        }

        // 如果有筛选条件，则应用 where 查询
        if (whereClauses.length > 0) {
            // 使用 _.and 将所有条件组合起来
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
 * @param {object} materialData - 包含所有资料信息的对象。
 * @returns {Promise<object>} 返回 CloudBase 的操作结果。
 */
export async function addMaterial(materialData) {
    try {
        console.log(`DataManager: 正在向 '${STUDY_MATERIALS_COLLECTION}' 添加新资料...`, materialData);
        return await db.collection(STUDY_MATERIALS_COLLECTION).add({
            ...materialData,
            // 使用服务器时间，确保时间戳的准确性
            createdAt: db.serverDate()
        });
    } catch (error) {
        console.error(`DataManager: 添加新资料失败!`, error);
        // 抛出错误，以便上层调用者可以捕获并处理
        throw error;
    }
}

/**
 * 增加指定资料文档的下载次数。
 * @param {string} docId - 要更新的资料在数据库中的文档 ID。
 * @returns {Promise<void>}
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
        // 此处不抛出错误，因为即使计数失败，也不应中断用户的下载流程
    }
}

/**
 * 更新指定资料的评分。
 * @param {string} docId - 要评分的资料文档ID。
 * @param {number} userRating - 用户给出的评分 (1-5的整数)。
 * @returns {Promise<{newRating: number, newRatingCount: number}>} 返回包含新平均分和新评分人数的对象。
 */
export async function rateMaterial(docId, userRating) {
    const materialRef = db.collection(STUDY_MATERIALS_COLLECTION).doc(docId);

    try {
        console.log(`DataManager: 用户正在为文档 ${docId} 评分为 ${userRating} 星...`);
        
        // 使用事务来确保读取和写入的原子性，防止并发问题
        const transactionResult = await db.runTransaction(async transaction => {
            const doc = await transaction.get(materialRef);
            if (!doc.data || doc.data.length === 0) {
                throw new Error("文档不存在");
            }

            const material = doc.data[0];
            const oldTotalScore = (material.rating || 0) * (material.ratingCount || 0);
            const newRatingCount = (material.ratingCount || 0) + 1;
            const newTotalScore = oldTotalScore + userRating;
            const newRating = newTotalScore / newRatingCount;

            // ===================================================================================
            // [错误修复] 在事务中，直接使用计算出的新值进行更新，而不是使用 _.inc()
            // ===================================================================================
            await transaction.update(materialRef, {
                rating: newRating,
                ratingCount: newRatingCount
            });

            // 事务需要返回一个值，这个值将作为 runTransaction 的结果
            return { newRating, newRatingCount };
        });

        console.log(`DataManager: 文档 ${docId} 评分成功。新平均分: ${transactionResult.newRating}, 总评分人数: ${transactionResult.newRatingCount}`);
        return transactionResult;

    } catch (error) {
        console.error(`DataManager: 更新文档 ${docId} 评分失败!`, error);
        // 抛出错误，让上层调用者知道操作失败
        throw error;
    }
}
