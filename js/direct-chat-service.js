// Direct Chat Service (conversations + messages) - Supabase
(function(){
  'use strict';
  if (typeof window === 'undefined') return;
  if (typeof window.supabaseClient === 'undefined') {
    console.warn('direct-chat-service: supabaseClient is not available yet.');
  }

  const svc = {
    // Create or get existing direct conversation between current and target user
    async createOrGetDirectConversation(targetUserId){
      const me = window.authService?.getCurrentUser();
      if (!me?.id) throw new Error('not_logged_in');
      if (!targetUserId) throw new Error('missing_target');

      // Try find existing conversation by participants
      try {
        const { data: convs, error: findErr } = await supabaseClient
          .from('conversations')
          .select('id, type, conversation_participants(conversation_id, user_id)')
          .eq('type', 'direct');
        if (findErr) throw findErr;
        const found = (convs||[]).find(c => {
          const uids = (c.conversation_participants||[]).map(p=>p.user_id);
          return uids.length === 2 && uids.includes(me.id) && uids.includes(targetUserId);
        });
        if (found) return { success: true, conversationId: found.id };
      } catch (e) { console.warn('find direct conversation failed:', e?.message||e); }

      // Create new conversation
      const { data: conv, error: cErr } = await supabaseClient
        .from('conversations')
        .insert([{ type: 'direct', created_at: new Date().toISOString() }])
        .select('id')
        .single();
      if (cErr) return { success:false, error: cErr.message };

      const cid = conv.id;
      const participants = [me.id, targetUserId].map(uid => ({ conversation_id: cid, user_id: uid }));
      const { error: pErr } = await supabaseClient.from('conversation_participants').insert(participants);
      if (pErr) return { success:false, error: pErr.message };
      return { success:true, conversationId: cid };
    },

    async listConversations(){
      const me = window.authService?.getCurrentUser();
      if (!me?.id) throw new Error('not_logged_in');
      const { data, error } = await supabaseClient
        .from('conversation_participants')
        .select('conversation_id, conversations:id(type, created_at), users:user_id(id, username, full_name, role)')
        .eq('user_id', me.id)
        .order('conversation_id', { ascending: false });
      if (error) return { success:false, error: error.message };
      return { success:true, conversations: data || [] };
    },

    async listMessages(conversationId, limit=50){
      const { data, error } = await supabaseClient
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return { success:false, error: error.message };
      return { success:true, messages: (data||[]).slice().reverse() };
    },

    async sendMessage(conversationId, content){
      const me = window.authService?.getCurrentUser();
      if (!me?.id) throw new Error('not_logged_in');
      if (!content || !conversationId) return { success:false, error:'bad_input' };
      const { data, error } = await supabaseClient
        .from('messages')
        .insert([{ conversation_id: conversationId, sender_id: me.id, content, created_at: new Date().toISOString() }])
        .select('id, conversation_id, sender_id, content, created_at')
        .single();
      if (error) return { success:false, error: error.message };
      return { success:true, message: data };
    },
  };

  window.directChatService = svc;
})();
