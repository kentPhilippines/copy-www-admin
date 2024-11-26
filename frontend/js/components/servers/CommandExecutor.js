const CommandExecutor = {
    props: {
        visible: {
            type: Boolean,
            required: true
        },
        serverId: {
            type: Number,
            required: true
        },
        serverName: {
            type: String,
            required: true
        }
    },
    template: `
        <div class="modal" v-if="visible">
            <div class="modal-overlay" @click="handleClose"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>执行命令 - {{serverName}}</h3>
                    <button class="close-btn" @click="handleClose">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="command-form">
                        <div class="form-group">
                            <label>命令</label>
                            <textarea 
                                v-model="commandForm.command"
                                rows="3"
                                placeholder="请输入要执行的命令"
                                @keyup.ctrl.enter="executeCommand"
                            ></textarea>
                            <div class="command-tips">
                                提示: 按Ctrl+Enter快速执行命令
                            </div>
                        </div>
                    </div>

                    <div v-if="commandHistory.length > 0" class="command-history">
                        <div class="history-header">
                            <h4>命令历史</h4>
                            <button class="btn btn-text" @click="clearHistory">清空历史</button>
                        </div>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>命令</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(cmd, index) in commandHistory" :key="index">
                                    <td>{{cmd.command}}</td>
                                    <td>
                                        <span class="status-tag" :class="cmd.status">
                                            {{cmd.status}}
                                        </span>
                                    </td>
                                    <td>
                                        <button 
                                            class="btn btn-text"
                                            @click="reuseCommand(cmd.command)"
                                        >重新执行</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div v-if="commandResult" class="command-result">
                        <div class="result-header">
                            <h4>执行结果</h4>
                            <button class="btn btn-text" @click="copyResult">复制结果</button>
                        </div>
                        <pre :class="{'error': commandStatus === 'error'}">{{commandResult}}</pre>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-default" @click="handleClose">关闭</button>
                    <button 
                        class="btn btn-primary" 
                        @click="executeCommand"
                        :disabled="executing"
                    >
                        {{executing ? '执行中...' : '执行'}}
                    </button>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            commandForm: {
                command: ''
            },
            commandHistory: [],
            commandResult: '',
            commandStatus: '',
            executing: false
        }
    },
    methods: {
        handleClose() {
            this.$emit('update:visible', false)
            this.resetForm()
        },
        resetForm() {
            this.commandForm.command = ''
            this.commandResult = ''
            this.commandStatus = ''
        },
        async executeCommand() {
            if (!this.commandForm.command.trim()) {
                this.$message.warning('请输入要执行的命令')
                return
            }

            this.executing = true
            try {
                const result = await this.$emit('execute', {
                    serverId: this.serverId,
                    command: this.commandForm.command
                })
                
                this.commandResult = result.result
                this.commandStatus = result.status
                
                // 添加到历史记录
                this.commandHistory.unshift({
                    command: this.commandForm.command,
                    status: result.status,
                    timestamp: new Date().toLocaleString()
                })
                
                if (result.status === 'success') {
                    this.$message.success('命令执行成功')
                } else {
                    this.$message.error('命令执行失败')
                }
            } catch (error) {
                this.$message.error('命令执行出错')
            } finally {
                this.executing = false
            }
        },
        reuseCommand(command) {
            this.commandForm.command = command
        },
        clearHistory() {
            this.$confirm('确认清空命令历史记录吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                this.commandHistory = []
            }).catch(() => {})
        },
        async copyResult() {
            try {
                await navigator.clipboard.writeText(this.commandResult)
                this.$message.success('结果已复制到剪贴板')
            } catch (err) {
                this.$message.error('复制失败')
            }
        }
    }
};

window.CommandExecutor = CommandExecutor; 