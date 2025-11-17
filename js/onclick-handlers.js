// قسم واجهة التسجيل: دوال موحّدة مع حماية من التكرار
if (typeof window.showRegisterModal !== 'function') {
    window.showRegisterModal = function showRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    };
}

if (typeof window.closeRegisterModal !== 'function') {
    window.closeRegisterModal = function closeRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };
}

if (typeof window.addRegisterPhoneField !== 'function') {
    window.addRegisterPhoneField = function addRegisterPhoneField() {
        const container = document.getElementById('registerPhoneFields');
        if (!container) return;
        
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'field-group';
        fieldGroup.innerHTML = `
            <input type="tel" placeholder="+966 50 123 4567" class="phone-input">
            <button type="button" onclick="this.parentElement.remove()" class="remove-field-btn"><i class="fa fa-minus" aria-hidden="true"></i></button>
        `;
        container.appendChild(fieldGroup);
    };
}

function addPhoneField() {
    const container = document.getElementById('phoneFields');
    if (!container) return;
    
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'add-supplier-field-group';
    fieldGroup.innerHTML = `
        <input type="tel" placeholder="+86 138 0013 8000" class="phone-input">
        <button type="button" onclick="this.parentElement.remove()" class="add-supplier-remove-field-btn">-</button>
    `;
    container.appendChild(fieldGroup);
}

function addEmailField() {
    const container = document.getElementById('emailFields');
    if (!container) return;
    
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'add-supplier-field-group';
    fieldGroup.innerHTML = `
        <input type="email" placeholder="supplier@company.com" class="email-input">
        <button type="button" onclick="this.parentElement.remove()" class="add-supplier-remove-field-btn">-</button>
    `;
    container.appendChild(fieldGroup);
}

function addUsage() {
    const input = document.getElementById('usageInput');
    if (!input || !input.value.trim()) return;
    
    const container = document.getElementById('usagesContainer');
    if (!container) return;
    
    const usage = input.value.trim();
    const usageItem = document.createElement('div');
    usageItem.className = 'product-added-item';
    const span = document.createElement('span');
    span.textContent = usage;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'product-remove-btn';
    btn.innerHTML = '<i class="fas fa-times"></i>';
    btn.onclick = function(){ usageItem.remove(); };
    usageItem.appendChild(span);
    usageItem.appendChild(btn);
    container.insertBefore(usageItem, container.querySelector('.product-field-group'));
    input.value = '';
}

function addFeature() {
    const input = document.getElementById('featureInput');
    if (!input || !input.value.trim()) return;
    
    const container = document.getElementById('featuresContainer');
    if (!container) return;
    
    const feature = input.value.trim();
    const featureItem = document.createElement('div');
    featureItem.className = 'product-added-item';
    const span = document.createElement('span');
    span.textContent = feature;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'product-remove-btn';
    btn.innerHTML = '<i class="fas fa-times"></i>';
    btn.onclick = function(){ featureItem.remove(); };
    featureItem.appendChild(span);
    featureItem.appendChild(btn);
    container.insertBefore(featureItem, container.querySelector('.product-field-group'));
    input.value = '';
}

function addNegativePoint() {
    const input = document.getElementById('negativeInput');
    if (!input || !input.value.trim()) return;
    
    const container = document.getElementById('negativePointsContainer');
    if (!container) return;
    
    const negative = input.value.trim();
    const negativeItem = document.createElement('div');
    negativeItem.className = 'product-added-item';
    const span = document.createElement('span');
    span.textContent = negative;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'product-remove-btn';
    btn.innerHTML = '<i class="fas fa-times"></i>';
    btn.onclick = function(){ negativeItem.remove(); };
    negativeItem.appendChild(span);
    negativeItem.appendChild(btn);
    container.insertBefore(negativeItem, container.querySelector('.product-field-group'));
    input.value = '';
}

function clearFilters() {
    const filters = document.querySelectorAll('.filter-group input, .filter-group select');
    filters.forEach(filter => filter.value = '');
    
    if (typeof filterProducts === 'function') {
        filterProducts();
    }
}

function clearSupplierFilters() {
    const searchInput = document.getElementById('searchInput');
    const countryFilter = document.getElementById('countryFilter');
    const industryFilter = document.getElementById('industryFilter');
    
    if (searchInput) searchInput.value = '';
    if (countryFilter) countryFilter.value = '';
    if (industryFilter) industryFilter.value = '';
    
    if (typeof filterSuppliers === 'function') {
        filterSuppliers();
    }
}

function changeViewMode(mode) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.className = 'products-grid ' + mode;
}

function showSection(sectionName) {
    const sections = document.querySelectorAll('.section');
    const buttons = document.querySelectorAll('.nav-btn');
    
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    buttons.forEach(button => {
        button.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    const targetButton = event && event.target;
    if (targetButton && targetButton.classList.contains('nav-btn')) {
        targetButton.classList.add('active');
    }
}

function openTeamChatFromCard(event) {
    if (event) event.preventDefault();
    const chatToggle = document.getElementById('chatToggle');
    if (chatToggle) {
        chatToggle.click();
    }
}

function openAiChatFromCard(event) {
    if (event) event.preventDefault();
    const aiToggle = document.getElementById('aiToggle');
    if (aiToggle) {
        aiToggle.click();
    }
}

function viewProduct(productId) {
    window.location.href = 'product.html?id=' + productId;
}

function editProduct(productId) {
    window.location.href = 'add-product.html?edit=' + productId;
}

function deleteProduct(productId) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        console.log('حذف المنتج:', productId);
    }
}

function StartTask(button) {
    if (button) {
        button.textContent = 'جارٍ العمل...';
        button.classList.add('in-progress');
    }
}

function AskAdminAboutTask(button) {
    alert('تم إرسال استفسارك للإدارة');
}

function TasxDone(button) {
    if (button) {
        button.textContent = 'تم الإنجاز ✓';
        button.classList.add('completed');
    }
}
