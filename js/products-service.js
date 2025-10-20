// Products Service
class ProductsService {
    constructor() {
        this.currentProducts = []
    }

    // Get all products with filters
    async getProducts() { // Simplified: filters will be applied client-side for now
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select(`
                    id,
                    name,
                    code,
                    description,
                    selling_price,
                    created_at,
                    users ( id, username, full_name, role, whatsapp, phone_numbers ),
                    categories ( name ),
                    product_images ( image_url, is_primary ),
                    product_catalogs ( id, catalog_url, catalog_name, file_size, uploaded_at ),
                    cost_price,
                    product_suppliers ( * )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching products:', error);
                return { success: false, error: error.message };
            }

            return { success: true, products: data || [] };
        } catch (error) {
            console.error('Error in getProducts:', error);
            return { success: false, error: error.message };
        }
    }

    // Get single product by ID
    async getProductById(productId) {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select(`
                    *,
                    categories(name),
                    product_images(image_url, is_primary),
                    product_files(file_url, file_type),
                    product_catalogs(id, catalog_url, catalog_name, file_size, uploaded_at),
                    product_suppliers(*, suppliers(name, country)),
                    users(username, full_name, whatsapp, phone_numbers)
                `)
                .eq('id', productId)
                .single()

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, product: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Create new product
    async createProduct(productData) {
        try {
            const userId = window.authService.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            // Prepare product data
            const product = {
                ...productData,
                user_id: userId,
                created_at: new Date().toISOString()
            }

            const { data, error } = await supabaseClient
                .from('products')
                .insert([product])
                .select()
                .single()

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, product: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Update product
    async updateProduct(productId, updateData) {
        try {
            const userId = window.authService.getCurrentUserId()
            const currentUser = window.authService.getCurrentUser()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            let query = supabaseClient
                .from('products')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId)
                .select()
                .single()
            // Non-admins لا يمكنهم تعديل إلا منتجاتهم
            if (!currentUser || currentUser.role !== 'admin') {
                query = query.eq('user_id', userId)
            }
            const { data, error } = await query

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, product: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Delete product
    async deleteProduct(productId) {
        try {
            const userId = window.authService.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            const { error } = await supabaseClient
                .from('products')
                .delete()
                .eq('id', productId)
                .eq('user_id', userId) // Ensure user can only delete their own products

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    async createProductWithDetails(details) {
        try {
            const { productData, images, files, catalog, supplier } = details;

            // 1. Create the main product record
            const createResult = await this.createProduct(productData);
            if (!createResult.success) {
                throw new Error(createResult.error || 'Failed to create product record.');
            }
            const product = createResult.product;

            // 2. Prepare records for related tables
            const imagesToInsert = images.map(img => ({
                product_id: product.id,
                image_url: img.url,
                is_primary: img.is_primary,
            }));

            const filesToInsert = files.map(file => ({
                product_id: product.id,
                file_url: file.url,
                file_type: file.type,
            }));

            // Catalog goes to separate table (product_catalogs)
            const catalogToInsert = catalog ? {
                product_id: product.id,
                catalog_url: catalog.url,
                catalog_name: this.getFileNameFromUrl(catalog.url),
                uploaded_by: window.authService?.getCurrentUser()?.id || null,
                notes: 'Product catalog PDF'
            } : null;

            const supplierNotes = JSON.stringify({ 
                link: supplier.link, 
                prices: { USD: supplier.priceUSD, CNY: supplier.priceCNY, YER: supplier.priceYER }
            });
            const supplierToInsert = {
                product_id: product.id,
                supplier_id: (supplier.id && supplier.id !== 'custom') ? supplier.id : null,
                supplier_name: (supplier.id === 'custom') ? supplier.customName : null,
                notes: supplierNotes,
            };

            // 3. Insert related records
            if (imagesToInsert.length > 0) {
                const { error } = await supabaseClient.from('product_images').insert(imagesToInsert);
                if (error) throw new Error(`Failed to save images: ${error.message}`);
            }
            if (filesToInsert.length > 0) {
                const { error } = await supabaseClient.from('product_files').insert(filesToInsert);
                if (error) throw new Error(`Failed to save files: ${error.message}`);
            }
            if (catalogToInsert) {
                const { error } = await supabaseClient.from('product_catalogs').insert([catalogToInsert]);
                if (error) throw new Error(`Failed to save catalog: ${error.message}`);
            }
            if (supplier.id || supplier.customName) {
                const { error } = await supabaseClient.from('product_suppliers').insert([supplierToInsert]);
                if (error) throw new Error(`Failed to save supplier: ${error.message}`);
            }

            return { success: true, product };

        } catch (error) {
            // Note: This doesn't have true transaction rollback. 
            // For full safety, this logic should be moved to a Supabase Edge Function.
            console.error('createProductWithDetails failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Helper: Extract filename from URL
    getFileNameFromUrl(url) {
        if (!url) return null;
        try {
            const parts = url.split('/');
            return parts[parts.length - 1];
        } catch {
            return 'catalog.pdf';
        }
    }

    // Get categories
    async getCategories() {
        try {
            const { data, error } = await supabaseClient
                .from('categories')
                .select('*')
                .order('name')

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, categories: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Search products
    async searchProducts(searchTerm) {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select(`
                    *,
                    categories!products_category_id_fkey(name),
                    product_images(image_url, is_primary),
                    users!products_user_id_fkey(username)
                `)
                .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`)
                .order('created_at', { ascending: false })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, products: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
}

// Create global instance
window.productsService = new ProductsService()
