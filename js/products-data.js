(function(root){
  "use strict";
  const departments=[
    {id:"phones",ar:"الهواتف الذكية",en:"Smartphones",icon:"smartphone",base:["iPhone 15 Pro Max","Galaxy S24 Ultra","Xiaomi 14","OnePlus 12","Pixel 8 Pro"],images:["iPhone_17_Pro_Max.jpg","galaxy-s24.jpg","xiaomi-14.jpg","oneplus-12.jpg","pixel-8.jpg"]},
    {id:"laptops",ar:"اللابتوبات والماك بوك",en:"Laptops & MacBooks",icon:"laptop_mac",base:["MacBook Air M4","Dell G15","MacBook Pro","Dell XPS"],images:["macbook-air.jpg","dell-g15.jpg","macbook.jpg","dell-g15.jpg"]},
    {id:"tablets",ar:"الأجهزة اللوحية (iPad)",en:"Tablets",icon:"tablet_mac",base:["iPad Pro M4","iPad Air","Galaxy Tab"],images:["ipad-pro.jpg","ipad-pro-1.jpg","ipad-pro-2.jpg"]},
    {id:"audio",ar:"سماعات الصوت ANC",en:"ANC Audio",icon:"headphones",base:["Sony WH-1000XM5","Sony WF-1000XM5","Anker Soundcore"],images:["sony-wh.jpg","sony-wf.jpg","anker-pack.jpg"]},
    {id:"wearables",ar:"الساعات والأساور الذكية",en:"Wearables",icon:"watch",base:["Apple Watch Ultra","Galaxy Watch 6","Smart Band"],images:["watch-ultra.jpg","watch-6.jpg","watch-6.jpg"]},
    {id:"power",ar:"الشواحن وباور بانك",en:"Chargers & Power Banks",icon:"battery_charging_full",base:["Anker Power Pack","Apple 20W Adapter","MagSafe Charger"],images:["anker-pack.jpg","adapter-20w.jpg","magsafe-case.jpg"]}
  ];
  const brands=["Apple","Samsung","Xiaomi","Sony","Dell","Anker","OnePlus","Google"],storages=["128GB","256GB","512GB","1TB"];
  const hash=n=>{let x=Math.sin(n*999)*10000;return x-Math.floor(x)};
  const products=Array.from({length:128},(_,i)=>{
    const d=departments[i%departments.length],base=d.base[i%d.base.length],brand=base.startsWith("iP")||base.startsWith("Mac")||base.startsWith("Apple")||base.startsWith("Mag")?"Apple":base.startsWith("Galaxy")?"Samsung":base.startsWith("Xiaomi")?"Xiaomi":base.startsWith("Sony")?"Sony":base.startsWith("Dell")?"Dell":base.startsWith("Anker")?"Anker":base.startsWith("OnePlus")?"OnePlus":base.startsWith("Pixel")?"Google":brands[i%brands.length];
    const price=Math.round((1200+hash(i+2)*118000)/100)*100,discount=i%4===0?10+(i%5)*3:0,oldPrice=discount?Math.round(price/(1-discount/100)/100)*100:null,stock=i%19===0?0:2+Math.floor(hash(i+5)*38),storageOptions=["phones","laptops","tablets"].includes(d.id)?storages.slice(0,2+(i%3)):null;
    return {id:`p-${String(i+1).padStart(3,"0")}`,slug:`${d.id}-${i+1}`,name:{ar:`${base} ${i+1}`,en:`${base} ${i+1}`},brand,department:d.id,price,oldPrice,rating:Number((3.2+hash(i+9)*1.8).toFixed(1)),reviewCount:20+Math.floor(hash(i+11)*900),stock,initialStock:Math.max(stock,20+Math.floor(hash(i+7)*35)),sold:Math.floor(hash(i+13)*1200),createdAt:new Date(Date.UTC(2026-(i%3),i%12,1+(i%27))).toISOString(),storageOptions,express:i%3!==0,image:`assets/images/${d.images[i%d.images.length]}`,aliases:[base,brand,d.en,d.ar,"ايفون","iphone"]};
  });
  function getProducts(params){return new Promise(resolve=>setTimeout(()=>resolve(root.AlMumezProductsLogic.queryProducts(products,params)),350));}
  root.AlMumezProductsData={products,departments,brands,storages,getProducts};
})(globalThis);
