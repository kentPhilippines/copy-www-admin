// API请求工具
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
    },

    // 文件上传
    async uploadFile(url, file, onProgress) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            
            if (onProgress) {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const progress = (event.loaded / event.total) * 100;
                        onProgress(progress);
                    }
                };
            }

            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            };

            xhr.onerror = () => reject(new Error('Network error'));
            
            xhr.open('POST', `${this.baseUrl}${url}`);
            xhr.send(formData);
        });
    }
};

// 导出API工具
window.API = API; 