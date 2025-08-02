/**
 * @file 用户认证模块 (Authentication) - SDK V3 密码功能升级版
 * @description 负责处理所有用户登录、注册、状态管理和UI更新的逻辑。
 * @version 11.0.0
 * @changes
 * - [重构] handlePasswordResetSubmit: 完全重写，以实现应用内密码重置流程。
 * - [新增] handleSendResetCode: 为“忘记密码”场景添加独立的发送验证码功能。
 * - [新增] handleChangePasswordSubmit: 为已登录用户实现安全的密码修改功能。
 * - [新增] handleProfileViewChange: 扩展此函数以管理个人中心内的三种视图切换（查看、编辑资料、修改密码）。
 * - [注释] 增加了大量中文注释，解释新功能的工作流程。
 */

import { app, auth, db } from '../cloudbase.js';
import * as modals from './modals.js';

// --- 模块级变量 ---
let dom;
let userDocWatcher = null;

const DEFAULT_AVATAR_FILE_ID = 'cloud://jou-campus-guide-9f57jf08ece0812.6a6f-jou-campus-guide-9f57jf08ece0812-1367578274/images/默认头像/avatar_01.png';
const FALLBACK_AVATAR_URL = 'https://6a6f-jou-campus-guide-9f57jf08ece0812-1367578274.tcb.qcloud.la/images/%E9%BB%98%E8%AE%A4%E5%A4%B4%E5%83%8F/avatar_01.png?sign=94c44b27adbfba6ce88b12e681b9d360&t=1753770580';

let avatarUrlCache = new Map();
let verificationData = {
    register: null,
    reset: null
};

// --- 核心函数 (无变化) ---

export async function getAvatarUrl(fileID) {
    const finalFileID = fileID && fileID.startsWith('cloud://') ? fileID : DEFAULT_AVATAR_FILE_ID;
    if (avatarUrlCache.has(finalFileID)) {
        return avatarUrlCache.get(finalFileID);
    }
    try {
        const { fileList } = await app.getTempFileURL({ fileList: [finalFileID] });
        if (fileList[0] && fileList[0].tempFileURL) {
            const tempUrl = fileList[0].tempFileURL;
            avatarUrlCache.set(finalFileID, tempUrl);
            return tempUrl;
        }
        console.warn("getTempFileURL调用成功，但未返回有效的URL for:", finalFileID);
        return FALLBACK_AVATAR_URL;
    } catch (error) {
        console.error(`获取头像(${finalFileID})临时URL失败:`, error);
        if (finalFileID !== DEFAULT_AVATAR_FILE_ID) {
            return await getAvatarUrl(DEFAULT_AVATAR_FILE_ID);
        }
        return FALLBACK_AVATAR_URL;
    }
}

export async function getAvatarUrls(fileIDs) {
    const urlMap = {};
    const uncachedFileIDs = fileIDs.filter(id => !avatarUrlCache.has(id));
    fileIDs.forEach(id => {
        if (avatarUrlCache.has(id)) {
            urlMap[id] = avatarUrlCache.get(id);
        }
    });
    if (uncachedFileIDs.length === 0) {
        return urlMap;
    }
    try {
        const { fileList } = await app.getTempFileURL({ fileList: uncachedFileIDs });
        fileList.forEach(item => {
            if (item.tempFileURL) {
                urlMap[item.fileID] = item.tempFileURL;
                avatarUrlCache.set(item.fileID, item.tempFileURL);
            } else {
                console.warn("批量获取中，未能返回有效URL for:", item.fileID);
                urlMap[item.fileID] = FALLBACK_AVATAR_URL;
            }
        });
        return urlMap;
    } catch (error) {
        console.error("批量获取头像URL失败:", error);
        uncachedFileIDs.forEach(id => {
            if (!urlMap[id]) urlMap[id] = FALLBACK_AVATAR_URL;
        });
        return urlMap;
    }
}

export function cacheAuthDOMElements(domElements) {
    dom = domElements;
}

export async function initializeProfileEditor(campusData) {
    if (!dom || !campusData) {
        console.error("无法初始化个人中心编辑器：DOM或校区数据未提供。");
        return;
    }
    const yearSelect = dom.editEnrollmentYear;
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const year = currentYear - i;
        yearSelect.add(new Option(`${year}年`, year));
    }
    const majorSelect = dom.editMajor;
    const allMajors = [...new Set(campusData.colleges.flatMap(c => c.majors))];
    allMajors.sort((a, b) => a.localeCompare(b, 'zh-CN'));
    majorSelect.innerHTML = '<option value="">未选择</option>';
    allMajors.forEach(major => majorSelect.add(new Option(major, major)));
    const avatarGrid = dom.avatarSelectionGrid;
    avatarGrid.innerHTML = '';
    const selectableAvatarFileIDs = [
        'cloud://jou-campus-guide-9f57jf08ece0812.6a6f-jou-campus-guide-9f57jf08ece0812-1367578274/images/默认头像/avatar_01.png',
    ];
    const urlMap = await getAvatarUrls(selectableAvatarFileIDs);
    selectableAvatarFileIDs.forEach(fileID => {
        const displayUrl = urlMap[fileID];
        if (displayUrl) {
            const avatarOption = document.createElement('div');
            avatarOption.className = 'avatar-option p-1';
            avatarOption.dataset.avatar = fileID;
            avatarOption.innerHTML = `<img src="${displayUrl}" alt="头像选项" class="w-full h-full rounded-full object-cover" onerror="this.src='${FALLBACK_AVATAR_URL}'">`;
            avatarGrid.appendChild(avatarOption);
        }
    });
}

// --- 认证核心逻辑 (已升级至 V3) ---

export function listenForAuthStateChanges(callback) {
    auth.onLoginStateChanged(async (loginState) => {
        if (userDocWatcher) {
            userDocWatcher.close();
            userDocWatcher = null;
        }
        if (loginState) {
            const isAnonymous = loginState.user && loginState.user.isAnonymous;
            if (isAnonymous) {
                console.log("访客已通过匿名方式登录。");
                await updateUIWithUserData(null);
                callback(null);
                return;
            }
            try {
                const currentUser = loginState.user;
                const userDocRef = db.collection('users').doc(currentUser.uid);
                const userDoc = await userDocRef.get();
                let userData;

                if (userDoc.data && userDoc.data.length > 0) {
                    userData = { ...currentUser, ...userDoc.data[0] };
                } else {
                    const emailParts = currentUser.email.split('@');
                    const studentId = emailParts.length > 0 ? emailParts[0] : null;
                    const newUserDoc = {
                        _id: currentUser.uid,
                        studentId: studentId,
                        nickname: `用户_${currentUser.uid.slice(0, 6)}`,
                        email: currentUser.email,
                        avatar: DEFAULT_AVATAR_FILE_ID,
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
                console.error("获取或创建用户数据库文档时出错:", dbError);
                await updateUIWithUserData(null);
                callback(null);
            }
        } else {
            console.log("无用户登录，正在尝试匿名登录...");
            try {
                await auth.signInAnonymously();
            } catch (err) {
                console.error("匿名登录失败:", err);
                if(dom && dom.showToast) {
                    dom.showToast('无法连接服务，请检查网络后重试', 'error');
                }
                await updateUIWithUserData(null);
                callback(null);
            }
        }
    });
}

async function updateUIWithUserData(userData) {
    if (!dom) return;
    const isLoggedIn = !!userData;
    dom.loginPromptBtn.classList.toggle('hidden', isLoggedIn);
    dom.userProfileBtn.classList.toggle('hidden', !isLoggedIn);
    if (isLoggedIn) {
        const avatarUrl = await getAvatarUrl(userData.avatar);
        dom.sidebarAvatar.src = avatarUrl;
        dom.sidebarAvatar.onerror = () => { dom.sidebarAvatar.src = FALLBACK_AVATAR_URL; };
        dom.profileAvatarLarge.src = avatarUrl;
        dom.profileAvatarLarge.onerror = () => { dom.profileAvatarLarge.src = FALLBACK_AVATAR_URL; };
        dom.sidebarNickname.textContent = userData.nickname || '设置昵称';
        dom.profileNickname.textContent = userData.nickname || '待设置';
        dom.profileEmail.textContent = userData.email || '未绑定邮箱';
        const majorYearText = (userData.enrollmentYear && userData.major) ? `${userData.enrollmentYear}级 ${userData.major}` : '待设置';
        dom.profileMajorYear.querySelector('span').textContent = majorYearText;
        dom.profileBio.textContent = userData.bio || '这个人很懒，什么都没留下...';
    } else {
        const defaultUrl = await getAvatarUrl(DEFAULT_AVATAR_FILE_ID);
        dom.sidebarAvatar.src = defaultUrl;
        dom.sidebarAvatar.onerror = () => { dom.sidebarAvatar.src = FALLBACK_AVATAR_URL; };
        dom.sidebarNickname.textContent = '登录 / 注册';
    }
}

export async function handleLoginSubmit(e) {
    e.preventDefault();
    const button = dom.loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = '登录中...';
    const emailPrefix = dom.loginForm.email_prefix.value;
    const password = dom.loginForm.password.value;
    const email = `${emailPrefix}@jou.edu.cn`;
    try {
        await auth.signIn({ username: email, password: password });
        dom.showToast('登录成功！', 'success');
        modals.hideAuthModal(() => { handleProfileViewChange('view'); modals.showProfileModal(); });
    } catch (error) {
        dom.showToast(`登录失败: ${error.message || '请检查学号和密码'}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = '登 录';
    }
}

export async function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!verificationData.register || !verificationData.register.verification_token) {
        dom.showToast('请先发送并正确输入邮箱验证码', 'error');
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
        await auth.signUp({
            email: email,
            password: password,
            verification_code: verificationCode,
            verification_token: verificationData.register.verification_token
        });
        dom.showToast('注册成功！已自动登录。', 'success');
        verificationData.register = null;
        modals.hideAuthModal(() => { handleProfileViewChange('view'); modals.showProfileModal(); });
    } catch (error) {
        dom.showToast(`注册失败: ${error.message || '请检查信息是否正确'}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = '注 册';
    }
}

/**
 * @description 统一处理发送验证码的逻辑，并启动倒计时。
 * @param {string} email - 目标邮箱地址。
 * @param {HTMLButtonElement} btn - 点击的按钮元素。
 * @param {'register' | 'reset'} type - 验证码类型。
 */
async function sendVerificationCode(email, btn, type) {
    btn.disabled = true;
    btn.textContent = '发送中...';
    try {
        const verificationResult = await auth.getVerification({ email: email });
        verificationData[type] = { verification_id: verificationResult.verification_id };
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
        dom.showToast(`发送失败: ${error.message}`, 'error');
        btn.disabled = false;
        btn.textContent = '发送验证码';
    }
}

export async function handleSendVerificationCode() {
    const emailPrefix = dom.registerForm.email_prefix.value;
    if (!emailPrefix) {
        dom.showToast('请先输入学号', 'error');
        return;
    }
    const email = `${emailPrefix}@jou.edu.cn`;
    await sendVerificationCode(email, dom.sendVerificationCodeBtn, 'register');
}

export async function handleVerifyCode() {
    const verificationCode = dom.registerForm.verification_code.value;
    if (!verificationData.register || !verificationData.register.verification_id || !verificationCode) {
        return;
    }
    try {
        const verifyResult = await auth.verify({
            verification_id: verificationData.register.verification_id,
            verification_code: verificationCode
        });
        verificationData.register.verification_token = verifyResult.verification_token;
        console.log("注册验证码验证成功");
    } catch(error) {
        dom.showToast(`验证码错误: ${error.message}`, 'error');
        verificationData.register = null;
    }
}

export async function handleLogout() {
    try {
        await auth.signOut();
        avatarUrlCache.clear();
        dom.showToast('已成功退出登录', 'info');
    } catch (error) {
        dom.showToast('退出登录失败', 'error');
    }
}

// [新增] 为忘记密码表单发送验证码
export async function handleSendResetCode() {
    const emailPrefix = dom.resetPasswordForm.email_prefix.value;
    if (!emailPrefix) {
        dom.showToast('请先输入学号', 'error');
        return;
    }
    const email = `${emailPrefix}@jou.edu.cn`;
    await sendVerificationCode(email, dom.sendResetCodeBtn, 'reset');
}

// [重构] 实现应用内密码重置
export async function handlePasswordResetSubmit(e) {
    e.preventDefault();
    const button = dom.resetPasswordForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = '重置中...';

    const emailPrefix = dom.resetPasswordForm.email_prefix.value;
    const email = `${emailPrefix}@jou.edu.cn`;
    const verificationCode = dom.resetPasswordForm.verification_code.value;
    const newPassword = dom.resetPasswordForm.new_password.value;

    if (!verificationData.reset || !verificationData.reset.verification_id) {
        dom.showToast('请先发送并获取验证码', 'error');
        button.disabled = false;
        button.textContent = '确认重置';
        return;
    }
    if (newPassword.length < 8) {
        dom.showToast('新密码长度至少需要8位', 'error');
        button.disabled = false;
        button.textContent = '确认重置';
        return;
    }

    try {
        // 步骤1: 验证验证码以获取 token
        const verifyResult = await auth.verify({
            verification_id: verificationData.reset.verification_id,
            verification_code: verificationCode
        });

        // 步骤2: 使用获取到的 token 和新密码重置
        await auth.resetPassword({
            email: email,
            new_password: newPassword,
            verification_token: verifyResult.verification_token,
        });

        dom.showToast('密码重置成功！', 'success');
        verificationData.reset = null;
        handleAuthViewChange('login'); // 跳转回登录界面
    } catch (error) {
        dom.showToast(`重置失败: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = '确认重置';
    }
}

// [新增] 处理已登录用户的密码修改
export async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    const button = dom.savePasswordBtn;
    button.disabled = true;
    button.textContent = '保存中...';

    const currentPassword = dom.currentPasswordInput.value;
    const newPassword = dom.newPasswordInput.value;
    const confirmPassword = dom.confirmNewPasswordInput.value;

    if (newPassword !== confirmPassword) {
        dom.showToast('两次输入的新密码不一致', 'error');
        button.disabled = false;
        button.textContent = '保存更改';
        return;
    }
    if (newPassword.length < 8) {
        dom.showToast('新密码长度至少需要8位', 'error');
        button.disabled = false;
        button.textContent = '保存更改';
        return;
    }

    try {
        // 步骤1: 使用当前密码获取 sudo_token (高级操作许可)
        const sudoRes = await auth.sudo({
            password: currentPassword
        });

        // 步骤2: 使用 sudo_token 设置新密码
        await auth.setPassword({
            new_password: newPassword,
            sudo_token: sudoRes.sudo_token
        });

        dom.showToast('密码修改成功！', 'success');
        handleProfileViewChange('view'); // 返回个人中心查看页

    } catch (error) {
        dom.showToast(`修改失败: ${error.message || '请检查当前密码是否正确'}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = '保存更改';
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
        const selectedAvatarFileID = dom.avatarSelectionGrid.querySelector('.avatar-option.selected')?.dataset.avatar;
        const updatedData = {
            nickname: dom.editNickname.value.trim(),
            bio: dom.editBio.value.trim(),
            enrollmentYear: dom.editEnrollmentYear.value,
            major: dom.editMajor.value,
        };
        if (selectedAvatarFileID) {
            updatedData.avatar = selectedAvatarFileID;
        }
        await db.collection('users').doc(currentUserData._id).update(updatedData);
        dom.showToast('个人资料更新成功！', 'success');
        handleProfileViewChange('view');
    } catch (error) {
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
        opt.classList.remove('selected');
    });
    const selectedOption = dom.avatarSelectionGrid.querySelector(`[data-avatar="${userData.avatar}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    } else {
        const firstOption = dom.avatarSelectionGrid.querySelector('.avatar-option');
        if (firstOption) firstOption.classList.add('selected');
    }
}

export function handleAuthViewChange(viewName) {
    if (!dom) return;
    dom.loginFormContainer.classList.toggle('hidden', viewName !== 'login');
    dom.registerFormContainer.classList.toggle('hidden', viewName !== 'register');
    dom.resetPasswordFormContainer.classList.toggle('hidden', viewName !== 'reset');
    const titles = { login: '欢迎回来', register: '创建新账户', reset: '重置你的密码' };
    dom.authTitle.textContent = titles[viewName];
}

// [修改] 扩展此函数以支持三种视图
export function handleProfileViewChange(viewName) {
    if (!dom) return;
    dom.profileViewContainer.classList.toggle('hidden', viewName !== 'view');
    dom.profileEditContainer.classList.toggle('hidden', viewName !== 'edit');
    dom.profileChangePasswordContainer.classList.toggle('hidden', viewName !== 'changePassword');

    const titles = {
        view: '个人中心',
        edit: '编辑个人资料',
        changePassword: '修改密码'
    };
    dom.profileTitle.textContent = titles[viewName];

    // 如果是切换到修改密码视图，清空输入框
    if (viewName === 'changePassword') {
        dom.profileChangePasswordContainer.reset();
    }
}
