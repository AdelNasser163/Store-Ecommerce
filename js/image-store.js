(function () {
  "use strict";
  const DB_NAME = "store-images";
  const STORE_NAME = "images";
  const PREFIX = "idb:";
  const urlCache = new Map();

  function openDB() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not open the image database."));
        request.onblocked = () => reject(new Error("Image database is blocked by another tab."));
      } catch (error) { reject(error); }
    });
  }

  async function transaction(mode, action) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      let result;
      try {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        result = action(store, tx);
        tx.oncomplete = () => { db.close(); resolve(result); };
        tx.onerror = () => { db.close(); reject(tx.error || new Error("Image storage operation failed.")); };
        tx.onabort = () => { db.close(); reject(tx.error || new Error("Image storage operation was aborted.")); };
      } catch (error) { db.close(); reject(error); }
    });
  }

  const requestResult = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Image storage request failed."));
  });

  async function toBlob(source) {
    if (source instanceof Blob) return source;
    if (typeof source === "string" && source.startsWith("data:image/")) {
      const response = await fetch(source);
      if (!response.ok) throw new Error("Could not decode the image data.");
      return response.blob();
    }
    throw new TypeError("saveImage accepts an image Blob or data URL.");
  }

  async function sameBytes(left, right) {
    if (!(left instanceof Blob) || !(right instanceof Blob) || left.size !== right.size || left.type !== right.type) return false;
    const [a, b] = await Promise.all([left.arrayBuffer(), right.arrayBuffer()]);
    const av = new Uint8Array(a), bv = new Uint8Array(b);
    if (av.length !== bv.length) return false;
    for (let i = 0; i < av.length; i += 1) if (av[i] !== bv[i]) return false;
    return true;
  }

  async function saveImage(key, source) {
    const cleanKey = String(key || "").replace(/^idb:/, "");
    if (!cleanKey) throw new Error("An image key is required.");
    const blob = await toBlob(source);
    try {
      await transaction("readwrite", store => store.put(blob, cleanKey));
      const stored = await getBlob(cleanKey);
      if (!await sameBytes(blob, stored)) {
        await deleteImage(cleanKey);
        throw new Error(`Image verification failed for ${cleanKey}.`);
      }
      return PREFIX + cleanKey;
    } catch (error) {
      if (error?.name === "QuotaExceededError") throw new DOMException("لا توجد مساحة كافية لحفظ الصورة / Not enough browser storage for this image.", "QuotaExceededError");
      throw error;
    }
  }

  async function getBlob(reference) {
    const key = String(reference || "").replace(/^idb:/, "");
    if (!key) return null;
    const db = await openDB();
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const result = await requestResult(tx.objectStore(STORE_NAME).get(key));
      return result instanceof Blob ? result : null;
    } finally { db.close(); }
  }

  async function getImageURL(reference) {
    if (typeof reference !== "string" || !reference.startsWith(PREFIX)) return reference;
    if (urlCache.has(reference)) return urlCache.get(reference);
    try {
      const blob = await getBlob(reference);
      if (!blob) return "";
      const url = URL.createObjectURL(blob);
      urlCache.set(reference, url);
      return url;
    } catch { return ""; }
  }

  async function deleteImage(reference) {
    const key = String(reference || "").replace(/^idb:/, "");
    if (!key) return;
    const cached = urlCache.get(PREFIX + key);
    if (cached) { URL.revokeObjectURL(cached); urlCache.delete(PREFIX + key); }
    await transaction("readwrite", store => store.delete(key));
  }

  async function deleteProductImages(productId) {
    const db = await openDB();
    const keys = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly"), request = tx.objectStore(STORE_NAME).getAllKeys();
      request.onsuccess = () => resolve(request.result.filter(key => String(key).startsWith(`${productId}/`)));
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
    await Promise.all(keys.map(deleteImage));
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
  }

  async function exportReference(reference) {
    if (typeof reference !== "string" || !reference.startsWith(PREFIX)) return reference;
    const blob = await getBlob(reference);
    return blob ? blobToDataURL(blob) : reference;
  }

  async function resolveImageElement(img, fallback) {
    const currentSource = img.getAttribute("src") || "";
    let reference = "";
    if (img.dataset.imageRef?.startsWith(PREFIX)) {
      reference = img.dataset.imageRef;
    } else if (currentSource.startsWith(PREFIX)) {
      reference = currentSource;
      img.dataset.imageRef = reference;
    } else {
      delete img.dataset.imageRef;
      return;
    }
    const url = await getImageURL(reference);
    if (!img.isConnected) return;
    if (img.dataset.imageRef !== reference) return;
    const next = url || fallback || window.StoreProducts?.imageFallback || "assets/images/logo.png";
    if (img.getAttribute("src") !== next) img.src = next;
  }

  function hydrate(root = document) {
    const fallback = window.StoreProducts?.imageFallback;
    if (root instanceof HTMLImageElement) resolveImageElement(root, fallback);
    root.querySelectorAll?.('img[src^="idb:"],img[data-image-ref^="idb:"]').forEach(img => resolveImageElement(img, fallback));
  }

  document.addEventListener("error", event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    const source = img.getAttribute("src") || "";
    if (!source.startsWith(PREFIX)) return;
    img.onerror = null;
    img.dataset.imageRef = source;
    resolveImageElement(img, window.StoreProducts?.imageFallback);
  }, true);

  const observer = new MutationObserver(records => records.forEach(record => {
    if (record.type === "attributes") hydrate(record.target);
    record.addedNodes.forEach(node => { if (node.nodeType === 1) hydrate(node); });
  }));
  const start = () => { hydrate(); observer.observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:["src"]}); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true}); else start();
  window.addEventListener("pagehide", () => { urlCache.forEach(url => URL.revokeObjectURL(url)); urlCache.clear(); });
  window.ImageStore = { DB_NAME, STORE_NAME, PREFIX, saveImage, getBlob, getImageURL, deleteImage, deleteProductImages, exportReference, hydrate, sameBytes };
})();
