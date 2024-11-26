import { API } from './index.js'

export const SitesAPI = {
    // 获取站点列表
    async list() {
        return API.get('/sites')
    },

    // 创建站点
    async create(siteData) {
        return API.post('/sites', siteData)
    },

    // 更新站点
    async update(siteId, siteData) {
        return API.put(`/sites/${siteId}`, siteData)
    },

    // 删除站点
    async delete(siteId) {
        return API.delete(`/sites/${siteId}`)
    },

    // 上传SSL证书
    async uploadCert(siteId, certFile, keyFile) {
        const formData = new FormData()
        formData.append('cert', certFile)
        formData.append('key', keyFile)

        const response = await fetch(`${API.baseUrl}/sites/${siteId}/ssl`, {
            method: 'POST',
            body: formData
        })

        if (!response.ok) {
            throw new Error('SSL证书上传失败')
        }

        return response.json()
    }
} 