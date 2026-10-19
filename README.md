# AlMumez Store

## Image storage (v3)

- Uploaded cover and gallery files are stored unchanged as `Blob` values in the browser's IndexedDB database `store-images` / `images`.
- `localStorage` contains only light references such as `idb:product-id/cover`.
- The first v3 load downloads a full JSON backup before migration. Dashboard Export JSON includes the original image data.
- Storage exists only in the current browser profile and device. Export before clearing browser data or moving devices, then import the JSON there.
- Images are not compressed, resized, re-encoded, or uploaded to a server. The limit is 15 MB per file.

Open `index.html` directly, or serve the folder with any static HTTP server.

## إزاي أضيف منتج جديد

1. افتح `admin.html` واستخدم كلمة السر المبدئية `admin123`.
2. اكتب اسم المنتج؛ الـID يتولد تلقائيًا من الاسم الإنجليزي ولا يحتاج إدخالًا يدويًا.
3. ارفع صورة المنتج، وأضف المواصفات من زر **Add specification**، واختر الأماكن من **Appears in** ثم احفظ.
4. المنتج يظهر تلقائيًا في السكاشن المختارة، و`products.html`، ويمكن فتحه في `product.html?id=<product-id>`.

الحماية الموجودة في صفحة الأدمن حماية مبدئية داخل المتصفح وليست أمانًا حقيقيًا. في الإنتاج يجب استخدام Backend وتسجيل دخول حقيقي. المنتجات المعدلة تحفظ في `localStorage`، ويمكن استخدام Export/Import JSON للنسخ الاحتياطي.

رفع الصور من الأدمن يحفظها كـ Data URL داخل `localStorage` مؤقتًا لأن المشروع لا يحتوي سيرفر رفع ملفات. للإنتاج ضع الصور في `assets/products/<id>/cover.jpg` و`gallery-1.jpg` إلى `gallery-4.jpg` ثم استخدم المسارات في النموذج.

## إزاي أضيف سكشن جديد يعرض منتجات

```html
<div data-products-section="home-new"></div>
```

أضف المكان إلى `STORE_PLACEMENTS` داخل `data/products.js`، ثم اعرض منتجاته من المصدر الموحد بفلترة `product.placements["home-new"]` وترتيبها بالقيمة المخزنة.

## الملفات الأساسية

- `data/products.js`: البيانات الافتراضية والـ placements.
- `data/store.js`: القراءة والكتابة والتوافق مع السلة وصفحة المنتج.
- `catalog.js`: بناء كروت المنتجات والسكاشن.
- `products.html` و`products.js`: كتالوج كل المنتجات والفلاتر.
- `admin.html` و`admin.js`: إدارة المنتجات والتصدير والاستيراد.
