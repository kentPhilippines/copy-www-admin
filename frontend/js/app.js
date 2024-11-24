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

    // 渲染引导页面
    renderGuide(element) {
        const steps = [
            {
                title: '欢迎',
                content: `
                    <h2>欢迎使用站点管理系统</h2>
                    <p>这是一个强大的站点和服务器管理平台，帮助您：</p>
                    <ul>
                        <li>轻松管理多个站点配置</li>
                        <li>集中监控服务器状态</li>
                        <li>实时查看系统性能</li>
                        <li>快速执行远程命令</li>
                    </ul>
                `
            },
            {
                title: '站点管理',
                content: `
                    <h2>站点管理功能</h2>
                    <p>在这里，您可以：</p>
                    <ul>
                        <li>添加和配置新站点</li>
                        <li>管理SSL证书</li>
                        <li>设置Nginx配置</li>
                        <li>监控站点状态</li>
                    </ul>
                `
            },
            {
                title: '服务器管理',
                content: `
                    <h2>服务器管理功能</h2>
                    <p>强大的服务器管理功能包括：</p>
                    <ul>
                        <li>添加服务器（支持密码和SSH密钥认证）</li>
                        <li>执行远程命令</li>
                        <li>查看命令执行历史</li>
                        <li>实时监控服务器状态</li>
                    </ul>
                `
            },
            {
                title: '监控功能',
                content: `
                    <h2>实时监控功能</h2>
                    <p>全方位的监控功能：</p>
                    <ul>
                        <li>CPU、内存、磁盘使用率</li>
                        <li>系统负载和进程监控</li>
                        <li>服务状态检查</li>
                        <li>系统日志实时查看</li>
                    </ul>
                `
            }
        ];

        let currentStep = 0;

        const renderStep = () => {
            element.innerHTML = `
                <div class="guide-overlay">
                    <div class="guide-container">
                        <div class="guide-steps">
                            ${steps.map((step, index) => `
                                <div class="step-item ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}">
                                    ${step.title}
                                </div>
                            `).join('')}
                        </div>
                        <div class="guide-content">
                            ${steps[currentStep].content}
                        </div>
                        <div class="guide-footer">
                            ${currentStep === 0 ? `
                                <button class="btn btn-default" onclick="App.skipGuide()">跳过引导</button>
                            ` : `
                                <button class="btn btn-default" onclick="App.prevStep()">上一步</button>
                            `}
                            <button class="btn btn-primary" onclick="App.nextStep()">
                                ${currentStep === steps.length - 1 ? '开始使用' : '下一步'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        };

        // 初始渲染
        renderStep();

        // 添加导航方法到App对象
        this.nextStep = () => {
            if (currentStep < steps.length - 1) {
                currentStep++;
                renderStep();
            } else {
                this.completeGuide();
            }
        };

        this.prevStep = () => {
            if (currentStep > 0) {
                currentStep--;
                renderStep();
            }
        };

        this.skipGuide = () => {
            if (confirm('确定要跳过引导教程吗？')) {
                this.completeGuide();
            }
        };

        this.completeGuide = () => {
            // 设置引导完成标记
            localStorage.setItem('guideCompleted', 'true');
            
            // 隐藏引导页面
            const guideElement = document.getElementById('guide');
            if (guideElement) {
                guideElement.style.display = 'none';
            }
            
            // 更新状态
            this.data.showGuide = false;
            
            // 显示加载动画
            this.data.loading = true;
            
            // 加载初始数据
            setTimeout(async () => {
                try {
                    await Promise.all([
                        this.loadSites(),
                        this.loadServers()
                    ]);
                    
                    // 显示主界面
                    const mainContent = document.getElementById('main-content');
                    if (mainContent) {
                        mainContent.style.display = 'block';
                    }
                } catch (error) {
                    console.error('加载数据失败:', error);
                    Message.error('系统加载失败，请刷新页面重试');
                } finally {
                    this.data.loading = false;
                }
            }, 500);
        };
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
            Message.error('系统加载失败，请��新页面重试');
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
    },

    // 加载站点数据
    async loadSites() {
        try {
            const response = await fetch('/api/sites');
            if (!response.ok) {
                throw new Error('获取站点列表失败');
            }
            this.data.sites = await response.json();
            this.renderSiteList();
        } catch (error) {
            console.error('加载站点数据失败:', error);
            throw error;
        }
    },

    // 加载服务器数据
    async loadServers() {
        try {
            const response = await fetch('/api/servers');
            if (!response.ok) {
                throw new Error('获取服务器列表失败');
            }
            this.data.servers = await response.json();
            this.renderServerList();
        } catch (error) {
            console.error('加载服务器数据失败:', error);
            throw error;
        }
    },

    // 添加配置站点方法
    configSite(siteId) {
        // 获取站点信息
        const site = this.data.sites.find(s => s.id === siteId);
        if (!site) {
            Message.error('站点不存在');
            return;
        }

        // TODO: 实现站点配置对话框
        console.log('配置站点:', site);
    },

    // 添加删除站点方法
    deleteSite(siteId) {
        if (!confirm('确定要删除这个站点吗？')) {
            return;
        }

        fetch(`/api/sites/${siteId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(() => {
            Message.success('站点删除成功');
            this.loadSites();
        })
        .catch(error => {
            console.error('删除站点失败:', error);
            Message.error('删除站点失败');
        });
    },

    // 添加显示站点对话框方法
    showAddSiteDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>添加站点</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-site-form" class="site-form">
                        <div class="form-group">
                            <label>域名</label>
                            <input 
                                type="text" 
                                name="domain"
                                placeholder="请输入域名"
                                pattern="^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$"
                                required
                            >
                        </div>
                        <div class="form-group">
                            <label>配置路径</label>
                            <input 
                                type="text" 
                                name="config_path"
                                placeholder="请输入Nginx配置文件路径"
                                required
                            >
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="ssl_enabled"> SSL证书
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-default" onclick="this.closest('.modal').remove()">取消</button>
                            <button type="submit" class="btn btn-primary">确定</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 添加表单提交处理
        document.getElementById('add-site-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const siteData = {
                domain: formData.get('domain'),
                config_path: formData.get('config_path'),
                ssl_enabled: formData.get('ssl_enabled') === 'on'
            };

            fetch('/api/sites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(siteData)
            })
            .then(response => response.json())
            .then(() => {
                Message.success('站点添加成功');
                this.loadSites();
                dialog.remove();
            })
            .catch(error => {
                console.error('添加站点失败:', error);
                Message.error('添加站点失败');
            });
        });
    },

    // 添加显示服务器对话框方法
    showAddServerDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>添加服务器</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-server-form" class="server-form">
                        <div class="form-group">
                            <label>服务器名称</label>
                            <input 
                                type="text" 
                                name="name"
                                placeholder="请输入服务器名称"
                                required
                            >
                        </div>
                        <div class="form-group">
                            <label>IP地址</label>
                            <input 
                                type="text" 
                                name="ip"
                                placeholder="请输入IP地址"
                                pattern="^(\d{1,3}\.){3}\d{1,3}$"
                                required
                            >
                        </div>
                        <div class="form-group">
                            <label>用户名</label>
                            <input 
                                type="text" 
                                name="username"
                                placeholder="请输入用户名"
                                required
                            >
                        </div>
                        <div class="form-group">
                            <label>认证方式</label>
                            <div class="radio-group">
                                <label>
                                    <input type="radio" name="auth_type" value="password" checked> 密码
                                </label>
                                <label>
                                    <input type="radio" name="auth_type" value="key"> SSH密钥
                                </label>
                            </div>
                        </div>
                        <div class="form-group password-group">
                            <label>密码</label>
                            <input 
                                type="password" 
                                name="password"
                                placeholder="请输入密码"
                            >
                        </div>
                        <div class="form-group key-group" style="display: none;">
                            <label>SSH密钥</label>
                            <input 
                                type="file" 
                                name="key_file"
                                accept=".pem,.key"
                            >
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-default" onclick="this.closest('.modal').remove()">取消</button>
                            <button type="submit" class="btn btn-primary">确定</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 处理认证方式切换
        const authTypeInputs = dialog.querySelectorAll('input[name="auth_type"]');
        const passwordGroup = dialog.querySelector('.password-group');
        const keyGroup = dialog.querySelector('.key-group');

        authTypeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                if (e.target.value === 'password') {
                    passwordGroup.style.display = 'block';
                    keyGroup.style.display = 'none';
                } else {
                    passwordGroup.style.display = 'none';
                    keyGroup.style.display = 'block';
                }
            });
        });

        // 添加表单提交处理
        document.getElementById('add-server-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const serverData = {
                name: formData.get('name'),
                ip: formData.get('ip'),
                username: formData.get('username'),
                auth_type: formData.get('auth_type')
            };

            if (serverData.auth_type === 'password') {
                serverData.password = formData.get('password');
            } else {
                const keyFile = formData.get('key_file');
                if (keyFile) {
                    try {
                        const keyFormData = new FormData();
                        keyFormData.append('file', keyFile);
                        const response = await fetch('/api/upload-key', {
                            method: 'POST',
                            body: keyFormData
                        });
                        const result = await response.json();
                        serverData.key_path = result.path;
                    } catch (error) {
                        console.error('上传SSH密钥失败:', error);
                        Message.error('上传SSH密钥失败');
                        return;
                    }
                }
            }

            fetch('/api/servers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(serverData)
            })
            .then(response => response.json())
            .then(() => {
                Message.success('服务器添加成功');
                this.loadServers();
                dialog.remove();
            })
            .catch(error => {
                console.error('添加服务器失败:', error);
                Message.error('添加服务器失败');
            });
        });
    }
};

// 将App挂载到全局
window.App = App;

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => App.init()); 