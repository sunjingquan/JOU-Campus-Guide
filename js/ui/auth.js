/**
 * @file 认证与用户界面模块
 * @description 该模块处理所有与用户认证（登录、注册、登出、重置密码）、
 * 用户资料管理以及根据认证状态更新UI相关的功能。
 */

import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
    doc,
    setDoc,
    updateDoc,
    onSnapshot,
    Timestamp
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

import { auth, db } from '../firebase.js';

// --- 全局常量 ---
const AVATARS = Array.from({ length: 1 }, (_, i) => `avatar_${String(i + 1).padStart(2, '0')}`);
const getAvatarUrl = (id) => id ? `../images/默认头像/${id}.png` : '../images/默认头像/avatar_01.png';

// --- DOM 元素缓存 ---
let domElements = {};

/**
 * 缓存此模块需要操作的DOM元素。
 * @param {Object} elements - 从主应用传入的DOM元素对象。
 */
export function cacheAuthDOMElements(elements) {
    domElements = elements;
}

/**
 * 更新UI以反映当前用户的登录状态和数据。
 * @param {Object|null} userData - 从Firestore获取的用户数据，如果未登录则为null。
 */
function updateUIWithUserData(userData) {
    if (userData) {
        // 已登录状态
        domElements.loginPromptBtn.classList.add('hidden');
        domElements.userProfileBtn.classList.remove('hidden');

        const avatarUrl = getAvatarUrl(userData.avatarId);
        domElements.sidebarAvatar.src = avatarUrl;
        domElements.sidebarNickname.textContent = userData.nickname || '未设置昵称';

        domElements.profileAvatarLarge.src = avatarUrl;
        domElements.profileNickname.textContent = userData.nickname || '未设置昵称';
        domElements.profileEmail.textContent = userData.email || '';
        domElements.profileMajorYear.textContent = `${userData.enrollmentYear || '未知年份'}级 ${userData.major || '未设置专业'}`;
        domElements.profileBio.textContent = userData.bio || '这位同学很酷，什么都还没留下~';
    } else {
        // 未登录状态
        domElements.loginPromptBtn.classList.remove('hidden');
        domElements.userProfileBtn.classList.add('hidden');
    }
}

/**
 * 监听Firebase认证状态的改变。
 * @param {function} onStateChange - 状态改变时的回调函数，接收 user a's data 作为参数。
 */
export function listenForAuthStateChanges(onStateChange) {
    let unsubscribeUserDoc = null;

    onAuthStateChanged(auth, (user) => {
        if (unsubscribeUserDoc) {
            unsubscribeUserDoc(); // 取消上一个用户的文档监听
            unsubscribeUserDoc = null;
        }

        if (user && user.emailVerified) {
            const userDocRef = doc(db, "users", user.uid);
            unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
                let userData = null;
                if (docSnap.exists()) {
                    userData = docSnap.data();
                } else {
                    console.log("在Firestore中找不到该用户的文档!");
                }
                updateUIWithUserData(userData);
                onStateChange(userData); // 通知主应用状态已改变
            }, (error) => {
                console.error("监听用户文档时出错:", error);
                updateUIWithUserData(null);
                onStateChange(null);
            });
        } else {
            updateUIWithUserData(null);
            onStateChange(null);
        }
    });
}

/**
 * 处理用户注册逻辑。
 * @param {Event} e - 表单提交事件。
 * @param {function} showToast - 用于显示提示消息的函数。
 * @param {function} hideAuthModal - 用于关闭认证模态框的函数。
 */
export async function handleRegisterSubmit(e, showToast, hideAuthModal) {
    e.preventDefault();
    const emailPrefix = domElements.registerForm.email_prefix.value;
    const password = domElements.registerForm.password.value;

    if (!emailPrefix) {
        showToast("请输入你的学号！", "error");
        return;
    }
    const email = emailPrefix + '@jou.edu.cn';

    if (password.length < 8) {
        showToast("密码长度不能少于8位！", "error");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const newUserDoc = {
            email: user.email,
            nickname: "萌新" + emailPrefix.slice(-4),
            bio: "这位同学很酷，什么都还没留下~",
            avatarId: AVATARS[Math.floor(Math.random() * AVATARS.length)],
            major: "",
            enrollmentYear: new Date().getFullYear(),
            joinDate: Timestamp.fromDate(new Date())
        };
        await setDoc(doc(db, "users", user.uid), newUserDoc);

        await sendEmailVerification(user);
        showToast("注册成功！验证邮件已发送，请查收。", "success");
        hideAuthModal();

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            showToast("该邮箱已被注册！", "error");
        } else {
            showToast("注册失败：" + error.message, "error");
        }
    }
}

/**
 * 处理用户登录逻辑。
 * @param {Event} e - 表单提交事件。
 * @param {function} showToast - 用于显示提示消息的函数。
 * @param {function} hideAuthModal - 用于关闭认证模态框的函数。
 */
export async function handleLoginSubmit(e, showToast, hideAuthModal) {
    e.preventDefault();
    const emailPrefix = domElements.loginForm.email_prefix.value;
    const password = domElements.loginForm.password.value;

    if (!emailPrefix) {
        showToast("请输入你的学号！", "error");
        return;
    }
    const email = emailPrefix + '@jou.edu.cn';

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (user.emailVerified) {
            showToast("登录成功！", "success");
            hideAuthModal();
        } else {
            showToast("请先前往邮箱完成验证再登录。", "info");
            await signOut(auth);
        }
    } catch (error) {
        showToast("登录失败：学号或密码错误。", "error");
    }
}

/**
 * 处理密码重置逻辑。
 * @param {Event} e - 表单提交事件。
 * @param {function} showToast - 用于显示提示消息的函数。
 * @param {function} switchAuthView - 用于切换认证视图的函数。
 */
export async function handlePasswordResetSubmit(e, showToast, switchAuthView) {
    e.preventDefault();
    const emailPrefix = domElements.resetPasswordForm.email_prefix.value;
    if (!emailPrefix) {
        showToast("请输入你的学号！", "error");
        return;
    }
    const email = emailPrefix + '@jou.edu.cn';

    try {
        await sendPasswordResetEmail(auth, email);
        showToast("密码重置邮件已发送，请查收。", "success");
        switchAuthView('login');
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            showToast("发送失败：该邮箱尚未注册。", "error");
        } else {
            showToast("发送失败：" + error.message, "error");
        }
    }
}

/**
 * 处理用户登出逻辑。
 * @param {function} showToast - 用于显示提示消息的函数。
 * @param {function} hideProfileModal - 用于关闭用户中心模态框的函数。
 */
export async function handleLogout(showToast, hideProfileModal) {
    try {
        await signOut(auth);
        hideProfileModal();
        showToast("已成功退出登录。", "info");
    } catch (error) {
        showToast("退出失败：" + error.message, "error");
    }
}

/**
 * 填充用户资料编辑表单。
 * @param {Object} currentUserData - 当前用户的资料。
 */
export function populateProfileEditForm(currentUserData) {
    if (!currentUserData) return;

    domElements.avatarSelectionGrid.innerHTML = AVATARS.map(id => `
        <img src="${getAvatarUrl(id)}" data-avatar-id="${id}" class="avatar-option w-12 h-12" alt="[头像${id}]">
    `).join('');

    const currentAvatar = domElements.avatarSelectionGrid.querySelector(`[data-avatar-id="${currentUserData.avatarId}"]`);
    if (currentAvatar) {
        currentAvatar.classList.add('selected');
    }

    domElements.editNickname.value = currentUserData.nickname || '';
    domElements.editBio.value = currentUserData.bio || '';
    domElements.editEnrollmentYear.value = currentUserData.enrollmentYear || new Date().getFullYear();
    domElements.editMajor.value = currentUserData.major || '';
}

/**
 * 处理保存用户资料的逻辑。
 * @param {Event} e - 点击事件。
 * @param {Object} currentUserData - 当前用户的旧资料。
 * @param {function} showToast - 用于显示提示消息的函数。
 * @param {function} switchProfileView - 用于切换用户中心视图的函数。
 */
export async function handleProfileSave(e, currentUserData, showToast, switchProfileView) {
    e.preventDefault();
    if (!auth.currentUser) return;

    domElements.saveProfileBtn.disabled = true;
    domElements.saveProfileBtn.innerHTML = `<span class="loader-small"></span> 保存中...`;

    const selectedAvatar = domElements.avatarSelectionGrid.querySelector('.selected');
    const updatedData = {
        nickname: domElements.editNickname.value.trim(),
        bio: domElements.editBio.value.trim(),
        avatarId: selectedAvatar ? selectedAvatar.dataset.avatarId : currentUserData.avatarId,
        enrollmentYear: parseInt(domElements.editEnrollmentYear.value),
        major: domElements.editMajor.value
    };

    try {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userDocRef, updatedData);
        showToast("资料更新成功！", "success");
        switchProfileView('view');
    } catch (error) {
        console.error("更新资料时出错:", error);
        showToast("资料更新失败，请稍后再试。", "error");
    } finally {
        domElements.saveProfileBtn.disabled = false;
        domElements.saveProfileBtn.innerHTML = `保存更改`;
    }
}
