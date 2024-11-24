export const SiteForm = {
    props: {
        visible: {
            type: Boolean,
            required: true
        }
    },
    template: `
        <div class="modal" v-if="visible">
            <div class="modal-overlay" @click="handleClose"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>添加站点</h3>
                    <button class="close-btn" @click="handleClose">&times;</button>
                </div>
                <div class="modal-body">
                    <form @submit.prevent="handleSubmit" class="site-form">
                        <div class="form-group">
                            <label>域名</label>
                            <input 
                                type="text" 
                                v-model="siteForm.domain"
                                placeholder="请输入域名"
                                pattern="^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$"
                                required
                            >
                        </div>
                        <div class="form-group">
                            <label>配置路径</label>
                            <input 
                                type="text" 
                                v-model="siteForm.config_path"
                                placeholder="请输入Nginx配置文件路径"
                                required
                            >
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    v-model="siteForm.ssl_enabled"
                                > SSL证书
                            </label>
                        </div>

                        <div v-if="siteForm.ssl_enabled" class="ssl-section">
                            <div class="form-group">
                                <label>证书文件</label>
                                <div class="file-upload">
                                    <input 
                                        type="file" 
                                        @change="handleCertFileChange"
                                        accept=".crt,.pem"
                                    >
                                    <div class="upload-tip">
                                        请上传.crt或.pem格式的证书文件
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>密钥文件</label>
                                <div class="file-upload">
                                    <input 
                                        type="file" 
                                        @change="handleKeyFileChange"
                                        accept=".key"
                                    >
                                    <div class="upload-tip">
                                        请上传.key格式的密钥文件
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="advanced-section">
                            <h4>高级配置</h4>
                            <div class="form-group">
                                <label>端口</label>
                                <input 
                                    type="number" 
                                    v-model="siteForm.port"
                                    min="1"
                                    max="65535"
                                >
                            </div>
                            <div class="form-group">
                                <label>根目录</label>
                                <input 
                                    type="text" 
                                    v-model="siteForm.root_path"
                                    placeholder="网站根目录路径"
                                >
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        v-model="siteForm.php_enabled"
                                    > PHP支持
                                </label>
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
    data() {
        return {
            siteForm: {
                domain: '',
                config_path: '',
                ssl_enabled: false,
                cert_path: '',
                key_path: '',
                port: 80,
                root_path: '',
                php_enabled: false
            }
        }
    },
    methods: {
        handleClose() {
            this.$emit('update:visible', false)
            this.resetForm()
        },
        handleSubmit() {
            if (!this.validateForm()) {
                return
            }
            this.$emit('submit', this.siteForm)
            this.handleClose()
        },
        resetForm() {
            this.siteForm = {
                domain: '',
                config_path: '',
                ssl_enabled: false,
                cert_path: '',
                key_path: '',
                port: 80,
                root_path: '',
                php_enabled: false
            }
        },
        validateForm() {
            const domainPattern = /^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$/
            if (!domainPattern.test(this.siteForm.domain)) {
                this.showError('请输入正确的域名格式')
                return false
            }

            if (this.siteForm.ssl_enabled) {
                if (!this.siteForm.cert_path) {
                    this.showError('请上传SSL证书文件')
                    return false
                }
                if (!this.siteForm.key_path) {
                    this.showError('请上传SSL密钥文件')
                    return false
                }
            }

            return true
        },
        handleCertFileChange(event) {
            const file = event.target.files[0]
            if (!file) return

            if (!file.name.endsWith('.crt') && !file.name.endsWith('.pem')) {
                this.showError('请上传.crt或.pem格式的证书文件')
                event.target.value = ''
                return
            }

            if (file.size > 2 * 1024 * 1024) {
                this.showError('证书文件大小不能超过2MB')
                event.target.value = ''
                return
            }

            const formData = new FormData()
            formData.append('file', file)

            fetch('/api/upload-cert', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                this.siteForm.cert_path = data.path
                this.showSuccess('证书文件上传成功')
            })
            .catch(() => {
                this.showError('证书文件上传失败')
            })
        },
        handleKeyFileChange(event) {
            const file = event.target.files[0]
            if (!file) return

            if (!file.name.endsWith('.key')) {
                this.showError('请上传.key格式的密钥文件')
                event.target.value = ''
                return
            }

            if (file.size > 2 * 1024 * 1024) {
                this.showError('密钥文件大小不能超过2MB')
                event.target.value = ''
                return
            }

            const formData = new FormData()
            formData.append('file', file)

            fetch('/api/upload-key', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                this.siteForm.key_path = data.path
                this.showSuccess('密钥文件上传成功')
            })
            .catch(() => {
                this.showError('密钥文件上传失败')
            })
        },
        showError(message) {
            const errorDiv = document.createElement('div')
            errorDiv.className = 'message message-error'
            errorDiv.textContent = message
            document.body.appendChild(errorDiv)
            setTimeout(() => {
                errorDiv.remove()
            }, 3000)
        },
        showSuccess(message) {
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