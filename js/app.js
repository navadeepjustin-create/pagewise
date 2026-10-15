/**
 * PAGEWISE — app.js
 * Shared application logic: localStorage helpers, cart, wishlist,
 * navigation, toasts, dark mode, and common UI utilities.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   STORAGE HELPERS
   ═══════════════════════════════════════════════════════════ */
const Store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('PAGEWISE: localStorage write failed', e);
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

/* ═══════════════════════════════════════════════════════════
   BOOKS MANAGER — read from store with catalogue fallback
   ═══════════════════════════════════════════════════════════ */
function getBooks() {
  const stored = Store.get(STORAGE_KEYS.books);
  if (stored && stored.length) return stored;
  Store.set(STORAGE_KEYS.books, BOOKS_DATA);
  return BOOKS_DATA;
}
function getBookById(id) {
  return getBooks().find(b => b.id === Number(id)) || null;
}
function saveBooks(books) {
  Store.set(STORAGE_KEYS.books, books);
}

/* ═══════════════════════════════════════════════════════════
   INVENTORY — track real-time stock separate from base data
   ═══════════════════════════════════════════════════════════ */
function getStock(bookId) {
  const inv = Store.get(STORAGE_KEYS.inventory, {});
  if (inv[bookId] !== undefined) return inv[bookId];
  const book = getBookById(bookId);
  return book ? book.stock : 0;
}
function updateStock(bookId, qty) {
  const inv = Store.get(STORAGE_KEYS.inventory, {});
  const current = getStock(bookId);
  inv[bookId] = Math.max(0, current - qty);
  Store.set(STORAGE_KEYS.inventory, inv);
}
function setStock(bookId, newStock) {
  const inv = Store.get(STORAGE_KEYS.inventory, {});
  inv[bookId] = Math.max(0, newStock);
  Store.set(STORAGE_KEYS.inventory, inv);
}

/* ═══════════════════════════════════════════════════════════
   CART
   ═══════════════════════════════════════════════════════════ */
function getCart() {
  return Store.get(STORAGE_KEYS.cart, []);
}
function saveCart(cart) {
  Store.set(STORAGE_KEYS.cart, cart);
  updateCartBadge();
  window.dispatchEvent(new Event('cartUpdated'));
}
function addToCart(bookId, qty = 1, format = 'paperback') {
  const book = getBookById(bookId);
  if (!book) return false;
  const stock = getStock(bookId);
  if (stock <= 0) { showToast('This book is currently out of stock.', 'warning'); return false; }
  let cart = getCart();
  const idx = cart.findIndex(c => c.bookId === bookId && c.format === format);
  if (idx > -1) {
    const newQty = cart[idx].qty + qty;
    if (newQty > stock) { showToast(`Only ${stock} copies available.`, 'warning'); return false; }
    cart[idx].qty = newQty;
  } else {
    if (qty > stock) { showToast(`Only ${stock} copies available.`, 'warning'); return false; }
    cart.push({ bookId, qty, format });
  }
  saveCart(cart);
  showToast(`"${book.title}" added to cart!`, 'success');
  return true;
}
function removeFromCart(bookId, format) {
  let cart = getCart().filter(c => !(c.bookId === bookId && c.format === format));
  saveCart(cart);
}
function updateCartQty(bookId, format, newQty) {
  let cart = getCart();
  const idx = cart.findIndex(c => c.bookId === bookId && c.format === format);
  if (idx === -1) return;
  const stock = getStock(bookId);
  if (newQty <= 0) { cart.splice(idx, 1); }
  else if (newQty > stock) { showToast(`Only ${stock} copies available.`, 'warning'); return; }
  else { cart[idx].qty = newQty; }
  saveCart(cart);
}
function getCartCount() {
  return getCart().reduce((sum, c) => sum + c.qty, 0);
}
function getCartSubtotal() {
  return getCart().reduce((sum, c) => {
    const book = getBookById(c.bookId);
    return sum + (book ? book.sellingPrice * c.qty : 0);
  }, 0);
}
function getCartOriginalTotal() {
  return getCart().reduce((sum, c) => {
    const book = getBookById(c.bookId);
    return sum + (book ? book.originalPrice * c.qty : 0);
  }, 0);
}
function clearCart() {
  saveCart([]);
}
function updateCartBadge() {
  document.querySelectorAll('.cart-badge').forEach(el => {
    const count = getCartCount();
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

/* ═══════════════════════════════════════════════════════════
   WISHLIST
   ═══════════════════════════════════════════════════════════ */
function getWishlist() {
  return Store.get(STORAGE_KEYS.wishlist, []);
}
function saveWishlist(wl) {
  Store.set(STORAGE_KEYS.wishlist, wl);
  updateWishlistBadge();
  window.dispatchEvent(new Event('wishlistUpdated'));
}
function toggleWishlist(bookId) {
  let wl = getWishlist();
  const idx = wl.indexOf(Number(bookId));
  const book = getBookById(bookId);
  if (idx > -1) { wl.splice(idx, 1); showToast(`"${book?.title}" removed from wishlist.`, 'info'); }
  else { wl.push(Number(bookId)); showToast(`"${book?.title}" added to wishlist!`, 'success'); }
  saveWishlist(wl);
  return idx === -1; // true = now in wishlist
}
function isInWishlist(bookId) {
  return getWishlist().includes(Number(bookId));
}
const isWishlisted = isInWishlist;

function updateWishlistBadge() {
  document.querySelectorAll('.wishlist-badge').forEach(el => {
    const count = getWishlist().length;
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

/* ═══════════════════════════════════════════════════════════
   RECENTLY VIEWED
   ═══════════════════════════════════════════════════════════ */
function addToRecentlyViewed(bookId) {
  let rv = Store.get(STORAGE_KEYS.recentlyViewed, []);
  rv = rv.filter(id => id !== Number(bookId));
  rv.unshift(Number(bookId));
  if (rv.length > 12) rv = rv.slice(0, 12);
  Store.set(STORAGE_KEYS.recentlyViewed, rv);
}
const addRecentlyViewed = addToRecentlyViewed;
function getRecentlyViewed() {
  return Store.get(STORAGE_KEYS.recentlyViewed, []);
}

/* ═══════════════════════════════════════════════════════════
   USER
   ═══════════════════════════════════════════════════════════ */
function getUser() {
  return Store.get(STORAGE_KEYS.user, null);
}
function saveUser(u) {
  Store.set(STORAGE_KEYS.user, u);
}
function createDefaultUser() {
  return {
    name: 'Aarav Sharma',
    email: 'reader@pagewise.in',
    phone: '9876543210',
    avatar: '',
    genres: ['fiction', 'philosophy', 'sci-fi'],
    isRegistered: true,
    joinDate: new Date().toISOString()
  };
}
function ensureUser() {
  if (!getUser()) {
    saveUser(createDefaultUser());
  }
  return getUser();
}

/* ═══════════════════════════════════════════════════════════
   ADDRESSES
   ═══════════════════════════════════════════════════════════ */
function getAddresses() {
  const addrs = Store.get(STORAGE_KEYS.addresses, null);
  if (!addrs || addrs.length === 0) {
    const defaultAddrs = [
      {
        id: 'ADDR_DEFAULT',
        fullName: 'Aarav Sharma',
        phone: '9876543210',
        street: '42 Promenade View, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        type: 'Home'
      }
    ];
    Store.set(STORAGE_KEYS.addresses, defaultAddrs);
    return defaultAddrs;
  }
  return addrs;
}
function saveAddress(addr) {
  const addrs = getAddresses();
  addr.id = addr.id || 'ADDR' + Date.now();
  const idx = addrs.findIndex(a => a.id === addr.id);
  if (idx > -1) addrs[idx] = addr; else addrs.push(addr);
  Store.set(STORAGE_KEYS.addresses, addrs);
}

/* ═══════════════════════════════════════════════════════════
   ORDERS
   ═══════════════════════════════════════════════════════════ */
function getOrders() {
  return Store.get(STORAGE_KEYS.orders, []);
}
function saveOrder(order) {
  const orders = getOrders();
  orders.unshift(order);
  Store.set(STORAGE_KEYS.orders, orders);
}
function updateOrderStatus(orderId, status) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({ status, timestamp: new Date().toISOString() });
    Store.set(STORAGE_KEYS.orders, orders);
  }
}
function generateOrderId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'PW-';
  for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

/* ═══════════════════════════════════════════════════════════
   COUPONS
   ═══════════════════════════════════════════════════════════ */
function getCouponUsage() {
  return Store.get(STORAGE_KEYS.couponUsage, {});
}
function applyCoupon(code, subtotal) {
  const coupon = COUPONS.find(c => c.code.toUpperCase() === code.toUpperCase());
  if (!coupon) return { valid: false, message: 'Invalid coupon code.' };
  const usage = getCouponUsage();
  const used = usage[coupon.code] || 0;
  if (used >= coupon.usageLimit) return { valid: false, message: 'Coupon usage limit reached.' };
  if (subtotal < coupon.minOrder) return { valid: false, message: `Minimum order ₹${coupon.minOrder} required.` };
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = roundMoney(subtotal * coupon.value / 100);
    discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.value;
  }
  return { valid: true, discount, coupon, message: `Coupon applied! You save ₹${discount}.` };
}
function recordCouponUsage(code) {
  const usage = getCouponUsage();
  usage[code] = (usage[code] || 0) + 1;
  Store.set(STORAGE_KEYS.couponUsage, usage);
}

/* ═══════════════════════════════════════════════════════════
   PREFERENCES
   ═══════════════════════════════════════════════════════════ */
function getPreferences() {
  return Store.get(STORAGE_KEYS.preferences, { genres: [], notifications: { email: true, offers: true } });
}
function savePreferences(prefs) {
  Store.set(STORAGE_KEYS.preferences, prefs);
}

/* ═══════════════════════════════════════════════════════════
   MONEY HELPERS
   ═══════════════════════════════════════════════════════════ */
function roundMoney(val) {
  return Math.round(val * 100) / 100;
}
function formatPrice(val) {
  return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/* ═══════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ═══════════════════════════════════════════════════════════ */
function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('vook-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'vook-toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  const icons = { success: 'bi-check-circle-fill', error: 'bi-exclamation-triangle-fill', warning: 'bi-exclamation-circle-fill', info: 'bi-info-circle-fill' };
  const toast = document.createElement('div');
  toast.className = `vook-toast vook-toast-${type}`;
  toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${message}</span><button class="vook-toast-close" aria-label="Close notification"><i class="bi bi-x"></i></button>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  const close = () => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); };
  toast.querySelector('.vook-toast-close').addEventListener('click', close);
  setTimeout(close, duration);
}

/* ═══════════════════════════════════════════════════════════
   DARK MODE
   ═══════════════════════════════════════════════════════════ */
function initDarkMode() {
  const isDark = Store.get(STORAGE_KEYS.darkMode, false);
  if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
  document.querySelectorAll('.dark-mode-toggle').forEach(btn => {
    updateDarkModeIcon(btn, isDark);
    btn.addEventListener('click', () => {
      const currentlyDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const newMode = !currentlyDark;
      if (newMode) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
      Store.set(STORAGE_KEYS.darkMode, newMode);
      document.querySelectorAll('.dark-mode-toggle').forEach(b => updateDarkModeIcon(b, newMode));
    });
  });
}
function updateDarkModeIcon(btn, isDark) {
  const icon = btn.querySelector('i');
  if (icon) { icon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill'; }
}

/* ═══════════════════════════════════════════════════════════
   ANNOUNCEMENT BAR
   ═══════════════════════════════════════════════════════════ */
function initAnnouncementBar() {
  const bar = document.getElementById('announcement-bar');
  if (!bar) return;
  const dismissed = Store.get(STORAGE_KEYS.announcementDismissed, false);
  if (dismissed) { bar.style.display = 'none'; return; }
  const closeBtn = bar.querySelector('.announcement-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      bar.style.display = 'none';
      Store.set(STORAGE_KEYS.announcementDismissed, true);
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   STAR RATING RENDERER
   ═══════════════════════════════════════════════════════════ */
function renderStars(rating, size = '') {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.25 && rating % 1 < 0.75 ? 1 : 0;
  const extra = rating % 1 >= 0.75 ? 1 : 0;
  const empty = 5 - full - half - extra;
  let html = '';
  const cls = size ? `star-${size}` : '';
  for (let i = 0; i < full + extra; i++) html += `<i class="bi bi-star-fill text-warning ${cls}"></i>`;
  for (let i = 0; i < half; i++) html += `<i class="bi bi-star-half text-warning ${cls}"></i>`;
  for (let i = 0; i < empty; i++) html += `<i class="bi bi-star text-warning ${cls}"></i>`;
  return html;
}

/* ═══════════════════════════════════════════════════════════
   BOOK CARD RENDERER
   ═══════════════════════════════════════════════════════════ */
function renderBookCard(book, viewType = 'grid') {
  const stock = getStock(book.id);
  const outOfStock = stock <= 0;
  const discount = book.originalPrice > book.sellingPrice ? Math.round((1 - book.sellingPrice / book.originalPrice) * 100) : 0;
  const inWL = isInWishlist(book.id);

  if (viewType === 'list') {
    return `
      <div class="book-card book-card-list" data-book-id="${book.id}">
        <div class="book-card-img-wrap">
          <a href="book-details.html?id=${book.id}">
            <img src="${book.cover}" alt="${book.title}" loading="lazy" onerror="this.src='https://placehold.co/200x300/1a2332/f5f0e8?text=PAGEWISE'">
          </a>
          ${discount > 0 ? `<span class="book-badge-discount">${discount}% off</span>` : ''}
          ${outOfStock ? '<span class="book-badge-oos">Out of Stock</span>' : ''}
        </div>
        <div class="book-card-body-list">
          <a href="book-details.html?id=${book.id}" class="book-card-title">${book.title}</a>
          <p class="book-card-author">by ${book.author}</p>
          <div class="book-card-rating">${renderStars(book.rating)} <span class="text-muted ms-1">(${book.reviewCount})</span></div>
          <p class="book-card-desc-list">${book.description.substring(0, 150)}…</p>
          <div class="book-card-price">
            <span class="price-current">${formatPrice(book.sellingPrice)}</span>
            ${book.originalPrice > book.sellingPrice ? `<span class="price-original">${formatPrice(book.originalPrice)}</span>` : ''}
          </div>
          <div class="book-card-actions mt-2">
            <button class="btn btn-vook btn-sm" onclick="addToCart(${book.id})" ${outOfStock ? 'disabled' : ''}>
              <i class="bi bi-cart-plus"></i> Add to Cart
            </button>
            <button class="btn btn-outline-vook btn-sm btn-wishlist-toggle" onclick="toggleWishlistBtn(${book.id}, this)" aria-label="Toggle wishlist">
              <i class="bi ${inWL ? 'bi-heart-fill' : 'bi-heart'}"></i>
            </button>
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="col">
      <div class="book-card" data-book-id="${book.id}">
        <div class="book-card-img-wrap">
          <a href="book-details.html?id=${book.id}">
            <img src="${book.cover}" alt="${book.title}" loading="lazy" onerror="this.src='https://placehold.co/200x300/1a2332/f5f0e8?text=PAGEWISE'">
          </a>
          ${discount > 0 ? `<span class="book-badge-discount">${discount}% off</span>` : ''}
          ${outOfStock ? '<span class="book-badge-oos">Out of Stock</span>' : ''}
          <button class="btn-wishlist-float ${inWL ? 'active' : ''}" onclick="toggleWishlistBtn(${book.id}, this)" aria-label="Toggle wishlist">
            <i class="bi ${inWL ? 'bi-heart-fill' : 'bi-heart'}"></i>
          </button>
        </div>
        <div class="book-card-body">
          <span class="book-card-category">${CATEGORIES.find(c => c.id === book.category)?.name || book.category}</span>
          <a href="book-details.html?id=${book.id}" class="book-card-title">${book.title}</a>
          <p class="book-card-author">by ${book.author}</p>
          <div class="book-card-rating">${renderStars(book.rating)} <span class="rating-count">(${book.reviewCount})</span></div>
          <div class="book-card-price">
            <span class="price-current">${formatPrice(book.sellingPrice)}</span>
            ${book.originalPrice > book.sellingPrice ? `<span class="price-original">${formatPrice(book.originalPrice)}</span>` : ''}
          </div>
          <button class="btn btn-vook btn-sm w-100 mt-auto" onclick="addToCart(${book.id})" ${outOfStock ? 'disabled' : ''}>
            <i class="bi bi-cart-plus"></i> Add to Cart
          </button>
        </div>
      </div>
    </div>`;
}

function toggleWishlistBtn(bookId, btnEl) {
  const inWL = toggleWishlist(bookId);
  // Update all wishlist icons on page
  document.querySelectorAll(`[data-book-id="${bookId}"] .btn-wishlist-float, [data-book-id="${bookId}"] .btn-wishlist-toggle`).forEach(b => {
    const icon = b.querySelector('i');
    if (icon) { icon.className = inWL ? 'bi bi-heart-fill' : 'bi bi-heart'; }
    b.classList.toggle('active', inWL);
  });
  if (btnEl) {
    const icon = btnEl.querySelector('i');
    if (icon) icon.className = inWL ? 'bi bi-heart-fill' : 'bi bi-heart';
    btnEl.classList.toggle('active', inWL);
  }
}

/* ═══════════════════════════════════════════════════════════
   IMAGE FALLBACK
   ═══════════════════════════════════════════════════════════ */
function handleImageErrors() {
  document.querySelectorAll('img[data-fallback]').forEach(img => {
    img.addEventListener('error', function() {
      this.src = this.dataset.fallback || 'https://placehold.co/200x300/1a2332/f5f0e8?text=VOOK';
    }, { once: true });
  });
}

/* ═══════════════════════════════════════════════════════════
   SCROLL TO TOP
   ═══════════════════════════════════════════════════════════ */
function initScrollToTop() {
  let btn = document.getElementById('scroll-to-top');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'scroll-to-top';
    btn.className = 'scroll-to-top-btn';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.innerHTML = '<i class="bi bi-chevron-up"></i>';
    document.body.appendChild(btn);
  }
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ═══════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV
   ═══════════════════════════════════════════════════════════ */
function initMobileNav() {
  const nav = document.getElementById('mobile-bottom-nav');
  if (!nav) return;
  // Highlight current page
  const page = window.location.pathname.split('/').pop() || 'index.html';
  nav.querySelectorAll('.mobile-nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      item.classList.add('active');
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   SEARCH
   ═══════════════════════════════════════════════════════════ */
function searchBooks(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  return getBooks().filter(b =>
    b.title.toLowerCase().includes(q) ||
    b.author.toLowerCase().includes(q) ||
    b.category.toLowerCase().includes(q) ||
    (b.tags && b.tags.some(t => t.toLowerCase().includes(q)))
  );
}

function initSearchSuggestions() {
  document.querySelectorAll('.vook-search-input').forEach(input => {
    const wrapper = input.closest('.vook-search-wrap');
    if (!wrapper) return;
    let dropdown = wrapper.querySelector('.search-suggestions');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'search-suggestions';
      wrapper.appendChild(dropdown);
    }

    input.addEventListener('input', () => {
      const val = input.value.trim();
      if (val.length < 2) { dropdown.innerHTML = ''; dropdown.classList.remove('show'); return; }
      const results = searchBooks(val).slice(0, 6);
      if (results.length === 0) {
        dropdown.innerHTML = '<div class="search-no-result">No books found.</div>';
      } else {
        dropdown.innerHTML = results.map(b => `
          <a href="book-details.html?id=${b.id}" class="search-suggestion-item">
            <img src="${b.cover}" alt="" onerror="this.src='https://placehold.co/40x60/1a2332/f5f0e8?text=V'" class="search-suggestion-img">
            <div>
              <div class="search-suggestion-title">${b.title}</div>
              <div class="search-suggestion-author">${b.author}</div>
            </div>
            <span class="search-suggestion-price">${formatPrice(b.sellingPrice)}</span>
          </a>
        `).join('');
      }
      dropdown.classList.add('show');
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = input.value.trim();
        if (val) window.location.href = `shop.html?search=${encodeURIComponent(val)}`;
      }
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) { dropdown.classList.remove('show'); }
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   CONFIRMATION MODAL
   ═══════════════════════════════════════════════════════════ */
function confirmAction(message, onConfirm) {
  let modal = document.getElementById('vook-confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'vook-confirm-modal';
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
          <div class="modal-body text-center py-4">
            <i class="bi bi-exclamation-circle text-warning" style="font-size:2.5rem"></i>
            <p class="mt-3 mb-0 confirm-message"></p>
          </div>
          <div class="modal-footer justify-content-center border-0 pt-0">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-vook btn-sm confirm-yes">Confirm</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.querySelector('.confirm-message').textContent = message;
  const bsModal = new bootstrap.Modal(modal);
  const yesBtn = modal.querySelector('.confirm-yes');
  const handler = () => { onConfirm(); bsModal.hide(); yesBtn.removeEventListener('click', handler); };
  yesBtn.addEventListener('click', handler);
  modal.addEventListener('hidden.bs.modal', () => yesBtn.removeEventListener('click', handler), { once: true });
  bsModal.show();
}

/* ═══════════════════════════════════════════════════════════
   REDUCED-MOTION
   ═══════════════════════════════════════════════════════════ */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ═══════════════════════════════════════════════════════════
   INITIALIZATION
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  ensureUser();
  initDarkMode();
  initAnnouncementBar();
  updateCartBadge();
  updateWishlistBadge();
  initScrollToTop();
  initMobileNav();
  initSearchSuggestions();
  handleImageErrors();

  // Activate Bootstrap tooltips
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
});
