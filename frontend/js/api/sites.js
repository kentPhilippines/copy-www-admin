import { request } from './index.js'

export const SitesAPI = {
    // 获取站点列表
    list() {
        return request('/sites')
    },

    // 创建站点
    create(data) {
        return request('/sites', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    // 删除站点
    delete(id) {
        return request(`/sites/${id}`, {
            method: 'DELETE'
        })
    }
} 