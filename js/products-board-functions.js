// Products Board Functions - وظائف لوحة المنتجات

let currentProducts = [];
let filteredProducts = [];

// تحميل المنتجات من قاعدة البيانات
async function loadProductsFromDatabase() {
    try {
        if (!window.productsService) {
            console.warn('Products service not available');
            return;
        }

        const result = await window.productsService.getProducts();
        if (result.success) {
            const products = Array.isArray(result.products) ? result.products : [];
            currentProducts = products;
            filteredProducts = [...currentProducts];
            renderProducts(currentProducts);
        } else {
            console.error('Error loading products:', result.error);
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// عرض المنتجات
function renderProducts(products) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    productsGrid.innerHTML = '';

    products.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });

    const noResults = document.getElementById('noResults');
    if (noResults) {
        if (!products || products.length === 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
        }
    }
}

// إنشاء بطاقة منتج
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-id', product.id);
    card.setAttribute('data-category', product.categories?.name || '');
    card.setAttribute('data-supplier', product.product_suppliers?.[0]?.supplier_name || '');
    card.setAttribute('data-user', product.users?.username || '');

    const primaryImage = product.product_images?.find(img => img.is_primary)?.image_url ||
        product.product_images?.[0]?.image_url ||
        'https://via.placeholder.com/400x200/1a1a2e/ffffff?text=صورة+المنتج';

    card.innerHTML = `
        <div class="product-image-container">
            <div class="product-meta-overlay">
                <span class="product-category"><i class="fa-solid fa-layer-group"></i> ${product.categories?.name || 'غير محدد'}</span>
                <span class="product-supplier">${product.product_suppliers?.[0]?.supplier_name || 'غير محدد'}</span>
                <span class="product-serial">SN: ${product.code}</span>
            </div>
            <div class="product-image">
                <img src="${primaryImage}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/400x200/1a1a2e/ffffff?text=صورة+المنتج'">
            </div>
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}<span><i class="fa fa-address-book-o" aria-hidden="true"></i> ${product.users?.username || 'غير محدد'}</span></h3>
            <div class="product-meta-overlay2">
                <span class="product-category2">${product.categories?.name || 'غير محدد'}</span>
                <span class="product-supplier2">${product.product_suppliers?.[0]?.supplier_name || 'غير محدد'}</span>
                <span class="product-serial2">SN: ${product.code}</span>
                <span class="product-price2">$${product.selling_price}</span>
            </div>
            <p class="product-description">${product.description || 'لا يوجد وصف'}</p>
            <div class="product-prices">
                <div class="price-item">
                    <span class="price-label">البيع:</span>
                    <span class="price-amount">$${product.selling_price || 0}</span>
                    <span class="price-currency">USD</span>
                </div>
                <div class="price-item cost-price">
                    <span class="price-label">التكلفة:</span>
                    <span class="price-amount">$${product.cost_price || 0}</span>
                    <span class="price-currency">USD</span>
                </div>
            </div>
            <div class="product-actions">
                <a href="product.html?id=${product.id}" class="product-button"><i class="fa-solid fa-info"></i> عرض التفاصيل</a>
                <a href="product.html?id=${product.id}" class="product-button"><i class="fab fa-whatsapp"></i>تواصل بالمسجل</a>
            </div>
        </div>
    `;

    return card;
}

// فلترة المنتجات
async function filterProducts() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const supplier = document.getElementById('supplierFilter')?.value || '';
    const user = document.getElementById('userFilter')?.value || '';
    const sort = document.getElementById('sortFilter')?.value || 'date';

    filteredProducts = currentProducts.filter(product => {
        const matchesSearch = !searchTerm ||
            product.name.toLowerCase().includes(searchTerm) ||
            product.description?.toLowerCase().includes(searchTerm);

        const matchesCategory = !category || product.categories?.name === category;
        const matchesSupplier = !supplier || product.product_suppliers?.[0]?.supplier_name === supplier;
        const matchesUser = !user || product.users?.username === user;

        return matchesSearch && matchesCategory && matchesSupplier && matchesUser;
    });

    // ترتيب المنتجات
    if (sort === 'price-high') {
        filteredProducts.sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0));
    } else if (sort === 'price-low') {
        filteredProducts.sort((a, b) => (a.selling_price || 0) - (b.selling_price || 0));
    } else {
        filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    renderProducts(filteredProducts);
}

// مسح الفلاتر
function clearFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const supplierFilter = document.getElementById('supplierFilter');
    const userFilter = document.getElementById('userFilter');
    const sortFilter = document.getElementById('sortFilter');

    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (supplierFilter) supplierFilter.value = '';
    if (userFilter) userFilter.value = '';
    if (sortFilter) sortFilter.value = 'date';

    filterProducts();
}

// تهيئة لوحة المنتجات
document.addEventListener('DOMContentLoaded', async function () {
    // تحقق من تسجيل الدخول
    if (window.authService && !window.authService.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    // تحميل المنتجات
    await loadProductsFromDatabase();

    // إضافة مستمعي الأحداث
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const supplierFilter = document.getElementById('supplierFilter');
    const userFilter = document.getElementById('userFilter');
    const sortFilter = document.getElementById('sortFilter');

    [searchInput, categoryFilter, supplierFilter, userFilter, sortFilter].forEach(element => {
        if (element) {
            element.addEventListener('input', filterProducts);
            element.addEventListener('change', filterProducts);
        }
    });
});
