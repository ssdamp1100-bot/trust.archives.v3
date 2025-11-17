   document.addEventListener('DOMContentLoaded', function() {
    // العناصر الرئيسية
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
    
    // قسم الذكاء الاصطناعي: تهيئة آمنة عبر وكيل بديل (لا مفاتيح في الواجهة)
    // عيّن window.aiProxyUrl إلى مسار خادمك الآمن (مثال: '/api/ai/gemini')
    const AI_PROXY_URL = (typeof window !== 'undefined' && window.aiProxyUrl) ? window.aiProxyUrl : null;
    
    // حالة النوافذ
    let isChatOpen = false;
    let isChatMinimized = false;
    let isAiOpen = false;
    let isAiMinimized = false;
    let notificationCount = 0;
    let isSoundMuted = false; // متغير لحالة تكتيم الصوت
    let users = [
        { name: 'أحمد', avatar: 'أ', color: '#4f93a4' },
        { name: 'فاطمة', avatar: 'ف', color: '#ff6b6b' },
        { name: 'محمد', avatar: 'م', color: '#667eea' },
        { name: 'سارة', avatar: 'س', color: '#f093fb' }
    ];
    
    // فتح وإغلاق الدردشة
    chatToggle.addEventListener('click', function() {
        if (!isChatOpen) {
            openChat();
        } else {
            if (isChatMinimized) {
                openChat();
            } else {
                minimizeChat();
            }
        }
        
        // إخفاء الإشعارات عند فتح الدردشة
        if (isChatOpen && !isChatMinimized) {
            resetNotifications();
        }
    });
    
    // فتح وإغلاق نافذة الذكاء الاصطناعي
    aiToggle.addEventListener('click', function() {
        if (!isAiOpen) {
            openAi();
        } else {
            if (isAiMinimized) {
                openAi();
            } else {
                minimizeAi();
            }
        }
    });
    
    // تصغير الدردشة من الزر في الرأس
    minimizeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        minimizeChat();
    });
    
    // إغلاق الدردشة
    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeChat();
    });
    
    // تصغير الذكاء الاصطناعي من الزر في الرأس
    aiMinimizeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        minimizeAi();
    });
    
    // إغلاق الذكاء الاصطناعي
    aiCloseBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeAi();
    });

    // تكتيم/إلغاء تكتيم الصوت للدردشة
    muteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMute();
    });

    // تكتيم/إلغاء تكتيم الصوت للذكاء الاصطناعي
    aiMuteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMute();
    });
    
    // إرسال رسالة في الدردشة
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // إرسال رسالة للذكاء الاصطناعي
    aiSendBtn.addEventListener('click', sendAiMessage);
    aiInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendAiMessage();
        }
    });
    
    // فتح الدردشة (بدون تركيز تلقائي)
    function openChat() {
        // إغلاق نافذة الذكاء الاصطناعي أولاً
        closeAi();
        
        chatWindow.classList.add('active');
        chatWindow.classList.remove('minimized');
        isChatOpen = true;
        isChatMinimized = false;
        // إزالة التركيز التلقائي على حقل الإدخال
        // chatInput.focus(); // تم إزالة هذا السطر
        resetNotifications();
    }
    
    // تصغير الدردشة
    function minimizeChat() {
        chatWindow.classList.add('minimized');
        isChatMinimized = true;
    }
    
    // إغلاق الدردشة
    function closeChat() {
        chatWindow.classList.remove('active');
        isChatOpen = false;
        isChatMinimized = false;
    }
    
    // فتح الذكاء الاصطناعي (بدون تركيز تلقائي)
    function openAi() {
        // إغلاق نافذة الدردشة الجماعية أولاً
        closeChat();
        
        aiWindow.classList.add('active');
        aiWindow.classList.remove('minimized');
        isAiOpen = true;
        isAiMinimized = false;
        // إزالة التركيز التلقائي على حقل الإدخال
        // aiInput.focus(); // تم إزالة هذا السطر
    }
    
    // تصغير الذكاء الاصطناعي
    function minimizeAi() {
        aiWindow.classList.add('minimized');
        isAiMinimized = true;
    }
    
    // إغلاق الذكاء الاصطناعي
    function closeAi() {
        aiWindow.classList.remove('active');
        isAiOpen = false;
        isAiMinimized = false;
    }

    // تبديل حالة تكتيم الصوت
    function toggleMute() {
        isSoundMuted = !isSoundMuted;
        
        // تحديث أيقونة الزر في كلا النافذتين
        const muteIcon = muteBtn.querySelector('i');
        const aiMuteIcon = aiMuteBtn.querySelector('i');
        
        if (isSoundMuted) {
            muteIcon.className = 'fas fa-volume-mute';
            aiMuteIcon.className = 'fas fa-volume-mute';
            muteBtn.classList.add('muted');
            aiMuteBtn.classList.add('muted');
            muteBtn.title = 'إلغاء تكتيم الإشعارات';
            aiMuteBtn.title = 'إلغاء تكتيم الإشعارات';
        } else {
            muteIcon.className = 'fas fa-volume-up';
            aiMuteIcon.className = 'fas fa-volume-up';
            muteBtn.classList.remove('muted');
            aiMuteBtn.classList.remove('muted');
            muteBtn.title = 'تكتيم الإشعارات';
            aiMuteBtn.title = 'تكتيم الإشعارات';
        }
    }
    
    // إرسال رسالة
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;
        
        // إضافة الرسالة إلى الدردشة
        addMessage('أنت', 'G', '#92c87b', message, true);
        
        // محو حقل الإدخال
        chatInput.value = '';
        
        // محاكاة رد من مستخدم آخر
        simulateResponse();
    }
    
    // إرسال رسالة للذكاء الاصطناعي
    async function sendAiMessage() {
        const message = aiInput.value.trim();
        if (message === '') return;
        
        // إضافة الرسالة إلى الدردشة
        addAiMessage('أنت', 'G', '#92c87b', message, true);
        
        // محو حقل الإدخال
        aiInput.value = '';
        
        // إظهار مؤشر الكتابة فوراً
        aiTypingIndicator.classList.add('active');
        aiArea.scrollTop = aiArea.scrollHeight;
        
        // إرسال إلى خدمة الذكاء الاصطناعي (عبر وكيل آمن)
        try {
            if (!AI_PROXY_URL) {
                throw new Error('AI proxy URL is not configured');
            }
            const response = await sendToAiProxy(message);
            aiTypingIndicator.classList.remove('active');
            addAiMessage("Gemini", "ذ", "#7e57c2", response, false);
        } catch (error) {
            aiTypingIndicator.classList.remove('active');
            const fallbackMsg = AI_PROXY_URL
                ? "عذراً، حدث خطأ في الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة لاحقاً."
                : "خدمة الذكاء الاصطناعي غير مفعلة حالياً. يرجى تفعيل الوكيل الآمن (AI Proxy).";
            addAiMessage("Gemini", "ذ", "#7e57c2", fallbackMsg, false);
            console.error("خطأ في Gemini API:", error);
        }
    }
    
    // دالة إرسال الرسالة إلى الوكيل الآمن للذكاء الاصطناعي
    async function sendToAiProxy(message) {
        const payload = {
            contents: [
                {
                    parts: [
                        { text: message }
                    ]
                }
            ]
        };
        
        const response = await fetch(AI_PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        // توقّع واجهة مبسطة من الوكيل { text: string } أو واجهة Google الأصلية
        if (data && typeof data.text === 'string') return data.text;
        if (data && data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        }
        throw new Error('لم يتم العثور على رد صالح من خدمة الذكاء الاصطناعي');
    }
    
    // إضافة رسالة إلى الدردشة
    function addMessage(sender, avatarChar, avatarColor, text, isOutgoing = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.classList.add(isOutgoing ? 'message-outgoing' : 'message-incoming');
        
        const now = new Date();
        const timeString = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
        
        messageElement.innerHTML = `
            <div class="user-avatar" style="background-color: ${avatarColor};">${avatarChar}</div>
            <div class="message-content">
                <div class="message-sender">${sender}</div>
                <div class="message-text">${text}</div>
                <div class="message-time">${timeString}</div>
            </div>
        `;
        
        chatArea.insertBefore(messageElement, typingIndicator);
        chatArea.scrollTop = chatArea.scrollHeight;
        
        // إذا كانت النافذة غير نشطة، إظهار إشعار
        if (!isChatOpen || isChatMinimized) {
            showNotification(sender, avatarChar, avatarColor, text);
        }
    }
    
    // إضافة رسالة إلى دردشة الذكاء الاصطناعي
    function addAiMessage(sender, avatarChar, avatarColor, text, isOutgoing = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('ai-message');
        messageElement.classList.add(isOutgoing ? 'message-outgoing' : 'message-incoming');
        
        const now = new Date();
        const timeString = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
        
        messageElement.innerHTML = `
            <div class="ai-avatar" style="background-color: ${isOutgoing ? avatarColor : '#7e57c2'};">${isOutgoing ? avatarChar : 'ذ'}</div>
            <div class="message-content">
                <div class="message-sender">${sender}</div>
                <div class="message-text">${text}</div>
                <div class="message-time">${timeString}</div>
            </div>
        `;
        
        aiArea.insertBefore(messageElement, aiTypingIndicator);
        aiArea.scrollTop = aiArea.scrollHeight;
    }
    
    // إظهار إشعار برسالة جديدة
    function showNotification(sender, avatarChar, avatarColor, text) {
        notificationCount++;
        notificationBadge.textContent = notificationCount;
        notificationBadge.style.display = 'flex';
        
        // تحديث محتوى الإشعار
        notificationAvatar.textContent = avatarChar;
        notificationAvatar.style.backgroundColor = avatarColor;
        notificationSender.textContent = sender;
        notificationText.textContent = text.length > 30 ? text.substring(0, 30) + '...' : text;
        
        // إظهار الإشعار
        messageNotification.classList.add('show');
        
        // تشغيل صوت التنبيه فقط إذا لم يكن مكتوماً
        if (!isSoundMuted) {
            playNotificationSound();
        }
        
        // إخفاء الإشعار تلقائياً بعد 5 ثوان
        setTimeout(() => {
            messageNotification.classList.remove('show');
        }, 5000);
    }
    
    // تشغيل صوت التنبيه
    function playNotificationSound() {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(e => {
            console.log("تعذر تشغيل الصوت: ", e);
        });
    }
    
    // إعادة تعيين الإشعارات
    function resetNotifications() {
        notificationCount = 0;
        notificationBadge.style.display = 'none';
        messageNotification.classList.remove('show');
    }
    
    // محاكاة رد من مستخدم آخر
    function simulateResponse() {
        // إظهار مؤشر الكتابة
        typingIndicator.classList.add('active');
        chatArea.scrollTop = chatArea.scrollHeight;
        
        // إجابة بعد فترة عشوائية
        const responses = [
            "أهلاً! كيف يمكنني مساعدتك؟",
            "شكراً على رسالتك",
            "هذا مثير للاهتمام",
            "أتفهم ما تقصده",
            "هل تحتاج إلى مساعدة إضافية؟",
            "رائع! هذا خبر سار",
            "شكراً للمشاركة",
            "أنا أستمع إليك"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        setTimeout(() => {
            typingIndicator.classList.remove('active');
            addMessage(randomUser.name, randomUser.avatar, randomUser.color, randomResponse, false);
        }, 2000 + Math.random() * 2000);
    }
    
    // فتح الدردشة بالنقر على الرأس
    chatHeader.addEventListener('click', function() {
        if (isChatMinimized) {
            openChat();
        }
    });
    
    // فتح الذكاء الاصطناعي بالنقر على الرأس
    aiHeader.addEventListener('click', function() {
        if (isAiMinimized) {
            openAi();
        }
    });
    
    // محاكاة رسائل واردة عشوائية
    setInterval(() => {
        if (Math.random() > 0.7 && !typingIndicator.classList.contains('active')) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const messages = [
                "مرحباً، هل من أحد هنا؟",
                "كيف حال الجميع؟",
                "هل يمكنني طرح سؤال؟",
                "أريد مشاركة فكرة معكم",
                "شكراً على هذه المنصة الرائعة",
                "هل هناك جديد اليوم؟",
                "أحتاج إلى مساعدة بخصوص...",
                "ما رأيكم في هذا الموضوع؟"
            ];
            
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            
            // إظهار مؤشر الكتابة أولاً
            typingIndicator.querySelector('span').textContent = `${randomUser.name} تكتب`;
            typingIndicator.classList.add('active');
            
            setTimeout(() => {
                typingIndicator.classList.remove('active');
                addMessage(randomUser.name, randomUser.avatar, randomUser.color, randomMessage, false);
            }, 1500 + Math.random() * 1500);
        }
    }, 10000);
});