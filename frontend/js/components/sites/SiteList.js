const SiteList = {
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
                <button class="btn btn-primary" @click="$emit('add')">添加站点</button>
            </div>
            <div v-if="loading" class="loading-container">
                <div class="loading-spinner"></div>
            </div>
            <table v-else class="data-table">
                <thead>
                    <tr>
                        <th>域名</th>
                        <th>状态</th>
                        <th>SSL证书</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="site in sites" :key="site.id">
                        <td>{{site.domain}}</td>
                        <td>
                            <span class="status-tag" :class="site.status">
                                {{site.status || '未知'}}
                            </span>
                        </td>
                        <td>
                            <span class="status-tag" :class="site.ssl_enabled ? 'success' : 'info'">
                                {{site.ssl_enabled ? '已启用' : '未启用'}}
                            </span>
                        </td>
                        <td>
                            <div class="btn-group">
                                <button 
                                    class="btn btn-small btn-primary" 
                                    @click="$emit('config', site)"
                                >配置</button>
                                <button 
                                    class="btn btn-small btn-danger" 
                                    @click="handleDelete(site)"
                                >删除</button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `,
    methods: {
        handleDelete(site) {
            if (confirm('确认删除该站点吗？')) {
                this.$emit('delete', site)
            }
        }
    }
};

window.SiteList = SiteList; 