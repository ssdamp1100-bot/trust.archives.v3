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
        populateGeneral(product);
        populateUsages(product);
        populateSpecs(product);
        populateProsCons(product);
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
                        } else {
                            // Extra fallback: any PDF file
                            const anyPdf = files.find(f => {
                                const url = f.file_url || '';
                                return (f.file_type === 'pdf') || /\.pdf(\?|#|$)/i.test(url);
                            });
                            if (anyPdf?.file_url) {
                                catalogUrl = anyPdf.file_url;
                                catalogName = 'catalog.pdf';
                            }
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

        // Wire Quote PDF button
        try {
            const quoteBtn = document.getElementById('quoteBtn');
            if (quoteBtn) {
                quoteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof window.generatePDF === 'function') {
                        window.generatePDF();
                    } else {
                        alert('ميزة إنشاء عرض السعر غير متاحة حالياً');
                    }
                });
            }
        } catch(e) { console.warn('quoteBtn wiring error:', e); }

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
    const displayCode = product.code || (product.id ? String(product.id).slice(-4) : 'N/A');
    document.querySelector('#productCode span').textContent = `رقم المنتج: ${displayCode}`;
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

    // Supplier Prices (USD only, no supplier link)
    if (product.product_suppliers && product.product_suppliers.length > 0) {
        product.product_suppliers.forEach(supplier => {
            let notes = {};
            try { notes = JSON.parse(supplier.notes || '{}'); } catch(e) {}
            const supplierPriceHTML = createPriceContainerHTML(
                supplier.supplier_name || 'مورد غير مسمى',
                '',
                notes.prices?.USD,
                null,
                null,
                false,
                true // onlyUSD for suppliers
            );
            suppliersGrid.insertAdjacentHTML('beforeend', supplierPriceHTML);
        });
    }
}

function createPriceContainerHTML(title, subtitle, usd, cny, yer, isCost = false, onlyUSD = false) {
    return `
        <div class="supplier-container ${isCost ? 'cost-price-container' : ''}">
            <p class="${isCost ? 'cost-price' : 'selling-price'}">${title} ${subtitle ? `<span>(${subtitle})</span>` : ''}</p>
            <div class="price-grid">
                ${createPriceItemHTML(usd, 'USD')}
                ${onlyUSD ? '' : createPriceItemHTML(cny, 'CNY')}
                ${onlyUSD ? '' : createPriceItemHTML(yer, 'YER')}
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

function splitToList(val) {
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === 'string' && val.trim()) {
        return val.split(/\n|,/).map(s => s.trim()).filter(Boolean);
    }
    return [];
}

function populateGeneral(product) {
    const grid = document.getElementById('generalGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const audience = splitToList(product.target_audience);
    const items = [
        { name: 'بلد التصنيع', value: product.manufacturing_country || product.origin_country },
        { name: 'الموديل', value: product.model },
        { name: 'بلد المنشأ', value: product.origin_country },
        { name: 'الفئات المستهدفة', value: audience.length ? audience.join(', ') : null },
        { name: 'الضمان', value: product.warranty }
    ];
    items.forEach(it => {
        if (it.value) grid.innerHTML += `<div class="spec-item"><div class="spec-name">${it.name}</div><div class="spec-value">${it.value}</div></div>`;
    });
    if (!grid.innerHTML) grid.innerHTML = '<div class="empty-state"><i class="fas fa-info-circle"></i><p>لا توجد بيانات عامة</p></div>';
}

function populateUsages(product) {
    const ul = document.getElementById('usagesList');
    if (!ul) return;
    ul.innerHTML = '';
    const usages = splitToList(product.usages);
    if (!usages.length) { ul.innerHTML = '<div class="empty-state"><i class="fas fa-info-circle"></i><p>لا توجد استخدامات</p></div>'; return; }
    ul.innerHTML = usages.map(u => `<li>${u}</li>`).join('');
}

function populateSpecs(product) {
    const grid = document.getElementById('specsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const items = [
        { name: 'أبعاد المنتج', value: product.dimensions },
        { name: 'وزن المنتج', value: product.weight ? `${product.weight} كجم` : null },
        { name: 'مواد التصنيع', value: product.material },
        { name: 'ألوان المنتج', value: product.color }
    ];
    items.forEach(it => {
        if (it.value) grid.innerHTML += `<div class="spec-item"><div class="spec-name">${it.name}</div><div class="spec-value">${it.value}</div></div>`;
    });
    if (!grid.innerHTML) grid.innerHTML = '<div class="empty-state"><i class="fas fa-info-circle"></i><p>لا توجد مواصفات</p></div>';
}

function populateProsCons(product) {
    const featuresUl = document.getElementById('featuresList');
    const negativesUl = document.getElementById('negativesList');
    if (featuresUl) {
        const features = splitToList(product.features);
        featuresUl.innerHTML = features.length ? features.map(x => `<li>${x}</li>`).join('') : '<div class="empty-state"><i class="fas fa-info-circle"></i><p>لا توجد ميزات</p></div>';
    }
    if (negativesUl) {
        const negatives = splitToList(product.negative_points);
        negativesUl.innerHTML = negatives.length ? negatives.map(x => `<li>${x}</li>`).join('') : '<div class="empty-state"><i class="fas fa-info-circle"></i><p>لا توجد سلبيات</p></div>';
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

    // Primary product link and video link (if provided)
    const mainLinks = [];
    if (product.product_link) {
        mainLinks.push({ name: 'رابط المنتج', url: product.product_link });
    }
    if (product.video_url) {
        mainLinks.push({ name: 'رابط فيديو المنتج', url: product.video_url });
    }

    // Extract links from product_suppliers notes (kept but shown after main links)
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
    
    const combinedLinks = [...mainLinks, ...supplierLinks];
    if (combinedLinks.length > 0) {
        combinedLinks.forEach(link => {
            linksContainer.innerHTML += `
                <div class="link-item">
                    <div class="site-name"><i class="fas fa-link"></i> ${link.name}</div>
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
