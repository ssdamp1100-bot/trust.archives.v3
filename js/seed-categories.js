// Seed default product categories and subcategories into Supabase 'categories' table
// Usage: include this file on any page after supabase-config.js, then call:
//   window.seedDefaultCategories()

(function(){
  async function seedDefaultCategories() {
    if (typeof supabaseClient === 'undefined') {
      alert('Supabase client غير محمّل');
      return;
    }
    const defaults = [
      { parent: 'إلكترونيات', children: ['هواتف ذكية', 'أجهزة كمبيوتر', 'إكسسوارات'] },
      { parent: 'ملابس', children: ['رجالي', 'نسائي', 'أطفال'] },
      { parent: 'أثاث', children: ['غرف نوم', 'مكاتب', 'ديكور'] },
      { parent: 'مواد غذائية', children: ['معلبات', 'مشروبات', 'حلويات'] },
      { parent: 'رياضة', children: ['أجهزة رياضية', 'ملابس رياضية', 'إكسسوارات رياضية'] }
    ];

    try {
      // Fetch existing names to avoid duplicates
      const { data: existing, error } = await supabaseClient
        .from('categories')
        .select('name');
      if (error) throw error;
      const existingNames = new Set((existing||[]).map(r => (r.name||'').trim()));

      const toInsert = [];
      for (const row of defaults) {
        if (!existingNames.has(row.parent)) {
          toInsert.push({ name: row.parent });
        }
        for (const child of row.children) {
          const full = `${row.parent} - ${child}`;
          if (!existingNames.has(full)) {
            toInsert.push({ name: full });
          }
        }
      }

      if (toInsert.length === 0) {
        alert('الفئات الافتراضية موجودة بالفعل.');
        return;
      }

      const { error: insErr } = await supabaseClient.from('categories').insert(toInsert);
      if (insErr) throw insErr;
      alert('✅ تم إدراج فئات افتراضية بنجاح');
    } catch (e) {
      console.error('seedDefaultCategories error:', e);
      alert('❌ فشل إدراج الفئات: ' + e.message);
    }
  }

  window.seedDefaultCategories = seedDefaultCategories;
})();
