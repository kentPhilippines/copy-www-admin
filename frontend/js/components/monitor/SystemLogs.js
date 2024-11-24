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
            logs: [],
            filterSeverity: '',
            severityOptions: [
                { value: 'info', label: '信息' },
                { value: 'warning', label: '警告' },
                { value: 'error', label: '错误' },
                { value: 'critical', label: '严重' }
            ]
        }
    },
    mounted() {
        wsManager.addListener(this.serverId, this.handleWebSocketData)
    },
    beforeUnmount() {
        wsManager.removeListener(this.serverId, this.handleWebSocketData)
    },
    template: `
        <div class="system-logs">
            <div class="card">
                <div class="card-header">
                    <h3>系统日志</h3>
                    <div class="header-controls">
                        <select v-model="filterSeverity" class="select">
                            <option value="">全部级别</option>
                            <option v-for="option in severityOptions" 
                                :key="option.value" 
                                :value="option.value">
                                {{option.label}}
                            </option>
                        </select>
                        <button class="btn btn-primary btn-small" @click="refreshLogs">
                            刷新
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>时间</th>
                                <th>类型</th>
                                <th>级别</th>
                                <th>消息</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="log in filteredLogs" :key="log.id">
                                <td>{{formatTime(log.created_at)}}</td>
                                <td>{{log.log_type}}</td>
                                <td>
                                    <span class="status-tag" :class="log.severity">
                                        {{log.severity}}
                                    </span>
                                </td>
                                <td>
                                    <div class="log-message" :title="log.message">
                                        {{log.message}}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,
    computed: {
        filteredLogs() {
            if (!this.filterSeverity) return this.logs
            return this.logs.filter(log => log.severity === this.filterSeverity)
        }
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
        },
        formatTime(timestamp) {
            return new Date(timestamp).toLocaleString()
        },
        refreshLogs() {
            this.$emit('refresh')
        }
    }
} 