// WebSocket管理器
const WebSocketManager = {
    connections: new Map(),
    listeners: new Map(),
    retryIntervals: [1000, 2000, 5000, 10000, 30000], // 重试间隔（毫秒）

    connect(serverId) {
        if (this.connections.has(serverId)) {
            return;
        }

        const ws = new WebSocket(`ws://${window.location.host}/ws/${serverId}`);
        
        ws.onopen = () => {
            console.log(`WebSocket connected for server ${serverId}`);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.notifyListeners(serverId, data);
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error for server ${serverId}:`, error);
        };

        ws.onclose = () => {
            console.log(`WebSocket closed for server ${serverId}`);
            this.connections.delete(serverId);
            // 尝试重新连接
            this.retryConnection(serverId);
        };

        this.connections.set(serverId, ws);
    },

    disconnect(serverId) {
        const ws = this.connections.get(serverId);
        if (ws) {
            ws.close();
            this.connections.delete(serverId);
        }
    },

    retryConnection(serverId) {
        let retryCount = 0;
        const tryConnect = () => {
            if (retryCount < this.retryIntervals.length) {
                setTimeout(() => {
                    console.log(`Retrying connection for server ${serverId}...`);
                    this.connect(serverId);
                    retryCount++;
                }, this.retryIntervals[retryCount]);
            }
        };
        tryConnect();
    },

    addListener(serverId, callback) {
        if (!this.listeners.has(serverId)) {
            this.listeners.set(serverId, new Set());
        }
        this.listeners.get(serverId).add(callback);
    },

    removeListener(serverId, callback) {
        const serverListeners = this.listeners.get(serverId);
        if (serverListeners) {
            serverListeners.delete(callback);
        }
    },

    notifyListeners(serverId, data) {
        const serverListeners = this.listeners.get(serverId);
        if (serverListeners) {
            serverListeners.forEach(callback => callback(data));
        }
    }
};

// 导出工具类
window.WebSocketManager = WebSocketManager; 