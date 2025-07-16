/**
 * @file 模态框（弹窗）管理模块
 * @description 负责所有模态框的显示、隐藏和相关动画。
 */

// --- 模块内变量，用于缓存DOM元素 ---
let dom = {};

/**
 * 初始化模块，缓存需要操作的DOM元素。
 * @param {Object} domElements - 从主应用传入的DOM元素对象。
 */
export function init(domElements) {
    dom = domElements;
}

/**
 * 显示一个模态框的通用函数。
 * @param {HTMLElement} modalElement - 模态框的根元素。
 * @param {HTMLElement} dialogElement - 模态框的内容对话框元素。
 */
function showModal(modalElement, dialogElement) {
    modalElement.classList.remove('hidden');
    setTimeout(() => {
        modalElement.style.opacity = '1';
        dialogElement.style.transform = 'scale(1)';
        dialogElement.style.opacity = '1';
    }, 10);
}

/**
 * 隐藏一个模态框的通用函数。
 * @param {HTMLElement} modalElement - 模态框的根元素。
 * @param {HTMLElement} dialogElement - 模态框的内容对话框元素。
 * @param {function} [onHidden] - 模态框完全隐藏后执行的回调函数。
 */
function hideModal(modalElement, dialogElement, onHidden) {
    modalElement.style.opacity = '0';
    dialogElement.style.transform = 'scale(0.95)';
    dialogElement.style.opacity = '0';
    setTimeout(() => {
        modalElement.classList.add('hidden');
        if (onHidden) {
            onHidden();
        }
    }, 300);
}

// --- 具体的模态框控制函数 ---

export function showFeedbackModal() {
    showModal(dom.feedbackModal, dom.feedbackDialog);
}

export function hideFeedbackModal() {
    hideModal(dom.feedbackModal, dom.feedbackDialog, () => {
        // 隐藏后重置表单
        dom.feedbackForm.classList.remove('hidden');
        dom.feedbackSuccessMsg.classList.add('hidden');
        dom.feedbackForm.reset();
    });
}

export function showAuthModal() {
    showModal(dom.authModal, dom.authDialog);
}

export function hideAuthModal() {
    hideModal(dom.authModal, dom.authDialog);
}

export function showProfileModal() {
    showModal(dom.profileModal, dom.profileDialog);
}

export function hideProfileModal() {
    hideModal(dom.profileModal, dom.profileDialog);
}

export function showCampusSelector() {
    showModal(dom.campusModal, dom.campusDialog);
}

export function hideCampusSelector(onHidden) {
    hideModal(dom.campusModal, dom.campusDialog, onHidden);
}
