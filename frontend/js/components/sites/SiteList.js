export const SiteList = {
    props: {
        sites: {
            type: Array,
            required: true
        },
        loading: {
            type: Boolean,
            default: false
        }
    },
    template: `
        <div class="site-list">
            <div class="header">
                <el-button type="primary" @click="$emit('add')">添加站点</el-button>
            </div>
            <el-table :data="sites" v-loading="loading" stripe>
                <el-table-column prop="domain" label="域名"></el-table-column>
                <el-table-column prop="status" label="状态">
                    <template #default="scope">
                        <el-tag :type="getStatusType(scope.row.status)">
                            {{ scope.row.status }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="SSL状态">
                    <template #default="scope">
                        <el-tag :type="scope.row.ssl_enabled ? 'success' : 'info'">
                            {{ scope.row.ssl_enabled ? '已启用' : '未启用' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作">
                    <template #default="scope">
                        <el-button-group>
                            <el-button 
                                type="primary" 
                                size="small" 
                                @click="$emit('config', scope.row)">
                                配置
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
        handleDelete(site) {
            this.$confirm('确认删除该站点吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                this.$emit('delete', site)
            }).catch(() => {})
        }
    }
} 