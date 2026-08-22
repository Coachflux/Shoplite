// ============================================
// APP CONTROLLER - Matching reference image
// ============================================

const Storage = {
    get(key, defaultVal = null) {
        try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : defaultVal; }
        catch { return defaultVal; }
    },
    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
    remove(key) { localStorage.removeItem(key); }
};

const AppState = {
    cart: Storage.get('cart', []),
    wishlist: Storage.get('wishlist', []),
    orders: Storage.get('orders', []),
    recentlyViewed: Storage.get('recentlyViewed', []),
    notifications: Storage.get('notifications', []),
    addresses: Storage.get('addresses', [
        { id: 1, type: 'Home', text: '12 Adeola Odeku Street, Victoria Island, Lagos' },
        { id: 2, type: 'Office', text: '45 Broad Street, Marina, Lagos Island, Lagos' }
    ]),
    user: Storage.get('user', { name: 'Abumchukwu', email: 'abumchukwu@email.com', phone: '+234 803 123 4567' }),
    theme: Storage.get('theme', 'light'),
    currentPage: 'home',
    selectedProduct: null,
    selectedColor: null,
    selectedSize: null,
    selectedAddress: 1,
    selectedPayment: 'card',
    searchFilter: 'all'
};

// Toast
function showToast(title, message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-circle' };
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${icons[type] || icons.success}"></i></div>
        <div class="toast-content"><h4>${title}</h4><p>${message}</p></div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('hiding'); setTimeout(() => toast.remove(), 250); }, duration);
}

// Cart
function getCartCount() { return AppState.cart.reduce((sum, item) => sum + item.qty, 0); }
function getCartTotal() { return AppState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0); }

function addToCart(productId, qty = 1, color = null, size = null) {
    const product = getProductById(productId);
    if (!product) return;
    const existing = AppState.cart.find(item => item.id === productId && item.color === color && item.size === size);
    if (existing) { existing.qty += qty; }
    else { AppState.cart.push({ id: productId, name: product.name, price: product.price, image: product.image, qty, color, size }); }
    Storage.set('cart', AppState.cart);
    updateCartBadge();
    showToast('Added to Cart', `${product.name} has been added to your cart.`, 'success');
}

function removeFromCart(productId, color, size) {
    AppState.cart = AppState.cart.filter(item => !(item.id === productId && item.color === color && item.size === size));
    Storage.set('cart', AppState.cart);
    updateCartBadge();
    renderCart();
}

function updateCartQty(productId, color, size, delta) {
    const item = AppState.cart.find(i => i.id === productId && i.color === color && i.size === size);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) { removeFromCart(productId, color, size); return; }
    Storage.set('cart', AppState.cart);
    updateCartBadge();
    renderCart();
}

function updateCartBadge() {
    const badges = document.querySelectorAll('.cart-badge');
    const count = getCartCount();
    badges.forEach(badge => { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none'; });
    const cartCountText = document.getElementById('cartCountText');
    if (cartCountText) cartCountText.textContent = `${count} item${count !== 1 ? 's' : ''}`;
}

// Wishlist
function toggleWishlist(productId) {
    const index = AppState.wishlist.indexOf(productId);
    const product = getProductById(productId);
    if (index > -1) {
        AppState.wishlist.splice(index, 1);
        showToast('Removed', `${product.name} removed from wishlist.`, 'warning');
    } else {
        AppState.wishlist.push(productId);
        showToast('Added to Wishlist', `${product.name} has been saved.`, 'success');
    }
    Storage.set('wishlist', AppState.wishlist);
    updateWishlistButtons();
    if (AppState.currentPage === 'wishlist') renderWishlist();
}

function isInWishlist(productId) { return AppState.wishlist.includes(productId); }

function updateWishlistButtons() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        const pid = parseInt(btn.dataset.id);
        if (isInWishlist(pid)) { btn.classList.add('active'); btn.innerHTML = '<i class="fas fa-heart"></i>'; }
        else { btn.classList.remove('active'); btn.innerHTML = '<i class="far fa-heart"></i>'; }
    });
}

function addToRecentlyViewed(productId) {
    AppState.recentlyViewed = AppState.recentlyViewed.filter(id => id !== productId);
    AppState.recentlyViewed.unshift(productId);
    if (AppState.recentlyViewed.length > 10) AppState.recentlyViewed.pop();
    Storage.set('recentlyViewed', AppState.recentlyViewed);
}

function addNotification(title, message, type = 'cart') {
    AppState.notifications.unshift({ id: Date.now(), title, message, type, time: new Date().toISOString(), read: false });
    if (AppState.notifications.length > 50) AppState.notifications.pop();
    Storage.set('notifications', AppState.notifications);
}

// Theme
function toggleTheme() {
    AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
    document.body.classList.toggle('dark-mode', AppState.theme === 'dark');
    Storage.set('theme', AppState.theme);
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.classList.toggle('active', AppState.theme === 'dark');
}

function initTheme() {
    if (AppState.theme === 'dark') document.body.classList.add('dark-mode');
}

// Navigation
function navigateTo(page, params = {}) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');
    AppState.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navMap = { home: 'nav-home', categories: 'nav-categories', wishlist: 'nav-wishlist', orders: 'nav-orders', profile: 'nav-profile' };
    const navId = navMap[page];
    if (navId) { const nav = document.getElementById(navId); if (nav) nav.classList.add('active'); }
    window.scrollTo(0, 0);
    switch(page) {
        case 'home': renderHome(); break;
        case 'categories': renderCategories(); break;
        case 'search': renderSearch(params.query || ''); break;
        case 'product': renderProductDetail(params.id); break;
        case 'cart': renderCart(); break;
        case 'wishlist': renderWishlist(); break;
        case 'checkout': renderCheckout(); break;
        case 'orders': renderOrders(); break;
        case 'profile': renderProfile(); break;
        case 'notifications': renderNotifications(); break;
    }
}

// Product Card
function createProductCard(product, isFlash = false) {
    const inWishlist = isInWishlist(product.id);
    return `
        <div class="product-card ${isFlash ? 'flash-card' : ''}" onclick="navigateTo('product', {id: ${product.id}})">
            <div class="product-image-wrap">
                <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
                <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-id="${product.id}" onclick="event.stopPropagation(); toggleWishlist(${product.id})" aria-label="Wishlist">
                    <i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price-row">
                    <span class="current-price">${formatPrice(product.price)}</span>
                    <button class="add-cart-btn" onclick="event.stopPropagation(); addToCart(${product.id}); this.classList.add('added'); setTimeout(()=>this.classList.remove('added'), 400)" aria-label="Add to cart">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        </div>`;
}

function createFlashCard(product) {
    const inWishlist = isInWishlist(product.id);
    const discount = getDiscountPercent(product.oldPrice, product.price);
    return `
        <div class="product-card flash-card" onclick="navigateTo('product', {id: ${product.id}})">
            <div class="product-image-wrap">
                <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
                ${discount > 0 ? `<span class="discount-badge" style="position:absolute;top:10px;left:10px;background:var(--secondary);color:white;font-size:0.6rem;font-weight:700;padding:3px 8px;border-radius:6px;">-${discount}%</span>` : ''}
                <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-id="${product.id}" onclick="event.stopPropagation(); toggleWishlist(${product.id})" aria-label="Wishlist">
                    <i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price-row">
                    <span class="current-price">${formatPrice(product.price)}</span>
                    <button class="add-cart-btn" onclick="event.stopPropagation(); addToCart(${product.id}); this.classList.add('added'); setTimeout(()=>this.classList.remove('added'), 400)" aria-label="Add to cart">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
                ${product.flashStock ? `
                    <div class="stock-bar" style="height:3px;background:var(--border);border-radius:2px;margin-top:6px;overflow:hidden;">
                        <div class="stock-fill" style="height:100%;background:linear-gradient(90deg,var(--secondary),#ff8e8e);border-radius:2px;width:${(product.flashStock/product.stock)*100}%;transition:width 0.5s;"></div>
                    </div>
                    <div style="font-size:0.6rem;color:var(--secondary);margin-top:3px;font-weight:600;">${product.flashStock} left</div>
                ` : ''}
            </div>
        </div>`;
}

function renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) html += '<i class="fas fa-star"></i>';
        else if (i === Math.ceil(rating) && !Number.isInteger(rating)) html += '<i class="fas fa-star-half-alt"></i>';
        else html += '<i class="far fa-star empty"></i>';
    }
    return html;
}

// Home
function renderHome() {
    const catContainer = document.getElementById('homeCategories');
    if (catContainer) {
        catContainer.innerHTML = categories.map(cat => `
            <button class="category-card ${cat.id === 'all' ? 'active' : ''}" onclick="navigateTo('categories')">
                <div class="category-icon"><i class="fas ${cat.icon}"></i></div>
                <span class="category-name">${cat.name}</span>
            </button>
        `).join('');
    }
    const featuredContainer = document.getElementById('homeFeatured');
    if (featuredContainer) featuredContainer.innerHTML = products.slice(0, 4).map(p => createProductCard(p)).join('');

    const flashContainer = document.getElementById('homeFlash');
    if (flashContainer) {
        const flash = getFlashProducts();
        flashContainer.innerHTML = flash.map(p => createFlashCard(p)).join('');
    }

    const recContainer = document.getElementById('homeRecommended');
    if (recContainer) recContainer.innerHTML = products.slice(4, 8).map(p => createProductCard(p)).join('');

    const recentContainer = document.getElementById('homeRecent');
    const recentSection = document.getElementById('recentSection');
    if (recentContainer && recentSection) {
        if (AppState.recentlyViewed.length === 0) { recentSection.classList.add('hidden'); }
        else {
            recentSection.classList.remove('hidden');
            recentContainer.innerHTML = AppState.recentlyViewed.map(id => getProductById(id)).filter(Boolean).map(p => createProductCard(p)).join('');
        }
    }
    updateWishlistButtons();
}

// Categories
function renderCategories() {
    const catContainer = document.getElementById('catCategories');
    if (catContainer) {
        catContainer.innerHTML = categories.map(cat => `
            <button class="category-card" onclick="filterByCategory('${cat.id}')">
                <div class="category-icon"><i class="fas ${cat.icon}"></i></div>
                <span class="category-name">${cat.name}</span>
            </button>
        `).join('');
    }
    filterByCategory('all');
}

function filterByCategory(category) {
    const grid = document.getElementById('catProducts');
    if (!grid) return;
    const filtered = getProductsByCategory(category);
    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i class="fas fa-box-open"></i></div><h3>No products found</h3><p>No products in this category yet.</p></div>`;
    } else {
        grid.innerHTML = filtered.map(p => createProductCard(p)).join('');
    }
    document.querySelectorAll('#catCategories .category-card').forEach(card => {
        const name = card.querySelector('.category-name').textContent;
        card.classList.toggle('active', name === (category === 'all' ? 'All' : category));
    });
    updateWishlistButtons();
}

// Search
function renderSearch(query = '') {
    const input = document.getElementById('searchInput');
    if (input && query) input.value = query;
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;
    const searchQuery = query || (input ? input.value : '');
    if (!searchQuery.trim()) {
        resultsContainer.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-search"></i></div><h3>Search Products</h3><p>Search for products, brands, or categories.</p></div>`;
        return;
    }
    let results = searchProducts(searchQuery);
    if (AppState.searchFilter === 'price-low') results.sort((a, b) => a.price - b.price);
    else if (AppState.searchFilter === 'price-high') results.sort((a, b) => b.price - a.price);
    else if (AppState.searchFilter === 'rating') results.sort((a, b) => b.rating - a.rating);

    if (results.length === 0) {
        resultsContainer.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-search"></i></div><h3>No products found</h3><p>We couldn't find any products matching "${searchQuery}".</p></div>`;
    } else {
        resultsContainer.innerHTML = `<div class="products-grid">${results.map(p => createProductCard(p)).join('')}</div>`;
    }
    updateWishlistButtons();
}

function setSearchFilter(el, filter) {
    AppState.searchFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderSearch();
}

function handleSearch(e) {
    if (e.key === 'Enter') navigateTo('search', { query: e.target.value });
}

// Product Detail
function renderProductDetail(productId) {
    const product = getProductById(productId);
    if (!product) return;
    AppState.selectedProduct = product;
    AppState.selectedColor = product.colors && product.colors.length > 0 ? product.colors[0] : null;
    AppState.selectedSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : null;
    addToRecentlyViewed(product.id);
    const container = document.getElementById('productDetail');
    if (!container) return;
    const discount = getDiscountPercent(product.oldPrice, product.price);
    const inWishlist = isInWishlist(product.id);
    let stockClass = 'in-stock', stockText = `In Stock (${product.stock} available)`;
    if (product.stock <= 5) { stockClass = 'low-stock'; stockText = `Only ${product.stock} left - Order soon!`; }
    if (product.stock === 0) { stockClass = 'out-stock'; stockText = 'Out of Stock'; }

    container.innerHTML = `
        <div class="product-detail-img">
            <img src="${product.image}" alt="${product.name}">
            <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-left"></i></button>
            <button class="detail-wishlist-btn ${inWishlist ? 'active' : ''}" onclick="toggleWishlist(${product.id})"><i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i></button>
        </div>
        <div class="product-detail-info">
            <h1 class="product-detail-name">${product.name}</h1>
            <div class="product-detail-rating">
                <div class="stars">${renderStars(product.rating)}</div>
                <span class="text-muted">${product.rating} (${product.reviews} reviews)</span>
            </div>
            <div class="product-detail-price">
                <span class="current">${formatPrice(product.price)}</span>
                ${product.oldPrice > product.price ? `<span class="old">${formatPrice(product.oldPrice)}</span>` : ''}
                ${discount > 0 ? `<span class="discount">-${discount}%</span>` : ''}
            </div>
            <div class="stock-status ${stockClass}"><i class="fas fa-circle" style="font-size:0.5rem;"></i> ${stockText}</div>
            <div class="delivery-info mt-3"><i class="fas fa-truck"></i><span>Free delivery within Lagos. 2-3 business days.</span></div>
            ${product.colors && product.colors.length > 0 ? `
                <div class="detail-section"><h3>Color</h3><div class="color-options">${product.colors.map((c, i) => `<div class="color-option ${i === 0 ? 'active' : ''}" style="background:${c}" onclick="selectColor('${c}', this)"></div>`).join('')}</div></div>
            ` : ''}
            ${product.sizes && product.sizes.length > 0 ? `
                <div class="detail-section"><h3>Size</h3><div class="size-options">${product.sizes.map((s, i) => `<button class="size-option ${i === 0 ? 'active' : ''}" onclick="selectSize('${s}', this)">${s}</button>`).join('')}</div></div>
            ` : ''}
            <div class="detail-section"><h3>Quantity</h3><div class="qty-selector"><button class="qty-btn" onclick="updateDetailQty(-1)"><i class="fas fa-minus"></i></button><span class="qty-value" id="detailQty">1</span><button class="qty-btn" onclick="updateDetailQty(1)"><i class="fas fa-plus"></i></button></div></div>
            <div class="detail-section"><h3>Description</h3><p>${product.description}</p></div>
            <div class="detail-section"><h3>Customer Reviews</h3><div id="productReviews"></div></div>
            <div class="detail-section"><h3>Related Products</h3><div class="related-scroll" id="relatedProducts"></div></div>
        </div>
        <div class="sticky-action">
            <button class="neu-btn neu-btn-secondary" onclick="addToCart(${product.id}, parseInt(document.getElementById('detailQty').textContent), AppState.selectedColor, AppState.selectedSize)"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
            <button class="neu-btn neu-btn-primary" onclick="buyNow(${product.id})">Buy Now</button>
        </div>`;

    const reviewsContainer = document.getElementById('productReviews');
    if (reviewsContainer) reviewsContainer.innerHTML = generateMockReviews(product);
    const relatedContainer = document.getElementById('relatedProducts');
    if (relatedContainer) {
        const related = getRelatedProducts(product.id);
        relatedContainer.innerHTML = related.length > 0 ? related.map(p => createProductCard(p)).join('') : '<p class="text-muted">No related products.</p>';
    }
    updateWishlistButtons();
}

function generateMockReviews(product) {
    const reviewers = ['Adebayo K.', 'Ngozi O.', 'Emeka T.'];
    const comments = ['Excellent product! Exactly as described. Fast delivery too.', 'Very satisfied with my purchase. Great quality for the price.', 'Amazing! Will definitely buy again. Highly recommended.'];
    return reviewers.map((name, i) => `
        <div class="review-card">
            <div class="review-header">
                <div class="review-avatar">${name.charAt(0)}</div>
                <div class="review-meta"><div class="review-name">${name}</div><div class="review-date">${new Date(Date.now() - i * 86400000 * 3).toLocaleDateString()}</div></div>
                <div class="stars">${renderStars(product.rating - (i * 0.1))}</div>
            </div>
            <p class="review-text">${comments[i]}</p>
        </div>`).join('');
}

function selectColor(color, el) { AppState.selectedColor = color; document.querySelectorAll('.color-option').forEach(c => c.classList.remove('active')); el.classList.add('active'); }
function selectSize(size, el) { AppState.selectedSize = size; document.querySelectorAll('.size-option').forEach(s => s.classList.remove('active')); el.classList.add('active'); }

function updateDetailQty(delta) {
    const el = document.getElementById('detailQty');
    if (!el) return;
    let val = parseInt(el.textContent) + delta;
    if (val < 1) val = 1;
    if (AppState.selectedProduct && val > AppState.selectedProduct.stock) { val = AppState.selectedProduct.stock; showToast('Maximum Stock', `Only ${AppState.selectedProduct.stock} available.`, 'warning'); }
    el.textContent = val;
}

function buyNow(productId) {
    const qty = parseInt(document.getElementById('detailQty')?.textContent || 1);
    addToCart(productId, qty, AppState.selectedColor, AppState.selectedSize);
    navigateTo('checkout');
}

// Cart
function renderCart() {
    const container = document.getElementById('cartItems');
    const summaryContainer = document.getElementById('cartSummary');
    if (!container) return;
    if (AppState.cart.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-shopping-cart"></i></div><h3>Your cart is empty</h3><p>Discover amazing products and start shopping.</p><button class="neu-btn neu-btn-primary" onclick="navigateTo('home')"><i class="fas fa-shopping-bag"></i> Start Shopping</button></div>`;
        if (summaryContainer) summaryContainer.classList.add('hidden');
        return;
    }
    if (summaryContainer) summaryContainer.classList.remove('hidden');
    container.innerHTML = AppState.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-img"><img src="${item.image}" alt="${item.name}"></div>
            <div class="cart-item-details">
                <div>
                    <div class="cart-item-name">${item.name}</div>
                    ${item.color ? `<div class="text-muted" style="font-size:0.7rem;margin-top:2px;">Color: <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color};vertical-align:middle;border:1px solid var(--border);"></span></div>` : ''}
                    ${item.size ? `<div class="text-muted" style="font-size:0.7rem;">Size: ${item.size}</div>` : ''}
                </div>
                <div class="cart-item-actions">
                    <span class="cart-item-price">${formatPrice(item.price * item.qty)}</span>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <div class="qty-selector"><button class="qty-btn" onclick="updateCartQty(${item.id}, '${item.color}', '${item.size}', -1)"><i class="fas fa-minus"></i></button><span class="qty-value">${item.qty}</span><button class="qty-btn" onclick="updateCartQty(${item.id}, '${item.color}', '${item.size}', 1)"><i class="fas fa-plus"></i></button></div>
                        <button class="cart-item-remove" onclick="removeFromCart(${item.id}, '${item.color}', '${item.size}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>`).join('');

    const subtotal = getCartTotal();
    const delivery = subtotal > 50000 ? 0 : 2500;
    const discount = subtotal > 100000 ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal + delivery - discount;
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
            <div class="summary-row"><span>Delivery Fee</span><span>${delivery === 0 ? 'FREE' : formatPrice(delivery)}</span></div>
            ${discount > 0 ? `<div class="summary-row"><span>Discount (5%)</span><span class="text-success">-${formatPrice(discount)}</span></div>` : ''}
            <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
            <button class="neu-btn neu-btn-primary w-full mt-3" onclick="navigateTo('checkout')"><i class="fas fa-credit-card"></i> Proceed to Checkout</button>`;
    }
}

// Wishlist
function renderWishlist() {
    const container = document.getElementById('wishlistItems');
    if (!container) return;
    const countText = document.getElementById('wishlistCountText');
    if (countText) countText.textContent = `${AppState.wishlist.length} item${AppState.wishlist.length !== 1 ? 's' : ''} saved`;
    if (AppState.wishlist.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-heart"></i></div><h3>Your wishlist is empty</h3><p>Save your favorite items and buy them later.</p><button class="neu-btn neu-btn-primary" onclick="navigateTo('home')"><i class="fas fa-shopping-bag"></i> Browse Products</button></div>`;
        return;
    }
    const wishlistProducts = AppState.wishlist.map(id => getProductById(id)).filter(Boolean);
    container.innerHTML = `<div class="products-grid">${wishlistProducts.map(p => createProductCard(p)).join('')}</div>`;
    updateWishlistButtons();
}

// Checkout
function renderCheckout() {
    const container = document.getElementById('checkoutContent');
    if (!container) return;
    if (AppState.cart.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-shopping-cart"></i></div><h3>Your cart is empty</h3><p>Add items to your cart before checkout.</p><button class="neu-btn neu-btn-primary" onclick="navigateTo('home')">Continue Shopping</button></div>`;
        return;
    }
    const subtotal = getCartTotal();
    const delivery = subtotal > 50000 ? 0 : 2500;
    const discount = subtotal > 100000 ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal + delivery - discount;

    container.innerHTML = `
        <div class="checkout-step">
            <h3><span class="step-number">1</span> Delivery Address</h3>
            ${AppState.addresses.map(addr => `
                <div class="address-card ${addr.id === AppState.selectedAddress ? 'active' : ''}" onclick="selectAddress(${addr.id})">
                    <div class="address-type">${addr.type}</div>
                    <div class="address-text">${addr.text}</div>
                </div>
            `).join('')}
        </div>
        <div class="checkout-step">
            <h3><span class="step-number">2</span> Contact Information</h3>
            <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" value="${AppState.user.name}" id="checkoutName"></div>
            <div class="form-group"><label class="form-label">Phone Number</label><input type="tel" class="form-input" value="${AppState.user.phone}" id="checkoutPhone"></div>
            <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" value="${AppState.user.email}" id="checkoutEmail"></div>
        </div>
        <div class="checkout-step">
            <h3><span class="step-number">3</span> Delivery Method</h3>
            <div class="payment-method active"><input type="radio" name="delivery" checked><div class="payment-icon"><i class="fas fa-truck"></i></div><div><div class="fw-semibold">Standard Delivery</div><div class="text-muted" style="font-size:0.75rem;">2-3 business days</div></div><span class="fw-bold" style="margin-left:auto;font-size:0.85rem;">${delivery === 0 ? 'FREE' : formatPrice(delivery)}</span></div>
            <div class="payment-method"><input type="radio" name="delivery"><div class="payment-icon"><i class="fas fa-shipping-fast"></i></div><div><div class="fw-semibold">Express Delivery</div><div class="text-muted" style="font-size:0.75rem;">Same day (Lagos only)</div></div><span class="fw-bold" style="margin-left:auto;font-size:0.85rem;">${formatPrice(5000)}</span></div>
        </div>
        <div class="checkout-step">
            <h3><span class="step-number">4</span> Order Summary</h3>
            ${AppState.cart.map(item => `<div class="summary-row"><span>${item.name} x${item.qty}</span><span>${formatPrice(item.price * item.qty)}</span></div>`).join('')}
            <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
            <div class="summary-row"><span>Delivery</span><span>${delivery === 0 ? 'FREE' : formatPrice(delivery)}</span></div>
            ${discount > 0 ? `<div class="summary-row"><span>Discount</span><span class="text-success">-${formatPrice(discount)}</span></div>` : ''}
            <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
        </div>
        <div class="checkout-step">
            <h3><span class="step-number">5</span> Payment Method</h3>
            <div class="payment-method ${AppState.selectedPayment === 'card' ? 'active' : ''}" onclick="selectPayment('card', this)"><input type="radio" name="payment" ${AppState.selectedPayment === 'card' ? 'checked' : ''}><div class="payment-icon"><i class="fas fa-credit-card"></i></div><div><div class="fw-semibold">Credit/Debit Card</div><div class="text-muted" style="font-size:0.75rem;">Visa, Mastercard, Verve</div></div></div>
            <div class="payment-method ${AppState.selectedPayment === 'transfer' ? 'active' : ''}" onclick="selectPayment('transfer', this)"><input type="radio" name="payment" ${AppState.selectedPayment === 'transfer' ? 'checked' : ''}><div class="payment-icon"><i class="fas fa-university"></i></div><div><div class="fw-semibold">Bank Transfer</div><div class="text-muted" style="font-size:0.75rem;">Pay directly to our account</div></div></div>
            <div class="payment-method ${AppState.selectedPayment === 'cod' ? 'active' : ''}" onclick="selectPayment('cod', this)"><input type="radio" name="payment" ${AppState.selectedPayment === 'cod' ? 'checked' : ''}><div class="payment-icon"><i class="fas fa-money-bill-wave"></i></div><div><div class="fw-semibold">Cash on Delivery</div><div class="text-muted" style="font-size:0.75rem;">Pay when you receive</div></div></div>
        </div>
        <button class="neu-btn neu-btn-primary w-full" onclick="placeOrder()" style="margin-bottom:24px;"><i class="fas fa-lock"></i> Place Order - ${formatPrice(total)}</button>`;
}

function selectAddress(id) {
    AppState.selectedAddress = id;
    document.querySelectorAll('.address-card').forEach(card => {
        const type = card.querySelector('.address-type').textContent;
        card.classList.toggle('active', AppState.addresses.find(a => a.id === id)?.type === type);
    });
}

function selectPayment(method, el) {
    AppState.selectedPayment = method;
    document.querySelectorAll('.payment-method').forEach(pm => pm.classList.remove('active'));
    el.classList.add('active');
    el.querySelector('input').checked = true;
}

function placeOrder() {
    const name = document.getElementById('checkoutName')?.value;
    const phone = document.getElementById('checkoutPhone')?.value;
    const email = document.getElementById('checkoutEmail')?.value;
    if (!name || !phone || !email) { showToast('Missing Info', 'Please fill in all contact details.', 'error'); return; }
    const subtotal = getCartTotal();
    const delivery = subtotal > 50000 ? 0 : 2500;
    const discount = subtotal > 100000 ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal + delivery - discount;
    const order = {
        id: 'ORD-' + Date.now().toString().slice(-8),
        items: [...AppState.cart],
        total: total,
        date: new Date().toISOString(),
        status: 'Processing',
        paymentStatus: 'Paid',
        address: AppState.addresses.find(a => a.id === AppState.selectedAddress),
        paymentMethod: AppState.selectedPayment
    };
    AppState.orders.unshift(order);
    Storage.set('orders', AppState.orders);
    AppState.cart = [];
    Storage.set('cart', AppState.cart);
    updateCartBadge();
    addNotification('Order Placed', `Your order ${order.id} has been placed successfully!`, 'order');
    showToast('Order Placed', `Your order ${order.id} has been placed!`, 'success', 5000);
    navigateTo('orders');
}

// Orders
function renderOrders() {
    const container = document.getElementById('ordersList');
    if (!container) return;
    if (AppState.orders.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-box"></i></div><h3>No orders yet</h3><p>You haven't placed any orders yet. Start shopping!</p><button class="neu-btn neu-btn-primary" onclick="navigateTo('home')"><i class="fas fa-shopping-bag"></i> Start Shopping</button></div>`;
        return;
    }
    container.innerHTML = AppState.orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <div><div class="order-id">${order.id}</div><div class="order-date">${new Date(order.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
                <span class="badge ${order.status === 'Delivered' ? 'badge-success' : order.status === 'Processing' ? 'badge-warning' : 'badge-primary'}">${order.status}</span>
            </div>
            <div class="order-items">${order.items.slice(0, 3).map(item => `<img src="${item.image}" class="order-item-img" alt="${item.name}">`).join('')}${order.items.length > 3 ? `<div class="order-item-img" style="display:flex;align-items:center;justify-content:center;background:var(--border);"><span class="text-muted" style="font-size:0.7rem;font-weight:700;">+${order.items.length - 3}</span></div>` : ''}</div>
            <div class="order-footer">
                <div><div class="text-muted" style="font-size:0.75rem;">${order.items.length} item${order.items.length > 1 ? 's' : ''}</div><div class="order-total">${formatPrice(order.total)}</div></div>
                <div style="display:flex;gap:6px;">
                    <button class="neu-btn neu-btn-secondary" style="padding:8px 14px;font-size:0.75rem;" onclick="viewOrderDetails('${order.id}')"><i class="fas fa-eye"></i> Details</button>
                    ${order.status !== 'Delivered' ? `<button class="neu-btn neu-btn-primary" style="padding:8px 14px;font-size:0.75rem;" onclick="trackOrder('${order.id}')"><i class="fas fa-map-marker-alt"></i> Track</button>` : ''}
                </div>
            </div>
        </div>`).join('');
}

function viewOrderDetails(orderId) {
    const order = AppState.orders.find(o => o.id === orderId);
    if (!order) return;
    const modal = document.getElementById('orderDetailModal');
    const content = document.getElementById('orderDetailContent');
    if (!modal || !content) return;
    content.innerHTML = `
        <div class="modal-header"><h2>Order ${order.id}</h2><button class="modal-close" onclick="closeModal('orderDetailModal')"><i class="fas fa-times"></i></button></div>
        <div style="margin-bottom:14px;"><span class="badge ${order.status === 'Delivered' ? 'badge-success' : order.status === 'Processing' ? 'badge-warning' : 'badge-primary'}">${order.status}</span> <span class="badge ${order.paymentStatus === 'Paid' ? 'badge-success' : 'badge-danger'}">${order.paymentStatus}</span></div>
        <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:10px;">Items</h3>
        ${order.items.map(item => `<div class="cart-item" style="margin-bottom:8px;"><div class="cart-item-img"><img src="${item.image}" alt="${item.name}"></div><div class="cart-item-details"><div class="cart-item-name">${item.name}</div><div class="text-muted" style="font-size:0.75rem;">Qty: ${item.qty}</div><div class="cart-item-price">${formatPrice(item.price * item.qty)}</div></div></div>`).join('')}
        <div class="cart-summary" style="margin-top:14px;"><div class="summary-row total"><span>Total</span><span>${formatPrice(order.total)}</span></div></div>
        <div style="margin-top:14px;"><h3 style="font-size:0.9rem;font-weight:700;margin-bottom:6px;">Delivery Address</h3><p style="font-size:0.82rem;color:var(--text-secondary);">${order.address?.text || 'N/A'}</p></div>
        <div style="margin-top:14px;"><h3 style="font-size:0.9rem;font-weight:700;margin-bottom:6px;">Payment Method</h3><p style="font-size:0.82rem;color:var(--text-secondary);">${order.paymentMethod === 'card' ? 'Credit/Debit Card' : order.paymentMethod === 'transfer' ? 'Bank Transfer' : 'Cash on Delivery'}</p></div>`;
    modal.classList.add('active');
}

function trackOrder(orderId) {
    const modal = document.getElementById('orderDetailModal');
    const content = document.getElementById('orderDetailContent');
    if (!modal || !content) return;
    content.innerHTML = `
        <div class="modal-header"><h2>Track Order ${orderId}</h2><button class="modal-close" onclick="closeModal('orderDetailModal')"><i class="fas fa-times"></i></button></div>
        <div class="track-timeline">
            <div class="track-step completed"><div class="track-dot"></div><h4>Order Placed</h4><p>Your order has been confirmed</p></div>
            <div class="track-step completed"><div class="track-dot"></div><h4>Processing</h4><p>Your order is being prepared</p></div>
            <div class="track-step active"><div class="track-dot"></div><h4>Shipped</h4><p>Your order is on the way</p></div>
            <div class="track-step"><div class="track-dot"></div><h4>Out for Delivery</h4><p>Expected today</p></div>
            <div class="track-step"><div class="track-dot"></div><h4>Delivered</h4><p>Package will be handed to you</p></div>
        </div>`;
    modal.classList.add('active');
}

function closeModal(modalId) { document.getElementById(modalId)?.classList.remove('active'); }

// Profile
function renderProfile() {
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const avatarEl = document.getElementById('profileAvatar');
    if (nameEl) nameEl.textContent = AppState.user.name + ' Okafor';
    if (emailEl) emailEl.textContent = AppState.user.email;
    if (avatarEl) avatarEl.textContent = AppState.user.name.charAt(0);
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.classList.toggle('active', AppState.theme === 'dark');
}

// Notifications
function renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    if (AppState.notifications.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-bell"></i></div><h3>No notifications</h3><p>We'll notify you about orders, deals, and updates.</p></div>`;
        return;
    }
    container.innerHTML = AppState.notifications.map(notif => `
        <div class="notif-item ${notif.read ? '' : 'unread'}" onclick="markNotificationRead(${notif.id})">
            <div class="notif-icon ${notif.type}"><i class="fas ${notif.type === 'cart' ? 'fa-shopping-cart' : notif.type === 'order' ? 'fa-box' : 'fa-tag'}"></i></div>
            <div class="notif-content"><h4>${notif.title}</h4><p>${notif.message}</p></div>
            <div class="notif-time">${new Date(notif.time).toLocaleDateString()}</div>
        </div>`).join('');
}

function markNotificationRead(id) {
    const notif = AppState.notifications.find(n => n.id === id);
    if (notif) { notif.read = true; Storage.set('notifications', AppState.notifications); renderNotifications(); }
}

// Promo Carousel
let promoSlide = 0;
function initPromoCarousel() {
    const slides = document.getElementById('promoSlides');
    if (!slides) return;
    setInterval(() => {
        promoSlide = (promoSlide + 1) % 3;
        slides.style.transform = `translateX(-${promoSlide * 100}%)`;
        document.querySelectorAll('.promo-dot').forEach((d, i) => d.classList.toggle('active', i === promoSlide));
    }, 4000);
}

function goToPromo(index) {
    promoSlide = index;
    const slides = document.getElementById('promoSlides');
    if (slides) slides.style.transform = `translateX(-${promoSlide * 100}%)`;
    document.querySelectorAll('.promo-dot').forEach((d, i) => d.classList.toggle('active', i === promoSlide));
}

// Flash Countdown
function initFlashCountdown() {
    const hours = document.getElementById('flashHours');
    const minutes = document.getElementById('flashMinutes');
    const seconds = document.getElementById('flashSeconds');
    if (!hours || !minutes || !seconds) return;
    let totalSeconds = 4 * 3600 + 32 * 60 + 15;
    setInterval(() => {
        totalSeconds--;
        if (totalSeconds < 0) totalSeconds = 5 * 3600;
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        hours.textContent = String(h).padStart(2, '0');
        minutes.textContent = String(m).padStart(2, '0');
        seconds.textContent = String(s).padStart(2, '0');
    }, 1000);
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        ['cart', 'wishlist', 'orders', 'recentlyViewed', 'notifications'].forEach(k => Storage.remove(k));
        AppState.cart = []; AppState.wishlist = []; AppState.orders = []; AppState.recentlyViewed = []; AppState.notifications = [];
        updateCartBadge();
        showToast('Logged Out', 'You have been logged out.', 'success');
        navigateTo('home');
    }
}

// Init
function initApp() {
    initTheme();
    updateCartBadge();
    initPromoCarousel();
    initFlashCountdown();
    navigateTo('home');
}

document.addEventListener('DOMContentLoaded', initApp);
