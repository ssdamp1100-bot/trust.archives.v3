let currentSuppliers = [];
let filteredSuppliers = [];

document.addEventListener('DOMContentLoaded', async function() {
    if (!window.authService.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    await loadSuppliersFromDatabase();

    try {
        if (window.filtersUtil) {
            await populateSupplierFiltersAsync();
        }
    } catch(e) { console.warn('populateSupplierFiltersAsync failed:', e); }

    const searchInput = document.getElementById('searchInput');
    const countryFilter = document.getElementById('countryFilter');
    const industryFilter = document.getElementById('industryFilter');

    [searchInput, countryFilter, industryFilter].forEach(element => {
        element.addEventListener('input', pageFilterSuppliers);
        element.addEventListener('change', pageFilterSuppliers);
    });
});

async function loadSuppliersFromDatabase() {
    try {
        const result = await window.suppliersService.getSuppliers();
        if (result.success) {
            currentSuppliers = result.suppliers;
            filteredSuppliers = [...currentSuppliers];
            renderSuppliers(currentSuppliers);
            updateSuppliersCount();
            await renderTopSuppliers();
        } else {
            console.error('Error loading suppliers:', result.error);
            renderStaticSuppliers();
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
        renderStaticSuppliers();
    }
}

function renderSuppliers(suppliers) {
    const suppliersGrid = document.getElementById('suppliersGrid');
    suppliersGrid.innerHTML = '';

    suppliers.forEach(supplier => {
        const supplierCard = createSupplierCard(supplier);
        suppliersGrid.appendChild(supplierCard);
    });
}

async function renderTopSuppliers() {
    try {
        const board = document.querySelector('.suppliers-rate-board');
        if (!board) return;
        const { success, suppliers } = await window.suppliersService.getTopSuppliers(5);
        if (!success || !suppliers) return;
        const headerHtml = `
<div class="suppliers-rate-header">
    <h3 class="suppliers-rate-title"><i class="fa-solid fa-star-half-stroke"></i> افضل خمسة موردين <i class="fa-solid fa-star-half-stroke"></i></h3>
</div>`;
        const items = suppliers.map(s => `
<div class="suppliers-rate-item">
    <img src="${s.logo_url || 'img/company-2.jpg'}" alt="supplier-logo" class="suppliers-rate-logo">
    <div class="suppliers-rate-info">
        <p class="suppliers-rate-name">${s.name}</p>
    </div>
    <p class="suppliers-rate-points">${s.rating ? `${s.rating} نقطة` : ''}</p>
    <a class="suppliers-rate-button" href="single-supplier.html?id=${s.id}">تفاصيل المورد</a>
</div>`).join('');
        board.innerHTML = headerHtml + items;
    } catch (e) { console.warn('renderTopSuppliers failed:', e); }
}

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
                    <span class="tag" id="supplier-country"><i class="fa-solid fa-flag"></i> ${supplier.country || 'غير محدد'}</span>
                    <span class="tag" id="supplier-category"><i class="fa-solid fa-layer-group"></i> ${supplier.industry || 'غير محدد'}</span>
                    <span class="tag" id="supplier-serial-number"><i class="fa-solid fa-bookmark"></i> ${supplier.id.slice(-4)}</span>
                </div>
            </div>
            <div class="${statusClass}"></div>
        </div>
        <span class="supplier-user" id="supplier-user"><i class="fa fa-address-book-o" aria-hidden="true"></i> ${supplier.users?.username || 'غير محدد'}</span>
        <p class="supplier-description">${supplier.description || 'لا يوجد وصف'}</p>
        <button onclick="window.location.href='single-supplier.html?id=${supplier.id}'" class="supplier-button">
           <i class="fa fa-address-card-o" aria-hidden="true"></i> معلومات المورد
        </button>
    `;

    return card;
}

function renderStaticSuppliers() {
    console.log('Using static suppliers as fallback');
}

function updateSuppliersCount() {
    const countElement = document.getElementById('suppliersCount');
    if (countElement) {
        countElement.textContent = currentSuppliers.length;
    }
}

function clearSupplierFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('countryFilter').value = '';
    document.getElementById('industryFilter').value = '';
    pageFilterSuppliers();
}

function showSupplierDetails(supplierId) {
    const allDetails = document.querySelectorAll('.supplier-details');
    allDetails.forEach(detail => detail.classList.add('hidden'));

    const supplierDetails = document.querySelector(`.supplier-details[data-supplier-id="${supplierId}"]`);
    if (supplierDetails) {
        supplierDetails.classList.remove('hidden');
    }

    document.getElementById('supplierDetailsModal').classList.add('active');
}

function closeSupplierDetailsModal() {
    document.getElementById('supplierDetailsModal').classList.remove('active');
}

// فلترة الموردين الخاصة بهذه الصفحة لتجنب تعارض الأسماء
async function pageFilterSuppliers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const countryFilter = document.getElementById('countryFilter').value;
    const industryFilter = document.getElementById('industryFilter').value;

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

    const noSuppliers = document.getElementById('noSuppliers');
    if (filteredSuppliers.length === 0) {
        noSuppliers.classList.remove('hidden');
    } else {
        noSuppliers.classList.add('hidden');
    }
}

(function(){
    const modal = document.getElementById('supplierDetailsModal');
    if (modal) {
        modal.addEventListener('click', function(e) { if (e.target === this) closeSupplierDetailsModal(); });
    }
})();

(function(){
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
})();
