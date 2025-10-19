-- ========================================
-- إضافة منتج تجريبي كامل للاختبار
-- تنفيذ هذا السكربت في Supabase SQL Editor
-- ========================================

-- ملاحظة: هذا السكربت يضيف منتج تجريبي مع كل التفاصيل
-- لاختبار صفحة تفاصيل المنتج وجميع الوظائف

-- 1. إضافة فئة تجريبية (إن لم تكن موجودة)
insert into public.categories (id, name)
values ('11111111-1111-1111-1111-111111111111', 'إلكترونيات - ساعات ذكية')
on conflict (id) do nothing;

-- 2. إضافة المنتج التجريبي
insert into public.products (
    id,
    name,
    code,
    description,
    long_description,
    brand,
    model,
    weight,
    dimensions,
    color,
    material,
    warranty,
    origin_country,
    category_id,
    selling_price,
    selling_price_cny,
    selling_price_yer,
    cost_price,
    cost_price_cny,
    cost_price_yer,
    status,
    visibility,
    features,
    keywords,
    notes,
    user_id,
    created_at
) values (
    '22222222-2222-2222-2222-222222222222',
    'ساعة ذكية متطورة - نموذج اختبار',
    'WATCH-2024-TEST',
    'ساعة ذكية متطورة بشاشة AMOLED مع ميزات رياضية وصحية متقدمة',
    'ساعة ذكية فاخرة بتصميم عصري وأنيق، مزودة بشاشة AMOLED عالية الوضوح 1.5 بوصة، مقاومة للماء حتى 50 متر، بطارية تدوم حتى 7 أيام، متوافقة مع أنظمة iOS و Android. تتضمن مستشعرات متقدمة لقياس معدل ضربات القلب، مستوى الأكسجين في الدم، جودة النوم، وأكثر من 100 وضع رياضي. مثالية للرياضيين والمحترفين.',
    'SmartTech',
    'ST-Watch-Pro-2024',
    0.045,
    '44x38x10.7',
    'أسود، فضي، ذهبي',
    'ألمنيوم، زجاج، سيليكون',
    'سنتان',
    'الصين',
    '11111111-1111-1111-1111-111111111111',
    199.99,
    1430.00,
    49750.00,
    89.99,
    645.00,
    22400.00,
    'active',
    'public',
    ARRAY[
        'شاشة AMOLED 1.5 بوصة عالية الوضوح',
        'مقاومة للماء 5 ATM (50 متر)',
        'بطارية تدوم حتى 7 أيام',
        'أكثر من 100 وضع رياضي',
        'قياس معدل ضربات القلب على مدار اليوم',
        'مستشعر الأكسجين في الدم SpO2',
        'تتبع النوم المتقدم',
        'إشعارات الهاتف الذكي',
        'GPS مدمج',
        'مقاوم للخدش'
    ],
    ARRAY[
        'ساعة ذكية',
        'smartwatch',
        'fitness tracker',
        'AMOLED',
        'GPS',
        'مقاومة للماء',
        'رياضة',
        'صحة'
    ],
    'منتج تجريبي لاختبار جميع الميزات في صفحة تفاصيل المنتج. يحتوي على كل الحقول المطلوبة للتأكد من صحة العرض.',
    (select id from public.users limit 1),
    now()
) on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    long_description = excluded.long_description,
    brand = excluded.brand,
    model = excluded.model,
    weight = excluded.weight,
    dimensions = excluded.dimensions,
    color = excluded.color,
    material = excluded.material,
    warranty = excluded.warranty,
    origin_country = excluded.origin_country,
    selling_price = excluded.selling_price,
    selling_price_cny = excluded.selling_price_cny,
    selling_price_yer = excluded.selling_price_yer,
    cost_price = excluded.cost_price,
    cost_price_cny = excluded.cost_price_cny,
    cost_price_yer = excluded.cost_price_yer,
    features = excluded.features,
    keywords = excluded.keywords,
    notes = excluded.notes;

-- 3. إضافة صور المنتج
insert into public.product_images (product_id, image_url, is_primary)
values 
    ('22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', true),
    ('22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800', false),
    ('22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800', false)
on conflict do nothing;

-- 4. إضافة ملف كاتالوج (في product_files كـ fallback)
-- ملاحظة: استخدم رابط PDF حقيقي إذا أردت اختبار التحميل الفعلي
insert into public.product_files (product_id, file_url, file_type)
values 
    ('22222222-2222-2222-2222-222222222222', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'catalog_pdf'),
    ('22222222-2222-2222-2222-222222222222', 'https://www.africau.edu/images/default/sample.pdf', 'document')
on conflict do nothing;

-- 5. إضافة كاتالوج في الجدول المخصص (إذا كان موجوداً)
-- قم بإلغاء التعليق عن هذا السطر بعد إنشاء جدول product_catalogs
/*
insert into public.product_catalogs (product_id, catalog_url, catalog_name, uploaded_by, notes)
values (
    '22222222-2222-2222-2222-222222222222',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    'catalog-smartwatch-test.pdf',
    (select id from public.users limit 1),
    'كاتالوج تجريبي للمنتج التجريبي'
)
on conflict (product_id) do update set
    catalog_url = excluded.catalog_url,
    catalog_name = excluded.catalog_name,
    uploaded_at = now();
*/

-- 6. إضافة موردين مع أسعار وروابط
-- أولاً: تأكد من وجود موردين تجريبيين
insert into public.suppliers (id, name, country, contact_info)
values 
    ('33333333-3333-3333-3333-333333333333', 'شركة التقنية الحديثة', 'الصين', '{"phone": "+86 123456789", "email": "info@techmodern.com"}'),
    ('44444444-4444-4444-4444-444444444444', 'مصنع الإلكترونيات المتقدمة', 'الصين', '{"phone": "+86 987654321", "email": "sales@advanced-elec.com"}')
on conflict (id) do nothing;

-- ثانياً: ربط الموردين بالمنتج مع الأسعار والروابط
insert into public.product_suppliers (product_id, supplier_id, supplier_name, notes)
values 
    (
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        null,
        '{"link": "https://www.aliexpress.com/item/smartwatch", "prices": {"USD": 85.50, "CNY": 612.00, "YER": 21300.00}}'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '44444444-4444-4444-4444-444444444444',
        null,
        '{"link": "https://www.alibaba.com/product-detail/smartwatch", "prices": {"USD": 82.00, "CNY": 587.00, "YER": 20400.00}}'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        null,
        'مورد مخصص للاختبار',
        '{"link": "https://example.com/supplier", "prices": {"USD": 88.00, "CNY": 630.00, "YER": 21900.00}}'
    )
on conflict do nothing;

-- ========================================
-- تم الانتهاء من إضافة المنتج التجريبي
-- ========================================

-- للتحقق من البيانات، نفذ الاستعلام التالي:
/*
select 
    p.id,
    p.name,
    p.code,
    p.brand,
    p.model,
    p.selling_price,
    array_length(p.features, 1) as features_count,
    (select count(*) from product_images where product_id = p.id) as images_count,
    (select count(*) from product_files where product_id = p.id) as files_count,
    (select count(*) from product_suppliers where product_id = p.id) as suppliers_count
from products p
where p.id = '22222222-2222-2222-2222-222222222222';
*/

-- رابط المنتج في المتصفح:
-- http://localhost/product.html?id=22222222-2222-2222-2222-222222222222
-- (استبدل localhost بعنوان خادمك)

-- ========================================
-- ملاحظات:
-- ========================================
-- 1. هذا المنتج يحتوي على جميع الحقول المطلوبة للاختبار
-- 2. الصور من Unsplash (روابط حقيقية)
-- 3. ملفات PDF تجريبية (روابط حقيقية للاختبار)
-- 4. 3 موردين مع أسعار وروابط مختلفة
-- 5. جميع التفاصيل: الوزن، الأبعاد، اللون، المادة، الضمان، البلد، إلخ
-- 6. 10 مميزات رئيسية
-- 7. 8 كلمات مفتاحية
-- 8. ملاحظات تفصيلية

-- لحذف المنتج التجريبي لاحقاً:
-- delete from products where id = '22222222-2222-2222-2222-222222222222';
