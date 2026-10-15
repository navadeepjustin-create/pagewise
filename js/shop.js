/**
 * PAGEWISE — shop.js
 * Shop page: filtering, sorting, pagination, grid/list view.
 */

'use strict';

(function () {
  const ITEMS_PER_PAGE = 12;
  let currentPage = 1;
  let currentView = 'grid'; // 'grid' | 'list'
  let filteredBooks = [];

  // State
  const filters = {
    search: '',
    categories: [],
    priceMin: 0,
    priceMax: 2000,
    ratings: [],
    formats: [],
    availability: 'all', // 'all' | 'instock' | 'outofstock'
    sortBy: 'relevance',    // relevance | popular | newest | price-asc | price-desc | rating
    specialFilter: ''       // 'bestseller' | 'under299' | 'featured'
  };

  /* ── Read URL params ─────────────────────────────────── */
  function readURLParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('search')) filters.search = params.get('search');
    if (params.get('category')) filters.categories = [params.get('category')];
    if (params.get('sort')) {
      const s = params.get('sort');
      if (s === 'bestseller') { filters.specialFilter = 'bestseller'; filters.sortBy = 'popular'; }
      else if (s === 'newest') filters.sortBy = 'newest';
      else if (s === 'popular') filters.sortBy = 'popular';
      else filters.sortBy = s;
    }
    if (params.get('filter')) {
      const f = params.get('filter');
      if (f === 'bestseller') filters.specialFilter = 'bestseller';
      if (f === 'under299') filters.specialFilter = 'under299';
      if (f === 'featured') filters.specialFilter = 'featured';
    }
  }

  /* ── Apply filters ───────────────────────────────────── */
  function applyFilters() {
    let books = getBooks();

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      books = books.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        (b.tags && b.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Categories
    if (filters.categories.length > 0) {
      books = books.filter(b => filters.categories.includes(b.category));
    }

    // Price range
    books = books.filter(b => b.sellingPrice >= filters.priceMin && b.sellingPrice <= filters.priceMax);

    // Ratings
    if (filters.ratings.length > 0) {
      books = books.filter(b => filters.ratings.some(r => b.rating >= r));
    }

    // Formats
    if (filters.formats.length > 0) {
      books = books.filter(b => b.formats && filters.formats.some(f => b.formats.includes(f)));
    }

    // Availability
    if (filters.availability === 'instock') {
      books = books.filter(b => getStock(b.id) > 0);
    } else if (filters.availability === 'outofstock') {
      books = books.filter(b => getStock(b.id) <= 0);
    }

    // Special filters
    if (filters.specialFilter === 'bestseller') books = books.filter(b => b.isBestseller);
    if (filters.specialFilter === 'featured') books = books.filter(b => b.isFeatured);
    if (filters.specialFilter === 'under299') books = books.filter(b => b.sellingPrice < 300);

    // Sorting
    switch (filters.sortBy) {
      case 'popular':
        books.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'newest':
        books.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
        break;
      case 'price-asc':
        books.sort((a, b) => a.sellingPrice - b.sellingPrice);
        break;
      case 'price-desc':
        books.sort((a, b) => b.sellingPrice - a.sellingPrice);
        break;
      case 'rating':
        books.sort((a, b) => b.rating - a.rating);
        break;
      default: // relevance
        break;
    }

    filteredBooks = books;
    currentPage = 1;
    renderBooks();
    renderActiveFilters();
    updateResultCount();
  }

  /* ── Render books grid ───────────────────────────────── */
  function renderBooks() {
    const container = document.getElementById('shop-books-grid');
    if (!container) return;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageBooks = filteredBooks.slice(start, end);

    if (filteredBooks.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="bi bi-search"></i></div>
            <h4>No Books Found</h4>
            <p>Try adjusting your filters or search term.</p>
            <button class="btn btn-vook" onclick="clearAllFilters()">Clear All Filters</button>
          </div>
        </div>`;
      document.getElementById('shop-pagination').innerHTML = '';
      return;
    }

    if (currentView === 'list') {
      container.className = '';
      container.innerHTML = pageBooks.map(b => renderBookCard(b, 'list')).join('');
    } else {
      container.className = 'row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3';
      container.innerHTML = pageBooks.map(b => renderBookCard(b, 'grid')).join('');
    }

    renderPagination();
  }

  /* ── Pagination ──────────────────────────────────────── */
  function renderPagination() {
    const container = document.getElementById('shop-pagination');
    if (!container) return;
    const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '<nav aria-label="Shop pagination"><ul class="pagination vook-pagination justify-content-center mb-0">';
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><button class="page-link" onclick="shopChangePage(${currentPage - 1})" aria-label="Previous"><i class="bi bi-chevron-left"></i></button></li>`;
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1) {
        if (i === 3 || i === totalPages - 2) html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
        continue;
      }
      html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><button class="page-link" onclick="shopChangePage(${i})">${i}</button></li>`;
    }
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><button class="page-link" onclick="shopChangePage(${currentPage + 1})" aria-label="Next"><i class="bi bi-chevron-right"></i></button></li>`;
    html += '</ul></nav>';
    container.innerHTML = html;
  }

  window.shopChangePage = function (page) {
    const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderBooks();
    window.scrollTo({ top: document.getElementById('shop-books-grid').offsetTop - 100, behavior: 'smooth' });
  };

  /* ── Active Filter Tags ──────────────────────────────── */
  function renderActiveFilters() {
    const container = document.getElementById('active-filters');
    if (!container) return;
    let tags = [];
    if (filters.search) tags.push({ label: `Search: "${filters.search}"`, clear: () => { filters.search = ''; document.getElementById('shop-search').value = ''; } });
    filters.categories.forEach(cat => {
      const catObj = CATEGORIES.find(c => c.id === cat);
      tags.push({ label: catObj ? catObj.name : cat, clear: () => { filters.categories = filters.categories.filter(c => c !== cat); uncheckFilter('cat-' + cat); } });
    });
    if (filters.priceMax < 2000) tags.push({ label: `Under ₹${filters.priceMax}`, clear: () => { filters.priceMax = 2000; document.getElementById('price-range').value = 2000; } });
    filters.ratings.forEach(r => {
      tags.push({ label: `${r}+ Stars`, clear: () => { filters.ratings = filters.ratings.filter(x => x !== r); uncheckFilter('rating-' + r); } });
    });
    filters.formats.forEach(f => {
      tags.push({ label: f.charAt(0).toUpperCase() + f.slice(1), clear: () => { filters.formats = filters.formats.filter(x => x !== f); uncheckFilter('format-' + f); } });
    });
    if (filters.availability !== 'all') tags.push({ label: filters.availability === 'instock' ? 'In Stock' : 'Out of Stock', clear: () => { filters.availability = 'all'; document.getElementById('avail-all').checked = true; } });
    if (filters.specialFilter) tags.push({ label: filters.specialFilter === 'bestseller' ? 'Bestsellers' : filters.specialFilter === 'under299' ? 'Under ₹299' : 'Featured', clear: () => { filters.specialFilter = ''; } });

    if (tags.length === 0) { container.innerHTML = ''; return; }
    container.innerHTML = tags.map((t, i) =>
      `<span class="filter-tag">${t.label} <button onclick="removeFilterTag(${i})" aria-label="Remove filter">×</button></span>`
    ).join('') + `<button class="btn btn-ghost btn-sm" onclick="clearAllFilters()">Clear All</button>`;

    // Store tag clearers
    window._filterTagClearers = tags.map(t => t.clear);
  }

  window.removeFilterTag = function (index) {
    if (window._filterTagClearers && window._filterTagClearers[index]) {
      window._filterTagClearers[index]();
      applyFilters();
    }
  };

  window.clearAllFilters = function () {
    filters.search = '';
    filters.categories = [];
    filters.priceMin = 0;
    filters.priceMax = 2000;
    filters.ratings = [];
    filters.formats = [];
    filters.availability = 'all';
    filters.sortBy = 'relevance';
    filters.specialFilter = '';
    // Reset UI
    const searchInput = document.getElementById('shop-search');
    if (searchInput) searchInput.value = '';
    const priceRange = document.getElementById('price-range');
    if (priceRange) priceRange.value = 2000;
    document.querySelectorAll('.filter-sidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
    const availAll = document.getElementById('avail-all');
    if (availAll) availAll.checked = true;
    const sortSelect = document.getElementById('shop-sort');
    if (sortSelect) sortSelect.value = 'relevance';
    applyFilters();
  };

  function uncheckFilter(id) {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  }

  function updateResultCount() {
    const el = document.getElementById('result-count');
    if (el) el.textContent = `${filteredBooks.length} book${filteredBooks.length !== 1 ? 's' : ''} found`;
  }

  /* ── View toggle ─────────────────────────────────────── */
  window.setShopView = function (view) {
    currentView = view;
    document.querySelectorAll('.view-toggle .btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    renderBooks();
  };

  /* ── Initialise ──────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    readURLParams();

    // Search input
    const searchInput = document.getElementById('shop-search');
    if (searchInput) {
      searchInput.value = filters.search;
      searchInput.addEventListener('input', () => { filters.search = searchInput.value; applyFilters(); });
    }

    // Build category filter checkboxes
    const catList = document.getElementById('filter-categories');
    if (catList) {
      CATEGORIES.forEach(cat => {
        const bookCount = getBooks().filter(b => b.category === cat.id).length;
        catList.innerHTML += `
          <label class="filter-option">
            <input type="checkbox" class="form-check-input" id="cat-${cat.id}" value="${cat.id}" ${filters.categories.includes(cat.id) ? 'checked' : ''}>
            <span>${cat.name}</span> <span class="text-muted ms-auto">(${bookCount})</span>
          </label>`;
      });
      catList.addEventListener('change', () => {
        filters.categories = Array.from(catList.querySelectorAll('input:checked')).map(cb => cb.value);
        applyFilters();
      });
    }

    // Price range
    const priceRange = document.getElementById('price-range');
    const priceDisplay = document.getElementById('price-range-val');
    if (priceRange) {
      priceRange.addEventListener('input', () => {
        filters.priceMax = Number(priceRange.value);
        if (priceDisplay) priceDisplay.textContent = `₹0 — ₹${priceRange.value}`;
        applyFilters();
      });
    }

    // Rating filter
    const ratingList = document.getElementById('filter-ratings');
    if (ratingList) {
      ratingList.addEventListener('change', () => {
        filters.ratings = Array.from(ratingList.querySelectorAll('input:checked')).map(cb => Number(cb.value));
        applyFilters();
      });
    }

    // Format filter
    const formatList = document.getElementById('filter-formats');
    if (formatList) {
      formatList.addEventListener('change', () => {
        filters.formats = Array.from(formatList.querySelectorAll('input:checked')).map(cb => cb.value);
        applyFilters();
      });
    }

    // Availability
    document.querySelectorAll('input[name="availability"]').forEach(r => {
      r.addEventListener('change', () => {
        filters.availability = r.value;
        applyFilters();
      });
    });

    // Sort
    const sortSelect = document.getElementById('shop-sort');
    if (sortSelect) {
      sortSelect.value = filters.sortBy;
      sortSelect.addEventListener('change', () => {
        filters.sortBy = sortSelect.value;
        applyFilters();
      });
    }

    // Mobile filter toggle
    const filterToggle = document.getElementById('filter-toggle-mobile');
    const filterSidebar = document.getElementById('filter-sidebar');
    if (filterToggle && filterSidebar) {
      filterToggle.addEventListener('click', () => {
        filterSidebar.classList.toggle('d-none');
        filterSidebar.classList.toggle('d-block');
      });
    }

    applyFilters();
  });
})();
