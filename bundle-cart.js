(function () {
  "use strict";
  const CART_KEY = "cartItems";
  const readCart = () => { try { const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } };
  const language = () => document.documentElement.lang === "ar" ? "ar" : "en";
  const localized = (value) => typeof value === "object" ? value[language()] || value.en || value.ar || "" : value || "";
  const variantFor = (product) => { const requested = new URLSearchParams(location.search).get("storage") || new URLSearchParams(location.search).get("variant"); return product.variants?.find((variant) => String(variant.id) === String(requested)) || product.variants?.find((variant) => variant.default) || product.variants?.[0] || null; };
  const cartEntry = (product, usePageVariant = false) => { const variant = usePageVariant ? variantFor(product) : product.variants?.find((item) => item.default) || product.variants?.[0] || null, state = StoreProducts.getEffectivePrice(product, variant); return { id:product.id, storage:variant?.id || null, name:localized(product.name), price:Number(state.price), image:product.image || StoreProducts.imageFallback, quantity:1 }; };
  const merge = (cart, item) => { const key = item.key || `${item.id}::${item.storage || "default"}`, existing = cart.find((entry) => (entry.key || `${entry.id}::${entry.storage || "default"}`) === key); if (existing) existing.quantity = Number(existing.quantity || 0) + 1; else cart.push({ ...item, key }); };
  function addBundle() {
    const catalog = StoreProducts.read(), productId = document.body.dataset.productId || new URLSearchParams(location.search).get("id"), primary = catalog.find((product) => product.id === productId);
    if (!primary) throw new Error("The primary bundle product was not found.");
    const configured = window.StoreBundles?.forProduct(productId), cart = readCart();
    if (configured) {
      const products = configured.productIds.map((id) => catalog.find((product) => product.id === id)).filter(Boolean);
      if (products.length !== 3) throw new Error("One or more bundle products are missing.");
      const components = products.map((product) => cartEntry(product, product.id === primary.id));
      const productsTotal = components.reduce((sum, item) => sum + Number(item.price || 0), 0), discount = Math.min(Math.max(0, Number(configured.discount || 0)), productsTotal);
      merge(cart, { key:`bundle::${configured.id}`, id:configured.id, bundleId:configured.id, isBundle:true, name:`${language() === "ar" ? "باقة عرض" : "Offer bundle"} — ${localized(configured.title)}`, price:productsTotal - discount, originalPrice:productsTotal, bundleDiscount:discount, image:primary.image || StoreProducts.imageFallback, quantity:1, components });
    } else {
      const relatedIds = primary.relatedIds?.length ? primary.relatedIds.slice(0, 2) : ["apple-20w-usb-c-adapter", "apple-magsafe-clear-case"];
      const fallback = { "apple-20w-usb-c-adapter":{id:"apple-20w-usb-c-adapter",name:"Apple 20W USB-C Power Adapter",price:899,image:"assets/images/adapter-20w.jpg"}, "apple-magsafe-clear-case":{id:"apple-magsafe-clear-case",name:"Apple MagSafe Clear Case",price:1450,image:"assets/images/magsafe-case.jpg"} };
      [cartEntry(primary, true), ...relatedIds.map((id) => catalog.find((product) => product.id === id) || fallback[id]).filter(Boolean).map((product) => product.variants ? cartEntry(product) : { ...product, quantity:1, storage:null })].forEach((item) => merge(cart, item));
    }
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("store:cart-changed", { detail:{ cart, openCart:true, message:language() === "ar" ? "تمت إضافة الباقة إلى السلة" : "Bundle added to cart" } }));
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("#addBundleToCartButton,[data-add-bundle-to-cart]");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try { addBundle(); }
    catch (error) { console.error("Bundle cart error:", error); window.dispatchEvent(new CustomEvent("store:bundle-error", { detail:{ message:language() === "ar" ? "تعذر إضافة الباقة إلى السلة" : "The bundle could not be added to the cart" } })); }
  }, true);
})();
