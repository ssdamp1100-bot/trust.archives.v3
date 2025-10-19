// Chat Service - localStorage based (Team Chat only)
// Direct messages still use Supabase via direct-chat-service.js
class ChatService {
    constructor() {
        this.currentMessages = []
        this.isConnected = false
        this.storageKey = 'team_chat_messages'
        this.setupStorageListener()
    }

    // Initialize chat connection (loads from localStorage)
    async initializeChat() {
        try {
            this.currentMessages = this.loadMessagesFromStorage()
            this.isConnected = true
            return { success: true, messages: this.currentMessages }
        } catch (error) {
            console.error('Error in initializeChat:', error)
            return { success: false, error: error.message }
        }
    }

    // Load messages from localStorage
    loadMessagesFromStorage() {
        try {
            const raw = localStorage.getItem(this.storageKey)
            if (!raw) return []
            const messages = JSON.parse(raw)
            return Array.isArray(messages) ? messages : []
        } catch (error) {
            console.error('Error loading messages from storage:', error)
            return []
        }
    }

    // Save messages to localStorage
    saveMessagesToStorage(messages) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(messages))
        } catch (error) {
            console.error('Error saving messages to storage:', error)
        }
    }

    // Setup storage event listener for cross-tab sync
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey && e.newValue) {
                try {
                    const newMessages = JSON.parse(e.newValue)
                    if (Array.isArray(newMessages) && newMessages.length > this.currentMessages.length) {
                        const lastMessage = newMessages[newMessages.length - 1]
                        this.currentMessages = newMessages
                        this.handleNewMessage(lastMessage)
                    }
                } catch (error) {
                    console.error('Error handling storage event:', error)
                }
            }
        })
    }

    // Handle new message (from storage event or local send)
    handleNewMessage(message) {
        try {
            // Play notification sound
            this.playNotificationSound()
            
            // Update UI if chat is open
            this.updateChatUI()
            
            // Show browser notification
            this.showBrowserNotification(message)
        } catch (error) {
            console.error('Error handling new message:', error)
        }
    }

    // Send new message (localStorage)
    async sendMessage(messageText) {
        try {
            const currentUser = window.authService?.getCurrentUser()
            if (!currentUser) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            if (!messageText.trim()) {
                return { success: false, error: 'لا يمكن إرسال رسالة فارغة' }
            }

            const message = {
                id: this.generateMessageId(),
                content: messageText.trim(),
                user_id: currentUser.id,
                created_at: new Date().toISOString(),
                users: {
                    username: currentUser.username,
                    full_name: currentUser.full_name || currentUser.username
                }
            }

            // Add to current messages
            this.currentMessages.push(message)
            
            // Save to localStorage
            this.saveMessagesToStorage(this.currentMessages)
            
            // Trigger storage event manually for same tab
            this.handleNewMessage(message)

            return { success: true, message: message }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Generate unique message ID
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Get messages with pagination (from localStorage)
    async getMessages(limit = 50, offset = 0) {
        try {
            const allMessages = this.loadMessagesFromStorage()
            const sliced = allMessages.slice(Math.max(0, allMessages.length - limit - offset), allMessages.length - offset)
            return { success: true, messages: sliced }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Update chat UI
    updateChatUI() {
        try {
            const chatContainer = document.getElementById('chat-messages')
            if (chatContainer) {
                this.renderMessages(this.currentMessages)
                this.scrollToBottom()
            }
        } catch (error) {
            console.error('Error updating chat UI:', error)
        }
    }

    // Render messages in chat container
    renderMessages(messages) {
        try {
            const chatContainer = document.getElementById('chat-messages')
            if (!chatContainer) return

            chatContainer.innerHTML = ''

            messages.forEach(message => {
                const messageElement = this.createMessageElement(message)
                chatContainer.appendChild(messageElement)
            })
        } catch (error) {
            console.error('Error rendering messages:', error)
        }
    }

    // Create message element
    createMessageElement(message) {
        const messageDiv = document.createElement('div')
        const currentUser = window.authService.getCurrentUser()
        const isCurrentUser = message.user_id === currentUser?.id

        messageDiv.className = `message ${isCurrentUser ? 'message-sent' : 'message-received'}`
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${message.users?.username || 'مستخدم'}</span>
                    <span class="message-time">${this.formatMessageTime(message.created_at)}</span>
                </div>
                <div class="message-text">${this.escapeHtml(message.content)}</div>
            </div>
        `

        return messageDiv
    }

    // Format message time
    formatMessageTime(timestamp) {
        try {
            const date = new Date(timestamp)
            const now = new Date()
            const diff = now - date

            if (diff < 60000) { // Less than 1 minute
                return 'الآن'
            } else if (diff < 3600000) { // Less than 1 hour
                const minutes = Math.floor(diff / 60000)
                return `منذ ${minutes} دقيقة`
            } else if (diff < 86400000) { // Less than 1 day
                const hours = Math.floor(diff / 3600000)
                return `منذ ${hours} ساعة`
            } else {
                return date.toLocaleDateString('ar-SA')
            }
        } catch (error) {
            return timestamp
        }
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }

    // Scroll to bottom of chat
    scrollToBottom() {
        try {
            const chatContainer = document.getElementById('chat-messages')
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight
            }
        } catch (error) {
            console.error('Error scrolling to bottom:', error)
        }
    }

    // Play notification sound
    playNotificationSound() {
        try {
            const audio = document.getElementById('notificationSound')
            if (audio) {
                audio.play().catch(error => {
                    console.log('Could not play notification sound:', error)
                })
            }
        } catch (error) {
            console.error('Error playing notification sound:', error)
        }
    }

    // Show browser notification
    showBrowserNotification(message) {
        try {
            if (Notification.permission === 'granted') {
                const notification = new Notification(
                    `رسالة جديدة من ${message.users?.username || 'مستخدم'}`,
                    {
                        body: message.content,
                        icon: 'img/tg-logo.png'
                    }
                )

                setTimeout(() => {
                    notification.close()
                }, 5000)
            }
        } catch (error) {
            console.error('Error showing browser notification:', error)
        }
    }

    // Request notification permission
    async requestNotificationPermission() {
        try {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission()
                return permission === 'granted'
            }
            return Notification.permission === 'granted'
        } catch (error) {
            console.error('Error requesting notification permission:', error)
            return false
        }
    }

    // Disconnect chat (no-op for localStorage)
    disconnect() {
        try {
            this.isConnected = false
        } catch (error) {
            console.error('Error disconnecting chat:', error)
        }
    }

    // Clear all team chat messages (admin only)
    clearAllMessages() {
        try {
            this.currentMessages = []
            this.saveMessagesToStorage([])
            return { success: true }
        } catch (error) {
            console.error('Error clearing messages:', error)
            return { success: false, error: error.message }
        }
    }
}

// Create global instance
window.chatService = new ChatService()
