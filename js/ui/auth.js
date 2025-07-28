/**
 * @file 用户认证模块 (Authentication) - 定制重构版
 * @description 负责处理所有用户登录、注册、状态管理和UI更新的逻辑。
 * 本版本基于你的原始代码进行重构，保留了学号邮箱验证流程，并修复了DOM加载时序问题。
 * @version 3.2.0 - 修复了数据库查询和UI更新的边界情况错误
 */

// 【关键修复】直接导入在 cloudbase.js 中导出的 auth 和 db 实例
import { auth, db } from '../cloudbase.js';

// --- 模块级变量 ---

// 用于存储从 main.js 传入的、已缓存的DOM元素对象。
let dom;

// 用于存储数据库的实时监听器，以便在用户登出时能够关闭它。
let userDocWatcher = null;

const DEFAULT_AVATAR = 'images/默认头像/avatar_01.png';

// --- 核心函数 ---

/**
 * 缓存从 main.js 传入的 DOM 元素对象。
 * @param {object} domElements - 由 main.js 的 _cacheDOMElements 函数创建的对象。
 */
export function cacheAuthDOMElements(domElements) {
    dom = domElements;
}

/**
 * 监听用户登录状态的改变。
 * @param {function} callback - 当用户状态改变时调用的回调函数，会传入完整的用户数据。
 */
export function listenForAuthStateChanges(callback) {
    // onLoginStateChanged 是一个持久的监听器
    auth.onLoginStateChanged(async (loginState) => {
        console.log('[Auth 状态] 登录状态发生改变:', loginState);

        // 1. 安全地关闭旧的监听器
        if (userDocWatcher) {
            console.log('[Auth 状态] 关闭旧的数据库监听器。');
            userDocWatcher.close();
            userDocWatcher = null;
        }

        // 2. 【关键修复】使用更严格的检查，确保 loginState 和 loginState.uid 都存在
        if (loginState && loginState.uid) {
            try {
                const userDocRef = db.collection('users').doc(loginState.uid);
                const userDoc = await userDocRef.get();
                let userData;

                if (userDoc.data && userDoc.data.length > 0) {
                    userData = { ...loginState, ...userDoc.data[0] };
                } else {
                    console.log(`[DB] 未找到 UID: ${loginState.uid} 的文档，将为其创建新文档。`);
                    const newUserDoc = {
                        _id: loginState.uid,
                        nickname: `用户_${loginState.uid.slice(0, 6)}`,
                        email: loginState.email,
                        avatar: DEFAULT_AVATAR,
                        bio: '这个人很懒，什么都没留下...',
                        enrollmentYear: new Date().getFullYear().toString(),
                        major: ''
                    };
                    await userDocRef.set(newUserDoc);
                    userData = { ...loginState, ...newUserDoc };
                }

                updateUIWithUserData(userData);
                callback(userData);

                userDocWatcher = userDocRef.watch({
                    onChange: (snapshot) => {
                        if (snapshot.docs && snapshot.docs.length > 0) {
                            const updatedData = { ...loginState, ...snapshot.docs[0] };
                            updateUIWithUserData(updatedData);
                            callback(updatedData);
                        }
                    },
                    onError: (error) => console.error("[DB 监听] 实时监听器出错:", error)
                });

            } catch (dbError) {
                console.error('[Auth 状态] 处理数据库时发生严重错误:', dbError);
                updateUIWithUserData(null);
                callback(null);
            }
        } else {
            console.log('[Auth 状态] 用户未登录或 loginState 无效。');
            updateUIWithUserData(null);
            callback(null);
        }
    });
}

/**
 * 根据用户数据更新UI。
 * @param {object | null} userData - 用户数据对象，如果未登录则为 null。
 */
function updateUIWithUserData(userData) {
    // 【关键修复】在函数开头先检查 dom 对象是否存在
    if (!dom) {
        console.error("Auth DOM 元素尚未缓存! UI无法更新。");
        return;
    }

    if (userData) {
        // 用户已登录
        // 【关键修复】为每个DOM操作添加安全检查
        if (dom.loginPromptBtn) dom.loginPromptBtn.classList.add('hidden');
        if (dom.userProfileBtn) dom.userProfileBtn.classList.remove('hidden');
        
        const avatarUrl = userData.avatar || DEFAULT_AVATAR;
        if (dom.sidebarAvatar) dom.sidebarAvatar.src = avatarUrl;
        if (dom.profileAvatarLarge) dom.profileAvatarLarge.src = avatarUrl;
        if (dom.sidebarNickname) dom.sidebarNickname.textContent = userData.nickname || '设置昵称';
        if (dom.profileNickname) dom.profileNickname.textContent = userData.nickname || '待设置';
        if (dom.profileEmail) dom.profileEmail.textContent = userData.email || '未绑定邮箱';
        
        const majorYearText = (userData.enrollmentYear && userData.major) 
            ? `${userData.enrollmentYear}级 ${userData.major}` 
            : '待设置';
        if (dom.profileMajorYear) dom.profileMajorYear.textContent = majorYearText;
        if (dom.profileBio) dom.profileBio.textContent = userData.bio || '这个人很懒，什么都没留下...';

    } else {
        // 用户未登录
        // 【关键修复】为每个DOM操作添加安全检查
        if (dom.loginPromptBtn) dom.loginPromptBtn.classList.remove('hidden');
        if (dom.userProfileBtn) dom.userProfileBtn.classList.add('hidden');
        if (dom.sidebarAvatar) dom.sidebarAvatar.src = DEFAULT_AVATAR;
        if (dom.sidebarNickname) dom.sidebarNickname.textContent = '点击登录';
    }
}

// --- 事件处理函数 ---

/**
 * 处理用户注册。
 * @param {Event} e - 表单提交事件。
 */
export async function handleRegisterSubmit(e) {
    e.preventDefault();
    const email = dom.registerForm.email.value;
    const password = dom.registerForm.password.value;
    const confirmPassword = dom.registerForm['confirm-password'].value;

    if (password !== confirmPassword) {
        dom.showToast('两次输入的密码不一致', 'error');
        return;
    }

    try {
        await auth.signUpWithEmailAndPassword(email, password);
        dom.showToast('注册成功！已自动登录。', 'success');
        // 假设 main.js 会处理模态框的关闭
    } catch (error) {
        console.error("注册失败:", error);
        const message = error.code === 'auth/email-already-in-use' ? '该邮箱已被注册' : '注册失败，请稍后再试';
        dom.showToast(message, 'error');
    }
}

/**
 * 处理用户登录。
 * @param {Event} e - 表单提交事件。
 */
export async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = dom.loginForm.email.value;
    const password = dom.loginForm.password.value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        dom.showToast('登录成功！', 'success');
    } catch (error) {
        console.error("登录失败:", error);
        dom.showToast('登录失败，请检查邮箱和密码', 'error');
    }
}

/**
 * 处理用户登出。
 */
export async function handleLogout() {
    try {
        await auth.signOut();
        dom.showToast('已成功退出登录', 'info');
    } catch (error) {
        console.error("退出登录失败:", error);
        dom.showToast('退出登录失败', 'error');
    }
}

/**
 * 处理密码重置。
 * @param {Event} e - 表单提交事件。
 */
export async function handlePasswordResetSubmit(e) {
    e.preventDefault();
    const email = dom.resetPasswordForm.email.value;
    try {
        await auth.sendPasswordResetEmail(email);
        dom.showToast('密码重置邮件已发送，请检查您的邮箱', 'success');
        handleAuthViewChange('login');
    } catch (error) {
        console.error("密码重置失败:", error);
        dom.showToast('邮件发送失败，请检查邮箱地址', 'error');
    }
}

/**
 * 处理个人资料保存。
 * @param {Event} e - 点击事件。
 * @param {object} currentUserData - 当前用户的完整数据。
 */
export async function handleProfileSave(e, currentUserData) {
    e.preventDefault();
    if (!currentUserData) {
        dom.showToast('请先登录', 'error');
        return;
    }

    const updatedData = {
        nickname: dom.editNickname.value,
        bio: dom.editBio.value,
        enrollmentYear: dom.editEnrollmentYear.value,
        major: dom.editMajor.value,
        avatar: document.querySelector('.avatar-option.selected')?.dataset.avatar || currentUserData.avatar
    };

    try {
        await db.collection('users').doc(currentUserData.uid).update(updatedData);
        dom.showToast('个人资料更新成功！', 'success');
        handleProfileViewChange('view');
    } catch (error) {
        console.error('更新个人资料失败:', error);
        dom.showToast('资料更新失败，请稍后再试', 'error');
    }
}

/**
 * 控制认证模态框内部的视图切换（登录/注册/重置密码）。
 * @param {string} viewName - 'login', 'register', 或 'reset'。
 */
export function handleAuthViewChange(viewName) {
    if (!dom) return;
    if(dom.loginFormContainer) dom.loginFormContainer.classList.toggle('hidden', viewName !== 'login');
    if(dom.registerFormContainer) dom.registerFormContainer.classList.toggle('hidden', viewName !== 'register');
    if(dom.resetPasswordFormContainer) dom.resetPasswordFormContainer.classList.toggle('hidden', viewName !== 'reset');

    const titles = {
        login: '登录',
        register: '注册',
        reset: '重置密码'
    };
    if(dom.authTitle) dom.authTitle.textContent = titles[viewName];
}

/**
 * 控制个人资料模态框内部的视图切换（查看/编辑）。
 * @param {string} viewName - 'view' 或 'edit'。
 */
export function handleProfileViewChange(viewName) {
    if (!dom) return;
    if(dom.profileViewContainer) dom.profileViewContainer.classList.toggle('hidden', viewName !== 'view');
    if(dom.profileEditContainer) dom.profileEditContainer.classList.toggle('hidden', viewName !== 'edit');
}
