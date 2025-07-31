/**
 * @file 应用主入口 (Main Entry Point) - 时序修复版
 * @description 负责应用的整体流程控制。
 * [已修复] 重构了应用的初始化流程，确保在认证状态明确（包括匿名登录）后，才开始获取数据，从而解决了启动时的竞态条件问题。
 * @version 7.0.0
 */

// 导入重构后的模块
// --- 修改: 导入 app 实例和新的 dataManager 函数 ---
import { getGuideData, getCampusData, getMaterials, addMaterial, incrementDownloadCount } from './data/dataManager.js';
import * as renderer from './ui/renderer.js';
import { createNavigation, handleNavigationClick, updateActiveNav } from './ui/navigation.js';
import * as authUI from './ui/auth.js';
import * as modals from './ui/modals.js';
import * as search from './ui/search.js';
import * as viewManager from './ui/viewManager.js';
import * as theme from './ui/theme.js';
import { db, app } from './cloudbase.js'; // 导入 app 用于文件上传下载

class GuideApp {
    constructor() {
        // 数据在认证成功后才会被填充
        this.guideData = null;
        this.campusData = null;
        this.selectedCampus = null;
        this.observer = null;
        this.isScrollingProgrammatically = false;
        this.scrollTimeout = null;
        this.currentUserData = null;

        this._cacheDOMElements();
        // 将 showToast 方法绑定到实例，以便在其他模块中正确调用
        this.dom.showToast = this._showToast.bind(this);
        authUI.cacheAuthDOMElements(this.dom);
        modals.init(this.dom);
        viewManager.init({
            domElements: this.dom,
            // 初始时 campusData 为 null，后续会更新
            cData: () => this.campusData 
        });
    }

    _cacheDOMElements() {
        this.dom = {
            loadingOverlay: document.getElementById('loading-overlay'),
            mainView: document.getElementById('main-view'),
            navMenu: document.getElementById('nav-menu'),
            contentArea: document.getElementById('content-area'),
            contentTitle: document.getElementById('content-title'),
            menuToggle: document.getElementById('menu-toggle'),
            sidebar: document.getElementById('sidebar'),
            homeButtonTop: document.getElementById('home-button-top'),
            sidebarOverlay: document.getElementById('sidebar-overlay'),
            campusModal: document.getElementById('campus-selector-modal'),
            campusDialog: document.getElementById('campus-selector-dialog'),
            changeCampusBtn: document.getElementById('change-campus-btn'),
            currentCampusDisplay: document.getElementById('current-campus-display'),
            detailView: document.getElementById('detail-view'),
            detailTitle: document.getElementById('detail-title'),
            detailContent: document.getElementById('detail-content'),
            backToMainBtn: document.getElementById('back-to-main-btn'),
            searchForm: document.getElementById('search-form'),
            searchInput: document.getElementById('search-input'),
            liveSearchResultsContainer: document.getElementById('live-search-results'),
            bottomNav: document.getElementById('bottom-nav'),
            bottomNavHome: document.getElementById('bottom-nav-home'),
            bottomNavMenu: document.getElementById('bottom-nav-menu'),
            bottomNavSearch: document.getElementById('bottom-nav-search'),
            bottomNavCampus: document.getElementById('bottom-nav-campus'),
            mobileSearchOverlay: document.getElementById('mobile-search-overlay'),
            mobileSearchInput: document.getElementById('mobile-search-input'),
            mobileSearchResultsContainer: document.getElementById('mobile-search-results-container'),
            closeMobileSearchBtn: document.getElementById('close-mobile-search-btn'),
            themeToggleBtn: document.getElementById('theme-toggle-btn'),
            feedbackBtn: document.getElementById('feedback-btn'),
            feedbackModal: document.getElementById('feedback-modal'),
            feedbackDialog: document.getElementById('feedback-dialog'),
            feedbackForm: document.getElementById('feedback-form'),
            closeFeedbackBtn: document.getElementById('close-feedback-btn'),
            feedbackSuccessMsg: document.getElementById('feedback-success-msg'),
            authModal: document.getElementById('auth-modal'),
            authDialog: document.getElementById('auth-dialog'),
            closeAuthBtn: document.getElementById('close-auth-btn'),
            authTitle: document.getElementById('auth-title'),
            loginPromptBtn: document.getElementById('login-prompt-btn'),
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
            userProfileBtn: document.getElementById('user-profile-btn'),
            sidebarAvatar: document.getElementById('sidebar-avatar'),
            sidebarNickname: document.getElementById('sidebar-nickname'),
            profileModal: document.getElementById('profile-modal'),
            profileDialog: document.getElementById('profile-dialog'),
            closeProfileBtn: document.getElementById('close-profile-btn'),
            profileViewContainer: document.getElementById('profile-view-container'),
            profileEditContainer: document.getElementById('profile-edit-container'),
            profileAvatarLarge: document.getElementById('profile-avatar-large'),
            profileNickname: document.getElementById('profile-nickname'),
            profileEmail: document.getElementById('profile-email'),
            profileMajorYear: document.getElementById('profile-major-year'),
            profileBio: document.getElementById('profile-bio'),
            editProfileBtn: document.getElementById('edit-profile-btn'),
            logoutButton: document.getElementById('logout-button'),
            cancelEditBtn: document.getElementById('cancel-edit-btn'),
            saveProfileBtn: document.getElementById('save-profile-btn'),
            avatarSelectionGrid: document.getElementById('avatar-selection-grid'),
            editNickname: document.getElementById('edit-nickname'),
            editBio: document.getElementById('edit-bio'),
            editEnrollmentYear: document.getElementById('edit-enrollment-year'),
            editMajor: document.getElementById('edit-major'),

            // --- 新增: 学习资料共享相关的DOM元素 ---
            materialsView: document.getElementById('materials-view'),
            materialsContent: document.getElementById('materials-content'),
            backToMainFromMaterialsBtn: document.getElementById('back-to-main-from-materials-btn'),
            uploadMaterialPromptBtn: document.getElementById('upload-material-prompt-btn'),
            uploadMaterialModal: document.getElementById('upload-material-modal'),
            uploadMaterialDialog: document.getElementById('upload-material-dialog'),
            closeUploadMaterialBtn: document.getElementById('close-upload-material-btn'),
            uploadMaterialForm: document.getElementById('upload-material-form'),
            materialFileInput: document.getElementById('material-file-input'),
            materialFileName: document.getElementById('material-file-name'),
            submitMaterialBtn: document.getElementById('submit-material-btn'),
            uploadProgressContainer: document.getElementById('upload-progress-container'),
            uploadProgressBar: document.getElementById('upload-progress-bar'),
            uploadStatusText: document.getElementById('upload-status-text'),
            uploadSuccessMsg: document.getElementById('upload-success-msg'),
            uploadFormFooter: document.getElementById('upload-form-footer'),
        };
    }

    _showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-circle';
        toast.innerHTML = `<div class="toast-icon"><i data-lucide="${iconName}"></i></div><span>${message}</span>`;
        container.appendChild(toast);
        lucide.createIcons({
            nodes: [toast.querySelector('.toast-icon')]
        });
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 4000);
    }

    async init() {
        theme.init(this.dom);
        this._setupEventListeners();

        authUI.listenForAuthStateChanges(async (userData) => {
            this.currentUserData = userData;

            try {
                console.log("Main: 认证完成，现在开始获取应用数据...");
                [this.guideData, this.campusData] = await Promise.all([
                    getGuideData(),
                    getCampusData()
                ]);

                if (!this.guideData || this.guideData.length === 0) {
                   throw new Error("指南数据加载失败或为空。");
                }
                 if (!this.campusData || !this.campusData.colleges) {
                   throw new Error("校区数据加载失败或为空。");
                }
                
                console.log("Main: 应用数据获取成功。");

                await this.initializeDataDependentModules();

                this.selectedCampus = localStorage.getItem('selectedCampus');
                if (this.selectedCampus) {
                    this.runApp();
                } else {
                    modals.showCampusSelector();
                }

                setTimeout(() => {
                    this.dom.loadingOverlay.style.opacity = '0';
                    setTimeout(() => this.dom.loadingOverlay.style.display = 'none', 500);
                }, 500);

            } catch (error) {
                console.error("Main: 获取或处理应用数据时失败!", error);
                this.dom.loadingOverlay.innerHTML = `<div class="text-center text-red-500 p-4"><p class="font-bold">应用加载失败</p><p class="text-sm mt-2">无法连接到服务器，请检查网络后重试。</p><p class="text-xs mt-2 text-gray-400">${error.message}</p></div>`;
            }
        });
    }

    async initializeDataDependentModules() {
        if (this.campusData && this.campusData.colleges) {
            try {
                const campusDataCopy = JSON.parse(JSON.stringify(this.campusData));
                await authUI.initializeProfileEditor(campusDataCopy);
            } catch (e) {
                console.error("无法为个人中心编辑器创建数据副本:", e);
                await authUI.initializeProfileEditor(this.campusData);
            }
        }
        viewManager.updateCampusData(this.campusData);
    }

    runApp() {
        createNavigation(this.dom.navMenu, this.guideData);
        this._renderAllContent();
        this._updateCampusDisplay();
        this._setupIntersectionObserver();
        this._updateActiveState("home", "home");
        search.init({
            domElements: this.dom,
            gData: this.guideData,
            cData: this.campusData,
            campus: this.selectedCampus,
            onResultClick: this._handleSearchResultClick.bind(this)
        });
        viewManager.updateCampus(this.selectedCampus);
    }

    _renderAllContent() {
        if (this.observer) this.observer.disconnect();
        this.dom.contentArea.innerHTML = '';

        this.guideData.forEach(categoryData => {
            categoryData.pages.forEach(page => {
                const section = document.createElement('div');
                section.className = 'content-section';
                section.id = `page-${categoryData.key}-${page.pageKey}`;
                section.dataset.pageKey = page.pageKey;
                section.dataset.categoryKey = categoryData.key;

                let htmlContent = '';
                if (page.isCampusSpecific) {
                    const keyMap = { 'dormitory': 'dormitories', 'canteen': 'canteens' };
                    const dataKey = keyMap[page.pageKey];
                    const items = this.campusData[dataKey]?.filter(item => item.campusId === this.selectedCampus) || [];
                    htmlContent = renderer.generateCampusCards(items, page.pageKey);
                } else {
                    htmlContent = renderer.renderPageContent(page);
                }

                section.innerHTML = htmlContent;
                this.dom.contentArea.appendChild(section);

                if (page.type === 'faq') this._addFaqListeners(section);
                if (page.type === 'clubs') this._addClubTabListeners(section);
                if (page.pageKey === 'campusQuery') this._initCampusQueryTool(section);
            });
        });

        this._addHomeListeners();
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    _setupEventListeners() {
        // --- 原有事件监听 ---
        this.dom.navMenu.addEventListener('click', (e) => handleNavigationClick(e, (category, page) => {
            // --- 修改: 增加对 'materials' 类别的处理 ---
            if (category === 'materials') {
                this._showMaterialsView();
            } else {
                this._hideMaterialsView(); // 从资料共享页切换走时，隐藏它
                viewManager.hideDetailView();
                this._updateActiveState(category, page);
                const targetElement = document.getElementById(`page-${category}-${page}`);
                if (targetElement) this._scrollToElement(targetElement);
            }
            if (window.innerWidth < 768) viewManager.toggleSidebar();
        }));

        this.dom.homeButtonTop.addEventListener('click', this._handleHomeClick.bind(this));
        this.dom.menuToggle.addEventListener('click', viewManager.toggleSidebar);
        this.dom.sidebarOverlay.addEventListener('click', viewManager.toggleSidebar);
        this.dom.campusModal.addEventListener('click', this._handleCampusSelection.bind(this));
        this.dom.changeCampusBtn.addEventListener('click', modals.showCampusSelector);
        this.dom.contentArea.addEventListener('click', this._handleCardClick.bind(this));
        this.dom.backToMainBtn.addEventListener('click', viewManager.hideDetailView);
        this.dom.bottomNavHome.addEventListener('click', this._handleHomeClick.bind(this));
        this.dom.bottomNavMenu.addEventListener('click', viewManager.toggleSidebar);
        this.dom.bottomNavSearch.addEventListener('click', viewManager.showMobileSearch);
        this.dom.bottomNavCampus.addEventListener('click', modals.showCampusSelector);
        this.dom.closeMobileSearchBtn.addEventListener('click', viewManager.hideMobileSearch);
        this.dom.feedbackForm.addEventListener('submit', this._handleFeedbackSubmit.bind(this));
        this.dom.feedbackBtn.addEventListener('click', modals.showFeedbackModal);
        this.dom.closeFeedbackBtn.addEventListener('click', modals.hideFeedbackModal);
        this.dom.loginPromptBtn.addEventListener('click', () => {
            authUI.handleAuthViewChange('login');
            modals.showAuthModal();
        });
        this.dom.closeAuthBtn.addEventListener('click', modals.hideAuthModal);
        this.dom.loginForm.addEventListener('submit', (e) => authUI.handleLoginSubmit(e));
        this.dom.registerForm.addEventListener('submit', (e) => authUI.handleRegisterSubmit(e));
        this.dom.resetPasswordForm.addEventListener('submit', (e) => authUI.handlePasswordResetSubmit(e));
        this.dom.sendVerificationCodeBtn.addEventListener('click', () => authUI.handleSendVerificationCode());
        this.dom.goToRegister.addEventListener('click', (e) => { e.preventDefault(); authUI.handleAuthViewChange('register'); });
        this.dom.goToLoginFromRegister.addEventListener('click', (e) => { e.preventDefault(); authUI.handleAuthViewChange('login'); });
        this.dom.forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); authUI.handleAuthViewChange('reset'); });
        this.dom.goToLoginFromReset.addEventListener('click', (e) => { e.preventDefault(); authUI.handleAuthViewChange('login'); });
        this.dom.userProfileBtn.addEventListener('click', () => { authUI.handleProfileViewChange('view'); modals.showProfileModal(); });
        this.dom.closeProfileBtn.addEventListener('click', modals.hideProfileModal);
        this.dom.logoutButton.addEventListener('click', () => { authUI.handleLogout(); modals.hideProfileModal(); });
        this.dom.editProfileBtn.addEventListener('click', () => { authUI.populateProfileEditForm(this.currentUserData); authUI.handleProfileViewChange('edit'); });
        this.dom.cancelEditBtn.addEventListener('click', () => authUI.handleProfileViewChange('view'));
        this.dom.profileEditContainer.addEventListener('submit', (e) => authUI.handleProfileSave(e, this.currentUserData));
        this.dom.avatarSelectionGrid.addEventListener('click', (e) => {
            const selectedAvatar = e.target.closest('.avatar-option');
            if (selectedAvatar) {
                this.dom.avatarSelectionGrid.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
                selectedAvatar.classList.add('selected');
            }
        });

        // --- 新增: 学习资料共享功能的事件监听 ---
        this.dom.backToMainFromMaterialsBtn.addEventListener('click', this._hideMaterialsView.bind(this));
        this.dom.uploadMaterialPromptBtn.addEventListener('click', this._handleUploadPrompt.bind(this));
        this.dom.closeUploadMaterialBtn.addEventListener('click', () => modals.hideUploadMaterialModal());
        this.dom.submitMaterialBtn.addEventListener('click', this._handleUploadMaterialSubmit.bind(this));
        this.dom.materialFileInput.addEventListener('change', (e) => {
            this.dom.materialFileName.textContent = e.target.files[0] ? e.target.files[0].name : '';
        });
        // 使用事件委托处理所有下载按钮的点击
        this.dom.materialsContent.addEventListener('click', this._handleMaterialDownload.bind(this));
    }

    async _handleFeedbackSubmit(e) {
        e.preventDefault();
        const submitButton = this.dom.feedbackForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = '提交中...';

        const content = this.dom.feedbackForm.content.value.trim();
        const contact = this.dom.feedbackForm.contact.value.trim();

        if (!content) {
            this._showToast('反馈内容不能为空', 'error');
            submitButton.disabled = false;
            submitButton.textContent = '提交';
            return;
        }

        try {
            await db.collection('feedback').add({
                content: content,
                contact: contact,
                submittedAt: db.serverDate(),
                userAgent: navigator.userAgent,
                campus: this.selectedCampus,
                userId: this.currentUserData ? this.currentUserData._id : 'anonymous'
            });

            this.dom.feedbackForm.classList.add('hidden');
            this.dom.feedbackSuccessMsg.classList.remove('hidden');

            setTimeout(() => {
                modals.hideFeedbackModal();
            }, 3000);

        } catch (error) {
            console.error('提交反馈失败:', error);
            this._showToast('提交失败，请稍后再试', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '提交';
        }
    }

    _handleCampusSelection(e) {
        const button = e.target.closest('.campus-select-btn');
        if (!button) return;
        const campus = button.dataset.campus;
        localStorage.setItem('selectedCampus', campus);
        this.selectedCampus = campus;
        search.updateCampus(campus);
        viewManager.updateCampus(campus);
        modals.hideCampusSelector(() => {
            this.runApp();
        });
    }

    _updateCampusDisplay() {
        const campusInfo = this.campusData.campuses.find(c => c.id === this.selectedCampus);
        if (campusInfo) {
            this.dom.currentCampusDisplay.textContent = `当前: ${campusInfo.name}`;
        }
    }

    _setupIntersectionObserver() {
        const options = {
            root: this.dom.contentArea,
            threshold: 0,
            rootMargin: `-${document.querySelector('header').offsetHeight}px 0px -${this.dom.contentArea.clientHeight - document.querySelector('header').offsetHeight - 1}px 0px`
        };
        this.observer = new IntersectionObserver((entries) => {
            if (this.isScrollingProgrammatically) return;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const { categoryKey, pageKey } = entry.target.dataset;
                    this._updateActiveState(categoryKey, pageKey);
                }
            });
        }, options);
        document.querySelectorAll('.content-section').forEach(section => {
            this.observer.observe(section);
        });
    }

    _updateActiveState(categoryKey, pageKey) {
        const category = this.guideData.find(c => c.key === categoryKey);
        const pageData = category?.pages.find(p => p.pageKey === pageKey);
        if (pageData) {
            this.dom.contentTitle.textContent = pageData.title;
        }
        updateActiveNav(categoryKey, pageKey);
        this.dom.bottomNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        if (categoryKey === 'home') {
            this.dom.bottomNavHome.classList.add('active');
        }
    }

    _handleHomeClick(e) {
        e.preventDefault();
        this._hideMaterialsView();
        viewManager.hideDetailView();
        const homeElement = document.getElementById('page-home-home');
        if (homeElement) {
            this._updateActiveState("home", "home");
            this._scrollToElement(homeElement);
        }
    }

    _scrollToElement(targetElement, keyword = null) {
        this.isScrollingProgrammatically = true;
        const topOffset = document.querySelector('header').offsetHeight;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + this.dom.contentArea.scrollTop - topOffset;
        this.dom.contentArea.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
        if (keyword) {
            setTimeout(() => search.highlightKeywordInSection(targetElement, keyword), 500);
        }
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.isScrollingProgrammatically = false;
        }, 1000);
    }

    _addFaqListeners(container) { /* ... (原有代码不变) ... */ }
    _addClubTabListeners(container) { /* ... (原有代码不变) ... */ }
    _addHomeListeners() { /* ... (原有代码不变) ... */ }
    _handleCardClick(e) { /* ... (原有代码不变) ... */ }
    _handleSearchResultClick(dataset) { /* ... (原有代码不变) ... */ }
    _initCampusQueryTool(container) { /* ... (原有代码不变) ... */ }

    // ===================================================================================
    // --- 新增: 学习资料共享中心的核心逻辑方法 ---
    // ===================================================================================

    /**
     * 显示学习资料视图
     */
    _showMaterialsView() {
        this.dom.mainView.classList.add('hidden');
        this.dom.detailView.classList.add('hidden');
        this.dom.materialsView.classList.remove('hidden');
        this.dom.materialsView.classList.add('flex');
        updateActiveNav('materials', null); // 高亮导航
        this._loadAndRenderMaterials();
    }

    /**
     * 隐藏学习资料视图
     */
    _hideMaterialsView() {
        if (!this.dom.materialsView.classList.contains('hidden')) {
            this.dom.materialsView.classList.add('hidden');
            this.dom.materialsView.classList.remove('flex');
            this.dom.mainView.classList.remove('hidden');
        }
    }

    /**
     * 异步加载并渲染学习资料列表
     */
    async _loadAndRenderMaterials() {
        this.dom.materialsContent.innerHTML = `<div class="loader mx-auto mt-16"></div>`;
        const materials = await getMaterials();
        this.dom.materialsContent.innerHTML = renderer.generateMaterialsList(materials);
        lucide.createIcons();
    }
    
    /**
     * 处理点击“上传资料”按钮的逻辑
     */
    _handleUploadPrompt() {
        if (!this.currentUserData) {
            this._showToast('请先登录再分享资料哦', 'info');
            authUI.handleAuthViewChange('login');
            modals.showAuthModal();
            return;
        }
        this._resetUploadForm();
        // --- 修复: 调用 modals.js 中新增的专用函数 ---
        modals.showUploadMaterialModal();
    }

    /**
     * 重置上传表单到初始状态
     */
    _resetUploadForm() {
        this.dom.uploadMaterialForm.reset();
        this.dom.materialFileName.textContent = '';
        this.dom.uploadProgressContainer.classList.add('hidden');
        this.dom.uploadSuccessMsg.classList.add('hidden');
        this.dom.uploadMaterialForm.classList.remove('hidden');
        this.dom.uploadFormFooter.classList.remove('hidden');
        this.dom.submitMaterialBtn.disabled = false;
    }

    /**
     * 处理上传表单的提交逻辑
     */
    async _handleUploadMaterialSubmit() {
        const form = this.dom.uploadMaterialForm;
        const fileInput = this.dom.materialFileInput;
        const submitBtn = this.dom.submitMaterialBtn;

        // 1. 表单验证
        if (!form.checkValidity()) {
            this._showToast('请填写所有必填项', 'error');
            form.reportValidity();
            return;
        }
        if (fileInput.files.length === 0) {
            this._showToast('请选择要上传的文件', 'error');
            return;
        }

        submitBtn.disabled = true;
        this.dom.uploadStatusText.textContent = '准备上传...';
        this.dom.uploadProgressContainer.classList.remove('hidden');
        this.dom.uploadProgressBar.style.width = '0%';

        const file = fileInput.files[0];
        const formData = new FormData(form);

        try {
            // 2. 上传文件到云存储
            const cloudPath = `study_materials/${this.currentUserData._id}/${Date.now()}-${file.name}`;
            const uploadResult = await app.uploadFile({
                cloudPath,
                filePath: file,
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    this.dom.uploadStatusText.textContent = `正在上传... ${percentCompleted}%`;
                    this.dom.uploadProgressBar.style.width = `${percentCompleted}%`;
                }
            });

            this.dom.uploadStatusText.textContent = '正在写入数据库...';

            // 3. 将文件信息存入数据库
            const materialData = {
                uploaderId: this.currentUserData._id,
                uploaderNickname: this.currentUserData.nickname,
                courseName: formData.get('courseName'),
                teacher: formData.get('teacher'),
                materialType: formData.get('materialType'),
                description: formData.get('description'),
                fileName: file.name,
                fileCloudPath: uploadResult.fileID, // 关键：使用返回的 File ID
                fileSize: file.size,
                downloadCount: 0,
                rating: 0,
                ratingCount: 0,
            };

            await addMaterial(materialData);

            // 4. 显示成功信息
            this.dom.uploadMaterialForm.classList.add('hidden');
            this.dom.uploadFormFooter.classList.add('hidden');
            this.dom.uploadProgressContainer.classList.add('hidden');
            this.dom.uploadSuccessMsg.classList.remove('hidden');
            lucide.createIcons();

            // 5. 刷新列表并关闭模态框
            await this._loadAndRenderMaterials();
            setTimeout(() => {
                modals.hideUploadMaterialModal(() => {
                    this._resetUploadForm();
                });
            }, 3000);

        } catch (error) {
            console.error('上传失败:', error);
            this._showToast(`上传失败: ${error.message || '未知错误'}`, 'error');
            submitBtn.disabled = false;
            this.dom.uploadProgressContainer.classList.add('hidden');
        }
    }

    /**
     * 处理资料下载点击事件 (事件委托)
     */
    async _handleMaterialDownload(e) {
        const downloadBtn = e.target.closest('.download-material-btn');
        if (!downloadBtn) return;

        const { filePath, docId } = downloadBtn.dataset;
        if (!filePath || !docId) {
            this._showToast('文件信息无效，无法下载', 'error');
            return;
        }

        downloadBtn.disabled = true;
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = `<span class="loader-small"></span>正在获取链接...`;

        try {
            // 1. 获取临时下载链接
            const { fileList } = await app.getTempFileURL({ fileList: [filePath] });
            
            if (fileList[0] && fileList[0].tempFileURL) {
                const tempUrl = fileList[0].tempFileURL;
                // 2. 打开链接触发下载
                window.open(tempUrl, '_blank');
                // 3. 在后台增加下载次数 (无需等待)
                incrementDownloadCount(docId);
            } else {
                throw new Error('无法获取有效的下载链接');
            }
        } catch (error) {
            console.error('下载失败:', error);
            this._showToast(`下载失败: ${error.message || '请稍后再试'}`, 'error');
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalText;
        }
    }
}

// [关键改动] 重构后的应用启动入口
document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';
    
    const app = new GuideApp();
    await app.init();
});
