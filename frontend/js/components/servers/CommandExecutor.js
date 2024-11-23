export const CommandExecutor = {
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
        <el-dialog 
            v-model="dialogVisible"
            :title="'执行命令 - ' + serverName"
            width="60%"
            @close="handleClose">
            <div class="command-executor">
                <el-form :model="commandForm" ref="commandForm">
                    <el-form-item label="命令" prop="command">
                        <el-input 
                            v-model="commandForm.command"
                            type="textarea"
                            :rows="3"
                            placeholder="请输入要执行的命令"
                            @keyup.enter.ctrl="executeCommand">
                        </el-input>
                        <div class="command-tips">
                            提示: 按Ctrl+Enter快速执行命令
                        </div>
                    </el-form-item>
                </el-form>

                <div v-if="commandHistory.length > 0" class="command-history">
                    <div class="history-header">
                        <span>命令历史</span>
                        <el-button type="text" @click="clearHistory">清空历史</el-button>
                    </div>
                    <el-table :data="commandHistory" stripe size="small">
                        <el-table-column prop="command" label="命令"></el-table-column>
                        <el-table-column prop="status" label="状态" width="100">
                            <template #default="scope">
                                <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'">
                                    {{ scope.row.status }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="100">
                            <template #default="scope">
                                <el-button 
                                    type="text" 
                                    @click="reuseCommand(scope.row.command)">
                                    重新执行
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>

                <div v-if="commandResult" class="command-result">
                    <div class="result-header">
                        <span>执行结果</span>
                        <el-button type="text" @click="copyResult">复制结果</el-button>
                    </div>
                    <pre :class="{'error': commandStatus === 'error'}">{{ commandResult }}</pre>
                </div>
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="handleClose">关闭</el-button>
                    <el-button 
                        type="primary" 
                        @click="executeCommand" 
                        :loading="executing">
                        执行
                    </el-button>
                </span>
            </template>
        </el-dialog>
    `,
    data() {
        return {
            dialogVisible: this.visible,
            commandForm: {
                command: ''
            },
            commandHistory: [],
            commandResult: '',
            commandStatus: '',
            executing: false
        }
    },
    watch: {
        visible(newVal) {
            this.dialogVisible = newVal
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
} 