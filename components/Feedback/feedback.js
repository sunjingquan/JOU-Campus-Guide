/**
 * @file 反馈组件 (Feedback Component)
 * @description 一个完全独立的、自初始化的模块，封装了所有与用户反馈相关的功能，
 * 包括模态框的显示/隐藏、表单提交、API调用和UI状态管理。
 */

// 导入与后端通信的API服务和事件总线
import { submitFeedback } from '../../services/api.js';
import { eventBus } from '../../services/eventBus.js';

// --- 模块内变量，用于缓存组件所需的DOM元素 ---
let feedbackModal;
let feedbackDialog;
let feedbackForm;
let closeFeedbackBtn;
let openFeedbackBtn; // 侧边栏的“信息反馈”按钮
let feedbackSuccessMsg;
let submitButton;

/**
 * 显示反馈模态框，并应用动画。
 * @private
 */
function showModal() {
    feedbackModal.classList.remove('hidden');
    // 使用一个微小的延迟来确保CSS transition能够生效
    setTimeout(() => {
        feedbackModal.style.opacity = '1';
        feedbackDialog.style.transform = 'scale(1)';
        feedbackDialog.style.opacity = '1';
    }, 10);
}

/**
 * 隐藏反馈模态框，并在动画结束后重置表单。
 * @private
 */
function hideModal() {
    feedbackModal.style.opacity = '0';
    feedbackDialog.style.transform = 'scale(0.95)';
    feedbackDialog.style.opacity = '0';
    setTimeout(() => {
        feedbackModal.classList.add('hidden');
        // 隐藏后重置表单，以便下次打开是干净的
        feedbackForm.classList.remove('hidden');
        feedbackSuccessMsg.classList.add('hidden');
        feedbackForm.reset();
    }, 300); // 300ms是CSS transition的持续时间
}

/**
 * 处理表单提交的核心逻辑。
 * @param {Event} e - 表单提交事件对象。
 * @private
 */
async function handleFormSubmit(e) {
    e.preventDefault(); // 阻止表单的默认提交行为

    // 禁用按钮，防止重复提交
    submitButton.disabled = true;
    submitButton.textContent = '提交中...';

    const content = feedbackForm.content.value.trim();
    const contact = feedbackForm.contact.value.trim();

    if (!content) {
        // 使用事件总线发布一个全局的toast消息事件
        eventBus.publish('toast:show', { message: '反馈内容不能为空', type: 'error' });
        submitButton.disabled = false;
        submitButton.textContent = '提交';
        return;
    }

    try {
        // 调用API服务提交数据
        // 注意：我们不再需要传递userAgent等信息，这些已在api.js中封装
        await submitFeedback({ content, contact });

        // 提交成功，显示成功界面
        feedbackForm.classList.add('hidden');
        feedbackSuccessMsg.classList.remove('hidden');

        // 3秒后自动关闭模态框
        setTimeout(hideModal, 3000);

    } catch (error) {
        console.error('Feedback component submission failed:', error);
        eventBus.publish('toast:show', { message: '提交失败，请稍后再试', type: 'error' });
    } finally {
        // 无论成功与否，最终都恢复按钮状态（除非成功后自动关闭）
        if (!feedbackForm.classList.contains('hidden')) {
             submitButton.disabled = false;
             submitButton.textContent = '提交';
        }
    }
}

/**
 * (导出函数) 初始化反馈组件。
 * 这是该模块唯一的公开接口。
 */
export function init() {
    // 1. 组件自己负责查找所有它需要的DOM元素
    feedbackModal = document.getElementById('feedback-modal');
    feedbackDialog = document.getElementById('feedback-dialog');
    feedbackForm = document.getElementById('feedback-form');
    closeFeedbackBtn = document.getElementById('close-feedback-btn');
    openFeedbackBtn = document.getElementById('feedback-btn');
    feedbackSuccessMsg = document.getElementById('feedback-success-msg');
    submitButton = feedbackForm.querySelector('button[type="submit"]');

    // 2. 健壮性检查：如果页面上找不到必要的元素，就直接返回，不绑定事件
    if (!feedbackModal || !openFeedbackBtn || !closeFeedbackBtn || !feedbackForm) {
        console.warn("Feedback Component: Could not find all required DOM elements. Component will not initialize.");
        return;
    }

    // 3. 为组件相关的元素绑定事件监听
    openFeedbackBtn.addEventListener('click', showModal);
    closeFeedbackBtn.addEventListener('click', hideModal);
    feedbackForm.addEventListener('submit', handleFormSubmit);

    console.log("Feedback component initialized successfully.");
}
