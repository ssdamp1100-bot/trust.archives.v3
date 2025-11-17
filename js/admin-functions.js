// Admin Functions - وظائف صفحة المدير

// معالج التبويبات في قسم إدارة الدردشة
document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('#chatManagementSection .chat-mgmt-tabs [data-tab]');
    const panes = {
        group: document.getElementById('chatMgmtGroup'),
        direct: document.getElementById('chatMgmtDirect'),
        ai: document.getElementById('chatMgmtAi')
    };

    if (tabs.length > 0) {
        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const t = btn.getAttribute('data-tab');
                Object.keys(panes).forEach(k => {
                    if (panes[k]) {
                        panes[k].classList.toggle('hidden', k !== t);
                    }
                });
            });
        });
    }

    // زر رسالة مباشرة جديدة
    const newBtn = document.getElementById('newDirectMsgBtn');
    if (newBtn) {
        newBtn.addEventListener('click', async () => {
            try {
                const uname = prompt('ادخل اسم المستخدم لإرسال رسالة خاصة');
                if (!uname) return;

                if (!window.supabaseClient) {
                    alert('قاعدة البيانات غير متصلة');
                    return;
                }

                const { data, error } = await window.supabaseClient
                    .from('users')
                    .select('id, username, full_name, role')
                    .ilike('username', uname)
                    .limit(1)
                    .single();

                if (error || !data) {
                    alert('لم يتم العثور على المستخدم');
                    return;
                }

                if (window.openDirectChatByUser) {
                    window.openDirectChatByUser(data.id, data.full_name || data.username, data.role || 'member');
                }
            } catch (e) {
                console.error(e);
                alert('تعذر فتح المحادثة');
            }
        });
    }

    // زر الرسالة المباشرة السريع
    const dmQuick = document.getElementById('dmQuickBtn');
    if (dmQuick) {
        dmQuick.addEventListener('click', async () => {
            try {
                const uname = prompt('ادخل اسم المستخدم لفتح رسالة خاصة:');
                if (!uname) return;

                if (!window.supabaseClient) {
                    alert('قاعدة البيانات غير متصلة');
                    return;
                }

                const { data, error } = await window.supabaseClient
                    .from('users')
                    .select('id, username, full_name, role')
                    .ilike('username', uname)
                    .limit(1)
                    .single();

                if (error || !data) {
                    alert('لم يتم العثور على المستخدم');
                    return;
                }

                if (window.openDirectChatByUser) {
                    window.openDirectChatByUser(data.id, data.full_name || data.username, data.role || 'member');
                }
            } catch (e) {
                console.error(e);
                alert('تعذر فتح الرسالة الخاصة');
            }
        });
    }
});
