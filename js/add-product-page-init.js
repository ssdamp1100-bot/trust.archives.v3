        // Image upload and preview functionality
        const productImagesInput = document.getElementById('productImages');
        const imagePreviews = document.getElementById('imagePreviews');
        const fileCount = document.getElementById('fileCount');
        
        productImagesInput.addEventListener('change', function() {
            imagePreviews.innerHTML = '';
            const files = this.files;
            fileCount.textContent = files.length;
            
            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.type.match('image.*')) {
                        const reader = new FileReader();
                        
                        reader.onload = function(e) {
                            const preview = document.createElement('div');
                            preview.className = 'product-image-preview';
                            preview.innerHTML = `
                                <img src="${e.target.result}" alt="${file.name}">
                                <button type="button" class="product-image-remove" onclick="removeImage(${i})">
                                    <i class="fas fa-times"></i>
                                </button>
                            `;
                            imagePreviews.appendChild(preview);
                        }
                        
                        reader.readAsDataURL(file);
                    }
                }
            }
        });
        
        function removeImage(index) {
            // Create a new DataTransfer object to manage files
            const dt = new DataTransfer();
            const files = productImagesInput.files;
            
            // Add all files except the one to remove
            for (let i = 0; i < files.length; i++) {
                if (i !== index) {
                    dt.items.add(files[i]);
                }
            }
            
            // Update the file input
            productImagesInput.files = dt.files;
            
            // Trigger the change event to update previews
            const event = new Event('change');
            productImagesInput.dispatchEvent(event);
        }
        
        // Usage functionality
        // قسم عناصر النص الديناميكي: إنشاء DOM آمن بدلاً من innerHTML
        function addUsage() {
            const usagesContainer = document.getElementById('usagesContainer');
            const input = usagesContainer.querySelector('.product-field-input');
            const usage = input.value.trim();
            
            if (usage) {
                const usageElement = document.createElement('div');
                usageElement.className = 'product-field-group';
                const span = document.createElement('span');
                span.style.flex = '1';
                span.textContent = usage;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'product-remove-btn';
                btn.innerHTML = '<i class="fas fa-trash"></i>';
                btn.onclick = function(){ removeUsage(btn); };
                usageElement.appendChild(span);
                usageElement.appendChild(btn);
                
                usagesContainer.insertBefore(usageElement, usagesContainer.firstChild);
                input.value = '';
            }
        }
        
        function removeUsage(button) {
            button.parentElement.remove();
        }
        
        // Features functionality
        function addFeature() {
            const featuresContainer = document.getElementById('featuresContainer');
            const input = featuresContainer.querySelector('.product-field-input');
            const feature = input.value.trim();
            
            if (feature) {
                const featureElement = document.createElement('div');
                featureElement.className = 'product-field-group';
                const span = document.createElement('span');
                span.style.flex = '1';
                span.textContent = feature;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'product-remove-btn';
                btn.innerHTML = '<i class="fas fa-trash"></i>';
                btn.onclick = function(){ removeFeature(btn); };
                featureElement.appendChild(span);
                featureElement.appendChild(btn);
                
                featuresContainer.insertBefore(featureElement, featuresContainer.firstChild);
                input.value = '';
            }
        }
        
        function removeFeature(button) {
            button.parentElement.remove();
        }
        
        // Negative points functionality
        function addNegativePoint() {
            const negativePointsContainer = document.getElementById('negativePointsContainer');
            const input = negativePointsContainer.querySelector('.product-field-input');
            const negativePoint = input.value.trim();
            
            if (negativePoint) {
                const negativePointElement = document.createElement('div');
                negativePointElement.className = 'product-field-group';
                const span = document.createElement('span');
                span.style.flex = '1';
                span.textContent = negativePoint;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'product-remove-btn';
                btn.innerHTML = '<i class="fas fa-trash"></i>';
                btn.onclick = function(){ removeNegativePoint(btn); };
                negativePointElement.appendChild(span);
                negativePointElement.appendChild(btn);
                
                negativePointsContainer.insertBefore(negativePointElement, negativePointsContainer.firstChild);
                input.value = '';
            }
        }
        
        function removeNegativePoint(button) {
            button.parentElement.remove();
        }
        
        // Keywords functionality
        function addKeyword() {
            const keywordsContainer = document.getElementById('keywordsContainer');
            const input = keywordsContainer.querySelector('.product-field-input');
            const keyword = input.value.trim();
            
            if (keyword) {
                const keywordElement = document.createElement('div');
                keywordElement.className = 'product-field-group';
                const span = document.createElement('span');
                span.style.flex = '1';
                span.textContent = keyword;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'product-remove-btn';
                btn.innerHTML = '<i class="fas الفa-trash"></i>';
                btn.onclick = function(){ removeKeyword(btn); };
                keywordElement.appendChild(span);
                keywordElement.appendChild(btn);
                
                keywordsContainer.insertBefore(keywordElement, keywordsContainer.firstChild);
                input.value = '';
            }
        }
        
        function removeKeyword(button) {
            button.parentElement.remove();
        }
        
        // Custom supplier functionality
        function toggleCustomSupplier(type) {
            const selectElement = document.getElementById(type + 'SupplierSelect');
            const customInput = document.getElementById(type + 'SupplierCustom');
            
            if (selectElement.value === 'custom') {
                customInput.style.display = 'block';
            } else {
                customInput.style.display = 'none';
            }
        }
        
        // Suppliers functionality
        function addSupplier() {
            const suppliersContainer = document.getElementById('suppliersContainer');
            const supplierCount = suppliersContainer.children.length + 1;
            
            const supplierElement = document.createElement('div');
            supplierElement.className = 'product-supplier-card';
            supplierElement.innerHTML = `
                <div class="product-supplier-header">
                    <h3 class="product-supplier-title"><i class="fas fa-truck"></i> مورد إضافي #${supplierCount}</h3>
                    <button type="button" class="product-remove-btn" onclick="removeSupplier(this)">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="product-form-grid">
                    <div class="product-form-group">
                        <label class="product-form-label">
                            <i class="fas fa-store"></i> اسم المورد
                        </label>
                        <select class="product-form-select" onchange="toggleCustomSupplier('additional${supplierCount}')">
                            <option value="">اختر من الموردين</option>
                            <option value="1">شركة التقنية الحديثة</option>
                            <option value="2">مجموعة الهواتف الذكية</option>
                            <option value="3">شركة الصوتيات المتقدمة</option>
                            <option value="custom">آخر اكتبه</option>
                        </select>
                        <input type="text" id="additional${supplierCount}SupplierCustom" class="product-form-input" placeholder="أدخل اسم المورد الجديد" style="display: none; margin-top: 10px;">
                    </div>
                    
                    <div class="product-form-group">
                        <label class="product-form-label">
                            <i class="fas fa-link"></i> رابط المنتج
                        </label>
                        <input type="url" class="product-form-input" placeholder="https://example.com/product">
                    </div>
                    
                    <div class="product-form-group">
                        <label class="product-form-label">
                            <i class="fas fa-file-pdf"></i> ملف PDF
                        </label>
                        <div class="product-file-container">
                            <input type="file" id="additional${supplierCount}SupplierPdf" class="product-file-input" accept=".pdf">
                            <label for="additional${supplierCount}SupplierPdf" class="product-file-label" style="min-height: auto; padding: 10px;">
                                <i class="fas fa-file-upload"></i> رفع ملف PDF
                            </label>
                        </div>
                    </div>
                </div>
                
                <h4 class="product-form-label"><i class="fas fa-money-bill"></i> الأسعار</h4>
                <div class="product-price-grid">
                    <div class="product-price-group">
                        <span class="product-price-label">سعر USD</span>
                        <div class="product-price-input">
                            <span class="product-currency">$</span>
                            <input type="number" class="product-form-input" placeholder="0.00" step="0.01" min="0">
                        </div>
                    </div>
                    
                    <div class="product-price-group">
                        <span class="product-price-label">سعر CNY</span>
                        <div class="product-price-input">
                            <span class="product-currency">¥</span>
                            <input type="number" class="product-form-input" placeholder="0.00" step="0.01" min="0">
                        </div>
                    </div>
                    
                    <div class="product-price-group">
                        <span class="product-price-label">سعر YER</span>
                        <div class="product-price-input">
                            <span class="product-currency">ر.ي</span>
                            <input type="number" class="product-form-input" placeholder="0.00" step="0.01" min="0">
                        </div>
                    </div>
                </div>
            `;
            
            suppliersContainer.appendChild(supplierElement);
        }
        
        function removeSupplier(button) {
            if (document.getElementById('suppliersContainer').children.length > 1) {
                button.closest('.product-supplier-card').remove();
            } else {
                alert('يجب أن يكون هناك مورد واحد على الأقل');
            }
        }
        
        // Catalog PDF (single file) preview and remove
        (function(){
            const catalogInput = document.getElementById('productCatalogPdf');
            const removeBtn = document.getElementById('removeCatalogBtn');
            const infoBox = document.getElementById('catalogInfo');
            const nameEl = document.getElementById('catalogName');
            const sizeEl = document.getElementById('catalogSize');
            if (catalogInput) {
                catalogInput.addEventListener('change', function(){
                    const f = this.files && this.files[0];
                    if (f) {
                        nameEl.textContent = f.name;
                        sizeEl.textContent = `(${Math.ceil(f.size/1024)} KB)`;
                        infoBox.style.display = '';
                        removeBtn.style.display = '';
                    } else {
                        infoBox.style.display = 'none';
                        removeBtn.style.display = 'none';
                        nameEl.textContent = '';
                        sizeEl.textContent = '';
                    }
                });
            }
            if (removeBtn) {
                removeBtn.addEventListener('click', function(){
                    if (!catalogInput) return;
                    // Clear selected file
                    catalogInput.value = '';
                    infoBox.style.display = 'none';
                    removeBtn.style.display = 'none';
                    nameEl.textContent = '';
                    sizeEl.textContent = '';
                });
            }
        })();

        // Extra files selection preview
        (function(){
            const extraInput = document.getElementById('productExtraFiles');
            const countEl = document.getElementById('extraFilesCount');
            const listEl = document.getElementById('extraFilesList');
            if (extraInput) {
                extraInput.addEventListener('change', function(){
                    const files = Array.from(this.files || []);
                    countEl.textContent = files.length;
                    listEl.innerHTML = '';
                    files.forEach(file => {
                        const li = document.createElement('li');
                        li.style.marginBottom = '6px';
                        const icon = document.createElement('i');
                        icon.className = 'fas fa-file';
                        icon.style.marginLeft = '6px';
                        icon.style.color = 'var(--primary-color)';
                        const nameNode = document.createTextNode(file.name + ' ');
                        const size = document.createElement('small');
                        size.style.color = '#6b7280';
                        size.textContent = `(${Math.ceil(file.size/1024)} KB)`;
                        li.appendChild(icon);
                        li.appendChild(nameNode);
                        li.appendChild(size);
                        listEl.appendChild(li);
                    });
                });
            }
        })();

        // Fallback: ensure clicking any label with 'for' triggers its hidden file input
        document.querySelectorAll('.product-file-label[for]').forEach(lbl => {
            lbl.addEventListener('click', function(ev){
                const targetId = this.getAttribute('for');
                const input = document.getElementById(targetId);
                if (input && input.type === 'file') {
                    ev.preventDefault();
                    input.click();
                }
            });
        });
