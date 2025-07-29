/**
 * @file 数据管理器 (Data Manager) - 优化版
 * @description 本模块是应用所有数据的唯一出入口。
 * 它直接从 CloudBase 云数据库获取最原始、纯净的 JSON 数据。
 * @version 5.2.0 - 采用 where 查询，精准获取包含 'colleges' 字段的聚合文档，增强了容错性。
 */

import { db } from '../cloudbase.js';

// 定义数据集合的名称
const GUIDE_COLLECTION = 'guide_data';
const CAMPUS_COLLECTION = 'campus_data';

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
