document.addEventListener('DOMContentLoaded', async () => {
    // Page protection
    if (!window.authService.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    const productForm = document.getElementById('productForm');
    const saveButton = document.getElementById('save-product-btn');
    const formMessage = document.getElementById('form-message');
    const categoryInput = document.getElementById('productCategory');
    const categoryDatalist = document.getElementById('productCategoryList');
    const subcategoryInput = document.getElementById('productSubCategory');
    const subcategoryDatalist = document.getElementById('productSubCategoryList');

    // === تفعيل الحفظ التلقائي ===
    let autoSave = null;
    if (window.FormAutoSave) {
        autoSave = new window.FormAutoSave('productForm', {
            saveDelay: 1000,
            excludeFields: ['productImages', 'productExtraFiles', 'productCatalogPdf', 'mainSupplierPdf'] // لا نحفظ الملفات
        });
    }

    // --- Helper Functions ---
    const getRadioValue = (name) => productForm.querySelector(`input[type="radio"][name="${name}"]:checked`)?.value || null;
    const getCheckboxValues = (selector) => Array.from(productForm.querySelectorAll(selector + ':checked')).map(i => i.value);
    const getDynamicValues = (containerId) => Array.from(document.querySelectorAll(`#${containerId} .product-field-input`)).map(i => i.value.trim()).filter(Boolean);
    const parseNumber = (v) => {
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
    };

    

    // --- Categories: load and bind to datalists ---
    const categoriesTree = new Map(); // parentName -> Set(children)
    async function loadCategoriesToDatalists() {
        try {
            const { data, error } = await supabaseClient
                .from('categories')
                .select('name')
                .order('name');
            if (error) throw error;
            categoriesTree.clear();
            (data||[]).forEach(row => {
                const name = (row.name||'').trim();
                if (!name) return;
                const parts = name.split(' - ');
                if (parts.length > 1) {
                    const parent = parts[0].trim();
                    const child = parts.slice(1).join(' - ').trim();
                    if (!categoriesTree.has(parent)) categoriesTree.set(parent, new Set());
                    categoriesTree.get(parent).add(child);
                } else {
                    if (!categoriesTree.has(name)) categoriesTree.set(name, new Set());
                }
            });

            if (categoryDatalist) {
                categoryDatalist.innerHTML = '';
                Array.from(categoriesTree.keys()).sort((a,b)=>a.localeCompare(b)).forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p; categoryDatalist.appendChild(opt);
                });
            }
            populateSubcategories();
        } catch (e) {
            console.warn('loadCategoriesToDatalists error:', e);
        }
    }

    function populateSubcategories() {
        if (!subcategoryDatalist) return;
        subcategoryDatalist.innerHTML = '';
        const parent = (categoryInput?.value||'').trim();
        const children = categoriesTree.get(parent);
        if (children && children.size) {
            Array.from(children).sort((a,b)=>a.localeCompare(b)).forEach(ch => {
                const opt = document.createElement('option');
                opt.value = ch; subcategoryDatalist.appendChild(opt);
            });
        }
    }

    categoryInput?.addEventListener('change', populateSubcategories);
    categoryInput?.addEventListener('input', populateSubcategories);

    await loadCategoriesToDatalists();

    // === وضع التعديل: تحميل المنتج إن وُجد id في الرابط ===
    const qs = new URLSearchParams(window.location.search);
    const editProductId = qs.get('id');
    let existingProduct = null;

    async function populateFormFromProduct(p){
        try{
            existingProduct = p;
            // أساسية
            document.getElementById('productName').value = p.name || '';
            document.getElementById('productDescription').value = p.description || '';
            document.getElementById('productBrand').value = p.brand || '';
            document.getElementById('productModel').value = p.model || '';
            // الفئات
            if (p.categories?.name){
                const parts = String(p.categories.name).split(' - ');
                categoryInput.value = parts[0] || '';
                populateSubcategories();
                subcategoryInput.value = parts.slice(1).join(' - ');
            }
            // تفاصيل
            document.getElementById('productWeight').value = p.weight ?? '';
            if (p.dimensions){
                const [L,W,H] = String(p.dimensions).split('x');
                document.getElementById('productLength').value = L || '';
                document.getElementById('productWidth').value = W || '';
                document.getElementById('productHeight').value = H || '';
            }
            document.getElementById('productColor').value = p.color || '';
            document.getElementById('productMaterial').value = p.material || '';
            document.getElementById('productWarranty').value = p.warranty || '';
            document.getElementById('productOrigin').value = p.origin_country || '';
            // قوائم ديناميكية
            const fillDynamic = (containerId, list)=>{
                const cont = document.getElementById(containerId);
                if (!cont) return;
                (list||[]).forEach(val => {
                    if (!val) return;
                    const el = document.createElement('div');
                    el.className='product-field-group';
                    el.innerHTML = `<span style="flex:1;">${val}</span><button type="button" class="product-remove-btn" onclick="this.parentElement.remove()"><i class=\"fas fa-trash\"></i></button>`;
                    cont.insertBefore(el, cont.firstChild);
                });
            };
            const split = (s)=> typeof s==='string'? s.split(/\n|,/).map(x=>x.trim()).filter(Boolean): Array.isArray(s)? s: [];
            fillDynamic('usagesContainer', split(p.usages));
            fillDynamic('featuresContainer', split(p.features));
            fillDynamic('negativePointsContainer', split(p.negative_points));
            // جمهور مستهدف
            split(p.target_audience).forEach(v=>{
                const cb = productForm.querySelector(`input[name="targetAudience"][value="${v}"]`);
                if (cb) cb.checked = true; else {
                    const custom = document.getElementById('customTargetAudience');
                    if (custom && !custom.value) custom.value = v;
                }
            });
            // تسعير
            document.getElementById('productCost').value = p.cost_price ?? '';
            document.getElementById('productPrice').value = p.selling_price ?? '';
            document.getElementById('productDiscount').value = p.discount_percent ?? '';
            document.getElementById('productTax').value = p.tax_percent ?? '';
            // روابط
            const linkEl = document.getElementById('productLink'); if (linkEl) linkEl.value = p.product_link || '';
            document.getElementById('productVideo').value = p.video_url || '';

            // عرض الصور الحالية (قراءة فقط مع ملاحظة الحذف لاحقاً)
            const previews = document.getElementById('imagePreviews');
            if (previews && Array.isArray(p.product_images)){
                previews.innerHTML = '';
                p.product_images.forEach((img, idx)=>{
                    const div = document.createElement('div');
                    div.className = 'product-image-preview';
                    div.innerHTML = `
                        <img src="${img.image_url}" alt="image">
                        <button type="button" class="product-image-remove" data-existing-image="${encodeURIComponent(img.image_url)}"><i class="fas fa-trash"></i></button>
                    `;
                    previews.appendChild(div);
                });
                // حذف فوري للصورة من القاعدة عند النقر
                previews.addEventListener('click', async (ev)=>{
                    const btn = ev.target.closest('[data-existing-image]');
                    if (!btn) return;
                    const url = decodeURIComponent(btn.getAttribute('data-existing-image'));
                    if (!confirm('حذف هذه الصورة؟')) return;
                    try{
                        await supabaseClient.from('product_images').delete().eq('product_id', p.id).eq('image_url', url);
                        btn.parentElement.remove();
                    }catch(e){ alert('فشل حذف الصورة'); }
                });
            }

            // عرض الملفات الحالية مع زر حذف
            const extraList = document.getElementById('extraFilesList');
            if (extraList && Array.isArray(p.product_files)){
                extraList.innerHTML = '';
                p.product_files.forEach(f=>{
                    const li = document.createElement('li');
                    li.style.marginBottom = '6px';
                    li.innerHTML = `<i class="fas fa-file" style="margin-left:6px; color: var(--primary-color);"></i>${(f.file_type||'ملف')} - ${f.file_url} <button type="button" class="product-remove-btn" data-existing-file="${encodeURIComponent(f.file_url)}"><i class="fas fa-trash"></i></button>`;
                    extraList.appendChild(li);
                });
                extraList.addEventListener('click', async (ev)=>{
                    const btn = ev.target.closest('[data-existing-file]');
                    if (!btn) return;
                    const url = decodeURIComponent(btn.getAttribute('data-existing-file'));
                    if (!confirm('حذف هذا الملف؟')) return;
                    try{
                        await supabaseClient.from('product_files').delete().eq('product_id', p.id).eq('file_url', url);
                        btn.parentElement.remove();
                    }catch(e){ alert('فشل حذف الملف'); }
                });
            }

            // زر الحفظ
            if (saveButton) saveButton.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
        }catch(e){ console.warn('populateFormFromProduct error:', e); }
    }

    if (editProductId){
        try{
            const res = await window.productsService.getProductById(editProductId);
            if (res?.success && res.product){ await populateFormFromProduct(res.product); }
        }catch(e){ console.warn('load product for edit failed', e); }
    }

    // === تحميل قائمة الموردين للقائمة المنسدلة في النموذج ===
    async function loadSuppliersOptions() {
        try {
            const select = document.getElementById('mainSupplierSelect');
            if (!select || !window.suppliersService) return;
            const res = await window.suppliersService.getSuppliers();
            const list = res?.suppliers || [];
            window.__suppliersCache = list;
            // احفظ الخيارين الأول والأخير
            const customOpt = select.querySelector('option[value="custom"]');
            const firstOpt = select.querySelector('option[value=""]');
            // امسح الباقي
            select.innerHTML = '';
            if (firstOpt) select.appendChild(firstOpt);
            // أضف الموردين
            list.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name + (s.country ? ` - ${s.country}` : '');
                select.appendChild(opt);
            });
            if (customOpt) select.appendChild(customOpt);
        } catch(e) { console.warn('loadSuppliersOptions error:', e); }
    }

    // اجعل الدالة متاحة عالمياً لتعبئة أي select جديد يُنشأ ديناميكياً
    window.populateSupplierSelect = function(selectEl){
        try {
            const list = window.__suppliersCache || [];
            if (!selectEl) return;
            // احتفظ بأول خيار فارغ إن وجد
            const firstOpt = selectEl.querySelector('option[value=""]');
            const customOpt = Array.from(selectEl.options).find(o=>o.value==='custom');
            selectEl.innerHTML = '';
            if (firstOpt) selectEl.appendChild(firstOpt);
            list.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name + (s.country ? ` - ${s.country}` : '');
                selectEl.appendChild(opt);
            });
            if (customOpt) selectEl.appendChild(customOpt);
        } catch(e) { console.warn('populateSupplierSelect error:', e); }
    };

    // حمّل الموردين واملأ القائمة الرئيسية
    await loadSuppliersOptions();

    // لفّ دالة إضافة مورد ديناميكياً لملء القوائم الجديدة أيضاً
    try {
        const origAddSupplier = window.addSupplier;
        if (typeof origAddSupplier === 'function') {
            window.addSupplier = function() {
                const beforeCount = (document.getElementById('suppliersContainer')?.children.length) || 0;
                origAddSupplier();
                // بعد الإضافة، حاول تعبئة آخر select تم إنشاؤه
                setTimeout(()=>{
                    const container = document.getElementById('suppliersContainer');
                    const selects = container ? container.querySelectorAll('select.product-form-select') : [];
                    const lastSelect = selects[selects.length-1];
                    if (lastSelect) window.populateSupplierSelect(lastSelect);
                }, 0);
            };
        }
    } catch(e) { console.warn('wrap addSupplier error:', e); }

    /**
     * Uploads a single file to a specified Supabase storage bucket.
     * @param {File} file - The file to upload.
     * @param {string} bucket - The name of the storage bucket.
     * @param {string} prefix - A prefix for the file path (e.g., product ID).
     * @returns {Promise<string>} - The public URL of the uploaded file.
     */
    async function uploadFile(file, bucket, prefix) {
        const fileExt = file.name.split('.').pop();
        // Generate unique filename with timestamp + random string to avoid collisions
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileName = `${prefix}_${Date.now()}_${randomStr}.${fileExt}`;
        const filePath = `${prefix}/${fileName}`;

        const { error } = await supabaseClient.storage.from(bucket).upload(filePath, file, {
            upsert: false // Don't overwrite if exists (should never happen with unique names)
        });
        if (error) {
            throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        const { data } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);
        if (!data.publicUrl) {
            throw new Error(`Could not get public URL for ${file.name}`);
        }
        return data.publicUrl;
    }

    // --- Main Form Submission Logic ---
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (saveButton.disabled) return;

        saveButton.disabled = true;
        saveButton.innerHTML = 'جاري الحفظ... <span class="loading-spinner"></span>';
        formMessage.classList.add('hidden');

        try {
            // 1. Basic data validation
            const productName = document.getElementById('productName').value?.trim();
            if (!productName) {
                throw new Error('اسم المنتج حقل مطلوب.');
            }

            // 2. Upload new files first (الملفات الجديدة فقط)
            const tempId = `prod_${Date.now()}`;
            const imageFiles = Array.from(document.getElementById('productImages')?.files || []);
            const extraFiles = Array.from(document.getElementById('productExtraFiles')?.files || []);
            const catalogFile = document.getElementById('productCatalogPdf')?.files?.[0] || null;

            const imageUploadPromises = imageFiles.map((file, index) => 
                uploadFile(file, 'product-images', tempId).then(url => ({ url, is_primary: index === 0 }))
            );
            const extraUploadPromises = extraFiles.map(file => 
                uploadFile(file, 'product-documents', tempId).then(url => ({ url, type: 'extra' }))
            );
            const catalogUploadPromises = [];
            if (catalogFile) {
                catalogUploadPromises.push(
                    uploadFile(catalogFile, 'product-documents', tempId).then(url => ({ url, type: 'catalog_pdf' }))
                );
            }

            const uploadedImages = await Promise.all(imageUploadPromises);
            const uploadedCatalog = catalogUploadPromises.length > 0 ? await Promise.all(catalogUploadPromises) : [];
            const uploadedDocs = await Promise.all(extraUploadPromises);

            // 3. Resolve category_id (use subcategory if present, otherwise parent). Insert if missing.
            async function ensureCategoryId(parentName, childName) {
                const parent = (parentName||'').trim();
                const child = (childName||'').trim();
                const finalName = child ? `${parent} - ${child}` : parent;
                if (!finalName) return null;
                const { data: found, error: selErr } = await supabaseClient.from('categories').select('id').eq('name', finalName).single();
                if (!selErr && found?.id) return found.id;
                // if not found, create it (and parent if needed)
                if (child && parent && !categoriesTree.has(parent)) {
                    await supabaseClient.from('categories').insert([{ name: parent }]);
                }
                const { data: ins, error: insErr } = await supabaseClient.from('categories').insert([{ name: finalName }]).select('id').single();
                if (insErr) throw new Error('فشل إنشاء الفئة: ' + insErr.message);
                try { await loadCategoriesToDatalists(); } catch {}
                return ins?.id || null;
            }

            const parentCat = categoryInput?.value || '';
            const subCat = subcategoryInput?.value || '';
            const categoryId = await ensureCategoryId(parentCat, subCat);

            // 4. Collect all other form data (assign product code here if DB has no default)

            // احصل على كود المنتج التالي تلقائياً بدءاً من 101
            async function getNextProductCode() {
                try {
                    // اجلب آخر 500 كود ورتّب زمنياً
                    const { data, error } = await supabaseClient
                        .from('products')
                        .select('code, created_at')
                        .order('created_at', { ascending: false })
                        .limit(500);
                    if (error) throw error;
                    let maxNum = 100; // الأساس قبل 101
                    (data||[]).forEach(r => {
                        const n = parseInt(String(r.code||'').trim(), 10);
                        if (!isNaN(n) && n > maxNum) maxNum = n;
                    });
                    const next = Math.max(101, maxNum + 1);
                    return String(next);
                } catch(e) {
                    console.warn('getNextProductCode error:', e);
                    return '101';
                }
            }

            const autoCode = editProductId ? (existingProduct?.code || (await getNextProductCode())) : await getNextProductCode();

            const productData = {
                name: productName,
                description: document.getElementById('productDescription').value?.trim(),
                weight: parseNumber(document.getElementById('productWeight').value),
                dimensions: [document.getElementById('productLength')?.value, document.getElementById('productWidth')?.value, document.getElementById('productHeight')?.value].filter(Boolean).join('x') || null,
                color: document.getElementById('productColor').value?.trim() || null,
                material: document.getElementById('productMaterial').value?.trim() || null,
                warranty: document.getElementById('productWarranty').value?.trim() || null,
                origin_country: document.getElementById('productOrigin').value?.trim() || null,
                cost_price: parseNumber(document.getElementById('productCost').value),
                selling_price: parseNumber(document.getElementById('productPrice').value),
                // حالة المنتج أزيلت من النموذج؛ سنستخدم قيمة افتراضية
                status: 'available',
                visibility: getRadioValue('productVisibility') || 'public',
                features: getDynamicValues('featuresContainer').join('\n') || null,
                brand: document.getElementById('productBrand').value?.trim(),
                model: document.getElementById('productModel').value?.trim(),
                category_id: categoryId,
                code: autoCode,
                // إدارة المخزون أزيلت من النموذج
                discount_percent: parseNumber(document.getElementById('productDiscount')?.value),
                tax_percent: parseNumber(document.getElementById('productTax')?.value),
                product_link: document.getElementById('productLink')?.value?.trim() || null,
                video_url: document.getElementById('productVideo')?.value?.trim() || null,
                usages: getDynamicValues('usagesContainer').join('\n') || null,
                target_audience: (() => {
                    const predefined = getCheckboxValues('input[name="targetAudience"]').filter(Boolean);
                    const custom = document.getElementById('customTargetAudience')?.value?.trim();
                    const list = custom ? [...predefined, custom] : predefined;
                    return list.length ? list.join('\n') : null;
                })(),
                negative_points: getDynamicValues('negativePointsContainer').join('\n') || null
            };

            // 5. Create product and related records in a single service call
            let result;
            if (editProductId){
                // تحديث المنتج الرئيسي
                const upd = await window.productsService.updateProduct(editProductId, productData);
                if (!upd.success) throw new Error(upd.error||'فشل تحديث المنتج');
                // إدراج المرفوعات الجديدة (صور/ملفات/كاتلوج)
                if (uploadedImages.length>0){
                    const records = uploadedImages.map(img=>({ product_id: editProductId, image_url: img.url, is_primary: img.is_primary }));
                    const { error } = await supabaseClient.from('product_images').insert(records);
                    if (error) throw error;
                }
                if (uploadedDocs.length>0){
                    const records = uploadedDocs.map(f=>({ product_id: editProductId, file_url: f.url, file_type: f.type }));
                    const { error } = await supabaseClient.from('product_files').insert(records);
                    if (error) throw error;
                }
                if (uploadedCatalog[0]){
                    const cat = { product_id: editProductId, catalog_url: uploadedCatalog[0].url, catalog_name: (window.productsService.getFileNameFromUrl(uploadedCatalog[0].url) || 'catalog.pdf'), uploaded_by: window.authService?.getCurrentUser()?.id || null };
                    const { error } = await supabaseClient.from('product_catalogs').insert([cat]);
                    if (error) throw error;
                }
                // المورّد (اختياري): إذا تم اختيار مورد أو اسم مخصص، سنضيف سجلًا جديدًا
                const supplierIdVal = document.getElementById('mainSupplierSelect')?.value;
                const supplierCustom = document.getElementById('mainSupplierCustom')?.value?.trim();
                const priceUSDVal = parseNumber(document.getElementById('supplierPriceUSD')?.value);
                if (supplierIdVal || supplierCustom || priceUSDVal!=null){
                    const notes = JSON.stringify({ prices: { USD: priceUSDVal } });
                    const rec = { product_id: editProductId, supplier_id: (supplierIdVal && supplierIdVal!=='custom')? supplierIdVal : null, supplier_name: (supplierIdVal==='custom')? supplierCustom : null, notes };
                    const { error } = await supabaseClient.from('product_suppliers').insert([rec]);
                    if (error) throw error;
                }
                result = { success: true, product: { id: editProductId } };
            } else {
                result = await window.productsService.createProductWithDetails({
                    productData,
                    images: uploadedImages,
                    files: uploadedDocs,
                    catalog: uploadedCatalog[0] || null, // Only one catalog per product
                    supplier: {
                        id: document.getElementById('mainSupplierSelect').value,
                        customName: document.getElementById('mainSupplierCustom')?.value?.trim(),
                        priceUSD: parseNumber(document.getElementById('supplierPriceUSD')?.value),
                    }
                });
            }

            if (!result.success) {
                throw new Error(result.error || 'فشل حفظ المنتج وتفاصيله.');
            }

            // 6. Success
            formMessage.textContent = editProductId ? 'تم حفظ التعديلات بنجاح! سيتم نقلك إلى لوحة المنتجات.' : 'تم حفظ المنتج بنجاح! سيتم نقلك إلى لوحة المنتجات.';
            formMessage.className = 'form-message success';
            
            // مسح البيانات المحفوظة تلقائياً
            if (autoSave) autoSave.clearSavedData();
            
            productForm.reset();
            window.location.href = 'products-board.html';

        } catch (error) {
            formMessage.textContent = error.message;
            formMessage.className = 'form-message error';
        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج';
            formMessage.classList.remove('hidden');
        }
    });
});
