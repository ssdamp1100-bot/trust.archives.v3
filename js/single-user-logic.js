// Single User Page Logic
(function(){
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // Require login
      if (!window.authService || !window.authService.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
      }
      // Require admin role
      const me = window.authService.getCurrentUser();
      if (!me || me.role !== 'admin') {
        alert('ليس لديك صلاحية للوصول إلى هذه الصفحة');
        window.location.href = 'dashboard.html';
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const userId = params.get('id');
      if (!userId) {
        alert('لا يوجد معرف مستخدم في الرابط');
        window.location.href = 'admin.html';
        return;
      }

      // Store user data for reuse
      let currentUserData = null;

      // Load user info
      currentUserData = await loadUser(userId);
      // Wire buttons
      wireActions(userId, currentUserData);
      // Prepare task modal
      initTaskModal(userId);
      // Ask for notification permission for chat
      if (window.chatService) {
        window.chatService.requestNotificationPermission();
      }
    } catch (e) {
      console.error('single-user init error:', e);
    }
  });

  async function loadUser(userId){
    try {
      const { data: user, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;

      // Fill header
      const name = user.full_name && user.full_name.trim() ? user.full_name : (user.username || 'مستخدم');
      setText('userDisplayName', `${name}`);
      // Avatar placeholder (if profile_image_url exists use it)
      const avatar = document.getElementById('userAvatar');
      if (avatar) {
        const img = user.profile_image_url || 'img/user.png';
        avatar.src = img;
      }

      // Stats - Load points from notes table
      const userPoints = await getUserPoints(userId);
      setText('userPoints', String(userPoints));
      // Products count by this user
      try {
        const { count } = await supabaseClient
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        setText('userProductsCount', String(count || 0));
      } catch { setText('userProductsCount', '0'); }

      // Last seen (fallback to created_at)
      const lastSeen = user.last_seen_at || user.updated_at || user.created_at;
      setText('userLastSeen', lastSeen ? new Date(lastSeen).toLocaleString('en-GB') : 'N/A');

      // Basic info
      setText('fullName', name);
      setText('country', user.country || '');
      setText('age', user.age ? `${user.age}` : '');
      setText('address', user.address || '');
      setText('username', user.username ? `@${user.username}` : '');
      setText('password', '••••••••');
      setText('joinedAt', user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '');

      // Contact
      setText('phone', user.phone || '');
      setText('email', user.email || '');
      setText('whatsapp', user.whatsapp || user.phone || '');
      setText('notes', user.notes || '');

      // Wire contact buttons
      const callBtn = byId('callBtn');
      if (callBtn && user.phone) callBtn.onclick = () => window.open(`tel:${user.phone}`, '_self');
      const emailBtn = byId('emailBtn');
      if (emailBtn && user.email) emailBtn.onclick = () => window.open(`mailto:${user.email}`, '_self');
      const whatsappBtn = byId('whatsappBtn');
      if (whatsappBtn && (user.whatsapp || user.phone)) {
        const w = (user.whatsapp || user.phone).replace(/[^0-9+]/g,'');
        whatsappBtn.onclick = () => window.open(`https://wa.me/${w.replace('+','')}`, '_blank');
      }

      // --- Update Button States based on loaded user data ---
      const isHonored = await checkHonorStatus(userId);
      updateButtonStates(user, isHonored);

      return user; // Return user data
    } catch (e) {
      console.error('loadUser error:', e);
      alert('تعذر تحميل بيانات المستخدم');
      return null;
    }
  }

  function wireActions(userId, user){
    const editBtn = byId('editUserBtn');
    if (editBtn) editBtn.onclick = () => window.location.href = `add-new-user.html?edit=${userId}`;

    const freezeBtn = byId('freezeUserBtn');
    if (freezeBtn) freezeBtn.onclick = () => toggleFreeze(userId, user);

    const deleteBtn = byId('deleteUserBtn');
    if (deleteBtn) deleteBtn.onclick = async () => {
      if (!confirm('سيتم حذف المستخدم نهائياً، هل أنت متأكد؟')) return;
      try {
        const { error } = await supabaseClient.from('users').delete().eq('id', userId);
        if (error) throw error;
        alert('تم حذف المستخدم');
        window.location.href = 'admin.html';
      } catch (e) { alert('تعذر حذف المستخدم: ' + e.message); }
    };

    const honorBtn = byId('honorUserBtn');
    if (honorBtn) honorBtn.onclick = () => toggleHonor(userId, user);

    const givePointBtn = byId('givePointBtn');
    if (givePointBtn) givePointBtn.onclick = () => givePoint(userId, user);

    const managePointsBtn = byId('managePointsBtn');
    if (managePointsBtn) managePointsBtn.onclick = () => openPointsModal(userId);
  }

  function updateButtonStates(user, isHonored) {
    const freezeBtn = byId('freezeUserBtn');
    const honorBtn = byId('honorUserBtn');

    if (freezeBtn && user) {
        if (user.status === 'frozen') {
            freezeBtn.innerHTML = '<i class="fas fa-lock-open"></i> فك التجميد';
            freezeBtn.classList.remove('btn-secondary');
            freezeBtn.classList.add('btn-success');
        } else {
            freezeBtn.innerHTML = '<i class="fas fa-lock"></i> تجميد العضوية';
            freezeBtn.classList.remove('btn-success');
            freezeBtn.classList.add('btn-secondary');
        }
    }

    if (honorBtn) {
        if (isHonored) {
            honorBtn.innerHTML = '<i class="fas fa-undo"></i> التراجع عن التكريم';
            honorBtn.classList.remove('btn-hounr');
            honorBtn.classList.add('btn-warning');
        } else {
            honorBtn.innerHTML = '<i class="fas fa-award"></i> تكريم المستخدم';
            honorBtn.classList.remove('btn-warning');
            honorBtn.classList.add('btn-hounr');
        }
    }
  }

  function initTaskModal(userId){
    const modal = byId('taskModal');
    const openBtn = byId('sendTaskBtn');
    const closeBtn = byId('taskCloseBtn');
    const cancelBtn = byId('cancelTaskBtn');
    const confirmBtn = byId('confirmSendTaskBtn');

    const open = ()=>{ if (modal){ modal.style.display='flex'; modal.setAttribute('aria-hidden','false'); }};
    const close = ()=>{ if (modal){ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); }};

    if (openBtn) openBtn.onclick = open;
    if (closeBtn) closeBtn.onclick = close;
    if (cancelBtn) cancelBtn.onclick = close;

    window.addEventListener('click', (e)=>{ if (e.target === modal) close(); });

    if (confirmBtn) confirmBtn.onclick = async () => {
      const title = (byId('taskTitle')?.value || '').trim();
      const desc = (byId('taskDescription')?.value || '').trim();
      const deadline = (byId('taskDeadline')?.value || '').trim();
      
      if (!title && !desc) return alert('اكتب عنواناً أو وصفاً للمهمة');
      
      // Show loading
      const originalText = confirmBtn.textContent;
      confirmBtn.textContent = 'جاري الإرسال...';
      confirmBtn.disabled = true;
      
      try {
        const admin = window.authService.getCurrentUser();
        console.log('Sending task - Admin:', admin, 'UserId:', userId);
        
        const payload = {
          title: title || 'مهمة جديدة',
          content: desc || 'مهمة من الإدارة',
          category: 'task',
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Add deadline to content if provided
        if (deadline) {
          payload.content = JSON.stringify({ 
            description: desc || 'مهمة من الإدارة', 
            deadline: deadline 
          });
        }
        
        console.log('Task payload:', payload);
        
        const { data, error } = await supabaseClient.from('notes').insert([payload]).select();
        
        if (error) {
          console.error('Database error:', error);
          throw error;
        }
        
        console.log('Task sent successfully:', data);
        alert('✅ تم إرسال المهمة بنجاح وستظهر في إشعارات المستخدم');
        close();
        
        // Clear inputs
        if (byId('taskTitle')) byId('taskTitle').value = '';
        if (byId('taskDescription')) byId('taskDescription').value = '';
        if (byId('taskDeadline')) byId('taskDeadline').value = '';
        
      } catch (e) {
        console.error('Error sending task:', e);
        alert('❌ تعذر إرسال المهمة: ' + e.message);
      } finally {
        // Reset button
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
      }
    };
  }

  async function toggleFreeze(userId, user) {
      if (!user) return alert('بيانات المستخدم غير متوفرة.');
      const isCurrentlyFrozen = user.status === 'frozen';
      const newStatus = isCurrentlyFrozen ? 'active' : 'frozen';
      const actionText = isCurrentlyFrozen ? 'فك تجميد' : 'تجميد';

      if (!confirm(`هل أنت متأكد من ${actionText} عضوية هذا المستخدم؟`)) return;

      try {
          const { data, error } = await supabaseClient.from('users').update({ status: newStatus }).eq('id', userId).select().single();
          if (error) throw error;
          alert(`تم ${actionText} العضوية`);
          // Update state and UI
          user.status = newStatus;
          updateButtonStates(user, await checkHonorStatus(userId));
      } catch (e) {
          alert(`فشل ${actionText} العضوية: ` + e.message);
      }
  }

  async function toggleHonor(userId, user) {
      if (!user) return alert('بيانات المستخدم غير متوفرة.');
      const isHonored = await checkHonorStatus(userId);

      if (isHonored) {
          // Revoke honor
          if (!confirm('هل أنت متأكد من التراجع عن تكريم هذا المستخدم؟')) return;
          try {
              const { error } = await supabaseClient.from('notes').delete().eq('user_id', userId).eq('category', 'honor');
              if (error) throw error;
              alert('تم التراجع عن التكريم');
              updateButtonStates(user, false);
          } catch (e) {
              alert('فشل التراجع عن التكريم: ' + e.message);
          }
      } else {
          // Grant honor
          await honorUser(userId, user);
      }
  }

  async function checkHonorStatus(userId) {
      try {
          const { data, error } = await supabaseClient.from('notes').select('id').eq('user_id', userId).eq('category', 'honor').limit(1);
          if (error) throw error;
          return data && data.length > 0;
      } catch (e) {
          console.error('checkHonorStatus error:', e);
          return false;
      }
  }

  async function honorUser(userId, user){
    if (!confirm('هل أنت متأكد من تكريم المستخدم؟')) return;
    try {
      const now = new Date();
      const { error } = await supabaseClient.from('notes').insert([{ 
        title: 'honor', content: `honor:${userId}`, category: 'honor', user_id: userId, created_at: now.toISOString(), updated_at: now.toISOString()
      }]);
      if (error) throw error;
       alert('تم إضافة تكريم لهذا المستخدم');
       updateButtonStates(user, true);
    } catch (e) { alert('تعذر تنفيذ التكريم: ' + e.message); }
  }

  // Get user points from notes table
  async function getUserPoints(userId) {
    try {
      const { data, error } = await supabaseClient
        .from('notes')
        .select('id')
        .eq('user_id', userId)
        .eq('category', 'point');
      
      if (error) throw error;
      return data ? data.length : 0;
    } catch (e) {
      console.error('Error getting user points:', e);
      return 0;
    }
  }

  async function givePoint(userId, user) {
    if (!confirm('هل أنت متأكد من منح نقطة لهذا المستخدم؟')) return;
    
    try {
      // Get current points
      const currentPoints = await getUserPoints(userId);
      const newPoints = currentPoints + 1;
      
      console.log('Giving point - Current:', currentPoints, 'New:', newPoints, 'UserId:', userId);
      
      // Add a point record in notes table
      const now = new Date();
      const { error } = await supabaseClient
        .from('notes')
        .insert([{ 
          title: 'point',
          content: `point:${userId}:${now.getTime()}`,
          category: 'point',
          user_id: userId,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        }]);
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Point added successfully');
      
      // Update UI to show new points
      setText('userPoints', String(newPoints));
      
      alert(`✅ تم منح نقطة للمستخدم!\nالنقاط الحالية: ${newPoints}`);
      
    } catch (e) {
      console.error('Error in givePoint:', e);
      alert('فشل في منح النقطة: ' + e.message);
    }
  }

  // Points Management Modal
  async function openPointsModal(userId) {
    const modal = byId('pointsModal');
    if (!modal) return;
    
    // Load current points
    const currentPoints = await getUserPoints(userId);
    setText('currentPointsDisplay', String(currentPoints));
    
    // Show modal
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    
    // Setup modal handlers
    initPointsModal(userId);
  }

  function initPointsModal(userId) {
    const modal = byId('pointsModal');
    const closeBtn = byId('pointsCloseBtn');
    const cancelBtn = byId('cancelPointsBtn');
    const confirmBtn = byId('confirmPointsBtn');
    const actionSelect = byId('pointsAction');
    const deductGroup = byId('deductAmountGroup');
    const deductInput = byId('deductAmount');

    const closeModal = () => {
      if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        // Reset form
        if (actionSelect) actionSelect.value = '';
        if (deductInput) deductInput.value = '';
        if (deductGroup) deductGroup.style.display = 'none';
      }
    };

    // Close handlers
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;
    
    // Action change handler
    if (actionSelect) {
      actionSelect.onchange = () => {
        if (deductGroup) {
          deductGroup.style.display = actionSelect.value === 'deduct' ? 'block' : 'none';
        }
      };
    }

    // Confirm handler
    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        const action = actionSelect?.value;
        if (!action) return alert('يرجى اختيار إجراء');

        try {
          if (action === 'reset') {
            await resetUserPoints(userId);
            alert('✅ تم تصفير جميع النقاط');
          } else if (action === 'deduct') {
            const amount = parseInt(deductInput?.value || '0');
            if (amount <= 0) return alert('يرجى إدخال عدد صحيح من النقاط');
            await deductUserPoints(userId, amount);
            alert(`✅ تم خصم ${amount} نقطة`);
          }
          
          // Update UI and close modal
          const newPoints = await getUserPoints(userId);
          setText('userPoints', String(newPoints));
          setText('currentPointsDisplay', String(newPoints));
          closeModal();
          
        } catch (e) {
          alert('فشل في تنفيذ الإجراء: ' + e.message);
        }
      };
    }

    // Close on outside click
    window.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Reset all user points
  async function resetUserPoints(userId) {
    if (!confirm('هل أنت متأكد من تصفير جميع النقاط؟ هذا الإجراء لا يمكن التراجع عنه!')) return;
    
    try {
      const { error } = await supabaseClient
        .from('notes')
        .delete()
        .eq('user_id', userId)
        .eq('category', 'point');
      
      if (error) throw error;
      console.log('All points reset successfully');
    } catch (e) {
      console.error('Error resetting points:', e);
      throw e;
    }
  }

  // Deduct specific amount of points
  async function deductUserPoints(userId, amount) {
    const currentPoints = await getUserPoints(userId);
    
    if (amount > currentPoints) {
      throw new Error(`لا يمكن خصم ${amount} نقطة. النقاط الحالية: ${currentPoints}`);
    }
    
    if (!confirm(`هل أنت متأكد من خصم ${amount} نقطة؟`)) return;
    
    try {
      // Get point records to delete (oldest first)
      const { data: pointRecords, error: fetchError } = await supabaseClient
        .from('notes')
        .select('id')
        .eq('user_id', userId)
        .eq('category', 'point')
        .order('created_at', { ascending: true })
        .limit(amount);
      
      if (fetchError) throw fetchError;
      
      if (!pointRecords || pointRecords.length === 0) {
        throw new Error('لا توجد نقاط للخصم');
      }
      
      // Delete the specified number of point records
      const idsToDelete = pointRecords.map(record => record.id);
      const { error: deleteError } = await supabaseClient
        .from('notes')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) throw deleteError;
      
      console.log(`Successfully deducted ${amount} points`);
    } catch (e) {
      console.error('Error deducting points:', e);
      throw e;
    }
  }

  function byId(id){ return document.getElementById(id); }
  function setText(id, text){ const el = byId(id); if (el) el.textContent = text; }
})();
