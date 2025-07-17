/**
 * @file 认证与用户界面模块 (CloudBase Version - Final V3 Logic)
 * @description 该模块处理所有与用户认证（登录、注册、登出、重置密码）、
 * 用户资料管理以及根据认证状态更新UI相关的功能。
 */

// 从我们创建的 cloudbase.js 模块中导入实例
import { auth, db } from '../cloudbase.js';

// --- 全局常量 ---
const AVATARS = Array.from({ length: 1 }, (_, i) => `avatar_${String(i + 1).padStart(2, '0')}`);
const getAvatarUrl = (id) => id ? `images/默认头像/${id}.png` : 'images/默认头像/avatar_01.png';

// --- DOM 元素缓存 ---
let domElements = {};
// 用于存储数据库监听器，以便在用户登出时取消监听
let userDocWatcher = null;
// 用于存储验证码发送后的信息
let verificationInfo = null;

/**
 * 缓存此模块需要操作的DOM元素。
 * @param {Object} elements - 从主应用传入的DOM元素对象。
 */
export function cacheAuthDOMElements(elements) {
    domElements = elements;
    const sendCodeBtn = document.getElementById('send-verification-code-btn');
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', () => handleSendVerificationCode(domElements.showToast));
    }
}

/**
 * 更新UI以反映当前用户的登录状态和数据。
 * @param {Object|null} userData - 从CloudBase数据库获取的用户数据，如果未登录则为null。
 */
function updateUIWithUserData(userData) {
    console.log('[UI Update] updateUIWithUserData is called. userData:', userData);
    
    if (userData && userData._id) { 
        console.log('[UI Update] User is logged in. Updating sidebar to show profile.');
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
        console.log('[UI Update] User is logged out or data is invalid. Showing login prompt.');
        domElements.loginPromptBtn.classList.remove('hidden');
        domElements.userProfileBtn.classList.add('hidden');
    }
}

/**
 * [优化版] 监听CloudBase认证状态的改变，并立即更新UI。
 * 增加了更详细的日志记录，以便于调试。
 * @param {function} onStateChange - 状态改变时的回调函数，接收 user data 作为参数。
 */
export function listenForAuthStateChanges(onStateChange) {
    auth.onLoginStateChanged(async (loginState) => {
        console.log('[Auth State] onLoginStateChanged triggered. New login state:', loginState);

        // 登出或状态改变时，先确保关闭旧的监听器
        if (userDocWatcher) {
            console.log('[Auth State] Closing previous database watcher.');
            userDocWatcher.close();
            userDocWatcher = null;
        }

        // 使用最新的 loginState 或 auth.currentUser 来获取当前用户
        const currentUser = auth.currentUser;
        console.log('[Auth State] auth.currentUser is:', currentUser);

        if (currentUser && currentUser.uid) {
            console.log(`[Auth State] User is logged in with UID: ${currentUser.uid}. Proceeding to fetch/create profile.`);
            const userDocRef = db.collection('users').doc(currentUser.uid);
            
            try {
                console.log(`[DB] Attempting to get document for UID: ${currentUser.uid}`);
                const userDoc = await userDocRef.get();
                console.log('[DB] Successfully received response from userDocRef.get():', userDoc);

                let userData;

                // CloudBase SDK 在文档不存在时返回 { data: [] }
                if (userDoc.data && userDoc.data.length > 0) {
                    // --- 文档已存在 ---
                    userData = userDoc.data[0];
                    console.log('[DB] User document found. Data:', userData);

                } else {
                    // --- 文档不存在，创建新文档 ---
                    console.log(`[DB] User document for ${currentUser.uid} not found. Preparing to create one.`);
                    const emailPrefix = currentUser.email.split('@')[0];
                    const newUserDoc = {
                        // [关键修复] 移除 _id 字段。文档ID已由 doc(currentUser.uid) 指定，不应在数据体中重复。
                        email: currentUser.email,
                        nickname: "萌新" + emailPrefix.slice(-4),
                        bio: "这位同学很酷，什么都还没留下~",
                        avatarId: AVATARS[Math.floor(Math.random() * AVATARS.length)],
                        major: "",
                        enrollmentYear: new Date().getFullYear(),
                        joinDate: new Date().toISOString()
                    };
                    
                    console.log('[DB] New user data to be set:', newUserDoc);
                    
                    try {
                        const setResult = await userDocRef.set(newUserDoc);
                        console.log('[DB] userDocRef.set() successfully resolved. Result:', setResult);
                        // 为了前端UI能立刻使用，手动将 uid 添加到本地的 userData 对象中
                        userData = { ...newUserDoc, _id: currentUser.uid };
                    } catch (setError) {
                        console.error('[DB FATAL] FAILED TO CREATE new user document!', setError);
                        // 如果创建失败，这是一个严重问题，直接返回，不进行后续操作
                        onStateChange(null);
                        updateUIWithUserData(null);
                        return;
                    }
                }

                // --- 更新UI并设置实时监听 ---
                console.log('[Final Step] Calling updateUIWithUserData with final user data:', userData);
                updateUIWithUserData(userData);
                onStateChange(userData);

                console.log('[Final Step] Setting up database watcher for real-time updates.');
                userDocWatcher = userDocRef.watch({
                    onChange: (snapshot) => {
                        console.log('[DB Watch] Data changed, snapshot:', snapshot);
                        if (snapshot.docs && snapshot.docs.length > 0) {
                            const updatedUserData = snapshot.docs[0];
                            console.log('[DB Watch] Updating UI with new data:', updatedUserData);
                            updateUIWithUserData(updatedUserData);
                            onStateChange(updatedUserData);
                        }
                    },
                    onError: (error) => {
                        console.error("[DB Watch] Real-time listener error:", error);
                    }
                });

            } catch (dbError) {
                console.error('[Auth State] A critical database error occurred during get/set process:', dbError);
                // 发生错误，UI回滚到未登录状态
                updateUIWithUserData(null);
                onStateChange(null);
            }

        } else {
            // --- 用户未登录 ---
            console.log('[Auth State] User is logged out or currentUser is invalid.');
            updateUIWithUserData(null);
            onStateChange(null);
        }
    });
}


/**
 * 处理发送邮箱验证码的逻辑
 * @param {function} showToast - 用于显示提示消息的函数。
 */
async function handleSendVerificationCode(showToast) {
    const emailPrefix = domElements.registerForm.email_prefix.value;
    if (!emailPrefix) {
        showToast("请先输入你的学号！", "error");
        return;
    }
    const email = emailPrefix + '@jou.edu.cn';
    const sendCodeBtn = document.getElementById('send-verification-code-btn');

    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = '发送中...';

    try {
        const result = await auth.getVerification({ email: email });
        verificationInfo = result;
        showToast("验证码已发送，请查收邮件！", "success");

        let countdown = 60;
        sendCodeBtn.textContent = `${countdown}s`;
        const interval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                sendCodeBtn.textContent = `${countdown}s`;
            } else {
                clearInterval(interval);
                sendCodeBtn.disabled = false;
                sendCodeBtn.textContent = '重新发送';
            }
        }, 1000);

    } catch (error) {
        console.error("Send verification code error:", error);
        showToast("验证码发送失败：" + (error.message || "请稍后再试"), "error");
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = '发送验证码';
    }
}

/**
 * 处理用户注册的最终提交逻辑
 * @param {Event} e - 表单提交事件。
 * @param {function} showToast - 用于显示提示消息的函数。
 * @param {function} hideAuthModal - 用于关闭认证模态框的函数。
 */
export async function handleRegisterSubmit(e, showToast, hideAuthModal) {
    e.preventDefault();
    
    const emailPrefix = domElements.registerForm.email_prefix.value;
    const password = domElements.registerForm.password.value;
    const verificationCode = domElements.registerForm.verification_code.value;

    if (!emailPrefix || !password || !verificationCode) {
        showToast("请填写所有注册信息！", "error");
        return;
    }
    if (!verificationInfo) {
        showToast("请先发送并获取邮箱验证码！", "error");
        return;
    }

    const validUsername = 'u' + emailPrefix;

    try {
        const verificationTokenRes = await auth.verify({
            verification_id: verificationInfo.verification_id,
            verification_code: verificationCode,
        });

        await auth.signUp({
            username: validUsername,
            password: password,
            email: emailPrefix + '@jou.edu.cn',
            verification_token: verificationTokenRes.verification_token,
        });
        
        showToast("注册成功！", "success");
        hideAuthModal();

    } catch (error) {
        console.error("Register error:", error);
        if (error.error_description === 'verification code invalid') {
            showToast("验证码错误！", "error");
        } else if (error.code === 'auth/username-existed' || error.code === 'auth/email-existed') {
            showToast("该学号或邮箱已被注册！", "error");
        } else {
            showToast("注册失败：" + (error.message || "请检查信息后重试"), "error");
        }
    }
}

/**
 * 处理用户登录逻辑
 * @param {Event} e - 表单提交事件。
 * @param {function} showToast - 用于显示提示消息的函数。
 * @param {function} hideAuthModal - 用于关闭认证模态框的函数。
 */
export async function handleLoginSubmit(e, showToast, hideAuthModal) {
    e.preventDefault();
    const emailPrefix = domElements.loginForm.email_prefix.value;
    const password = domElements.loginForm.password.value;

    if (!emailPrefix || !password) {
        showToast("请输入学号和密码！", "error");
        return;
    }
    const validUsername = 'u' + emailPrefix;

    try {
        await auth.signIn({
            username: validUsername,
            password: password
        });
        
        showToast("登录成功！", "success");
        hideAuthModal();
    } catch (error) {
        console.error("Login error:", error);
        showToast("登录失败：学号或密码错误。", "error");
    }
}

// --- 以下函数无需修改 ---

export async function handlePasswordResetSubmit(e, showToast, switchAuthView) {
    e.preventDefault();
    const emailPrefix = domElements.resetPasswordForm.email_prefix.value;
    if (!emailPrefix) {
        showToast("请输入你的学号！", "error");
        return;
    }
    const email = emailPrefix + '@jou.edu.cn';

    try {
        await auth.sendPasswordResetEmail(email);
        showToast("密码重置邮件已发送，请查收。", "success");
        switchAuthView('login');
    } catch (error) {
        console.error("Reset password error:", error);
        if (error.code === 'auth/user-not-found') {
            showToast("发送失败：该邮箱尚未注册。", "error");
        } else {
            showToast("发送失败：" + error.message, "error");
        }
    }
}

export async function handleLogout(showToast, hideProfileModal) {
    try {
        await auth.signOut();
        hideProfileModal();
        showToast("已成功退出登录。", "info");
    } catch (error) {
        showToast("退出失败：" + error.message, "error");
    }
}

export function populateProfileEditForm(currentUserData) {
    if (!currentUserData) return;

    domElements.avatarSelectionGrid.innerHTML = AVATARS.map(id => `
        <img src="${getAvatarUrl(id)}" data-avatar-id="${id}" class="avatar-option w-12 h-12 rounded-full cursor-pointer border-2 border-transparent hover:border-blue-500" alt="头像${id}">
    `).join('');

    const currentAvatar = domElements.avatarSelectionGrid.querySelector(`[data-avatar-id="${currentUserData.avatarId}"]`);
    if (currentAvatar) {
        currentAvatar.classList.add('selected', 'border-blue-500');
    } else {
        const firstAvatar = domElements.avatarSelectionGrid.querySelector('.avatar-option');
        if(firstAvatar) firstAvatar.classList.add('selected', 'border-blue-500');
    }
    
    domElements.avatarSelectionGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('avatar-option')) {
            domElements.avatarSelectionGrid.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected', 'border-blue-500'));
            e.target.classList.add('selected', 'border-blue-500');
        }
    });

    domElements.editNickname.value = currentUserData.nickname || '';
    domElements.editBio.value = currentUserData.bio || '';
    domElements.editEnrollmentYear.value = currentUserData.enrollmentYear || new Date().getFullYear();
    domElements.editMajor.value = currentUserData.major || '';
}

export async function handleProfileSave(e, currentUserData, showToast, switchProfileView) {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    domElements.saveProfileBtn.disabled = true;
    domElements.saveProfileBtn.innerHTML = `<span class="loader-small"></span> 保存中...`;

    const selectedAvatar = domElements.avatarSelectionGrid.querySelector('.selected');
    const updatedData = {
        nickname: domElements.editNickname.value.trim(),
        bio: domElements.editBio.value.trim(),
        avatarId: selectedAvatar ? selectedAvatar.dataset.avatarId : currentUserData.avatarId,
        enrollmentYear: parseInt(domElements.editEnrollmentYear.value),
        major: domElements.editMajor.value.trim()
    };

    try {
        const userDocRef = db.collection('users').doc(currentUser.uid);
        await userDocRef.update(updatedData);
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
