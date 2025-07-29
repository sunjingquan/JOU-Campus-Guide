/**
 * @file CloudBase 模块
 * @description 该模块负责初始化 CloudBase 应用，并导出 auth 和 db 实例，供其他模块使用。
 * 这样做可以确保 CloudBase 只在应用中被初始化一次。
 */

// 1. 从你的 CloudBase 控制台获取最新的 SDK 引用地址并填入 index.html
// 2. 初始化 CloudBase，注意：这里使用正确的 `cloudbase` 对象
export const app = cloudbase.init({
    // 在下方填入你的真实环境 ID
    env: "jou-campus-guide-9f57jf08ece0812" 
});

// 3. 获取并导出认证和数据库服务实例
export const auth = app.auth();
export const db = app.database();

// 导出 CloudBase 的数据库命令对象，用于处理特殊字段类型（如时间戳）
export const _ = db.command;
