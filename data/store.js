(function () {
  "use strict";
  const KEY = "store-products-v1", MIGRATION_FLAG = "store-migrated-v3", SCHEMA_FLAG = "store-schema-v6-variant-additions", REPORT_KEY = "store-migration-v3-report", VARIANT_REPORT_KEY = "store-variant-migration-v6-report";
  const clone = value => JSON.parse(JSON.stringify(value));
  const isDataImage = value => typeof value === "string" && value.startsWith("data:image/");
  const legacySellingBase = product => {const base=Number(product?.price)||0,offer=product?.offer;if(!offer?.enabled)return base;if(offer.type==="prices"&&Number.isFinite(Number(offer.newPrice)))return Number(offer.newPrice);if(offer.type==="percent")return Math.round(base*(1-Number(offer.value||0)/100));if(offer.type==="fixed")return Math.max(0,base-Number(offer.value||0));return base};
  const quotaMessage = () => document.documentElement.lang === "ar" ? "مساحة المتصفح ممتلئة. لم يتم فقد أو تغيير أي منتج." : "Browser storage is full. No product was lost or changed.";

  function normalizeProduct(product) {
    const next = clone(product || {}), sourceBasePrice=Number(next.price)||0, sourceVariantBase=legacySellingBase(next), legacyOffer = Number(next.oldPrice) > Number(next.price), migrateLegacyOffer=legacyOffer&&!next.offer,legacySalePrice=Number(next.price);
    next.sku ||= String(next.id || "product").toUpperCase().replace(/[^A-Z0-9]+/g,"-");
    next.description ||= {en:"",ar:""};
    if (typeof next.description === "string") next.description = {en:next.description,ar:next.description};
    next.offer ||= legacyOffer ? {enabled:true,type:"prices",value:0,oldPrice:Number(next.oldPrice),newPrice:legacySalePrice,startsAt:"",endsAt:"",total:Math.max(Number(next.stock)||0,1),sold:0,manualClaimed:null} : {enabled:false,type:"percent",value:0,oldPrice:0,newPrice:0,startsAt:"",endsAt:"",total:Math.max(Number(next.stock)||0,1),sold:0,manualClaimed:null};
    if(migrateLegacyOffer)next.price=Number(next.oldPrice);
    next.offer = {enabled:false,type:"percent",value:0,oldPrice:0,newPrice:0,startsAt:"",endsAt:"",total:Math.max(Number(next.stock)||0,1),sold:0,manualClaimed:null,...next.offer};
    next.variantType ||= "storage";
    next.variantTitle ||= {en:"Storage Capacity",ar:"سعة التخزين"};
    const sourceVariants=Array.isArray(next.variants)&&next.variants.length?next.variants:Array.isArray(next.storageOptions)?next.storageOptions:[];
    next.variants = sourceVariants.map((variant,index)=>{const legacyDifference=variant.priceDelta??variant.priceDifference??variant.additionalPrice??variant.modifier,hasDifference=legacyDifference!==null&&legacyDifference!==""&&Number.isFinite(Number(legacyDifference)),hasFullPrice=variant.price!==null&&variant.price!==""&&Number.isFinite(Number(variant.price)),priceDelta=hasDifference?Number(legacyDifference):hasFullPrice?Number(variant.price)-sourceVariantBase:null;return{id:String(variant.id??variant.value??`variant-${index+1}`),label:{en:variant.label?.en||variant.label||variant.name?.en||variant.name||String(variant.value||variant.id||""),ar:variant.label?.ar||variant.name?.ar||variant.label?.en||variant.label||variant.name?.en||variant.name||String(variant.value||variant.id||"")},priceDelta,stock:Number(variant.stock??next.stock??0),sku:variant.sku||`${next.sku}-${index+1}`,default:Boolean(variant.default??variant.isDefault??(index===0)),order:Number(variant.order??index)}}).sort((a,b)=>a.order-b.order);
    delete next.storageOptions;
    if (next.variants.length && !next.variants.some(item=>item.default)) next.variants[0].default = true;
    const legacySpecs = next.specs || next.specifications || [];
    next.specs = Array.isArray(legacySpecs) ? legacySpecs.map(spec=>({group:{en:spec.group?.en||"General",ar:spec.group?.ar||"عام"},label:{en:spec.label?.en||"",ar:spec.label?.ar||spec.label?.en||""},value:{en:spec.value?.en||"",ar:spec.value?.ar||spec.value?.en||""}})) : [];
    next.specifications = next.specs;
    next.warranty ||= {en:"Official regional warranty",ar:"ضمان إقليمي رسمي"};
    next.delivery ||= {en:"24h express delivery in Cairo & Giza",ar:"توصيل سريع خلال 24 ساعة في القاهرة والجيزة"};
    next.returnPeriod ||= {en:"14-day returns",ar:"إرجاع خلال 14 يومًا"};
    return next;
  }

  function getOfferState(product, now = Date.now()) {
    const item=normalizeProduct(product),offer=item.offer,start=offer.startsAt?new Date(offer.startsAt).getTime():0,end=offer.endsAt?new Date(offer.endsAt).getTime():0;
    const active=Boolean(offer.enabled)&&(!start||now>=start)&&(!end||now<end);
    const original=Number(offer.type==="prices"&&offer.oldPrice?offer.oldPrice:item.price)||0;
    let price=original;
    if(active){if(offer.type==="percent")price=original*(1-Number(offer.value||0)/100);else if(offer.type==="fixed")price=original-Number(offer.value||0);else price=Number(offer.newPrice||item.price)}
    price=Math.max(0,Math.round(price));const saving=Math.max(0,original-price),discountPercent=original?Math.round(saving/original*100):0,total=Math.max(0,Number(offer.total||0)),sold=Math.max(0,Number(offer.sold||0));
    const claimed=offer.manualClaimed!==null&&offer.manualClaimed!==""?Math.max(0,Math.min(100,Number(offer.manualClaimed))):total?Math.max(0,Math.min(100,Math.round(sold/total*100))):0;
    return {active,pending:Boolean(offer.enabled&&start&&now<start),expired:Boolean(offer.enabled&&end&&now>=end),price,originalPrice:active?original:0,saving,discountPercent,claimed,left:Math.max(0,total-sold),endsAt:end||null,remaining:end&&active?Math.max(0,end-now):0};
  }
  function getVariant(product, variant=null){const item=normalizeProduct(product);if(!item.variants.length)return null;if(variant&&typeof variant==="object")return item.variants.find(entry=>String(entry.id)===String(variant.id))||null;if(variant!==null&&variant!==undefined)return item.variants.find(entry=>String(entry.id)===String(variant))||null;return item.variants.find(entry=>entry.default)||item.variants[0]}
  function getVariantPrice(product, variant=null, now=Date.now()){const item=normalizeProduct(product),state=getOfferState(item,now),selected=getVariant(item,variant),addition=selected&&Number.isFinite(Number(selected.priceDelta))?Number(selected.priceDelta):0;return Number(state.price)+addition}
  function getEffectivePrice(product, variant=null, now=Date.now()){const item=normalizeProduct(product),state=getOfferState(item,now),selected=getVariant(item,variant);if(!selected)return {...state,variant:null};const addition=Number.isFinite(Number(selected.priceDelta))?Number(selected.priceDelta):0,price=Number(state.price)+addition,originalPrice=state.active?Number(state.originalPrice)+addition:0,saving=Math.max(0,originalPrice-price),discountPercent=originalPrice?Math.round(saving/originalPrice*100):0;return {...state,price,originalPrice,saving,discountPercent,variant:selected};}

  async function migrateVariantSchema(){
    if(localStorage.getItem(SCHEMA_FLAG)==="1")return JSON.parse(localStorage.getItem(VARIANT_REPORT_KEY)||'{"converted":[],"review":[]}');
    const raw=localStorage.getItem(KEY),source=raw?JSON.parse(raw):clone(window.STORE_DEFAULT_PRODUCTS||[]),converted=[],review=[];
    source.forEach(product=>{const variants=Array.isArray(product.variants)&&product.variants.length?product.variants:Array.isArray(product.storageOptions)?product.storageOptions:[];if(!variants.length)return;const base=legacySellingBase(product);variants.forEach((variant,index)=>{const existing=variant.priceDelta??variant.priceDifference??variant.additionalPrice??variant.modifier;if(existing!==null&&existing!==""&&Number.isFinite(Number(existing)))return;if(variant.price!==null&&variant.price!==""&&Number.isFinite(Number(variant.price)))converted.push({productId:product.id,variantId:String(variant.id??variant.value??index+1),from:Number(variant.price),to:Number(variant.price)-base});else review.push({productId:product.id,reason:"missing capacity price addition"})})});
    const result=await write(source),report={converted,review:[...new Map(review.map(item=>[`${item.productId}:${item.reason}`,item])).values()]};
    try{localStorage.setItem(VARIANT_REPORT_KEY,JSON.stringify(report));localStorage.setItem(SCHEMA_FLAG,"1")}catch(error){console.warn("Variant migration report could not be saved.",error)}
    return {...report,products:result.products};
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY), saved = raw ? JSON.parse(raw) : null;
      return (Array.isArray(saved) ? saved : clone(window.STORE_DEFAULT_PRODUCTS || [])).map(normalizeProduct);
    } catch (error) {
      console.error("Could not read products:", error);
      return clone(window.STORE_DEFAULT_PRODUCTS || []).map(normalizeProduct);
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
    const next = clone(products).map(normalizeProduct), previousRaw = localStorage.getItem(KEY), beforeCount = next.length;
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
  window.StoreProducts = {KEY,MIGRATION_FLAG,SCHEMA_FLAG,REPORT_KEY,VARIANT_REPORT_KEY,read,write,reset,localized,imageFallback,migrate,migrateVariantSchema,exportBackup,uniqueIds,quotaMessage,normalizeProduct,getOfferState,getVariant,getVariantPrice,getEffectivePrice};
  window.StoreProducts.ready = migrate().then(async result=>{const variantMigration=await migrateVariantSchema();if(variantMigration.converted?.length)console.table(variantMigration.converted);if(variantMigration.review?.length){console.warn("Products requiring manual variant-price review:");console.table(variantMigration.review)}return {...result,variantMigration}}).catch(error => { console.error("Safe product migration failed; original data was kept.", error); return {migrated:false,error,products:read()}; });
})();
