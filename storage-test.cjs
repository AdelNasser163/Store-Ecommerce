const assert = require("node:assert/strict");
const crypto = require("node:crypto");

class MemoryStorage {
  constructor(limit=5*1024*1024){this.limit=limit;this.data=new Map()}
  getItem(key){return this.data.has(key)?this.data.get(key):null}
  setItem(key,value){const text=String(value),next=new Map(this.data);next.set(key,text);const size=[...next].reduce((sum,[k,v])=>sum+Buffer.byteLength(k+v),0);if(size>this.limit){const error=new DOMException("quota","QuotaExceededError");throw error}this.data=next}
  removeItem(key){this.data.delete(key)}
}

function dataUrl(bytes,type="image/jpeg"){return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`}
function product(index,id,image){return{id,name:{en:`Product ${index}`,ar:`منتج ${index}`},brand:{en:"Brand",ar:"Brand"},category:"audio",subcategory:{en:"Audio",ar:"صوتيات"},price:1000+index,oldPrice:1200+index,rating:4.8,reviewsCount:index,stock:10,badge:"none",image,gallery:["assets/images/a.jpg","assets/images/b.jpg","assets/images/c.jpg","assets/images/d.jpg"],variants:[],specifications:[{label:{en:"Code",ar:"الرمز"},value:{en:String(index),ar:String(index)}}],placements:{"all-products":1},relatedIds:[],createdAt:"2025-01-01"}}

(async()=>{
  const originalBytes=crypto.randomBytes(2.7*1024*1024|0),largeImage=dataUrl(originalBytes),products=[];
  for(let i=0;i<31;i++)products.push(product(i,i<8?"samsung-galaxy-watch-6-classic-copy":`product-${i}`,i===0?largeImage:"assets/images/item.jpg"));
  const before=JSON.parse(JSON.stringify(products)), blobs=new Map();
  global.localStorage=new MemoryStorage();localStorage.setItem("store-products-v1",JSON.stringify(products));
  global.document={documentElement:{lang:"en"},body:{append(){}},createElement(){return{click(){},remove(){}}}};
  global.navigator={storage:{persist:async()=>true}};global.CustomEvent=class{constructor(name,options){this.type=name;this.detail=options?.detail}};
  global.window={STORE_DEFAULT_PRODUCTS:[],dispatchEvent(){}};
  global.ImageStore={
    async saveImage(key,source){const blob=source instanceof Blob?source:await(await fetch(source)).blob();const stored=new Blob([await blob.arrayBuffer()],{type:blob.type});assert.equal(stored.size,blob.size);assert.deepEqual(Buffer.from(await stored.arrayBuffer()),Buffer.from(await blob.arrayBuffer()));blobs.set(key,stored);return `idb:${key}`},
    async deleteImage(key){blobs.delete(String(key).replace(/^idb:/,""))},
    async exportReference(ref){const blob=blobs.get(String(ref).replace(/^idb:/,""));return blob?dataUrl(Buffer.from(await blob.arrayBuffer()),blob.type):ref}
  };
  window.ImageStore=global.ImageStore;
  require("./data/store.js");
  const migration=await window.StoreProducts.ready,migrated=window.StoreProducts.read();
  assert.equal(migrated.length,31);assert.equal(new Set(migrated.map(item=>item.id)).size,31);assert.equal(migration.idChanges.length,7);
  assert.ok(Buffer.byteLength(localStorage.getItem("store-products-v1"))<100*1024);
  const savedBlob=blobs.get("samsung-galaxy-watch-6-classic-copy/cover");assert.ok(savedBlob);assert.deepEqual(Buffer.from(await savedBlob.arrayBuffer()),originalBytes);
  migrated.forEach((item,index)=>{assert.equal(item.price,before[index].price);assert.deepEqual(item.specifications,before[index].specifications);assert.deepEqual(item.placements,before[index].placements)});
  for(let i=0;i<10;i++){const bytes=crypto.randomBytes(1024*1024);migrated.push(product(100+i,`large-${i}`,dataUrl(bytes)))}
  const added=await window.StoreProducts.write(migrated);assert.equal(added.products.length,41);assert.ok(Buffer.byteLength(localStorage.getItem("store-products-v1"))<100*1024);
  console.log(JSON.stringify({productsAfterMigration:31,duplicateIdsFixed:7,localStorageBytes:Buffer.byteLength(localStorage.getItem("store-products-v1")),originalImageBytes:originalBytes.length,bytePerfect:true,largeProductsAdded:10,finalCount:41},null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
