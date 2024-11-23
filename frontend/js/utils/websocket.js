class WebSocketManager {
    constructor(baseUrl) {
        this.baseUrl = baseUrl
        this.connections = new Map()
        this.listeners = new Map()
    }

    connect(serverId) {
        if (this.connections.has(serverId)) {
            return
        }

        const ws = new WebSocket(`${this.baseUrl}/ws/${serverId}`)
        
        ws.onopen = () => {
            console.log(`WebSocket connected for server ${serverId}`)
        }

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            this.notifyListeners(serverId, data)
        }

        ws.onerror = (error) => {
            console.error(`WebSocket error for server ${serverId}:`, error)
        }

        ws.onclose = () => {
            console.log(`WebSocket closed for server ${serverId}`)
            this.connections.delete(serverId)
            // 尝试重新连接
            setTimeout(() => this.connect(serverId), 5000)
        }

        this.connections.set(serverId, ws)
    }

    disconnect(serverId) {
        const ws = this.connections.get(serverId)
        if (ws) {
            ws.close()
            this.connections.delete(serverId)
        }
    }

    addListener(serverId, callback) {
        if (!this.listeners.has(serverId)) {
            this.listeners.set(serverId, new Set())
        }
        this.listeners.get(serverId).add(callback)
    }

    removeListener(serverId, callback) {
        const serverListeners = this.listeners.get(serverId)
        if (serverListeners) {
            serverListeners.delete(callback)
        }
    }

    notifyListeners(serverId, data) {
        const serverListeners = this.listeners.get(serverId)
        if (serverListeners) {
            serverListeners.forEach(callback => callback(data))
        }
    }
}

// 创建全局WebSocket管理器实例
const wsManager = new WebSocketManager('ws://localhost:9001')
export default wsManager 