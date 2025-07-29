/**
 * @file 数据管理器 (Data Manager) - 纯数据源版
 * @description 本模块是应用所有数据的唯一出入口。
 * 它直接从 CloudBase 云数据库获取最原始、纯净的 JSON 数据，不进行任何格式转换。
 * @version 4.2.0 - 针对多文档数据结构进行最终修复
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
 * [最终修复] 从 CloudBase 异步获取所有 campus_data。
 * 此版本根据用户提供的真实数据结构，采用精确的多文档合并策略。
 * @returns {Promise<Object>} 返回一个包含所有校区信息的聚合对象
 */
export async function getCampusData() {
  try {
    console.log(`DataManager: 正在从 CloudBase 集合 '${CAMPUS_COLLECTION}' 拉取原始数据...`);
    // 1. 从数据库获取所有相关文档
    const result = await db.collection(CAMPUS_COLLECTION).get();
    const allDocs = result.data;
    console.log("DataManager: 成功从 CloudBase 拉取所有 campus_data 文档:", allDocs);

    // 2. [修复] 初始化一个空容器，并直接遍历所有文档进行数据合并。
    // 这种方法最直接，完全匹配你的数据存储方式：每个文档包含一个顶级键（如 "colleges"）。
    const finalData = {
        campuses: [],
        dormitories: [],
        canteens: [],
        colleges: []
    };

    allDocs.forEach(doc => {
        // 检查每个文档，如果它包含我们需要的键，就将其对应的数组直接赋值给 finalData。
        // 这种赋值方法比之前的 .push(...spread) 更稳妥、更清晰。
        if (doc.campuses) {
            finalData.campuses = doc.campuses;
        }
        if (doc.dormitories) {
            finalData.dormitories = doc.dormitories;
        }
        if (doc.canteens) {
            finalData.canteens = doc.canteens;
        }
        if (doc.colleges) {
            finalData.colleges = doc.colleges;
        }
    });
    
    console.log("DataManager: 已将所有 campus_data 文档聚合为:", finalData);
    return finalData;

  } catch (error) {
    console.error(`DataManager: 拉取 '${CAMPUS_COLLECTION}' 数据失败!`, error);
    // 出错时返回一个空的结构，防止后续代码报错
    return { campuses: [], dormitories: [], canteens: [], colleges: [] };
  }
}
