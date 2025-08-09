/**
 * @file 事件总线 (Event Bus)
 * @description 一个极简的发布/订阅事件中心。
 * 它允许应用中不同的、独立的模块之间进行通信，而无需直接相互引用，从而实现深度解耦。
 * 这就像一个公共广播系统。
 */

// 用于存储所有事件及其对应的“订阅者”（回调函数）的仓库
// 数据结构是这样的: { '事件名': [回调函数1, 回调函数2], ... }
const events = {};

export const eventBus = {
    /**
     * 订阅一个事件 (收听特定频道的广播)
     * @param {string} event - 事件的名称，就像广播的频道名 (例如: 'user:loggedIn')
     * @param {function} callback - 当事件发生时，需要执行的函数
     */
    subscribe(event, callback) {
        // 检查这个“频道”是否已经存在于我们的仓库中
        if (!events[event]) {
            // 如果不存在，就创建一个新的空数组来存放订阅者
            events[event] = [];
        }
        // 将传入的回调函数（订阅者）添加到这个频道的列表中
        events[event].push(callback);
    },

    /**
     * 发布一个事件 (向特定频道进行广播)
     * @param {string} event - 要广播的频道名称 (例如: 'toast:show')
     * @param {*} data - 广播时需要传递给所有订阅者的数据
     */
    publish(event, data) {
        // 检查是否有人订阅了这个“频道”
        if (events[event]) {
            // 如果有，就遍历该频道的所有订阅者（回调函数）
            events[event].forEach(callback => {
                // 执行每一个回调函数，并将广播的数据作为参数传给它
                callback(data);
            });
        }
    }
};
