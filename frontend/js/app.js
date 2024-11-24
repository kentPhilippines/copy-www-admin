import Guide from './components/onboarding/Guide.js';
import { SitesAPI } from './api/sites.js';

const { createApp, ref, watch } = Vue;

// 创建应用实例
const app = createApp({
    setup() {
        const activeTab = ref('sites')
        const sites = ref([])
        const servers = ref([])
        const loading = ref(true)
        const tableLoading = ref(false)
        const serverTableLoading = ref(false)
        const serverDialogVisible = ref(false)
        const commandDialogVisible = ref(false)
        const logsDialogVisible = ref(false)
        const commandResult = ref('')
        const commandLogs = ref([])
        const monitorDialogVisible = ref(false)
        const currentMetrics = ref({
            cpu_usage: 0,
            memory_usage: 0,
            disk_usage: 0,
            load_average: '0, 0, 0',
            network_in: 0,
            network_out: 0,
            process_count: 0,
            uptime: 0
        })
        const serverServices = ref([])
        const systemLogs = ref([])
        let monitorTimer = null

        const newServer = ref({
            name: '',
            ip: '',
            username: '',
            authType: 'password',
            password: '',
            keyPath: ''
        })

        const commandForm = ref({
            command: '',
            serverId: null
        })

        const showGuide = ref(!localStorage.getItem('guideCompleted'))

        // 获取服务器列表
        const fetchServers = async () => {
            serverTableLoading.value = true
            try {
                servers.value = await API.getServers()
            } catch (error) {
                ElMessage.error('获取服务器列表失败')
            } finally {
                serverTableLoading.value = false
            }
        }

        // 添加服务器
        const addServer = async () => {
            try {
                await API.createServer(newServer.value)
                serverDialogVisible.value = false
                await fetchServers()
                ElMessage.success('服务器添加成功')
            } catch (error) {
                ElMessage.error('添加服务器失败')
            }
        }

        // 删除服务器
        const deleteServer = async (id) => {
            try {
                await API.deleteServer(id)
                await fetchServers()
                ElMessage.success('服务器删除成功')
            } catch (error) {
                ElMessage.error('删除服务器失败')
            }
        }

        // 执行命令
        const executeCommand = async () => {
            try {
                const result = await API.executeCommand(
                    commandForm.value.serverId,
                    commandForm.value.command
                )
                commandResult.value = result.result
                if (result.status === 'success') {
                    ElMessage.success('命令执行成功')
                } else {
                    ElMessage.error('命令执行失败')
                }
            } catch (error) {
                ElMessage.error('命令执行失败')
            }
        }

        // 获取命令日志
        const fetchCommandLogs = async (serverId) => {
            try {
                commandLogs.value = await API.getCommandLogs(serverId)
            } catch (error) {
                ElMessage.error('获取命令日志失败')
            }
        }

        // 显示命令对话框
        const showCommandDialog = (server) => {
            commandForm.value.serverId = server.id
            commandForm.value.command = ''
            commandResult.value = ''
            commandDialogVisible.value = true
        }

        // 显示日志对话框
        const showLogsDialog = async (server) => {
            await fetchCommandLogs(server.id)
            logsDialogVisible.value = true
        }

        // SSH密钥上传前的验证
        const beforeKeyUpload = (file) => {
            const isValidSize = file.size / 1024 / 1024 < 1
            if (!isValidSize) {
                ElMessage.error('SSH密钥文件大小不能超过1MB!')
            }
            return isValidSize
        }

        // SSH密钥上传成功的处理
        const handleKeyUploadSuccess = (response) => {
            newServer.value.keyPath = response.path
            ElMessage.success('SSH密钥上传成功')
        }

        // 获取监控数据的方法
        const fetchMonitorData = async (serverId) => {
            try {
                const [metrics, services, logs] = await Promise.all([
                    API.getServerMetrics(serverId),
                    API.getServerServices(serverId),
                    API.getServerLogs(serverId)
                ])
                
                if (metrics.length > 0) {
                    currentMetrics.value = metrics[0]  // 最新的指标
                }
                serverServices.value = services
                systemLogs.value = logs
            } catch (error) {
                ElMessage.error('获取监控数据失败')
            }
        }

        // 显示监控对话框
        const showMonitorDialog = async (server) => {
            monitorDialogVisible.value = true
            await fetchMonitorData(server.id)
            
            // 设置定时刷新
            monitorTimer = setInterval(() => {
                fetchMonitorData(server.id)
            }, 10000)  // 每10秒刷新一次
        }

        // 监控对话框关闭时清理定时器
        watch(monitorDialogVisible, (newVal) => {
            if (!newVal && monitorTimer) {
                clearInterval(monitorTimer)
                monitorTimer = null
            }
        })

        // 获取进度条颜色
        const getProgressColor = (percentage) => {
            if (percentage < 70) return '#67C23A'
            if (percentage < 90) return '#E6A23C'
            return '#F56C6C'
        }

        // 获取日志级别样式
        const getLogSeverityType = (severity) => {
            const types = {
                'info': 'info',
                'warning': 'warning',
                'error': 'danger',
                'critical': 'danger'
            }
            return types[severity] || 'info'
        }

        // 初始化加载
        setTimeout(async () => {
            await Promise.all([fetchSites(), fetchServers()])
            loading.value = false
        }, 1500)

        const handleGuideComplete = () => {
            showGuide.value = false
            // 加载系统数据
            fetchServers()
            fetchSites()
        }

        // 添加fetchSites函数
        const fetchSites = async () => {
            try {
                sites.value = await SitesAPI.list();
            } catch (error) {
                ElMessage.error('获取站点列表失败');
            }
        };

        return {
            activeTab,
            sites,
            servers,
            loading,
            tableLoading,
            serverTableLoading,
            serverDialogVisible,
            commandDialogVisible,
            logsDialogVisible,
            newServer,
            commandForm,
            commandResult,
            commandLogs,
            addServer,
            deleteServer,
            executeCommand,
            showCommandDialog,
            showLogsDialog,
            beforeKeyUpload,
            handleKeyUploadSuccess,
            monitorDialogVisible,
            currentMetrics,
            serverServices,
            systemLogs,
            showMonitorDialog,
            getProgressColor,
            getLogSeverityType,
            showGuide,
            handleGuideComplete,
            fetchSites
        }
    }
})

// 注册组件
app.component('Guide', Guide);
app.component('Loading', ElementPlusIconsVue.Loading);

// 使用Element Plus
app.use(ElementPlus);

// 挂载应用
app.mount('#app'); 