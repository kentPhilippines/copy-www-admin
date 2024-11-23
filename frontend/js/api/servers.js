import { request } from './index.js'

export const ServersAPI = {
    // 获取服务器列表
    list() {
        return request('/servers')
    },

    // 创建服务器
    create(data) {
        return request('/servers', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    // 执行命令
    executeCommand(serverId, command) {
        return request(`/servers/${serverId}/execute`, {
            method: 'POST',
            body: JSON.stringify({ command })
        })
    },

    // 获取命令日志
    getCommandLogs(serverId) {
        return request(`/servers/${serverId}/logs`)
    },

    // 上传SSH密钥
    uploadKey(formData) {
        return request('/upload-key', {
            method: 'POST',
            headers: {
                // 不设置Content-Type，让浏览器自动设置
            },
            body: formData
        })
    }
} 