export const Guide = {
    template: `
        <el-dialog
            v-model="visible"
            :show-close="false"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            width="60%"
            class="guide-dialog"
        >
            <div class="guide-container">
                <!-- 步骤指示器 -->
                <el-steps :active="currentStep" finish-status="success" class="guide-steps">
                    <el-step title="欢迎" description="系统介绍"></el-step>
                    <el-step title="站点管理" description="站点配置说明"></el-step>
                    <el-step title="服务器管理" description="服务器操作说明"></el-step>
                    <el-step title="监控功能" description="监控功能介绍"></el-step>
                </el-steps>

                <!-- 步骤内容 -->
                <div class="guide-content">
                    <!-- 欢迎页面 -->
                    <div v-if="currentStep === 0" class="step-content">
                        <h2>欢迎使用站点管理系统</h2>
                        <p>这是一个强大的站点和服务器管理平台，帮助您：</p>
                        <ul>
                            <li>轻松管理多个站点配置</li>
                            <li>集中监控服务器状态</li>
                            <li>实时查看系统性能</li>
                            <li>快速执行远程命令</li>
                        </ul>
                        <div class="step-image">
                            <img src="/static/images/welcome.png" alt="欢迎">
                        </div>
                    </div>

                    <!-- 站点管理说明 -->
                    <div v-if="currentStep === 1" class="step-content">
                        <h2>站点管理功能</h2>
                        <p>在这里，您可以：</p>
                        <ul>
                            <li>添加和配置新站点</li>
                            <li>管理SSL证书</li>
                            <li>设置Nginx配置</li>
                            <li>监控站点状态</li>
                        </ul>
                        <div class="feature-demo">
                            <video src="/static/videos/site-demo.mp4" controls></video>
                        </div>
                    </div>

                    <!-- 服务器管理说明 -->
                    <div v-if="currentStep === 2" class="step-content">
                        <h2>服务器管理功能</h2>
                        <p>强大的服务器管理功能包括：</p>
                        <ul>
                            <li>添加服务器（支持密码和SSH密钥认证）</li>
                            <li>执行远程命令</li>
                            <li>查看命令执行历史</li>
                            <li>实时监控服务器状态</li>
                        </ul>
                        <div class="feature-demo">
                            <img src="/static/images/server-management.png" alt="服务器管理">
                        </div>
                    </div>

                    <!-- 监控功能说明 -->
                    <div v-if="currentStep === 3" class="step-content">
                        <h2>实时监控功能</h2>
                        <p>全方位的监控功能：</p>
                        <ul>
                            <li>CPU、内存、磁盘使用率</li>
                            <li>系统负载和进程监控</li>
                            <li>服务状态检查</li>
                            <li>系统日志实时查看</li>
                        </ul>
                        <div class="feature-demo">
                            <img src="/static/images/monitoring.png" alt="监控功能">
                        </div>
                    </div>
                </div>

                <!-- 操作按钮 -->
                <div class="guide-footer">
                    <el-button @click="skipGuide" v-if="currentStep === 0">跳过引导</el-button>
                    <el-button @click="prevStep" v-if="currentStep > 0">上一步</el-button>
                    <el-button 
                        type="primary" 
                        @click="nextStep"
                    >
                        {{ currentStep === 3 ? '开始使用' : '下一步' }}
                    </el-button>
                </div>
            </div>
        </el-dialog>
    `,
    data() {
        return {
            visible: true,
            currentStep: 0
        }
    },
    methods: {
        nextStep() {
            if (this.currentStep < 3) {
                this.currentStep++
            } else {
                this.completeGuide()
            }
        },
        prevStep() {
            if (this.currentStep > 0) {
                this.currentStep--
            }
        },
        skipGuide() {
            this.$confirm('确定要跳过引导教程吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                this.completeGuide()
            })
        },
        completeGuide() {
            // 保存引导完成状态
            localStorage.setItem('guideCompleted', 'true')
            this.visible = false
            this.$emit('complete')
        }
    }
} 