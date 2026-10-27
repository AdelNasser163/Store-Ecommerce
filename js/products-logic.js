(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AlMumezProductsLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const DEFAULTS = { dept:"", brands:[], storage:[], min:null, max:null, rating:0, stock:false, sale:false, express:false, sort:"best", view:"grid", per:9, page:1, q:"" };
  const ARABIC_MARKS=/[\u064B-\u065F\u0670]/g;
  const normalize=value=>String(value||"").toLowerCase().normalize("NFKD").replace(ARABIC_MARKS,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/\s+/g," ").trim();
  const formatPrice=value=>new Intl.NumberFormat("ar-EG-u-nu-latn",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(Number(value)||0).replace("ج.م.‏","ج.م").replace("EGP","ج.م");
  const discountPercent=p=>p.oldPrice>p.price?Math.round((1-p.price/p.oldPrice)*100):0;
  function matches(product,state,skip=""){
    const search=normalize([product.name.ar,product.name.en,product.brand,product.department,...product.aliases].join(" "));
    if(skip!=="q"&&state.q&&!search.includes(normalize(state.q)))return false;
    if(skip!=="dept"&&state.dept&&product.department!==state.dept)return false;
    if(skip!=="brands"&&state.brands.length&&!state.brands.includes(product.brand))return false;
    if(skip!=="storage"&&state.storage.length&&(!product.storageOptions||!state.storage.some(item=>product.storageOptions.includes(item))))return false;
    if(skip!=="price"&&state.min!=null&&product.price<state.min)return false;
    if(skip!=="price"&&state.max!=null&&product.price>state.max)return false;
    if(skip!=="rating"&&state.rating&&product.rating<state.rating)return false;
    if(skip!=="availability"&&state.stock&&product.stock<=0)return false;
    if(skip!=="availability"&&state.sale&&discountPercent(product)<=0)return false;
    if(skip!=="availability"&&state.express&&!product.express)return false;
    return true;
  }
  function sortProducts(items,sort){
    const list=[...items],rules={newest:(a,b)=>new Date(b.createdAt)-new Date(a.createdAt),"price-asc":(a,b)=>a.price-b.price,"price-desc":(a,b)=>b.price-a.price,rating:(a,b)=>b.rating-a.rating,discount:(a,b)=>discountPercent(b)-discountPercent(a),best:(a,b)=>b.sold-a.sold};
    return list.sort(rules[sort]||rules.best);
  }
  function facets(products,state){
    const count=(group,test)=>products.filter(p=>matches(p,state,group)&&test(p)).length;
    const departments={}; products.forEach(p=>departments[p.department]=count("dept",x=>x.department===p.department));
    const brands={}; products.forEach(p=>brands[p.brand]=count("brands",x=>x.brand===p.brand));
    const storages={}; products.flatMap(p=>p.storageOptions||[]).forEach(s=>storages[s]=count("storage",x=>x.storageOptions?.includes(s)));
    return {departments,brands,storages};
  }
  function queryProducts(products,input={}){
    const state={...DEFAULTS,...input,brands:[...(input.brands||[])],storage:[...(input.storage||[])]};
    const filtered=sortProducts(products.filter(p=>matches(p,state)),state.sort),total=filtered.length,pages=Math.max(1,Math.ceil(total/state.per)),page=Math.min(Math.max(1,state.page),pages),start=(page-1)*state.per;
    return {items:filtered.slice(start,start+state.per),total,pages,page,facets:facets(products,state)};
  }
  function parseState(search,storedView="grid"){
    const p=new URLSearchParams(search),number=(key,fallback)=>p.has(key)&&p.get(key)!==""?Number(p.get(key)):fallback;
    return {...DEFAULTS,dept:p.get("dept")||"",brands:(p.get("brand")||"").split(",").filter(Boolean),storage:(p.get("storage")||"").split(",").filter(Boolean),min:number("min",null),max:number("max",null),rating:number("rating",0),stock:p.get("stock")==="1",sale:p.get("sale")==="1",express:p.get("express")==="1",sort:p.get("sort")||"best",view:p.get("view")||storedView,per:[9,12,24,48].includes(number("per",9))?number("per",9):9,page:Math.max(1,number("page",1)),q:p.get("q")||""};
  }
  function stateToQuery(state){
    const p=new URLSearchParams(); if(state.dept)p.set("dept",state.dept);if(state.brands.length)p.set("brand",state.brands.join(","));if(state.storage.length)p.set("storage",state.storage.join(","));if(state.min!=null)p.set("min",state.min);if(state.max!=null)p.set("max",state.max);if(state.rating)p.set("rating",state.rating);if(state.stock)p.set("stock","1");if(state.sale)p.set("sale","1");if(state.express)p.set("express","1");if(state.sort!=="best")p.set("sort",state.sort);if(state.view!=="grid")p.set("view",state.view);if(state.per!==9)p.set("per",state.per);if(state.page!==1)p.set("page",state.page);if(state.q)p.set("q",state.q);return p.toString();
  }
  return {DEFAULTS,normalize,formatPrice,discountPercent,matches,sortProducts,facets,queryProducts,parseState,stateToQuery};
});
