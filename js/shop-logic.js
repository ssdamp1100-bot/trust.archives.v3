// Public Shop Logic (no auth required)
(function(){
  const state = {
    products: [],
    filtered: [],
    cart: loadCart()
  };

  const els = {
    grid: document.getElementById('productsGrid'),
    empty: document.getElementById('emptyState'),
    search: document.getElementById('shopSearch'),
    clear: document.getElementById('clearSearch'),
    openCart: document.getElementById('openCart'),
    cartCount: document.getElementById('cartCount'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    searchInput: document.getElementById('searchInput'),
    sortFilter: document.getElementById('sortFilter'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn')
  };

  init();

  async function init(){
    bindUI();
    updateCartCount();
    await loadProducts();
    render();
  }

  function bindUI(){
    if (els.search) {
      els.search.addEventListener('input', applySearch);
    }
    if (els.clear) {
      els.clear.addEventListener('click', () => {
        els.search.value = '';
        applySearch();
        els.search.focus();
      });
    }
    if (els.searchInput) {
      els.searchInput.addEventListener('input', applyFilters);
    }
    if (els.sortFilter) {
      els.sortFilter.addEventListener('change', applyFilters);
    }
    if (els.clearFiltersBtn) {
      els.clearFiltersBtn.addEventListener('click', () => {
        if (els.searchInput) els.searchInput.value = '';
        if (els.sortFilter) els.sortFilter.value = 'date';
        applyFilters();
      });
    }
    if (els.openCart) {
      els.openCart.addEventListener('click', showCartModal);
    }
    if (els.checkoutBtn) {
      els.checkoutBtn.addEventListener('click', checkoutWhatsApp);
    }
  }

  async function loadProducts(){
    try {
      const res = await window.productsService.getProducts();
      if (!res.success) throw new Error(res.error || 'failed');
      state.products = Array.isArray(res.products) ? res.products : [];
      state.filtered = state.products.slice();
    } catch (e) {
      console.error('Shop loadProducts error:', e);
      state.products = [];
      state.filtered = [];
    }
  }

  function applySearch(){
    const q = (els.search?.value || '').trim().toLowerCase();
    if (!q) {
      state.filtered = state.products.slice();
      return render();
    }
    state.filtered = state.products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = (p.categories?.name || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
    render();
  }

  function applyFilters(){
    const q = (els.searchInput?.value || '').trim().toLowerCase();
    const sort = els.sortFilter?.value || 'date';

    let arr = state.products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const matchesQ = !q || name.includes(q) || desc.includes(q);
      return matchesQ;
    });

    if (sort === 'price-high') {
      arr.sort((a,b) => (b.selling_price||0) - (a.selling_price||0));
    } else if (sort === 'price-low') {
      arr.sort((a,b) => (a.selling_price||0) - (b.selling_price||0));
    } else {
      arr.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    }

    state.filtered = arr;
    render();
  }

  function render(){
    const list = state.filtered;
    if (!els.grid || !els.empty) return;
    els.grid.innerHTML = '';
    if (!list.length) {
      els.empty.style.display = 'block';
      return;
    }
    els.empty.style.display = 'none';

    list.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.setAttribute('data-id', product.id);
      card.setAttribute('data-category', product.categories?.name || '');
      card.setAttribute('data-supplier', (product.product_suppliers?.[0]?.supplier_name) || '');
      card.setAttribute('data-user', product.users?.username || '');

      const primaryImage = pickPrimaryImage(product.product_images) || 'https://via.placeholder.com/400x200/1a1a2e/ffffff?text=صورة+المنتج';

      card.innerHTML = `
        <div class="product-image-container">
          <div class="product-meta-overlay">
            <span class="product-category"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(product.categories?.name || 'غير محدد')}</span>
            <span class="product-supplier">${escapeHtml(product.product_suppliers?.[0]?.supplier_name || 'غير محدد')}</span>
            <span class="product-serial">SN: ${escapeHtml(product.code || '')}</span>
          </div>
          <div class="product-image">
            <img src="${escapeHtml(primaryImage)}" alt="${escapeHtml(product.name||'')}" onerror="this.src='https://via.placeholder.com/400x200/1a1a2e/ffffff?text=صورة+المنتج'">
          </div>
        </div>
        <div class="product-info">
          <h3 class="product-title">${escapeHtml(product.name || 'منتج')}<span><i class="fa fa-address-book-o" aria-hidden="true"></i> ${escapeHtml(product.users?.username || 'غير محدد')}</span></h3>
          <div class="product-meta-overlay2">
            <span class="product-category2">${escapeHtml(product.categories?.name || 'غير محدد')}</span>
            <span class="product-supplier2">${escapeHtml(product.product_suppliers?.[0]?.supplier_name || 'غير محدد')}</span>
            <span class="product-serial2">SN: ${escapeHtml(product.code || '')}</span>
            <span class="product-price2">$${escapeHtml(String(product.selling_price || 0))}</span>
          </div>
          <p class="product-description">${escapeHtml(product.description || 'لا يوجد وصف')}</p>
          <div class="product-prices">
            <div class="price-item">
              <span class="price-label">أفضل سعر : </span>
              <span class="price-amount">$${escapeHtml(String(product.selling_price || 0))}</span>
              <span class="price-currency">USD</span>
            </div>
          </div>
          <div class="product-actions">
            <a href="product.html?id=${product.id}" class="product-button"><i class="fa-solid fa-info"></i> عرض التفاصيل</a>
            <button class="product-button" data-add="${product.id}"><i class="fa-solid fa-cart-plus"></i> أضف للسلة</button>
          </div>
        </div>
      `;

      const addBtn = card.querySelector('button[data-add]');
      if (addBtn) addBtn.addEventListener('click', () => addToCart(product));
      els.grid.appendChild(card);
    });
  }

  function pickPrimaryImage(images){
    if (!Array.isArray(images) || !images.length) return '';
    const primary = images.find(i => i.is_primary) || images[0];
    return primary?.image_url || '';
  }

  function addToCart(product){
    const id = product.id;
    const existing = state.cart.find(it => it.id === id);
    if (existing) existing.qty += 1; else state.cart.push({ id, name: product.name, price: product.selling_price||0, qty: 1 });
    persistCart();
    updateCartCount();
    toast('تمت الإضافة إلى السلة');
  }

  function removeFromCart(id){
    const idx = state.cart.findIndex(it => it.id === id);
    if (idx >= 0) {
      state.cart.splice(idx, 1);
      persistCart();
      updateCartCount();
    }
  }

  function updateQty(id, qty){
    const item = state.cart.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.max(1, qty|0);
    persistCart();
    updateCartCount();
  }

  function cartSummary(){
    const total = state.cart.reduce((s, it) => s + (it.price||0) * (it.qty||1), 0);
    return { count: state.cart.reduce((s,it)=>s+(it.qty||1),0), total };
  }

  function updateCartCount(){
    const { count } = cartSummary();
    if (!els.cartCount) return;
    if (count > 0){
      els.cartCount.style.display = 'inline-block';
      els.cartCount.textContent = String(count);
    } else {
      els.cartCount.style.display = 'none';
    }
  }

  function showCartModal(){
    const wrapper = document.createElement('div');
    wrapper.className = 'modal active';
    const rows = state.cart.map(it => `
      <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
        <div style="flex:1;color:#fff">${escapeHtml(it.name)}</div>
        <div style="display:flex;gap:6px;align-items:center">
          <input type="number" min="1" value="${it.qty}" style="width:64px;padding:6px;border-radius:6px;border:1px solid #334155;background:#0b1220;color:#fff" data-qty="${it.id}" />
          <div style="color:#22c55e;font-weight:700">${formatPrice(it.price)}</div>
          <button class="product-button danger" data-remove="${it.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('') || '<div style="padding:12px;color:#94a3b8">السلة فارغة</div>';

    const { total } = cartSummary();

    wrapper.innerHTML = `
      <div class="modal-content" style="max-width:720px">
        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        <h3 style="color:#fff;margin-bottom:12px"><i class="fa-solid fa-cart-shopping"></i> السلة</h3>
        <div>${rows}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
          <div style="color:#22c55e;font-weight:800">الإجمالي: ${formatPrice(total)}</div>
          <div style="display:flex;gap:8px">
            <button class="product-button" onclick="document.querySelector('.modal.active')?.remove()">إغلاق</button>
            <button class="product-button primary" onclick="document.querySelector('.modal.active')?.remove();">متابعة التسوق</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(wrapper);

    wrapper.addEventListener('input', (e) => {
      const t = e.target;
      if (t && t.matches('input[type="number"][data-qty]')){
        const id = t.getAttribute('data-qty');
        updateQty(id, parseInt(t.value||'1',10));
      }
    });
    wrapper.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-remove]');
      if (btn){
        const id = btn.getAttribute('data-remove');
        removeFromCart(id);
        btn.closest('div[style]')?.remove();
      }
    });
  }

  function checkoutWhatsApp(){
    if (!state.cart.length){
      return toast('السلة فارغة');
    }
    const phone = getWhatsAppNumber(); // customize below if needed
    const lines = state.cart.map(it => `• ${it.name} x${it.qty} — ${formatPrice(it.price)}`);
    const { total } = cartSummary();
    const msg = `طلب جديد:%0A${lines.join('%0A')}%0A— — —%0Aالإجمالي: ${encodeURIComponent(formatPrice(total))}%0A`;
    const url = `https://wa.me/${phone}?text=${msg}`;
    window.open(url, '_blank');
  }

  function getWhatsAppNumber(){
    // Default number placeholder (owner number). Replace with real business number.
    return '967777967272';
  }

  function formatPrice(val){
    const n = Number(val||0);
    try{
      return new Intl.NumberFormat('ar-SA', { style:'currency', currency:'USD', minimumFractionDigits:0 }).format(n);
    }catch{
      return `${n} $`;
    }
  }

  function toast(text){
    let el = document.querySelector('.shop-toast');
    if (!el){
      el = document.createElement('div');
      el.className = 'shop-toast';
      Object.assign(el.style, {position:'fixed',bottom:'20px',right:'20px',background:'#111827',color:'#fff',padding:'10px 12px',borderRadius:'8px',zIndex:3000});
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.opacity = '1';
    setTimeout(()=>{ el.style.opacity = '0'; }, 1800);
  }

  function loadCart(){
    try{ return JSON.parse(localStorage.getItem('shop_cart')||'[]'); }catch{ return []; }
  }
  function persistCart(){
    localStorage.setItem('shop_cart', JSON.stringify(state.cart));
  }

  function escapeHtml(s){
    return String(s||'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }
})();
