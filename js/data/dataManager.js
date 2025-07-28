/**
 * @file 数据管理器 (Data Manager) - 纯数据源版
 * @description 本模块是应用所有数据的唯一出入口。
 * 它直接从 CloudBase 云数据库获取最原始、纯净的 JSON 数据，不进行任何格式转换。
 * @version 4.0.0 - 最终简化版
 */

import { db } from '../cloudbase.js';

const GUIDE_COLLECTION = 'guide_data';
const CAMPUS_COLLECTION = 'campus_data';

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
 * 从 CloudBase 异步获取所有 campus_data 并进行聚合
 * @returns {Promise<Object>} 返回一个包含所有校区信息的聚合对象
 */
export async function getCampusData() {
  try {
    console.log(`DataManager: 正在从 CloudBase 集合 '${CAMPUS_COLLECTION}' 拉取原始数据...`);
    const result = await db.collection(CAMPUS_COLLECTION).get();
    const allDocs = result.data;
    console.log("DataManager: 成功从 CloudBase 拉取所有 campus_data 文档:", allDocs);

    const mergedData = {
        campuses: [],
        dormitories: [],
        canteens: [],
        colleges: []
    };

    allDocs.forEach(doc => {
        if (doc.campuses) mergedData.campuses.push(...doc.campuses);
        if (doc.dormitories) mergedData.dormitories.push(...doc.dormitories);
        if (doc.canteens) mergedData.canteens.push(...doc.canteens);
        if (doc.colleges) mergedData.colleges.push(...doc.colleges);
    });
    
    console.log("DataManager: 已将所有 campus_data 文档聚合为:", mergedData);
    return mergedData;
  } catch (error) {
    console.error(`DataManager: 拉取 '${CAMPUS_COLLECTION}' 数据失败!`, error);
    return { campuses: [], dormitories: [], canteens: [], colleges: [] };
  }
}
