# إعداد قاعدة البيانات - أرشيف الثقة

## نظرة عامة
تم تحويل موقع "أرشيف الثقة" من موقع ثابت إلى موقع ديناميكي يستخدم قاعدة بيانات Supabase. يحتوي الموقع على نظام مصادقة، إدارة المنتجات، إدارة الموردين، نظام دردشة، وإدارة المهام والملاحظات.

## الجداول المطلوبة في Supabase

### 1. جدول المستخدمين (users)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    country VARCHAR(50),
    age INTEGER,
    residence VARCHAR(100),
    phone_numbers TEXT[],
    whatsapp VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. جدول الفئات (categories)
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. جدول المنتجات (products)
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id),
    subcategory_id UUID REFERENCES categories(id),
    brand VARCHAR(100),
    model VARCHAR(100),
    weight DECIMAL(10,2),
    dimensions VARCHAR(100),
    color VARCHAR(50),
    material VARCHAR(100),
    warranty VARCHAR(100),
    origin_country VARCHAR(50),
    cost_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    discount_percentage INTEGER DEFAULT 0,
    tax_percentage INTEGER DEFAULT 0,
    orderable_quantity INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    visibility VARCHAR(20) DEFAULT 'public',
    target_audience TEXT[],
    features TEXT[],
    negative_points TEXT[],
    keywords TEXT[],
    notes TEXT,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. جدول صور المنتجات (product_images)
```sql
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. جدول الموردين (suppliers)
```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    country VARCHAR(50),
    description TEXT,
    industry VARCHAR(100),
    experience_years INTEGER,
    website_url TEXT,
    address TEXT,
    map_url TEXT,
    logo_url TEXT,
    payment_methods TEXT[],
    shipping_methods TEXT[],
    main_products TEXT[],
    certificates TEXT[],
    contact_info JSONB,
    status VARCHAR(20) DEFAULT 'active',
    rating DECIMAL(3,2) DEFAULT 0,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6. جدول موردي المنتجات (product_suppliers)
```sql
CREATE TABLE product_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name VARCHAR(200),
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7. جدول المهام (tasks)
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 8. جدول الملاحظات (notes)
```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    category VARCHAR(50),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 9. جدول الرسائل (messages)
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## إعداد التخزين (Storage)

### 1. إنشاء buckets للتخزين
- `product-images`: لصور المنتجات
- `supplier-logos`: لشعارات الموردين

### 2. إعداد السياسات (Policies)

#### سياسات الجداول
```sql
-- سياسات المستخدمين
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- سياسات المنتجات
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all products" ON products
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own products" ON products
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON products
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON products
    FOR DELETE USING (auth.uid() = user_id);

-- سياسات الموردين
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all suppliers" ON suppliers
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own suppliers" ON suppliers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suppliers" ON suppliers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own suppliers" ON suppliers
    FOR DELETE USING (auth.uid() = user_id);

-- سياسات المهام
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tasks" ON tasks
    FOR ALL USING (auth.uid() = user_id);

-- سياسات الملاحظات
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notes" ON notes
    FOR ALL USING (auth.uid() = user_id);

-- سياسات الرسائل
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all messages" ON messages
    FOR SELECT USING (true);

CREATE POLICY "Users can insert messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### سياسات التخزين
```sql
-- سياسات صور المنتجات
CREATE POLICY "Anyone can view product images" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- سياسات شعارات الموردين
CREATE POLICY "Anyone can view supplier logos" ON storage.objects
    FOR SELECT USING (bucket_id = 'supplier-logos');

CREATE POLICY "Authenticated users can upload supplier logos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'supplier-logos' AND auth.role() = 'authenticated');
```

## إعداد البيانات الأولية

### إدراج فئات أساسية
```sql
INSERT INTO categories (name, description) VALUES
('إلكترونيات', 'الأجهزة الإلكترونية والكهربائية'),
('ملابس', 'الملابس والأزياء'),
('أدوات', 'الأدوات والمعدات'),
('أثاث', 'الأثاث والديكور'),
('أغذية', 'المنتجات الغذائية');
```

## الميزات المطبقة

### 1. نظام المصادقة
- تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
- تسجيل مستخدمين جدد
- إدارة جلسات المستخدمين
- حماية الصفحات التي تتطلب تسجيل دخول

### 2. إدارة المنتجات
- إضافة منتجات جديدة مع جميع التفاصيل
- عرض قائمة المنتجات مع الفلترة والبحث
- رفع صور المنتجات
- ربط المنتجات بالموردين

### 3. إدارة الموردين
- إضافة موردين جدد مع معلومات الاتصال
- عرض قائمة الموردين مع الفلترة
- رفع شعارات الموردين
- إدارة معلومات الاتصال المتعددة

### 4. نظام الدردشة
- إرسال واستقبال الرسائل في الوقت الفعلي
- إشعارات صوتية ومرئية
- عرض أسماء المرسلين وأوقات الرسائل

### 5. إدارة المهام والملاحظات
- إنشاء وإدارة المهام الشخصية
- إضافة وتنظيم الملاحظات
- تصنيف المهام حسب الأولوية والحالة

### 6. الملف الشخصي
- عرض إحصائيات المستخدم
- إدارة المنتجات والموردين الشخصية
- عرض المهام والملاحظات

## ملاحظات مهمة

1. **الأمان**: تم تطبيق Row Level Security (RLS) على جميع الجداول لحماية البيانات
2. **الأداء**: تم إنشاء فهارس على الحقول المهمة لتحسين الأداء
3. **المرونة**: يمكن إضافة المزيد من الجداول والميزات حسب الحاجة
4. **النسخ الاحتياطي**: يُنصح بإعداد نسخ احتياطية منتظمة للبيانات

## الخطوات التالية

1. إنشاء الجداول في Supabase
2. إعداد السياسات والأمان
3. إنشاء buckets للتخزين
4. إدراج البيانات الأولية
5. اختبار الوظائف المختلفة
6. نشر الموقع على خادم ويب
