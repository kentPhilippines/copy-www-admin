import Guide from './components/onboarding/Guide.js';

const { createApp, ref, watch } = Vue;

// 创建应用实例
const app = createApp({
    setup() {
        const activeTab = ref('sites')
        const sites = ref([])
        const servers = ref([])
        const loading = ref(true)
        const showGuide = ref(!localStorage.getItem('guideCompleted'))
        
        const clientInstallCommand = ref(`
# 客户端安装说明
# -------------------
# 注意：客户端安装程序正在完善中
# 请等待后续更新...
#
# 临时提示：
# 1. 服务器ID: [添加服务器后在此显示]
# 2. 服务器地址: ${window.location.hostname}:9001
# 3. 监控间隔: 60秒
`)

        // 复制命令到剪贴板
        const copyInstallCommand = () => {
            navigator.clipboard.writeText(clientInstallCommand.value.trim())
            showMessage('安装命令已复制到剪贴板', 'success')
        }

        // 显示消息提示
        const showMessage = (message, type = 'info') => {
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
        }

        // 获取站点列表
        const fetchSites = async () => {
            try {
                sites.value = await fetch('/api/sites').then(r => r.json())
            } catch (error) {
                showMessage('获取站点列表失败', 'error')
            }
        }

        // 获取服务器列表
        const fetchServers = async () => {
            try {
                servers.value = await fetch('/api/servers').then(r => r.json())
            } catch (error) {
                showMessage('获取服务器列表失败', 'error')
            }
        }

        // 添加服务器
        const addServer = async (serverData) => {
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
                    showMessage('服务器添加成功', 'success')
                    await fetchServers()
                } else {
                    throw new Error(result.detail || '添加失败')
                }
            } catch (error) {
                showMessage(error.message, 'error')
            }
        }

        // 删除服务器
        const deleteServer = async (serverId) => {
            if (!confirm('确定要删除这个服务器吗？')) {
                return
            }
            try {
                const response = await fetch(`/api/servers/${serverId}`, {
                    method: 'DELETE'
                })
                if (response.ok) {
                    showMessage('服务器删除成功', 'success')
                    await fetchServers()
                } else {
                    throw new Error('删除失败')
                }
            } catch (error) {
                showMessage(error.message, 'error')
            }
        }

        // 引导完成处理
        const handleGuideComplete = () => {
            showGuide.value = false
            loading.value = true
            setTimeout(async () => {
                try {
                    await Promise.all([fetchSites(), fetchServers()])
                } catch (error) {
                    console.error('加载数据失败:', error)
                } finally {
                    loading.value = false
                }
            }, 500)
        }

        // 初始化加载
        if (!showGuide.value) {
            setTimeout(async () => {
                try {
                    await Promise.all([fetchSites(), fetchServers()])
                } catch (error) {
                    console.error('加载数据失败:', error)
                } finally {
                    loading.value = false
                }
            }, 1000)
        }

        return {
            activeTab,
            sites,
            servers,
            loading,
            showGuide,
            handleGuideComplete,
            clientInstallCommand,
            copyInstallCommand,
            addServer,
            deleteServer
        }
    }
})

// 注册组件
app.component('Guide', Guide)

// 挂载应用
app.mount('#app') 