/**
 * @file 用户认证模块 (Authentication) - 重构版 V2
 * @description 负责处理所有用户登录、注册、状态管理和UI更新的逻辑。
 * 个人中心编辑器的所有UI逻辑已全部内聚于此模块。
 * @version 6.0.0
 */

import { app, auth, db } from '../cloudbase.js';
import * as modals from './modals.js';

// --- 模块级变量 ---
let dom;
let userDocWatcher = null;

// !! 重要 !! 请将下面的值替换成你自己在 CloudBase 上传的 avatar_01.png 的真实 File ID。
const DEFAULT_AVATAR_FILE_ID = 'cloud://jou-campus-guide-9f57jf08ece0812.6a6f-jou-campus-guide-9f57jf08ece0812-1367578274/images/默认头像/avatar_01.png';
const FALLBACK_AVATAR_URL = 'https://6a6f-jou-campus-guide-9f57jf08ece0812-1367578274.tcb.qcloud.la/images/%E9%BB%98%E8%AE%A4%E5%A4%B4%E5%83%8F/avatar_01.png?sign=94c44b27adbfba6ce88b12e681b9d360&t=1753770580';

let avatarUrlCache = new Map();
let verificationData = null;

// --- 核心函数 ---

/**
 * 获取单个头像的URL，带缓存和多重后备。
 * @param {string} fileID - 数据库中存储的头像 File ID。
 * @returns {Promise<string>} - 可供<img>标签直接使用的、有效的图片URL。
 */
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

/**
 * 批量获取一组头像的真实URL，带缓存。
 * @param {Array<string>} fileIDs - 一个包含多个云端FileID的数组
 * @returns {Promise<Object>} - 一个映射对象，key是FileID，value是对应的公开URL
 */
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

/**
 * [新增] 负责初始化个人资料编辑器所需的所有静态内容（下拉菜单、头像网格等）。
 * 这个函数应该在应用启动时被调用一次。
 * @param {Object} campusData - 从 main.js 传入的校区数据，用于填充专业列表。
 */
export async function initializeProfileEditor(campusData) {
    if (!dom || !campusData) {
        console.error("无法初始化个人中心编辑器：DOM或校区数据未提供。");
        return;
    }

    // 1. 填充年份
    const yearSelect = dom.editEnrollmentYear;
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = ''; // 清空以防重复调用
    for (let i = 0; i < 10; i++) {
        const year = currentYear - i;
        yearSelect.add(new Option(`${year}年`, year));
    }

    // 2. 填充专业
    const majorSelect = dom.editMajor;
    const allMajors = [...new Set(campusData.colleges.flatMap(c => c.majors))];
    allMajors.sort((a, b) => a.localeCompare(b, 'zh-CN'));
    majorSelect.innerHTML = '<option value="">未选择</option>';
    allMajors.forEach(major => majorSelect.add(new Option(major, major)));

    // 3. 填充头像选择网格
    const avatarGrid = dom.avatarSelectionGrid;
    avatarGrid.innerHTML = ''; // 清空以防重复调用

    // !! 重要 !! 请将这里的 File ID 列表替换成你自己在 CloudBase 上传的所有可选头像的真实 File ID。
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

export function listenForAuthStateChanges(callback) {
    auth.onLoginStateChanged(async (loginState) => {
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
                    const newUserDoc = {
                        _id: currentUser.uid,
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
                await updateUIWithUserData(null);
                callback(null);
            }
        } else {
            await updateUIWithUserData(null);
            callback(null);
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
        modals.hideAuthModal(() => { modals.showProfileModal(); });
    } catch (error) {
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
        const verificationTokenRes = await auth.verify({ verification_id: verificationData.verification_id, verification_code: verificationCode });
        await auth.signUp({ email: email, verification_code: verificationCode, verification_token: verificationTokenRes.verification_token, password: password, username: email });
        dom.showToast('注册成功！已自动登录。', 'success');
        verificationData = null;
        modals.hideAuthModal(() => { modals.showProfileModal(); });
    } catch (error) {
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
        verificationData = await auth.getVerification({ email: email });
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

export async function handleLogout() {
    try {
        await auth.signOut();
        avatarUrlCache.clear();
        dom.showToast('已成功退出登录', 'info');
    } catch (error) {
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
        await auth.sendPasswordResetEmail({ email: email });
        dom.showToast('密码重置邮件已发送，请检查您的邮箱', 'success');
        handleAuthViewChange('login');
    } catch (error) {
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

export function handleProfileViewChange(viewName) {
    if (!dom) return;
    dom.profileViewContainer.classList.toggle('hidden', viewName !== 'view');
    dom.profileEditContainer.classList.toggle('hidden', viewName !== 'edit');
}
