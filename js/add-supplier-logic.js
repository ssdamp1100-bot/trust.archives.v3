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

  // === 8. معالج إرسال النموذج ===
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

      // === إنشاء المورد ===
      const result = await window.suppliersService.createSupplier(supplierData);
      
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
      
      alert('✅ تم حفظ بيانات المورد بنجاح!');
      window.location.href = 'suppliers.html';

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

  // === 9. دوال جمع البيانات المعقدة ===
  
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
