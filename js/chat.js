// Chat System - Team Chat (localStorage) + AI Chat
// Note: Team chat messages are stored locally, not in database
// Direct messages still use Supabase (see direct-chat-service.js)
document.addEventListener('DOMContentLoaded', async function() {
    // ===== العناصر الأساسية =====
    const chatToggle = document.getElementById('chatToggle');
    const aiToggle = document.getElementById('aiToggle');
    const chatWindow = document.getElementById('chatWindow');
    const aiWindow = document.getElementById('aiWindow');
    const chatHeader = document.getElementById('chatHeader');
    const aiHeader = document.getElementById('aiHeader');
    const minimizeBtn = document.getElementById('minimizeBtn');
    const closeBtn = document.getElementById('closeBtn');
    const aiMinimizeBtn = document.getElementById('aiMinimizeBtn');
    const aiCloseBtn = document.getElementById('aiCloseBtn');
    const muteBtn = document.getElementById('muteBtn');
    const aiMuteBtn = document.getElementById('aiMuteBtn');
    const chatArea = document.getElementById('chatArea');
    const aiArea = document.getElementById('aiArea');
    const chatInput = document.getElementById('chatInput');
    const aiInput = document.getElementById('aiInput');
    const sendBtn = document.getElementById('sendBtn');
    const aiSendBtn = document.getElementById('aiSendBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const aiTypingIndicator = document.getElementById('aiTypingIndicator');
    const notificationBadge = document.getElementById('notificationBadge');
    const messageNotification = document.getElementById('messageNotification');
    const notificationAvatar = document.getElementById('notificationAvatar');
    const notificationSender = document.getElementById('notificationSender');
    const notificationText = document.getElementById('notificationText');
    const notificationSound = document.getElementById('notificationSound');

    // ===== متغيرات الحالة =====
    let isChatOpen = false;
    let isChatMinimized = false;
    let isAiOpen = false;
    let isAiMinimized = false;
    let notificationCount = 0;
    let isSoundMuted = false;
    let currentUser = null;

    // Poe API Configuration (provided via js/ai-config.js)
    const POE_API_KEY = window.aiConfig?.poeApiKey || '';
    const POE_MODEL = window.aiConfig?.model || 'TrustGroup.Ai';
    const POE_URL = 'https://api.poe.com/v1/chat/completions';

    // ===== تهيئة الدردشة =====
    if (window.authService && window.authService.isLoggedIn()) {
        currentUser = window.authService.getCurrentUser();
        await initializeTeamChat();
        // Initialize AI daily limit UI
        initAiLimitUI();
        updateAiLimitUI();
    } else {
        // إخفاء زر دردشة الفريق إذا لم يكن المستخدم مسجلاً
        if (chatToggle) chatToggle.style.display = 'none';
    }

    // ===== تهيئة دردشة الفريق (localStorage) =====
    async function initializeTeamChat() {
        if (!window.chatService) {
            console.error('Chat service not loaded');
            return;
        }

        // جلب الرسائل الأولية من localStorage
        const initialData = await window.chatService.getMessages();
        if (initialData.success && initialData.messages) {
            renderTeamMessages(initialData.messages);
        }

        // الاشتراك في تغييرات localStorage (للمزامنة بين التبويبات)
        subscribeToStorageChanges();
    }

    // Subscribe to localStorage changes for cross-tab sync
    function subscribeToStorageChanges() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'team_chat_messages' && e.newValue) {
                try {
                    const messages = JSON.parse(e.newValue);
                    if (Array.isArray(messages) && messages.length > 0) {
                        const lastMessage = messages[messages.length - 1];
                        // Render only the new message
                        renderTeamMessages([lastMessage], false);
                        
                        if (!isChatOpen || isChatMinimized) {
                            showNotification(lastMessage);
                        }
                    }
                } catch (error) {
                    console.error('Error handling storage change:', error);
                }
            }
        });
    }

    function renderTeamMessages(messages, clear = true) {
        if (clear) {
            chatArea.innerHTML = '';
            chatArea.appendChild(typingIndicator);
        }

        messages.forEach(msg => {
            const messageElement = createTeamMessageElement(msg);
            chatArea.insertBefore(messageElement, typingIndicator);
        });

        scrollChatToBottom();
    }

    function createTeamMessageElement(message) {
        const isOutgoing = message.user_id === currentUser.id;
        const rawSenderName = message.users?.full_name || message.users?.username || 'مستخدم';
        const senderName = isOutgoing ? 'أنت' : rawSenderName;
        const avatarChar = (senderName.charAt(0) || 'U').toUpperCase();

        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${isOutgoing ? 'message-outgoing' : 'message-incoming'}`;
        
        messageElement.innerHTML = `
            <div class="user-avatar" style="background-color: ${isOutgoing ? '#92c87b' : '#4f93a4'}">${avatarChar}</div>
            <div class="message-content">
                <div class="message-sender" ${!isOutgoing ? `data-user-id="${message.user_id || ''}"` : ''}>${senderName}</div>
                <div class="message-text">${escapeHtml(message.content)}</div>
                <div class="message-time">${formatTime(message.created_at)}</div>
            </div>
        `;

        // Make sender clickable to open direct chat (if feature enabled and not self)
        if (!isOutgoing && window.FEATURE_DM_ENABLED === true) {
            const senderEl = messageElement.querySelector('.message-sender');
            senderEl.style.cursor = 'pointer';
            senderEl.title = 'فتح دردشة خاصة';
            senderEl.addEventListener('click', () => {
                try{
                    if (window.openDirectChatByUser) {
                        const role = message.users?.role || 'member';
                        window.openDirectChatByUser(message.user_id, rawSenderName, role);
                    }
                }catch(e){ console.warn('openDirectChatByUser failed:', e); }
            });
        }
        return messageElement;
    }

    function scrollChatToBottom() {
        setTimeout(() => { chatArea.scrollTop = chatArea.scrollHeight; }, 50);
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== إرسال رسالة فريق =====
    async function sendTeamMessage() {
        const messageText = chatInput.value.trim();
        if (messageText === '' || !currentUser) return;

        sendBtn.disabled = true;
        const originalBtnHtml = sendBtn.innerHTML;
        sendBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';

        const result = await window.chatService.sendMessage(messageText);

        if (result.success) {
            chatInput.value = '';
        } else {
            console.error('Failed to send message:', result.error);
            alert('فشل إرسال الرسالة: ' + result.error);
        }
        
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalBtnHtml;
        chatInput.focus();
    }

    // ===== حد يومي لرسائل الذكاء الاصطناعي (10 للمستخدمين، غير محدود للإدمن) + واجهة عداد =====
    const AI_DAILY_LIMIT = 10;
    function todayKey() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    function aiUsageKey(userId) { return `ai_usage:${userId}:${todayKey()}`; }
    function getAiUsage(userId) {
        try { return parseInt(localStorage.getItem(aiUsageKey(userId)) || '0', 10) || 0; } catch { return 0; }
    }
    function setAiUsage(userId, val) { try { localStorage.setItem(aiUsageKey(userId), String(val)); } catch { /* ignore */ } }
    function incAiUsage(userId) { setAiUsage(userId, getAiUsage(userId) + 1); }
    function remainingAiQuota(userId) { return Math.max(0, AI_DAILY_LIMIT - getAiUsage(userId)); }

    function initAiLimitUI() {
        if (!aiHeader) return;
        if (!document.getElementById('aiDailyCounter')) {
            const badge = document.createElement('span');
            badge.id = 'aiDailyCounter';
            badge.style.cssText = 'margin-inline-start:8px;font-size:12px;padding:2px 6px;border-radius:10px;background:var(--container-focus-color);color:var(--text2-color);';
            const title = aiHeader.querySelector('.ai-title');
            (title || aiHeader).appendChild(badge);
        }
    }
    function updateAiLimitUI() {
        const badge = document.getElementById('aiDailyCounter');
        if (!badge || !currentUser) return;
        if (currentUser.role === 'admin') {
            badge.textContent = 'غير محدود';
            badge.style.background = 'var(--container-focus-color)';
            badge.style.color = 'var(--text2-color)';
            return;
        }
        const rem = remainingAiQuota(currentUser.id);
        badge.textContent = `المتبقي اليوم: ${rem}/${AI_DAILY_LIMIT}`;
        badge.style.background = rem > 0 ? 'var(--container-focus-color)' : 'var(--extra6-color)';
        badge.style.color = rem > 0 ? 'var(--text2-color)' : '#fff';
    }

    // ===== إرسال رسالة للذكاء الاصطناعي =====
    async function sendAiMessage() {
        const message = aiInput.value.trim();
        if (message === '') return;
        // تحقق من الحد اليومي (الإدمن مستثنى)
        if (!currentUser) { alert('يجب تسجيل الدخول لاستخدام الذكاء الاصطناعي'); return; }
        if (currentUser.role !== 'admin') {
            const used = getAiUsage(currentUser.id);
            if (used >= AI_DAILY_LIMIT) {
                alert('لقد تجاوزت الحد اليومي لرسائل الذكاء الاصطناعي (10 رسائل). يرجى المحاولة غداً.');
                return;
            }
        }
        
        // إضافة رسالة المستخدم
        addAiMessage('أنت', 'أ', '#92c87b', message, true);
        aiInput.value = '';
        // احتساب الاستخدام وتحديث واجهة العداد للمستخدمين غير الإدمن
        if (currentUser.role !== 'admin') {
            incAiUsage(currentUser.id);
            updateAiLimitUI();
        }
        
        // إظهار مؤشر الكتابة
        aiTypingIndicator.classList.add('active');
        aiArea.scrollTop = aiArea.scrollHeight;
        
        try {
            const response = await sendToPoe(message);
            aiTypingIndicator.classList.remove('active');
            addAiMessage("Trust.Ai", "T", "#7e57c2", response, false);
        } catch (error) {
            aiTypingIndicator.classList.remove('active');
            addAiMessage("Trust.Ai", "T", "#7e57c2", "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.", false);
            console.error("خطأ في Poe API:", error);
        }
    }

    async function sendToPoe(message) {
        if (!POE_API_KEY) throw new Error('POE API key is missing. Set it in js/ai-config.js');

        const payload = {
            model: POE_MODEL,
            messages: [
                { role: 'system', content: 'You are Trust.Ai, an Arabic assistant helping users of Trust Group archive.' },
                { role: 'user', content: message }
            ]
        };

        const response = await fetch(POE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${POE_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error('لم يتم العثور على رد صالح');
        return content;
    }

    function addAiMessage(sender, avatarChar, avatarColor, text, isOutgoing = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('ai-message');
        messageElement.classList.add(isOutgoing ? 'message-outgoing' : 'message-incoming');
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="ai-avatar" style="background-color: ${isOutgoing ? avatarColor : '#7e57c2'};">${isOutgoing ? avatarChar : 'T'}</div>
            <div class="message-content">
                <div class="message-sender">${sender}</div>
                <div class="message-text">${escapeHtml(text)}</div>
                <div class="message-time">${timeString}</div>
            </div>
        `;
        
        aiArea.insertBefore(messageElement, aiTypingIndicator);
        aiArea.scrollTop = aiArea.scrollHeight;
    }

    // ===== نظام الإشعارات =====
    function showNotification(message) {
        notificationCount++;
        notificationBadge.textContent = notificationCount;
        notificationBadge.style.display = 'flex';

        const senderName = message.users?.full_name || message.users?.username || 'مستخدم';
        const avatarChar = (senderName.charAt(0) || 'U').toUpperCase();

        notificationAvatar.textContent = avatarChar;
        notificationSender.textContent = senderName;
        notificationText.textContent = message.content.length > 30 ? message.content.substring(0, 30) + '...' : message.content;

        messageNotification.classList.add('show');
        if (!isSoundMuted) playNotificationSound();

        setTimeout(() => { messageNotification.classList.remove('show'); }, 5000);
    }

    function playNotificationSound() {
        if (notificationSound) notificationSound.play().catch(e => console.log("تعذر تشغيل الصوت: ", e));
    }

    function resetNotifications() {
        notificationCount = 0;
        notificationBadge.style.display = 'none';
        messageNotification.classList.remove('show');
    }

    function toggleMute() {
        isSoundMuted = !isSoundMuted;
        const iconClass = isSoundMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
        if (muteBtn) muteBtn.querySelector('i').className = iconClass;
        if (aiMuteBtn) aiMuteBtn.querySelector('i').className = iconClass;
        if (muteBtn) muteBtn.classList.toggle('muted', isSoundMuted);
        if (aiMuteBtn) aiMuteBtn.classList.toggle('muted', isSoundMuted);
    }

    // ===== التحكم في نافذة دردشة الفريق =====
    function openChat() {
        closeAi();
        chatWindow.classList.add('active');
        chatWindow.classList.remove('minimized');
        isChatOpen = true;
        isChatMinimized = false;
        resetNotifications();
        scrollChatToBottom();
    }

    function minimizeChat() {
        chatWindow.classList.add('minimized');
        isChatMinimized = true;
    }

    function closeChat() {
        chatWindow.classList.remove('active');
        isChatOpen = false;
        isChatMinimized = false;
    }

    // ===== التحكم في نافذة الذكاء الاصطناعي =====
    function openAi() {
        closeChat();
        aiWindow.classList.add('active');
        aiWindow.classList.remove('minimized');
        isAiOpen = true;
        isAiMinimized = false;
    }

    function minimizeAi() {
        aiWindow.classList.add('minimized');
        isAiMinimized = true;
    }

    function closeAi() {
        aiWindow.classList.remove('active');
        isAiOpen = false;
        isAiMinimized = false;
    }

    // ===== Event Listeners =====
    if (chatToggle) {
        chatToggle.addEventListener('click', () => {
            if (!isChatOpen) openChat();
            else { if (isChatMinimized) openChat(); else minimizeChat(); }
            if (isChatOpen && !isChatMinimized) resetNotifications();
        });
    }

    if (aiToggle) {
        aiToggle.addEventListener('click', () => {
            if (!isAiOpen) openAi();
            else { if (isAiMinimized) openAi(); else minimizeAi(); }
            updateAiLimitUI();
        });
    }

    if (minimizeBtn) minimizeBtn.addEventListener('click', (e) => { e.stopPropagation(); minimizeChat(); });
    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeChat(); });
    if (chatHeader) chatHeader.addEventListener('click', () => { if (isChatMinimized) openChat(); });
    if (muteBtn) muteBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); });

    if (aiMinimizeBtn) aiMinimizeBtn.addEventListener('click', (e) => { e.stopPropagation(); minimizeAi(); });
    if (aiCloseBtn) aiCloseBtn.addEventListener('click', (e) => { e.stopPropagation(); closeAi(); });
    if (aiHeader) aiHeader.addEventListener('click', () => { if (isAiMinimized) openAi(); });
    if (aiMuteBtn) aiMuteBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); });

    if (sendBtn) sendBtn.addEventListener('click', sendTeamMessage);
    if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendTeamMessage(); });

    if (aiSendBtn) aiSendBtn.addEventListener('click', sendAiMessage);
    if (aiInput) aiInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendAiMessage(); });
});
