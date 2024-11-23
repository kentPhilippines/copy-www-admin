import wsManager from '../../utils/websocket.js'

export const SystemLogs = {
    props: {
        serverId: {
            type: Number,
            required: true
        }
    },
    data() {
        return {
            logs: []
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
            if (data.type === 'logs') {
                // 将新日志添加到列表开头
                this.logs.unshift(...data.data.logs)
                // 保持最新的1000条日志
                if (this.logs.length > 1000) {
                    this.logs = this.logs.slice(0, 1000)
                }
            }
        }
    },
    template: `
        <div class="system-logs">
            <el-card class="monitor-section">
                <template #header>
                    <div class="card-header">
                        <span>系统日志</span>
                        <div class="header-controls">
                            <el-select v-model="filterSeverity" placeholder="日志级别" clearable>
                                <el-option
                                    v-for="item in severityOptions"
                                    :key="item.value"
                                    :label="item.label"
                                    :value="item.value">
                                </el-option>
                            </el-select>
                            <el-button type="primary" size="small" @click="refreshLogs">
                                刷新
                            </el-button>
                        </div>
                    </div>
                </template>
                <el-table :data="filteredLogs" stripe>
                    <el-table-column prop="created_at" label="时间" width="180">
                        <template #default="scope">
                            {{ formatTime(scope.row.created_at) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="log_type" label="类型" width="100"></el-table-column>
                    <el-table-column prop="severity" label="级别" width="100">
                        <template #default="scope">
                            <el-tag :type="getSeverityType(scope.row.severity)">
                                {{ scope.row.severity }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="message" label="消息">
                        <template #default="scope">
                            <div class="log-message" :title="scope.row.message">
                                {{ scope.row.message }}
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>
        </div>
    `,
    data() {
        return {
            filterSeverity: '',
            severityOptions: [
                { value: 'info', label: '信息' },
                { value: 'warning', label: '警告' },
                { value: 'error', label: '错误' },
                { value: 'critical', label: '严重' }
            ]
        }
    },
    computed: {
        filteredLogs() {
            if (!this.filterSeverity) return this.logs
            return this.logs.filter(log => log.severity === this.filterSeverity)
        }
    },
    methods: {
        getSeverityType(severity) {
            const types = {
                'info': 'info',
                'warning': 'warning',
                'error': 'danger',
                'critical': 'danger'
            }
            return types[severity] || 'info'
        },
        formatTime(timestamp) {
            return new Date(timestamp).toLocaleString()
        },
        refreshLogs() {
            this.$emit('refresh')
        }
    }
} 