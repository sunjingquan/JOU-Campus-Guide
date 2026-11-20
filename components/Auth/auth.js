/**
 * @file 用户认证组件（酱海带社区 DiscourseConnect SSO 统一认证版）
 * @description 对接 bbs.jianghaidai.com 原生单点登录，全站共享同一套社区身份与管理员权限。
 */

import { getCurrentSession, logoutSession, updateMyProfile } from '../../services/api.js';
import { eventBus } from '../../services/eventBus.js';

const DEFAULT_AVATAR_URL = '/uploads/images/%E9%BB%98%E8%AE%A4%E5%A4%B4%E5%83%8F/avatar_01.png';

let dom = {};
let campusDataForEditor = null;
let fullUserData = null;

export async function getAvatarUrl(avatarValue) {
  if (!avatarValue || typeof avatarValue !== 'string') {
    return DEFAULT_AVATAR_URL;
  }
  if (avatarValue.startsWith('/uploads/') || avatarValue.startsWith('https://')) {
    return avatarValue;
  }
  return DEFAULT_AVATAR_URL;
}

async function checkInitialSession() {
  try {
    const res = await getCurrentSession();
    fullUserData = res.user || null;
  } catch (err) {
    console.warn('Auth Component: 会话检查失败，按未登录访客继续运行:', err);
    fullUserData = null;
  }
  eventBus.publish('auth:stateChanged', { user: fullUserData });
  eventBus.publish('auth:ready');
}

async function populateProfileView(userData) {
  if (!userData || !dom.profileViewContainer) return;

  const avatarUrl = await getAvatarUrl(userData.avatar);
  dom.profileAvatarLarge.src = avatarUrl;
  dom.profileAvatarLarge.onerror = () => {
    dom.profileAvatarLarge.src = DEFAULT_AVATAR_URL;
  };

  const roleBadge = userData.isAdmin ? ' · 社区管理员' : '';
  dom.profileNickname.textContent = userData.nickname || userData.username || '海带用户';
  dom.profileEmail.textContent = (userData.username ? `@${userData.username}` : (userData.email || '')) + roleBadge;
  dom.profileBio.textContent = userData.bio || '这个人很懒，什么都没留下...';

  const majorYearSpan = dom.profileMajorYear?.querySelector('span');
  if (majorYearSpan) {
    const yearText = userData.enrollmentYear ? `${userData.enrollmentYear}级` : '';
    const majorText = userData.major || '未设置专业';
    majorYearSpan.textContent = `${yearText} ${majorText}`.trim() || '未设置专业信息';
  }
}

async function handleLogout() {
  try {
    await logoutSession();
    fullUserData = null;
    eventBus.publish('auth:stateChanged', { user: null });
    eventBus.publish('toast:show', { message: '已成功退出登录', type: 'info' });
    hideProfileModal();
  } catch {
    eventBus.publish('toast:show', { message: '退出登录失败，请稍后再试', type: 'error' });
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
    const selectedAvatar = dom.avatarSelectionGrid?.querySelector('.avatar-option.selected')?.dataset.avatar;
    const updatedUser = await updateMyProfile({
      nickname: dom.editNickname.value.trim(),
      bio: dom.editBio.value.trim(),
      enrollmentYear: dom.editEnrollmentYear.value,
      major: dom.editMajor.value,
      ...(selectedAvatar ? { avatar: selectedAvatar } : {})
    });
    fullUserData = updatedUser;
    await populateProfileView(fullUserData);
    eventBus.publish('auth:stateChanged', { user: fullUserData });
    eventBus.publish('toast:show', { message: '个人资料更新成功！', type: 'success' });
    handleProfileViewChange('view');
  } catch (err) {
    eventBus.publish('toast:show', { message: err.message || '资料更新失败，请稍后再试', type: 'error' });
  } finally {
    button.disabled = false;
    button.textContent = '保存更改';
  }
}

function handleProfileViewChange(viewName) {
  dom.profileViewContainer?.classList.toggle('hidden', viewName !== 'view');
  dom.profileEditContainer?.classList.toggle('hidden', viewName !== 'edit');
  dom.profileChangePasswordContainer?.classList.add('hidden');
  if (dom.profileTitle) {
    dom.profileTitle.textContent = viewName === 'edit' ? '编辑个人资料' : '个人中心';
  }
}

function populateProfileEditForm(userData) {
  if (!userData) return;
  dom.editNickname.value = userData.nickname || '';
  dom.editBio.value = userData.bio || '';
  dom.editEnrollmentYear.value = userData.enrollmentYear || '';
  dom.editMajor.value = userData.major || '';
  initializeAvatarChoices(userData.avatar);
}

function initializeAvatarChoices(currentAvatar) {
  if (!dom.avatarSelectionGrid) return;
  dom.avatarSelectionGrid.innerHTML = '';
  const choices = [DEFAULT_AVATAR_URL];
  if (currentAvatar && !choices.includes(currentAvatar)) {
    choices.unshift(currentAvatar);
  }
  choices.forEach((url) => {
    const opt = document.createElement('div');
    opt.className = 'avatar-option p-1' + (url === currentAvatar ? ' selected' : '');
    opt.dataset.avatar = url;
    const img = document.createElement('img');
    img.src = url;
    img.alt = '头像选项';
    img.className = 'w-full h-full rounded-full object-cover';
    img.onerror = () => { img.src = DEFAULT_AVATAR_URL; };
    opt.appendChild(img);
    dom.avatarSelectionGrid.appendChild(opt);
  });
}

export async function provideCampusData(campusData) {
  campusDataForEditor = campusData;
  if (dom.editEnrollmentYear && campusDataForEditor) {
    initializeProfileEditor();
  }
}

function initializeProfileEditor() {
  if (!dom.editEnrollmentYear || !campusDataForEditor) return;

  const yearSelect = dom.editEnrollmentYear;
  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const year = currentYear - i;
    yearSelect.add(new Option(`${year}年`, String(year)));
  }

  const majorSelect = dom.editMajor;
  const allMajors = [...new Set((campusDataForEditor.colleges || []).flatMap((c) => c.majors || []))];
  allMajors.sort((a, b) => a.localeCompare(b, 'zh-CN'));
  majorSelect.innerHTML = '<option value="">未选择</option>';
  allMajors.forEach((major) => majorSelect.add(new Option(major, major)));
  initializeAvatarChoices(fullUserData?.avatar);
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
    ssoLoginBtn: document.getElementById('sso-login-btn'),
    profileModal: document.getElementById('profile-modal'),
    profileDialog: document.getElementById('profile-dialog'),
    closeProfileBtn: document.getElementById('close-profile-btn'),
    profileTitle: document.getElementById('profile-title'),
    profileViewContainer: document.getElementById('profile-view-container'),
    profileEditContainer: document.getElementById('profile-edit-container'),
    profileChangePasswordContainer: document.getElementById('profile-change-password-container'),
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
    editMajor: document.getElementById('edit-major')
  };
}

function startSsoRedirect() {
  const returnTo = window.location.pathname + window.location.hash;
  window.location.href = `/api/auth/sso/login?returnTo=${encodeURIComponent(returnTo || '/')}`;
}

function setupEventListeners() {
  dom.loginPromptBtn?.addEventListener('click', () => showAuthModal());
  dom.ssoLoginBtn?.addEventListener('click', () => startSsoRedirect());
  dom.closeAuthBtn?.addEventListener('click', hideAuthModal);

  dom.userProfileBtn?.addEventListener('click', async () => {
    if (fullUserData) {
      await populateProfileView(fullUserData);
    }
    handleProfileViewChange('view');
    showProfileModal();
  });

  dom.logoutButton?.addEventListener('click', handleLogout);
  dom.closeProfileBtn?.addEventListener('click', hideProfileModal);
  dom.editProfileBtn?.addEventListener('click', () => {
    populateProfileEditForm(fullUserData);
    handleProfileViewChange('edit');
  });
  dom.cancelEditProfileBtn?.addEventListener('click', () => handleProfileViewChange('view'));
  dom.profileEditContainer?.addEventListener('submit', handleProfileSave);
  dom.avatarSelectionGrid?.addEventListener('click', (e) => {
    const selectedAvatar = e.target.closest('.avatar-option');
    if (selectedAvatar) {
      dom.avatarSelectionGrid.querySelectorAll('.avatar-option').forEach((opt) => opt.classList.remove('selected'));
      selectedAvatar.classList.add('selected');
    }
  });

  eventBus.subscribe('auth:requestLogin', () => showAuthModal());
}

export function init() {
  cacheDOMElements();
  setupEventListeners();
  checkInitialSession();
}

function showModal(modalElement, dialogElement) {
  if (!modalElement || !dialogElement) return;
  modalElement.classList.remove('hidden');
  setTimeout(() => {
    modalElement.style.opacity = '1';
    dialogElement.style.transform = 'scale(1)';
    dialogElement.style.opacity = '1';
  }, 10);
}

function hideModal(modalElement, dialogElement, onHidden) {
  if (!modalElement || !dialogElement) return;
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
