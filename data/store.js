(function () {
  "use strict";
  const KEY = "store-products-v1", MIGRATION_FLAG = "store-migrated-v3", REPORT_KEY = "store-migration-v3-report";
  const clone = value => JSON.parse(JSON.stringify(value));
  const isDataImage = value => typeof value === "string" && value.startsWith("data:image/");
  const quotaMessage = () => document.documentElement.lang === "ar" ? "مساحة المتصفح ممتلئة. لم يتم فقد أو تغيير أي منتج." : "Browser storage is full. No product was lost or changed.";

  function read() {
    try {
      const raw = localStorage.getItem(KEY), saved = raw ? JSON.parse(raw) : null;
      return Array.isArray(saved) ? saved : clone(window.STORE_DEFAULT_PRODUCTS || []);
    } catch (error) {
      console.error("Could not read products:", error);
      return clone(window.STORE_DEFAULT_PRODUCTS || []);
    }
  }

  function uniqueIds(products) {
    const used = new Set(), changes = [];
    products.forEach(product => {
      const original = String(product.id || "product");
      let candidate = original, number = 2;
      while (used.has(candidate)) candidate = `${original}-${number++}`;
      if (candidate !== original) { changes.push({from:original,to:candidate,name:product.name?.en || product.name || ""}); product.id = candidate; }
      used.add(candidate);
    });
    return changes;
  }

  async function convertImages(products) {
    if (!window.ImageStore) throw new Error("ImageStore is not loaded.");
    const created = [];
    try {
      for (const product of products) {
        if (isDataImage(product.image)) {
          const key = `${product.id}/cover`;
          product.image = await ImageStore.saveImage(key, product.image);
          created.push(key);
        }
        if (Array.isArray(product.gallery)) {
          for (let index = 0; index < product.gallery.length; index += 1) {
            if (!isDataImage(product.gallery[index])) continue;
            const key = `${product.id}/gallery-${index + 1}`;
            product.gallery[index] = await ImageStore.saveImage(key, product.gallery[index]);
            created.push(key);
          }
        }
      }
      return created;
    } catch (error) {
      await Promise.allSettled(created.map(key => ImageStore.deleteImage(key)));
      throw error;
    }
  }

  function writeLocal(products) {
    const json = JSON.stringify(products);
    try {
      localStorage.setItem(KEY, json);
      try { localStorage.setItem("almumez-catalog", JSON.stringify(products.map(product => ({...product,name:product.name?.en || product.name,brand:product.brand?.en || product.brand,subcategory:product.subcategory?.en || product.subcategory,reviews:product.reviewsCount,discount:product.oldPrice > product.price ? `-${Math.round((1-product.price/product.oldPrice)*100)}%` : ""})))); } catch (error) { console.warn("Legacy catalog cache was not updated:", error); }
      window.dispatchEvent(new CustomEvent("store:products-changed", {detail:products}));
      return {bytes:new Blob([json]).size,count:products.length};
    } catch (error) {
      if (error?.name === "QuotaExceededError") throw new DOMException(quotaMessage(), "QuotaExceededError");
      throw error;
    }
  }

  async function write(products) {
    const next = clone(products), previousRaw = localStorage.getItem(KEY), beforeCount = next.length;
    const changes = uniqueIds(next), created = await convertImages(next);
    if (next.length !== beforeCount) throw new Error("Product count changed unexpectedly.");
    try {
      const result = writeLocal(next);
      if (changes.length) try { localStorage.setItem(REPORT_KEY, JSON.stringify(changes)); } catch (error) { console.warn("Duplicate ID report could not be cached.", error); }
      return {...result,products:next,idChanges:changes};
    } catch (error) {
      await Promise.allSettled(created.map(key => ImageStore.deleteImage(key)));
      if (previousRaw !== null) try { localStorage.setItem(KEY, previousRaw); } catch (_) {}
      throw error;
    }
  }

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"}), link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  async function exportBackup(products = read(), download = false) {
    const full = clone(products);
    for (const product of full) {
      product.image = await ImageStore.exportReference(product.image);
      if (Array.isArray(product.gallery)) product.gallery = await Promise.all(product.gallery.map(ImageStore.exportReference));
    }
    if (download) downloadJSON(full, `almumez-products-backup-${new Date().toISOString().slice(0,10)}.json`);
    return full;
  }

  function lightenRelatedStorage(products) {
    const byId=new Map(products.map(product=>[product.id,product]));
    ["cartItems","almumez-cart","almumez-wishlist"].forEach(key=>{try{const value=JSON.parse(localStorage.getItem(key)||"null");if(!Array.isArray(value))return;let changed=false;value.forEach(item=>{if(isDataImage(item.image)&&byId.get(item.id)?.image){item.image=byId.get(item.id).image;changed=true}});if(changed)localStorage.setItem(key,JSON.stringify(value))}catch(error){console.warn(`Could not lighten ${key}.`,error)}});
    try{const selected=JSON.parse(localStorage.getItem("almumez-selected-product")||"null"),source=selected&&byId.get(selected.id);if(selected&&isDataImage(selected.image)&&source?.image){selected.image=source.image;if(Array.isArray(source.gallery))selected.gallery=source.gallery;localStorage.setItem("almumez-selected-product",JSON.stringify(selected))}}catch(error){console.warn("Could not lighten the selected product cache.",error)}
  }

  async function migrate() {
    if (localStorage.getItem(MIGRATION_FLAG) === "1") return {migrated:false,products:read()};
    const raw = localStorage.getItem(KEY);
    if (!raw) { try { localStorage.setItem(MIGRATION_FLAG,"1"); } catch (_) {} return {migrated:false,products:read()}; }
    let original;
    try { original = JSON.parse(raw); } catch { return {migrated:false,products:read()}; }
    if (!Array.isArray(original)) return {migrated:false,products:read()};
    downloadJSON(original, `almumez-products-before-v3-${new Date().toISOString().slice(0,10)}.json`);
    const originalCount = original.length, result = await write(original);
    if (result.products.length !== originalCount) throw new Error(`Migration stopped: expected ${originalCount} products, received ${result.products.length}.`);
    lightenRelatedStorage(result.products);
    try { localStorage.setItem(MIGRATION_FLAG,"1"); } catch (error) { console.warn("Migration completed, but its flag could not be saved.", error); }
    return {migrated:true,...result};
  }

  const localized = (product, language=document.documentElement.lang === "ar" ? "ar" : "en") => ({...product,name:product.name?.[language] || product.name?.en || product.name,brand:product.brand?.[language] || product.brand?.en || product.brand,subcategory:product.subcategory?.[language] || product.subcategory?.en || product.subcategory,reviews:product.reviewsCount});
  const imageFallback = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="100%" height="100%" fill="#f1f5e9"/><path d="M220 250h160v120H220z" fill="none" stroke="#8bc34a" stroke-width="12"/><circle cx="270" cy="290" r="18" fill="#8bc34a"/><path d="m230 350 55-45 40 35 30-24 35 34" fill="none" stroke="#082547" stroke-width="10"/></svg>`);
  const reset = async () => { const products=clone(window.STORE_DEFAULT_PRODUCTS||[]); await write(products); return products; };
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => false);
  window.StoreProducts = {KEY,MIGRATION_FLAG,REPORT_KEY,read,write,reset,localized,imageFallback,migrate,exportBackup,uniqueIds,quotaMessage};
  window.StoreProducts.ready = migrate().catch(error => { console.error("Safe product migration failed; original data was kept.", error); return {migrated:false,error,products:read()}; });
})();
