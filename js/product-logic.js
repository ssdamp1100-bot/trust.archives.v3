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
        populateDetailedInfo(product);
        populateFilesAndLinks(product);
        setupActionButtons(product);

        // Wire catalog download button (reads from product_catalogs table, fallback to product_files)
        try {
            const btn = document.getElementById('catalogBtn');
            if (btn) {
                btn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    
                    // Try product_catalogs first (new dedicated table)
                    let catalogUrl = null;
                    let catalogName = 'catalog.pdf';
                    
                    const catalogs = Array.isArray(window.currentProduct?.product_catalogs) ? window.currentProduct.product_catalogs : [];
                    if (catalogs.length > 0 && catalogs[0].catalog_url) {
                        catalogUrl = catalogs[0].catalog_url;
                        catalogName = catalogs[0].catalog_name || 'catalog.pdf';
                    } else {
                        // Fallback to product_files for backward compatibility
                        const files = Array.isArray(window.currentProduct?.product_files) ? window.currentProduct.product_files : [];
                        const catalogFile = files.find(f => f.file_type === 'catalog_pdf');
                        if (catalogFile?.file_url) {
                            catalogUrl = catalogFile.file_url;
                        }
                    }
                    
                    if (!catalogUrl) {
                        alert('لا يوجد كاتلوج لهذا المنتج.');
                        return;
                    }
                    
                    // If catalog is cross-origin, prefer opening in new tab to avoid download restrictions
                    try {
                        const urlObj = new URL(catalogUrl, window.location.href);
                        const sameOrigin = (urlObj.origin === window.location.origin);
                        if (!sameOrigin) {
                            window.open(catalogUrl, '_blank');
                            return;
                        }
                    } catch {}

                    // Same-origin or URL parsing failed: attempt programmatic download
                    try {
                        const a = document.createElement('a');
                        a.href = catalogUrl;
                        a.download = catalogName;
                        a.target = '_blank';
                        document.body.appendChild(a); a.click(); a.remove();
                    } catch (e) {
                        window.open(catalogUrl, '_blank');
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
    let featuresArr = [];
    if (Array.isArray(product.features)) {
        featuresArr = product.features.filter(Boolean);
    } else if (typeof product.features === 'string' && product.features.trim()) {
        // Split by new lines or commas
        featuresArr = product.features
            .split(/\n|,/)
            .map(s => s.trim())
            .filter(Boolean);
    }
    if (featuresArr.length > 0) {
        featuresContainer.innerHTML = `
            <h4 class="mt-20">استخدامات المنتج:</h4>
            <ul style="padding-right: 20px; margin: 15px 0; list-style: disc;">
                ${featuresArr.map(f => `<li>${f}</li>`).join('')}
            </ul>
        `;
    }

    // Specifications (basic/quick view)
    const specsGrid = document.getElementById('specsGrid');
    specsGrid.innerHTML = '';
    const quickSpecs = [
        { name: 'الماركة', value: product.brand },
        { name: 'الموديل', value: product.model },
        { name: 'الوزن', value: product.weight ? `${product.weight} كجم` : null },
        { name: 'الأبعاد', value: product.dimensions },
        { name: 'اللون', value: product.color },
        { name: 'المادة', value: product.material },
        { name: 'الضمان', value: product.warranty },
        { name: 'بلد المنشأ', value: product.origin_country }
    ];
    quickSpecs.forEach(spec => {
        if (spec.value) {
            specsGrid.innerHTML += `<div class="spec-item"><div class="spec-name">${spec.name}</div><div class="spec-value">${spec.value}</div></div>`;
        }
    });
    if (specsGrid.innerHTML === '') {
        specsGrid.innerHTML = '<div class="empty-state"><i class="fas fa-info-circle"></i><p>لا توجد مواصفات متاحة</p></div>';
    }
}

function populateDetailedInfo(product) {
    const detailsGrid = document.getElementById('detailsGrid');
    detailsGrid.innerHTML = '';
    
    const details = [
        { name: 'الماركة', value: product.brand, icon: 'fa-tag' },
        { name: 'الموديل', value: product.model, icon: 'fa-cube' },
        { name: 'الوزن', value: product.weight ? `${product.weight} كجم` : null, icon: 'fa-weight' },
        { name: 'الأبعاد', value: product.dimensions, icon: 'fa-ruler-combined' },
        { name: 'اللون', value: product.color, icon: 'fa-palette' },
        { name: 'مادة التصنيع', value: product.material, icon: 'fa-hammer' },
        { name: 'الضمان', value: product.warranty, icon: 'fa-shield-alt' },
        { name: 'بلد المنشأ', value: product.origin_country, icon: 'fa-globe' },
        { name: 'حالة المنتج', value: product.status, icon: 'fa-check-circle' },
        { name: 'الرؤية', value: product.visibility, icon: 'fa-eye' }
    ];
    
    details.forEach(detail => {
        if (detail.value) {
            detailsGrid.innerHTML += `
                <div class="spec-item">
                    <div class="spec-name"><i class="fas ${detail.icon}"></i> ${detail.name}</div>
                    <div class="spec-value">${detail.value}</div>
                </div>
            `;
        }
    });
    
    // Keywords
    if (product.keywords && product.keywords.length > 0) {
        detailsGrid.innerHTML += `
            <div class="spec-item" style="grid-column: 1/-1;">
                <div class="spec-name"><i class="fas fa-tags"></i> الكلمات المفتاحية</div>
                <div class="spec-value">${product.keywords.join(', ')}</div>
            </div>
        `;
    }
    
    // Notes
    if (product.notes) {
        detailsGrid.innerHTML += `
            <div class="spec-item" style="grid-column: 1/-1;">
                <div class="spec-name"><i class="fas fa-sticky-note"></i> ملاحظات إضافية</div>
                <div class="spec-value">${product.notes}</div>
            </div>
        `;
    }
    
    if (detailsGrid.innerHTML === '') {
        detailsGrid.innerHTML = '<div class="empty-state"><i class="fas fa-info-circle"></i><p>لا توجد تفاصيل إضافية</p></div>';
    }
}

function populateFilesAndLinks(product) {
    // Files Section
    const filesContainer = document.getElementById('productFilesContainer');
    filesContainer.innerHTML = '';
    
    // Collect all files (catalog from product_catalogs + other files from product_files)
    const allFiles = [];
    
    // Add catalog from product_catalogs if exists
    const catalogs = Array.isArray(product.product_catalogs) ? product.product_catalogs : [];
    if (catalogs.length > 0 && catalogs[0].catalog_url) {
        allFiles.push({
            file_url: catalogs[0].catalog_url,
            file_type: 'catalog_pdf',
            file_name: catalogs[0].catalog_name || 'catalog.pdf'
        });
    }
    
    // Add other files from product_files
    const files = Array.isArray(product.product_files) ? product.product_files : [];
    allFiles.push(...files);
    
    if (allFiles.length > 0) {
        allFiles.forEach((file, index) => {
            const fileType = file.file_type || 'document';
            const fileName = file.file_name || getFileNameFromUrl(file.file_url) || `ملف ${index + 1}`;
            const icon = getFileIcon(fileType);
            const label = getFileLabel(fileType);
            
            filesContainer.innerHTML += `
                <div class="file-item">
                    <div class="file-icon"><i class="${icon}"></i></div>
                    <div class="file-name">${label}</div>
                    <button class="file-btn" onclick="downloadFile('${file.file_url}', '${fileName}')">
                        <i class="fas fa-download"></i> تحميل
                    </button>
                </div>
            `;
        });
    } else {
        filesContainer.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>لا توجد ملفات مرفقة</p></div>';
    }
    
    // Links Section
    const linksContainer = document.getElementById('productLinksContainer');
    linksContainer.innerHTML = '';
    
    // Extract links from product_suppliers notes
    const supplierLinks = [];
    if (product.product_suppliers && product.product_suppliers.length > 0) {
        product.product_suppliers.forEach(supplier => {
            try {
                const notes = typeof supplier.notes === 'string' ? JSON.parse(supplier.notes) : supplier.notes;
                if (notes && notes.link) {
                    // Get supplier name: custom name first, then from suppliers table, then fallback
                    const supplierName = supplier.supplier_name || supplier.suppliers?.name || 'مورد';
                    supplierLinks.push({
                        name: supplierName,
                        url: notes.link
                    });
                }
            } catch(e) {}
        });
    }
    
    if (supplierLinks.length > 0) {
        supplierLinks.forEach(link => {
            linksContainer.innerHTML += `
                <div class="link-item">
                    <div class="site-name"><i class="fas fa-store"></i> ${link.name}</div>
                    <a href="${link.url}" target="_blank" class="product-link2">${link.url}</a>
                </div>
            `;
        });
    } else {
        linksContainer.innerHTML = '<div class="empty-state"><i class="fas fa-link"></i><p>لا توجد روابط متاحة</p></div>';
    }
}

function getFileIcon(fileType) {
    const icons = {
        'catalog_pdf': 'fas fa-book',
        'supplier_pdf': 'fas fa-file-invoice',
        'document': 'fas fa-file-alt',
        'pdf': 'fas fa-file-pdf',
        'image': 'fas fa-image'
    };
    return icons[fileType] || 'fas fa-file';
}

function getFileLabel(fileType) {
    const labels = {
        'catalog_pdf': 'كاتلوج المنتج',
        'supplier_pdf': 'وثيقة المورد',
        'document': 'مستند',
        'pdf': 'ملف PDF',
        'image': 'صورة'
    };
    return labels[fileType] || 'ملف';
}

function getFileNameFromUrl(url) {
    if (!url) return null;
    try {
        const parts = url.split('/');
        return parts[parts.length - 1];
    } catch {
        return null;
    }
}

// Global function for file download
window.downloadFile = function(fileUrl, fileName) {
    try {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName || '';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {
        console.error('Download error:', e);
        window.open(fileUrl, '_blank');
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

    // Download currently displayed main image
    const downloadImageBtn = document.getElementById('downloadImageBtn');
    if (downloadImageBtn) {
        downloadImageBtn.addEventListener('click', () => {
            const mainImg = document.getElementById('mainImage');
            const src = mainImg?.src;
            if (!src || src.includes('placeholder.com')) {
                alert('لا توجد صورة متاحة للتنزيل.');
                return;
            }
            try {
                const a = document.createElement('a');
                a.href = src;
                a.download = getFileNameFromUrl(src) || (product.name ? `${product.name}.jpg` : 'product.jpg');
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                a.remove();
            } catch (e) {
                window.open(src, '_blank');
            }
        });
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
