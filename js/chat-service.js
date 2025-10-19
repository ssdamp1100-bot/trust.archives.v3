// Chat Service
class ChatService {
    constructor() {
        this.currentMessages = []
        this.isConnected = false
        this.reconnectAttempts = 0
        this.maxReconnectAttempts = 5
    }

    // Initialize chat connection
    async initializeChat() {
        try {
            // Subscribe to messages table changes
            const { data, error } = await supabaseClient
                .from('messages')
                .select(`
                    *,
                    users!messages_user_id_fkey(username, full_name)
                `)
                .order('created_at', { ascending: true })

            if (error) {
                console.error('Error initializing chat:', error)
                return { success: false, error: error.message }
            }

            this.currentMessages = data || []
            this.isConnected = true

            // Set up real-time subscription
            this.setupRealtimeSubscription()

            return { success: true, messages: this.currentMessages }
        } catch (error) {
            console.error('Error in initializeChat:', error)
            return { success: false, error: error.message }
        }
    }

    // Set up real-time subscription for new messages
    setupRealtimeSubscription() {
        try {
            supabaseClient
                .channel('messages')
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'messages' 
                    }, 
                    (payload) => {
                        this.handleNewMessage(payload.new)
                    }
                )
                .subscribe()
        } catch (error) {
            console.error('Error setting up real-time subscription:', error)
        }
    }

    // Handle new message from real-time subscription
    handleNewMessage(message) {
        try {
            // Add message to current messages
            this.currentMessages.push(message)
            
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

    // Send new message
    async sendMessage(messageText) {
        try {
            const userId = window.authService.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            if (!messageText.trim()) {
                return { success: false, error: 'لا يمكن إرسال رسالة فارغة' }
            }

            const message = {
                content: messageText.trim(),
                user_id: userId,
                created_at: new Date().toISOString()
            }

            const { data, error } = await supabaseClient
                .from('messages')
                .insert([message])
                .select(`
                    *,
                    users!messages_user_id_fkey(username, full_name)
                `)
                .single()

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, message: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Get messages with pagination
    async getMessages(limit = 50, offset = 0) {
        try {
            const { data, error } = await supabaseClient
                .from('messages')
                .select(`
                    *,
                    users!messages_user_id_fkey(username, full_name)
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1)

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, messages: data.reverse() }
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

    // Disconnect chat
    disconnect() {
        try {
            this.isConnected = false
            supabaseClient.removeAllChannels()
        } catch (error) {
            console.error('Error disconnecting chat:', error)
        }
    }
}

// Create global instance
window.chatService = new ChatService()
