# PAGEWISE — Premium Online Bookstore

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stack: Vanilla JS + Bootstrap 5](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS%20%7C%20Bootstrap%205-navy.svg)](#technology-stack)
[![Zero Build Step](https://img.shields.io/badge/Build-Zero%20Build%20Step%20Required-success.svg)](#quick-start)

> **"Find Your Next Chapter."**  
> PAGEWISE is a production-quality, commercial-grade online bookstore designed with an editorial aesthetic, ivory/cream backgrounds, navy and warm copper accents, curated typography (*Playfair Display* & *Inter*), and seamless responsiveness across all screen sizes.

---

## 🌟 Key Features

### 1. Curated Multi-Genre Catalog (45+ Master Titles)
- Comprehensive collection across 18 genres: *Fiction, Non-Fiction, Philosophy, Science, History, Biography, Psychology, Self-Help, Business, Poetry, Fantasy, Sci-Fi, Art & Design, Travel, Cooking, Mystery, Classics, and Comics*.
- Real book covers delivered dynamically via the **Open Library Covers ISBN API** with reliable SVG fallbacks.
- Complete metadata for each title: ISBN-13, publisher, publication date, format options, page count, synopsis, dimensions, author biography, and verified reader ratings.

### 2. Search, Multi-Filter & Sorting Engine (`shop.html` + `shop.js`)
- Instant debounced search querying book titles, authors, categories, and keyword tags.
- Dynamic faceted filters:
  - Multi-category checkboxes with live book count badges
  - Price slider with instant max-value clamping
  - Star ratings filter (4.5+, 4.0+, 3.5+)
  - Format filters (*Hardcover, Paperback, eBook*)
  - Stock availability toggle (*All, In Stock Only, Out of Stock*)
- 6 Sorting methods: *Featured / Relevance, Most Popular, Newest Releases, Price Low-to-High, Price High-to-Low, Highest Rated*.
- Grid vs. List layout toggle with responsive pagination and active filter dismiss chips.

### 3. Rich Editorial Book Detail Experience (`book-details.html`)
- High-resolution cover viewer with badge ribbons (*Bestseller*, *Verified Edition*).
- Live inventory stock monitoring: "In Stock", "Only X Left", or "Out of Stock" alerts.
- Quantity selector with max-stock enforcement.
- "Add to Bag", "Buy Now" (instant checkout redirect), and "Wishlist" toggles.
- Book specifications table, author biography card, customer reviews with verified review submission modal.
- Related titles ("Readers Also Enjoyed") and Recently Viewed carousel.

### 4. Shopping Bag & Free Delivery Meter (`cart.html`)
- Live cart calculation with retail MRP savings breakdown.
- Visual Free Express Delivery progress meter (Free shipping on orders ≥ ₹499).
- Promo coupon code verification engine with support for:
  - `WELCOME10`: 10% off your entire order (Min order ₹399)
  - `PAGE50` / `VOOK50`: Flat ₹50 off on orders above ₹499
  - `READER100`: Flat ₹100 off on orders above ₹899
  - `BOOKWORM15`: 15% off up to ₹250 on orders above ₹1,199
- Direct quantity increments/decrements with real-time total recalculation.

### 5. Seamless 4-Step Checkout (`checkout.html` + `js/checkout.js`)
- Step 1: Contact details (email, full name, phone).
- Step 2: Shipping address with saved address book selector and "save address" toggle.
- Step 3: Delivery speed selection (*Standard Free Shipping* vs *Priority Express*).
- Step 4: Simulated payment modes (*UPI / Google Pay / PhonePe, Credit/Debit Card, Net Banking, Cash on Delivery*).
- Automatic inventory stock decrement upon order confirmation.
- Order confirmation screen with unique order ID (`PW-...`), delivery tracker, and confetti celebration.

### 6. User Profile & Preferences (`profile.html`)
- Personal details editing with persistent state.
- Interactive reading taste chips to customize genre recommendations.
- Saved address book with add/delete options.
- Notification toggles for curated book recommendations and order status alerts.

### 7. Order Tracking & Tax Invoice (`orders.html`)
- Chronological customer orders list with live visual delivery stepper (*Order Placed → Processing → Shipped → Delivered*).
- Printable tax invoice / receipt modal with detailed breakdown.
- One-click "Buy Again" reorder flow.
- Order cancellation with automatic inventory stock restoration.

### 8. Administrative Control Panel (`admin.html` + `js/admin.js`)
- Executive KPI dashboard: Total titles, warehouse units, orders count, average order value, and gross revenue.
- Full Book CRUD: Add new titles with custom cover URL, edit pricing/description, and quick +/- stock adjusters.
- Customer order fulfillment workflow: Change order statuses (*Confirmed → Processing → Shipped → Delivered → Cancelled*).
- Diagnostic tools: Generate sample demo orders, restore factory catalog (45 books), or purge local storage data.

### 9. Design, Smoothness & Responsiveness
- Editorial aesthetics: Rich navy (`#1A2332`), Warm copper accent (`#D4A843`), Soft ivory (`#FAF7F2`).
- Dark mode toggle with instant theme token switching and persistence.
- Sticky mobile bottom navigation bar (*Home, Explore, Wishlist, Cart, Profile*) with iOS/Android safe area support.
- Micro-interactions, smooth hover lifts, responsive tap states, subtle custom scrollbars, and zero framework overhead.

---

## 🛠️ Technology Stack

Strict adherence to lightweight, modern web standards:
- **HTML5**: Semantic tags, accessible forms, meta descriptions, and Open Graph tags.
- **CSS3**: Custom design tokens (CSS variables), glassmorphism, responsive grid/flexbox, animations.
- **Vanilla JavaScript (ES6+)**: Pure JS application state, event-driven components, and `localStorage` persistence.
- **Bootstrap 5.3.3**: Layout utilities, responsive grid, modals, and tabs.
- **Bootstrap Icons 1.11.3**: Crisp iconography.
- **Google Fonts**: *Playfair Display* (Editorial headings) + *Inter* (UI readability).
- **Zero Build Step**: No Node.js, Webpack, Vite, React, or compilers required. Double-click to run!

---

## 📂 Project Architecture

```
PAGEWISE/
├── index.html            # Storefront homepage (Hero, trending, bestsellers, staff picks)
├── shop.html             # Catalog exploration with faceted sidebar filtering & sorting
├── book-details.html     # Book detail page, synopsis, author bio, reviews, related titles
├── cart.html             # Shopping bag, coupon validation, free shipping meter
├── checkout.html         # 4-step wizard checkout, address book, simulated payments
├── wishlist.html         # Saved items grid, move to cart, clear wishlist
├── profile.html          # User account, genre taste chips, address management
├── orders.html           # Order history, live tracking stepper, printable invoice receipt
├── admin.html            # Operations console, book CRUD, stock editor, order management
├── css/
│   └── style.css         # Complete design system, dark mode tokens, components, responsive rules
├── js/
│   ├── data.js           # 45 master books, categories, staff picks, coupons, shipping config
│   ├── app.js            # Shared state manager, cart, wishlist, toasts, dark mode
│   ├── shop.js           # Shop filters, search, view toggle, and pagination engine
│   ├── checkout.js       # Checkout multi-step controller, stock decrement, order creation
│   └── admin.js          # Admin dashboard KPIs, catalog CRUD, order fulfillment, data tools
├── assets/               # Local media and asset storage
└── README.md             # Project documentation and specifications
```

---

## 🚀 Quick Start

1. Simply open **`index.html`** in any modern web browser (Chrome, Edge, Firefox, Safari).
2. Alternatively, run any simple local HTTP server from the project directory:
   ```bash
   # Using Python 3
   python -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

---

## 🎟️ Active Demo Coupons

| Coupon Code | Discount | Minimum Order | Usage Limit |
|---|---|---|---|
| `WELCOME10` | 10% off (Max ₹150) | ₹399 | 1 per user |
| `PAGE50` | Flat ₹50 off | ₹499 | Unlimited |
| `READER100` | Flat ₹100 off | ₹899 | Unlimited |
| `BOOKWORM15` | 15% off (Max ₹250) | ₹1,199 | Unlimited |

---

## ⚙️ Prototype & Simulation Disclaimers

- **Simulated Authentication**: Sign-in and account registration are simulated client-side to demonstrate personalized features.
- **Simulated Payments**: No real banking or UPI credentials are required or processed. All transactions are local demonstrations.
- **Storage**: Data is securely maintained in your browser's `localStorage`. You can reset the catalog or purge data anytime from the **Admin Console** (`admin.html` > Data Tools).

---

## 📄 License

This project is created for educational and portfolio demonstration purposes under the MIT License.
