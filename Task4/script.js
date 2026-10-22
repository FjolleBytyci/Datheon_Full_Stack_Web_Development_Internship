const API_URL = "https://fakestoreapi.com/products";
const CART_KEY = "forma.cart.v1";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let products = [];
let activeCategory = "all";
let cart = loadCart();
let toastTimer;

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
function categoryLabel(category) {
  if (category === "electronics") return "Electronics";
  if (category === "jewelery") return "Jewelry";
  if (category === "men's clothing" || category === "women's clothing" || category === "clothing") return "Clothing";
  return category ? category.charAt(0).toUpperCase() + category.slice(1) : "Everyday";
}
function normalizedCategory(category) {
  if (category === "electronics") return "electronics";
  if (category === "jewelery") return "jewelery";
  return "clothing";
}
function badgeFor(product, index) {
  if (product.rating?.rate >= 4.5) return "Loved by many";
  if (index % 7 === 0) return "A good find";
  if (product.price < 25) return "Everyday favorite";
  return "";
}
function renderProducts() {
  const search = $("#search-input").value.trim().toLowerCase();
  let shown = products.filter(p => {
    const category = normalizedCategory(p.category);
    const matchesCategory = activeCategory === "all" || category === activeCategory;
    const matchesSearch = !search || `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });
  const sort = $("#sort-select").value;
  if (sort === "low") shown.sort((a,b) => a.price - b.price);
  else if (sort === "high") shown.sort((a,b) => b.price - a.price);
  else if (sort === "rating") shown.sort((a,b) => (b.rating?.rate || 0) - (a.rating?.rate || 0));
  else shown.sort((a,b) => a.id - b.id);
  $("#product-count").textContent = `${shown.length} thoughtfully chosen pieces`;
  $("#count-all").textContent = products.length;
  $("#count-electronics").textContent = products.filter(p => normalizedCategory(p.category) === "electronics").length;
  $("#count-jewelery").textContent = products.filter(p => normalizedCategory(p.category) === "jewelery").length;
  $("#count-clothing").textContent = products.filter(p => normalizedCategory(p.category) === "clothing").length;
  $$(".category-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.category === activeCategory));
  $$(".nav-link").forEach(btn => btn.classList.toggle("active", btn.dataset.category === activeCategory));
  if (!shown.length) {
    $("#product-grid").innerHTML = `<div class="loading-state"><p>No pieces match that search. Try another phrase or category.</p></div>`;
    return;
  }
  $("#product-grid").innerHTML = shown.map((p, i) => {
    const rating = p.rating?.rate ?? 0;
    const badge = badgeFor(p, i);
    return `<article class="product-card">
      <div class="product-image-wrap">
        ${badge ? `<span class="product-badge">${escapeHTML(badge)}</span>` : ""}
        <img class="product-image" src="${escapeHTML(p.image)}" alt="${escapeHTML(p.title)}" loading="lazy" onerror="this.style.display='none';this.parentElement.style.background='#e5e4db'">
        <button class="quick-add" data-add="${p.id}">Add to bag <span>＋</span></button>
      </div>
      <div class="product-info">
        <div class="product-category">${escapeHTML(categoryLabel(normalizedCategory(p.category)))}</div>
        <div class="product-name-row"><h3 class="product-name">${escapeHTML(p.title)}</h3><span class="product-price">${money(p.price)}</span></div>
        <div class="product-rating"><span class="stars">${"★".repeat(Math.max(0, Math.min(5, Math.round(rating))))}${"☆".repeat(5-Math.max(0, Math.min(5, Math.round(rating))))}</span><span>${rating.toFixed(1)}</span><span class="rating-count">(${p.rating?.count ?? 0})</span></div>
      </div>
    </article>`;
  }).join("");
}
async function fetchProducts() {
  $("#error-state").hidden = true;
  $("#product-grid").innerHTML = `<div class="loading-state"><span class="loader"></span><p>Finding your next favorite thing…</p></div>`;
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("API request failed");
    products = await response.json();
    renderProducts();
  } catch (error) {
    $("#product-grid").innerHTML = "";
    $("#error-state").hidden = false;
    $("#product-count").textContent = "Collection unavailable";
  }
}
function addToCart(productId) {
  const product = products.find(p => p.id === Number(productId));
  if (!product) return;
  const item = cart.find(row => row.id === product.id);
  if (item) item.quantity += 1;
  else cart.push({ id: product.id, title: product.title, price: product.price, image: product.image, category: product.category, quantity: 1 });
  saveCart(); renderCart(); showToast("Added to your bag");
}
function updateQuantity(productId, amount) {
  const item = cart.find(row => row.id === Number(productId));
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter(row => row.id !== item.id);
  saveCart(); renderCart();
}
function removeFromCart(productId) {
  cart = cart.filter(row => row.id !== Number(productId));
  saveCart(); renderCart(); showToast("Removed from your bag");
}
function cartMath() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 75 ? 0 : 6.95;
  const tax = subtotal * 0.08;
  return { subtotal, shipping, tax, total: subtotal + shipping + tax, count: cart.reduce((sum, item) => sum + item.quantity, 0) };
}
function renderCart() {
  const math = cartMath();
  $("#cart-count").textContent = math.count;
  $("#drawer-item-count").textContent = `(${math.count})`;
  $("#cart-items").innerHTML = cart.map(item => `<article class="cart-row">
    <img class="cart-thumb" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}">
    <div><div class="cart-product-category">${escapeHTML(categoryLabel(normalizedCategory(item.category)))}</div><h3 class="cart-product-name">${escapeHTML(item.title)}</h3><div class="cart-unit-price">${money(item.price)} each</div>
      <div class="quantity-control"><button data-quantity="${item.id}" data-delta="-1" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button data-quantity="${item.id}" data-delta="1" aria-label="Increase quantity">＋</button></div>
    </div>
    <div class="cart-row-end"><strong class="cart-line-price">${money(item.price * item.quantity)}</strong><button class="remove-item" data-remove="${item.id}">Remove</button></div>
  </article>`).join("");
  const empty = cart.length === 0;
  $("#cart-empty").classList.toggle("visible", empty);
  $("#cart-items").style.display = empty ? "none" : "block";
  $("#cart-summary").classList.toggle("hidden", empty);
  $("#cart-subtotal").textContent = money(math.subtotal);
  $("#cart-shipping").textContent = math.shipping ? money(math.shipping) : "Free";
  $("#cart-tax").textContent = money(math.tax);
  $("#cart-total").textContent = money(math.total);
  $("#checkout-total").textContent = money(math.total);
  $("#shipping-note").textContent = math.subtotal >= 75 ? "Lovely — your order qualifies for free shipping." : `You’re ${money(75 - math.subtotal)} away from free shipping.`;
}
function openCart() {
  $("#cart-drawer").classList.add("open");
  $("#drawer-overlay").classList.add("open");
  $("#cart-drawer").setAttribute("aria-hidden", "false");
}
function closeCart() {
  $("#cart-drawer").classList.remove("open");
  $("#drawer-overlay").classList.remove("open");
  $("#cart-drawer").setAttribute("aria-hidden", "true");
}
function showToast(message) {
  $("#toast-message").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2200);
}
function selectCategory(category) {
  activeCategory = category;
  renderProducts();
}
$$("[data-category]").forEach(button => button.addEventListener("click", () => selectCategory(button.dataset.category)));
$$(".nav-link").forEach(button => button.addEventListener("click", () => $("#shop").scrollIntoView({ behavior: "smooth" })));
$("#product-grid").addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
});
$("#cart-items").addEventListener("click", event => {
  const quantityButton = event.target.closest("[data-quantity]");
  const removeButton = event.target.closest("[data-remove]");
  if (quantityButton) updateQuantity(quantityButton.dataset.quantity, Number(quantityButton.dataset.delta));
  if (removeButton) removeFromCart(removeButton.dataset.remove);
});
$("#open-cart").addEventListener("click", openCart);
$("#close-cart").addEventListener("click", closeCart);
$("#drawer-overlay").addEventListener("click", closeCart);
$("#continue-shopping").addEventListener("click", () => { closeCart(); $("#shop").scrollIntoView({ behavior: "smooth" }); });
$("#search-input").addEventListener("input", renderProducts);
$("#sort-select").addEventListener("change", renderProducts);
$("#retry-load").addEventListener("click", fetchProducts);
$("#shop-now").addEventListener("click", () => $("#shop").scrollIntoView({ behavior: "smooth" }));
$("#search-toggle").addEventListener("click", () => {
  $("#search-field").classList.add("search-highlight");
  $("#search-input").focus();
  $("#shop").scrollIntoView({ behavior: "smooth" });
});
$("#checkout-button").addEventListener("click", () => {
  if (!cart.length) return;
  $("#checkout-overlay").classList.add("open");
  $("#customer-name").focus();
});
$("#close-checkout").addEventListener("click", () => $("#checkout-overlay").classList.remove("open"));
$("#checkout-overlay").addEventListener("click", event => { if (event.target.id === "checkout-overlay") $("#checkout-overlay").classList.remove("open"); });
$("#checkout-form").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("#customer-name").value.trim();
  const orderId = `FM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const math = cartMath();
  $("#confirmation-message").textContent = `Thanks, ${name.split(/\s+/)[0]}! Your demo order for ${money(math.total)} has been placed. No payment was processed.`;
  $("#order-number").textContent = `ORDER REFERENCE  /  ${orderId}`;
  $("#checkout-overlay").classList.remove("open");
  $("#confirmation-overlay").classList.add("open");
  cart = [];
  saveCart(); renderCart();
});
$("#finish-order").addEventListener("click", () => {
  $("#confirmation-overlay").classList.remove("open");
  closeCart();
  $("#checkout-form").reset();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeCart();
    $("#checkout-overlay").classList.remove("open");
    $("#confirmation-overlay").classList.remove("open");
  }
});
renderCart();
fetchProducts();
