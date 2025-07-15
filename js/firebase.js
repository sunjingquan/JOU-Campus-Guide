/**
 * @file Firebase模块
 * @description 该模块负责初始化Firebase应用，并导出auth和db实例，供其他模块使用。
 * 这样做可以确保Firebase只在应用中被初始化一次。
 */

// 1. 从Firebase SDK中导入所需函数
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// 2. 你的Firebase项目配置信息
// 重要: 请将下面的占位符替换为你自己项目中的 firebaseConfig 对象！
const firebaseConfig = {
    apiKey: "FIREBASE_API_KEY",
    authDomain: "FIREBASE_AUTH_DOMAIN",
    projectId: "FIREBASE_PROJECT_ID",
    storageBucket: "FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
    appId: "FIREBASE_APP_ID",
    measurementId: "FIREBASE_MEASUREMENT_ID"
};

// 3. 初始化Firebase应用
const app = initializeApp(firebaseConfig);

// 4. 获取并导出认证和数据库服务实例
export const auth = getAuth(app);
export const db = getFirestore(app);
