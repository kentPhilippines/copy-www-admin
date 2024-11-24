// 主应用逻辑
const App = {
    data: {
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
    },

    // 初始化应用
    async init() {
        this.bindEvents();
        await this.loadInitialData();
        this.renderUI();
    },

    // 绑定事件
    bindEvents() {
        // 标签页切换
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 添加站点按钮
        const addSiteBtn = document.querySelector('#add-site-btn');
        if (addSiteBtn) {
            addSiteBtn.addEventListener('click', () => this.showAddSiteDialog());
        }

        // 添加服务器按钮
        const addServerBtn = document.querySelector('#add-server-btn');
        if (addServerBtn) {
            addServerBtn.addEventListener('click', () => this.showAddServerDialog());
        }

        // 复制命令按钮
        const copyCommandBtn = document.querySelector('#copy-command-btn');
        if (copyCommandBtn) {
            copyCommandBtn.addEventListener('click', () => this.copyInstallCommand());
        }
    },

    // 加载初始数据
    async loadInitialData() {
        try {
            if (!this.data.showGuide) {
                this.data.loading = true;
                const [sites, servers] = await Promise.all([
                    API.get('/sites'),
                    API.get('/servers')
                ]);
                this.data.sites = sites;
                this.data.servers = servers;
            }
        } catch (error) {
            console.error('加载数据失败:', error);
            Message.error('系统加载失败，请刷新页面重试');
        } finally {
            this.data.loading = false;
        }
    },

    // 渲染UI
    renderUI() {
        // 显示/隐藏引导页
        const guideElement = document.getElementById('guide');
        if (this.data.showGuide && guideElement) {
            this.renderGuide(guideElement);
        }

        // 显示/隐藏加载状态
        const loadingElement = document.querySelector('.loading-container');
        if (loadingElement) {
            loadingElement.style.display = this.data.loading ? 'flex' : 'none';
        }

        // 渲染站点列表
        this.renderSiteList();

        // 渲染服务器列表
        this.renderServerList();

        // 更新当前标签页
        this.updateActiveTab();
    },

    // 切换标签页
    switchTab(tabName) {
        this.data.activeTab = tabName;
        this.updateActiveTab();
    },

    // 更新活动标签页
    updateActiveTab() {
        document.querySelectorAll('.tab-item').forEach(tab => {
            const isActive = tab.dataset.tab === this.data.activeTab;
            tab.classList.toggle('active', isActive);
        });

        document.querySelectorAll('.tab-pane').forEach(pane => {
            const isActive = pane.id === `${this.data.activeTab}-panel`;
            pane.style.display = isActive ? 'block' : 'none';
        });
    },

    // 复制安装命令
    copyInstallCommand() {
        navigator.clipboard.writeText(this.data.clientInstallCommand.trim())
            .then(() => Message.success('安装命令已复制到剪贴板'))
            .catch(() => Message.error('复制失败'));
    },

    // 渲染站点列表
    renderSiteList() {
        const container = document.getElementById('sites-table');
        if (!container) return;

        if (this.data.sites.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <h3>暂无站点数据</h3>
                    <p>点击"添加站点"按钮创建新站点</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>域名</th>
                        <th>状态</th>
                        <th>SSL证书</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.data.sites.map(site => `
                        <tr>
                            <td>${site.domain}</td>
                            <td>
                                <span class="status-tag ${site.status}">
                                    ${site.status || '未知'}
                                </span>
                            </td>
                            <td>
                                <span class="status-tag ${site.ssl_enabled ? 'success' : 'info'}">
                                    ${site.ssl_enabled ? '已启用' : '未启用'}
                                </span>
                            </td>
                            <td>
                                <div class="btn-group">
                                    <button class="btn btn-small btn-primary" onclick="App.configSite(${site.id})">配置</button>
                                    <button class="btn btn-small btn-danger" onclick="App.deleteSite(${site.id})">删除</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    // 渲染服务器列表
    renderServerList() {
        const container = document.getElementById('servers-table');
        if (!container) return;

        if (this.data.servers.length === 0) {
            document.getElementById('servers-empty').style.display = 'block';
            container.style.display = 'none';
            return;
        }

        document.getElementById('servers-empty').style.display = 'none';
        container.style.display = 'block';

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>服务器名称</th>
                        <th>IP地址</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.data.servers.map(server => `
                        <tr>
                            <td>${server.name}</td>
                            <td>${server.ip}</td>
                            <td>
                                <span class="status-tag ${server.status}">
                                    ${server.status || '未知'}
                                </span>
                            </td>
                            <td>
                                <div class="btn-group">
                                    <button class="btn btn-small btn-primary" onclick="App.monitorServer(${server.id})">监控</button>
                                    <button class="btn btn-small btn-success" onclick="App.executeCommand(${server.id})">执行命令</button>
                                    <button class="btn btn-small btn-info" onclick="App.viewLogs(${server.id})">查看日志</button>
                                    <button class="btn btn-small btn-danger" onclick="App.deleteServer(${server.id})">删除</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
};

// 将App挂载到全局
window.App = App;

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => App.init()); 