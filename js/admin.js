/**
 * PAGEWISE — admin.js
 * Administrative control panel: metrics, book catalog CRUD, stock management,
 * order status workflow, sample data reset.
 */

'use strict';

(function () {
  let editingBookId = null;

  document.addEventListener('DOMContentLoaded', () => {
    renderKPIs();
    renderBooksTable();
    renderOrdersTable();
    setupAdminEvents();
  });

  /* ── Render KPI Metrics ── */
  function renderKPIs() {
    const books = getBooks();
    const orders = getOrders();

    const activeOrders = orders.filter(o => o.status !== 'Cancelled');
    const grossRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderVal = activeOrders.length > 0 ? Math.round(grossRevenue / activeOrders.length) : 0;
    const totalStock = books.reduce((sum, b) => sum + getStock(b.id), 0);

    const kpiBooks = document.getElementById('kpi-books-count');
    const kpiOrders = document.getElementById('kpi-orders-count');
    const kpiRevenue = document.getElementById('kpi-revenue');
    const kpiAvgOrder = document.getElementById('kpi-avg-order');
    const kpiStock = document.getElementById('kpi-stock');

    if (kpiBooks) kpiBooks.textContent = books.length;
    if (kpiOrders) kpiOrders.textContent = orders.length;
    if (kpiRevenue) kpiRevenue.textContent = `₹${grossRevenue.toLocaleString('en-IN')}`;
    if (kpiAvgOrder) kpiAvgOrder.textContent = `₹${avgOrderVal.toLocaleString('en-IN')}`;
    if (kpiStock) kpiStock.textContent = totalStock.toLocaleString('en-IN');
  }

  /* ── Render Books Table ── */
  function renderBooksTable(query = '') {
    const tbody = document.getElementById('admin-books-tbody');
    if (!tbody) return;

    let books = getBooks();
    if (query) {
      const q = query.toLowerCase();
      books = books.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.category.toLowerCase().includes(q));
    }

    if (books.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No books matching search.</td></tr>';
      return;
    }

    tbody.innerHTML = books.map(book => {
      const stock = getStock(book.id);
      const stockBadge = stock <= 0 ? 'bg-danger' : stock <= 5 ? 'bg-warning text-dark' : 'bg-success';

      return `
        <tr>
          <td>
            <img src="${book.cover}" alt="${book.title}" class="rounded border" style="width:36px; height:52px; object-fit: cover;" onerror="this.src='https://placehold.co/100x150/1a2332/f5f0e8?text=PAGEWISE'">
          </td>
          <td>
            <div class="fw-semibold small text-truncate" style="max-width:240px;">${book.title}</div>
            <small class="text-muted">${book.author}</small>
          </td>
          <td><span class="badge text-bg-light border text-capitalize">${book.category}</span></td>
          <td class="small">
            <strong class="text-accent">₹${book.sellingPrice}</strong>
            ${book.originalPrice > book.sellingPrice ? `<span class="text-muted text-decoration-line-through ms-1">₹${book.originalPrice}</span>` : ''}
          </td>
          <td>
            <div class="d-flex align-items-center gap-1">
              <span class="badge ${stockBadge}">${stock} in stock</span>
              <button class="btn btn-sm btn-light border p-0 px-1" onclick="adjustAdminStock('${book.id}', 1)" title="Add 1 copy">+</button>
              <button class="btn btn-sm btn-light border p-0 px-1" onclick="adjustAdminStock('${book.id}', -1)" title="Remove 1 copy">-</button>
            </div>
          </td>
          <td>
            <span class="text-warning small">${book.rating.toFixed(1)} ★</span>
          </td>
          <td class="text-end">
            <button class="btn btn-ghost btn-sm text-primary me-1" onclick="openEditBookModal('${book.id}')" title="Edit book">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="handleDeleteBook('${book.id}')" title="Delete book">
              <i class="bi bi-trash3"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.adjustAdminStock = function(bookId, delta) {
    updateStock(bookId, delta);
    renderBooksTable(document.getElementById('admin-book-search')?.value || '');
    renderKPIs();
    showToast(`Stock updated for book #${bookId}.`, 'info');
  };

  /* ── Add / Edit Book Modal ── */
  window.openAddBookModal = function() {
    editingBookId = null;
    document.getElementById('book-modal-title').textContent = 'Add New Book to Catalog';
    document.getElementById('admin-book-form').reset();
    new bootstrap.Modal(document.getElementById('bookModal')).show();
  };

  window.openEditBookModal = function(bookId) {
    const book = getBookById(bookId);
    if (!book) return;
    editingBookId = book.id;

    document.getElementById('book-modal-title').textContent = 'Edit Book Details';
    document.getElementById('bm-title').value = book.title;
    document.getElementById('bm-author').value = book.author;
    document.getElementById('bm-category').value = book.category;
    document.getElementById('bm-sell-price').value = book.sellingPrice;
    document.getElementById('bm-orig-price').value = book.originalPrice;
    document.getElementById('bm-stock').value = getStock(book.id);
    document.getElementById('bm-isbn').value = book.isbn || '';
    document.getElementById('bm-publisher').value = book.publisher || '';
    document.getElementById('bm-cover').value = book.cover || '';
    document.getElementById('bm-desc').value = book.description || '';

    new bootstrap.Modal(document.getElementById('bookModal')).show();
  };

  window.handleDeleteBook = function(bookId) {
    const book = getBookById(bookId);
    if (!book) return;
    if (!confirm(`Are you sure you want to delete "${book.title}" from catalog?`)) return;

    let books = getBooks();
    books = books.filter(b => b.id !== Number(bookId));
    saveBooks(books);
    showToast(`"${book.title}" deleted from catalog.`, 'info');
    renderBooksTable(document.getElementById('admin-book-search')?.value || '');
    renderKPIs();
  };

  /* ── Render Orders Table ── */
  function renderOrdersTable(query = '') {
    const tbody = document.getElementById('admin-orders-tbody');
    if (!tbody) return;

    let orders = getOrders();
    if (query) {
      const q = query.toLowerCase();
      orders = orders.filter(o => o.id.toLowerCase().includes(q) || o.shippingAddress.fullName.toLowerCase().includes(q));
    }

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No customer orders recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const orderDate = new Date(order.date).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      return `
        <tr>
          <td><strong class="text-accent small">${order.id}</strong></td>
          <td class="small text-muted">${orderDate}</td>
          <td>
            <div class="fw-semibold small">${order.shippingAddress.fullName}</div>
            <small class="text-muted">${order.shippingAddress.city}, ${order.shippingAddress.state}</small>
          </td>
          <td class="small">${order.items.reduce((s, i) => s + i.qty, 0)} books</td>
          <td class="fw-bold small">₹${order.total}</td>
          <td>
            <select class="form-select form-select-sm" style="width:130px; font-size:0.75rem" onchange="handleOrderStatusChange('${order.id}', this.value)">
              <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
              <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td class="text-end">
            <a href="orders.html?id=${order.id}" class="btn btn-ghost btn-sm" target="_blank" title="View customer order receipt">
              <i class="bi bi-box-arrow-up-right"></i>
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.handleOrderStatusChange = function(orderId, newStatus) {
    updateOrderStatus(orderId, newStatus);
    showToast(`Order #${orderId} updated to ${newStatus}.`, 'success');
    renderKPIs();
  };

  /* ── Event Listeners ── */
  function setupAdminEvents() {
    // Books search filter
    document.getElementById('admin-book-search')?.addEventListener('input', (e) => {
      renderBooksTable(e.target.value.trim());
    });

    // Orders search filter
    document.getElementById('admin-order-search')?.addEventListener('input', (e) => {
      renderOrdersTable(e.target.value.trim());
    });

    // Book form submission
    document.getElementById('admin-book-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('bm-title').value.trim();
      const author = document.getElementById('bm-author').value.trim();
      const category = document.getElementById('bm-category').value;
      const sellingPrice = parseFloat(document.getElementById('bm-sell-price').value) || 299;
      const originalPrice = parseFloat(document.getElementById('bm-orig-price').value) || sellingPrice;
      const stock = parseInt(document.getElementById('bm-stock').value, 10) || 10;
      const isbn = document.getElementById('bm-isbn').value.trim() || '9780000000000';
      const publisher = document.getElementById('bm-publisher').value.trim() || 'PAGEWISE Publishing';
      const cover = document.getElementById('bm-cover').value.trim() || `https://placehold.co/400x600/1a2332/f5f0e8?text=${encodeURIComponent(title)}`;
      const description = document.getElementById('bm-desc').value.trim() || 'A captivating work of literature.';

      let books = getBooks();

      if (editingBookId) {
        // Edit existing
        const idx = books.findIndex(b => b.id === Number(editingBookId));
        if (idx > -1) {
          books[idx] = {
            ...books[idx],
            title,
            author,
            category,
            sellingPrice,
            originalPrice,
            isbn,
            publisher,
            cover,
            description
          };
          setStock(editingBookId, stock);
          showToast(`Updated "${title}".`, 'success');
        }
      } else {
        // Create new
        const newId = Date.now();
        const newBook = {
          id: newId,
          title,
          author,
          category,
          originalPrice,
          sellingPrice,
          rating: 4.5,
          reviewCount: 1,
          isBestseller: false,
          isFeatured: false,
          publishDate: new Date().toISOString().split('T')[0],
          formats: ['paperback'],
          isbn,
          publisher,
          pageCount: 300,
          cover,
          description
        };
        books.unshift(newBook);
        setStock(newId, stock);
        showToast(`Added "${title}" to catalog!`, 'success');
      }

      saveBooks(books);
      bootstrap.Modal.getInstance(document.getElementById('bookModal'))?.hide();
      renderBooksTable();
      renderKPIs();
    });
  }

  /* ── Sample Data Reset Functions ── */
  window.resetFactoryBooks = function() {
    if (confirm('Reset catalog back to original 45 books? (Custom books will be removed)')) {
      Store.remove(STORAGE_KEYS.books);
      Store.remove(STORAGE_KEYS.inventory);
      showToast('Catalog restored to factory original.', 'success');
      renderBooksTable();
      renderKPIs();
    }
  };

  window.generateSampleOrders = function() {
    const books = getBooks();
    const sampleCustomerNames = ['Ananya Roy', 'Rohan Verma', 'Kavita Iyer', 'Arjun Kapoor', 'Meera Nair'];
    const cities = [
      { city: 'Mumbai', state: 'Maharashtra', pin: '400001' },
      { city: 'Delhi', state: 'Delhi', pin: '110001' },
      { city: 'Bengaluru', state: 'Karnataka', pin: '560001' },
      { city: 'Chennai', state: 'Tamil Nadu', pin: '600001' }
    ];

    for (let i = 0; i < 3; i++) {
      const b1 = books[Math.floor(Math.random() * books.length)];
      const b2 = books[Math.floor(Math.random() * books.length)];
      const cust = sampleCustomerNames[i];
      const loc = cities[i % cities.length];
      const subtotal = b1.sellingPrice + b2.sellingPrice;
      const order = {
        id: generateOrderId(),
        date: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
        status: i === 0 ? 'Delivered' : i === 1 ? 'Shipped' : 'Processing',
        items: [
          { bookId: b1.id, title: b1.title, author: b1.author, cover: b1.cover, price: b1.sellingPrice, originalPrice: b1.originalPrice, qty: 1 },
          { bookId: b2.id, title: b2.title, author: b2.author, cover: b2.cover, price: b2.sellingPrice, originalPrice: b2.originalPrice, qty: 1 }
        ],
        subtotal,
        originalTotal: b1.originalPrice + b2.originalPrice,
        shippingFee: 0,
        shippingType: 'standard',
        couponCode: null,
        couponDiscount: 0,
        total: subtotal,
        paymentMethod: 'UPI',
        shippingAddress: {
          fullName: cust,
          phone: '9876543210',
          street: '104 Lotus Promenade',
          city: loc.city,
          state: loc.state,
          pincode: loc.pin
        }
      };
      saveOrder(order);
    }

    showToast('3 sample orders created successfully!', 'success');
    renderOrdersTable();
    renderKPIs();
  };

  window.clearAllData = function() {
    if (confirm('CRITICAL: Clear all customer orders, shopping cart, and saved data?')) {
      Store.remove(STORAGE_KEYS.orders);
      Store.remove(STORAGE_KEYS.cart);
      Store.remove(STORAGE_KEYS.wishlist);
      showToast('All transaction data cleared.', 'info');
      renderOrdersTable();
      renderKPIs();
    }
  };
})();
