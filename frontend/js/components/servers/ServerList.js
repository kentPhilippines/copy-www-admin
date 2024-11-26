const ServerList = {
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
                <button class="btn btn-primary" @click="$emit('add')">添加服务器</button>
            </div>
            <div v-if="loading" class="loading-container">
                <div class="loading-spinner"></div>
            </div>
            <table v-else class="data-table">
                <thead>
                    <tr>
                        <th>服务器名称</th>
                        <th>IP地址</th>
                        <th>用户名</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="server in servers" :key="server.id">
                        <td>{{server.name}}</td>
                        <td>{{server.ip}}</td>
                        <td>{{server.username}}</td>
                        <td>
                            <span class="status-tag" :class="server.status">
                                {{server.status || '未知'}}
                            </span>
                        </td>
                        <td>
                            <div class="btn-group">
                                <button 
                                    class="btn btn-small btn-primary" 
                                    @click="$emit('monitor', server)"
                                >监控</button>
                                <button 
                                    class="btn btn-small btn-success" 
                                    @click="$emit('command', server)"
                                >执行命令</button>
                                <button 
                                    class="btn btn-small btn-info" 
                                    @click="$emit('logs', server)"
                                >查看日志</button>
                                <button 
                                    class="btn btn-small btn-danger" 
                                    @click="handleDelete(server)"
                                >删除</button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `,
    methods: {
        handleDelete(server) {
            if (confirm('确认删除该服务器吗？')) {
                this.$emit('delete', server)
            }
        }
    }
};

window.ServerList = ServerList; 