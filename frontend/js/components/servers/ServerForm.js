export const ServerForm = {
    template: `
        <div class="modal" v-if="visible">
            <div class="modal-overlay" @click="handleClose"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>添加服务器</h3>
                    <button class="close-btn" @click="handleClose">&times;</button>
                </div>
                <div class="modal-body">
                    <form @submit.prevent="handleSubmit" class="server-form">
                        <div class="form-group">
                            <label>服务器名称</label>
                            <input 
                                type="text" 
                                v-model="serverForm.name"
                                placeholder="请输入服务器名称"
                                required
                            >
                        </div>
                        <div class="form-group">
                            <label>IP地址</label>
                            <input 
                                type="text" 
                                v-model="serverForm.ip"
                                placeholder="请输入IP地址"
                                pattern="^(\d{1,3}\.){3}\d{1,3}$"
                                required
                            >
                        </div>
                        <div class="form-group">
                            <label>用户名</label>
                            <input 
                                type="text" 
                                v-model="serverForm.username"
                                placeholder="请输入用户名"
                                required
                            >
                        </div>
                        <div class="form-group">
                            <label>认证方式</label>
                            <div class="radio-group">
                                <label>
                                    <input 
                                        type="radio" 
                                        v-model="serverForm.authType" 
                                        value="password"
                                    > 密码
                                </label>
                                <label>
                                    <input 
                                        type="radio" 
                                        v-model="serverForm.authType" 
                                        value="key"
                                    > SSH密钥
                                </label>
                            </div>
                        </div>
                        <div class="form-group" v-if="serverForm.authType === 'password'">
                            <label>密码</label>
                            <input 
                                type="password" 
                                v-model="serverForm.password"
                                placeholder="请输入密码"
                                required
                            >
                        </div>
                        <div class="form-group" v-if="serverForm.authType === 'key'">
                            <label>SSH密钥</label>
                            <div class="file-upload">
                                <input 
                                    type="file" 
                                    @change="handleFileChange"
                                    accept=".pem,.key"
                                >
                                <div class="upload-tip">
                                    请上传私钥文件，文件大小不超过1MB
                                </div>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-default" @click="handleClose">取消</button>
                            <button type="submit" class="btn btn-primary">确定</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    props: {
        visible: {
            type: Boolean,
            required: true
        }
    },
    data() {
        return {
            serverForm: {
                name: '',
                ip: '',
                username: '',
                authType: 'password',
                password: '',
                keyPath: ''
            }
        }
    },
    methods: {
        handleClose() {
            this.$emit('update:visible', false)
            this.resetForm()
        },
        handleSubmit() {
            // 表单验证
            if (!this.validateForm()) {
                return
            }
            this.$emit('submit', this.serverForm)
            this.handleClose()
        },
        resetForm() {
            this.serverForm = {
                name: '',
                ip: '',
                username: '',
                authType: 'password',
                password: '',
                keyPath: ''
            }
        },
        validateForm() {
            // IP地址验证
            const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/
            if (!ipPattern.test(this.serverForm.ip)) {
                this.showError('请输入正确的IP地址格式')
                return false
            }

            // 密码认证时必须输入密码
            if (this.serverForm.authType === 'password' && !this.serverForm.password) {
                this.showError('请输入密码')
                return false
            }

            // SSH密钥认证时必须上传密钥
            if (this.serverForm.authType === 'key' && !this.serverForm.keyPath) {
                this.showError('请上传SSH密钥')
                return false
            }

            return true
        },
        handleFileChange(event) {
            const file = event.target.files[0]
            if (!file) return

            // 验证文件大小
            if (file.size > 1024 * 1024) {
                this.showError('SSH密钥文件大小不能超过1MB')
                event.target.value = ''
                return
            }

            // 上传文件
            const formData = new FormData()
            formData.append('file', file)

            fetch('/api/upload-key', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                this.serverForm.keyPath = data.path
                this.showSuccess('SSH密钥上传成功')
            })
            .catch(() => {
                this.showError('SSH密钥上传失败')
            })
        },
        showError(message) {
            // 显示错误消息
            const errorDiv = document.createElement('div')
            errorDiv.className = 'message message-error'
            errorDiv.textContent = message
            document.body.appendChild(errorDiv)
            setTimeout(() => {
                errorDiv.remove()
            }, 3000)
        },
        showSuccess(message) {
            // 显示成功消息
            const successDiv = document.createElement('div')
            successDiv.className = 'message message-success'
            successDiv.textContent = message
            document.body.appendChild(successDiv)
            setTimeout(() => {
                successDiv.remove()
            }, 3000)
        }
    }
} 