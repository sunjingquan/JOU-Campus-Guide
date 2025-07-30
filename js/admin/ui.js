/**
 * @file UI 构建器 (ui.js)
 * @description 根据数据和预定义的 schema，动态生成用户友好的 HTML 表单界面。
 */

/**
 * 根据数据类型生成对应的表单输入元素
 * @param {string} key - 数据的字段名
 * @param {*} value - 字段的当前值
 * @param {object} schema - 对该字段的描述 (可选)
 * @returns {string} HTML 字符串
 */
function createFormElement(key, value, schema = {}) {
    const label = `<label for="field-${key}" class="block text-sm font-medium text-gray-700 mb-2">${schema.label || key}</label>`;
    const description = schema.description ? `<p class="text-xs text-gray-500 mt-1 mb-2">${schema.description}</p>` : '';
    
    // 优先使用 schema 中定义的 type
    const type = schema.type || (Array.isArray(value) ? 'array' : typeof value);

    switch (type) {
        case 'textarea':
            return `
                <div class="mb-6">
                    ${label}${description}
                    <textarea id="field-${key}" data-key="${key}" class="form-input h-32 resize-y">${value || ''}</textarea>
                </div>`;
        
        case 'array': // 处理数组
            if (value.every(i => typeof i === 'string')) { // 字符串数组
                const itemsHtml = value.map((item, index) => `
                    <div class="list-item-container flex items-center space-x-2 mb-2 bg-white p-2 rounded border">
                        <i data-lucide="grip-vertical" class="drag-handle h-5 w-5 text-gray-400"></i>
                        <input type="text" value="${item}" class="form-input flex-grow" data-index="${index}">
                        <button type="button" class="remove-item-btn text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"><i data-lucide="x" class="h-4 w-4"></i></button>
                    </div>
                `).join('');
                return `
                    <div class="mb-6 p-4 border rounded-md bg-gray-50">
                        ${label}${description}
                        <div class="string-list-container" data-key="${key}">${itemsHtml}</div>
                        <button type="button" class="add-item-btn mt-2 text-sm text-blue-600 hover:text-blue-800 font-semibold">+ 添加一项</button>
                    </div>`;
            }
            // 默认不支持编辑复杂数组
            return `<div class="mb-4 p-4 border rounded-md bg-yellow-100 text-yellow-800 text-sm">字段 <strong>${key}</strong> 包含复杂数组结构，暂不支持编辑。</div>`;

        case 'string':
        default:
            return `
                <div class="mb-6">
                    ${label}${description}
                    <input type="text" id="field-${key}" data-key="${key}" class="form-input" value="${value || ''}">
                </div>`;
    }
}

/**
 * 主函数：为整个文档对象生成编辑表单
 * @param {object} doc - 要编辑的文档数据
 * @param {object} schema - 整个文档的结构描述
 * @returns {string} 完整的表单 HTML
 */
export function buildFormForDocument(doc, schema = {}) {
    let formHtml = '';
    const docSchema = schema[doc.key] || {}; // 获取针对此文档的特定 schema

    // 优先按 schema 中定义的字段顺序渲染
    const fieldOrder = docSchema.fields ? Object.keys(docSchema.fields) : Object.keys(doc);

    for (const key of fieldOrder) {
        if (!doc.hasOwnProperty(key)) continue;
        if (key === '_id' || key === 'order') continue;

        const value = doc[key];
        const fieldSchema = docSchema.fields ? (docSchema.fields[key] || {}) : {};
        
        if (key === 'pages') { // 暂时跳过复杂的 pages 字段
             formHtml += `<div class="mb-4 p-4 border rounded-md bg-yellow-100 text-yellow-800 text-sm">字段 <strong>pages</strong> 包含最复杂的页面数据，将在后续版本中提供更精细的编辑器。</div>`;
             continue;
        }

        formHtml += createFormElement(key, value, fieldSchema);
    }
    return formHtml;
}

/**
 * 从表单的 DOM 元素中收集数据，转换回 JS 对象
 * @param {HTMLElement} formContainer - 包含所有表单元素的容器
 * @returns {object}
 */
export function collectDataFromForm(formContainer) {
    const data = {};
    formContainer.querySelectorAll('input[data-key], textarea[data-key]').forEach(input => {
        data[input.dataset.key] = input.value;
    });

    formContainer.querySelectorAll('.string-list-container').forEach(container => {
        const key = container.dataset.key;
        const values = [];
        container.querySelectorAll('input[type="text"]').forEach(input => {
            values.push(input.value);
        });
        data[key] = values;
    });
    
    return data;
}
