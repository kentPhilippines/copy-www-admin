import wsManager from '../../utils/websocket.js'

export const MonitorDashboard = {
    props: {
        serverId: {
            type: Number,
            required: true
        }
    },
    data() {
        return {
            metrics: {
                cpu_usage: 0,
                memory_usage: 0,
                disk_usage: 0,
                load_average: '0, 0, 0',
                network_in: 0,
                network_out: 0,
                process_count: 0,
                uptime: 0
            }
        }
    },
    mounted() {
        // 连接WebSocket
        wsManager.connect(this.serverId)
        
        // 添加数据监听器
        wsManager.addListener(this.serverId, this.handleWebSocketData)
    },
    beforeUnmount() {
        // 移除监听器并断开连接
        wsManager.removeListener(this.serverId, this.handleWebSocketData)
        wsManager.disconnect(this.serverId)
    },
    methods: {
        handleWebSocketData(data) {
            if (data.type === 'metrics') {
                this.metrics = data.data
            }
        }
    },
    template: `
        <div class="monitor-dashboard">
            <el-row :gutter="20">
                <el-col :span="6" v-for="metric in displayMetrics" :key="metric.name">
                    <el-card class="metric-card">
                        <template #header>
                            <div class="card-header">
                                <span>{{ metric.label }}</span>
                            </div>
                        </template>
                        <div class="metric-value">
                            <el-progress 
                                v-if="metric.type === 'percentage'"
                                type="dashboard" 
                                :percentage="metric.value"
                                :color="getProgressColor">
                            </el-progress>
                            <span v-else>{{ metric.value }}</span>
                        </div>
                    </el-card>
                </el-col>
            </el-row>
        </div>
    `,
    computed: {
        displayMetrics() {
            return [
                {
                    name: 'cpu',
                    label: 'CPU使用率',
                    value: this.metrics.cpu_usage,
                    type: 'percentage'
                },
                {
                    name: 'memory',
                    label: '内存使用率',
                    value: this.metrics.memory_usage,
                    type: 'percentage'
                },
                {
                    name: 'disk',
                    label: '磁盘使用率',
                    value: this.metrics.disk_usage,
                    type: 'percentage'
                },
                {
                    name: 'load',
                    label: '系统负载',
                    value: this.metrics.load_average,
                    type: 'text'
                }
            ]
        }
    },
    methods: {
        getProgressColor(percentage) {
            if (percentage < 70) return '#67C23A'
            if (percentage < 90) return '#E6A23C'
            return '#F56C6C'
        }
    }
} 