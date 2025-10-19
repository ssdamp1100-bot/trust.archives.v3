document.addEventListener('DOMContentLoaded', async () => {
    try {
        // عرض عام بدون اشتراط تسجيل الدخول

        const qs = new URLSearchParams(window.location.search);
        const productId = qs.get('id');
        if (!productId) {
            alert('لا يوجد معرف منتج في الرابط');
            window.location.href = 'products-board.html';
            return;
        }

        // محاولة الجلب من القاعدة أولاً، ثم من بيانات المحاكاة كمحاولة ثانية
        let product = null;
        try {
            const res = await window.productsService.getProductById(productId);
            if (res && res.success && res.product) {
                product = res.product;
            } else {
                console.warn('DB getProductById failed or empty:', res?.error || 'no product');
            }
        } catch (e) {
            console.error('DB getProductById exception:', e);
        }

        if (!product) {
            try {
                const raw = localStorage.getItem('mock_products_v1');
                if (raw) {
                    const list = JSON.parse(raw);
                    product = list.find(p => String(p.id) === String(productId)) || null;
                }
            } catch (e) {
                console.error('Mock fallback error:', e);
            }
        }

        // محاولة ثالثة: sessionStorage من صفحة لوحة المنتجات
        if (!product) {
            try {
                const rawSel = sessionStorage.getItem('selected_product');
                if (rawSel) {
                    const sel = JSON.parse(rawSel);
                    if (String(sel.id) === String(productId)) {
                        product = sel;
                    }
                }
            } catch (e) { console.error('Session fallback error:', e); }
        }

        if (!product) {
            alert('تعذر تحميل تفاصيل المنتج. قد يكون المنتج غير موجود.');
            window.location.href = 'products-board.html';
            return;
        }

        // --- Populate Functions ---
        // جعل المنتج الحالي متاحاً بشكل عام
        window.currentProduct = product;
        populateMeta(product);
        populateImages(product);
        populatePrices(product);
        populateTabs(product);
        setupActionButtons(product);

        // Wire catalog download button
        try {
            const btn = document.getElementById('catalogBtn');
            if (btn) {
                btn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    const files = Array.isArray(window.currentProduct?.product_files) ? window.currentProduct.product_files : [];
                    const catalog = files.find(f => (f.file_type === 'catalog_pdf'));
                    if (!catalog || !catalog.file_url) {
                        alert('لا يوجد كاتلوج لهذا المنتج.');
                        return;
                    }
                    try {
                        const a = document.createElement('a');
                        a.href = catalog.file_url;
                        a.download = '';
                        a.target = '_blank';
                        document.body.appendChild(a); a.click(); a.remove();
                    } catch (e) {
                        window.open(catalog.file_url, '_blank');
                    }
                });
            }
        } catch(e) { console.warn('catalogBtn wiring error:', e); }

    } catch (e) {
        console.error('Product page error:', e);
        alert('حدث خطأ غير متوقع.');
    }
});

// يحول أي مسار تخزين داخلي إلى رابط عام صالح من Supabase
function normalizeImageUrl(u) {
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    try {
        const { data } = supabaseClient.storage.from('product-images').getPublicUrl(u);
        return data?.publicUrl || u;
    } catch { return u; }
}

function populateMeta(product) {
    document.getElementById('productTitle').textContent = product.name || 'اسم المنتج غير متوفر';
    document.getElementById('productDescription').textContent = product.description || 'لا يوجد وصف قصير.';
    document.querySelector('#productCategory span').textContent = product.categories?.name || 'غير محدد';
    document.querySelector('#productUser span').textContent = product.users?.username || 'غير معروف';
    document.querySelector('#productDate span').textContent = formatDate(product.created_at);
    document.querySelector('#productCode span').textContent = `رقم المنتج: ${product.code || 'N/A'}`;
}

function populateImages(product) {
    const mainImage = document.getElementById('mainImage');
    const thumbnailsContainer = document.querySelector('.image-thumbnails');
    thumbnailsContainer.innerHTML = ''; // Clear old thumbnails

    const rawImages = Array.isArray(product.product_images) ? product.product_images : [];
    const images = rawImages.map(i => ({ ...i, image_url: normalizeImageUrl(i.image_url) })).filter(i => !!i.image_url);
    const primaryImage = images.find(img => img.is_primary) || images[0];

    mainImage.src = primaryImage?.image_url || 'https://via.placeholder.com/800x450/1a1a2e/ffffff?text=صورة+المنتج';
    mainImage.alt = product.name;

    if (images.length > 0) {
        images.forEach((img, idx) => {
            const thumb = document.createElement('div');
            thumb.className = `thumbnail ${img.image_url === mainImage.src ? 'active' : ''}`;
            thumb.dataset.image = img.image_url;
            thumb.innerHTML = `<img src="${img.image_url}" alt="Thumbnail ${idx + 1}">`;
            thumb.addEventListener('click', () => {
                mainImage.src = img.image_url;
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
            thumbnailsContainer.appendChild(thumb);
        });
    } else {
        // لا توجد صور: اعرض صورة افتراضية كصورة رئيسية ومصغّر واحد
        const fallback = 'https://via.placeholder.com/800x450/1a1a2e/ffffff?text=صورة+المنتج';
        mainImage.src = fallback;
        const thumb = document.createElement('div');
        thumb.className = 'thumbnail active';
        thumb.dataset.image = fallback;
        thumb.innerHTML = `<img src="${fallback}" alt="Thumbnail">`;
        thumbnailsContainer.appendChild(thumb);
    }
}

function populatePrices(product) {
    const suppliersGrid = document.getElementById('suppliersGrid');
    suppliersGrid.innerHTML = ''; // Clear placeholders

    // Selling Price
    const sellingPriceHTML = createPriceContainerHTML('سعر البيع', 'السعر للجمهور', product.selling_price, product.selling_price_cny, product.selling_price_yer);
    suppliersGrid.insertAdjacentHTML('beforeend', sellingPriceHTML);

    // Cost Price
    if (product.cost_price) {
        const costPriceHTML = createPriceContainerHTML('سعر التكلفة', 'سعر الشراء', product.cost_price, product.cost_price_cny, product.cost_price_yer, true);
        suppliersGrid.insertAdjacentHTML('beforeend', costPriceHTML);
    }

    // Supplier Prices
    if (product.product_suppliers && product.product_suppliers.length > 0) {
        product.product_suppliers.forEach(supplier => {
            let notes = {};
            try { notes = JSON.parse(supplier.notes || '{}'); } catch(e) {}
            const supplierPriceHTML = createPriceContainerHTML(
                supplier.supplier_name || 'مورد غير مسمى',
                notes.link ? `<a href="${notes.link}" target="_blank">رابط المورد</a>` : '',
                notes.prices?.USD,
                notes.prices?.CNY,
                notes.prices?.YER
            );
            suppliersGrid.insertAdjacentHTML('beforeend', supplierPriceHTML);
        });
    }
}

function createPriceContainerHTML(title, subtitle, usd, cny, yer, isCost = false) {
    return `
        <div class="supplier-container ${isCost ? 'cost-price-container' : ''}">
            <p class="${isCost ? 'cost-price' : 'selling-price'}">${title} <span>(${subtitle})</span></p>
            <div class="price-grid">
                ${createPriceItemHTML(usd, 'USD')}
                ${createPriceItemHTML(cny, 'CNY')}
                ${createPriceItemHTML(yer, 'YER')}
            </div>
        </div>
    `;
}

function createPriceItemHTML(amount, currency) {
    if (amount === null || amount === undefined) return '';
    return `
        <div class="price-item">
            <span class="price-amount">${formatCurrency(amount, currency)}</span>
            <div class="price-currency">${currency}</div>
        </div>
    `;
}

function populateTabs(product) {
    // Description & Features
    document.getElementById('productLongDescription').innerHTML = product.long_description || product.description || 'لا يوجد وصف تفصيلي.';
    const featuresContainer = document.getElementById('featuresListContainer');
    if (product.features && product.features.length > 0) {
        featuresContainer.innerHTML = `
            <h4 class="mt-20">المميزات الرئيسية:</h4>
            <ul style="padding-right: 20px; margin: 15px 0;">
                ${product.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
        `;
    }

    // Specifications
    const specsGrid = document.getElementById('specsGrid');
    specsGrid.innerHTML = ''; // Clear placeholders
    if (product.specifications && typeof product.specifications === 'object') {
        for (const [key, value] of Object.entries(product.specifications)) {
            if (value) {
                specsGrid.innerHTML += `<div class="spec-item"><div class="spec-name">${key}</div><div class="spec-value">${value}</div></div>`;
            }
        }
    }

    // Links
    const linksContainer = document.getElementById('productLinksContainer');
    linksContainer.innerHTML = ''; // Clear placeholders
    if (product.product_links && product.product_links.length > 0) {
        product.product_links.forEach(link => {
            linksContainer.innerHTML += `
                <div class="link-item">
                    <div class="site-name"><i class="fas fa-link"></i> ${link.site_name || 'رابط'}</div>
                    <a href="${link.url}" target="_blank" class="product-link2">${link.url}</a>
                </div>
            `;
        });
    }
}

function setupActionButtons(product) {
    // Share Button
    document.getElementById('shareBtn').addEventListener('click', () => {
        if (navigator.share) {
            navigator.share({
                title: product.name,
                text: product.description,
                url: window.location.href
            }).catch(error => console.log('Error sharing:', error));
        } else {
            alert('المشاركة غير مدعومة. يمكنك نسخ الرابط.');
        }
    });

    // Contact Uploader Button
    const contactBtn = document.getElementById('contactUploaderBtn');
    const phone = product.users?.whatsapp || product.users?.phone_numbers?.[0];
    if (contactBtn && phone) {
        contactBtn.addEventListener('click', () => {
            const msg = `مرحبا، بخصوص المنتج: ${product.name}`;
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        });
    } else if(contactBtn) {
        contactBtn.disabled = true;
        contactBtn.style.opacity = 0.5;
    }
}

// --- Utility Functions ---
function formatDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return '—'; }
}

function formatCurrency(amount, currency) {
    try {
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);
    } catch (e) {
        return amount;
    }
}
