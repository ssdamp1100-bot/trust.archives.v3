// Suppliers Functions - وظائف الموردين

let currentSuppliers = [];
let filteredSuppliers = [];

// تحميل الموردين من قاعدة البيانات
async function loadSuppliersFromDatabase() {
    try {
        if (!window.suppliersService) {
            console.warn('Suppliers service not available');
            return;
        }

        const result = await window.suppliersService.getSuppliers();
        if (result.success) {
            currentSuppliers = result.suppliers || [];
            filteredSuppliers = [...currentSuppliers];
            renderSuppliers(currentSuppliers);
        } else {
            console.error('Error loading suppliers:', result.error);
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

// عرض الموردين
function renderSuppliers(suppliers) {
    const suppliersGrid = document.getElementById('suppliersGrid');
    if (!suppliersGrid) return;

    suppliersGrid.innerHTML = '';

    suppliers.forEach(supplier => {
        const supplierCard = createSupplierCard(supplier);
        suppliersGrid.appendChild(supplierCard);
    });

    const noSuppliers = document.getElementById('noSuppliers');
    if (noSuppliers) {
        if (!suppliers || suppliers.length === 0) {
            noSuppliers.classList.remove('hidden');
        } else {
            noSuppliers.classList.add('hidden');
        }
    }
}

// إنشاء بطاقة مورد
function createSupplierCard(supplier) {
    const card = document.createElement('div');
    card.className = 'supplier-card';
    card.setAttribute('data-supplier-id', supplier.id);
    card.setAttribute('data-country', supplier.country || '');
    card.setAttribute('data-industry', supplier.industry || '');

    const logoUrl = supplier.logo_url || 'img/company-1.jpg';
    const statusClass = supplier.status === 'active' ? 'supplier-status-enable' : 'supplier-status-disable';
    const rating = (supplier.rating != null && supplier.rating !== '') ? supplier.rating : '';

    card.innerHTML = `
        <div class="supplier-card-header">
            <img src="${logoUrl}" alt="supplier-logo" class="supplier-logo">
            <div class="supplier-details-info">
                <h3 class="supplier-name">${supplier.name} ${rating !== '' ? `<span style='font-size:12px;color:var(--warning-color,#f0b90b);margin-inline-start:8px;'><i class='fa-solid fa-star'></i> ${rating}/5</span>` : ''}</h3>
                <div class="supplier-tags">
                    <span class="tag"><i class="fa-solid fa-flag"></i> ${supplier.country || 'غير محدد'}</span>
                    <span class="tag"><i class="fa-solid fa-layer-group"></i> ${supplier.industry || 'غير محدد'}</span>
                    <span class="tag"><i class="fa-solid fa-bookmark"></i> ${supplier.id.slice(-4)}</span>
                </div>
            </div>
            <div class="${statusClass}"></div>
        </div>
        <span class="supplier-user"><i class="fa fa-address-book-o" aria-hidden="true"></i> ${supplier.users?.username || 'غير محدد'}</span>
        <p class="supplier-description">${supplier.description || 'لا يوجد وصف'}</p>
        <button onclick="window.location.href='single-supplier.html?id=${supplier.id}'" class="supplier-button">
           <i class="fa fa-address-card-o" aria-hidden="true"></i> معلومات المورد
        </button>
    `;

    return card;
}

// فلترة الموردين
async function filterSuppliers() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const countryFilter = document.getElementById('countryFilter')?.value || '';
    const industryFilter = document.getElementById('industryFilter')?.value || '';

    filteredSuppliers = currentSuppliers.filter(supplier => {
        const nameLc = (supplier.name || '').toLowerCase();
        const descLc = (supplier.description || '').toLowerCase();
        const country = supplier.country || '';
        const industry = supplier.industry || '';

        const matchesSearch = !searchTerm || nameLc.includes(searchTerm) || descLc.includes(searchTerm);
        const matchesCountry = !countryFilter || country === countryFilter;

        const industries = industry.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
        const matchesIndustry = !industryFilter || industries.includes(industryFilter.trim().toLowerCase());

        return matchesSearch && matchesCountry && matchesIndustry;
    });

    renderSuppliers(filteredSuppliers);
}

// مسح الفلاتر
function clearSupplierFilters() {
    const searchInput = document.getElementById('searchInput');
    const countryFilter = document.getElementById('countryFilter');
    const industryFilter = document.getElementById('industryFilter');

    if (searchInput) searchInput.value = '';
    if (countryFilter) countryFilter.value = '';
    if (industryFilter) industryFilter.value = '';

    filterSuppliers();
}

// تهيئة صفحة الموردين
document.addEventListener('DOMContentLoaded', async function () {
    await loadSuppliersFromDatabase();

    // إضافة مستمعي الأحداث
    const searchInput = document.getElementById('searchInput');
    const countryFilter = document.getElementById('countryFilter');
    const industryFilter = document.getElementById('industryFilter');

    if (searchInput) searchInput.addEventListener('input', filterSuppliers);
    if (countryFilter) countryFilter.addEventListener('change', filterSuppliers);
    if (industryFilter) industryFilter.addEventListener('change', filterSuppliers);

    // معالجات عرض الشبكة/القائمة
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    const grid = document.getElementById('suppliersGrid');

    if (gridBtn && listBtn && grid) {
        gridBtn.addEventListener('click', () => {
            grid.classList.remove('list-view');
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        });
        listBtn.addEventListener('click', () => {
            grid.classList.add('list-view');
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        });
    }
});
