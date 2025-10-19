function changeViewMode(mode) {
    const grid = document.getElementById('productsGrid');
    grid.className = 'products-grid ' + mode;
    
    // لعرض القائمة، أضف onclick لكل card لعرض التفاصيل
    if (mode === 'list') {
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            card.style.cursor = 'pointer';
            card.onclick = function(e) {
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A' && !e.target.closest('button') && !e.target.closest('a')) {
                    const id = this.getAttribute('data-id');
                    window.location.href = `product-static.html?id=${id}`;
                }
            };
        });
    } else {
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            card.onclick = null;
            card.style.cursor = 'default';
        });
    }
}

// وظائف أخرى موجودة (مثل clearFilters، shareProduct، إلخ) - يمكن إضافتها هنا إذا لزم الأمر
function clearFilters() {
    // تنفيذ مسح الفلاتر
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('supplierFilter').value = '';
    document.getElementById('userFilter').value = '';
    document.getElementById('sortFilter').value = 'date';
    // إعادة تحميل المنتجات أو فلترة
}
function shareProduct(id, platform) {
    // تنفيذ مشاركة
    console.log(`Share product ${id} on ${platform}`);
}
function chatwithproductuser() {
    // تنفيذ الدردشة
    console.log('Chat with user');
}
function copyProductLink(id) {
    // تنفيذ نسخ الرابط
    console.log(`Copy link for product ${id}`);
}