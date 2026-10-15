/**
 * PAGEWISE — checkout.js
 * Multi-step checkout management, address book integration, simulated payments,
 * order creation, and stock updates.
 */

'use strict';

(function () {
  let currentStep = 1;
  let appliedCoupon = null;
  let selectedShipping = 'standard'; // 'standard' | 'express'
  let selectedPayment = 'upi';       // 'upi' | 'card' | 'netbanking' | 'cod'

  /* ── Initialize Checkout ── */
  document.addEventListener('DOMContentLoaded', () => {
    const cart = getCart();
    if (!cart || cart.length === 0) {
      window.location.href = 'cart.html';
      return;
    }

    // Read saved coupon from sessionStorage
    const savedCoupon = sessionStorage.getItem('pagewise_applied_coupon') || sessionStorage.getItem('vook_applied_coupon');
    if (savedCoupon) {
      try { appliedCoupon = JSON.parse(savedCoupon); } catch (e) { appliedCoupon = null; }
    }

    // Populate user details if stored
    populateUserData();

    // Render Order Summary Sidebar
    renderOrderSummary();

    // Render Saved Addresses
    renderSavedAddresses();

    // Step navigation buttons
    setupStepEvents();

    // Setup payment option toggles
    setupPaymentToggles();

    // Navbar categories
    const catDropdown = document.getElementById('nav-categories-dropdown');
    if (catDropdown) {
      CATEGORIES.forEach(cat => {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item" href="shop.html?category=${cat.id}"><i class="bi ${cat.icon} me-2"></i>${cat.name}</a>`;
        catDropdown.appendChild(li);
      });
    }
  });

  /* ── Populate User Data ── */
  function populateUserData() {
    const user = ensureUser();
    if (user.email) {
      const emailInput = document.getElementById('checkout-email');
      if (emailInput && !emailInput.value) emailInput.value = user.email;
    }
    if (user.name) {
      const nameInput = document.getElementById('checkout-name');
      if (nameInput && !nameInput.value) nameInput.value = user.name;
    }
    if (user.phone) {
      const phoneInput = document.getElementById('checkout-phone');
      if (phoneInput && !phoneInput.value) phoneInput.value = user.phone;
    }
  }

  /* ── Render Order Summary ── */
  function renderOrderSummary() {
    const summaryContainer = document.getElementById('checkout-summary-items');
    if (!summaryContainer) return;

    const cart = getCart();
    const subtotal = getCartSubtotal();
    const origTotal = getCartOriginalTotal();

    // Shipping fee
    let shippingFee = 0;
    if (selectedShipping === 'express') {
      shippingFee = SHIPPING_CONFIG.expressRate || 99;
    } else {
      shippingFee = subtotal >= (SHIPPING_CONFIG.freeThreshold || 499) ? 0 : (SHIPPING_CONFIG.standardRate || 49);
    }

    // Coupon discount
    let couponDiscount = 0;
    if (appliedCoupon) {
      const res = applyCoupon(appliedCoupon.code, subtotal);
      if (res.valid) {
        couponDiscount = res.discount;
      } else {
        appliedCoupon = null;
        sessionStorage.removeItem('pagewise_applied_coupon');
        sessionStorage.removeItem('vook_applied_coupon');
      }
    }

    const grandTotal = Math.max(0, roundMoney(subtotal - couponDiscount + shippingFee));

    // Items list
    summaryContainer.innerHTML = cart.map(item => {
      const book = getBookById(item.bookId);
      if (!book) return '';
      return `
        <div class="d-flex align-items-center gap-3 mb-3">
          <div class="position-relative">
            <img src="${book.cover}" alt="${book.title}" class="rounded border" style="width: 48px; height: 68px; object-fit: cover;" onerror="this.src='https://placehold.co/100x150/1a2332/f5f0e8?text=PAGEWISE'">
            <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark" style="font-size:0.7rem">${item.qty}</span>
          </div>
          <div class="flex-grow-1 min-w-0">
            <h6 class="mb-0 text-truncate small fw-semibold">${book.title}</h6>
            <small class="text-muted d-block">${book.author}</small>
          </div>
          <div class="text-end fw-semibold small">
            ₹${book.sellingPrice * item.qty}
          </div>
        </div>
      `;
    }).join('');

    // Summary numbers
    const subtotalEl = document.getElementById('sum-subtotal');
    if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
    
    const shippingEl = document.getElementById('sum-shipping');
    if (shippingEl) {
      shippingEl.innerHTML = shippingFee === 0 ? '<span class="text-success fw-semibold">FREE</span>' : `₹${shippingFee}`;
    }
    
    const couponRow = document.getElementById('sum-coupon-row');
    if (couponRow) {
      if (couponDiscount > 0) {
        couponRow.style.display = 'flex';
        const couponValEl = document.getElementById('sum-coupon');
        if (couponValEl) couponValEl.textContent = `- ₹${couponDiscount}`;
      } else {
        couponRow.style.display = 'none';
      }
    }

    const totalEl = document.getElementById('sum-total');
    if (totalEl) totalEl.textContent = `₹${grandTotal}`;
  }

  /* ── Render Saved Addresses ── */
  function renderSavedAddresses() {
    const list = document.getElementById('saved-addresses-list');
    if (!list) return;

    const addresses = getAddresses();
    if (!addresses || addresses.length === 0) {
      list.innerHTML = '';
      list.style.display = 'none';
      return;
    }

    list.style.display = 'block';
    list.innerHTML = `
      <h6 class="fw-semibold mb-2">Saved Delivery Addresses</h6>
      <div class="row g-2 mb-3">
        ${addresses.map((addr, idx) => `
          <div class="col-md-6">
            <div class="card p-3 border address-card h-100 cursor-pointer ${idx === 0 ? 'border-primary bg-light' : ''}" onclick="selectSavedAddress('${addr.id}', this)">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="badge text-bg-secondary">${addr.type || 'Home'}</span>
                <span class="small text-primary fw-semibold select-label">${idx === 0 ? 'Selected' : 'Use this'}</span>
              </div>
              <div class="fw-semibold small">${addr.fullName}</div>
              <div class="text-muted small">${addr.street}, ${addr.city}, ${addr.state} - ${addr.pincode}</div>
              <div class="text-muted small">Ph: ${addr.phone}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="text-muted small mb-3">Or fill in a new address below:</div>
    `;

    // Pre-fill with the first saved address
    fillAddressForm(addresses[0]);
  }

  window.selectSavedAddress = function (id, el) {
    document.querySelectorAll('.address-card').forEach(c => {
      c.classList.remove('border-primary', 'bg-light');
      const lbl = c.querySelector('.select-label');
      if (lbl) lbl.textContent = 'Use this';
    });
    el.classList.add('border-primary', 'bg-light');
    const activeLbl = el.querySelector('.select-label');
    if (activeLbl) activeLbl.textContent = 'Selected';

    const addresses = getAddresses();
    const addr = addresses.find(a => a.id === id);
    if (addr) fillAddressForm(addr);
  };

  function fillAddressForm(addr) {
    if (!addr) return;
    if (document.getElementById('checkout-name')) document.getElementById('checkout-name').value = addr.fullName || '';
    if (document.getElementById('checkout-phone')) document.getElementById('checkout-phone').value = addr.phone || '';
    if (document.getElementById('checkout-street')) document.getElementById('checkout-street').value = addr.street || '';
    if (document.getElementById('checkout-city')) document.getElementById('checkout-city').value = addr.city || '';
    if (document.getElementById('checkout-state')) document.getElementById('checkout-state').value = addr.state || '';
    if (document.getElementById('checkout-pincode')) document.getElementById('checkout-pincode').value = addr.pincode || '';
  }

  /* ── Step Events & Validation ── */
  function setupStepEvents() {
    // Step 1 -> Step 2
    document.getElementById('btn-step-1')?.addEventListener('click', () => {
      const email = document.getElementById('checkout-email')?.value.trim();
      const name = document.getElementById('checkout-name')?.value.trim();
      const phone = document.getElementById('checkout-phone')?.value.trim();

      if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address.', 'warning');
        return;
      }
      if (!name) {
        showToast('Please enter your full name.', 'warning');
        return;
      }
      if (!phone || phone.length < 10) {
        showToast('Please enter a valid 10-digit phone number.', 'warning');
        return;
      }

      // Update user in local storage
      const user = ensureUser();
      user.email = email;
      user.name = name;
      user.phone = phone;
      saveUser(user);

      goToStep(2);
    });

    // Step 2 Back
    document.getElementById('btn-back-1')?.addEventListener('click', () => goToStep(1));

    // Step 2 -> Step 3
    document.getElementById('btn-step-2')?.addEventListener('click', () => {
      const street = document.getElementById('checkout-street')?.value.trim();
      const city = document.getElementById('checkout-city')?.value.trim();
      const state = document.getElementById('checkout-state')?.value.trim();
      const pincode = document.getElementById('checkout-pincode')?.value.trim();

      if (!street || !city || !state || !pincode) {
        showToast('Please fill out all address fields.', 'warning');
        return;
      }

      // Optionally save address
      const saveAddrCb = document.getElementById('save-address-check');
      if (saveAddrCb && saveAddrCb.checked) {
        const name = document.getElementById('checkout-name')?.value.trim();
        const phone = document.getElementById('checkout-phone')?.value.trim();
        saveAddress({
          fullName: name,
          phone,
          street,
          city,
          state,
          pincode,
          type: 'Home'
        });
      }

      goToStep(3);
    });

    // Step 3 Back
    document.getElementById('btn-back-2')?.addEventListener('click', () => goToStep(2));

    // Step 3 -> Step 4
    document.getElementById('btn-step-3')?.addEventListener('click', () => {
      const shippingRadios = document.querySelectorAll('input[name="shipping-option"]');
      shippingRadios.forEach(r => {
        if (r.checked) selectedShipping = r.value;
      });
      renderOrderSummary();
      goToStep(4);
    });

    // Step 4 Back
    document.getElementById('btn-back-3')?.addEventListener('click', () => goToStep(3));

    // Place Order Button
    document.getElementById('btn-place-order')?.addEventListener('click', () => {
      handlePlaceOrder();
    });
  }

  function goToStep(step) {
    currentStep = step;
    for (let i = 1; i <= 4; i++) {
      const pane = document.getElementById(`step-pane-${i}`);
      const stepIndicator = document.getElementById(`step-badge-${i}`);
      if (pane) pane.style.display = i === step ? 'block' : 'none';
      if (stepIndicator) {
        if (i < step) {
          stepIndicator.className = 'step-badge completed';
          stepIndicator.innerHTML = '<i class="bi bi-check"></i>';
        } else if (i === step) {
          stepIndicator.className = 'step-badge active';
          stepIndicator.textContent = i;
        } else {
          stepIndicator.className = 'step-badge';
          stepIndicator.textContent = i;
        }
      }
    }
    window.scrollTo({ top: 120, behavior: 'smooth' });
  }

  /* ── Payment Option Toggles ── */
  function setupPaymentToggles() {
    const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
    paymentRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        selectedPayment = radio.value;
        document.querySelectorAll('.payment-subform').forEach(f => f.style.display = 'none');
        const activeSubform = document.getElementById(`payment-subform-${radio.value}`);
        if (activeSubform) activeSubform.style.display = 'block';
      });
    });

    // Shipping option toggles
    document.querySelectorAll('input[name="shipping-option"]').forEach(r => {
      r.addEventListener('change', () => {
        selectedShipping = r.value;
        renderOrderSummary();
      });
    });
  }

  /* ── Handle Place Order ── */
  function handlePlaceOrder() {
    const placeBtn = document.getElementById('btn-place-order');
    if (placeBtn) {
      placeBtn.disabled = true;
      placeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing order…';
    }

    setTimeout(() => {
      const cart = getCart();
      const subtotal = getCartSubtotal();
      const origTotal = getCartOriginalTotal();

      // Shipping calculation
      let shippingFee = 0;
      if (selectedShipping === 'express') {
        shippingFee = SHIPPING_CONFIG.expressRate || 99;
      } else {
        shippingFee = subtotal >= (SHIPPING_CONFIG.freeThreshold || 499) ? 0 : (SHIPPING_CONFIG.standardRate || 49);
      }

      // Coupon discount
      let couponDiscount = 0;
      let couponCode = null;
      if (appliedCoupon) {
        const res = applyCoupon(appliedCoupon.code, subtotal);
        if (res.valid) {
          couponDiscount = res.discount;
          couponCode = appliedCoupon.code;
          recordCouponUsage(couponCode);
        }
      }

      const grandTotal = Math.max(0, roundMoney(subtotal - couponDiscount + shippingFee));
      const orderId = generateOrderId();
      const orderDate = new Date().toISOString();

      // Address snapshot
      const address = {
        fullName: document.getElementById('checkout-name')?.value.trim() || 'Valued Reader',
        phone: document.getElementById('checkout-phone')?.value.trim() || '',
        street: document.getElementById('checkout-street')?.value.trim() || '',
        city: document.getElementById('checkout-city')?.value.trim() || '',
        state: document.getElementById('checkout-state')?.value.trim() || '',
        pincode: document.getElementById('checkout-pincode')?.value.trim() || ''
      };

      // Create Order Record
      const order = {
        id: orderId,
        date: orderDate,
        status: 'Confirmed',
        items: cart.map(item => {
          const b = getBookById(item.bookId);
          return {
            bookId: item.bookId,
            title: b ? b.title : 'Book',
            author: b ? b.author : '',
            cover: b ? b.cover : '',
            price: b ? b.sellingPrice : 0,
            originalPrice: b ? b.originalPrice : 0,
            qty: item.qty
          };
        }),
        subtotal,
        originalTotal: origTotal,
        shippingFee,
        shippingType: selectedShipping,
        couponCode,
        couponDiscount,
        total: grandTotal,
        paymentMethod: selectedPayment.toUpperCase(),
        shippingAddress: address,
        statusHistory: [
          { status: 'Order Placed', timestamp: orderDate, description: 'Your order has been received and confirmed.' },
          { status: 'Processing', timestamp: new Date(Date.now() + 1000 * 60).toISOString(), description: 'Preparing package in PAGEWISE warehouse.' }
        ]
      };

      // 1. Save order
      saveOrder(order);

      // 2. Deduct inventory
      cart.forEach(item => {
        updateStock(item.bookId, -item.qty);
      });

      // 3. Clear cart & session variables
      clearCart();
      sessionStorage.removeItem('pagewise_applied_coupon');
      sessionStorage.removeItem('vook_applied_coupon');
      sessionStorage.removeItem('vook_coins_redeem');

      // 4. Display confirmation screen
      renderOrderConfirmation(order);
    }, 1200);
  }

  /* ── Order Confirmation Screen ── */
  function renderOrderConfirmation(order) {
    const mainContainer = document.getElementById('checkout-main-row');
    if (!mainContainer) return;

    // Delivery estimated date (3-5 days)
    const estDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });

    mainContainer.innerHTML = `
      <div class="col-lg-8 mx-auto">
        <div class="card border-0 shadow-sm p-4 p-md-5 text-center">
          <div class="mb-3">
            <span class="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center" style="width: 72px; height: 72px; font-size: 2rem;">
              <i class="bi bi-check2"></i>
            </span>
          </div>

          <h2 class="fw-heading mb-2">Thank You for Your Order!</h2>
          <p class="text-muted mb-4">Your order has been placed successfully. A confirmation receipt has been generated.</p>

          <div class="card bg-light border-0 p-3 mb-4 text-start">
            <div class="row g-3">
              <div class="col-sm-6">
                <span class="text-muted small d-block">Order Reference:</span>
                <strong class="fs-5 text-accent">${order.id}</strong>
              </div>
              <div class="col-sm-6">
                <span class="text-muted small d-block">Estimated Delivery:</span>
                <strong>${estDate}</strong>
              </div>
              <div class="col-sm-6">
                <span class="text-muted small d-block">Payment Mode:</span>
                <strong>${order.paymentMethod} (Simulated)</strong>
              </div>
              <div class="col-sm-6">
                <span class="text-muted small d-block">Total Amount Paid:</span>
                <strong class="text-success fs-5">₹${order.total}</strong>
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap justify-content-center gap-3 mt-4">
            <a href="orders.html" class="btn btn-vook px-4"><i class="bi bi-box-seam me-2"></i> View Order History</a>
            <a href="shop.html" class="btn btn-outline-vook px-4"><i class="bi bi-compass me-2"></i> Continue Shopping</a>
          </div>

          <p class="sample-data-label mt-4 mb-0">Local prototype demonstration: no actual payment was charged.</p>
        </div>
      </div>
    `;
  }
})();
