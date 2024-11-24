const Message = {
    show(message, type = 'info') {
        const messageDiv = document.createElement('div')
        messageDiv.className = `message message-${type}`
        messageDiv.textContent = message
        document.body.appendChild(messageDiv)
        
        setTimeout(() => {
            messageDiv.classList.add('message-fade-out')
            setTimeout(() => {
                document.body.removeChild(messageDiv)
            }, 300)
        }, 3000)
    },

    success(message) {
        this.show(message, 'success')
    },

    error(message) {
        this.show(message, 'error')
    },

    warning(message) {
        this.show(message, 'warning')
    },

    confirm(message) {
        return window.confirm(message)
    }
} 