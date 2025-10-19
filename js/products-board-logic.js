document.addEventListener('DOMContentLoaded', async () => {
    // Auth Guard
    if (!window.authService || !window.authService.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    // DOM Elements
    const elements = {
        grid: document.getElementById('productsGrid'),
        noResults: document.getElementById('noResults'),
        searchInput: document.getElementById('searchInput'),
        categoryFilter: document.getElementById('categoryFilter'),
        supplierFilter: document.getElementById('supplierFilter'),
        userFilter: document.getElementById('userFilter'),
        sortFilter: document.getElementById('sortFilter'),
    };

    // State
    let allProducts = [];
    const MOCK_KEY = 'mock_products_v1';

    function seedMockProductsIfNeeded() {
        if (!localStorage.getItem(MOCK_KEY)) {
            const mock = [
                { id: 'm1', name: 'ساعة ذكية متطورة', description: 'ساعة ذكية بميزات متقدمة...', code: '001', selling_price: 199, created_at: new Date().toISOString(),
                  categories: { name: 'إلكترونيات' }, product_suppliers: [{ supplier_name: 'شركة التقنية الحديثة' }], users: { username: 'admin' },
                  product_images: [{ image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', is_primary: true }] },
                { id: 'm2', name: 'هاتف ذكي عالي الجودة', description: 'هاتف ذكي بكاميرا عالية...', code: '002', selling_price: 599, created_at: new Date().toISOString(),
                  categories: { name: 'إلكترونيات' }, product_suppliers: [{ supplier_name: 'مجموعة الهواتف الذكية' }], users: { username: 'ahmed' },
                  product_images: [{ image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', is_primary: true }] }
            ];
            try { localStorage.setItem(MOCK_KEY, JSON.stringify(mock)); } catch(e) {}
        }
    }

    function getMockProducts() {
        try {
            const raw = localStorage.getItem(MOCK_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }

    /**
     * Creates an HTML card for a given product.
     * @param {object} product - The product data from Supabase.
     * @returns {HTMLElement} - The product card element.
     */
    function createProductCard(product) {
        // Normalize image URL helper
        const normalizeImageUrl = (u) => {
            if (!u) return null;
            if (/^https?:\/\//i.test(u)) return u;
            try {
                const { data } = supabaseClient.storage.from('product-images').getPublicUrl(u);
                return data?.publicUrl || u;
            } catch { return u; }
        };
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.id = product.id;

        const primaryImageRaw = product.product_images?.find(img => img.is_primary)?.image_url 
            || product.product_images?.[0]?.image_url 
            || 'https://via.placeholder.com/400x200/1a1a2e/ffffff?text=No+Image';
        const primaryImage = normalizeImageUrl(primaryImageRaw);

        const categoryName = product.categories?.name || 'N/A';
        const supplierName = product.product_suppliers?.[0]?.supplier_name || 'N/A';
        const userName = product.users?.username || 'N/A';

        // Prepare WhatsApp link
        const rawPhone = product.users?.whatsapp || (Array.isArray(product.users?.phone_numbers) && product.users.phone_numbers[0]);
        const normalizedPhone = rawPhone ? String(rawPhone).replace(/[^\d+]/g, '') : null;
        const waMessage = `مرحبا، بخصوص المنتج: ${product.name}`;
        const waLink = normalizedPhone ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(waMessage)}` : null;

        const dmBtnHtml = (window.FEATURE_DM_ENABLED === true && product.users?.id)
            ? `<button class="product-button" onclick="(function(){try{ if(window.openDirectChatByUser){ openDirectChatByUser('${product.users?.id || ''}', '${(product.users?.full_name || product.users?.username || 'عضو').replace(/'/g, "\\'")}', '${product.users?.role || 'member'}'); } else { alert('ميزة الدردشة الخاصة غير محملة بعد'); } }catch(e){ alert('تعذر فتح الدردشة الخاصة'); } })()"><i class=\"fas fa-paper-plane\"></i> تواصل بالمسجل</button>`
            : '';

        card.innerHTML = `
            <div class="product-image-container">
                <div class="product-meta-overlay">
                    <span class="product-category"><i class="fa-solid fa-layer-group"></i> ${categoryName}</span>
                    <span class="product-supplier">${supplierName}</span>
                    <span class="product-serial">SN: ${product.code || 'N/A'}</span>
                </div>
                <div class="product-image">
                    <img src="${primaryImage}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/400x200/1a1a2e/ffffff?text=No+Image';">
                </div>
            </div>
			
            <div class="product-info">			
                <h3 class="product-title">${product.name}</h3>
				<div class="product-meta-overlay2">
                    <span class="product-category2">إلكترونيات</span>
                    <span class="product-supplier2">${supplierName}</span>
                    <span class="product-serial2">SN: ${product.code || 'N/A'}</span>
					<span class="product-price2">$${product.selling_price || 0}</span>
					</div>
				<p class="product-user"><i class="fa fa-address-book-o" aria-hidden="true"></i> ${userName}</p>
                <p class="product-description">${product.description || 'لا يوجد وصف'}</p>
                <div class="product-prices">
                    <div class="price-item">
                        <span class="price-amount">$${product.cost_price || 0}</span>
                        <span class="price-currency">سعر التكلفة</span>
                    </div>
					<div class="price-item"> 
                            <span class="price-amount">¥${product.selling_price || 0}</span>
							 <span class="price-currency">سعر البيع</span>
                        </div>
                      
                </div>
                <div class="product-actions">
                    <a href="product.html?id=${product.id}" class="product-button"><i class="fa-solid fa-info"></i> عرض التفاصيل</a>
                    ${dmBtnHtml}
                </div>
				
            </div>
        `;
        // احفظ المنتج في sessionStorage عند النقر على تفاصيل المنتج
        try {
            const detailsLink = card.querySelector('.product-actions a.product-button[href^="product.html"]');
            if (detailsLink) {
                detailsLink.addEventListener('click', () => {
                    try { sessionStorage.setItem('selected_product', JSON.stringify(product)); } catch(e) {}
                });
            }
        } catch(e) {}

        return card;
    }

    /**
     * Renders a list of products to the grid.
     * @param {Array<object>} products - The products to render.
     */
    function renderProducts(products) {
        elements.grid.innerHTML = '';
        if (!products || products.length === 0) {
            elements.noResults.classList.remove('hidden');
        } else {
            elements.noResults.classList.add('hidden');
            products.forEach(p => elements.grid.appendChild(createProductCard(p)));
        }
    }

    /**
     * Extract unique category names from products
     */
    function getUniqueCategories(products) {
        return [...new Set(products.map(p => p.categories?.name).filter(Boolean))];
    }

    /**
     * Extract unique supplier names from products
     */
    function getUniqueSuppliers(products) {
        return [...new Set(products.map(p => p.product_suppliers?.[0]?.supplier_name).filter(Boolean))];
    }

    /**
     * Extract unique usernames from products
     */
    function getUniqueUsers(products) {
        return [...new Set(products.map(p => p.users?.username).filter(Boolean))];
    }

    /**
     * Fetch lists directly from tables so filters include items with no products yet
     */
    async function fetchAllCategories() {
        try {
            const { data, error } = await supabaseClient
                .from('categories')
                .select('name')
                .order('name');
            if (error) throw error;
            return Array.isArray(data) ? data.map(c => c.name).filter(Boolean) : [];
        } catch (e) {
            console.warn('fetchAllCategories fallback to products:', e?.message || e);
            return getUniqueCategories(allProducts);
        }
    }

    async function fetchAllSuppliers() {
        try {
            const { data, error } = await supabaseClient
                .from('suppliers')
                .select('name')
                .order('name');
            if (error) throw error;
            return Array.isArray(data) ? data.map(s => s.name).filter(Boolean) : [];
        } catch (e) {
            console.warn('fetchAllSuppliers fallback to products:', e?.message || e);
            return getUniqueSuppliers(allProducts);
        }
    }

    async function fetchAllUsers() {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('username')
                .order('username');
            if (error) throw error;
            return Array.isArray(data) ? data.map(u => u.username).filter(Boolean) : [];
        } catch (e) {
            console.warn('fetchAllUsers fallback to products:', e?.message || e);
            return getUniqueUsers(allProducts);
        }
    }

    /**
     * Populate a select with a contextual default label and options
     */
    function populateSelect(select, options) {
        if (!select) return;
        let defaultLabel = 'جميع';
        switch (select.id) {
            case 'categoryFilter':
                defaultLabel = 'جميع الفئات';
                break;
            case 'supplierFilter':
                defaultLabel = 'جميع الموردين';
                break;
            case 'userFilter':
                defaultLabel = 'جميع المستخدمين';
                break;
            default:
                // fallback keeps current default
                defaultLabel = select.options?.[0]?.text || 'جميع';
        }
        // Build options HTML once for performance
        const opts = [`<option value="">${defaultLabel}</option>`]
            .concat(options.map(o => `<option value="${o}">${o}</option>`))
            .join('');
        select.innerHTML = opts;
    }

    /**
     * Populate filters from tables; fallback to product-derived sets on failure.
     */
    async function populateFiltersAsync() {
        const [categories, suppliers, users] = await Promise.all([
            fetchAllCategories(),
            fetchAllSuppliers(),
            fetchAllUsers(),
        ]);

        populateSelect(elements.categoryFilter, categories || []);
        populateSelect(elements.supplierFilter, suppliers || []);
        populateSelect(elements.userFilter, users || []);
    }

    /**
     * Filters and sorts the products based on UI controls and re-renders the grid.
     */
    function applyFiltersAndRender() {
        let displayedProducts = [...allProducts];

        // Filter
        const term = elements.searchInput.value.toLowerCase();
        const category = elements.categoryFilter.value;
        const supplier = elements.supplierFilter.value;
        const user = elements.userFilter.value;

        if (term) {
            displayedProducts = displayedProducts.filter(p => 
                p.name.toLowerCase().includes(term) || 
                (p.description || '').toLowerCase().includes(term)
            );
        }
        if (category) {
            displayedProducts = displayedProducts.filter(p => p.categories?.name === category);
        }
        if (supplier) {
            displayedProducts = displayedProducts.filter(p => p.product_suppliers?.[0]?.supplier_name === supplier);
        }
        if (user) {
            displayedProducts = displayedProducts.filter(p => p.users?.username === user);
        }

        // Sort
        const sort = elements.sortFilter.value;
        if (sort === 'price-high') {
            displayedProducts.sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0));
        } else if (sort === 'price-low') {
            displayedProducts.sort((a, b) => (a.selling_price || 0) - (b.selling_price || 0));
        } else { // Default to 'date'
            displayedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        renderProducts(displayedProducts);
    }

    /**
     * Fetches all products from the service and initializes the view.
     */
    async function initialize() {
        let loadError = null;
        try {
            const { success, products, error } = await window.productsService.getProducts();
            if (success && Array.isArray(products) && products.length > 0) {
                allProducts = products;
            } else {
                loadError = error || 'No products from DB';
            }
        } catch (e) {
            loadError = e?.message || String(e);
        }

        if (!allProducts || allProducts.length === 0) {
            console.warn('No products loaded from database:', loadError);
            allProducts = [];
        }

        await populateFiltersAsync();
        applyFiltersAndRender();

        // Attach event listeners
        [elements.searchInput, elements.categoryFilter, elements.supplierFilter, elements.userFilter, elements.sortFilter].forEach(el => {
            if (el) {
                el.addEventListener('input', applyFiltersAndRender);
                el.addEventListener('change', applyFiltersAndRender);
            }
        });
    }

    // Run it
    initialize();
});
