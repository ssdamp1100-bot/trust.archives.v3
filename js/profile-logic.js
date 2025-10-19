document.addEventListener('DOMContentLoaded', async () => {
    // Page protection
    if (!window.authService.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    // --- Task actions: update status in notes table and notify admin ---
    async function updateTaskStatusNote(taskId, updater) {
        try {
            // Fetch existing content
            const { data, error } = await supabaseClient
                .from('notes')
                .select('content')
                .eq('id', taskId)
                .eq('category', 'task')
                .single();
            if (error) throw error;
            let payload = {};
            try { payload = JSON.parse(data?.content || '{}'); } catch { payload = {}; }
            const next = updater(payload || {});
            const { error: uErr } = await supabaseClient
                .from('notes')
                .update({ content: JSON.stringify(next), updated_at: new Date().toISOString() })
                .eq('id', taskId)
                .eq('category', 'task');
            if (uErr) throw uErr;
            return true;
        } catch (e) {
            alert('تعذر تحديث حالة المهمة: ' + e.message);
            return false;
        }
    }

    window.StartTask = async function(btn){
        const item = btn.closest('.admin-task-item');
        const taskId = item?.dataset?.taskId;
        if (!taskId) return;
        const ok = await updateTaskStatusNote(taskId, (p)=> ({ ...p, status: 'in_progress' }));
        if (ok) {
            item.classList.add('in-progress');
            item.classList.remove('done');
            btn.disabled = true;
            btn.textContent = 'قيد التنفيذ';
            btn.style.opacity = '0.6';
        }
    }

    window.TasxDone = async function(btn){
        const item = btn.closest('.admin-task-item');
        const taskId = item?.dataset?.taskId;
        if (!taskId) return;
        if (!confirm('التأكيد على إتمام هذه المهمة؟')) return;
        const ok = await updateTaskStatusNote(taskId, (p)=> ({ ...p, status: 'done' }));
        if (ok) {
            // Notify admin via a task_notify note
            try {
                const currentUser = window.authService.getCurrentUser();
                await supabaseClient.from('notes').insert([{
                    title: 'task_done',
                    content: JSON.stringify({ message: 'قام العضو بإنهاء مهمة.' }),
                    category: 'task_notify',
                    user_id: currentUser.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);
            } catch (e) { console.warn('task_notify insert failed:', e?.message || e); }

            item.classList.add('done');
            item.classList.remove('in-progress');
            const actions = item.querySelector('.task-actions');
            if (actions) actions.style.display = 'none';
            alert('تم تعليم المهمة كمُنجزة وتم إشعار الإدارة.');
        }
    }

    const currentUser = window.authService.getCurrentUser();
    const userId = currentUser.id;
    let userProducts = [];

    // 1. Populate User Info
    function populateUserInfo() {
        const profileAvatar = document.querySelector('.profile-avatar');
        const profileName = document.querySelector('.profile-user-details h2');

        if (profileAvatar) {
            profileAvatar.src = currentUser.profile_image_url || 'img/sadeq.jpg'; // Fallback image
        }
        if (profileName) {
            profileName.innerHTML = `<i class="fa-solid fa-user"></i> ${currentUser.full_name || currentUser.username}`;
        }
    }

    // 2. Fetch User Stats
    async function fetchUserStats() {
        const productsStat = document.querySelector('.stat-item:nth-child(2) .stat-value');
        const tasksStat = document.querySelector('.stat-item:nth-child(3) .stat-value');
        const pointsStat = document.querySelector('.stat-item:nth-child(4) .stat-value');

        try {
            // Fetch products count
            const { count: productsCount, error: productsError } = await supabaseClient
                .from('products')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (productsError) throw productsError;
            if (productsStat) productsStat.textContent = productsCount;

            // Fetch tasks count from notes table where category = 'task'
            const { count: tasksCount, error: tasksError } = await supabaseClient
                .from('notes')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('category', 'task');

            if (tasksError) throw tasksError;
            if (tasksStat) tasksStat.textContent = tasksCount;

        // Fetch user points count from notes where category = 'point'
        try {
            const { count: pointsCount, error: pointsError } = await supabaseClient
                .from('notes')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('category', 'point');
            if (pointsError) throw pointsError;
            if (pointsStat) pointsStat.textContent = pointsCount;
        } catch (e) {
            if (pointsStat) pointsStat.textContent = '0';
        }

        } catch (error) {
            console.error('Error fetching user stats:', error);
        }
    }

    // 3. Fetch and Render User's Products
    function normalizeImageUrl(u){
        if(!u) return null;
        if(/^https?:\/\//i.test(u)) return u;
        try{ const { data } = supabaseClient.storage.from('product-images').getPublicUrl(u); return data?.publicUrl || u; }catch{return u;}
    }

    function renderUserProducts(list){
        const grid = document.getElementById('productsGrid');
        if(!grid) return;
        grid.innerHTML = '';
        if(!list || list.length === 0){
            grid.innerHTML = '<p>لا توجد منتجات مطابقة.</p>';
            return;
        }
        list.forEach(product => {
            const imgs = Array.isArray(product.product_images) ? product.product_images : [];
            const primary = imgs.find(i=>i.is_primary)?.image_url || imgs[0]?.image_url || 'https://via.placeholder.com/400x200/1a1a2e/ffffff?text=صورة+المنتج';
            const primaryUrl = normalizeImageUrl(primary);
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.id = product.id;
            card.dataset.category = product.categories?.name || '';
            card.innerHTML = `
                <div class="product-image-container">
                    <div class="product-meta-overlay">
                        <span class="product-category"><i class="fa-solid fa-layer-group"></i> ${product.categories?.name || 'N/A'}</span>
                        <span class="product-serial">SN: ${product.code || 'N/A'}</span>
                    </div>
                    <div class="product-image">
                        <img src="${primaryUrl}" alt="${product.name}">
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-meta-overlay2">
                        <span class="product-category2">${product.categories?.name || 'N/A'}</span>
                        <span class="product-serial2">SN: ${product.code || 'N/A'}</span>
                    </div>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-prices">
                        <div class="price-item">
                            <span class="price-amount">$${product.selling_price || 0}</span>
                        </div>
                    </div>
                    <div class="product-actions">
                        <button class="product-button" onclick="window.location.href='product.html?id=${product.id}'">عرض</button>
                        <button class="product-button secondary" onclick="window.location.href='add-product.html?edit=${product.id}'">تعديل</button>
                        <button class="product-button thirdlly" onclick="deleteUserProduct('${product.id}')">حذف</button>
                    </div>
                </div>`;
            grid.appendChild(card);
        });
    }

    function applyUserProductFilters(){
        const term = (document.getElementById('searchProducts')?.value || '').toLowerCase();
        const category = document.getElementById('categoryFilter')?.value || '';
        const sort = document.getElementById('sortFilter')?.value || 'date';
        let list = [...userProducts];
        if(term){
            list = list.filter(p => (p.name||'').toLowerCase().includes(term) || (p.description||'').toLowerCase().includes(term));
        }
        if(category){ list = list.filter(p => p.categories?.name === category); }
        if(sort === 'name'){ list.sort((a,b)=> (a.name||'').localeCompare(b.name||'')); }
        else { list.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at)); }
        renderUserProducts(list);
    }

    async function fetchUserProducts(){
        const { success, products, error } = await window.productsService.getProducts();
        if(success && Array.isArray(products)){
            userProducts = products.filter(p => String(p.users?.username||'') === String(currentUser.username));
            // Populate categories filter
            const catSel = document.getElementById('categoryFilter');
            if(catSel){
                const cats = [...new Set(userProducts.map(p=>p.categories?.name).filter(Boolean))];
                catSel.innerHTML = '<option value="">جميع الفئات</option>' + cats.map(c=>`<option value="${c}">${c}</option>`).join('');
            }
            applyUserProductFilters();
        }else{
            console.error('Failed to load user products:', error);
        }
    }

    // Function to delete a product
    window.deleteUserProduct = async (productId) => {
        if (confirm('هل أنت متأكد من رغبتك في حذف هذا المنتج؟')) {
            const result = await window.productsService.deleteProduct(productId);
            if (result.success) {
                alert('تم حذف المنتج بنجاح.');
                fetchUserProducts(); // Refresh the list
            } else {
                alert(`فشل حذف المنتج: ${result.error}`);
            }
        }
    }

    // Bind product filters and view
    const searchEl = document.getElementById('searchProducts');
    const catEl = document.getElementById('categoryFilter');
    const sortEl = document.getElementById('sortFilter');
    [searchEl, catEl, sortEl].forEach(el=> el && el.addEventListener('input', applyUserProductFilters));

    // Fetch and render user suppliers
    let userSuppliers = [];

    function normalizeSupplierImageUrl(u){
        if(!u) return 'img/company-1.jpg';
        if(/^https?:\/\//i.test(u)) return u;
        try{ const { data } = supabaseClient.storage.from('supplier-images').getPublicUrl(u); return data?.publicUrl || u; }catch{return u;}
    }

    function renderUserSuppliers(list){
        const grid = document.getElementById('suppliersGrid');
        if(!grid) return;
        grid.innerHTML = '';
        if(!list || list.length === 0){
            grid.innerHTML = '<p style="text-align:center;padding:40px;color:(var--text3-color);">لا يوجد موردين </p>';
            return;
        }
        list.forEach(supplier => {
            const logoUrl = normalizeSupplierImageUrl(supplier.logo_url);
            const card = document.createElement('div');
            card.className = 'supplier-card';
            card.dataset.supplierId = supplier.id;
            card.dataset.country = supplier.country || '';
            card.dataset.industry = supplier.industry || '';
            card.innerHTML = `
                <div class="supplier-card-header">
                    <img src="${logoUrl}" alt="supplier-logo" class="supplier-logo" onerror="this.src='img/company-1.jpg'">
                    <div class="supplier-details-info">
                        <h3 class="supplier-name">${supplier.name}</h3>
                        <div class="supplier-tags">
                            <span class="tag" id="supplier-country"><i class="fa-solid fa-flag"></i> ${supplier.country || 'غير محدد'}</span>
                            <span class="tag" id="supplier-category"><i class="fa-solid fa-layer-group"></i> ${supplier.industry || 'غير محدد'}</span>
                        </div>
                    </div>
                    <div class="supplier-status-enable"></div>
                </div>
                <p class="supplier-description">${supplier.description || 'لا يوجد وصف'}</p>
                <div style="display:flex;gap:8px;margin-top:10px;">
                    <button onclick="window.location.href='single-supplier.html?id=${supplier.id}'" class="supplier-button" style="flex:1;">
                        <i class="fa fa-address-card-o" aria-hidden="true"></i> معلومات المورد
                    </button>
                    <button onclick="deleteUserSupplier('${supplier.id}')" class="supplier-button3"  >
                        <i class="fas fa-trash"></i>حذف
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function applySupplierFilters(){
        const term = (document.getElementById('searchInput')?.value||'').toLowerCase();
        const country = document.getElementById('countryFilter')?.value || '';
        const industry = document.getElementById('industryFilter')?.value || '';
        let list = [...userSuppliers];
        if(term){
            list = list.filter(s => (s.name||'').toLowerCase().includes(term) || (s.description||'').toLowerCase().includes(term));
        }
        if(country){ list = list.filter(s => s.country === country); }
        if(industry){ list = list.filter(s => s.industry === industry); }
        renderUserSuppliers(list);
    }

    async function fetchUserSuppliers(){
        const { success, suppliers, error } = await window.suppliersService.getSuppliers();
        if(success && Array.isArray(suppliers)){
            userSuppliers = suppliers.filter(s => String(s.user_id||'') === String(userId));
            renderUserSuppliers(userSuppliers);
        }else{
            console.error('Failed to load user suppliers:', error);
        }
    }

    window.deleteUserSupplier = async (supplierId) => {
        if (confirm('هل أنت متأكد من رغبتك في حذف هذا المورد؟')) {
            const result = await window.suppliersService.deleteSupplier(supplierId);
            if (result.success) {
                alert('تم حذف المورد بنجاح.');
                fetchUserSuppliers();
            } else {
                alert(`فشل حذف المورد: ${result.error}`);
            }
        }
    }

    const supSearch = document.getElementById('searchInput');
    const countryFilter = document.getElementById('countryFilter');
    const industryFilter = document.getElementById('industryFilter');
    [supSearch, countryFilter, industryFilter].forEach(el=> el && el.addEventListener('input', applySupplierFilters));

    // Expose UI helpers required by HTML
    window.showSection = function(section){
        const idMap = {
            products: 'products-section',
            suppliers: 'suppliers-section',
            tasks: 'tasks-section',
            notes: 'notes-section',
            account: 'account-section'
        };
        document.querySelectorAll('.section').forEach(s=> s.classList.remove('active'));
        const targetId = idMap[section];
        if(targetId){ document.getElementById(targetId)?.classList.add('active'); }
        document.querySelectorAll('.row-nav .nav-btn').forEach(b=> b.classList.remove('active'));
        // naive: activate first matched button
        const btns = Array.from(document.querySelectorAll('.row-nav .nav-btn'));
        const idx = ['products','suppliers','tasks','notes','account'].indexOf(section);
        if(idx>=0 && btns[idx]) btns[idx].classList.add('active');
    }

    window.changeViewMode = function(mode){
        const grid = document.getElementById('productsGrid');
        if(!grid) return;
        grid.classList.remove('grid','compact-grid','list','small-list');
        grid.classList.add(mode);
    }

    window.clearFilters = function(){
        const s = document.getElementById('searchProducts');
        const c = document.getElementById('categoryFilter');
        const so = document.getElementById('sortFilter');
        if(s) s.value=''; if(c) c.value=''; if(so) so.value='date';
        applyUserProductFilters();
    }

    window.clearSupplierFilters = function(){
        const si = document.getElementById('searchInput');
        const c = document.getElementById('countryFilter');
        const i = document.getElementById('industryFilter');
        if(si) si.value=''; if(c) c.value=''; if(i) i.value='';
        // reset all cards
        document.querySelectorAll('#suppliersGrid .supplier-card').forEach(card => card.style.display='');
    }

    // View toggle buttons for suppliers
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    function setSuppliersView(list){
        const grid = document.getElementById('suppliersGrid');
        if(!grid) return;
        grid.classList.toggle('list-view', !!list);
        gridBtn?.classList.toggle('active', !list);
        listBtn?.classList.toggle('active', !!list);
    }
    gridBtn?.addEventListener('click', ()=> setSuppliersView(false));
    listBtn?.addEventListener('click', ()=> setSuppliersView(true));

    // Admin Tasks actions
    window.startAdminTask = function(btn){ 
        const item = btn.closest('.admin-task-item');
        if(item){
            item.classList.add('in-progress');
            item.classList.remove('done');
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
    }
    window.askAdminAboutTask = function(btn){ 
        const taskName = btn.closest('.admin-task-item')?.querySelector('.task-name')?.textContent || 'المهمة';
        alert(`تم إرسال استفسارك للإدارة بخصوص: ${taskName}`);
    }
    // HTML compatibility: older markup calls AskAdminAboutTask
    window.AskAdminAboutTask = window.askAdminAboutTask;
    window.completeAdminTask = function(btn){ 
        const item = btn.closest('.admin-task-item');
        if(item && confirm('هل أنت متأكد من إتمام هذه المهمة؟')){
            item.classList.add('done');
            item.classList.remove('in-progress');
            const actions = item.querySelector('.task-actions');
            if(actions) actions.style.display = 'none';
        }
    }

    // Personal Todos persisted in 'tasks' table
    function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

    async function loadPersonalTodos(){
        const list = document.getElementById('todoList');
        if(!list || !window.tasksService) return;
        // Clear any demo/static items
        list.innerHTML = '';
        const { success, tasks, error } = await window.tasksService.getTasks();
        if(!success){ console.warn('failed to load todos:', error); return; }
        (tasks||[]).forEach(t => list.appendChild(createTodoLi(t)));
    }

    function createTodoLi(task){
        const li = document.createElement('li');
        li.className = 'todo-item' + (task.status === 'completed' ? ' done' : '');
        li.dataset.taskId = task.id;
        li.innerHTML = `
            <button class="todo-checkbox" onclick="toggleTodoCheck(this, event)"><i class="${task.status === 'completed' ? 'fas fa-check-square' : 'far fa-square'}"></i></button>
            <span>${escapeHtml(String(task.title||'مهمة'))}</span>
            <button class="remove-todo-btn" onclick="removeTodoItem(this, event)"><i class="fas fa-trash"></i></button>
        `;
        return li;
    }

    window.addTodoItem = async function(){
        const input = document.querySelector('.todo-input');
        const list = document.getElementById('todoList');
        const text = (input?.value||'').trim(); 
        if(!text || !list) return;
        try{
            const { success, task, error } = await window.tasksService.createTask({ title: text, description: '', status: 'pending', priority: 'normal' });
            if(!success){ alert('فشل حفظ المهمة: ' + (error||'')); return; }
            const li = createTodoLi(task);
            list.prepend(li);
            input.value='';
        }catch(e){ alert('تعذر إنشاء المهمة'); }
    }
    window.toggleTodoCheck = async function(btn, event){
        event?.stopPropagation();
        const icon = btn.querySelector('i');
        const li = btn.closest('.todo-item');
        if(!icon || !li) return;
        const isDone = icon.classList.contains('fa-check-square');
        const nextDone = !isDone;
        const taskId = li.dataset.taskId;
        // optimistic UI
        if(nextDone){
            icon.classList.remove('far','fa-square'); icon.classList.add('fas','fa-check-square'); li.classList.add('done');
        } else {
            icon.classList.remove('fas','fa-check-square'); icon.classList.add('far','fa-square'); li.classList.remove('done');
        }
        if(taskId){
            const res = await window.tasksService.updateTask(taskId, { status: nextDone ? 'completed' : 'pending' });
            if(!res.success){ console.warn('Failed to update status:', res.error); }
        }
    }
    window.removeTodoItem = async function(btn, event){ 
        event?.stopPropagation();
        const li = btn.closest('li');
        const taskId = li?.dataset?.taskId;
        if(!li) return;
        if(!confirm('هل ترغب بحذف هذه المهمة؟')) return;
        if(taskId){
            const res = await window.tasksService.deleteTask(taskId);
            if(!res.success){ alert('فشل حذف المهمة: ' + (res.error||'')); return; }
        }
        li.remove(); 
    }

    // Notes and Links (DB-backed using notes table)
    function ensureModal(html){
        const wrap = document.createElement('div');
        wrap.className = 'profile-modal-overlay';
        const content = document.createElement('div');
        content.className = 'profile-modal-content';
        content.innerHTML = html;
        wrap.appendChild(content);
        // close on overlay click (not on content)
        wrap.addEventListener('click', (e)=>{ if(e.target === wrap) wrap.remove(); });
        document.body.appendChild(wrap);
        return wrap;
    }

    async function loadUserNotes(){
        const grid = document.querySelector('#notesGrid');
        if(!grid || !window.tasksService) return;
        grid.innerHTML = '';
        const { success, notes, error } = await window.tasksService.getNotes({ category: 'note' });
        if(!success){ console.warn('loadUserNotes failed:', error); return; }
        if(!notes || notes.length === 0){
            grid.innerHTML = '<p style="text-align:center;color:var(--placeholder-color);padding:16px;">لا توجد ملاحظات بعد</p>';
            return;
        }
        notes.forEach(n => grid.appendChild(renderNoteCard(n)));
    }

    function renderNoteCard(n){
        const card = document.createElement('div');
        card.className = 'note-card';
        card.dataset.noteId = n.id;
        const category = n.category || 'note';
        card.innerHTML = `
            <div class="note-header">
                <div class="note-title">${escapeHtml(n.title||'ملاحظة')}</div>
                <div class="note-category ${category}">${escapeHtml(category)}</div>
            </div>
            <div class="note-content">${escapeHtml(n.content||'')}</div>
            <div class="note-footer">
                <button class="note-btn delete" onclick="deleteNote('${n.id}', event)"><i class="fas fa-trash"></i> حذف</button>
            </div>`;
        return card;
    }

    window.addNewNote = function(){
        const modal = ensureModal(`
          <h4 class="admin-modal-title">إضافة ملاحظة جديدة</h4>
          <div class="form-group"><label>العنوان</label><input id="nn_title" class="settings-input" placeholder="عنوان الملاحظة"></div>
          <div class="form-group"><label>التصنيف</label><input id="nn_cat" class="settings-input" placeholder="مثال: أعمال"></div>
          <div class="form-group"><label>المحتوى</label><textarea id="nn_content" class="settings-textarea" rows="4" placeholder="اكتب الملاحظة..."></textarea></div>
          <div class="admin-modal-actions"><button id="nn_save" class="admin-btn success"><i class="fas fa-save"></i> حفظ</button><button id="nn_cancel" class="admin-btn danger"><i class="fas fa-times"></i> إلغاء</button></div>
        `);
        modal.querySelector('#nn_cancel').onclick = ()=> modal.remove();
        modal.querySelector('#nn_save').onclick = async ()=>{
            const title = modal.querySelector('#nn_title').value.trim();
            const cat = modal.querySelector('#nn_cat').value.trim() || 'note';
            const content = modal.querySelector('#nn_content').value.trim();
            if(!title && !content){ alert('الرجاء إدخال عنوان أو محتوى'); return; }
            const { success, note, error } = await window.tasksService.createNote({ title, category: 'note', content, tags: cat });
            if(!success){ alert('فشل الحفظ: ' + (error||'')); return; }
            modal.remove();
            loadUserNotes();
        };
    }
    window.deleteNote = async function(id, e){
        e?.stopPropagation?.();
        if(!confirm('حذف هذه الملاحظة؟')) return;
        const res = await window.tasksService.deleteNote(id);
        if(!res.success){ alert('فشل حذف الملاحظة: ' + (res.error||'')); return; }
        loadUserNotes();
    }

    async function loadUserLinks(){
        const list = document.querySelector('#linksList');
        if(!list || !window.tasksService) return;
        list.innerHTML = '';
        const { success, notes, error } = await window.tasksService.getNotes({ category: 'link' });
        if(!success){ console.warn('loadUserLinks failed:', error); return; }
        if(!notes || notes.length === 0){
            list.innerHTML = '<p style="text-align:center;color:var(--placeholder-color);padding:16px;">لا توجد روابط بعد</p>';
            return;
        }
        notes.forEach(l => list.appendChild(renderLinkItem(l)));
    }

    function renderLinkItem(n){
        let url = '', desc = '';
        try { const p = JSON.parse(n.content||'{}'); url = p.url||''; desc = p.description||''; } catch {}
        const item = document.createElement('div');
        item.className = 'link-item';
        item.dataset.noteId = n.id;
        item.innerHTML = `
            <div class="link-info">
                <div class="link-header"><h4 class="link-title">${escapeHtml(n.title||'رابط')}</h4></div>
                <a href="${escapeHtml(url)}" class="link-url" target="_blank"><i class="fas fa-external-link-alt"></i> ${escapeHtml(url)}</a>
                <div class="link-description">${escapeHtml(desc)}</div>
            </div>
            <div class="link-actions">
                <button class="copy-link-btn" onclick="copyLink('${encodeURIComponent(url)}')"><i class="fas fa-copy"></i> نسخ</button>
                <button class="delete-link-btn" onclick="deleteLink('${n.id}')"><i class="fas fa-trash"></i> حذف</button>
            </div>`;
        return item;
    }

    window.addNewLink = function(){
        const modal = ensureModal(`
          <h4 class="admin-modal-title">إضافة رابط جديد</h4>
          <div class="form-group"><label>العنوان</label><input id="nl_title" class="settings-input" placeholder="عنوان الرابط"></div>
          <div class="form-group"><label>الرابط (URL)</label><input id="nl_url" class="settings-input" placeholder="https://..."></div>
          <div class="form-group"><label>الوصف</label><textarea id="nl_desc" class="settings-textarea" rows="3" placeholder="وصف مختصر..."></textarea></div>
          <div class="admin-modal-actions"><button id="nl_save" class="admin-btn success"><i class="fas fa-save"></i> حفظ</button><button id="nl_cancel" class="admin-btn danger"><i class="fas fa-times"></i> إلغاء</button></div>
        `);
        modal.querySelector('#nl_cancel').onclick = ()=> modal.remove();
        modal.querySelector('#nl_save').onclick = async ()=>{
            const title = modal.querySelector('#nl_title').value.trim();
            const url = modal.querySelector('#nl_url').value.trim();
            const description = modal.querySelector('#nl_desc').value.trim();
            if(!url){ alert('الرجاء إدخال رابط صالح'); return; }
            const content = JSON.stringify({ url, description });
            const { success, note, error } = await window.tasksService.createNote({ title: title||'رابط', category: 'link', content });
            if(!success){ alert('فشل الحفظ: ' + (error||'')); return; }
            modal.remove();
            loadUserLinks();
        };
    }

    window.deleteLink = async function(id){
        if(!confirm('حذف هذا الرابط؟')) return;
        const res = await window.tasksService.deleteNote(id);
        if(!res.success){ alert('فشل حذف الرابط: ' + (res.error||'')); return; }
        loadUserLinks();
    }

    window.copyLink = function(raw){
        const url = decodeURIComponent(raw||'');
        navigator.clipboard.writeText(url).then(()=> alert('تم نسخ الرابط')).catch(()=> alert('تعذر نسخ الرابط'));
    }

    // Load Admin Tasks from notes table
    async function loadAdminTasks() {
        const container = document.getElementById('adminTasksList');
        if (!container) return;
        
        try {
            const { data: tasks, error } = await supabaseClient
                .from('notes')
                .select('id, title, content, created_at')
                .eq('user_id', userId)
                .eq('category', 'task')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Clear existing content except demo tasks
            const existingTasks = container.querySelectorAll('.admin-task-item:not([data-demo])');
            existingTasks.forEach(task => task.remove());
            
            if (tasks && tasks.length > 0) {
                tasks.forEach(task => {
                    let taskContent = task.content || '';
                    let deadline = '';
                    
                    // Try to parse content as JSON for deadline
                    try {
                        const parsed = JSON.parse(taskContent);
                        if (parsed.description) taskContent = parsed.description;
                        if (parsed.deadline) deadline = parsed.deadline;
                    } catch (e) {
                        // Content is plain text, use as is
                    }
                    
                    const taskElement = document.createElement('div');
                    taskElement.className = 'admin-task-item';
                    taskElement.dataset.taskId = task.id;
                    taskElement.innerHTML = `
                        <div class="task-info">
                            <h4 class="task-name"><i class="fa-solid fa-clipboard-list"></i> ${task.title || 'مهمة جديدة'}</h4>
                            <div class="task-deadline"><i class="fa-regular fa-clock"></i> تاريخ الإرسال: ${new Date(task.created_at).toLocaleDateString('ar-SA')}</div>
                            ${deadline ? `<div class="task-deadline"><i class="fa-solid fa-calendar"></i> موعد التسليم: ${deadline}</div>` : ''}
                            <div class="task-priority medium"><i class="fa-solid fa-flag"></i> من الإدارة</div>
                        </div>
                        <div class="task-actions">
                            <button class="actions-task-btn start" onclick="StartTask(this)">تم البدء <i class="fa-solid fa-flag-checkered"></i></button>
                            <button class="actions-task-btn ask" onclick="AskAdminAboutTask(this)">استفسر الادارة <i class="fa-solid fa-question"></i></button>
                            <button class="actions-task-btn done" onclick="TasxDone(this)">تم التنفيذ <i class="fa-solid fa-check-double"></i></button>
                        </div>
                    `;
                    container.appendChild(taskElement);
                });
            }
        } catch (error) {
            console.error('Error loading admin tasks:', error);
        }
    }

    // --- Account section: populate and save ---
    async function loadAccountForm(){
        try{
            const { data: user, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            const u = user || currentUser || {};
            // Split full_name into first/last (best effort)
            const fullName = u.full_name || '';
            const parts = fullName.trim().split(/\s+/);
            const first = parts.shift() || '';
            const last = parts.join(' ') || '';
            // Set inputs
            const setVal = (id, val)=>{ const el=document.getElementById(id); if(el) el.value = val ?? ''; };
            setVal('username', u.username || '');
            setVal('email', u.email || '');
            setVal('firstName', first);
            setVal('lastName', last);
            setVal('phone', u.phone || '');
            setVal('whatsapp', u.whatsapp || '');
            setVal('birthDate', u.birth_date || '');
            setVal('gender', u.gender || '');
            setVal('address', u.address || u.residence || '');
            setVal('bio', u.bio || '');
        }catch(e){ console.warn('Failed to load account form:', e?.message||e); }
    }

    window.saveAccountInfo = async function(event){
        try{
            event?.preventDefault?.();
            const getVal = (id)=> document.getElementById(id)?.value?.trim() || '';
            const first = getVal('firstName');
            const last = getVal('lastName');
            const profileData = {
                username: getVal('username') || currentUser.username,
                email: getVal('email') || currentUser.email,
                full_name: [first, last].filter(Boolean).join(' ') || currentUser.full_name,
                phone: getVal('phone') || null,
                whatsapp: getVal('whatsapp') || null,
                birth_date: getVal('birthDate') || null,
                gender: getVal('gender') || null,
                address: getVal('address') || null,
                bio: getVal('bio') || null,
                updated_at: new Date().toISOString()
            };
            const res = await window.authService.updateProfile(profileData);
            if(!res.success){ alert('فشل حفظ التغييرات: ' + (res.error||'')); return; }
            alert('تم حفظ التغييرات بنجاح');
        }catch(e){ alert('تعذر حفظ التغييرات: ' + (e?.message||e)); }
    }

    // Initial calls
    // Initialize the page
    await fetchUserStats();
    await fetchUserProducts();
    await fetchUserSuppliers();
    await loadAccountForm();
    await loadPersonalTodos();
    await loadUserNotes();
    await loadUserLinks();
    await loadAdminTasks();
});
