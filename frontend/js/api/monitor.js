import { API } from './index.js'

export const MonitorAPI = {
    // 获取服务器监控指标
    async getMetrics(serverId) {
        return API.get(`/servers/${serverId}/metrics`)
    },

    // 获取服务状态
    async getServices(serverId) {
        return API.get(`/servers/${serverId}/services`)
    },

    // 获取系统日志
    async getLogs(serverId) {
        return API.get(`/servers/${serverId}/logs`)
    },

    // 获取实时监控数据
    async getRealtimeData(serverId) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`ws://${window.location.host}/ws/${serverId}`)
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    resolve(data)
                } catch (error) {
                    reject(error)
                }
            }

            ws.onerror = (error) => {
                reject(error)
            }

            // 30秒后如果没有数据则超时
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close()
                    reject(new Error('获取实时数据超时'))
                }
            }, 30000)
        })
    }
} 