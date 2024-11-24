// DOM操作工具
const DOM = {
    // 创建元素
    create(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // 设置属性
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });

        // 添加子元素
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });

        return element;
    },

    // 查找元素
    find(selector, parent = document) {
        return parent.querySelector(selector);
    },

    // 查找所有匹配的元素
    findAll(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    },

    // 添加类名
    addClass(element, ...classNames) {
        element.classList.add(...classNames);
    },

    // 移除类名
    removeClass(element, ...classNames) {
        element.classList.remove(...classNames);
    },

    // 切换类名
    toggleClass(element, className) {
        element.classList.toggle(className);
    },

    // 检查是否包含类名
    hasClass(element, className) {
        return element.classList.contains(className);
    },

    // 设置样式
    setStyle(element, styles) {
        Object.assign(element.style, styles);
    },

    // 显示元素
    show(element) {
        element.style.display = '';
    },

    // 隐藏元素
    hide(element) {
        element.style.display = 'none';
    },

    // 切换显示状态
    toggle(element) {
        if (element.style.display === 'none') {
            this.show(element);
        } else {
            this.hide(element);
        }
    }
};

// 导出DOM工具
window.DOM = DOM; 