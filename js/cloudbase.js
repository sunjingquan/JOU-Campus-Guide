/**
 * @file CloudBase 模块
 * @description 该模块负责初始化 CloudBase 应用，并导出 auth 和 db 实例，供其他模块使用。
 * 这样做可以确保 CloudBase 只在应用中被初始化一次。
 */

const unavailableError = new Error('CloudBase SDK 未加载，请检查网络连接或 SDK CDN 是否可访问。');

function rejectUnavailable() {
    return Promise.reject(unavailableError);
}

function createUnavailableDb() {
    const query = {
        where: () => query,
        orderBy: () => query,
        doc: () => query,
        get: rejectUnavailable,
        add: rejectUnavailable,
        set: rejectUnavailable,
        update: rejectUnavailable,
        count: rejectUnavailable,
        watch: () => {
            throw unavailableError;
        }
    };

    return {
        collection: () => query,
        serverDate: () => new Date(),
        RegExp: (options) => options,
        command: {
            exists: (value) => ({ $exists: value }),
            inc: (value) => ({ $inc: value }),
            and: (clauses) => ({ $and: clauses }),
            or: (clauses) => ({ $or: clauses })
        }
    };
}

function createUnavailableAuth() {
    return {
        onLoginStateChanged: (callback) => {
            setTimeout(() => callback(null), 0);
        },
        signInAnonymously: rejectUnavailable,
        signOut: rejectUnavailable,
        signIn: rejectUnavailable,
        signUp: rejectUnavailable,
        verify: rejectUnavailable,
        resetPassword: rejectUnavailable,
        sudo: rejectUnavailable,
        setPassword: rejectUnavailable,
        getVerification: rejectUnavailable
    };
}

function createUnavailableApp() {
    const fallbackDb = createUnavailableDb();
    const fallbackAuth = createUnavailableAuth();

    return {
        auth: () => fallbackAuth,
        database: () => fallbackDb,
        uploadFile: rejectUnavailable,
        getTempFileURL: rejectUnavailable
    };
}

// 1. 从你的 CloudBase 控制台获取最新的 SDK 引用地址并填入 index.html
// 2. 初始化 CloudBase；如果 SDK 无法加载，导出兜底对象，避免应用永久停在加载页
const cloudbaseSdk = window.cloudbase;

if (!cloudbaseSdk) {
    console.error(unavailableError.message);
}

export const app = cloudbaseSdk
    ? cloudbaseSdk.init({
        // 在下方填入你的真实环境 ID
        env: "jou-campus-guide-9f57jf08ece0812"
    })
    : createUnavailableApp();

// 3. 获取并导出认证和数据库服务实例
export const auth = app.auth();
export const db = app.database();

// 导出 CloudBase 的数据库命令对象，用于处理特殊字段类型（如时间戳）
export const _ = db.command;
