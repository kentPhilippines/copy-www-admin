// API基础配置和工具函数
const API = {
    baseUrl: '/api',

    // 通用请求方法
    async request(url, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${url}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    },

    // GET请求
    async get(url) {
        return this.request(url);
    },

    // POST请求
    async post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT请求
    async put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE请求
    async delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    }
};

window.API = API; 