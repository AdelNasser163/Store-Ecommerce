const fs = require("fs");
const vm = require("vm");

const memory = new Map([["store-migrated-v3", "1"], ["store-schema-v6-variant-additions", "1"]]);
const localStorage = {getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
const sandbox = {window:{},localStorage,navigator:{storage:{}},document:{documentElement:{lang:"en"}},console,Blob,URL,setTimeout,clearTimeout};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("data/products.js", "utf8"), sandbox);
vm.runInContext(fs.readFileSync("data/store.js", "utf8"), sandbox);

const Store = sandbox.window.StoreProducts;
const products = Store.read().filter(product => product.variants.length);
const rows = [];
for (const product of products) {
  for (const variant of product.variants) {
    const addition = Number(variant.priceDelta);
    const base = Store.getOfferState(product).price;
    const saved = base + addition;
    const displayed = Store.getEffectivePrice(product, variant).price;
    const monthly = Math.ceil(displayed / 12);
    const cartItem = {id:product.id, storage:variant.id, price:displayed, quantity:1};
    const passed = displayed === saved && monthly === Math.ceil(saved / 12) && cartItem.price === saved;
    rows.push({product:product.name.en, variant:variant.label.en, base, addition, expected:saved, displayed, monthly, cart:cartItem.price, status:passed?"PASS":"FAIL"});
  }
}
console.table(rows);
const failures = rows.filter(row => row.status === "FAIL");
const manualReview = products.filter(product => product.variants.some(variant => !Number.isFinite(Number(variant.priceDelta)))).map(product => product.name.en);
console.log("Converted legacy prices: handled by store-schema-v6-variant-additions migration in the browser.");
console.log("Manual review:", manualReview.length ? manualReview : "None in bundled catalog");
if (failures.length) process.exitCode = 1;
