// Filters Utility - unified helpers for populating filter selects across the site
(function(){
  'use strict';

  if (typeof window === 'undefined') return;
  if (typeof window.supabaseClient === 'undefined') {
    console.warn('filters.js: supabaseClient is not available yet. Ensure js/supabase-config.js is included before this file.');
  }

  // Helpers to fetch lists from DB with graceful fallbacks
  async function fetchUsers() {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select('username')
        .order('username');
      if (error) throw error;
      return Array.isArray(data) ? data.map(u => u.username).filter(Boolean) : [];
    } catch (e) { console.warn('filters.fetchUsers:', e?.message || e); return []; }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .select('name')
        .order('name');
      if (error) throw error;
      return Array.isArray(data) ? data.map(c => c.name).filter(Boolean) : [];
    } catch (e) { console.warn('filters.fetchCategories:', e?.message || e); return []; }
  }

  async function fetchSuppliers() {
    try {
      const { data, error } = await supabaseClient
        .from('suppliers')
        .select('name')
        .order('name');
      if (error) throw error;
      return Array.isArray(data) ? data.map(s => s.name).filter(Boolean) : [];
    } catch (e) { console.warn('filters.fetchSuppliers:', e?.message || e); return []; }
  }

  async function fetchSupplierCountries() {
    try {
      const { data, error } = await supabaseClient
        .from('suppliers')
        .select('country');
      if (error) throw error;
      const countries = (Array.isArray(data) ? data.map(x => x.country) : []).filter(Boolean);
      return [...new Set(countries)].sort();
    } catch (e) { console.warn('filters.fetchSupplierCountries:', e?.message || e); return []; }
  }

  async function fetchSupplierIndustries() {
    try {
      const { data, error } = await supabaseClient
        .from('suppliers')
        .select('industry');
      if (error) throw error;
      const list = [];
      (Array.isArray(data) ? data : []).forEach(row => {
        const raw = row.industry || '';
        raw.split(',').map(s => s.trim()).filter(Boolean).forEach(s => list.push(s));
      });
      return [...new Set(list)].sort();
    } catch (e) { console.warn('filters.fetchSupplierIndustries:', e?.message || e); return []; }
  }

  function buildOptions(defaultLabel, options) {
    const out = [`<option value="">${defaultLabel}</option>`];
    (options || []).forEach(opt => out.push(`<option value="${opt}">${opt}</option>`));
    return out.join('');
  }

  function populateSelect(select, defaultLabel, options) {
    if (!select) return;
    select.innerHTML = buildOptions(defaultLabel, options);
  }

  // Expose API
  window.filtersUtil = {
    fetchUsers,
    fetchCategories,
    fetchSuppliers,
    fetchSupplierCountries,
    fetchSupplierIndustries,
    populateSelect,
  };
})();
