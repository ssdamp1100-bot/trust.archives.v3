document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Protect page
    if (!window.authService || !window.authService.isLoggedIn()) {
      window.location.href = 'index.html';
      return;
    }

    const qs = new URLSearchParams(window.location.search);
    const supplierId = qs.get('id');
    if (!supplierId) {
      alert('لا يوجد معرف مورد في الرابط');
      window.location.href = 'suppliers.html';
      return;
    }

    const el = {
      logo: document.getElementById('supplierLogo'),
      name: document.getElementById('supplierName'),
      desc: document.getElementById('supplierDescription'),
      country: document.getElementById('supplierCountry'),
      industry: document.getElementById('supplierIndustry'),
      exp: document.getElementById('supplierExperience'),
      created: document.getElementById('supplierCreatedAt'),
      user: document.getElementById('supplierUser'),
      serial: document.getElementById('supplierSerial'),
      shipping: document.getElementById('supplierShipping'),
      payment: document.getElementById('supplierPayment'),
      certs: document.getElementById('supplierCertificates'),
      rating: document.getElementById('supplierRating'),
      phone: document.getElementById('supplierPhone'),
      email: document.getElementById('supplierEmail'),
      website: document.getElementById('supplierWebsite'),
      address: document.getElementById('supplierAddress'),
      callLink: document.getElementById('callLink'),
      whatsappLink: document.getElementById('whatsappLink'),
      emailLink: document.getElementById('emailLink'),
      websiteLink: document.getElementById('websiteLink'),
      facebookLink: document.getElementById('facebookLink'),
      mapLink: document.getElementById('mapLink'),
      wechatLink: document.getElementById('wechatLink'),
      instagramLink: document.getElementById('instagramLink'),
      productsList: document.getElementById('mainProductsList'),
      pdfLink: document.getElementById('supplierPdfLink'),
    };

    const { success, supplier, error } = await window.suppliersService.getSupplierById(supplierId);
    if (!success || !supplier) {
      console.error('Failed to load supplier:', error);
      alert('تعذر تحميل بيانات المورد');
      window.location.href = 'suppliers.html';
      return;
    }

    const formatDate = (iso) => {
      if (!iso) return '—';
      try { return new Date(iso).toLocaleDateString('ar-YE'); } catch { return '—'; }
    };
    const joinList = (v) => Array.isArray(v) ? v.filter(Boolean).join('، ') : (v || '—');
    const normalizePhone = (v) => (v || '').toString().replace(/[^\d+]/g, '').trim();

    // Header
    if (el.logo) el.logo.src = supplier.logo_url || el.logo.src;
    if (el.name) el.name.innerHTML = `<i class="fas fa-building"></i> ${supplier.name || '—'}`;
    if (el.desc) el.desc.innerHTML = `<i class=\"fas fa-star\"></i> ${supplier.description || '—'}`;

    // Basic info
    if (el.country) el.country.textContent = supplier.country || '—';
    // industry might be CSV or array
    const industryStr = Array.isArray(supplier.industry) ? joinList(supplier.industry) : (supplier.industry || '—');
    if (el.industry) el.industry.textContent = industryStr;
    if (el.exp) el.exp.textContent = supplier.experience_years != null ? `${supplier.experience_years} سنة` : '—';
    if (el.created) el.created.textContent = formatDate(supplier.created_at);
    if (el.user) el.user.textContent = supplier.users?.username || '—';
    if (el.serial) el.serial.textContent = supplier.id ? supplier.id.slice(-4) : '—';
    if (el.rating) el.rating.textContent = supplier.rating != null ? `${supplier.rating} نقطة` : '—';

    // Shipping/payment/certs
    if (el.shipping) el.shipping.textContent = joinList(supplier.shipping_methods);
    if (el.payment) el.payment.textContent = joinList(supplier.payment_methods);
    if (el.certs) el.certs.textContent = joinList(supplier.certificates);

    // Contact info JSON
    const contact = supplier.contact_info || {};
    const primaryPhone = normalizePhone((contact.phones && contact.phones[0]) || '');
    if (el.phone) el.phone.textContent = primaryPhone || '—';
    if (el.email) el.email.textContent = (contact.emails && contact.emails[0]) || '—';
    if (el.website) {
      const site = supplier.website_url || '#';
      el.website.href = site || '#';
      el.website.textContent = site && site !== '#' ? site.replace(/^https?:\/\//, '') : '—';
    }
    if (el.address) el.address.textContent = supplier.address || '—';

    // Quick actions
    if (el.callLink) el.callLink.href = primaryPhone ? `tel:${primaryPhone}` : '#';
    const waPhone = normalizePhone(contact.whatsapp || primaryPhone);
    if (el.whatsappLink) el.whatsappLink.href = waPhone ? `https://wa.me/${waPhone}` : '#';
    const emailTo = (contact.emails && contact.emails[0]) || '';
    if (el.emailLink) el.emailLink.href = emailTo ? `mailto:${emailTo}` : '#';
    if (el.websiteLink) el.websiteLink.href = supplier.website_url || '#';
    if (el.mapLink) el.mapLink.href = supplier.map_url || '#';
    if (el.facebookLink) el.facebookLink.href = contact.facebook || '#';
    if (el.wechatLink) el.wechatLink.href = contact.wechat ? `https://wechat.com/${encodeURIComponent(contact.wechat)}` : '#';
    if (el.instagramLink) el.instagramLink.href = contact.instagram || '#';

    // Main products
    if (el.productsList) {
      const prods = Array.isArray(supplier.main_products) ? supplier.main_products : [];
      el.productsList.innerHTML = '';
      if (prods.length === 0) {
        el.productsList.innerHTML = '<div class="product-card"><div class="product-info"><p>لا توجد عناصر</p></div></div>';
      } else {
        prods.forEach((p) => {
          const item = document.createElement('div');
          item.className = 'product-card';
          item.innerHTML = `<div class="product-info"><h4>${p}</h4></div>`;
          el.productsList.appendChild(item);
        });
      }
    }

    // Supplier PDF link (if stored somewhere; currently not part of supplier schema)
    // If later you store a pdf_url in contact_info or another field, wire it here
    if (el.pdfLink) {
      const pdfUrl = (supplier.contact_info && supplier.contact_info.pdf_url) || null;
      if (pdfUrl) {
        el.pdfLink.href = pdfUrl;
        el.pdfLink.style.display = '';
      } else {
        el.pdfLink.style.display = 'none';
      }
    }
  } catch (e) {
    console.error('single-supplier error:', e);
  }
});
