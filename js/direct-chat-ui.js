// Direct Chat UI - creates a dedicated DM window that reuses chat CSS classes
(function(){
  'use strict';
  if (typeof window === 'undefined') return;

  const state = {
    dmEl: null,
    headerTitleEl: null,
    areaEl: null,
    inputEl: null,
    sendBtnEl: null,
    conversationId: null,
    target: null,
  };

  function ensureWindow(){
    if (state.dmEl) return;
    const wrap = document.createElement('div');
    wrap.className = 'chat-window';
    wrap.id = 'dmWindow';
    wrap.style.right = '96px'; // offset from team chat
    wrap.style.display = 'none';
    wrap.innerHTML = `
      <div class="chat-header" id="dmHeader">
        <div class="chat-title">
          <span id="dmTitle">محادثة مباشرة</span>
          <span class="online-indicator"></span>
        </div>
        <div class="chat-controls">
          <button class="mute-btn" id="dmMuteBtn" title="تكتيم/إلغاء تكتيم الإشعارات">
            <i class="fas fa-volume-up"></i>
          </button>
          <button id="dmMinimizeBtn"><i class="fas fa-minus"></i></button>
          <button id="dmCloseBtn"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="chat-area" id="dmArea"></div>
      <div class="chat-input-area">
        <input type="text" class="chat-input" id="dmInput" placeholder="اكتب رسالتك هنا...">
        <button class="send-btn" id="dmSendBtn"><i class="fa fa-paper-plane-o" aria-hidden="true"></i></button>
      </div>`;
    document.body.appendChild(wrap);
    state.dmEl = wrap;
    state.headerTitleEl = wrap.querySelector('#dmTitle');
    state.areaEl = wrap.querySelector('#dmArea');
    state.inputEl = wrap.querySelector('#dmInput');
    state.sendBtnEl = wrap.querySelector('#dmSendBtn');
    // controls
    wrap.querySelector('#dmCloseBtn').addEventListener('click', ()=>{ wrap.style.display='none'; });
    wrap.querySelector('#dmMinimizeBtn').addEventListener('click', ()=>{ wrap.classList.toggle('minimized'); });
    state.sendBtnEl.addEventListener('click', onSend);
    state.inputEl.addEventListener('keypress', (e)=>{ if(e.key==='Enter') onSend(); });
  }

  function renderBadge(role){
    const isAdmin = String(role||'').toLowerCase()==='admin';
    const label = isAdmin ? 'مدير' : 'عضو';
    return `<span style="display:inline-block;margin-inline-start:8px;padding:2px 6px;border-radius:8px;font-size:12px;background:var(--secondary-color);color:#fff;">${label}</span>`;
  }

  function renderMessages(messages){
    state.areaEl.innerHTML='';
    messages.forEach(m => {
      const meId = window.authService?.getCurrentUserId();
      const mine = String(m.sender_id) === String(meId);
      const bubble = document.createElement('div');
      bubble.className = `message ${mine ? 'message-outgoing' : 'message-incoming'}`;
      bubble.innerHTML = `
        <div class="message-content">
          <div class="message-text">${escapeHtml(m.content || '')}</div>
          <div class="message-time">${new Date(m.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>`;
      state.areaEl.appendChild(bubble);
    });
    state.areaEl.scrollTop = state.areaEl.scrollHeight;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
  }

  async function loadAndRender(conversationId){
    const { success, messages, error } = await window.directChatService.listMessages(conversationId, 100);
    if (!success) { console.warn('listMessages failed:', error); return; }
    renderMessages(messages);
  }

  async function onSend(){
    const txt = (state.inputEl?.value||'').trim();
    if (!txt || !state.conversationId) return;
    const { success, message, error } = await window.directChatService.sendMessage(state.conversationId, txt);
    if (!success) { alert('تعذر إرسال الرسالة: ' + error); return; }
    state.inputEl.value='';
    // append to view
    renderMessages([...(state._lastMessages||[]), message]);
    state._lastMessages = [...(state._lastMessages||[]), message];
  }

  window.openDirectChatByUser = async function(targetUserId, displayName, role){
    try {
      ensureWindow();
      const { success, conversationId, error } = await window.directChatService.createOrGetDirectConversation(targetUserId);
      if (!success) throw new Error(error||'failed');
      state.conversationId = conversationId;
      state.target = { id: targetUserId, name: displayName, role };
      state.headerTitleEl.innerHTML = `${escapeHtml(displayName||'محادثة')} ${renderBadge(role)}`;
      state.dmEl.style.display = 'block';
      // load messages
      const res = await window.directChatService.listMessages(conversationId, 100);
      state._lastMessages = res.success ? res.messages : [];
      renderMessages(state._lastMessages);
      state.inputEl.focus();
    } catch (e){
      alert('تعذر فتح المحادثة: ' + (e?.message||e));
    }
  }
})();
