(function () {
  "use strict";
  const CART_KEY = "cartItems", FALLBACK_RELATED = ["apple-20w-usb-c-adapter", "apple-magsafe-clear-case"];
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const money = value => `${new Intl.NumberFormat("en-EG").format(Number(value) || 0)} EGP`;
  const section = [...document.querySelectorAll("main section")].find(node => node.textContent.includes("Frequently Bought Together"));
  const ProductStore = window.StoreProducts || {
    read: () => read("store-products-v1", read("almumez-catalog", window.STORE_DEFAULT_PRODUCTS || [])),
    localized: (product, language) => ({...product, name: typeof product.name === "object" ? product.name[language] || product.name.en : product.name}),
    imageFallback: "assets/images/logo.png",
  };
  const getButton = () => section ? [...section.querySelectorAll("button")].find(button => button.dataset.addBundleToCart === "true" || /Add All \d+ to Cart/i.test(button.textContent)) : document.querySelector("#addBundleToCartButton");
  const getActiveProduct = () => {
    const products = ProductStore.read(), requested = new URLSearchParams(location.search).get("id"), selected = read("almumez-selected-product", null);
    return products.find(product => product.id === requested) || products.find(product => product.id === selected?.id) || products.find(product => product.id === "apple-iphone-15-pro-max-256gb") || products[0];
  };
  const configuredMain = product => {
    const selected = new URLSearchParams(location.search).get("variant") || new URLSearchParams(location.search).get("storage"), variant = product.variants?.find(item => String(item.id) === String(selected)) || product.variants?.find(item=>item.default) || product.variants?.[0], effective=ProductStore.getEffectivePrice?.(product,variant)||{price:product.price,originalPrice:product.oldPrice||0};
    return {...product, storage: variant?.id || null, price: Number(effective.price), oldPrice: Number(effective.originalPrice||0)};
  };
  const selectedRelatedIds = product => {
    const toggles = section ? [...section.querySelectorAll("[data-bundle-toggle]")] : [];
    if (toggles.length) return toggles.filter(button => button.getAttribute("aria-pressed") === "true").map(button => button.dataset.bundleToggle);
    return product.relatedIds?.length ? product.relatedIds : FALLBACK_RELATED;
  };
  const updateVisibleCart = cart => {
    const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0), total = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 0), 0);
    if (!document.querySelector("[data-cart-items]")) document.body.insertAdjacentHTML("beforeend", `<div class="store-drawer-backdrop" data-close-drawer="cart"></div><aside class="store-drawer" id="cart-drawer" aria-hidden="true"><header><h2>Your Cart</h2><button type="button" data-close-drawer="cart" aria-label="Close">×</button></header><div class="store-drawer-content" data-cart-items></div><footer><div><span>Total</span><strong data-cart-drawer-total>0 EGP</strong></div><a href="checkout.html" class="store-checkout">Checkout</a></footer></aside><div class="store-toast" role="status" aria-live="polite"></div>`);
    document.querySelectorAll(".home-cart-meta").forEach(node => node.textContent = `Cart: ${count} items`);
    document.querySelectorAll(".home-cart-total,[data-cart-drawer-total]").forEach(node => node.textContent = money(total));
    const drawerItems = document.querySelector("[data-cart-items]");
    if (drawerItems) drawerItems.innerHTML = cart.map(item => `<article class="drawer-item"><img src="${item.image}" alt=""><div><h3>${item.name}</h3><strong>${money(item.price)}</strong><div class="quantity"><span>${item.quantity}</span></div></div></article>`).join("");
    document.querySelector("#cart-drawer")?.classList.add("open");
    document.querySelector('[data-close-drawer="cart"].store-drawer-backdrop')?.classList.add("open");
    document.querySelector("#cart-drawer")?.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
    const toast = document.querySelector(".store-toast");
    if (toast) { toast.textContent = document.documentElement.lang === "ar" ? "تمت إضافة الباقة إلى السلة" : "Bundle added to cart"; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1800); }
  };
  document.addEventListener("click", event => { if (!event.target.closest('[data-close-drawer="cart"]')) return; document.querySelector("#cart-drawer")?.classList.remove("open"); document.querySelector('[data-close-drawer="cart"].store-drawer-backdrop')?.classList.remove("open"); document.body.classList.remove("drawer-open"); });
  const addBundleToCart = event => {
    if (event?.__almumezBundleHandled) return;
    if (event) { event.__almumezBundleHandled = true; event.preventDefault(); event.stopImmediatePropagation(); }
    const catalog = ProductStore.read(), main = configuredMain(getActiveProduct()), related = selectedRelatedIds(main).map(id => catalog.find(product => product.id === id)).filter(Boolean).map(product=>({...product,price:ProductStore.getEffectivePrice?.(product)?.price??product.price}));
    const cart = read(CART_KEY, []), items = [main, ...related];
    items.forEach(item => {
      const storage = item.storage || null, key = `${item.id}::${storage || "default"}`, existing = cart.find(entry => (entry.key || `${entry.id}::${entry.storage || "default"}`) === key), localized = ProductStore.localized(item, document.documentElement.lang === "ar" ? "ar" : "en");
      if (existing) existing.quantity = Number(existing.quantity || 0) + 1;
      else cart.push({key, id:item.id, storage, name:localized.name, price:Number(item.price), image:item.image || ProductStore.imageFallback, quantity:1});
    });
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
    catch (error) { alert(error?.name === "QuotaExceededError" ? (document.documentElement.lang === "ar" ? "مساحة المتصفح ممتلئة. لم تتم إضافة الباقة." : "Browser storage is full. The bundle was not added.") : "The cart could not be saved."); return; }
    updateVisibleCart(cart);
  };
  window.addProductBundleToCart = addBundleToCart;
  document.addEventListener("click", event => {
    const button = event.target.closest("#addBundleToCartButton,[data-add-bundle-to-cart]");
    if (button) addBundleToCart(event);
  }, true);
})();
