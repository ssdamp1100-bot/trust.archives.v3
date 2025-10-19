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

            // 2. Upload all files first
            const tempId = `prod_${Date.now()}`;
            const imageFiles = Array.from(document.getElementById('productImages')?.files || []);
            const extraFiles = Array.from(document.getElementById('productExtraFiles')?.files || []);
            const catalogFile = document.getElementById('productCatalogPdf')?.files?.[0] || null;
            const supplierPdfFile = document.getElementById('mainSupplierPdf')?.files[0] || null;

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
            if (supplierPdfFile) {
                extraUploadPromises.push(
                    uploadFile(supplierPdfFile, 'product-documents', tempId).then(url => ({ url, type: 'supplier_pdf' }))
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
                status: getRadioValue('productStatus') || 'active',
                visibility: getRadioValue('productVisibility') || 'public',
                features: getDynamicValues('featuresContainer'),
                keywords: getDynamicValues('keywordsContainer'),
                notes: document.getElementById('productNotes').value?.trim(),
                brand: document.getElementById('productBrand').value?.trim(),
                model: document.getElementById('productModel').value?.trim(),
                category_id: categoryId
            };

            // 5. Create product and related records in a single service call
            const result = await window.productsService.createProductWithDetails({
                productData,
                images: uploadedImages,
                files: uploadedDocs,
                catalog: uploadedCatalog[0] || null, // Only one catalog per product
                supplier: {
                    id: document.getElementById('mainSupplierSelect').value,
                    customName: document.getElementById('mainSupplierCustom')?.value?.trim(),
                    link: document.getElementById('mainSupplierLink')?.value?.trim(),
                    priceUSD: parseNumber(document.getElementById('supplierPriceUSD')?.value),
                    priceCNY: parseNumber(document.getElementById('supplierPriceCNY')?.value),
                    priceYER: parseNumber(document.getElementById('supplierPriceYER')?.value),
                }
            });

            if (!result.success) {
                throw new Error(result.error || 'فشل حفظ المنتج وتفاصيله.');
            }

            // 6. Success
            formMessage.textContent = 'تم حفظ المنتج بنجاح! سيتم نقلك إلى لوحة المنتجات.';
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
