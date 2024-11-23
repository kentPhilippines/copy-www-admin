export const ServerList = {
    props: {
        servers: {
            type: Array,
            required: true
        },
        loading: {
            type: Boolean,
            default: false
        }
    },
    template: `
        <div class="server-list">
            <div class="header">
                <el-button type="primary" @click="$emit('add')">添加服务器</el-button>
            </div>
            <el-table :data="servers" v-loading="loading" stripe>
                <el-table-column prop="name" label="服务器名称"></el-table-column>
                <el-table-column prop="ip" label="IP地址"></el-table-column>
                <el-table-column prop="username" label="用户名"></el-table-column>
                <el-table-column prop="status" label="状态">
                    <template #default="scope">
                        <el-tag :type="getStatusType(scope.row.status)">
                            {{ scope.row.status }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="400">
                    <template #default="scope">
                        <el-button-group>
                            <el-button 
                                type="primary" 
                                size="small" 
                                @click="$emit('monitor', scope.row)">
                                监控
                            </el-button>
                            <el-button 
                                type="success" 
                                size="small" 
                                @click="$emit('command', scope.row)">
                                执行命令
                            </el-button>
                            <el-button 
                                type="info" 
                                size="small" 
                                @click="$emit('logs', scope.row)">
                                查看日志
                            </el-button>
                            <el-button 
                                type="danger" 
                                size="small" 
                                @click="handleDelete(scope.row)">
                                删除
                            </el-button>
                        </el-button-group>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    `,
    methods: {
        getStatusType(status) {
            const types = {
                'active': 'success',
                'inactive': 'info',
                'error': 'danger'
            }
            return types[status] || 'info'
        },
        handleDelete(server) {
            this.$confirm('确认删除该服务器吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                this.$emit('delete', server)
            }).catch(() => {})
        }
    }
} 