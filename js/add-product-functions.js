// Add Product Functions - وظائف إضافة منتج

// إظهار/إخفاء حقل المورد المخصص
function toggleCustomSupplier(prefix) {
    const selectElement = document.querySelector(`#${prefix}Supplier`) || document.querySelector(`select[onchange*="${prefix}"]`);
    const customInput = document.getElementById(`${prefix}SupplierCustom`);

    if (!selectElement || !customInput) return;

    if (selectElement.value === 'custom') {
        customInput.style.display = 'block';
    } else {
        customInput.style.display = 'none';
    }
}

// إضافة مورد إضافي
function addSupplier() {
    const suppliersContainer = document.getElementById('suppliersContainer');
    if (!suppliersContainer) return;

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

// إزالة مورد
function removeSupplier(button) {
    const container = document.getElementById('suppliersContainer');
    if (container && container.children.length > 1) {
        button.closest('.product-supplier-card').remove();
    } else {
        alert('يجب أن يكون هناك مورد واحد على الأقل');
    }
}

// معالج ملف الكتالوج
document.addEventListener('DOMContentLoaded', function () {
    const catalogInput = document.getElementById('productCatalogPdf');
    const removeBtn = document.getElementById('removeCatalogBtn');
    const infoBox = document.getElementById('catalogInfo');
    const nameEl = document.getElementById('catalogName');
    const sizeEl = document.getElementById('catalogSize');

    if (catalogInput) {
        catalogInput.addEventListener('change', function () {
            const f = this.files && this.files[0];
            if (f) {
                nameEl.textContent = f.name;
                sizeEl.textContent = `(${Math.ceil(f.size / 1024)} KB)`;
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
        removeBtn.addEventListener('click', function () {
            if (!catalogInput) return;
            catalogInput.value = '';
            infoBox.style.display = 'none';
            removeBtn.style.display = 'none';
            nameEl.textContent = '';
            sizeEl.textContent = '';
        });
    }

    // معالج الملفات الإضافية
    const extraInput = document.getElementById('productExtraFiles');
    const countEl = document.getElementById('extraFilesCount');
    const listEl = document.getElementById('extraFilesList');

    if (extraInput) {
        extraInput.addEventListener('change', function () {
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
                size.textContent = `(${Math.ceil(file.size / 1024)} KB)`;
                li.appendChild(icon);
                li.appendChild(nameNode);
                li.appendChild(size);
                listEl.appendChild(li);
            });
        });
    }
});
