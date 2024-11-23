// API基础配置
const BASE_URL = '/api'

// API请求工具
const request = async (url, options = {}) => {
    try {
        const response = await fetch(`${BASE_URL}${url}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        })
        return await response.json()
    } catch (error) {
        console.error('API请求失败:', error)
        throw error
    }
}

export { BASE_URL, request } 