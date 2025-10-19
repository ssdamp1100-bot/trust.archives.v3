/**
 * Suppliers Service - خدمة إدارة الموردين
 * يوفر جميع العمليات CRUD للموردين
 */

(function() {
  'use strict';

  if (typeof window.supabaseClient === 'undefined') {
    console.error('Supabase client غير محمّل. تأكد من تحميل supabase-config.js أولاً.');
    return;
  }

  const suppliersService = {
    /**
     * إنشاء مورد جديد
     * @param {Object} supplierData - بيانات المورد
     * @returns {Promise<{success: boolean, supplier?: Object, error?: string}>}
     */
    async createSupplier(supplierData) {
      try {
        // التحقق من الحقول الإلزامية
        if (!supplierData.name || !supplierData.country) {
          return { success: false, error: 'اسم المورد والبلد حقول إلزامية' };
        }

        // جلب المستخدم الحالي
        const currentUser = window.authService?.getCurrentUser();
        
        // تجهيز البيانات للإدراج
        const dataToInsert = {
          name: supplierData.name,
          country: supplierData.country,
          description: supplierData.description || null,
          experience_years: supplierData.experience_years || null,
          industry: supplierData.industry || null,
          address: supplierData.address || null,
          website_url: supplierData.website_url || null,
          map_url: supplierData.map_url || null,
          logo_url: supplierData.logo_url || null,
          payment_methods: supplierData.payment_methods || [],
          shipping_methods: supplierData.shipping_methods || [],
          main_products: supplierData.main_products || [],
          certificates: supplierData.certificates || [],
          contact_info: supplierData.contact_info || {
            phones: [],
            emails: [],
            whatsapp: null,
            wechat: null,
            facebook: null,
            twitter: null,
            instagram: null,
            other_methods: []
          },
          rating: supplierData.rating || 0,
          status: supplierData.status || 'active',
          notes: supplierData.notes || null,
          tags: supplierData.tags || [],
          // ملاحظة: المخطط الرسمي يستخدم user_id وليس added_by
          user_id: currentUser?.id || null
        };

        const { data, error } = await supabaseClient
          .from('suppliers')
          .insert([dataToInsert])
          .select()
          .single();

        if (error) throw error;

        return { success: true, supplier: data };
      } catch (error) {
        console.error('Error creating supplier:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * جلب جميع الموردين
     * @returns {Promise<{success: boolean, suppliers?: Array, error?: string}>}
     */
    async getSuppliers() {
      try {
        const { data, error } = await supabaseClient
          .from('suppliers')
          .select(`
            *,
            users:user_id(id, username, full_name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, suppliers: data || [] };
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        return { success: false, error: error.message, suppliers: [] };
      }
    },

    /**
     * جلب مورد واحد بالـ ID
     * @param {string} supplierId - معرف المورد
     * @returns {Promise<{success: boolean, supplier?: Object, error?: string}>}
     */
    async getSupplierById(supplierId) {
      try {
        // تقليل الاعتمادية: نجلب بيانات المورد وربط المستخدم فقط
        const { data, error } = await supabaseClient
          .from('suppliers')
          .select(`
            *,
            users:user_id(id, username, full_name)
          `)
          .eq('id', supplierId)
          .single();

        if (error) throw error;

        return { success: true, supplier: data };
      } catch (error) {
        console.error('Error fetching supplier:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * تحديث بيانات مورد
     * @param {string} supplierId - معرف المورد
     * @param {Object} updates - البيانات المراد تحديثها
     * @returns {Promise<{success: boolean, supplier?: Object, error?: string}>}
     */
    async updateSupplier(supplierId, updates) {
      try {
        const { data, error } = await supabaseClient
          .from('suppliers')
          .update(updates)
          .eq('id', supplierId)
          .select()
          .single();

        if (error) throw error;

        return { success: true, supplier: data };
      } catch (error) {
        console.error('Error updating supplier:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * حذف مورد
     * @param {string} supplierId - معرف المورد
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async deleteSupplier(supplierId) {
      try {
        // 1) حذف العلاقات مع المنتجات لتجنب قيود FK (product_suppliers)
        try {
          const { error: psErr } = await supabaseClient
            .from('product_suppliers')
            .delete()
            .eq('supplier_id', supplierId);
          if (psErr) throw psErr;
        } catch (e) {
          // نُظهر تحذيراً فقط ولا نوقف التنفيذ في حال عدم توفر الجدول
          console.warn('product_suppliers cleanup warning:', e?.message || e);
        }

        // 2) حذف صور المورد إن كانت هناك طاولة supplier_images (اختياري)
        try {
          const { error: siErr } = await supabaseClient
            .from('supplier_images')
            .delete()
            .eq('supplier_id', supplierId);
          if (siErr) throw siErr;
        } catch (e) {
          console.warn('supplier_images cleanup warning:', e?.message || e);
        }

        // 3) حذف المورد بعد تنظيف العلاقات
        const { error } = await supabaseClient
          .from('suppliers')
          .delete()
          .eq('id', supplierId);

        if (error) throw error;

        return { success: true };
      } catch (error) {
        console.error('Error deleting supplier:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * رفع شعار المورد
     * @param {string} supplierId - معرف المورد
     * @param {File} file - ملف الشعار
     * @returns {Promise<{success: boolean, url?: string, error?: string}>}
     */
    async uploadSupplierLogo(supplierId, file) {
      try {
        if (!file) {
          return { success: false, error: 'لم يتم تحديد ملف' };
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${supplierId}_logo_${Date.now()}.${fileExt}`;
        const filePath = `${supplierId}/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
          .from('supplier-logos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseClient.storage
          .from('supplier-logos')
          .getPublicUrl(filePath);

        if (!publicUrlData.publicUrl) {
          throw new Error('فشل الحصول على رابط الشعار');
        }

        // تحديث جدول الموردين بالرابط
        await this.updateSupplier(supplierId, { logo_url: publicUrlData.publicUrl });

        return { success: true, url: publicUrlData.publicUrl };
      } catch (error) {
        console.error('Error uploading logo:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * رفع صورة إضافية للمورد
     * @param {string} supplierId - معرف المورد
     * @param {File} file - ملف الصورة
     * @param {boolean} isPrimary - هل هي الصورة الرئيسية
     * @returns {Promise<{success: boolean, image?: Object, error?: string}>}
     */
    async uploadSupplierImage(supplierId, file, isPrimary = false) {
      try {
        if (!file) {
          return { success: false, error: 'لم يتم تحديد ملف' };
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${supplierId}_${Date.now()}.${fileExt}`;
        const filePath = `${supplierId}/${fileName}`;

        // قد لا يكون باكت 'supplier-images' موجوداً بعد
        const { error: uploadError } = await supabaseClient.storage
          .from('supplier-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseClient.storage
          .from('supplier-images')
          .getPublicUrl(filePath);

        if (!publicUrlData.publicUrl) {
          throw new Error('فشل الحصول على رابط الصورة');
        }

        // إدراج السجل في جدول supplier_images (إن كان متوفراً)
        try {
          const { data, error } = await supabaseClient
            .from('supplier_images')
            .insert([{
              supplier_id: supplierId,
              image_url: publicUrlData.publicUrl,
              is_primary: isPrimary
            }])
            .select()
            .single();
          if (error) throw error;
          return { success: true, image: data };
        } catch (e) {
          // في حال عدم وجود الجدول، نعيد الرابط فقط
          console.warn('supplier_images table not available; returning URL only');
          return { success: true, image: { supplier_id: supplierId, image_url: publicUrlData.publicUrl, is_primary: isPrimary } };
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * البحث في الموردين
     * @param {string} query - نص البحث
     * @returns {Promise<{success: boolean, suppliers?: Array, error?: string}>}
     */
    async searchSuppliers(query) {
      try {
        const { data, error } = await supabaseClient
          .from('suppliers')
          .select(`
            *,
            users:added_by(id, username, full_name)
          `)
          .or(`name.ilike.%${query}%,country.ilike.%${query}%,industry.ilike.%${query}%`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, suppliers: data || [] };
      } catch (error) {
        console.error('Error searching suppliers:', error);
        return { success: false, error: error.message, suppliers: [] };
      }
    }
  };

  // تصدير الخدمة للنطاق العام
  window.suppliersService = suppliersService;
})();
