export const ServerForm = {
    props: {
        visible: {
            type: Boolean,
            required: true
        }
    },
    template: `
        <el-dialog 
            v-model="dialogVisible"
            title="添加服务器"
            width="500px"
            @close="handleClose">
            <el-form :model="serverForm" :rules="rules" ref="serverForm" label-width="100px">
                <el-form-item label="服务器名称" prop="name">
                    <el-input v-model="serverForm.name" placeholder="请输入服务器名称"></el-input>
                </el-form-item>
                <el-form-item label="IP地址" prop="ip">
                    <el-input v-model="serverForm.ip" placeholder="请输入IP地址"></el-input>
                </el-form-item>
                <el-form-item label="用户名" prop="username">
                    <el-input v-model="serverForm.username" placeholder="请输入用户名"></el-input>
                </el-form-item>
                <el-form-item label="认证方式" prop="authType">
                    <el-radio-group v-model="serverForm.authType">
                        <el-radio label="password">密码</el-radio>
                        <el-radio label="key">SSH密钥</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item 
                    label="密码" 
                    prop="password" 
                    v-if="serverForm.authType === 'password'">
                    <el-input 
                        v-model="serverForm.password" 
                        type="password" 
                        placeholder="请输入密码"
                        show-password>
                    </el-input>
                </el-form-item>
                <el-form-item 
                    label="SSH密钥" 
                    prop="keyFile" 
                    v-if="serverForm.authType === 'key'">
                    <el-upload
                        class="upload-demo"
                        action="/api/upload-key"
                        :on-success="handleKeyUploadSuccess"
                        :before-upload="beforeKeyUpload"
                        :limit="1">
                        <el-button type="primary">选择密钥文件</el-button>
                        <template #tip>
                            <div class="el-upload__tip">
                                请上传私钥文件，文件大小不超过1MB
                            </div>
                        </template>
                    </el-upload>
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
            serverForm: {
                name: '',
                ip: '',
                username: '',
                authType: 'password',
                password: '',
                keyPath: ''
            },
            rules: {
                name: [
                    { required: true, message: '请输入服务器名称', trigger: 'blur' }
                ],
                ip: [
                    { required: true, message: '请输入IP地址', trigger: 'blur' },
                    { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: '请输入正确的IP地址格式', trigger: 'blur' }
                ],
                username: [
                    { required: true, message: '请输入用户名', trigger: 'blur' }
                ],
                password: [
                    { required: true, message: '请输入密码', trigger: 'blur' }
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
            this.$refs.serverForm.validate(async (valid) => {
                if (valid) {
                    this.$emit('submit', this.serverForm)
                    this.handleClose()
                }
            })
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
        beforeKeyUpload(file) {
            const isValidSize = file.size / 1024 / 1024 < 1
            if (!isValidSize) {
                this.$message.error('SSH密钥文件大小不能超过1MB!')
            }
            return isValidSize
        },
        handleKeyUploadSuccess(response) {
            this.serverForm.keyPath = response.path
            this.$message.success('SSH密钥上传成功')
        }
    }
} 