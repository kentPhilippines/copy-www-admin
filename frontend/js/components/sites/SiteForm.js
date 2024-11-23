export const SiteForm = {
    props: {
        visible: {
            type: Boolean,
            required: true
        }
    },
    template: `
        <el-dialog 
            v-model="dialogVisible"
            title="添加站点"
            width="500px"
            @close="handleClose">
            <el-form 
                :model="siteForm" 
                :rules="rules" 
                ref="siteForm" 
                label-width="100px">
                <el-form-item label="域名" prop="domain">
                    <el-input 
                        v-model="siteForm.domain" 
                        placeholder="请输入域名">
                    </el-input>
                </el-form-item>
                <el-form-item label="配置路径" prop="config_path">
                    <el-input 
                        v-model="siteForm.config_path" 
                        placeholder="请输入Nginx配置文件路径">
                    </el-input>
                </el-form-item>
                <el-form-item label="SSL证书">
                    <el-switch v-model="siteForm.ssl_enabled"></el-switch>
                </el-form-item>
                
                <!-- SSL证书相关表单，仅在启用SSL时显示 -->
                <template v-if="siteForm.ssl_enabled">
                    <el-form-item label="证书文件">
                        <el-upload
                            class="upload-demo"
                            action="/api/upload-cert"
                            :on-success="handleCertUploadSuccess"
                            :before-upload="beforeCertUpload"
                            :limit="1">
                            <el-button type="primary">上传证书文件</el-button>
                            <template #tip>
                                <div class="el-upload__tip">
                                    请上传.crt或.pem格式的证书文件
                                </div>
                            </template>
                        </el-upload>
                    </el-form-item>
                    <el-form-item label="密钥文件">
                        <el-upload
                            class="upload-demo"
                            action="/api/upload-key"
                            :on-success="handleKeyUploadSuccess"
                            :before-upload="beforeKeyUpload"
                            :limit="1">
                            <el-button type="primary">上传密钥文件</el-button>
                            <template #tip>
                                <div class="el-upload__tip">
                                    请上传.key格式的密钥文件
                                </div>
                            </template>
                        </el-upload>
                    </el-form-item>
                </template>

                <el-form-item label="高级配置">
                    <el-collapse>
                        <el-collapse-item title="Nginx配置" name="nginx">
                            <el-form-item label="端口" prop="port">
                                <el-input-number 
                                    v-model="siteForm.port" 
                                    :min="1" 
                                    :max="65535">
                                </el-input-number>
                            </el-form-item>
                            <el-form-item label="根目录" prop="root_path">
                                <el-input 
                                    v-model="siteForm.root_path" 
                                    placeholder="网站根目录路径">
                                </el-input>
                            </el-form-item>
                            <el-form-item label="PHP支持">
                                <el-switch v-model="siteForm.php_enabled"></el-switch>
                            </el-form-item>
                        </el-collapse-item>
                    </el-collapse>
                </el-form-item>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="handleClose">取消</el-button>
                    <el-button type="primary" @click="handleSubmit">确定</el-button>
                </span>
            </template>
        </el-dialog>
    `,
    data() {
        return {
            dialogVisible: this.visible,
            siteForm: {
                domain: '',
                config_path: '',
                ssl_enabled: false,
                cert_path: '',
                key_path: '',
                port: 80,
                root_path: '',
                php_enabled: false
            },
            rules: {
                domain: [
                    { required: true, message: '请输入域名', trigger: 'blur' },
                    { pattern: /^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$/, 
                      message: '请输入正确的域名格式', 
                      trigger: 'blur' 
                    }
                ],
                config_path: [
                    { required: true, message: '请输入配置文件路径', trigger: 'blur' }
                ],
                port: [
                    { type: 'number', message: '端口必须为数字' }
                ],
                root_path: [
                    { required: true, message: '请输入网站根目录路径', trigger: 'blur' }
                ]
            }
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
            this.$emit('close')
            this.resetForm()
        },
        handleSubmit() {
            this.$refs.siteForm.validate(async (valid) => {
                if (valid) {
                    this.$emit('submit', this.siteForm)
                    this.handleClose()
                }
            })
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
        beforeCertUpload(file) {
            const isValidType = file.name.endsWith('.crt') || file.name.endsWith('.pem')
            const isValidSize = file.size / 1024 / 1024 < 2
            
            if (!isValidType) {
                this.$message.error('请上传.crt或.pem格式的证书文件!')
            }
            if (!isValidSize) {
                this.$message.error('证书文件大小不能超过2MB!')
            }
            
            return isValidType && isValidSize
        },
        beforeKeyUpload(file) {
            const isValidType = file.name.endsWith('.key')
            const isValidSize = file.size / 1024 / 1024 < 2
            
            if (!isValidType) {
                this.$message.error('请上传.key格式的密钥文件!')
            }
            if (!isValidSize) {
                this.$message.error('密钥文件大小不能超过2MB!')
            }
            
            return isValidType && isValidSize
        },
        handleCertUploadSuccess(response) {
            this.siteForm.cert_path = response.path
            this.$message.success('证书文件上传成功')
        },
        handleKeyUploadSuccess(response) {
            this.siteForm.key_path = response.path
            this.$message.success('密钥文件上传成功')
        }
    }
} 