/**
 * @file 用户认证模块 (Authentication) - 定制重构版
 * @description 负责处理所有用户登录、注册、状态管理和UI更新的逻辑。
 * @version 4.1.0 - [优化] 新增批量获取头像URL的函数，提升性能。
 */

import { app, auth, db } from '../cloudbase.js';
import * as modals from './modals.js';

// --- 模块级变量 ---
let dom;
let userDocWatcher = null;
// [修复] 根据你的要求，将默认头像路径修改回中文名
const DEFAULT_AVATAR = 'images/默认头像/avatar_01.png'; 
let verificationData = null;

// --- 核心函数 ---

/**
 * 获取单个头像的真实URL。
 * @param {string} avatarPath - 数据库中存储的头像路径或fileID
 * @returns {Promise<string>} - 可供<img>标签直接使用的、有效的图片URL
 */
export async function getAvatarUrl(avatarPath) {
    if (!avatarPath) {
        return DEFAULT_AVATAR;
    }
    if (avatarPath.startsWith('cloud://')) {
        try {
            const { fileList } = await app.getTempFileURL({ fileList: [avatarPath] });
            if (fileList[0] && fileList[0].tempFileURL) {
                return fileList[0].tempFileURL;
            }
            console.warn("getTempFileURL调用成功，但未返回有效的URL for:", avatarPath);
            return DEFAULT_AVATAR;
        } catch (error) {
            console.error("获取头像临时URL失败:", error);
            return DEFAULT_AVATAR;
        }
    }
    return avatarPath;
}

/**
 * [新增] 批量获取一组头像的真实URL。
 * @param {Array<string>} fileIDs - 一个包含多个云端FileID的数组
 * @returns {Promise<Object>} - 一个映射对象，key是FileID，value是对应的公开URL
 */
export async function getAvatarUrls(fileIDs) {
    const urlMap = {};
    if (!fileIDs || fileIDs.length === 0) {
        return urlMap;
    }

    try {
        const { fileList } = await app.getTempFileURL({ fileList: fileIDs });
        fileList.forEach(item => {
            // 只有成功获取到URL的才加入map
            if (item.tempFileURL) {
                urlMap[item.fileID] = item.tempFileURL;
            } else {
                 console.warn("批量获取中，未能返回有效URL for:", item.fileID);
            }
        });
        return urlMap;
    } catch (error) {
        console.error("批量获取头像URL失败:", error);
        return {}; // 返回空对象，避免程序崩溃
    }
}


export function cacheAuthDOMElements(domElements) {
    dom = domElements;
}

export function listenForAuthStateChanges(callback) {
    auth.onLoginStateChanged(async (loginState) => {
        console.log('[Auth 状态] 登录状态发生改变:', loginState);
        if (userDocWatcher) {
            userDocWatcher.close();
            userDocWatcher = null;
        }

        if (loginState && loginState.user) {
            const currentUser = loginState.user;
            try {
                const userDocRef = db.collection('users').doc(currentUser.uid);
                const userDoc = await userDocRef.get();
                let userData;

                if (userDoc.data && userDoc.data.length > 0) {
                    userData = { ...currentUser, ...userDoc.data[0] };
                } else {
                    console.log(`[DB] 未找到 UID: ${currentUser.uid} 的文档，将为其创建新文档。`);
                    const newUserDoc = {
                        _id: currentUser.uid,
                        nickname: `用户_${currentUser.uid.slice(0, 6)}`,
                        email: currentUser.email,
                        avatar: DEFAULT_AVATAR,
                        bio: '这个人很懒，什么都没留下...',
                        enrollmentYear: new Date().getFullYear().toString(),
                        major: ''
                    };
                    await userDocRef.set(newUserDoc);
                    userData = { ...currentUser, ...newUserDoc };
                }

                await updateUIWithUserData(userData);
                callback(userData);

                userDocWatcher = userDocRef.watch({
                    onChange: async (snapshot) => {
                        if (snapshot.docs && snapshot.docs.length > 0) {
                            const updatedData = { ...currentUser, ...snapshot.docs[0] };
                            await updateUIWithUserData(updatedData);
                            callback(updatedData);
                        }
                    },
                    onError: (error) => console.error("[DB 监听] 实时监听器出错:", error)
                });

            } catch (dbError) {
                console.error('[Auth 状态] 处理数据库时发生严重错误:', dbError);
                await updateUIWithUserData(null);
                callback(null);
            }
        } else {
            console.log('[Auth 状态] 用户未登录或 loginState 无效。');
            await updateUIWithUserData(null);
            callback(null);
        }
    });
}

async function updateUIWithUserData(userData) {
    if (!dom) {
        console.error("Auth DOM 元素尚未缓存! UI无法更新。");
        return;
    }

    const isLoggedIn = !!userData;

    dom.loginPromptBtn.classList.toggle('hidden', isLoggedIn);
    dom.userProfileBtn.classList.toggle('hidden', !isLoggedIn);

    if (isLoggedIn) {
        const avatarUrl = await getAvatarUrl(userData.avatar);
        
        dom.sidebarAvatar.src = avatarUrl;
        dom.profileAvatarLarge.src = avatarUrl;

        dom.sidebarNickname.textContent = userData.nickname || '设置昵称';
        dom.profileNickname.textContent = userData.nickname || '待设置';
        dom.profileEmail.textContent = userData.email || '未绑定邮箱';
        const majorYearText = (userData.enrollmentYear && userData.major) ?
            `${userData.enrollmentYear}级 ${userData.major}` :
            '待设置';
        dom.profileMajorYear.querySelector('span').textContent = majorYearText;
        dom.profileBio.textContent = userData.bio || '这个人很懒，什么都没留下...';
    } else {
        dom.sidebarAvatar.src = DEFAULT_AVATAR;
        dom.sidebarNickname.textContent = '登录 / 注册';
    }
}

// --- 事件处理函数 ---

export async function handleLoginSubmit(e) {
    e.preventDefault();
    const button = dom.loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = '登录中...';

    const emailPrefix = dom.loginForm.email_prefix.value;
    const password = dom.loginForm.password.value;
    const email = `${emailPrefix}@jou.edu.cn`;

    try {
        await auth.signIn({
            username: email,
            password: password
        });

        dom.showToast('登录成功！', 'success');
        modals.hideAuthModal(() => {
            modals.showProfileModal();
        });
    } catch (error) {
        console.error("登录失败:", error);
        dom.showToast(`登录失败: ${error.message || '请检查学号和密码'}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = '登 录';
    }
}

export async function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!verificationData) {
        dom.showToast('请先发送并获取邮箱验证码', 'error');
        return;
    }
    const button = dom.registerForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = '注册中...';

    const emailPrefix = dom.registerForm.email_prefix.value;
    const password = dom.registerForm.password.value;
    const verificationCode = dom.registerForm.verification_code.value;
    const email = `${emailPrefix}@jou.edu.cn`;

    if (password.length < 8) {
        dom.showToast('密码长度至少需要8位', 'error');
        button.disabled = false;
        button.textContent = '注 册';
        return;
    }

    try {
        const verificationTokenRes = await auth.verify({
            verification_id: verificationData.verification_id,
            verification_code: verificationCode
        });

        await auth.signUp({
            email: email,
            verification_code: verificationCode,
            verification_token: verificationTokenRes.verification_token,
            password: password,
            username: email
        });

        dom.showToast('注册成功！已自动登录。', 'success');
        verificationData = null;
        modals.hideAuthModal(() => {
            modals.showProfileModal();
        });

    } catch (error) {
        console.error("注册失败:", error);
        dom.showToast(`注册失败: ${error.message || '请检查信息是否正确'}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = '注 册';
    }
}

export async function handleSendVerificationCode() {
    const emailPrefix = dom.registerForm.email_prefix.value;
    if (!emailPrefix) {
        dom.showToast('请先输入学号', 'error');
        return;
    }
    const email = `${emailPrefix}@jou.edu.cn`;
    const btn = dom.sendVerificationCodeBtn;
    btn.disabled = true;
    btn.textContent = '发送中...';

    try {
        verificationData = await auth.getVerification({
            email: email
        });
        dom.showToast('验证码已发送，请检查邮箱', 'success');

        let countdown = 60;
        btn.textContent = `${countdown}秒后重发`;
        const interval = setInterval(() => {
            countdown--;
            btn.textContent = `${countdown}秒后重发`;
            if (countdown <= 0) {
                clearInterval(interval);
                btn.disabled = false;
                btn.textContent = '发送验证码';
            }
        }, 1000);

    } catch (error) {
        console.error("验证码发送失败:", error);
        dom.showToast(`发送失败: ${error.message}`, 'error');
        btn.disabled = false;
        btn.textContent = '发送验证码';
    }
}


export async function handleLogout() {
    try {
        await auth.signOut();
        dom.showToast('已成功退出登录', 'info');
    } catch (error) {
        console.error("退出登录失败:", error);
        dom.showToast('退出登录失败', 'error');
    }
}

export async function handlePasswordResetSubmit(e) {
    e.preventDefault();
    const button = dom.resetPasswordForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = '发送中...';

    const emailPrefix = dom.resetPasswordForm.email_prefix.value;
    const email = `${emailPrefix}@jou.edu.cn`;

    try {
        await auth.sendPasswordResetEmail({
            email: email
        });
        dom.showToast('密码重置邮件已发送，请检查您的邮箱', 'success');
        handleAuthViewChange('login');
    } catch (error) {
        console.error("密码重置失败:", error);
        dom.showToast('邮件发送失败，请检查学号是否正确', 'error');
    } finally {
        button.disabled = false;
        button.textContent = '发送重置邮件';
    }
}


export async function handleProfileSave(e, currentUserData) {
    e.preventDefault();
    if (!currentUserData) {
        dom.showToast('请先登录', 'error');
        return;
    }
    const button = dom.saveProfileBtn;
    button.disabled = true;
    button.textContent = '保存中...';

    try {
        let newAvatarPath = currentUserData.avatar;

        const updatedData = {
            nickname: dom.editNickname.value.trim(),
            bio: dom.editBio.value.trim(),
            enrollmentYear: dom.editEnrollmentYear.value,
            major: dom.editMajor.value,
            avatar: dom.avatarSelectionGrid.querySelector('.avatar-option.selected')?.dataset.avatar || newAvatarPath
        };

        await db.collection('users').doc(currentUserData._id).update(updatedData);
        dom.showToast('个人资料更新成功！', 'success');
        handleProfileViewChange('view');

    } catch (error) {
        console.error('更新个人资料失败:', error);
        dom.showToast('资料更新失败，请稍后再试', 'error');
    } finally {
        button.disabled = false;
        button.textContent = '保存更改';
    }
}


export function populateProfileEditForm(userData) {
    if (!dom || !userData) return;
    dom.editNickname.value = userData.nickname || '';
    dom.editBio.value = userData.bio || '';
    dom.editEnrollmentYear.value = userData.enrollmentYear || '';
    dom.editMajor.value = userData.major || '';

    dom.avatarSelectionGrid.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.avatar === userData.avatar);
    });
}


export function handleAuthViewChange(viewName) {
    if (!dom) return;
    dom.loginFormContainer.classList.toggle('hidden', viewName !== 'login');
    dom.registerFormContainer.classList.toggle('hidden', viewName !== 'register');
    dom.resetPasswordFormContainer.classList.toggle('hidden', viewName !== 'reset');

    const titles = {
        login: '欢迎回来',
        register: '创建新账户',
        reset: '重置你的密码'
    };
    dom.authTitle.textContent = titles[viewName];
}

export function handleProfileViewChange(viewName) {
    if (!dom) return;
    dom.profileViewContainer.classList.toggle('hidden', viewName !== 'view');
    dom.profileEditContainer.classList.toggle('hidden', viewName !== 'edit');
}
