/**
 * @file 用户认证组件 (Auth Component) - 二次修复版
 * @description 修复了编辑资料时无法预填用户旧数据的问题，并优化了退出登录后的状态逻辑。
 * @version 12.2.0
 */

// --- 依赖导入 ---
import { app, auth, db } from '../../js/cloudbase.js';
import { eventBus } from '../../services/eventBus.js';

// --- 模块内变量 ---
let dom = {};
let avatarUrlCache = new Map();
let verificationData = {
    register: null,
    reset: null
};
let campusDataForEditor = null;
// [修复] 新增一个模块级变量，用于存储完整的用户数据对象
let fullUserData = null; 
// [修复] 新增一个标志位，用于处理用户主动退出的情况
let isExplicitLogout = false; 

const DEFAULT_AVATAR_FILE_ID = 'cloud://jou-campus-guide-9f57jf08ece0812.6a6f-jou-campus-guide-9f57jf08ece0812-1367578274/images/默认头像/avatar_01.png';
const FALLBACK_AVATAR_URL = 'https://6a6f-jou-campus-guide-9f57jf08ece0812-1367578274.tcb.qcloud.la/images/%E9%BB%98%E8%AE%A4%E5%A4%B4%E5%83%8F/avatar_01.png?sign=94c44b27adbfba6ce88b12e681b9d360&t=1753770580';

let userDocWatcher = null;

// =============================================================================
// --- 核心逻辑函数 ---
// =============================================================================

function listenForAuthStateChanges() {
    auth.onLoginStateChanged(async (loginState) => {
        if (userDocWatcher) {
            userDocWatcher.close();
            userDocWatcher = null;
        }

        let finalUserData = null;

        if (loginState) {
            const isAnonymous = loginState.user && loginState.user.isAnonymous;
            if (isAnonymous) {
                console.log("Auth Component: 访客已通过匿名方式登录。");
                finalUserData = null;
            } else {
                try {
                    const currentUser = loginState.user;
                    const userDocRef = db.collection('users').doc(currentUser.uid);
                    const userDoc = await userDocRef.get();
                    
                    if (userDoc.data && userDoc.data.length > 0) {
                        finalUserData = { ...currentUser, ...userDoc.data[0] };
                    } else {
                        const email = currentUser.email || '';
                        const emailParts = email.split('@');
                        const studentId = emailParts.length > 0 ? emailParts[0] : null;
                        
                        const newUserDoc = {
                            _id: currentUser.uid,
                            studentId: studentId,
                            nickname: `用户_${currentUser.uid.slice(0, 6)}`,
                            email: email,
                            avatar: DEFAULT_AVATAR_FILE_ID,
                            bio: '这个人很懒，什么都没留下...',
                            enrollmentYear: new Date().getFullYear().toString(),
                            major: ''
                        };
                        await userDocRef.set(newUserDoc);
                        finalUserData = { ...currentUser, ...newUserDoc };
                    }
                    
                    userDocWatcher = userDocRef.watch({
                        onChange: (snapshot) => {
                            if (snapshot.docs && snapshot.docs.length > 0) {
                                const updatedData = { ...loginState.user, ...snapshot.docs[0] };
                                // [修复] 当用户信息更新时，同步更新内部缓存
                                fullUserData = updatedData; 
                                eventBus.publish('auth:stateChanged', { user: updatedData });
                                updateComponentUI(updatedData); // 确保UI也同步更新
                            }
                        },
                        onError: (error) => console.error("[DB 监听] 实时监听器出错:", error)
                    });

                } catch (dbError) {
                    console.error("Auth Component: 获取或创建用户数据库文档时出错:", dbError);
                    finalUserData = null;
                }
            }
        } else { // 用户未登录
            // [修复] 检查是否是用户主动退出
            if (isExplicitLogout) {
                console.log("Auth Component: 用户已主动退出。");
                finalUserData = null;
                isExplicitLogout = false; // 重置标志位
            } else {
                console.log("Auth Component: 无用户登录，正在尝试匿名登录...");
                try {
                    await auth.signInAnonymously();
                } catch (err) {
                    console.error("Auth Component: 匿名登录失败:", err);
                    eventBus.publish('toast:show', { message: '无法连接服务，请检查网络后重试', type: 'error' });
                    finalUserData = null;
                }
            }
        }
        
        // [修复] 更新内部的完整用户数据缓存
        fullUserData = finalUserData;
        
        eventBus.publish('auth:stateChanged', { user: finalUserData });
        await updateComponentUI(finalUserData);
    });
}

/**
 * 处理退出登录。
 * [修复] 在调用 signOut 之前，设置标志位。
 */
async function handleLogout() {
    try {
        isExplicitLogout = true; // 设置主动退出标志
        await auth.signOut();
        avatarUrlCache.clear();
        eventBus.publish('toast:show', { message: '已成功退出登录', type: 'info' });
        hideProfileModal();
    } catch (error) {
        isExplicitLogout = false; // 如果出错，重置标志位
        eventBus.publish('toast:show', { message: '退出登录失败', type: 'error' });
    }
}

// ... 其他 handle 函数保持不变 ...
async function handleLoginSubmit(e) {
    e.preventDefault();
    const button = dom.loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = '登录中...';
    const emailPrefix = dom.loginForm.email_prefix.value;
    const password = dom.loginForm.password.value;
    const email = `${emailPrefix}@jou.edu.cn`;
    try {
        await auth.signIn({ username: email, password: password });
        eventBus.publish('toast:show', { message: '登录成功！', type: 'success' });
        hideAuthModal();
    } catch (error) {
        eventBus.publish('toast:show', { message: `登录失败: ${error.message || '请检查学号和密码'}`, type: 'error' });
    } finally {
        button.disabled = false;
        button.textContent = '登 录';
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!verificationData.register || !verificationData.register.verification_token) {
        eventBus.publish('toast:show', { message: '请先发送并正确输入邮箱验证码', type: 'error' });
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
        eventBus.publish('toast:show', { message: '密码长度至少需要8位', type: 'error' });
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
        eventBus.publish('toast:show', { message: '注册成功！已自动登录。', type: 'success' });
        verificationData.register = null;
        hideAuthModal();
    } catch (error) {
        eventBus.publish('toast:show', { message: `注册失败: ${error.message || '请检查信息是否正确'}`, type: 'error' });
    } finally {
        button.disabled = false;
        button.textContent = '注 册';
    }
}

async function handlePasswordResetSubmit(e) {
    e.preventDefault();
    const button = dom.resetPasswordForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = '重置中...';

    const emailPrefix = dom.resetPasswordForm.email_prefix.value;
    const email = `${emailPrefix}@jou.edu.cn`;
    const verificationCode = dom.resetPasswordForm.verification_code.value;
    const newPassword = dom.resetPasswordForm.new_password.value;

    if (!verificationData.reset || !verificationData.reset.verification_id) {
        eventBus.publish('toast:show', { message: '请先发送并获取验证码', type: 'error' });
        button.disabled = false;
        button.textContent = '确认重置';
        return;
    }
    if (newPassword.length < 8) {
        eventBus.publish('toast:show', { message: '新密码长度至少需要8位', type: 'error' });
        button.disabled = false;
        button.textContent = '确认重置';
        return;
    }

    try {
        const verifyResult = await auth.verify({
            verification_id: verificationData.reset.verification_id,
            verification_code: verificationCode
        });

        await auth.resetPassword({
            email: email,
            new_password: newPassword,
            verification_token: verifyResult.verification_token,
        });

        eventBus.publish('toast:show', { message: '密码重置成功！', type: 'success' });
        verificationData.reset = null;
        handleAuthViewChange('login');
    } catch (error) {
        eventBus.publish('toast:show', { message: `重置失败: ${error.message}`, type: 'error' });
    } finally {
        button.disabled = false;
        button.textContent = '确认重置';
    }
}

async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    const button = dom.savePasswordBtn;
    button.disabled = true;
    button.textContent = '保存中...';

    const currentPassword = dom.currentPasswordInput.value;
    const newPassword = dom.newPasswordInput.value;
    const confirmPassword = dom.confirmNewPasswordInput.value;

    if (newPassword !== confirmPassword) {
        eventBus.publish('toast:show', { message: '两次输入的新密码不一致', type: 'error' });
        button.disabled = false;
        button.textContent = '保存更改';
        return;
    }
    if (newPassword.length < 8) {
        eventBus.publish('toast:show', { message: '新密码长度至少需要8位', type: 'error' });
        button.disabled = false;
        button.textContent = '保存更改';
        return;
    }

    try {
        const sudoRes = await auth.sudo({ password: currentPassword });
        await auth.setPassword({
            new_password: newPassword,
            sudo_token: sudoRes.sudo_token
        });
        eventBus.publish('toast:show', { message: '密码修改成功！', type: 'success' });
        handleProfileViewChange('view');
    } catch (error) {
        eventBus.publish('toast:show', { message: `修改失败: ${error.message || '请检查当前密码是否正确'}`, type: 'error' });
    } finally {
        button.disabled = false;
        button.textContent = '保存更改';
    }
}

async function handleProfileSave(e) {
    e.preventDefault();
    if (!fullUserData) {
        eventBus.publish('toast:show', { message: '请先登录', type: 'error' });
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
        await db.collection('users').doc(fullUserData._id).update(updatedData);
        eventBus.publish('toast:show', { message: '个人资料更新成功！', type: 'success' });
        handleProfileViewChange('view');
    } catch (error) {
        eventBus.publish('toast:show', { message: '资料更新失败，请稍后再试', type: 'error' });
    } finally {
        button.disabled = false;
        button.textContent = '保存更改';
    }
}

// =============================================================================
// --- UI 更新与视图管理函数 ---
// =============================================================================

async function updateComponentUI(userData) {
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

function handleAuthViewChange(viewName) {
    dom.loginFormContainer.classList.toggle('hidden', viewName !== 'login');
    dom.registerFormContainer.classList.toggle('hidden', viewName !== 'register');
    dom.resetPasswordFormContainer.classList.toggle('hidden', viewName !== 'reset');
    const titles = { login: '欢迎回来', register: '创建新账户', reset: '重置你的密码' };
    dom.authTitle.textContent = titles[viewName];
}

function handleProfileViewChange(viewName) {
    dom.profileViewContainer.classList.toggle('hidden', viewName !== 'view');
    dom.profileEditContainer.classList.toggle('hidden', viewName !== 'edit');
    dom.profileChangePasswordContainer.classList.toggle('hidden', viewName !== 'changePassword');

    const titles = {
        view: '个人中心',
        edit: '编辑个人资料',
        changePassword: '修改密码'
    };
    dom.profileTitle.textContent = titles[viewName];

    if (viewName === 'changePassword') {
        dom.profileChangePasswordContainer.reset();
    }
}

function populateProfileEditForm(userData) {
    if (!userData) return;
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

// =============================================================================
// --- 辅助函数 ---
// =============================================================================

async function getAvatarUrl(fileID) {
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
        return FALLBACK_AVATAR_URL;
    } catch (error) {
        console.error(`获取头像(${finalFileID})临时URL失败:`, error);
        return FALLBACK_AVATAR_URL;
    }
}

async function sendVerificationCode(email, btn, type) {
    btn.disabled = true;
    btn.textContent = '发送中...';
    try {
        const verificationResult = await auth.getVerification({ email: email });
        verificationData[type] = { verification_id: verificationResult.verification_id };
        eventBus.publish('toast:show', { message: '验证码已发送，请检查邮箱', type: 'success' });
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
        eventBus.publish('toast:show', { message: `发送失败: ${error.message}`, type: 'error' });
        btn.disabled = false;
        btn.textContent = '发送验证码';
    }
}

async function handleVerifyCode() {
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
    } catch(error) {
        eventBus.publish('toast:show', { message: `验证码错误: ${error.message}`, type: 'error' });
        verificationData.register = null;
    }
}

// =============================================================================
// --- 组件初始化与数据注入 ---
// =============================================================================

export async function provideCampusData(campusData) {
    campusDataForEditor = campusData;
    if (dom.editEnrollmentYear) {
        await initializeProfileEditor();
    }
}

async function initializeProfileEditor() {
    if (!dom || !campusDataForEditor) {
        console.error("Auth Component: 无法初始化个人中心编辑器，DOM或校区数据未提供。");
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
    const allMajors = [...new Set(campusDataForEditor.colleges.flatMap(c => c.majors))];
    allMajors.sort((a, b) => a.localeCompare(b, 'zh-CN'));
    majorSelect.innerHTML = '<option value="">未选择</option>';
    allMajors.forEach(major => majorSelect.add(new Option(major, major)));
    
    const avatarGrid = dom.avatarSelectionGrid;
    avatarGrid.innerHTML = '';
    const selectableAvatarFileIDs = [
        'cloud://jou-campus-guide-9f57jf08ece0812.6a6f-jou-campus-guide-9f57jf08ece0812-1367578274/images/默认头像/avatar_01.png',
    ];
    
    const uncachedFileIDs = selectableAvatarFileIDs.filter(id => !avatarUrlCache.has(id));
    if (uncachedFileIDs.length > 0) {
        try {
            const { fileList } = await app.getTempFileURL({ fileList: uncachedFileIDs });
            fileList.forEach(item => {
                if (item.tempFileURL) {
                    avatarUrlCache.set(item.fileID, item.tempFileURL);
                }
            });
        } catch (error) {
            console.error("Auth Component: 批量获取头像URL失败:", error);
        }
    }

    selectableAvatarFileIDs.forEach(fileID => {
        const displayUrl = avatarUrlCache.get(fileID) || FALLBACK_AVATAR_URL;
        const avatarOption = document.createElement('div');
        avatarOption.className = 'avatar-option p-1';
        avatarOption.dataset.avatar = fileID;
        avatarOption.innerHTML = `<img src="${displayUrl}" alt="头像选项" class="w-full h-full rounded-full object-cover" onerror="this.src='${FALLBACK_AVATAR_URL}'">`;
        avatarGrid.appendChild(avatarOption);
    });
}

function cacheDOMElements() {
    dom = {
        loginPromptBtn: document.getElementById('login-prompt-btn'),
        userProfileBtn: document.getElementById('user-profile-btn'),
        logoutButton: document.getElementById('logout-button'),
        editProfileBtn: document.getElementById('edit-profile-btn'),
        authModal: document.getElementById('auth-modal'),
        authDialog: document.getElementById('auth-dialog'),
        closeAuthBtn: document.getElementById('close-auth-btn'),
        authTitle: document.getElementById('auth-title'),
        loginFormContainer: document.getElementById('login-form-container'),
        loginForm: document.getElementById('login-form'),
        registerFormContainer: document.getElementById('register-form-container'),
        registerForm: document.getElementById('register-form'),
        resetPasswordFormContainer: document.getElementById('reset-password-form-container'),
        resetPasswordForm: document.getElementById('reset-password-form'),
        goToRegister: document.getElementById('go-to-register'),
        goToLoginFromRegister: document.getElementById('go-to-login-from-register'),
        forgotPasswordLink: document.getElementById('forgot-password-link'),
        goToLoginFromReset: document.getElementById('go-to-login-from-reset'),
        sendVerificationCodeBtn: document.getElementById('send-verification-code-btn'),
        sendResetCodeBtn: document.getElementById('send-reset-code-btn'),
        sidebarAvatar: document.getElementById('sidebar-avatar'),
        sidebarNickname: document.getElementById('sidebar-nickname'),
        profileModal: document.getElementById('profile-modal'),
        profileDialog: document.getElementById('profile-dialog'),
        closeProfileBtn: document.getElementById('close-profile-btn'),
        profileTitle: document.getElementById('profile-title'),
        profileViewContainer: document.getElementById('profile-view-container'),
        profileEditContainer: document.getElementById('profile-edit-container'),
        profileAvatarLarge: document.getElementById('profile-avatar-large'),
        profileNickname: document.getElementById('profile-nickname'),
        profileEmail: document.getElementById('profile-email'),
        profileMajorYear: document.getElementById('profile-major-year'),
        profileBio: document.getElementById('profile-bio'),
        cancelEditProfileBtn: document.getElementById('cancel-edit-profile-btn'),
        saveProfileBtn: document.getElementById('save-profile-btn'),
        avatarSelectionGrid: document.getElementById('avatar-selection-grid'),
        editNickname: document.getElementById('edit-nickname'),
        editBio: document.getElementById('edit-bio'),
        editEnrollmentYear: document.getElementById('edit-enrollment-year'),
        editMajor: document.getElementById('edit-major'),
        changePasswordPromptBtn: document.getElementById('change-password-prompt-btn'),
        profileChangePasswordContainer: document.getElementById('profile-change-password-container'),
        currentPasswordInput: document.getElementById('current-password'),
        newPasswordInput: document.getElementById('new-password'),
        confirmNewPasswordInput: document.getElementById('confirm-new-password'),
        savePasswordBtn: document.getElementById('save-password-btn'),
        cancelChangePasswordBtn: document.getElementById('cancel-change-password-btn'),
    };
}

function setupEventListeners() {
    dom.loginPromptBtn.addEventListener('click', () => {
        handleAuthViewChange('login');
        showAuthModal();
    });
    dom.userProfileBtn.addEventListener('click', () => {
        handleProfileViewChange('view');
        showProfileModal();
    });
    dom.logoutButton.addEventListener('click', handleLogout);

    dom.closeAuthBtn.addEventListener('click', hideAuthModal);
    dom.loginForm.addEventListener('submit', handleLoginSubmit);
    dom.registerForm.addEventListener('submit', handleRegisterSubmit);
    dom.resetPasswordForm.addEventListener('submit', handlePasswordResetSubmit);
    dom.sendVerificationCodeBtn.addEventListener('click', () => sendVerificationCode(`${dom.registerForm.email_prefix.value}@jou.edu.cn`, dom.sendVerificationCodeBtn, 'register'));
    dom.registerForm.querySelector('#register-verification-code').addEventListener('blur', handleVerifyCode);
    dom.sendResetCodeBtn.addEventListener('click', () => sendVerificationCode(`${dom.resetPasswordForm.email_prefix.value}@jou.edu.cn`, dom.sendResetCodeBtn, 'reset'));
    
    dom.goToRegister.addEventListener('click', (e) => { e.preventDefault(); handleAuthViewChange('register'); });
    dom.goToLoginFromRegister.addEventListener('click', (e) => { e.preventDefault(); handleAuthViewChange('login'); });
    dom.forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); handleAuthViewChange('reset'); });
    dom.goToLoginFromReset.addEventListener('click', (e) => { e.preventDefault(); handleAuthViewChange('login'); });

    dom.closeProfileBtn.addEventListener('click', hideProfileModal);
    dom.editProfileBtn.addEventListener('click', () => {
        // [修复] 使用内部缓存的 fullUserData 来填充表单
        populateProfileEditForm(fullUserData); 
        handleProfileViewChange('edit');
    });
    dom.cancelEditProfileBtn.addEventListener('click', () => handleProfileViewChange('view'));
    dom.profileEditContainer.addEventListener('submit', handleProfileSave);
    dom.avatarSelectionGrid.addEventListener('click', (e) => {
        const selectedAvatar = e.target.closest('.avatar-option');
        if (selectedAvatar) {
            dom.avatarSelectionGrid.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
            selectedAvatar.classList.add('selected');
        }
    });
    
    dom.changePasswordPromptBtn.addEventListener('click', () => handleProfileViewChange('changePassword'));
    dom.profileChangePasswordContainer.addEventListener('submit', handleChangePasswordSubmit);
    dom.cancelChangePasswordBtn.addEventListener('click', () => handleProfileViewChange('view'));

    eventBus.subscribe('auth:requestLogin', () => {
        handleAuthViewChange('login');
        showAuthModal();
    });
}

export function init() {
    cacheDOMElements();
    setupEventListeners();
    listenForAuthStateChanges();
    console.log("Auth Component Initialized and Fixed (v12.2.0).");
}

// --- 私有辅助函数 (弹窗控制) ---
function showModal(modalElement, dialogElement) {
    modalElement.classList.remove('hidden');
    setTimeout(() => {
        modalElement.style.opacity = '1';
        dialogElement.style.transform = 'scale(1)';
        dialogElement.style.opacity = '1';
    }, 10);
}

function hideModal(modalElement, dialogElement, onHidden) {
    modalElement.style.opacity = '0';
    dialogElement.style.transform = 'scale(0.95)';
    dialogElement.style.opacity = '0';
    setTimeout(() => {
        modalElement.classList.add('hidden');
        if (onHidden) onHidden();
    }, 300);
}

function showAuthModal() { showModal(dom.authModal, dom.authDialog); }
function hideAuthModal(onHidden) { hideModal(dom.authModal, dom.authDialog, onHidden); }
function showProfileModal() { showModal(dom.profileModal, dom.profileDialog); }
function hideProfileModal(onHidden) { hideModal(dom.profileModal, dom.profileDialog, onHidden); }
