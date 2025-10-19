-- ========================================
-- جدول مخصص لكاتالوجات المنتجات
-- تنفيذ هذا السكربت في Supabase SQL Editor
-- ========================================

-- 1. إنشاء جدول product_catalogs
create table if not exists public.product_catalogs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  catalog_url text not null,
  catalog_name text,
  file_size bigint,
  uploaded_at timestamptz default now(),
  uploaded_by uuid references public.users(id) on delete set null,
  notes text,
  constraint unique_catalog_per_product unique(product_id)
);

-- تعليق على الجدول
comment on table public.product_catalogs is 'جدول مخصص لتخزين كاتالوجات المنتجات (ملف واحد لكل منتج)';
comment on column public.product_catalogs.product_id is 'معرف المنتج (علاقة واحد لواحد)';
comment on column public.product_catalogs.catalog_url is 'رابط الكاتالوج في Storage';
comment on column public.product_catalogs.catalog_name is 'اسم ملف الكاتالوج';
comment on column public.product_catalogs.file_size is 'حجم الملف بالبايت';
comment on column public.product_catalogs.uploaded_by is 'المستخدم الذي رفع الكاتالوج';

-- 2. إنشاء فهارس للبحث السريع
create index if not exists idx_product_catalogs_product_id on public.product_catalogs(product_id);
create index if not exists idx_product_catalogs_uploaded_at on public.product_catalogs(uploaded_at desc);
create index if not exists idx_product_catalogs_uploaded_by on public.product_catalogs(uploaded_by);

-- 3. تفعيل RLS على الجدول
alter table public.product_catalogs enable row level security;

-- 4. سياسات القراءة العامة (للعرض في index.html و products-board.html)
drop policy if exists "public read product_catalogs" on public.product_catalogs;
create policy "public read product_catalogs" 
on public.product_catalogs for select 
to anon 
using (true);

drop policy if exists "auth read product_catalogs" on public.product_catalogs;
create policy "auth read product_catalogs" 
on public.product_catalogs for select 
to authenticated 
using (true);

-- 5. سياسات الكتابة المؤقتة (حتى الانتقال لـ Supabase Auth)
-- ملاحظة: هذه السياسات مفتوحة مؤقتاً للتطوير. قيّدها لاحقاً بشروط أمان

drop policy if exists "anon insert product_catalogs" on public.product_catalogs;
create policy "anon insert product_catalogs" 
on public.product_catalogs for insert 
to anon 
with check (true);

drop policy if exists "anon update product_catalogs" on public.product_catalogs;
create policy "anon update product_catalogs" 
on public.product_catalogs for update 
to anon 
using (true) 
with check (true);

drop policy if exists "anon delete product_catalogs" on public.product_catalogs;
create policy "anon delete product_catalogs" 
on public.product_catalogs for delete 
to anon 
using (true);

-- 6. دوال مساعدة (اختيارية)

-- دالة للحصول على كاتالوج المنتج
create or replace function get_product_catalog(p_product_id uuid)
returns table (
  id uuid,
  catalog_url text,
  catalog_name text,
  file_size bigint,
  uploaded_at timestamptz
) 
language plpgsql
security definer
as $$
begin
  return query
  select 
    pc.id,
    pc.catalog_url,
    pc.catalog_name,
    pc.file_size,
    pc.uploaded_at
  from public.product_catalogs pc
  where pc.product_id = p_product_id
  limit 1;
end;
$$;

-- دالة لإضافة/تحديث كاتالوج (حذف القديم تلقائياً)
create or replace function upsert_product_catalog(
  p_product_id uuid,
  p_catalog_url text,
  p_catalog_name text default null,
  p_file_size bigint default null,
  p_uploaded_by uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_catalog_id uuid;
begin
  -- حذف الكاتالوج القديم إن وجد (بسبب constraint unique)
  delete from public.product_catalogs where product_id = p_product_id;
  
  -- إدراج الكاتالوج الجديد
  insert into public.product_catalogs (
    product_id, 
    catalog_url, 
    catalog_name, 
    file_size, 
    uploaded_by, 
    notes
  )
  values (
    p_product_id,
    p_catalog_url,
    p_catalog_name,
    p_file_size,
    p_uploaded_by,
    p_notes
  )
  returning id into v_catalog_id;
  
  return v_catalog_id;
end;
$$;

-- تعليق على الدوال
comment on function get_product_catalog is 'جلب كاتالوج منتج محدد';
comment on function upsert_product_catalog is 'إضافة أو تحديث كاتالوج منتج (يحذف القديم تلقائياً)';

-- ========================================
-- نهاية السكربت الأساسي
-- ========================================

-- ملاحظات إضافية:
-- 1. يجب إنشاء bucket "product-catalogs" في Supabase Storage (اختياري)
-- 2. يمكن استخدام bucket "product-documents" الموجود بدلاً من ذلك
-- 3. سياسات Storage منفصلة (انظر أدناه)

-- ========================================
-- سياسات Storage للكاتالوجات (اختياري)
-- نفّذ هذا إذا أردت bucket مخصص للكاتالوجات
-- ========================================

-- ملاحظة: أنشئ bucket "product-catalogs" من واجهة Supabase Storage أولاً
-- ثم نفّذ هذه السياسات:

/*
-- سياسة رفع الكاتالوجات
drop policy if exists "anon upload product-catalogs" on storage.objects;
create policy "anon upload product-catalogs"
on storage.objects for insert
to anon
with check (bucket_id = 'product-catalogs');

-- سياسة قراءة عامة
drop policy if exists "public read product-catalogs" on storage.objects;
create policy "public read product-catalogs"
on storage.objects for select
to anon
using (bucket_id = 'product-catalogs');

-- سياسة حذف (للإدمن لاحقاً)
drop policy if exists "anon delete product-catalogs" on storage.objects;
create policy "anon delete product-catalogs"
on storage.objects for delete
to anon
using (bucket_id = 'product-catalogs');

-- سياسة تحديث
drop policy if exists "anon update product-catalogs" on storage.objects;
create policy "anon update product-catalogs"
on storage.objects for update
to anon
using (bucket_id = 'product-catalogs');
*/

-- ========================================
-- أمثلة استخدام من SQL
-- ========================================

/*
-- مثال 1: جلب كاتالوج منتج
select * from get_product_catalog('product-uuid-here');

-- مثال 2: إضافة كاتالوج جديد
select upsert_product_catalog(
  'product-uuid-here',
  'https://...storage.../catalog.pdf',
  'catalog.pdf',
  1024000,
  'user-uuid-here',
  'كاتالوج المنتج الرسمي'
);

-- مثال 3: عرض جميع الكاتالوجات مع أسماء المنتجات
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

-- مثال 4: حذف كاتالوج منتج محدد
delete from public.product_catalogs where product_id = 'product-uuid-here';
*/
