/**
 * Form Auto-Save - نظام الحفظ التلقائي للنماذج
 * يحفظ بيانات النماذج في localStorage ويستعيدها عند إعادة تحميل الصفحة
 */

(function() {
  'use strict';

  class FormAutoSave {
    constructor(formId, options = {}) {
      this.formId = formId;
      this.form = document.getElementById(formId);
      this.storageKey = `autosave_${formId}`;
      this.saveDelay = options.saveDelay || 500; // تأخير الحفظ بالمللي ثانية
      this.excludeFields = options.excludeFields || []; // حقول لا يتم حفظها (مثل كلمات المرور)
      this.saveTimer = null;
      this.lastSaveIndicator = null;

      if (!this.form) {
        console.warn(`Form with id "${formId}" not found`);
        return;
      }

      this.init();
    }

    init() {
      // استرجاع البيانات المحفوظة عند التحميل
      this.restoreFormData();
      
      // إضافة مستمعي الأحداث
      this.attachEventListeners();
      
      // إضافة مؤشر الحفظ
      this.createSaveIndicator();
      
      // إضافة زر المسح
      this.createClearButton();
    }

    attachEventListeners() {
      // حفظ عند تغيير أي حقل
      this.form.addEventListener('input', (e) => {
        if (!this.excludeFields.includes(e.target.id)) {
          this.debouncedSave();
        }
      });

      this.form.addEventListener('change', (e) => {
        if (!this.excludeFields.includes(e.target.id)) {
          this.debouncedSave();
        }
      });

      // مسح البيانات عند الإرسال الناجح
      this.form.addEventListener('submit', () => {
        // سنمسح البيانات عندما ينجح الإرسال فعلياً
        // يتم استدعاء clearSavedData() يدوياً بعد النجاح
      });
    }

    debouncedSave() {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        this.saveFormData();
      }, this.saveDelay);
    }

    saveFormData() {
      const formData = {};
      const elements = this.form.elements;

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        
        if (!element.name && !element.id) continue;
        if (this.excludeFields.includes(element.id)) continue;

        const key = element.id || element.name;

        if (element.type === 'checkbox') {
          if (!formData[key]) formData[key] = [];
          if (element.checked) {
            formData[key].push(element.value);
          }
        } else if (element.type === 'radio') {
          if (element.checked) {
            formData[key] = element.value;
          }
        } else if (element.type === 'file') {
          // لا نحفظ الملفات في localStorage
          continue;
        } else {
          formData[key] = element.value;
        }
      }

      // حفظ القوائم الديناميكية (todo lists)
      this.saveDynamicLists(formData);

      try {
        localStorage.setItem(this.storageKey, JSON.stringify({
          data: formData,
          timestamp: new Date().toISOString()
        }));
        this.showSaveIndicator('تم الحفظ ✓');
      } catch (e) {
        console.error('Error saving form data:', e);
        this.showSaveIndicator('فشل الحفظ ✗', 'error');
      }
    }

    saveDynamicLists(formData) {
      // حفظ قوائم المنتجات/الاستخدامات/الميزات etc
      const todoLists = this.form.querySelectorAll('.todo-list-items, [id$="-list"], [id*="Container"] .product-field-input');
      
      // Products list
      const productsList = this.form.querySelector('#products-list');
      if (productsList) {
        formData['_dynamic_products'] = Array.from(productsList.querySelectorAll('.todo-item span'))
          .map(span => span.textContent.trim());
      }

      // Contact methods list
      const contactMethodsList = this.form.querySelector('#contact-methods-list');
      if (contactMethodsList) {
        formData['_dynamic_contact_methods'] = Array.from(contactMethodsList.querySelectorAll('.todo-item span'))
          .map(span => span.textContent.trim());
      }

      // Features, usages, keywords for products
      ['featuresContainer', 'usagesContainer', 'keywordsContainer', 'negativePointsContainer'].forEach(containerId => {
        const container = this.form.querySelector(`#${containerId}`);
        if (container) {
          const items = Array.from(container.querySelectorAll('.product-field-input'))
            .map(input => input.value.trim())
            .filter(Boolean);
          if (items.length > 0) {
            formData[`_dynamic_${containerId}`] = items;
          }
        }
      });
    }

    restoreFormData() {
      try {
        const saved = localStorage.getItem(this.storageKey);
        if (!saved) return;

        const { data, timestamp } = JSON.parse(saved);
        
        // التحقق من عمر البيانات (مثلاً: حذف بعد 7 أيام)
        const savedDate = new Date(timestamp);
        const daysSince = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 7) {
          this.clearSavedData();
          return;
        }

        // استعادة الحقول العادية
        Object.keys(data).forEach(key => {
          if (key.startsWith('_dynamic_')) return; // سنتعامل مع هذه لاحقاً

          const elements = this.form.querySelectorAll(`[id="${key}"], [name="${key}"]`);
          
          elements.forEach(element => {
            if (element.type === 'checkbox') {
              element.checked = Array.isArray(data[key]) && data[key].includes(element.value);
            } else if (element.type === 'radio') {
              element.checked = element.value === data[key];
            } else if (element.type !== 'file') {
              element.value = data[key] || '';
            }
          });
        });

        // استعادة القوائم الديناميكية
        this.restoreDynamicLists(data);

        this.showSaveIndicator('تم استرجاع البيانات المحفوظة', 'success');
      } catch (e) {
        console.error('Error restoring form data:', e);
      }
    }

    restoreDynamicLists(data) {
      // استعادة قائمة المنتجات
      if (data._dynamic_products && data._dynamic_products.length > 0) {
        const productsList = this.form.querySelector('#products-list');
        const addBtn = this.form.querySelector('#add-product-btn');
        if (productsList && addBtn) {
          data._dynamic_products.forEach(product => {
            const item = document.createElement('div');
            item.className = 'todo-item';
            item.innerHTML = `
              <span>${product}</span>
              <button type="button" class="remove-item-btn">×</button>
            `;
            item.querySelector('.remove-item-btn').addEventListener('click', () => {
              item.remove();
              this.debouncedSave();
            });
            productsList.appendChild(item);
          });
        }
      }

      // استعادة قائمة وسائل التواصل
      if (data._dynamic_contact_methods && data._dynamic_contact_methods.length > 0) {
        const contactMethodsList = this.form.querySelector('#contact-methods-list');
        if (contactMethodsList) {
          data._dynamic_contact_methods.forEach(method => {
            const item = document.createElement('div');
            item.className = 'todo-item';
            item.innerHTML = `
              <span>${method}</span>
              <button type="button" class="remove-item-btn">×</button>
            `;
            item.querySelector('.remove-item-btn').addEventListener('click', () => {
              item.remove();
              this.debouncedSave();
            });
            contactMethodsList.appendChild(item);
          });
        }
      }

      // استعادة حقول المنتجات الديناميكية
      ['featuresContainer', 'usagesContainer', 'keywordsContainer', 'negativePointsContainer'].forEach(containerId => {
        const dynamicKey = `_dynamic_${containerId}`;
        if (data[dynamicKey] && data[dynamicKey].length > 0) {
          const container = this.form.querySelector(`#${containerId}`);
          if (container) {
            data[dynamicKey].forEach((value, index) => {
              if (index === 0) {
                // املأ الحقل الأول
                const firstInput = container.querySelector('.product-field-input');
                if (firstInput) firstInput.value = value;
              } else {
                // أضف حقول إضافية
                const fieldGroup = document.createElement('div');
                fieldGroup.className = 'product-field-group';
                fieldGroup.innerHTML = `
                  <input type="text" class="product-form-input product-field-input" value="${value}">
                  <button type="button" class="product-remove-btn" onclick="this.parentElement.remove()">
                    <i class="fas fa-minus"></i>
                  </button>
                `;
                container.appendChild(fieldGroup);
              }
            });
          }
        }
      });
    }

    createSaveIndicator() {
      const indicator = document.createElement('div');
      indicator.className = 'autosave-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: rgba(76, 175, 80, 0.9);
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 9999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `;
      document.body.appendChild(indicator);
      this.lastSaveIndicator = indicator;
    }

    showSaveIndicator(message, type = 'success') {
      if (!this.lastSaveIndicator) return;

      this.lastSaveIndicator.textContent = message;
      this.lastSaveIndicator.style.background = type === 'error' 
        ? 'rgba(244, 67, 54, 0.9)' 
        : 'rgba(76, 175, 80, 0.9)';
      this.lastSaveIndicator.style.opacity = '1';

      setTimeout(() => {
        this.lastSaveIndicator.style.opacity = '0';
      }, 2000);
    }

    createClearButton() {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'autosave-clear-btn';
      clearBtn.innerHTML = '<i class="fas fa-trash"></i>  ';
      clearBtn.style.cssText = `
        background:none;
        color: var(--extra6-color);
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        margin-top: 10px;
        transition: background 0.3s;
		display:none;
      `;
      clearBtn.addEventListener('mouseover', () => {
        clearBtn.style.background = 'none';
      });
      clearBtn.addEventListener('mouseout', () => {
        clearBtn.style.background = 'none';
      });
      clearBtn.addEventListener('click', () => {
        if (confirm('هل تريد مسح جميع البيانات المحفوظة؟')) {
          this.clearSavedData();
          this.form.reset();
          this.showSaveIndicator('تم مسح البيانات المحفوظة', 'success');
        }
      });

      const formActions = this.form.querySelector('.product-form-actions, .add-supplier-form-actions');
      if (formActions) {
        formActions.appendChild(clearBtn);
      }
    }

    clearSavedData() {
      try {
        localStorage.removeItem(this.storageKey);
      } catch (e) {
        console.error('Error clearing saved data:', e);
      }
    }
  }

  // تصدير للنطاق العام
  window.FormAutoSave = FormAutoSave;
})();
