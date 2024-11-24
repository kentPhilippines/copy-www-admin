import Guide from './components/onboarding/Guide.js';

// 创建应用实例
const app = {
    data() {
        return {
            activeTab: 'sites',
            sites: [],
            servers: [],
            loading: false,
            showGuide: !localStorage.getItem('guideCompleted'),
            clientInstallCommand: `
# 客户端安装说明
# -------------------
# 注意：客户端安装程序正在完善中
# 请等待后续更新...
#
# 临时提示：
# 1. 服务器ID: [添加服务器后在此显示]
# 2. 服务器地址: ${window.location.hostname}:9001
# 3. 监控间隔: 60秒
`
        }
    },
    methods: {
        // 复制命令到剪贴板
        copyInstallCommand() {
            navigator.clipboard.writeText(this.clientInstallCommand.trim())
            this.showMessage('安装命令已复制到剪贴板', 'success')
        },

        // 显示消息提示
        showMessage(message, type = 'info') {
            const messageDiv = document.createElement('div')
            messageDiv.className = `message message-${type}`
            messageDiv.textContent = message
            document.body.appendChild(messageDiv)
            
            setTimeout(() => {
                messageDiv.classList.add('message-fade-out')
                setTimeout(() => {
                    document.body.removeChild(messageDiv)
                }, 300)
            }, 3000)
        },

        // 获取站点列表
        async fetchSites() {
            try {
                this.sites = await fetch('/api/sites').then(r => r.json())
            } catch (error) {
                this.showMessage('获取站点列表失败', 'error')
            }
        },

        // 获取服务器列表
        async fetchServers() {
            try {
                this.servers = await fetch('/api/servers').then(r => r.json())
            } catch (error) {
                this.showMessage('获取服务器列表失败', 'error')
            }
        },

        // 添加服务器
        async addServer(serverData) {
            try {
                const response = await fetch('/api/servers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(serverData)
                })
                const result = await response.json()
                if (response.ok) {
                    this.showMessage('服务器添加成功', 'success')
                    await this.fetchServers()
                } else {
                    throw new Error(result.detail || '添加失败')
                }
            } catch (error) {
                this.showMessage(error.message, 'error')
            }
        },

        // 删除服务器
        async deleteServer(serverId) {
            if (!confirm('确定要删除这个服务器吗？')) {
                return
            }
            try {
                const response = await fetch(`/api/servers/${serverId}`, {
                    method: 'DELETE'
                })
                if (response.ok) {
                    this.showMessage('服务器删除成功', 'success')
                    await this.fetchServers()
                } else {
                    throw new Error('删除失败')
                }
            } catch (error) {
                this.showMessage(error.message, 'error')
            }
        },

        // 修改初始化加载逻辑
        async initialize() {
            try {
                if (!this.showGuide) {
                    await Promise.all([this.fetchSites(), this.fetchServers()])
                }
            } catch (error) {
                console.error('加载数据失败:', error)
                this.loading = true
                Message.error('系统加载失败，请刷新页面重试')
            }
        },

        // 修改引导完成处理方法
        handleGuideComplete() {
            this.showGuide = false
            localStorage.setItem('guideCompleted', 'true')
            this.initialize()
        }
    },
    mounted() {
        // 初始化
        this.initialize()

        // 如果是首次访问，显示引导
        if (this.showGuide) {
            const guideElement = document.getElementById('guide')
            if (guideElement) {
                new Guide({
                    target: guideElement,
                    onComplete: this.handleGuideComplete
                })
            }
        }
    }
}

// 创建Vue实例并挂载
const vueApp = Vue.createApp(app)
vueApp.mount('#app') 