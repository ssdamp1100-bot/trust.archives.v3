// Admin Panel Logic
document.addEventListener('DOMContentLoaded', async () => {
    // Page protection: Only admins can access
    if (!window.authService.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

// ===== Tasks Follow-ups =====
async function loadTaskFollowups(){
    const container = document.getElementById('taskFollowupsList');
    if(!container) return;
    container.innerHTML = '';

    try{
        // Inject one demo notification (will be removed by admin later)
        const demo = document.createElement('div');
        demo.className = 'admin-task-item in-progress';
        demo.innerHTML = `
            
        `;
        container.appendChild(demo);

        // Read from notes table where category in ('task','task_notify')
        const { data, error } = await supabaseClient
            .from('notes')
            .select('id, title, content, category, user_id, created_at, users:user_id(username, full_name)')
            .in('category', ['task','task_notify'])
            .order('created_at', { ascending: false })
            .limit(100);
        if(error) throw error;
        const tasks = data || [];

        tasks.forEach(t => {
            // Notifications of completed tasks
            if (t.category === 'task_notify') {
                const noteItem = document.createElement('div');
                noteItem.className = 'admin-task-item done';
                let info = '';
                try { const parsed = JSON.parse(t.content||''); info = parsed?.message || ''; } catch {}
                const assignee = t.users?.full_name || t.users?.username || 'عضو';
                noteItem.innerHTML = `
                    <div class="task-info">
                        <h4 class="task-name"><i class="fa-solid fa-check-double"></i> إنجاز مهمة</h4>
                        <div class="task-deadline"><i class="fa-solid fa-user"></i> العضو: ${assignee}</div>
                        ${info ? `<div class=\"task-deadline\"><i class=\"fa-solid fa-info-circle\"></i> ${info}</div>` : ''}
                        <div class="task-priority high"><i class="fa-solid fa-flag"></i> الحالة: تم التنفيذ</div>
                        <div class="task-actions"><button class="actions-task-btn" onclick="deleteTaskFollowup(this, '${t.id}')"><i class="fa-solid fa-trash"></i></button></div>
                    </div>`;
                container.appendChild(noteItem);
                return;
            }

            const item = document.createElement('div');
            item.className = 'admin-task-item';

            const assignee = t.users?.full_name || t.users?.username || 'غير محدد';
            let taskContent = t.content || '';
            let deadline = '';
            let status = 'sent';

            // Try to parse content as JSON for deadline/status
            try {
                const parsed = JSON.parse(taskContent);
                if (parsed.description) taskContent = parsed.description;
                if (parsed.deadline) deadline = parsed.deadline;
                if (parsed.status) status = parsed.status;
            } catch (e) {
                // Content is plain text
            }

            let statusLabel = 'مرسلة';
            if (status === 'in_progress') statusLabel = 'قيد التنفيذ';
            else if (status === 'done') statusLabel = 'تم التنفيذ';

            item.innerHTML = `
                <div class="task-info">
                    <h4 class="task-name"><i class="fa-solid fa-clipboard-list"></i> ${t.title || 'مهمة جديدة'}</h4>
                    <div class="task-deadline"><i class="fa-solid fa-user"></i> العضو المكلف: ${assignee}</div>
                    <div class="task-priority high"><i class="fa-solid fa-flag"></i> الحالة: ${statusLabel}</div>
                    ${deadline ? `<div class="task-deadline"><i class="fa-solid fa-calendar"></i> موعد التسليم: ${deadline}</div>` : ''}
                    <div class="task-actions"><button class="actions-task-btn" onclick="deleteTaskFollowup(this, '${t.id}')"><i class="fa-solid fa-trash"></i></button></div>
                </div>`;
            container.appendChild(item);
        });

    }catch(e){
        console.error('loadTaskFollowups error:', e);
        container.innerHTML = '<div style="text-align:center;padding:12px;">تعذر تحميل متابعات المهام</div>';
    }
}

// Delete a follow-up notification from UI and database
window.deleteTaskFollowup = async function(btn, taskId = null){
    const item = btn?.closest('.admin-task-item');
    if(!item) return;
    
    if(taskId && confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
        try {
            const { error } = await supabaseClient.from('notes').delete().eq('id', taskId);
            if(error) throw error;
            item.remove();
            alert('تم حذف المهمة');
        } catch (e) {
            alert('فشل حذف المهمة: ' + e.message);
        }
    } else {
        // For demo tasks without ID
        item.remove();
    }
}

// === Wrappers to match requested handlers ===
async function resolveCategoryId(key) {
    if (!key) return null;
    // crude UUID/ID test; if it's not obviously an ID, treat as name
    if (/^[0-9a-f-]{8,}$/i.test(String(key))) return key;
    try {
        const { data } = await supabaseClient.from('categories').select('id').eq('name', key).single();
        return data?.id || null;
    } catch { return null; }
}

window.showEditCategory = async function(key) {
    const id = await resolveCategoryId(key);
    if (!id) return alert('لم يتم العثور على الفئة المطلوبة للتحرير');
    editCategory(id);
}

window.showDeleteConfirm = async function(key) {
    const id = await resolveCategoryId(key);
    if (!id) return alert('لم يتم العثور على الفئة المطلوبة للحذف');
    // fetch name for confirmation
    let name = '';
    try { const { data } = await supabaseClient.from('categories').select('name').eq('id', id).single(); name = data?.name || ''; } catch {}
    if (confirm(`حذف الفئة "${name || id}"؟`)) {
        deleteCategory(id, name || id);
    }
}

window.showAddSubCategory = async function(parentKey) {
    const parentId = await resolveCategoryId(parentKey);
    // populate and open modal similar to initCategoryModals
    const modal = document.getElementById('addSubcategoryModal');
    const select = document.getElementById('parentCategorySelect');
    if (select) {
        const { data } = await supabaseClient.from('categories').select('id,name').order('name');
        select.innerHTML = '<option value="">اختر الفئة الرئيسية</option>' + (data||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
        if (parentId) select.value = parentId;
    }
    if (modal) modal.classList.remove('hidden');
}

window.showEditSubCategory = async function(key) {
    const id = await resolveCategoryId(key);
    if (!id) return alert('لم يتم العثور على الفئة الفرعية المطلوبة');
    editCategory(id);
}

// Build backup payload used by multiple exporters
async function buildBackupPayload() {
    const [users, products, suppliers, categories] = await Promise.all([
        supabaseClient.from('users').select('id,username,email,full_name,created_at,role,status'),
        supabaseClient.from('products').select('id,name,code,category_id,user_id,created_at'),
        supabaseClient.from('suppliers').select('id,name,country,rating,created_at'),
        supabaseClient.from('categories').select('id,name,created_at'),
    ]);
    return {
        meta: { generated_at: new Date().toISOString(), type: 'text-only' },
        users: users.data||[],
        products: products.data||[],
        suppliers: suppliers.data||[],
        categories: categories.data||[]
    };
}

// ===== Additional free backup formats =====
function toCSV(rows) {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const esc = (v) => {
        const s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.join(',')];
    for (const r of rows) {
        lines.push(headers.map(h => esc(r[h])).join(','));
    }
    return lines.join('\n');
}

async function exportCSVBackup() {
    try {
        const payload = await buildBackupPayload();
        const parts = [];
        parts.push('# Users');
        parts.push(toCSV(payload.users));
        parts.push('\n# Products');
        parts.push(toCSV(payload.products));
        parts.push('\n# Suppliers');
        parts.push(toCSV(payload.suppliers));
        parts.push('\n# Categories');
        parts.push(toCSV(payload.categories));
        const content = parts.join('\n');
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `trust-archive-backup-${ts}.csv.txt`;
        document.body.appendChild(a); a.click(); a.remove();
        pushBackupLog({ type: 'export-csv', timestamp: new Date().toISOString() });
    } catch (e) { alert('فشل تصدير CSV: ' + e.message); }
}

async function exportNDJSONBackup() {
    try {
        const payload = await buildBackupPayload();
        const lines = [];
        for (const row of payload.users) lines.push(JSON.stringify({ table: 'users', ...row }));
        for (const row of payload.products) lines.push(JSON.stringify({ table: 'products', ...row }));
        for (const row of payload.suppliers) lines.push(JSON.stringify({ table: 'suppliers', ...row }));
        for (const row of payload.categories) lines.push(JSON.stringify({ table: 'categories', ...row }));
        const content = lines.join('\n');
        const blob = new Blob([content], { type: 'application/x-ndjson;charset=utf-8' });
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `trust-archive-backup-${ts}.ndjson`;
        document.body.appendChild(a); a.click(); a.remove();
        pushBackupLog({ type: 'export-ndjson', timestamp: new Date().toISOString() });
    } catch (e) { alert('فشل تصدير NDJSON: ' + e.message); }
}

async function copyBackupToClipboard() {
    try {
        const payload = await buildBackupPayload();
        const text = JSON.stringify(payload, null, 2);
        await navigator.clipboard.writeText(text);
        pushBackupLog({ type: 'copy-clipboard', timestamp: new Date().toISOString() });
        alert('✅ تم نسخ JSON إلى الحافظة');
    } catch (e) { alert('تعذر النسخ إلى الحافظة: ' + e.message); }
}

async function exportZipBackup() {
    try {
        if (typeof JSZip === 'undefined') throw new Error('JSZip غير متوفر');
        const payload = await buildBackupPayload();
        const zip = new JSZip();
        zip.file('backup.json', JSON.stringify(payload, null, 2));
        zip.file('users.csv', toCSV(payload.users));
        zip.file('products.csv', toCSV(payload.products));
        zip.file('suppliers.csv', toCSV(payload.suppliers));
        zip.file('categories.csv', toCSV(payload.categories));
        const blob = await zip.generateAsync({ type: 'blob' });
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `trust-archive-backup-${ts}.zip`;
        document.body.appendChild(a); a.click(); a.remove();
        pushBackupLog({ type: 'export-zip', timestamp: new Date().toISOString() });
    } catch (e) { alert('فشل تصدير ZIP: ' + e.message); }
}

// ===== Membership Requests =====
async function loadMembershipRequests() {
    try {
        const list = document.getElementById('membershipRequestsList');
        if (!list) return;
        list.innerHTML = '';

        // Try membership_requests table first
        let requests = [];
        let usedRequestsTable = true;
        let err1 = null;
        try {
            const { data, error } = await supabaseClient
                .from('membership_requests')
                .select('id, username, email, full_name, created_at');
            if (error) throw error;
            requests = data || [];
        } catch (e) {
            usedRequestsTable = false;
            err1 = e;
        }

        if (!usedRequestsTable) {
            // Fallback to users where status = 'pending'
            try {
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('id, username, email, full_name, created_at, status')
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                requests = data || [];
            } catch (e2) {
                console.warn('No membership_requests table and no pending users.', err1, e2);
                list.innerHTML = '<li><p style="text-align:center;padding:12px;">لا توجد طلبات عضوية</p></li>';
                return;
            }
        }

        if (!requests.length) {
            list.innerHTML = '<li><p style="text-align:center;padding:12px;">لا توجد طلبات عضوية</p></li>';
            return;
        }

        requests.forEach(r => {
            const li = document.createElement('li');
            const displayName = r.full_name || r.username || r.email || 'طلب عضوية';
            li.innerHTML = `
                <div class="user-info">
                    <div class="user-header">
                        <p class="users-name">
                            <i class="fa-solid fa-user-clock"></i> ${displayName}
                        </p>
                        <small class="last-activity"><i class="fa-solid fa-clock"></i> تقدم: ${r.created_at ? new Date(r.created_at).toLocaleString('en-GB') : ''}</small>
                    </div>
                    <div class="user-counters">
                        <small><i class="fa-solid fa-envelope"></i> ${r.email || ''}</small>
                        <small><i class="fa-solid fa-id-badge"></i> ${r.username || ''}</small>
                    </div>
                    <div class="user-actions">
                        <button class="admin-btn success btn-xsmall" onclick="approveMembershipRequest('${r.id}', ${usedRequestsTable})"><i class="fa-solid fa-check"></i> موافقة</button>
                        <button class="admin-btn danger btn-xsmall" onclick="deleteMembershipRequest('${r.id}', ${usedRequestsTable})"><i class="fa-solid fa-trash"></i> حذف</button>
                    </div>
                </div>
            `;
            list.appendChild(li);
        });
    } catch (e) {
        console.error('loadMembershipRequests error:', e);
    }
}

async function approveMembershipRequest(id, isRequestsTable) {
    try {
        if (isRequestsTable) {
            // Read request
            const { data: req, error: rErr } = await supabaseClient
                .from('membership_requests')
                .select('*')
                .eq('id', id)
                .single();
            if (rErr) throw rErr;

            // Create user in users table (basic fields)
            const payload = {
                username: req.username || null,
                email: req.email || null,
                full_name: req.full_name || null,
                role: 'member',
                status: 'active',
                created_at: new Date().toISOString()
            };
            const { error: uErr } = await supabaseClient.from('users').insert([payload]);
            if (uErr) throw uErr;

            // Delete request
            const { error: dErr } = await supabaseClient.from('membership_requests').delete().eq('id', id);
            if (dErr) throw dErr;
        } else {
            // Fallback: set user status active
            const { error } = await supabaseClient.from('users').update({ status: 'active' }).eq('id', id);
            if (error) throw error;
        }
        alert('✅ تم قبول طلب العضوية');
        await loadMembershipRequests();
        await loadUsers();
        await loadStatistics();
    } catch (e) {
        alert('❌ فشل قبول الطلب: ' + e.message);
    }
}

async function deleteMembershipRequest(id, isRequestsTable) {
    if (!confirm('حذف طلب العضوية؟')) return;
    try {
        if (isRequestsTable) {
            const { error } = await supabaseClient.from('membership_requests').delete().eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('users').delete().eq('id', id).eq('status', 'pending');
            if (error) throw error;
        }
        alert('تم حذف الطلب');
        await loadMembershipRequests();
    } catch (e) {
        alert('فشل حذف الطلب: ' + e.message);
    }
}

// ===== Suppliers Actions =====
function goSupplierDetails(id) {
    window.location.href = `single-supplier.html?id=${id}`;
}

async function deleteSupplier(id, name) {
    // تأكيد محسّن
    let supplierName = name;
    if (!supplierName) {
        try {
            const { data } = await supabaseClient
                .from('suppliers')
                .select('name')
                .eq('id', id)
                .single();
            supplierName = data?.name || '';
        } catch {}
    }
    const displayName = supplierName || id;
    const confirmMessage = `⚠️ هل أنت متأكد من حذف المورد "${displayName}"؟\n\nسيتم حذف:\n- جميع بيانات المورد\n- الصور والشعارات المرتبطة\n- العلاقات مع المنتجات\n\nهذا الإجراء لا يمكن التراجع عنه!`;
    
    if (!confirm(confirmMessage)) return;

    try {
        // استخدام suppliersService للحذف
        const result = await window.suppliersService.deleteSupplier(id);
        
        if (!result.success) {
            throw new Error(result.error || 'فشل حذف المورد');
        }

        alert('✅ تم حذف المورد بنجاح');
        await loadSuppliers();
        await loadStatistics();
    } catch (e) {
        console.error('Error deleting supplier:', e);
        alert(`❌ فشل حذف المورد:\n${e.message}`);
    }
}

// جعل دوال الموردين متاحة بشكل صريح في النطاق العام
window.goSupplierDetails = goSupplierDetails;
window.deleteSupplier = deleteSupplier;

// ===== Categories: Modals and create =====
function initCategoryModals() {
    const openCat = document.getElementById('openAddCategoryModal');
    const openSub = document.getElementById('openAddSubcategoryModal');
    const modalCat = document.getElementById('addCategoryModal');
    const modalSub = document.getElementById('addSubcategoryModal');
    const saveCat = document.getElementById('saveAddCategory');
    const saveSub = document.getElementById('saveAddSubcategory');
    const parentSelect = document.getElementById('parentCategorySelect');
    const inlineDiv = document.getElementById('addCategoryInline');
    const saveInline = document.getElementById('saveAddCategoryInline');
    const cancelInline = document.getElementById('cancelAddCategoryInline');

    function open(m) { if (m) m.classList.remove('hidden'); }
    function closeAll() { [modalCat, modalSub].forEach(m=>m&&m.classList.add('hidden')); }

    document.addEventListener('click', (e) => {
        if (e.target && e.target.hasAttribute('data-close-modal')) closeAll();
    });

    // Open inline add-category form under the button instead of modal
    if (openCat) openCat.addEventListener('click', async () => {
        if (inlineDiv) {
            inlineDiv.classList.toggle('hidden');
            const input = document.getElementById('newCategory');
            if (input && !inlineDiv.classList.contains('hidden')) {
                input.focus();
            }
        }
    });

    // Handle inline save/cancel actions
    if (saveInline) saveInline.addEventListener('click', async () => {
        await addCategory();
        if (inlineDiv) inlineDiv.classList.add('hidden');
    });
    if (cancelInline) cancelInline.addEventListener('click', () => {
        const input = document.getElementById('newCategory');
        if (input) input.value = '';
        if (inlineDiv) inlineDiv.classList.add('hidden');
    });
    if (openSub) openSub.addEventListener('click', async () => {
        // populate parents
        if (parentSelect) {
            parentSelect.innerHTML = '<option value="">اختر الفئة الرئيسية</option>';
            const { data } = await supabaseClient.from('categories').select('id,name').order('name');
            (data||[]).forEach(c=>{
                const opt = document.createElement('option');
                opt.value = c.id; opt.textContent = c.name; parentSelect.appendChild(opt);
            });
        }
        open(modalSub);
    });

    if (saveCat) saveCat.addEventListener('click', async () => {
        const name = (document.getElementById('addCategoryName')?.value||'').trim();
        if (!name) return alert('أدخل اسم الفئة');
        const { error } = await supabaseClient.from('categories').insert([{ name }]);
        if (error) return alert('فشل إضافة الفئة: ' + error.message);
        alert('تمت إضافة الفئة');
        closeAll();
        await loadCategories();
        await loadStatistics();
    });

    if (saveSub) saveSub.addEventListener('click', async () => {
        const parentId = parentSelect?.value || '';
        const name = (document.getElementById('addSubcategoryName')?.value||'').trim();
        if (!name || !parentId) return alert('اختر الفئة الرئيسية واكتب اسم الفئة الفرعية');
        // No explicit parent relation in schema; create as category entry with name prefix
        const { data: parent } = await supabaseClient.from('categories').select('name').eq('id', parentId).single();
        const finalName = parent?.name ? `${parent.name} - ${name}` : name;
        const { error } = await supabaseClient.from('categories').insert([{ name: finalName }]);
        if (error) return alert('فشل إضافة الفئة الفرعية: ' + error.message);
        alert('تمت إضافة الفئة الفرعية');
        closeAll();
        await loadCategories();
        await loadStatistics();
    });
}

// Retain simple quick add from inline input
async function addCategory() {
    const input = document.getElementById('newCategory');
    const name = (input?.value||'').trim();
    if (!name) return alert('يرجى إدخال اسم الفئة');
    const { error } = await supabaseClient.from('categories').insert([{ name }]);
    if (error) return alert('فشل إضافة الفئة: ' + error.message);
    input.value = '';
    await loadCategories();
    await loadStatistics();
}

// ===== Products filters =====
function initProductFilters() {
    const catSel = document.getElementById('categoryFilter');
    const supSel = document.getElementById('supplierFilter');
    const userSel = document.getElementById('statusFilter');
    (async () => {
        // categories
        if (catSel) {
            const { data } = await supabaseClient.from('categories').select('id,name').order('name');
            catSel.innerHTML = '<option value="">جميع الفئات</option>' + (data||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
        }
        // suppliers
        if (supSel) {
            const { data } = await supabaseClient.from('suppliers').select('id,name').order('name');
            supSel.innerHTML = '<option value="">جميع الموردين</option>' + (data||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
        }
        // users
        if (userSel) {
            const { data } = await supabaseClient.from('users').select('id,username').order('username');
            userSel.innerHTML = '<option value="">جميع المستخدمين</option>' + (data||[]).map(u=>`<option value="${u.id}">${u.username}</option>`).join('');
        }
    })();

    [catSel, supSel, userSel].forEach(sel => {
        if (!sel) return;
        sel.addEventListener('change', applyProductFilters);
    });
}

async function applyProductFilters() {
    const cat = document.getElementById('categoryFilter')?.value || '';
    const sup = document.getElementById('supplierFilter')?.value || '';
    const usr = document.getElementById('statusFilter')?.value || '';
    try {
        let query = supabaseClient
            .from('products')
            .select(`*, categories(name), users(username), product_suppliers(supplier_id)`)
            .order('created_at', { ascending: false })
            .limit(100);
        if (cat) query = query.eq('category_id', cat);
        if (usr) query = query.eq('user_id', usr);
        // Note: filtering by through product_suppliers requires RPC or server-side; simple client filter here
        const { data, error } = await query;
        if (error) throw error;
        let products = data || [];
        if (sup) {
            products = products.filter(p => Array.isArray(p.product_suppliers) && p.product_suppliers.some(ps => ps.supplier_id === sup));
        }
        const list = document.getElementById('productsList');
        if (!list) return;
        list.innerHTML = '';
        if (products.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:12px;">لا توجد منتجات مطابقة</div>';
            return;
        }
        products.forEach(product => {
            const div = document.createElement('div');
            div.className = 'product-item';
            div.innerHTML = `
                <div class="product-name">
                    <span>${product.name}</span>
                    <span class="product-serial">#${product.code || 'N/A'}</span>
                </div>
                <div class="product-category">${product.categories?.name || 'غير مصنف'}</div>
                <div class="product-user">${product.users?.username || 'N/A'}</div>
                <div class="product-actions">
                    <button onclick="viewProduct('${product.id}')" class="admin-btn info btn-xsmall"><i class="fas fa-eye"></i> عرض</button>
                    <button onclick="goEditProduct('${product.id}')" class="admin-btn warning btn-xsmall"><i class="fas fa-edit"></i> تعديل</button>
                    <button onclick="deleteProduct('${product.id}', '${product.name}')}" class="admin-btn danger btn-xsmall"><i class="fas fa-trash"></i> حذف</button>
                </div>`;
            list.appendChild(div);
        });
    } catch (e) { console.error('applyProductFilters error:', e); }
}

// Open add-product in edit mode
window.goEditProduct = function(productId){
    if (!productId) return;
    window.location.href = `add-product.html?id=${productId}`;
}

// ===== Backups =====
function initBackupHandlers() {
    const fileInput = document.getElementById('backupFile');
    if (fileInput) {
        fileInput.addEventListener('change', handleBackupRestoreFromFile);
    }
    renderBackupLog();
}

async function createBackup() {
    try {
        const payload = await buildBackupPayload();
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `trust-archive-backup-${ts}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        // Log
        pushBackupLog({ type: 'create', timestamp: new Date().toISOString() });
        alert('✅ تم إنشاء نسخة احتياطية (نصية) وتنزيلها');
    } catch (e) {
        alert('❌ فشل إنشاء النسخة الاحتياطية: ' + e.message);
    }
}

function downloadBackup() {
    const last = getBackupLog().slice().reverse()[0];
    if (!last) return alert('لا توجد نسخ احتياطية مسجلة');
    alert('يرجى استخدام الملف الذي تم تنزيله مؤخراً (يتم الحفظ محلياً فقط)');
}

async function handleBackupRestoreFromFile(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data || typeof data !== 'object') throw new Error('ملف غير صالح');
        if (!confirm('سيتم استيراد بيانات نصية (محدودة). المتابعة؟')) return;
        // Simple restore for categories only (safe)
        const cats = Array.isArray(data.categories) ? data.categories : [];
        for (const c of cats) {
            if (c.name) {
                await supabaseClient.from('categories').insert([{ name: c.name }]);
            }
        }
        pushBackupLog({ type: 'restore', timestamp: new Date().toISOString() });
        alert('✅ تم الاستيراد (فئات فقط)');
        await loadCategories();
        await loadStatistics();
    } catch (e) {
        alert('❌ فشل الاستعادة: ' + e.message);
    } finally {
        ev.target.value = '';
    }
}

async function clearAllData() {
    if (!confirm('هل أنت متأكد من ذلك؟')) return;
    const doBackup = confirm('إنشاء نسخة احتياطية قبل الحذف؟');
    if (doBackup) await createBackup();
    try {
        // Delete demo/real data carefully (admin only). Order to honor FKs.
        await supabaseClient.from('product_images').delete().neq('id', '');
        await supabaseClient.from('product_suppliers').delete().neq('id', '');
        await supabaseClient.from('products').delete().neq('id', '');
        await supabaseClient.from('suppliers').delete().neq('id', '');
        await supabaseClient.from('categories').delete().neq('id', '');
        pushBackupLog({ type: 'delete-all', timestamp: new Date().toISOString() });
        alert('✅ تم مسح البيانات');
        await loadStatistics();
        await loadUsers();
        await loadCategories();
        await loadSuppliers();
        await loadProducts();
    } catch (e) {
        alert('❌ فشل مسح البيانات: ' + e.message);
    }
}

function getBackupLog() {
    try { return JSON.parse(localStorage.getItem('admin_backup_log')||'[]'); } catch { return []; }
}
function pushBackupLog(entry) {
    const list = getBackupLog();
    list.push(entry);
    localStorage.setItem('admin_backup_log', JSON.stringify(list));
    renderBackupLog();
}
function renderBackupLog() {
    const logDiv = document.getElementById('backupLog');
    const info = document.getElementById('lastBackupInfo');
    if (!logDiv || !info) return;
    const list = getBackupLog();
    if (list.length === 0) {
        info.innerHTML = '<i class="fas fa-info-circle"></i> لا توجد نسخ احتياطية بعد';
        logDiv.textContent = '';
        return;
    }
    const last = list[list.length-1];
    const lastStr = new Date(last.timestamp).toLocaleString('en-GB');
    info.innerHTML = `<i class="fas fa-info-circle"></i> آخر عملية: ${last.type} — ${lastStr}`;
    logDiv.innerHTML = list.map(e => {
        return `<div>• ${e.type} — ${new Date(e.timestamp).toLocaleString('en-GB')}</div>`;
    }).join('');
}

// ===== Honor user (1 week) via notes table =====
async function honorUser(userId, displayName) {
    if (!confirm(`تكريم ${displayName} لمدة أسبوع؟`)) return;
    try {
        const now = new Date();
        const until = new Date(now.getTime() + 7*24*60*60*1000).toISOString();
        const { error } = await supabaseClient.from('notes').insert([{ 
            title: 'honor', content: `honor:${userId}`, category: 'honor', user_id: userId, created_at: now.toISOString(), updated_at: now.toISOString()
        }]);
        if (error) throw error;
        alert('✅ تم إضافة التكريم (لوحة التكريم تعتمد على قراءة ملاحظة honor لمدة أسبوع)');
    } catch (e) {
        alert('❌ فشل التكريم: ' + e.message);
    }
}

    const currentUser = window.authService.getCurrentUser();
    if (currentUser.role !== 'admin') {
        alert('ليس لديك صلاحية للوصول إلى هذه الصفحة');
        window.location.href = 'dashboard.html';
        return;
    }

    // Init UI and load data
    initCategoryModals();
    initBackupHandlers();
    initProductFilters();

    await loadStatistics();
    await loadUsers();
    await loadMembershipRequests();
    await loadCategories();
    await loadSuppliers();
    await loadProducts();
    await loadTaskFollowups();
});

// ===== Load Statistics =====
async function loadStatistics() {
    try {
        const { count: suppliersCount } = await supabaseClient
            .from('suppliers')
            .select('id', { count: 'exact', head: true });

        const { count: productsCount } = await supabaseClient
            .from('products')
            .select('id', { count: 'exact', head: true });

        const { count: usersCount } = await supabaseClient
            .from('users')
            .select('id', { count: 'exact', head: true });

        const { count: categoriesCount } = await supabaseClient
            .from('categories')
            .select('id', { count: 'exact', head: true });

        // Update UI
        const stats = document.querySelectorAll('.stat-number');
        if (stats[0]) stats[0].textContent = suppliersCount || 0;
        if (stats[1]) stats[1].textContent = productsCount || 0;
        if (stats[2]) stats[2].textContent = usersCount || 0;
        if (stats[3]) stats[3].textContent = categoriesCount || 0;

    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// ===== Load Users =====
async function loadUsers() {
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const usersList = document.getElementById('usersList');
        if (!usersList) return;

        usersList.innerHTML = '';

        if (users && users.length > 0) {
            users.forEach(user => {
                const userItem = document.createElement('li');
                userItem.innerHTML = `
                    <div class="user-info">
                        <div class="user-header">
                            <p class="users-name">
                                <i class="fa-solid fa-user"></i> ${user.full_name || user.username} 
                                ${user.role === 'admin' ? '🏆' : ''}
                            </p>
                            <small class="last-activity">
                                <i class="fa-solid fa-clock"></i> انضم: ${new Date(user.created_at).toLocaleDateString('en-GB')}
                            </small>
                        </div>
                        <div class="user-counters">
                            <small><i class="fa-solid fa-envelope"></i> ${user.email}</small>
                            <small><i class="fa-solid fa-id-badge"></i> ${user.username}</small>
                        </div>
                        <div class="user-actions">
                            <button onclick="goUserDetails('${user.id}')" class="admin-btn info btn-xsmall">
                                <i class="fa-solid fa-info-circle"></i> تفاصيل
                            </button>
                            <button onclick="honorUser('${user.id}', '${(user.full_name||user.username||'مستخدم')}')" class="admin-btn success btn-xsmall">
                                <i class="fa-solid fa-award"></i> تكريم
                            </button>
                            <button onclick="deleteUser('${user.id}', '${user.username}')" class="admin-btn danger btn-xsmall">
                                <i class="fa-solid fa-trash"></i> حذف
                            </button>
                        </div>
                    </div>
                `;
                usersList.appendChild(userItem);
            });
        } else {
            usersList.innerHTML = '<li><p style="text-align: center; padding: 20px;">لا يوجد مستخدمون</p></li>';
        }

    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// ===== Load Categories =====
async function loadCategories() {
    try {
        const { data: categories, error } = await supabaseClient
            .from('categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        const categoriesList = document.getElementById('categoriesList');
        if (!categoriesList) return;

        categoriesList.innerHTML = '';

        if (categories && categories.length > 0) {
            // Build tree using naming convention: "Parent - Child"
            const tree = new Map(); // parentName -> { id, name, children: [{ id, name }] }

            for (const c of categories) {
                const parts = String(c.name || '').split(' - ');
                if (parts.length > 1) {
                    const parentName = parts[0].trim();
                    const childName = parts.slice(1).join(' - ').trim();
                    if (!tree.has(parentName)) tree.set(parentName, { id: null, name: parentName, children: [] });
                    tree.get(parentName).children.push({ id: c.id, name: childName, fullName: c.name });
                } else {
                    // main category
                    const mainName = (c.name || '').trim();
                    if (!tree.has(mainName)) tree.set(mainName, { id: c.id, name: mainName, children: [] });
                    else if (tree.get(mainName).id == null) tree.get(mainName).id = c.id;
                }
            }

            // Render with the requested nested HTML structure
            for (const [, node] of Array.from(tree.entries()).sort((a,b)=> a[0].localeCompare(b[0]))) {
                const li = document.createElement('li');
                li.className = 'main-category';
                const parentKey = node.id ?? node.name;
                const childrenHTML = node.children
                    .sort((a,b)=> a.name.localeCompare(b.name))
                    .map(child => {
                        const childKey = child.id ?? child.fullName;
                        return `
                            <div class="subcategory-item">
                                <span class="subcategory-name"><i class="fas fa-folder-open"></i> ${child.name}</span>
                                <div class="subcategory-actions">
                                    <button onclick="showEditSubCategory('${childKey}')" class="category-btn warning btn-xsmall"><i class="fas fa-edit"></i></button>
                                    <button onclick="showDeleteConfirm('${childKey}')" class="category-btn danger btn-xsmall"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>`;
                    }).join('');

                li.innerHTML = `
                    <div class="category-header">
                        <div class="category-header-row">
                            <span class="category-name"><i class="fas fa-folder"></i> ${node.name}</span>
                            <div class="category-actions">
                                <button onclick="showEditCategory('${parentKey}')" class="category-btn warning btn-small"><i class="fas fa-edit"></i> تعديل</button>
                                <button onclick="showDeleteConfirm('${parentKey}')" class="category-btn danger btn-small"><i class="fas fa-trash"></i> حذف</button>
                                <button onclick="showAddSubCategory('${node.name}')" class="add-category-btn success btn-small"><i class="fas fa-plus"></i> إضافة فئة فرعية</button>
                            </div>
                        </div>
                        <div class="subcategories-row">
                            <div class="subcategories-grid">
                                ${childrenHTML}
                            </div>
                        </div>
                    </div>`;

                categoriesList.appendChild(li);
            }
        } else {
            categoriesList.innerHTML = '<li><p style="text-align: center; padding: 20px;">لا توجد فئات</p></li>';
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// ===== Suppliers =====
async function loadSuppliers() {
    try {
        const { data: suppliers, error } = await supabaseClient
            .from('suppliers')
            .select('id, name, country, rating, created_at');
        if (error) throw error;
        const list = document.getElementById('suppliersList');
        if (!list) return;
        list.innerHTML = '';
        if (!suppliers || suppliers.length === 0) {
            list.innerHTML = '<li style="text-align:center;padding:12px;">لا توجد بيانات موردين</li>';
            return;
        }

        suppliers.forEach(s => {
            const li = document.createElement('li');
            li.className = 'admin-list-item';
            li.innerHTML = `
                <div class="admin-item-header">
                    <div class="admin-item-info">
                        <span class="admin-item-title">${s.name || 'مورد'}</span>
                        <small class="admin-item-subtitle">${s.country || ''}</small>
                    </div>
                    <div class="admin-item-actions">
                        <button onclick="goSupplierDetails('${s.id}')" class="admin-btn info btn-small">
                            <i class="fas fa-info-circle"></i> تفاصيل المورد
                        </button>
                        <button onclick="goEditSupplier('${s.id}')" class="admin-btn warning btn-small">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button onclick="deleteSupplier('${s.id}', '${(s.name||'').replace(/['"\\]/g, '')}')" class="admin-btn danger btn-small">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
                <div class="admin-item-meta">
                    <span><i class="fas fa-star"></i> التقييم: ${s.rating ?? '—'}</span>
                    <span><i class="fas fa-calendar"></i> ${s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : ''}</span>
                </div>
            `;
            list.appendChild(li);
        });
    } catch (e) {
        console.error('loadSuppliers error:', e);
    }
}

// ===== Load Products =====
async function loadProducts() {
    try {
        const { data: products, error } = await supabaseClient
            .from('products')
            .select(`
                *,
                categories(name),
                users(username)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        const productsList = document.getElementById('productsList');
        if (!productsList) return;

        productsList.innerHTML = '';

        if (products && products.length > 0) {
            products.forEach(product => {
                const productItem = document.createElement('div');
                productItem.className = 'product-item';
                productItem.innerHTML = `
                    <div class="product-name">
                        <span>${product.name}</span>
                        <span class="product-serial">#${product.code || 'N/A'}</span>
                    </div>
                    <div class="product-category">${product.categories?.name || 'غير مصنف'}</div>
                    <div class="product-user">${product.users?.username || 'N/A'}</div>
                    <div class="product-actions">
                        <button onclick="viewProduct('${product.id}')" class="admin-btn info btn-xsmall">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                        <button onclick="goEditProduct('${product.id}')" class="admin-btn warning btn-xsmall">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button onclick="deleteProduct('${product.id}', '${product.name}')" class="admin-btn danger btn-xsmall">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                `;
                productsList.appendChild(productItem);
            });
        } else {
            productsList.innerHTML = '<div style="text-align: center; padding: 20px;">لا توجد منتجات</div>';
        }

    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// ===== User Actions =====
function goUserDetails(userId) {
    window.location.href = `single-user.html?id=${userId}`;
}

async function deleteUser(userId, username) {
    if (!confirm(`هل أنت متأكد من حذف المستخدم "${username}"؟\n\nتحذير: سيتم حذف جميع بيانات المستخدم بشكل نهائي.`)) {
        return;
    }

    try {
        // Delete from users table (Auth user will remain but won't have profile)
        const { error } = await supabaseClient
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        alert('✅ تم حذف المستخدم بنجاح');
        await loadUsers();
        await loadStatistics();

    } catch (error) {
        console.error('Error deleting user:', error);
        alert('❌ فشل في حذف المستخدم: ' + error.message);
    }
}

// ===== Category Actions =====
function editCategory(categoryId) {
    const newName = prompt('تعديل اسم الفئة:', '');
    if (!newName) return;
    supabaseClient.from('categories').update({ name: newName }).eq('id', categoryId)
        .then(async ({ error }) => {
            if (error) return alert('فشل تعديل الفئة: ' + error.message);
            alert('تم تعديل الفئة');
            await loadCategories();
            await loadStatistics();
        });
}

async function deleteCategory(categoryId, categoryName) {
    // تأكيد الحذف مع توضيح التأثير
    if (!confirm(`هل أنت متأكد من حذف الفئة "${categoryName}"؟\n\nسيتم:
- فك ربط المنتجات المرتبطة بهذه الفئة (تعيينها غير مصنفة)
- حذف الفئة الرئيسية
- حذف الفئات الفرعية باسم يبدأ بـ "${categoryName} - "`)) {
        return;
    }

    try {
        // 1) جلب الاسم إن لم يصل لتمكين حذف الفئات الفرعية بالاسم
        let finalName = categoryName;
        if (!finalName) {
            try {
                const { data } = await supabaseClient
                    .from('categories')
                    .select('name')
                    .eq('id', categoryId)
                    .single();
                finalName = data?.name || '';
            } catch {}
        }

        // 2) فك ربط المنتجات المرتبطة بهذه الفئة قبل الحذف لتفادي قيود العلاقات
        const { error: updErr } = await supabaseClient
            .from('products')
            .update({ category_id: null })
            .eq('category_id', categoryId);
        if (updErr) throw updErr;

        // 3) حذف الفئة الرئيسية + أي فئات فرعية على أساس نمط الاسم "الاسم - ..."
        // ملاحظة: نستخدم or مع ilike لدعم حذف الفئات الفرعية المبنية على التسمية
        let delQuery = supabaseClient
            .from('categories')
            .delete()
            .eq('id', categoryId);

        if (finalName) {
            // تنفيذ حذف إضافي للفئات الفرعية: name ilike 'finalName - %'
            const { error: subErr } = await supabaseClient
                .from('categories')
                .delete()
                .ilike('name', `${finalName} - %`);
            if (subErr) throw subErr;
        }

        const { error } = await delQuery;
        if (error) throw error;

        alert('✅ تم حذف الفئة وما يتبعها بنجاح');
        await loadCategories();
        await loadStatistics();

    } catch (error) {
        console.error('Error deleting category:', error);
        alert('❌ فشل في حذف الفئة: ' + error.message);
    }
}

// ===== Product Actions =====
function viewProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

function editProduct(productId) {
    window.location.href = `add-product.html?edit=${productId}`;
}

async function deleteProduct(productId, productName) {
    if (!confirm(`هل أنت متأكد من حذف المنتج "${productName}"؟`)) {
        return;
    }

    try {
        // 1) حذف صور المنتج المرتبطة (إن وجد جدول product_images)
        try {
            const { error: piErr } = await supabaseClient
                .from('product_images')
                .delete()
                .eq('product_id', productId);
            if (piErr) throw piErr;
        } catch (e) {
            console.warn('product_images cleanup warning:', e?.message || e);
        }

        // 2) حذف علاقات الموردين مع المنتج (product_suppliers)
        try {
            const { error: psErr } = await supabaseClient
                .from('product_suppliers')
                .delete()
                .eq('product_id', productId);
            if (psErr) throw psErr;
        } catch (e) {
            console.warn('product_suppliers cleanup warning:', e?.message || e);
        }

        // 3) حذف سجل المنتج
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) throw error;

        alert('✅ تم حذف المنتج بنجاح');
        await loadProducts();
        await loadStatistics();

    } catch (error) {
        console.error('Error deleting product:', error);
        alert('❌ فشل في حذف المنتج: ' + error.message);
    }
}

// Make functions global (guarded: some are defined inside DOMContentLoaded scope)
if (typeof goUserDetails !== 'undefined') window.goUserDetails = goUserDetails;
if (typeof deleteUser !== 'undefined') window.deleteUser = deleteUser;
if (typeof editCategory !== 'undefined') window.editCategory = editCategory;
if (typeof deleteCategory !== 'undefined') window.deleteCategory = deleteCategory;
if (typeof viewProduct !== 'undefined') window.viewProduct = viewProduct;
if (typeof editProduct !== 'undefined') window.editProduct = editProduct;
if (typeof deleteProduct !== 'undefined') window.deleteProduct = deleteProduct;
if (typeof goSupplierDetails !== 'undefined') window.goSupplierDetails = goSupplierDetails;
if (typeof deleteSupplier !== 'undefined') window.deleteSupplier = deleteSupplier;
window.goEditSupplier = function(supplierId){ if (!supplierId) return; window.location.href = `add-supplier.html?id=${supplierId}`; }
if (typeof addCategory !== 'undefined') window.addCategory = addCategory;
if (typeof createBackup !== 'undefined') window.createBackup = createBackup;
if (typeof downloadBackup !== 'undefined') window.downloadBackup = downloadBackup;
if (typeof clearAllData !== 'undefined') window.clearAllData = clearAllData;
if (typeof exportCSVBackup !== 'undefined') window.exportCSVBackup = exportCSVBackup;
if (typeof exportNDJSONBackup !== 'undefined') window.exportNDJSONBackup = exportNDJSONBackup;
if (typeof copyBackupToClipboard !== 'undefined') window.copyBackupToClipboard = copyBackupToClipboard;
if (typeof exportZipBackup !== 'undefined') window.exportZipBackup = exportZipBackup;
if (typeof honorUser !== 'undefined') window.honorUser = honorUser;
if (typeof loadMembershipRequests !== 'undefined') window.loadMembershipRequests = loadMembershipRequests;
if (typeof approveMembershipRequest !== 'undefined') window.approveMembershipRequest = approveMembershipRequest;
if (typeof deleteMembershipRequest !== 'undefined') window.deleteMembershipRequest = deleteMembershipRequest;
