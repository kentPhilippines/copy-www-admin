// API 接口封装
const API = {
    baseUrl: 'http://localhost:9001/api',

    // 获取站点列表
    async getSites() {
        const response = await fetch(`${this.baseUrl}/sites`)
        return await response.json()
    },

    // 创建站点
    async createSite(siteData) {
        const response = await fetch(`${this.baseUrl}/sites`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(siteData)
        })
        return await response.json()
    },

    // 删除站点
    async deleteSite(id) {
        const response = await fetch(`${this.baseUrl}/sites/${id}`, {
            method: 'DELETE'
        })
        return await response.json()
    },

    // 服务器相关API
    async getServers() {
        const response = await fetch(`${this.baseUrl}/servers`)
        return await response.json()
    },

    async createServer(serverData) {
        const response = await fetch(`${this.baseUrl}/servers`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(serverData)
        })
        return await response.json()
    },

    async executeCommand(serverId, command) {
        const response = await fetch(`${this.baseUrl}/servers/${serverId}/execute`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ command })
        })
        return await response.json()
    },

    async getCommandLogs(serverId) {
        const response = await fetch(`${this.baseUrl}/servers/${serverId}/logs`)
        return await response.json()
    },

    // 获取服务器监控指标
    async getServerMetrics(serverId) {
        const response = await fetch(`${this.baseUrl}/servers/${serverId}/metrics`)
        return await response.json()
    },

    // 获取服务器运行的服务状态
    async getServerServices(serverId) {
        const response = await fetch(`${this.baseUrl}/servers/${serverId}/services`)
        return await response.json()
    },

    // 获取服务器系统日志
    async getServerLogs(serverId) {
        const response = await fetch(`${this.baseUrl}/servers/${serverId}/logs`)
        return await response.json()
    }
} 