// TrustGroupArchives - Static JavaScript Functions Only
// This file contains only functions, no dynamic data loading

// Utility Functions
function formatPrice(price, currency = 'USD') {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0
    }).format(price);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ar-SA');
}

// Product Functions
function shareProduct(productId, platform) {
    const productCard = document.querySelector(`[data-id="${productId}"]`);
    if (!productCard) return;
    
    const productName = productCard.querySelector('.product-title').textContent;
    const productDesc = productCard.querySelector('.product-description').textContent;
    const productUrl = `${window.location.origin}/product-static.html?id=${productId}`;
    const message = `${productName} - ${productDesc.substring(0, 100)}...`;
    
    let shareUrl = '';
    
    switch(platform) {
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(message + '\n' + productUrl)}`;
            break;
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(message)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(productUrl)}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank');
    }
}

function copyProductLink(productId) {
    const productUrl = `${window.location.origin}/product-static.html?id=${productId}`;
    navigator.clipboard.writeText(productUrl).then(() => {
        showMessage('تم نسخ رابط المنتج!', 'success');
    }).catch(() => {
        showMessage('فشل في نسخ الرابط', 'error');
    });
}

function deleteProduct(productId) {
    if (confirm('هذا نموذج للعرض فقط. في النسخة الحقيقية سيتم حذف المنتج.')) {
        showMessage('تم حذف المنتج بنجاح! (محاكاة)', 'success');
    }
}

function editProduct(productId) {
    window.location.href = `add-product-static.html?edit=${productId}`;
}

// Filter Functions (for static content)
function filterProducts(products, filters) {
    // This would be used with static product arrays
    return products.filter(product => {
        if (filters.category && product.category !== filters.category) return false;
        if (filters.supplier && product.supplier !== filters.supplier) return false;
        if (filters.user && product.user !== filters.user) return false;
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            return product.name.toLowerCase().includes(searchTerm) || 
                   product.description.toLowerCase().includes(searchTerm);
        }
        return true;
    });
}

function sortProducts(products, sortBy) {
    return [...products].sort((a, b) => {
        switch(sortBy) {
            case 'name':
                return a.name.localeCompare(b.name, 'ar');
            case 'date':
                return new Date(b.addedDate) - new Date(a.addedDate);
            case 'price-high':
                return b.prices.usd - a.prices.usd;
            case 'price-low':
                return a.prices.usd - b.prices.usd;
            case 'views':
                return (b.views || 0) - (a.views || 0);
            default:
                return 0;
        }
    });
}

// UI Helper Functions
function showMessage(message, type = 'success') {
    // Create or update message element
    let messageEl = document.querySelector('.message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.className = 'message';
        document.body.appendChild(messageEl);
        
        // Style for floating message
        messageEl.style.position = 'fixed';
        messageEl.style.top = '20px';
        messageEl.style.right = '20px';
        messageEl.style.zIndex = '3000';
        messageEl.style.maxWidth = '300px';
    }
    
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.style.display = 'none';
        }
    }, 3000);
}

function showModal(title, content, buttons = []) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            <h3 style="color: white; margin-bottom: 20px;">${title}</h3>
            <div style="color: rgba(255,255,255,0.8); margin-bottom: 20px;">${content}</div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                ${buttons.map(btn => `
                    <button class="product-button ${btn.class || ''}" onclick="${btn.onclick || ''}">
                        ${btn.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Form Helper Functions
function addUse(inputId, listId) {
    const input = document.getElementById(inputId);
    const use = input.value.trim();
    if (!use) return;
    
    const usesList = document.getElementById(listId);
    const useItem = document.createElement('div');
    useItem.className = 'use-item';
    useItem.innerHTML = `
        <span style="flex: 1; color: white;">• ${use}</span>
        <button type="button" onclick="removeUse(this)" style="background: #dc2626; border: none; color: white; padding: 5px 8px; border-radius: 4px; cursor: pointer;">حذف</button>
    `;
    
    // Insert before the input row
    const inputRow = usesList.querySelector('.use-item:last-child');
    usesList.insertBefore(useItem, inputRow);
    
    input.value = '';
}

function removeUse(button) {
    button.parentElement.remove();
}

function addField(containerId, fieldType = 'text', placeholder = '') {
    const container = document.getElementById(containerId);
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'field-group';
    fieldGroup.innerHTML = `
        <input type="${fieldType}" placeholder="${placeholder}" class="${fieldType}-input">
        <button type="button" onclick="removeField(this)" class="remove-field-btn">-</button>
    `;
    container.appendChild(fieldGroup);
}

function removeField(button) {
    button.parentElement.remove();
}

// Authentication Functions (Static)
function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        window.location.href = 'index.html';
    }
}

// Navigation Functions
function goTo(page) {
    window.location.href = page;
}

function goBack() {
    window.history.back();
}

// Search and Filter Functions for Static Pages
function setupStaticFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const supplierFilter = document.getElementById('supplierFilter');
    const userFilter = document.getElementById('userFilter');
    const sortFilter = document.getElementById('sortFilter');

    if (searchInput) searchInput.addEventListener('input', applyStaticFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyStaticFilters);
    if (supplierFilter) supplierFilter.addEventListener('change', applyStaticFilters);
    if (userFilter) userFilter.addEventListener('change', applyStaticFilters);
    if (sortFilter) sortFilter.addEventListener('change', applyStaticFilters);
}

function applyStaticFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const supplier = document.getElementById('supplierFilter')?.value || '';
    const user = document.getElementById('userFilter')?.value || '';

    const productCards = document.querySelectorAll('.product-card');
    let visibleCount = 0;

    productCards.forEach(card => {
        const title = card.querySelector('.product-title')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.product-description')?.textContent.toLowerCase() || '';
        const productCategory = card.querySelector('.product-category')?.textContent || '';
        const productSupplier = card.querySelector('.product-supplier')?.textContent || '';
        const productUser = card.querySelector('.product-user')?.textContent.replace('بواسطة: ', '') || '';

        const matchesSearch = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);
        const matchesCategory = !category || productCategory === category;
        const matchesSupplier = !supplier || productSupplier === supplier;
        const matchesUser = !user || productUser === user;

        if (matchesSearch && matchesCategory && matchesSupplier && matchesUser) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Update filtered count if element exists
    const filteredCountEl = document.getElementById('filteredCount');
    if (filteredCountEl) {
        filteredCountEl.textContent = visibleCount;
    }
    
    // Show/hide no results message
    const noResults = document.getElementById('noResults');
    if (noResults) {
        if (visibleCount === 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
        }
    }
}

function clearStaticFilters() {
    const inputs = ['searchInput', 'categoryFilter', 'supplierFilter', 'userFilter', 'sortFilter'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });
    applyStaticFilters();
}

// Export functions for global use
if (typeof window !== 'undefined') {
    window.shareProduct = shareProduct;
    window.copyProductLink = copyProductLink;
    window.deleteProduct = deleteProduct;
    window.editProduct = editProduct;
    window.logout = logout;
    window.showMessage = showMessage;
    window.showModal = showModal;
    window.addUse = addUse;
    window.removeUse = removeUse;
    window.addField = addField;
    window.removeField = removeField;
    window.goTo = goTo;
    window.goBack = goBack;
    window.applyStaticFilters = applyStaticFilters;
    window.clearStaticFilters = clearStaticFilters;
}