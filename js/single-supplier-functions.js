// Single Supplier Functions - وظائف صفحة المورد الواحد

// مسح فلاتر الموردين
function clearSupplierFilters() {
    const searchInput = document.getElementById('searchSuppliers');
    const countryFilter = document.getElementById('countryFilter');
    const industryFilter = document.getElementById('industryFilter');

    if (searchInput) searchInput.value = '';
    if (countryFilter) countryFilter.value = '';
    if (industryFilter) industryFilter.value = '';

    filterSuppliers();
}

// عرض تفاصيل المورد
function showSupplierDetails(supplierId) {
    const allDetails = document.querySelectorAll('.supplier-details');
    allDetails.forEach(detail => detail.classList.add('hidden'));

    const supplierDetails = document.querySelector(`.supplier-details[data-supplier-id="${supplierId}"]`);
    if (supplierDetails) {
        supplierDetails.classList.remove('hidden');
    }

    const modal = document.getElementById('supplierDetailsModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// إغلاق نافذة التفاصيل
function closeSupplierDetailsModal() {
    const modal = document.getElementById('supplierDetailsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// فلترة الموردين
function filterSuppliers() {
    const searchTerm = document.getElementById('searchSuppliers')?.value.toLowerCase() || '';
    const countryFilter = document.getElementById('countryFilter')?.value || '';
    const industryFilter = document.getElementById('industryFilter')?.value || '';

    const supplierCards = document.querySelectorAll('.supplier-card');
    let visibleCount = 0;

    supplierCards.forEach(card => {
        const nameEl = card.querySelector('h3');
        const descEl = card.querySelector('p');
        const name = nameEl ? nameEl.textContent.toLowerCase() : '';
        const description = descEl ? descEl.textContent.toLowerCase() : '';
        const country = card.dataset.country || '';
        const industry = card.dataset.industry || '';

        const matchesSearch = !searchTerm || name.includes(searchTerm) || description.includes(searchTerm);
        const matchesCountry = !countryFilter || country === countryFilter;
        const matchesIndustry = !industryFilter || industry === industryFilter;

        if (matchesSearch && matchesCountry && matchesIndustry) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    const noSuppliers = document.getElementById('noSuppliers');
    if (noSuppliers) {
        if (visibleCount === 0) {
            noSuppliers.classList.remove('hidden');
        } else {
            noSuppliers.classList.add('hidden');
        }
    }
}

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchSuppliers');
    const countryFilter = document.getElementById('countryFilter');
    const industryFilter = document.getElementById('industryFilter');

    if (searchInput) searchInput.addEventListener('input', filterSuppliers);
    if (countryFilter) countryFilter.addEventListener('change', filterSuppliers);
    if (industryFilter) industryFilter.addEventListener('change', filterSuppliers);

    const modal = document.getElementById('supplierDetailsModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) closeSupplierDetailsModal();
        });
    }
});
