/**
 * @file 数据管理器 (Data Manager)
 * @description 本模块是应用所有数据的唯一出入口。
 * 它直接从 CloudBase 云数据库获取数据，并将其处理成统一的格式，供应用使用。
 * @version 2.0.0 - 云端直连版
 */

// 从 cloudbase.js 模块导入数据库实例
import { db } from '../cloudbase.js';

// 定义数据库中的集合名称，方便统一管理
const GUIDE_COLLECTION = 'guide_data';
const CAMPUS_COLLECTION = 'campus_data';

/**
 * 从 CloudBase 异步获取导航和页面结构数据 (guide_data)
 * @returns {Promise<Array>} 返回一个按 'order' 字段排序后的导航类别数组
 */
export async function getGuideData() {
  try {
    console.log(`DataManager: 正在从 CloudBase 集合 '${GUIDE_COLLECTION}' 拉取数据...`);
    // .orderBy('order', 'asc') 确保我们拿到的导航分类是按预设顺序排列的
    const result = await db.collection(GUIDE_COLLECTION).orderBy('order', 'asc').get();
    
    // CloudBase V2 SDK 返回的数据在 result.data 中
    console.log("DataManager: 成功从 CloudBase 拉取 guide_data:", result.data);
    return result.data;

  } catch (error) {
    console.error(`DataManager: 从 CloudBase 拉取 '${GUIDE_COLLECTION}' 数据失败!`, error);
    // 如果发生错误，返回一个空数组，防止整个应用崩溃
    return []; 
  }
}

/**
 * 从 CloudBase 异步获取所有校区相关数据 (campus_data) 并进行合并
 * @returns {Promise<Object>} 返回一个包含所有校区信息的聚合对象
 */
export async function getCampusData() {
  try {
    console.log(`DataManager: 正在从 CloudBase 集合 '${CAMPUS_COLLECTION}' 拉取数据...`);
    const result = await db.collection(CAMPUS_COLLECTION).get();
    const allDocs = result.data;
    console.log("DataManager: 成功从 CloudBase 拉取所有 campus_data 文档:", allDocs);

    // 初始化一个我们期望的最终数据结构
    const mergedData = {
        campuses: [],
        dormitories: [],
        canteens: [],
        colleges: []
    };

    // 遍历从数据库返回的每一个文档
    allDocs.forEach(doc => {
        // 检查每个文档中包含哪种类型的数据，并将其合并到我们最终的 mergedData 对象中
        if (doc.campuses) mergedData.campuses.push(...doc.campuses);
        if (doc.dormitories) mergedData.dormitories.push(...doc.dormitories);
        if (doc.canteens) mergedData.canteens.push(...doc.canteens);
        if (doc.colleges) mergedData.colleges.push(...doc.colleges);
    });
    
    console.log("DataManager: 已将所有 campus_data 文档合并为:", mergedData);
    return mergedData;

  } catch (error) {
    console.error(`DataManager: 从 CloudBase 拉取 '${CAMPUS_COLLECTION}' 数据失败!`, error);
    // 如果发生错误，返回一个空的骨架结构，保证应用的稳定性
    return { campuses: [], dormitories: [], canteens: [], colleges: [] };
  }
}
