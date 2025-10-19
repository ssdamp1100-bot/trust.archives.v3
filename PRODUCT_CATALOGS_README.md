# جدول كاتالوجات المنتجات - دليل التنفيذ

## التغييرات المطبقة تلقائياً ✓

تم تطبيق التعديلات التالية على الكود بنجاح:

### 1. `js/products-service.js`
- **السطور 12-26**: إضافة `product_catalogs` إلى استعلام `getProducts()`
- **السطور 45-56**: إضافة `product_catalogs` إلى استعلام `getProductById()`
- **السطور 152-233**: تحديث `createProductWithDetails()` لحفظ الكاتالوج في جدول منفصل
- **دالة جديدة**: `getFileNameFromUrl()` لاستخراج اسم الملف من الرابط

### 2. `js/add-product-logic.js`
- **السطر 155**: فصل الكاتالوج عن باقي الملفات
- **السطر 208**: إرسال الكاتالوج كمعامل منفصل لـ `createProductWithDetails()`

### 3. `js/product-logic.js`
- **السطور 68-92**: تحديث زر "تحميل الكاتلوج" ليقرأ من `product_catalogs` بدلاً من `product_files`

---

## ما يجب أن تنفذه أنت في Supabase

### الخطوة 1: تنفيذ SQL ⚠️ مطلوب

1. افتح **Supabase Dashboard**
2. اذهب إلى **SQL Editor**
3. افتح ملف `PRODUCT_CATALOGS_SQL.sql` من المشروع
4. انسخ الكود والصقه في SQL Editor
5. اضغط **Run** أو **F5**

هذا سينشئ:
- جدول `product_catalogs`
- فهارس البحث
- سياسات RLS للقراءة والكتابة
- دوال مساعدة (اختيارية)

### الخطوة 2: إنشاء Bucket (اختياري)

إذا أردت bucket مخصص للكاتالوجات:

1. اذهب إلى **Storage** في Supabase
2. اضغط **New bucket**
3. الاسم: `product-catalogs`
4. اجعله **Public**
5. اضغط **Create**

**ملاحظة:** يمكنك استخدام `product-documents` الموجود بدلاً من ذلك.

---

## كيفية الاستخدام بعد التنفيذ

### إضافة منتج مع كاتالوج

1. افتح صفحة **إضافة منتج** (`add-product.html`)
2. املأ بيانات المنتج
3. في قسم "الملفات":
   - **رفع كاتالوج المنتج**: اختر ملف PDF الكاتالوج
   - **ملفات إضافية**: أي ملفات أخرى (ليست كاتالوج)
4. احفظ المنتج

**ما يحدث في الخلفية:**
- الكاتالوج يُحفظ في جدول `product_catalogs`
- الملفات الأخرى تُحفظ في جدول `product_files`
- كل منتج له كاتالوج واحد فقط (بسبب constraint unique)

### عرض/تحميل الكاتالوج

1. افتح صفحة تفاصيل المنتج (`product.html?id=xxx`)
2. اضغط زر **"تحميل الكاتلوج"** في الجانب الأيسر
3. أو اذهب لتبويب **"الملفات والروابط"**
4. ستجد الكاتالوج في قسم "ملفات المنتج"

---

## البنية الجديدة

### الجداول

```
products
├── product_images (صور المنتج)
├── product_files (ملفات إضافية: وثائق، PDF موردين، إلخ)
├── product_catalogs (كاتالوج واحد فقط لكل منتج) ← جديد
└── product_suppliers (الموردين وأسعارهم)
```

### مثال بيانات

**جدول `product_catalogs`:**
```
id          | product_id | catalog_url                      | catalog_name | uploaded_at
------------|------------|----------------------------------|--------------|-------------
uuid-1      | prod-123   | https://.../catalog-prod123.pdf  | catalog.pdf  | 2025-10-19
```

**جدول `product_files`:**
```
id          | product_id | file_url                         | file_type
------------|------------|----------------------------------|-------------
uuid-2      | prod-123   | https://.../extra-doc.pdf        | document
uuid-3      | prod-123   | https://.../supplier-info.pdf    | supplier_pdf
```

---

## الفروقات الرئيسية

### قبل التحديث
```javascript
// الكاتالوج كان يُحفظ في product_files
product_files: [
  { file_url: 'catalog.pdf', file_type: 'catalog_pdf' },
  { file_url: 'doc1.pdf', file_type: 'document' }
]
```

### بعد التحديث
```javascript
// الكاتالوج في جدول منفصل
product_catalogs: [
  { 
    catalog_url: 'catalog.pdf',
    catalog_name: 'catalog.pdf',
    uploaded_at: '2025-10-19T...'
  }
]

// الملفات الأخرى فقط
product_files: [
  { file_url: 'doc1.pdf', file_type: 'document' }
]
```

---

## المزايا

### ✅ فصل واضح
- جدول مخصص للكاتالوجات فقط
- `product_files` للوثائق الأخرى
- سهولة الإدارة والاستعلام

### ✅ قيد unique
- `unique(product_id)`: يضمن كاتالوج واحد فقط لكل منتج
- تجنب التكرار والفوضى

### ✅ معلومات إضافية
- اسم الملف
- حجم الملف (مستقبلاً)
- تاريخ الرفع
- من رفعه
- ملاحظات

### ✅ دوال مساعدة
- `get_product_catalog()`: جلب سريع
- `upsert_product_catalog()`: تحديث آمن (يحذف القديم تلقائياً)

---

## استعلامات مفيدة

### جلب كاتالوج منتج محدد
```sql
select * from get_product_catalog('product-uuid-here');
```

### عرض جميع الكاتالوجات
```sql
select 
  p.name as product_name,
  pc.catalog_name,
  pc.catalog_url,
  pc.uploaded_at,
  u.username as uploaded_by
from public.product_catalogs pc
join public.products p on p.id = pc.product_id
left join public.users u on u.id = pc.uploaded_by
order by pc.uploaded_at desc;
```

### حذف كاتالوج
```sql
delete from public.product_catalogs 
where product_id = 'product-uuid-here';
```

---

## حل المشاكل

### المشكلة: "Failed to save catalog"
**السبب:** جدول `product_catalogs` غير موجود أو RLS مفعل بدون سياسات
**الحل:** نفّذ `PRODUCT_CATALOGS_SQL.sql` في SQL Editor

### المشكلة: "لا يوجد كاتلوج لهذا المنتج"
**الأسباب المحتملة:**
1. لم يتم رفع كاتالوج عند إضافة المنتج
2. الكاتالوج في `product_files` القديم (منتجات قديمة)
3. خطأ في الاستعلام

**الحل:** 
- للمنتجات الجديدة: تأكد من رفع كاتالوج عند الإضافة
- للمنتجات القديمة: انقلها يدوياً من `product_files` إلى `product_catalogs`

### المشكلة: "duplicate key value violates unique constraint"
**السبب:** محاولة إضافة كاتالوج ثانٍ لنفس المنتج
**الحل:** احذف الكاتالوج القديم أولاً، أو استخدم دالة `upsert_product_catalog()`

---

## الحالة

- ✅ **تم**: تعديلات الكود JavaScript
- ⚠️ **مطلوب منك**: تنفيذ SQL في Supabase
- ⚠️ **اختياري**: إنشاء bucket مخصص
- ✅ **جاهز للاستخدام**: بعد تنفيذ SQL

---

## الخطوات التالية (اختيارية)

1. **نقل الكاتالوجات القديمة**: إذا كان لديك منتجات قديمة بكاتالوجات في `product_files`، يمكنك نقلها:
   ```sql
   insert into product_catalogs (product_id, catalog_url, catalog_name)
   select product_id, file_url, file_url
   from product_files
   where file_type = 'catalog_pdf'
   on conflict (product_id) do nothing;
   ```

2. **حذف الكاتالوجات من product_files**:
   ```sql
   delete from product_files where file_type = 'catalog_pdf';
   ```

3. **تقييد سياسات RLS**: بعد الانتقال لـ Supabase Auth، قيّد سياسات الكتابة بشروط أمان

---

**ملاحظة:** جميع التعديلات على الكود تمت تلقائياً. فقط نفّذ SQL وابدأ الاستخدام!
