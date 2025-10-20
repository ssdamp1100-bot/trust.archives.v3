/**
 * Add Supplier Logic - منطق إضافة مورد جديد
 * نظيف ومنظم - إصدار 2.0
 */

document.addEventListener('DOMContentLoaded', () => {
  // === 1. حماية الصفحة ===
  if (!window.authService || !window.authService.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  // === 2. العناصر الرئيسية ===
  const form = document.getElementById('supplierForm');
  if (!form) {
    console.error('supplierForm غير موجود في الصفحة');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const logoInput = document.getElementById('add-supplier-logo');

  // === تفعيل الحفظ التلقائي ===
  let autoSave = null;
  if (window.FormAutoSave) {
    autoSave = new window.FormAutoSave('supplierForm', {
      saveDelay: 1000,
      excludeFields: ['add-supplier-logo'] // لا نحفظ الملفات
    });
  }

  // === 3. دوال مساعدة ===
  const getVal = (id) => document.getElementById(id)?.value || '';
  const getValTrimmed = (id) => getVal(id).trim();
  const normalizePhone = (v) => String(v || '').replace(/[^\d+]/g, '').trim();
  
  const parseExperience = (text) => {
    const match = String(text).match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  const collectCheckboxValues = (name) => {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
      .map(cb => cb.value);
  };

  const collectTodoItems = (listId) => {
    return Array.from(document.querySelectorAll(`#${listId} .todo-item span`))
      .map(span => span.textContent.trim())
      .filter(Boolean);
  };

  // === 4. إدارة الحقول الديناميكية ===
  window.addPhoneField = function() {
    const container = document.getElementById('phoneFields');
    if (!container) return;
    
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'add-supplier-field-group';
    fieldGroup.innerHTML = `
      <input type="tel" placeholder="+86 138 0013 8000" class="phone-input">
      <button type="button" onclick="removeField(this)" class="add-supplier-add-field-btn" style="background: #e74c3c;">
        <i class="fas fa-minus"></i>
      </button>
    `;
    container.appendChild(fieldGroup);
  };

  window.addEmailField = function() {
    const container = document.getElementById('emailFields');
    if (!container) return;
    
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'add-supplier-field-group';
    fieldGroup.innerHTML = `
      <input type="email" placeholder="supplier@company.com" class="email-input">
      <button type="button" onclick="removeField(this)" class="add-supplier-add-field-btn" style="background: #e74c3c;">
        <i class="fas fa-minus"></i>
      </button>
    `;
    container.appendChild(fieldGroup);
  };

  window.removeField = function(btn) {
    btn?.parentElement?.remove();
  };

  // === 5. عرض اسم الملف عند اختيار الشعار ===
  if (logoInput) {
    logoInput.addEventListener('change', function() {
      const fileInfo = document.getElementById('file-info');
      const fileName = document.getElementById('file-name');
      
      if (this.files && this.files.length > 0) {
        if (fileName) fileName.textContent = this.files[0].name;
        if (fileInfo) fileInfo.style.display = 'flex';
      } else {
        if (fileInfo) fileInfo.style.display = 'none';
      }
    });
  }

  // === 6. إدارة قائمة المنتجات الرئيسية ===
  const setupTodoList = (inputId, btnId, listId) => {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    const list = document.getElementById(listId);
    
    if (!input || !btn || !list) return;

    const addItem = () => {
      const value = input.value.trim();
      if (!value) return;

      const item = document.createElement('div');
      item.className = 'todo-item';
      item.innerHTML = `
        <span>${value}</span>
        <button type="button" class="remove-item-btn">×</button>
      `;
      
      item.querySelector('.remove-item-btn').addEventListener('click', () => {
        item.remove();
      });
      
      list.appendChild(item);
      input.value = '';
      input.focus();
    };

    btn.addEventListener('click', addItem);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addItem();
      }
    });
  };

  setupTodoList('product-input', 'add-product-btn', 'products-list');
  setupTodoList('contact-method-input', 'add-contact-method-btn', 'contact-methods-list');

  // === 7. Toggle للصناعة الأخرى ===
  const otherIndustryCheckbox = document.getElementById('other-industry-checkbox');
  const otherIndustryInput = document.getElementById('other-industry-input');
  if (otherIndustryCheckbox && otherIndustryInput) {
    otherIndustryCheckbox.addEventListener('change', function() {
      otherIndustryInput.style.display = this.checked ? 'block' : 'none';
    });
  }

  // === 8. وضع التعديل: قراءة id وتعبئة الحقول ===
  const qs = new URLSearchParams(window.location.search);
  const editSupplierId = qs.get('id');

  async function populateSupplierForm(s){
    try{
      // أساسية
      const setVal = (id, v)=>{ const el = document.getElementById(id); if (el) el.value = v ?? '' };
      setVal('add-supplier-name', s.name);
      setVal('add-supplier-country', s.country);
      setVal('add-supplier-description', s.description);
      setVal('add-supplier-experience', s.experience_years);
      setVal('add-supplier-website', s.website_url);
      setVal('add-supplier-address', s.address);
      setVal('add-supplier-map', s.map_url);
      setVal('add-supplier-notes', s.notes);

      // الصناعات
      const industriesStr = typeof s.industry === 'string' ? s.industry : Array.isArray(s.industry)? s.industry.join(', ') : '';
      // ضع قيم الصناعات إن كانت مربعات اختيار
      document.querySelectorAll('input[name="industry"]').forEach(cb=>{ cb.checked = false; });
      industriesStr.split(',').map(x=>x.trim()).filter(Boolean).forEach(val=>{
        const cb = document.querySelector(`input[name="industry"][value="${CSS.escape(val)}"]`);
        if (cb) cb.checked = true; else {
          const other = document.querySelector('#other-industry-input input');
          const otherChk = document.getElementById('other-industry-checkbox');
          if (other && otherChk && !other.value){ otherChk.checked = true; other.value = val; other.parentElement.style.display = 'block'; }
        }
      });

      // طرق الدفع/الشحن
      const checkMany = (name, values)=>{
        const set = new Set((values||[]).map(v=>String(v)));
        document.querySelectorAll(`input[name="${name}"]`).forEach(cb=>{ cb.checked = set.has(cb.value); });
      };
      checkMany('payment', s.payment_methods||[]);
      checkMany('shipping', s.shipping_methods||[]);

      // الشهادات
      checkMany('certificates', s.certificates||[]);

      // المنتجات الرئيسية (todo list)
      const fillTodo = (listId, items)=>{
        const list = document.getElementById(listId);
        if (!list) return;
        list.innerHTML = '';
        (items||[]).forEach(txt=>{
          const div = document.createElement('div');
          div.className = 'todo-item';
          div.innerHTML = `<span>${txt}</span><button type="button" class="remove-item-btn">×</button>`;
          div.querySelector('.remove-item-btn').addEventListener('click', ()=>div.remove());
          list.appendChild(div);
        });
      };
      fillTodo('products-list', s.main_products||[]);

      // طرق تواصل
      const ci = s.contact_info || {};
      setVal('add-supplier-whatsapp', ci.whatsapp);
      setVal('add-supplier-wechat', ci.wechat);
      setVal('add-supplier-facebook', ci.facebook);
      setVal('add-supplier-twitter', ci.twitter);
      setVal('add-supplier-instagram', ci.instagram);
      fillTodo('contact-methods-list', ci.other_methods||[]);

      // الهواتف
      const phoneCont = document.getElementById('phoneFields');
      if (phoneCont){
        phoneCont.innerHTML = '';
        (ci.phones||[]).forEach(ph=>{
          const group = document.createElement('div');
          group.className = 'add-supplier-field-group';
          group.innerHTML = `
            <input type="tel" placeholder="+86 138 0013 8000" class="phone-input" value="${ph}">
            <button type="button" onclick="removeField(this)" class="add-supplier-add-field-btn" style="background: #e74c3c;">
              <i class="fas fa-minus"></i>
            </button>`;
          phoneCont.appendChild(group);
        });
      }

      // الإيميلات
      const emailCont = document.getElementById('emailFields');
      if (emailCont){
        emailCont.innerHTML = '';
        (ci.emails||[]).forEach(em=>{
          const group = document.createElement('div');
          group.className = 'add-supplier-field-group';
          group.innerHTML = `
            <input type="email" placeholder="supplier@company.com" class="email-input" value="${em}">
            <button type="button" onclick="removeField(this)" class="add-supplier-add-field-btn" style="background: #e74c3c;">
              <i class="fas fa-minus"></i>
            </button>`;
          emailCont.appendChild(group);
        });
      }

      // زر حفظ
      if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
    }catch(e){ console.warn('populateSupplierForm error:', e); }
  }

  (async function(){
    if (editSupplierId){
      try{
        const res = await window.suppliersService.getSupplierById(editSupplierId);
        if (res?.success && res.supplier){ await populateSupplierForm(res.supplier); }
      }catch(e){ console.warn('load supplier for edit failed', e); }
    }
  })();

  // === 9. معالج إرسال النموذج ===
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (submitBtn?.disabled) return;

    // تعطيل الزر وإظهار حالة التحميل
    const originalBtnText = submitBtn?.innerHTML || '';
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
      submitBtn.disabled = true;
    }

    try {
      // === التحقق من الحقول الإلزامية ===
      const name = getValTrimmed('add-supplier-name');
      const country = getValTrimmed('add-supplier-country');
      
      if (!name || !country) {
        throw new Error('اسم المورد والبلد حقول إلزامية');
      }

      // === جمع البيانات ===
      const supplierData = {
        // معلومات أساسية
        name: name,
        country: country,
        description: getValTrimmed('add-supplier-description'),
        experience_years: parseExperience(getVal('add-supplier-experience')),
        
        // الروابط والعناوين
        website_url: getValTrimmed('add-supplier-website'),
        address: getValTrimmed('add-supplier-address'),
        map_url: getValTrimmed('add-supplier-map'),
        
        // الصناعات
        industry: collectIndustries(),
        
        // طرق الدفع والشحن
        payment_methods: collectCheckboxValues('payment'),
        shipping_methods: collectCheckboxValues('shipping'),
        
        // المنتجات الرئيسية
        main_products: collectTodoItems('products-list'),
        
        // الشهادات
        certificates: collectCheckboxValues('certificates'),
        
        // معلومات التواصل
        contact_info: collectContactInfo(),
        
        // ملاحظات
        notes: getValTrimmed('add-supplier-notes')
      };

      let result;
      if (editSupplierId){
        // تحديث مورد
        const upd = await window.suppliersService.updateSupplier(editSupplierId, supplierData);
        if (!upd?.success) throw new Error(upd?.error || 'فشل حفظ التعديلات');
        result = { success: true, supplier: upd.supplier };
      } else {
        // إنشاء مورد جديد
        result = await window.suppliersService.createSupplier(supplierData);
      }
      
      if (!result?.success) {
        throw new Error(result?.error || 'فشل حفظ المورد');
      }

      // === رفع الشعار إن وُجد ===
      if (logoInput?.files?.[0]) {
        const uploadResult = await window.suppliersService.uploadSupplierLogo(
          result.supplier.id,
          logoInput.files[0]
        );
        if (!uploadResult?.success) {
          console.warn('فشل رفع الشعار:', uploadResult?.error);
        }
      }

      // === النجاح ===
      // مسح البيانات المحفوظة تلقائياً
      if (autoSave) autoSave.clearSavedData();
      
      alert(editSupplierId ? '✅ تم حفظ تعديلات المورد بنجاح!' : '✅ تم حفظ بيانات المورد بنجاح!');
      window.location.href = 'admin.html';

    } catch (error) {
      console.error('Error saving supplier:', error);
      alert(`❌ حدث خطأ في حفظ المورد:\n${error.message}`);
    } finally {
      // إعادة الزر لحالته الأصلية
      if (submitBtn) {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    }
  });

  // === 10. دوال جمع البيانات المعقدة ===
  
  function collectIndustries() {
    const industries = [];
    
    document.querySelectorAll('input[name="industry"]:checked').forEach(checkbox => {
      if (checkbox.value === 'other') {
        const otherInput = document.querySelector('#other-industry-input input');
        const value = otherInput?.value?.trim();
        if (value) industries.push(value);
      } else {
        industries.push(checkbox.value);
      }
    });
    
    return industries.join(', ');
  }

  function collectContactInfo() {
    const phones = [];
    const emails = [];
    
    // جمع الهواتف
    document.querySelectorAll('#phoneFields .phone-input').forEach(input => {
      const phone = normalizePhone(input.value);
      if (phone) phones.push(phone);
    });
    
    // جمع الإيميلات
    document.querySelectorAll('#emailFields .email-input').forEach(input => {
      const email = input.value.trim();
      if (email) emails.push(email);
    });
    
    return {
      phones: phones,
      emails: emails,
      whatsapp: normalizePhone(getVal('add-supplier-whatsapp')),
      wechat: getValTrimmed('add-supplier-wechat'),
      facebook: getValTrimmed('add-supplier-facebook'),
      twitter: getValTrimmed('add-supplier-twitter'),
      instagram: getValTrimmed('add-supplier-instagram'),
      other_methods: collectTodoItems('contact-methods-list')
    };
  }
});
