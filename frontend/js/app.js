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
`,
        nginxInstalled: false  // 添加 Nginx 安装状态
    },

    // 初始化应用
    async init() {
        console.log('初始化应用');
        
        // 检查 Nginx 状态
        try {
            const response = await fetch('/api/check-nginx');
            const data = await response.json();
            this.data.nginxInstalled = data.installed;
            if (data.installed) {
                Message.success('检测到 Nginx 已安装');
            }
        } catch (error) {
            console.error('检查 Nginx 状态失败:', error);
        }

        // 继续其他初始化
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
                        <li>集中监控状态</li>
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
                                <button class="btn btn-default" onclick="App.skipGuide()">过导</button>
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

        //添加站点按钮
        const addSiteBtn = document.querySelector('#add-site-btn');
        if (addSiteBtn) {
            addSiteBtn.addEventListener('click', () => this.showAddSiteDialog());
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
            Message.error('系统加载失败，请刷新页面重');
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

        // 渲染 Nginx 状态
        const nginxStatusContainer = document.querySelector('.nginx-status-container');
        if (nginxStatusContainer) {
            nginxStatusContainer.innerHTML = this.data.nginxInstalled ? `
                <div class="nginx-status">
                    <span class="status-icon active">✓</span>
                    <span class="status-text">Nginx 已安装并运行</span>
                </div>
            ` : '';
        }
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
            <div class="servers-grid">
                ${this.data.servers.map(server => `
                    <div class="server-card">
                        <div class="server-header">
                            <h3>${server.name}</h3>
                            <span class="status-tag ${server.status}">
                                ${server.status || '未知'}
                            </span>
                        </div>
                        <div class="server-info">
                            <p>外网IP：${server.ip}</p>
                            <p>内网IP：${server.internal_ip || '-'}</p>
                        </div>
                        <div class="server-charts">
                            <div class="chart-item">
                                <canvas id="cpuChart-${server.id}"></canvas>
                            </div>
                            <div class="chart-item">
                                <canvas id="memoryChart-${server.id}"></canvas>
                            </div>
                            <div class="chart-item">
                                <canvas id="diskChart-${server.id}"></canvas>
                            </div>
                            <div class="chart-item">
                                <canvas id="loadChart-${server.id}"></canvas>
                            </div>
                            <div class="chart-item">
                                <canvas id="networkChart-${server.id}"></canvas>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // 为每个服务器初始化图表
        this.data.servers.forEach(server => {
            this.initServerCharts(server.id);
            this.startServerMonitoring(server.id);
        });
    },

    // 初始化单个服务器的图表
    async initServerCharts(serverId) {
        // 检查是否加载 Chart.js
        if (typeof Chart === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js@2.9.4/dist/Chart.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        // 通用图表配置
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false, // 允许固定大小
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        boxWidth: 12,
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 10
                    }
                }
            }
        };

        // 圆环图配置
        const doughnutOptions = {
            ...commonOptions,
            cutout: '70%',
            radius: '90%'
        };

        // CPU使用率图表
        this[`cpuChart-${serverId}`] = new Chart(document.getElementById(`cpuChart-${serverId}`), {
            type: 'doughnut',
            data: {
                labels: ['已用', '空闲'],
                datasets: [{
                    data: [],
                    backgroundColor: ['#ff6384', '#36a2eb'],
                    borderWidth: 0
                }]
            },
            options: {
                ...doughnutOptions,
                title: {
                    display: true,
                    text: 'CPU使用率',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.raw === undefined) return '';
                                return `${context.label}: ${context.raw.toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });

        // 添加实时数据显示容器
        const cpuContainer = document.getElementById(`cpuChart-${serverId}`).parentElement;
        cpuContainer.insertAdjacentHTML('beforeend', `
            <div class="chart-data-display">
                <div class="data-item">
                    <span class="label">CPU使用率:</span>
                    <span class="value" id="cpu-value-${serverId}">-</span>
                </div>
            </div>
        `);

        // 内存使用图表
        this[`memoryChart-${serverId}`] = new Chart(document.getElementById(`memoryChart-${serverId}`), {
            type: 'doughnut',
            data: {
                labels: ['已用', '空闲'],
                datasets: [{
                    data: [],
                    backgroundColor: ['#ff6384', '#36a2eb'],
                    borderWidth: 0
                }]
            },
            options: {
                ...doughnutOptions,
                title: {
                    display: true,
                    text: '内存使用率',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.raw === undefined) return '';
                                return `${context.label}: ${context.raw.toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });

        // 添加内存使用量显示
        const memoryContainer = document.getElementById(`memoryChart-${serverId}`).parentElement;
        memoryContainer.insertAdjacentHTML('beforeend', `
            <div class="chart-data-display">
                <div class="data-item">
                    <span class="label">内存使用:</span>
                    <span class="value" id="memory-value-${serverId}">-</span>
                </div>
                <div class="data-item">
                    <span class="label">总内存:</span>
                    <span class="value" id="memory-total-${serverId}">-</span>
                </div>
            </div>
        `);

        // 磁盘使用图表
        this[`diskChart-${serverId}`] = new Chart(document.getElementById(`diskChart-${serverId}`), {
            type: 'doughnut',
            data: {
                labels: ['已用', '空闲'],
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#ff6384', '#36a2eb'],
                    borderWidth: 0
                }]
            },
            options: {
                ...doughnutOptions,
                title: {
                    display: true,
                    text: '磁盘使用率',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        });

        // 系统负载图表
        this[`loadChart-${serverId}`] = new Chart(document.getElementById(`loadChart-${serverId}`), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '系统负载',
                    data: [],
                    borderColor: '#ff6384',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                ...commonOptions,
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '时间',
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '负载',
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            beginAtZero: true,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                plugins: {
                    ...commonOptions.plugins,
                    tooltip: {
                        ...commonOptions.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                return `负载: ${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });

        // 添加实时数据显示容器
        const chartContainer = document.getElementById(`loadChart-${serverId}`).parentElement;
        const dataDisplay = document.createElement('div');
        dataDisplay.className = 'chart-data-display';
        dataDisplay.innerHTML = `
            <div class="data-item">
                <span class="label">当前负载:</span>
                <span class="value" id="load-value-${serverId}">0.00</span>
            </div>
        `;
        chartContainer.appendChild(dataDisplay);

        // 网络流量图表
        this[`networkChart-${serverId}`] = new Chart(document.getElementById(`networkChart-${serverId}`), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: '入站流量(MB/s)',
                        data: [],
                        borderColor: '#67C23A',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: '出站流量(MB/s)',
                        data: [],
                        borderColor: '#E6A23C',
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                ...commonOptions,
                title: {
                    display: true,
                    text: '网络流量',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '时间',
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '流量(MB/s)',
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            beginAtZero: true,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                plugins: {
                    ...commonOptions.plugins,
                    tooltip: {
                        ...commonOptions.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                return `流量: ${context.raw.toFixed(2)} MB/s`;
                            }
                        }
                    }
                }
            }
        });

        // 添加网络流量实时数据显示
        const networkContainer = document.getElementById(`networkChart-${serverId}`).parentElement;
        networkContainer.insertAdjacentHTML('beforeend', `
            <div class="chart-data-display">
                <div class="data-item">
                    <span class="label">入站流量:</span>
                    <span class="value" id="network-in-${serverId}">0.00 MB/s</span>
                </div>
                <div class="data-item">
                    <span class="label">出站流量:</span>
                    <span class="value" id="network-out-${serverId}">0.00 MB/s</span>
                </div>
                <div class="data-item">
                    <span class="label">总接收:</span>
                    <span class="value" id="network-total-in-${serverId}">0.00 MB</span>
                </div>
                <div class="data-item">
                    <span class="label">总发送:</span>
                    <span class="value" id="network-total-out-${serverId}">0.00 MB</span>
                </div>
            </div>
        `);
    },

    // 开始监控服务器
    startServerMonitoring(serverId) {
        const updateServerStatus = async () => {
            try {
                const response = await fetch(`/api/servers/${serverId}/status`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                if (data.metrics) {
                    this.updateServerCharts(serverId, data.metrics);
                }
            } catch (error) {
                console.error(`获取服务器 ${serverId} 状态失败:`, error);
            }
        };

        // 立即更新一次
        updateServerStatus();

        // 每30秒更新一次
        this[`statusInterval-${serverId}`] = setInterval(updateServerStatus, 1000);
    },

    // 更新服务器图表数据
    updateServerCharts(serverId, metrics) {
        // 更新CPU图表和数据显示
        const cpuChart = this[`cpuChart-${serverId}`];
        if (cpuChart && metrics.cpu_usage !== undefined) {
            cpuChart.data.datasets[0].data = [
                metrics.cpu_usage,
                100 - metrics.cpu_usage
            ];
            cpuChart.update();
            document.getElementById(`cpu-value-${serverId}`).textContent = 
                `${metrics.cpu_usage.toFixed(1)}%`;
        }

        // 更新内存图表和数据显示
        const memoryChart = this[`memoryChart-${serverId}`];
        if (memoryChart && metrics.memory_usage !== undefined) {
            memoryChart.data.datasets[0].data = [
                metrics.memory_usage,
                100 - metrics.memory_usage
            ];
            memoryChart.update();
            document.getElementById(`memory-value-${serverId}`).textContent = 
                `${metrics.memory_used.toFixed(1)}GB / ${metrics.memory_total.toFixed(1)}GB`;
            document.getElementById(`memory-total-${serverId}`).textContent = 
                `${metrics.memory_usage.toFixed(1)}%`;
        }

        // 更新磁盘图表
        const diskChart = this[`diskChart-${serverId}`];
        if (diskChart) {
            diskChart.data.datasets[0].data = [
                metrics.disk_usage || 0,
                100 - (metrics.disk_usage || 0)
            ];
            diskChart.update();
        }

        // 更负载图表
        const loadChart = this[`loadChart-${serverId}`];
        if (loadChart) {
            const now = new Date().toLocaleTimeString();
            const loadData = Array.isArray(metrics.load_average) ? 
                metrics.load_average[0] : // 使用1分钟负载
                (metrics.load_average || 0);
            
            loadChart.data.labels.push(now);
            loadChart.data.datasets[0].data.push(loadData);

            // 保持最近10个数据点
            if (loadChart.data.labels.length > 10) {
                loadChart.data.labels.shift();
                loadChart.data.datasets[0].data.shift();
            }
            loadChart.update();
        }

        // 更新网络流量图表和数据显示
        const networkChart = this[`networkChart-${serverId}`];
        if (networkChart && metrics.network) {
            const now = new Date().toLocaleTimeString();
            
            // 计算速率和总量
            const formatNetworkSpeed = (bytes) => {
                if (bytes < 1024) return `${bytes.toFixed(2)} B/s`;
                if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB/s`;
                if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB/s`;
                return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB/s`;
            };

            const formatNetworkTotal = (bytes) => {
                if (bytes < 1024) return `${bytes.toFixed(2)} B`;
                if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
                if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
                return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
            };

            // 计算速率（每秒）
            const networkIn = metrics.network.rx_bytes;
            const networkOut = metrics.network.tx_bytes;

            // 更新图表数据
            networkChart.data.labels.push(now);
            networkChart.data.datasets[0].data.push(networkIn);
            networkChart.data.datasets[1].data.push(networkOut);

            // 保持最近10个数据点
            if (networkChart.data.labels.length > 10) {
                networkChart.data.labels.shift();
                networkChart.data.datasets[0].data.shift();
                networkChart.data.datasets[1].data.shift();
            }

            // 更新图表
            networkChart.update();

            // 更新实时数据显示
            document.getElementById(`network-in-${serverId}`).textContent = formatNetworkSpeed(networkIn);
            document.getElementById(`network-out-${serverId}`).textContent = formatNetworkSpeed(networkOut);
            document.getElementById(`network-total-in-${serverId}`).textContent = formatNetworkTotal(metrics.network.rx_bytes_total || 0);
            document.getElementById(`network-total-out-${serverId}`).textContent = formatNetworkTotal(metrics.network.tx_bytes_total || 0);

            // 动态调整Y轴范围
            const maxValue = Math.max(
                ...networkChart.data.datasets[0].data,
                ...networkChart.data.datasets[1].data
            );
            networkChart.options.scales.yAxes[0].ticks.max = maxValue * 1.2;
            networkChart.update();
        }

        // 更新实时数据显示
        if (metrics.load_average) {
            document.getElementById(`load-value-${serverId}`).textContent = 
                metrics.load_average[0].toFixed(2);
        }
    },

    // 加载站点数据
    async loadSites() {
        try {
            const response = await fetch('/api/sites');
            if (!response.ok) {
                throw new Error('取站点列表失败');
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

    // 添加置站点方法
    configSite(siteId) {
        // 获取站点信息
        const site = this.data.sites.find(s => s.id === siteId);
        if (!site) {
            Message.error('站点不存在');
            return;
        }

        // TODO: 实现站点配置对话框
        console.log('置站点:', site);
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
        // 首先检查 Nginx 状态
        fetch('/api/check-nginx')
            .then(response => response.json())
            .then(data => {
                if (!data.installed) {
                    // 如果 Nginx 未安装，显示安装确认对话框
                    if (confirm('需要安装 Nginx 才能添加站点。是否现在安装？')) {
                        this.installNginx();
                    }
                    return;
                }
                // Nginx 已安装，显示提示并继续
                Message.success('Nginx 已安装');
                this.showAddSiteDialogContent();
            })
            .catch(error => {
                console.error('检查 Nginx 状态失败:', error);
                Message.error('检查 Nginx 状态失败');
            });
    },

    // 添加安装 Nginx 的方法
    installNginx() {
        Message.info('正在安装 Nginx，请稍候...');
        
        fetch('/api/install-nginx', {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    Message.success('Nginx 安装成功');
                    // 安装成功后显示添加站点对话框
                    this.showAddSiteDialogContent();
                } else {
                    Message.error('Nginx 安装失败：' + data.message);
                }
            })
            .catch(error => {
                console.error('安装 Nginx 失败:', error);
                Message.error('安装 Nginx 失败');
            });
    },

    // 将原来的 showAddSiteDialog 方法改名为 showAddSiteDialogContent
    showAddSiteDialogContent() {
        // 检查是否已存在模态框
        if (document.querySelector('.modal')) {
            return;
        }

        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>添加站点</h3>
                    <button class="close-btn" onclick="App.closeDialog(this)">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="nginx-status">
                        <span class="status-icon active">✓</span>
                        <span class="status-text">Nginx 已安装并运行</span>
                    </div>
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
                            <button type="button" class="btn btn-default" onclick="App.closeDialog(this)">取消</button>
                            <button type="submit" class="btn btn-primary">确定</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 添加表单提交处理
        const form = document.getElementById('add-site-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 禁用提交按钮
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            const formData = new FormData(e.target);
            const siteData = {
                domain: formData.get('domain'),
                config_path: formData.get('config_path'),
                ssl_enabled: formData.get('ssl_enabled') === 'on'
            };

            try {
                const response = await fetch('/api/sites', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(siteData)
                });

                if (!response.ok) {
                    throw new Error('添加站点失败');
                }

                await response.json();
                Message.success('站点添加成功');
                this.loadSites();
                this.closeDialog(dialog);
            } catch (error) {
                console.error('添加站点失败:', error);
                Message.error('添加站点失败');
                submitBtn.disabled = false;
            }
        });

        // 点击遮罩层关闭
        dialog.querySelector('.modal-overlay').addEventListener('click', () => {
            this.closeDialog(dialog);
        });
    },

    // 添加关闭对话框方法
    closeDialog(element) {
        const dialog = element.closest('.modal');
        if (dialog) {
            dialog.remove();
        }
    },

    executeCommand: function (serverId) {
        // 实现命令执行逻辑
        console.log('执行命令于服务器:', serverId);
        // 这里添加具体的命令执行逻辑
    },

    viewLogs: function (serverId) {
        // 实现日志查看逻辑
        console.log('查看服务器日志:', serverId);
        // 这里添加具体的日志查看逻辑
    },

    deleteServer: function (serverId) {
        // 现服务器删除逻辑
        if (confirm('确定要删除这个服务器吗？')) {
            console.log('删除服务器:', serverId);
            // 这里添加具体的删除逻辑
        }
    },

    closeMonitor: function () {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
        // 销毁图表
        if (this.cpuChart) this.cpuChart.destroy();
        if (this.memoryChart) this.memoryChart.destroy();
        if (this.diskChart) this.diskChart.destroy();
        if (this.loadChart) this.loadChart.destroy();
        if (this.networkChart) this.networkChart.destroy();
        if (this.processChart) this.processChart.destroy();
        
        const monitorWindow = document.getElementById('server-monitor');
        if (monitorWindow) {
            monitorWindow.remove();
        }
    }
};

// 将App挂载到全局
window.App = App;

// 标签切换功能
function initTabs() {
    const tabs = document.querySelectorAll('.tab-item');
    const panes = document.querySelectorAll('.tab-pane');

    // 默认激活一个标签
    tabs[0].classList.add('active');
    panes[0].classList.add('active');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有激活状态
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            // 激活当前标签
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-panel`).classList.add('active');
        });
    });
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    App.init();
}); 