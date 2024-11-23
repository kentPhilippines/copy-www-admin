import { request } from './index.js'

export const MonitorAPI = {
    // 获取服务器监控指标
    getMetrics(serverId) {
        return request(`/servers/${serverId}/metrics`)
    },

    // 获取服务状态
    getServices(serverId) {
        return request(`/servers/${serverId}/services`)
    },

    // 获取系统日志
    getLogs(serverId) {
        return request(`/servers/${serverId}/logs`)
    }
} 