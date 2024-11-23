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
    methods: {
        handleWebSocketData(data) {
            if (data.type === 'services') {
                this.services = data.data.services
            }
        }
    },
    template: `
        <div class="service-list">
            <el-card class="monitor-section">
                <template #header>
                    <div class="card-header">
                        <span>运行中的服务</span>
                        <el-button type="primary" size="small" @click="refreshServices">
                            刷新
                        </el-button>
                    </div>
                </template>
                <el-table :data="services" stripe>
                    <el-table-column prop="service_name" label="服务名称"></el-table-column>
                    <el-table-column prop="port" label="端口"></el-table-column>
                    <el-table-column prop="pid" label="进程ID"></el-table-column>
                    <el-table-column prop="status" label="状态">
                        <template #default="scope">
                            <el-tag :type="getStatusType(scope.row.status)">
                                {{ scope.row.status }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="cpu_usage" label="CPU使用率">
                        <template #default="scope">
                            <el-progress 
                                :percentage="Number(scope.row.cpu_usage).toFixed(1)"
                                :status="getCpuStatus(scope.row.cpu_usage)">
                            </el-progress>
                        </template>
                    </el-table-column>
                    <el-table-column prop="memory_usage" label="内存使用率">
                        <template #default="scope">
                            <el-progress 
                                :percentage="Number(scope.row.memory_usage).toFixed(1)"
                                :status="getMemoryStatus(scope.row.memory_usage)">
                            </el-progress>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>
        </div>
    `,
    methods: {
        getStatusType(status) {
            return status === 'running' ? 'success' : 'danger'
        },
        getCpuStatus(usage) {
            if (usage > 90) return 'exception'
            if (usage > 70) return 'warning'
            return 'success'
        },
        getMemoryStatus(usage) {
            if (usage > 90) return 'exception'
            if (usage > 70) return 'warning'
            return 'success'
        },
        refreshServices() {
            this.$emit('refresh')
        }
    }
} 