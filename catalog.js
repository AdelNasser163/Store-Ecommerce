(function () {
  "use strict";
  if (!window.StoreProducts) return;
  const language=localStorage.getItem("almumez-language")==="ar"?"ar":"en",money=value=>`${new Intl.NumberFormat("en-EG").format(Number(value)||0)} EGP`,text=value=>typeof value==="object"?value?.[language]||value?.en||"":value||"";
  const badgeLabels={new:["New Arrival","وصل حديثًا"],"best-seller":["Best Seller","الأكثر مبيعًا"],"official-warranty":["Official Warranty","ضمان رسمي"],discount:["Sale","خصم"],none:["",""]};
  const discount=product=>product.oldPrice>product.price?Math.round((1-product.price/product.oldPrice)*100):0;
  const products=()=>StoreProducts.read();
  const identity=product=>String(product.name?.en||product.name||product.id).toLowerCase().replace(/\s+copy(?:\s+\d+)?$/," ").trim();
  const unique=list=>{const seen=new Set();return list.filter(product=>{const key=identity(product);if(seen.has(key))return false;seen.add(key);return true})};
  const renderedOnPage=new Set(),imageError=`this.onerror=null;this.src='${StoreProducts.imageFallback}'`;
  function card(product){
    const label=product.badge==="discount"&&discount(product)?`-${discount(product)}%`:badgeLabels[product.badge]?.[language==="ar"?1:0]||"",name=text(product.name),sub=text(product.subcategory);
    return `<article class="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all catalog-product-card" data-product-id="${product.id}" data-category="${product.category}" data-search="${`${name} ${text(product.brand)} ${sub}`.toLowerCase()}"><div class="relative bg-slate-50 aspect-square overflow-hidden p-4">${label?`<span class="absolute top-3 left-3 z-10 bg-primary text-navy-dark text-xs font-bold px-2.5 py-1 rounded-full">${label}</span>`:""}<button type="button" class="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white shadow flex items-center justify-center" title="Add to Wishlist" data-toggle-wishlist="${product.id}" aria-label="Add ${name} to wishlist"><span class="material-symbols-outlined">favorite_border</span></button><img src="${product.image}" onerror="${imageError}" alt="${name}" class="w-full h-full object-contain product-click-target" loading="lazy"></div><div class="p-4"><p class="text-xs text-slate-500 mb-1">${text(product.brand)} · ${sub}</p><h3 class="font-bold text-sm text-navy-dark line-clamp-2 min-h-[40px]" tabindex="0">${name}</h3><div class="flex items-center gap-1 mt-2 text-xs"><span class="material-symbols-outlined text-primary text-sm">star</span><b>${Number(product.rating).toFixed(1)}</b><span class="text-slate-400">(${product.reviewsCount||0})</span></div><div class="flex items-baseline gap-2 mt-3"><span class="font-bold text-navy-dark">${money(product.price)}</span>${product.oldPrice?`<span class="line-through text-xs text-slate-400">${money(product.oldPrice)}</span>`:""}</div><button type="button" data-add-to-cart="${product.id}" class="mt-3 w-full min-h-[44px] rounded-full bg-primary text-navy-dark font-bold flex items-center justify-center gap-2"><span class="material-symbols-outlined text-sm">add_shopping_cart</span>${language==="ar"?"أضف للسلة":"Add to Cart"}</button></div></article>`;
  }
  const findSection=heading=>[...document.querySelectorAll("main section")].find(section=>section.querySelector("h2")?.textContent.includes(heading));
  function renderPlacement(placement,section){
    if(!section)return;const grid=[...section.querySelectorAll("div")].find(node=>/grid-cols-/.test(node.className)&&node.querySelector("h3"));if(!grid)return;grid.dataset.productsSection=placement;
    const list=unique(products().filter(product=>product.placements?.[placement]!=null)).filter(product=>!renderedOnPage.has(identity(product))).sort((a,b)=>(a.placements[placement]||0)-(b.placements[placement]||0)),limit=placement==="home-flash"?5:placement==="home-featured"?4:list.length,shown=list.slice(0,limit);
    grid.innerHTML=shown.map(card).join("");shown.forEach(product=>renderedOnPage.add(identity(product)));
    let all=section.querySelector("[data-section-view-all]");if(list.length>limit&&!all){all=document.createElement("a");all.dataset.sectionViewAll="";all.className="catalog-section-view-all";section.append(all)}if(all){all.hidden=list.length<=limit;all.href="accessories.html";all.textContent=language==="ar"?"عرض الكل":"View all"}
  }
  const page=document.body.dataset.page;
  document.querySelectorAll('.home-navigation a[href="products.html"]').forEach(link=>link.remove());
  if(page==="home"||!page){renderPlacement("home-flash",findSection("Flash Deals"));renderPlacement("home-featured",findSection("Featured Tech Collections"))}
  if(page==="accessories"){
    const section=[...document.querySelectorAll("main section")].find(node=>node.querySelector("h3")&&node.querySelectorAll("h3").length>3);
    if(section){const grid=section.querySelector(".grid");if(grid){grid.dataset.productsSection="accessories";grid.innerHTML=unique(products().filter(product=>product.placements?.accessories!=null)).sort((a,b)=>a.placements.accessories-b.placements.accessories).map(card).join("")}}
  }
  document.addEventListener("click",event=>{const target=event.target.closest("[data-product-id] img, [data-product-id] h3");if(!target)return;location.href=`product.html?id=${encodeURIComponent(target.closest("[data-product-id]").dataset.productId)}`});
  document.addEventListener("keydown",event=>{if(!["Enter"," "].includes(event.key)||!event.target.matches("[data-product-id] h3"))return;event.preventDefault();location.href=`product.html?id=${encodeURIComponent(event.target.closest("[data-product-id]").dataset.productId)}`});
  window.StoreCatalogUI={card,products,renderPlacement,unique};
})();
