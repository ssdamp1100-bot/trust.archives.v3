document.addEventListener('DOMContentLoaded', async () => {
  try {
    const qs = new URLSearchParams(window.location.search);
    const productId = qs.get('id');
    if (!productId) {
      alert('لا يوجد معرف منتج في الرابط');
      window.location.href = 'index.html';
      return;
    }

    // Fetch product by ID (no auth required for viewing)
    let product = null;
    try {
      const res = await window.productsService.getProductById(productId);
      if (res && res.success && res.product) {
        product = res.product;
      }
    } catch (e) {
      console.warn('getProductById failed:', e?.message || e);
    }

    // Fallback 1: sessionStorage from index listing
    if (!product) {
      try {
        const rawSel = sessionStorage.getItem('selected_product');
        if (rawSel) {
          const sel = JSON.parse(rawSel);
          if (String(sel.id) === String(productId)) {
            product = sel;
          }
        }
      } catch (e) { console.warn('sessionStorage fallback failed', e); }
    }

    // Fallback 2: localStorage mock bucket (if used elsewhere)
    if (!product) {
      try {
        const raw = localStorage.getItem('mock_products_v1');
        if (raw) {
          const list = JSON.parse(raw);
          product = list.find(p => String(p.id) === String(productId)) || null;
        }
      } catch (e) { console.warn('localStorage mock fallback failed', e); }
    }

    if (!product) {
      alert('تعذر تحميل تفاصيل المنتج.');
      window.location.href = 'index.html';
      return;
    }

    // Helpers
    function normalizeImageUrl(u) {
      if (!u) return null;
      if (/^https?:\/\//i.test(u)) return u;
      try {
        const { data } = supabaseClient.storage.from('product-images').getPublicUrl(u);
        return data?.publicUrl || u;
      } catch { return u; }
    }

    function getFileNameFromUrl(url) {
      if (!url) return null;
      try { const parts = url.split('/'); return parts[parts.length - 1]; } catch { return null; }
    }

    // Populate Title/Description and Meta
    const titleEl = document.querySelector('.product-title');
    const descEl = document.querySelector('.product-description');
    if (titleEl) titleEl.textContent = product.name || '—';
    if (descEl) descEl.textContent = product.long_description || product.description || '—';

    // Meta container
    try {
      const setText = (selector, value) => {
        const el = document.querySelector(`${selector} span`);
        if (el) el.textContent = value ?? '—';
      };
      setText('#productCategory', product.categories?.name || 'غير محدد');
      setText('#productUser', product.users?.username || 'غير معروف');
      setText('#productDate', (function(iso){ try{ return new Date(iso).toLocaleDateString('ar-YE', { year:'numeric', month:'long', day:'numeric' }); }catch{ return '—'; } })(product.created_at));
      setText('#productCode', product.code != null ? String(product.code) : '—');
    } catch {}

    // Populate Main Image and Thumbnails
    const mainImage = document.getElementById('mainImage');
    const thumbs = document.querySelector('.image-thumbnails');
    const rawImages = Array.isArray(product.product_images) ? product.product_images : [];
    const images = rawImages.map(i => ({ ...i, image_url: normalizeImageUrl(i.image_url) })).filter(i => !!i.image_url);
    const primaryImage = images.find(img => img.is_primary) || images[0];
    if (mainImage) {
      mainImage.src = (primaryImage?.image_url) || 'https://via.placeholder.com/800x450/1a1a2e/ffffff?text=صورة+المنتج';
      mainImage.alt = product.name || 'صورة المنتج';
    }
    if (thumbs) {
      thumbs.innerHTML = '';
      if (images.length > 0) {
        images.forEach((img, idx) => {
          const div = document.createElement('div');
          div.className = `thumbnail ${img.image_url === mainImage.src ? 'active' : ''}`;
          div.dataset.image = img.image_url;
          div.innerHTML = `<img src="${img.image_url}" alt="Thumbnail ${idx + 1}">`;
          div.addEventListener('click', () => {
            if (mainImage) mainImage.src = img.image_url;
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            div.classList.add('active');
          });
          thumbs.appendChild(div);
        });
      } else {
        // keep existing placeholders
      }
    }

    // Populate Price
    const priceEl = document.querySelector('.selling-price');
    if (priceEl) {
      const usd = product.selling_price != null ? Number(product.selling_price) : null;
      priceEl.innerHTML = usd != null ? `${usd.toLocaleString('en-US', { maximumFractionDigits: 2 })} <i class="fas fa-dollar-sign"></i>` : '—';
    }

    // Wire WhatsApp order button to target number with product context
    const waBtn = document.querySelector('.product-actions .conect-btn');
    if (waBtn) {
      waBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const waPhone = '8613020990375'; // target number without plus
        const detailsUrl = `${window.location.origin}/product-guest.html?id=${product.id}`;
        const msg = `السلام عليكم، أود طلب هذا المنتج:\n${product.name || ''}\n${product.selling_price != null ? 'السعر: ' + product.selling_price + ' USD' : ''}\n${detailsUrl}`;
        const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
      });
    }

  } catch (e) {
    console.error('product-guest-logic error:', e);
    alert('حدث خطأ غير متوقع.');
  }
});
