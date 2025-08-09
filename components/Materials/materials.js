/**
 * @file 学习资料组件 (Materials Component)
 * @description 一个独立的、高内聚的模块，负责所有与学习资料共享相关的功能。
 * 它管理自己的视图、数据、事件和状态。
 * @version 1.0.0
 */

// --- 依赖导入 ---
import { app, db } from '../../js/cloudbase.js';
import { eventBus } from '../../services/eventBus.js';
import { getMaterials, addMaterial, incrementDownloadCount, addRating, checkIfUserRated } from '../../services/api.js';
import { createMaterialsListHtml } from './materials.templates.js';

// --- 模块内变量 ---
let dom = {}; // 缓存本组件需要操作的DOM元素
let campusData = null; // 存储从主应用传入的校区数据
let currentUserData = null; // 当前登录的用户信息
let searchDebounceTimer = null; // 搜索防抖计时器
let materialRatingCache = new Map(); // 缓存资料的评分信息

// 默认的筛选和排序状态
let filters = {
    college: '',
    major: '',
    searchTerm: '',
    sortBy: 'createdAt',
    order: 'desc'
};

// =============================================================================
// --- 公共接口 (Public API) ---
// =============================================================================

/**
 * (导出函数) 初始化学习资料组件。
 * @param {object} config - 配置对象
 * @param {object} config.cData - 从主应用传入的校区数据
 */
export function init(config) {
    campusData = config.cData;
    _cacheDOMElements();
    _setupEventListeners();
    console.log("Materials Component Initialized.");
}

/**
 * (导出函数) 显示学习资料视图。
 */
export function show() {
    dom.mainView.classList.add('hidden');
    dom.detailView.classList.add('hidden');
    dom.materialsView.classList.remove('hidden');
    dom.materialsView.classList.add('flex');
    
    _populateFilterCollegeSelect();
    _loadAndRenderMaterials();
}

/**
 * (导出函数) 隐藏学习资料视图。
 */
export function hide() {
    if (!dom.materialsView.classList.contains('hidden')) {
        dom.materialsView.classList.add('hidden');
        dom.materialsView.classList.remove('flex');
        dom.mainView.classList.remove('hidden');
    }
}

// =============================================================================
// --- 核心逻辑函数 (Private Methods) ---
// =============================================================================

/**
 * 加载并渲染资料列表。
 * @private
 */
async function _loadAndRenderMaterials() {
    dom.materialsContent.innerHTML = `<div class="loader mx-auto mt-16"></div>`;
    const materials = await getMaterials(filters);

    // 清空并重建评分缓存
    materialRatingCache.clear();
    materials.forEach(m => {
        materialRatingCache.set(m._id, {
            rating: m.rating || 0,
            ratingCount: m.ratingCount || 0
        });
    });

    // 调用模板生成HTML并渲染
    dom.materialsContent.innerHTML = createMaterialsListHtml(materials);
    lucide.createIcons();

    // 如果用户已登录，检查并禁用已评分项
    if (currentUserData) {
        dom.materialsContent.querySelectorAll('.material-rating-stars').forEach(async container => {
            const docId = container.dataset.docId;
            const hasRated = await checkIfUserRated(docId, currentUserData._id);
            if (hasRated) {
                container.classList.add('disabled');
                container.parentElement.setAttribute('title', '您已评过分');
            }
        });
    }
}

/**
 * 处理上传资料的请求。
 * @private
 */
function _handleUploadPrompt() {
    if (!currentUserData) {
        eventBus.publish('toast:show', { message: '请先登录再分享资料哦', type: 'info' });
        eventBus.publish('auth:requestLogin');
        return;
    }
    _resetUploadForm();
    _populateUploadCollegeSelect();
    _showUploadMaterialModal();
}

/**
 * 重置上传表单到初始状态。
 * @private
 */
function _resetUploadForm() {
    dom.uploadMaterialForm.reset();
    dom.materialFileName.textContent = '';
    dom.uploadProgressContainer.classList.add('hidden');
    dom.uploadSuccessMsg.classList.add('hidden');
    dom.uploadMaterialForm.classList.remove('hidden');
    dom.uploadFormFooter.classList.remove('hidden');
    dom.submitMaterialBtn.disabled = false;
    dom.materialMajorSelect.innerHTML = '<option value="">-- 请先选择学院 --</option>';
    dom.materialMajorSelect.disabled = true;
}

/**
 * 提交上传资料的表单。
 * @private
 */
async function _handleUploadMaterialSubmit() {
    const form = dom.uploadMaterialForm;
    const fileInput = dom.materialFileInput;
    const submitBtn = dom.submitMaterialBtn;

    // 表单验证
    if (!form.checkValidity()) {
        eventBus.publish('toast:show', { message: '请填写所有必填项', type: 'error' });
        form.reportValidity();
        return;
    }
    if (fileInput.files.length === 0) {
        eventBus.publish('toast:show', { message: '请选择要上传的文件', type: 'error' });
        return;
    }

    const file = fileInput.files[0];
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'text/plain', 'application/zip', 'application/x-rar-compressed'];
    const maxSizeInMB = 20;

    if (!allowedTypes.includes(file.type)) {
        eventBus.publish('toast:show', { message: '不支持的文件类型！', type: 'error' });
        return;
    }
    if (file.size > maxSizeInMB * 1024 * 1024) {
        eventBus.publish('toast:show', { message: `文件大小不能超过 ${maxSizeInMB}MB`, type: 'error' });
        return;
    }

    // 更新UI为上传中状态
    submitBtn.disabled = true;
    dom.uploadStatusText.textContent = '准备上传...';
    dom.uploadProgressContainer.classList.remove('hidden');
    dom.uploadProgressBar.style.width = '0%';

    try {
        const userIdentifier = currentUserData.studentId || currentUserData._id;
        const cloudPath = `study_materials/${userIdentifier}/${Date.now()}-${file.name}`;
        
        // 1. 上传文件到云存储
        const uploadResult = await app.uploadFile({
            cloudPath,
            filePath: file,
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                dom.uploadStatusText.textContent = `正在上传... ${percentCompleted}%`;
                dom.uploadProgressBar.style.width = `${percentCompleted}%`;
            }
        });

        // 2. 将文件信息写入数据库
        dom.uploadStatusText.textContent = '正在写入数据库...';
        const formData = new FormData(form);
        const materialData = {
            uploaderId: currentUserData._id,
            uploaderStudentId: currentUserData.studentId || null,
            uploaderNickname: currentUserData.nickname,
            courseName: formData.get('courseName'),
            teacher: formData.get('teacher'),
            college: formData.get('college'),
            major: formData.get('major'),
            materialType: formData.get('materialType'),
            description: formData.get('description'),
            fileName: file.name,
            fileCloudPath: uploadResult.fileID,
            fileSize: file.size
        };

        await addMaterial(materialData);

        // 3. 更新UI为成功状态
        dom.uploadMaterialForm.classList.add('hidden');
        dom.uploadFormFooter.classList.add('hidden');
        dom.uploadProgressContainer.classList.add('hidden');
        dom.uploadSuccessMsg.classList.remove('hidden');
        lucide.createIcons();
        
        await _loadAndRenderMaterials(); // 重新加载列表
        setTimeout(() => _hideUploadMaterialModal(_resetUploadForm), 3000);

    } catch (error) {
        console.error('上传失败:', error);
        eventBus.publish('toast:show', { message: `上传失败: ${error.message || '未知错误'}`, type: 'error' });
        submitBtn.disabled = false;
        dom.uploadProgressContainer.classList.add('hidden');
    }
}

/**
 * 处理资料下载。
 * @param {Event} e - 点击事件
 * @private
 */
async function _handleMaterialDownload(e) {
    const downloadBtn = e.target.closest('.download-material-btn');
    if (!downloadBtn) return;
    
    if (!currentUserData) {
        eventBus.publish('toast:show', { message: '请先登录才能下载资料哦', type: 'info' });
        eventBus.publish('auth:requestLogin');
        return;
    }

    const { filePath, docId } = downloadBtn.dataset;
    if (!filePath || !docId) {
        eventBus.publish('toast:show', { message: '文件信息无效，无法下载', type: 'error' });
        return;
    }

    // 更新UI为处理中
    downloadBtn.disabled = true;
    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = `<span class="loader-small"></span>正在获取链接...`;

    try {
        const { fileList } = await app.getTempFileURL({ fileList: [filePath] });
        if (fileList[0] && fileList[0].tempFileURL) {
            window.open(fileList[0].tempFileURL, '_blank');
            incrementDownloadCount(docId);
            
            // 立即更新界面上的下载次数
            const countElement = downloadBtn.closest('.material-card').querySelector('[data-lucide="download"] + span');
            if (countElement) {
                countElement.textContent = parseInt(countElement.textContent, 10) + 1;
            }
        } else {
            throw new Error('无法获取有效的下载链接');
        }
    } catch (error) {
        console.error('下载失败:', error);
        eventBus.publish('toast:show', { message: `下载失败: ${error.message || '请稍后再试'}`, type: 'error' });
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = originalText;
    }
}

/**
 * 处理资料评分。
 * @param {Event} e - 点击事件
 * @private
 */
async function _handleMaterialRating(e) {
    const star = e.target.closest('.rating-star');
    if (!star) return;

    if (!currentUserData) {
        eventBus.publish('toast:show', { message: '请先登录才能评分哦', type: 'info' });
        eventBus.publish('auth:requestLogin');
        return;
    }

    const ratingStarsContainer = star.parentElement;
    const docId = ratingStarsContainer.dataset.docId;
    const ratingValue = parseInt(star.dataset.value, 10);

    if (ratingStarsContainer.classList.contains('disabled')) {
        eventBus.publish('toast:show', { message: '您已经评过分啦', type: 'info' });
        return;
    }

    ratingStarsContainer.classList.add('disabled');
    ratingStarsContainer.parentElement.setAttribute('title', '正在提交...');

    try {
        await addRating(docId, currentUserData._id, currentUserData.studentId, ratingValue);
        eventBus.publish('toast:show', { message: '感谢您的评分！', type: 'success' });

        // 更新本地缓存和UI
        const oldRatingData = materialRatingCache.get(docId) || { rating: 0, ratingCount: 0 };
        const newRatingCount = oldRatingData.ratingCount + 1;
        const newTotalScore = (oldRatingData.rating * oldRatingData.ratingCount) + ratingValue;
        const newRating = newTotalScore / newRatingCount;
        materialRatingCache.set(docId, { rating: newRating, ratingCount: newRatingCount });
        
        _updateRatingUI(ratingStarsContainer, newRating, newRatingCount);
        ratingStarsContainer.parentElement.setAttribute('title', '您已评过分');
    } catch (error) {
        console.error('评分失败:', error);
        eventBus.publish('toast:show', { message: '评分失败，请稍后再试', type: 'error' });
        ratingStarsContainer.classList.remove('disabled');
        ratingStarsContainer.parentElement.setAttribute('title', '点击评分');
    }
}


// =============================================================================
// --- UI 更新与辅助函数 (UI Update & Helpers) ---
// =============================================================================

/**
 * 填充筛选栏的学院下拉列表。
 * @private
 */
function _populateFilterCollegeSelect() {
    const select = dom.materialsCollegeFilter;
    select.innerHTML = '<option value="">所有学院</option>';
    if (campusData && campusData.colleges) {
        const collegeNames = [...new Set(campusData.colleges.map(c => c.college))];
        collegeNames.sort((a, b) => a.localeCompare(b, 'zh-CN'));
        collegeNames.forEach(name => select.add(new Option(name, name)));
    }
}

/**
 * 填充上传表单的学院下拉列表。
 * @private
 */
function _populateUploadCollegeSelect() {
    const select = dom.materialCollegeSelect;
    select.innerHTML = '<option value="">-- 请选择学院 --</option>';
    if (campusData && campusData.colleges) {
        const collegeNames = [...new Set(campusData.colleges.map(c => c.college))];
        collegeNames.sort((a, b) => a.localeCompare(b, 'zh-CN'));
        collegeNames.forEach(name => select.add(new Option(name, name)));
    }
}

/**
 * 处理筛选栏学院变化事件，联动专业下拉列表。
 * @private
 */
function _handleFilterCollegeChange() {
    const collegeName = dom.materialsCollegeFilter.value;
    const majorSelect = dom.materialsMajorFilter;
    majorSelect.innerHTML = '<option value="">所有专业</option>';
    if (collegeName && campusData && campusData.colleges) {
        const college = campusData.colleges.find(c => c.college === collegeName);
        if (college && college.majors && college.majors.length > 0) {
            college.majors.forEach(majorName => majorSelect.add(new Option(majorName, majorName)));
            majorSelect.disabled = false;
        } else {
            majorSelect.disabled = true;
        }
    } else {
        majorSelect.disabled = true;
    }
    _handleFilterChange();
}

/**
 * 处理上传表单学院变化事件，联动专业下拉列表。
 * @private
 */
function _handleUploadCollegeChange() {
    const collegeName = dom.materialCollegeSelect.value;
    const majorSelect = dom.materialMajorSelect;
    majorSelect.innerHTML = '<option value="">-- 请选择专业 --</option>';
    if (collegeName && campusData && campusData.colleges) {
        const college = campusData.colleges.find(c => c.college === collegeName);
        if (college && college.majors && college.majors.length > 0) {
            college.majors.forEach(majorName => majorSelect.add(new Option(majorName, majorName)));
            majorSelect.disabled = false;
        } else {
            majorSelect.innerHTML = '<option value="">-- 该学院无专业数据 --</option>';
            majorSelect.disabled = true;
        }
    } else {
        majorSelect.disabled = true;
    }
}

/**
 * 处理任何筛选条件变化，并重新加载数据。
 * @private
 */
function _handleFilterChange() {
    filters.college = dom.materialsCollegeFilter.value;
    filters.major = dom.materialsMajorFilter.value;
    filters.searchTerm = dom.materialsSearchInput.value.trim();
    _loadAndRenderMaterials();
}

/**
 * 处理搜索输入，使用防抖优化性能。
 * @private
 */
function _handleSearchChange() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        _handleFilterChange();
    }, 500);
}

/**
 * 处理排序方式变化。
 * @param {Event} e - 点击事件
 * @private
 */
function _handleSortChange(e) {
    const button = e.target.closest('.sort-btn');
    if (!button || button.classList.contains('active')) return;
    
    dom.materialsSortButtons.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    filters.sortBy = button.dataset.sort;
    _handleFilterChange();
}

/**
 * 更新评分星星的UI。
 * @param {HTMLElement} ratingStarsContainer - 包含星星的容器
 * @param {number} newRating - 新的平均分
 * @param {number} newRatingCount - 新的评分人数
 * @private
 */
function _updateRatingUI(ratingStarsContainer, newRating, newRatingCount) {
    const ratingContainer = ratingStarsContainer.closest('.material-rating-container');
    const scoreElement = ratingContainer.querySelector('.rating-score');
    const countElement = ratingContainer.querySelector('.rating-count');
    
    scoreElement.textContent = newRating.toFixed(1);
    if (countElement) {
        countElement.textContent = `(${newRatingCount}人)`;
    } else {
        const newCountElement = document.createElement('span');
        newCountElement.className = 'rating-count';
        newCountElement.textContent = `(${newRatingCount}人)`;
        scoreElement.after(newCountElement);
    }

    const fullStars = Math.floor(newRating);
    const halfStar = newRating % 1 >= 0.5;
    ratingStarsContainer.querySelectorAll('.rating-star').forEach((s, index) => {
        s.classList.remove('star-filled', 'hover');
        let icon = 'star';
        if (index < fullStars) {
            s.classList.add('star-filled');
        } else if (index === fullStars && halfStar) {
            icon = 'star-half';
            s.classList.add('star-filled');
        }
        s.querySelector('i').setAttribute('data-lucide', icon);
    });
    lucide.createIcons({ nodes: [ratingStarsContainer] });
}

// =============================================================================
// --- 初始化与设置 (Initialization & Setup) ---
// =============================================================================

/**
 * 缓存本组件需要操作的所有DOM元素。
 * @private
 */
function _cacheDOMElements() {
    dom = {
        mainView: document.getElementById('main-view'),
        detailView: document.getElementById('detail-view'),
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
        materialCollegeSelect: document.getElementById('material-college'),
        materialMajorSelect: document.getElementById('material-major'),
        materialsCollegeFilter: document.getElementById('materials-college-filter'),
        materialsMajorFilter: document.getElementById('materials-major-filter'),
        materialsSearchInput: document.getElementById('materials-search-input'),
        materialsSortButtons: document.getElementById('materials-sort-buttons'),
    };
}

/**
 * 为本组件的所有DOM元素绑定事件监听。
 * @private
 */
function _setupEventListeners() {
    // 使用事件委托处理动态生成的卡片上的事件
    dom.materialsContent.addEventListener('click', (e) => {
        if (e.target.closest('.download-material-btn')) _handleMaterialDownload(e);
        if (e.target.closest('#upload-from-empty-state-btn')) _handleUploadPrompt();
        if (e.target.closest('.rating-star')) _handleMaterialRating(e);
    });

    // 视图切换和弹窗控制
    dom.backToMainFromMaterialsBtn.addEventListener('click', hide);
    dom.uploadMaterialPromptBtn.addEventListener('click', _handleUploadPrompt);
    dom.closeUploadMaterialBtn.addEventListener('click', () => _hideUploadMaterialModal());
    dom.submitMaterialBtn.addEventListener('click', _handleUploadMaterialSubmit);
    
    // 上传表单文件选择
    dom.materialFileInput.addEventListener('change', (e) => {
        dom.materialFileName.textContent = e.target.files[0] ? e.target.files[0].name : '';
    });
    
    // 筛选和排序
    dom.materialsCollegeFilter.addEventListener('change', _handleFilterCollegeChange);
    dom.materialsMajorFilter.addEventListener('change', _handleFilterChange);
    dom.materialsSearchInput.addEventListener('input', _handleSearchChange);
    dom.materialsSortButtons.addEventListener('click', _handleSortChange);

    // 上传表单内的学院/专业联动
    dom.materialCollegeSelect.addEventListener('change', _handleUploadCollegeChange);

    // 监听全局认证状态变化
    eventBus.subscribe('auth:stateChanged', (data) => {
        currentUserData = data.user;
    });
}


// --- 弹窗控制辅助函数 ---
function _showUploadMaterialModal() {
    dom.uploadMaterialModal.classList.remove('hidden');
    setTimeout(() => {
        dom.uploadMaterialModal.style.opacity = '1';
        dom.uploadMaterialDialog.style.transform = 'scale(1)';
        dom.uploadMaterialDialog.style.opacity = '1';
    }, 10);
}

function _hideUploadMaterialModal(onHidden) {
    dom.uploadMaterialModal.style.opacity = '0';
    dom.uploadMaterialDialog.style.transform = 'scale(0.95)';
    dom.uploadMaterialDialog.style.opacity = '0';
    setTimeout(() => {
        dom.uploadMaterialModal.classList.add('hidden');
        if (onHidden) onHidden();
    }, 300);
}
