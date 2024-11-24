import wsManager from '../../utils/websocket.js'

export const ServiceList = {
    props: {
        serverId: {
            type: Number,
            required: true
        }
    },
    data() {
        return {
            services: []
        }
    },
    mounted() {
        wsManager.addListener(this.serverId, this.handleWebSocketData)
    },
    beforeUnmount() {
        wsManager.removeListener(this.serverId, this.handleWebSocketData)
    },
    template: `
        <div class="service-list">
            <div class="card">
                <div class="card-header">
                    <h3>运行中的服务</h3>
                    <button class="btn btn-primary btn-small" @click="refreshServices">
                        刷新
                    </button>
                </div>
                <div class="card-body">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>服务名称</th>
                                <th>端口</th>
                                <th>进程ID</th>
                                <th>状态</th>
                                <th>CPU使用率</th>
                                <th>内存使用率</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="service in services" :key="service.pid">
                                <td>{{service.service_name}}</td>
                                <td>{{service.port}}</td>
                                <td>{{service.pid}}</td>
                                <td>
                                    <span class="status-tag" :class="service.status">
                                        {{service.status}}
                                    </span>
                                </td>
                                <td>
                                    <div class="progress-bar">
                                        <div class="progress-value" 
                                            :style="{
                                                width: service.cpu_usage + '%',
                                                backgroundColor: getResourceColor(service.cpu_usage)
                                            }"
                                        ></div>
                                        <span class="progress-label">{{service.cpu_usage}}%</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="progress-bar">
                                        <div class="progress-value" 
                                            :style="{
                                                width: service.memory_usage + '%',
                                                backgroundColor: getResourceColor(service.memory_usage)
                                            }"
                                        ></div>
                                        <span class="progress-label">{{service.memory_usage}}%</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,
    methods: {
        handleWebSocketData(data) {
            if (data.type === 'services') {
                this.services = data.data.services
            }
        },
        getResourceColor(usage) {
            if (usage > 90) return '#F56C6C'  // 红色
            if (usage > 70) return '#E6A23C'  // 黄色
            return '#67C23A'  // 绿色
        },
        refreshServices() {
            this.$emit('refresh')
        }
    }
} 