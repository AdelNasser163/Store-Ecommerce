(() => {
  "use strict";
  const CART_KEY = "cartItems",
    WISHLIST_KEY = "almumez-wishlist",
    LANGUAGE_KEY = "almumez-language",
    CATALOG_KEY = "almumez-catalog",
    SELECTED_PRODUCT_KEY = "almumez-selected-product";
  const money = (value) =>
    `${new Intl.NumberFormat("en-EG").format(value)} EGP`;
  const normalize = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
      .trim();
  const load = (key, fallback = []) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const categoryByName = {
    "Sony WF-1000XM5 Wireless Noise Canceling": "audio",
    "Samsung Galaxy Watch 6 Classic 47mm LTE": "mobiles",
    "Dell G15 Core i7 13th Gen RTX 4060 16GB": "electronics",
    "Philips Barista Touch Smart Coffee Machine": "appliances",
    "Anker 10,000mAh MagGo Wireless Fast Pack": "mobiles",
    'Samsung Odyssey G9 49" OLED 240Hz 0.03ms': "electronics",
    'MacBook Pro 16" M3 Max 36GB Unified 1TB': "electronics",
    "Sony PlayStation 5 Slim 1TB + Extra DualSense": "electronics",
    "Philips XXL Smart Sensing Digital Airfryer": "appliances",
  };
  const inferCategory = (name) => {
    if (/WF-1000|headphone|audio|sound/i.test(name)) return "audio";
    if (/watch|anker|iphone|phone|mobile|tablet/i.test(name)) return "mobiles";
    if (/philips|airfryer|coffee|appliance|kitchen/i.test(name))
      return "appliances";
    return "electronics";
  };
  const productCards = [...document.querySelectorAll("main h3")]
    .map((heading) => {
      const card = heading.closest(".group");
      if (!card || !card.querySelector("img")) return null;
      const productName = heading.textContent.replace(/\s+/g, " ").trim();
      const priceText =
        [...card.querySelectorAll("span")].find((node) =>
          /[\d,]+\s*EGP/.test(node.textContent),
        )?.textContent || "0";
      const allText = card.textContent.replace(/\s+/g, " ").trim(),
        oldPriceText = card.querySelector(".line-through")?.textContent || "",
        ratingMatch = allText.match(/([0-5]\.\d)\s*\((\d+)/),
        stockMatch = allText.match(/(\d+)\s*Left/i),
        discountMatch = allText.match(/-\d+%/);
      const product = {
        id: normalize(productName).replaceAll(" ", "-"),
        name: productName,
        price: Number(priceText.replace(/[^\d]/g, "")),
        oldPrice: Number(oldPriceText.replace(/[^\d]/g, "")) || 0,
        image: card.querySelector("img").getAttribute("src"),
        category: categoryByName[productName] || inferCategory(productName),
        rating: Number(ratingMatch?.[1] || 4.8),
        reviews: Number(ratingMatch?.[2] || 0),
        stock: Number(stockMatch?.[1] || 10),
        discount: discountMatch?.[0] || "",
      };
      card.dataset.productId = product.id;
      card.dataset.category = product.category;
      card.dataset.search = normalize(`${product.name} ${product.category}`);
      card
        .querySelectorAll("img")
        .forEach((image) => (image.alt = product.name));
      const addButton = [...card.querySelectorAll("button")].find((button) =>
        /Add to Cart/i.test(button.textContent),
      );
      const wishlistButton = [...card.querySelectorAll("button")].find(
        (button) => /Wishlist/i.test(button.title || ""),
      );
      if (addButton) {
        addButton.dataset.addToCart = product.id;
        addButton.type = "button";
      }
      if (wishlistButton) {
        wishlistButton.dataset.toggleWishlist = product.id;
        wishlistButton.type = "button";
        wishlistButton.setAttribute(
          "aria-label",
          `Add ${product.name} to wishlist`,
        );
      }
      return { ...product, card, addButton, wishlistButton };
    })
    .filter(Boolean);
  const products = [
    ...new Map(productCards.map((product) => [product.id, product])).values(),
  ];
  const isProductPage = document.body.dataset.page === "product",
    isAccessoriesPage = document.body.dataset.page === "accessories",
    isCheckoutPage = document.body.dataset.page === "checkout";
  const defaultProduct = {
    id: "apple-iphone-15-pro-max-256gb",
    name: "Apple iPhone 15 Pro Max - 256GB Natural Titanium",
    price: 54999,
    oldPrice: 58999,
    image: "assets/images/iphone-main.jpg",
    category: "mobiles",
    rating: 4.9,
    reviews: 320,
    stock: 14,
    discount: "-7%",
  };
  if (products.length) {
    save(
      CATALOG_KEY,
      products.map(
        ({ card, addButton, wishlistButton, ...product }) => product,
      ),
    );
    productCards.forEach((product) => {
      const cleanProduct = (({ card, addButton, wishlistButton, ...item }) =>
          item)(product),
        open = () => {
          save(SELECTED_PRODUCT_KEY, cleanProduct);
          location.href = `product.html?id=${encodeURIComponent(product.id)}`;
        };
      product.card.classList.add("product-card-link");
      product.card.querySelector("img")?.classList.add("product-click-target");
      product.card.querySelector("img")?.addEventListener("click", open);
      product.card.querySelector("h3")?.addEventListener("click", open);
      product.card.querySelector("h3")?.setAttribute("tabindex", "0");
      product.card.querySelector("h3")?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });
  }
  const requestedId = new URLSearchParams(location.search).get("id"),
    storedSelected = load(SELECTED_PRODUCT_KEY, null),
    storedCatalog = load(CATALOG_KEY, []);
  const activeProduct = isProductPage
    ? storedCatalog.find((item) => item.id === requestedId) ||
      ((!requestedId || storedSelected?.id === requestedId) &&
        storedSelected) ||
      defaultProduct
    : null;
  const productDetails = activeProduct
    ? {
        ...activeProduct,
        baseStorage: Number(
          activeProduct.name.match(/(\d+)\s*(?:GB|TB)/i)?.[1] || 256,
        ),
        storagePrices: {
          256: activeProduct.price,
          512: activeProduct.price + 7500,
          1024: activeProduct.price + 15000,
        },
        storageOldPrices: {
          256: activeProduct.oldPrice || 0,
          512: (activeProduct.oldPrice || activeProduct.price) + 7500,
          1024: (activeProduct.oldPrice || activeProduct.price) + 15000,
        },
        images: /iphone/i.test(activeProduct.name)
          ? [
              "assets/images/iphone-main.jpg",
              "assets/images/iphone-front.jpg",
              "assets/images/iphone-camera.jpg",
              "assets/images/iphone-side.jpg",
            ]
          : Array(4).fill(activeProduct.image),
        bundleDiscount: 650,
        suggestions: [
          {
            id: "apple-20w-usb-c-adapter",
            name: "Apple 20W USB-C Power Adapter",
            subtitle: "Apple Original",
            price: 899,
            oldPrice: 999,
            image: "assets/images/adapter-20w.jpg",
            category: "accessories",
          },
          {
            id: "apple-magsafe-clear-case",
            name: "Apple MagSafe Clear Case",
            subtitle: "Drop Protection",
            price: 1450,
            oldPrice: 1599,
            image: "assets/images/magsafe-case.jpg",
            category: "accessories",
          },
        ],
      }
    : null;
  const storageParam = Number(
      new URLSearchParams(location.search).get("storage"),
    ),
    validStorages = [256, 512, 1024];
  let selectedProductStorage = validStorages.includes(storageParam)
      ? storageParam
      : 256,
    purchaseQuantity = 1;
  const storageLabel = (value) => (value === 1024 ? "1 TB" : `${value} GB`);
  const configuredProduct = () => ({
    ...activeProduct,
    storage: selectedProductStorage,
    price:
      productDetails?.storagePrices[selectedProductStorage] ||
      activeProduct.price,
    oldPrice: productDetails?.storageOldPrices[selectedProductStorage] || 0,
    name: activeProduct.name.replace(
      /(?:256|512)\s*GB|1\s*TB/i,
      storageLabel(selectedProductStorage),
    ),
    sku: `${activeProduct.id
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .slice(
        0,
        22,
      )}-${selectedProductStorage === 1024 ? "1TB" : `${selectedProductStorage}GB`}`,
  });
  if (isProductPage) {
    products.push(activeProduct);
    products.push({
      id: "apple-20w-usb-c-adapter",
      name: "Apple 20W USB-C Power Adapter",
      price: 899,
      image: "assets/images/adapter-20w.jpg",
      category: "accessories",
    });
    products.push({
      id: "apple-magsafe-clear-case",
      name: "Apple MagSafe Clear Case",
      price: 1450,
      image: "assets/images/magsafe-case.jpg",
      category: "accessories",
    });
    document.body.dataset.productId = activeProduct.id;
    save(SELECTED_PRODUCT_KEY, activeProduct);
    const title = document.querySelector("main h1"),
      details = title?.closest("section"),
      brand = activeProduct.name.split(" ")[0],
      categoryLabel =
        activeProduct.category.charAt(0).toUpperCase() +
        activeProduct.category.slice(1),
      saving = Math.max(0, (activeProduct.oldPrice || 0) - activeProduct.price);
    document.title = `${activeProduct.name} - AlMumez Online Store`;
    if (title) title.textContent = activeProduct.name;
    const breadcrumb = document.querySelector(
      'nav[aria-label="Breadcrumb"] li:last-child',
    );
    if (breadcrumb) breadcrumb.textContent = activeProduct.name;
    const breadcrumbLinks = document.querySelectorAll(
      'nav[aria-label="Breadcrumb"] a',
    );
    if (breadcrumbLinks[1]) breadcrumbLinks[1].textContent = categoryLabel;
    if (breadcrumbLinks[2]) breadcrumbLinks[2].textContent = brand;
    const brandNode = details?.querySelector(".text-secondary.uppercase");
    if (brandNode) brandNode.textContent = `Brand: ${brand}`;
    const skuNode = [
      ...(details?.querySelectorAll(".text-outline") || []),
    ].find((node) => node.textContent.includes("SKU:"));
    if (skuNode)
      skuNode.textContent = `SKU: ${activeProduct.id
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .slice(0, 28)}`;
    const reviewLink = details?.querySelector('a[href="#reviews"]');
    if (reviewLink)
      reviewLink.textContent = `${activeProduct.reviews || 0} reviews`;
    const ratingNode = reviewLink?.parentElement?.querySelector(".font-bold");
    if (ratingNode)
      ratingNode.textContent = (activeProduct.rating || 4.8).toFixed(1);
    const stockNode = [...(details?.querySelectorAll("div") || [])].find(
      (node) => /^In Stock -/.test(node.textContent.trim()),
    );
    if (stockNode) {
      const dot = stockNode.querySelector("span");
      stockNode.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) node.remove();
      });
      stockNode.append(
        ` In Stock - ${activeProduct.stock || 0} left in Cairo Warehouse`,
      );
      if (dot) stockNode.prepend(dot);
    }
    const priceNode = details?.querySelector(".text-headline-lg");
    if (priceNode) priceNode.textContent = money(activeProduct.price);
    const oldPriceNode = details?.querySelector(".line-through");
    if (oldPriceNode) {
      oldPriceNode.textContent = activeProduct.oldPrice
        ? money(activeProduct.oldPrice)
        : "";
      oldPriceNode.hidden = !activeProduct.oldPrice;
    }
    const savingNode = [...(details?.querySelectorAll("span") || [])].find(
      (node) => node.textContent.includes("Save 4,000"),
    );
    if (savingNode)
      savingNode.textContent = saving
        ? `${activeProduct.discount || ""} (Save ${money(saving)})`.trim()
        : activeProduct.discount || "Best Price";
    const gallerySaving = [
      ...document.querySelectorAll("main section:first-child span"),
    ].find((node) => node.textContent.includes("Save 4,000"));
    if (gallerySaving)
      gallerySaving.textContent = saving
        ? `Save ${money(saving)}`
        : "Best Price";
    const mainImage = document.querySelector("#mainProductImage");
    if (mainImage) {
      mainImage.src = activeProduct.image;
      mainImage.alt = activeProduct.name;
    }
    if (activeProduct.id !== defaultProduct.id)
      document
        .querySelectorAll("main section:first-child .grid.grid-cols-4 img")
        .forEach((image) => {
          image.src = activeProduct.image;
          image.alt = activeProduct.name;
        });
    const storagePrice = details?.querySelector(
      ".grid.grid-cols-3 button span:last-child",
    );
    if (storagePrice) storagePrice.textContent = money(activeProduct.price);
    const bundleItem = document.querySelector("main section.mt-space-xl img");
    if (bundleItem) {
      bundleItem.src = activeProduct.image;
      bundleItem.alt = activeProduct.name;
      const box = bundleItem.parentElement;
      const name = box?.querySelector("p.font-bold");
      const subtitle = box?.querySelector("p.text-outline");
      const bundlePrice = box?.querySelector("p.mt-1");
      if (name) name.textContent = activeProduct.name;
      if (subtitle) subtitle.textContent = categoryLabel;
      if (bundlePrice) bundlePrice.textContent = money(activeProduct.price);
    }
    const monthly = [...(details?.querySelectorAll("strong") || [])].find(
      (node) => node.textContent.includes("1,850 EGP/month"),
    );
    if (monthly)
      monthly.textContent = `${money(Math.ceil(activeProduct.price / 12))}/month`;
    const bundleSection = [...document.querySelectorAll("main section")].find(
      (section) => section.textContent.includes("Frequently Bought Together"),
    );
    if (bundleSection) {
      const bundleTotal = activeProduct.price + 899 + 1450 - 650,
        bundleOriginal = activeProduct.price + 899 + 1450,
        bundlePricing = [...bundleSection.querySelectorAll("div")].find(
          (node) =>
            node.textContent.includes("Bundle Total") &&
            node.querySelector("button"),
        );
      const totalNode = bundlePricing?.querySelector(".font-headline-sm");
      const originalNode = bundlePricing?.querySelector(".line-through");
      if (totalNode) totalNode.textContent = money(bundleTotal);
      if (originalNode) originalNode.textContent = money(bundleOriginal);
    }
    if (activeProduct.id !== defaultProduct.id) {
      [...(details?.querySelectorAll("div.flex.flex-col") || [])]
        .filter((node) => /^Finish:/.test(node.textContent.trim()))
        .forEach((node) => (node.hidden = true));
      const sourceText = [...document.querySelectorAll("p")].find((node) =>
        node.textContent.includes("Direct Apple Authorized Source"),
      );
      if (sourceText) sourceText.textContent = `Authorized ${brand} Source`;
      const tabButtons = [
        ...document.querySelectorAll(
          "main section:last-of-type > div:first-child button",
        ),
      ];
      if (tabButtons[0])
        tabButtons[0].childNodes[
          tabButtons[0].childNodes.length - 1
        ].textContent = " Product Details";
      if (tabButtons[1])
        tabButtons[1].childNodes[
          tabButtons[1].childNodes.length - 1
        ].textContent = ` Customer Reviews (${activeProduct.reviews || 0})`;
      const specRows = [
          ...document.querySelectorAll(
            "main section:last-of-type > .mt-6 > div",
          ),
        ],
        specs = [
          ["Category", categoryLabel],
          ["Product", activeProduct.name],
          ["Current Price", money(activeProduct.price)],
          [
            "Previous Price",
            activeProduct.oldPrice ? money(activeProduct.oldPrice) : "—",
          ],
          ["Availability", `${activeProduct.stock || 0} items in stock`],
          [
            "Customer Rating",
            `${(activeProduct.rating || 4.8).toFixed(1)} / 5`,
          ],
          ["Warranty", "Official regional warranty"],
          ["Delivery", "24h express delivery in Cairo & Giza"],
        ];
      specRows.forEach((row, index) => {
        const values = row.querySelectorAll("span");
        if (specs[index] && values.length > 1) {
          values[0].textContent = specs[index][0];
          values[1].textContent = specs[index][1];
        }
      });
      const reviewsPanel = document.querySelector("#reviews"),
        reviewsGrid = reviewsPanel?.querySelector(".grid");
      if (reviewsPanel?.querySelector("h3"))
        reviewsPanel.querySelector("h3").textContent =
          `${activeProduct.reviews || 0} Customer Ratings`;
      if (reviewsGrid)
        reviewsGrid.innerHTML = `<div class="p-4 rounded-xl bg-surface-container-low border border-surface-container-high"><p class="font-body-sm text-body-sm text-on-surface-variant">Rated <strong>${(activeProduct.rating || 4.8).toFixed(1)} out of 5</strong> from ${activeProduct.reviews || 0} customer ratings.</p></div>`;
    }
  }
  let cart = load(CART_KEY, load("almumez-cart", [])).map((item) => ({
      ...item,
      key: item.key || `${item.id}::${item.storage || "default"}`,
    })),
    wishlist = load(WISHLIST_KEY),
    language =
      new URLSearchParams(location.search).get("lang") ||
      localStorage.getItem(LANGUAGE_KEY) ||
      "en";

  const drawerMarkup = (type, title) =>
    `<div class="store-drawer-backdrop" data-close-drawer="${type}"></div><aside class="store-drawer" id="${type}-drawer" aria-hidden="true" aria-labelledby="${type}-title"><header><h2 id="${type}-title">${title}</h2><button type="button" data-close-drawer="${type}" aria-label="Close">×</button></header><div class="store-drawer-content" data-${type}-items></div>${type === "cart" ? '<footer><div><span>Total</span><strong data-cart-drawer-total>0 EGP</strong></div><a href="checkout.html" class="store-checkout">Checkout</a></footer>' : ""}</aside>`;
  document.body.insertAdjacentHTML(
    "beforeend",
    drawerMarkup("cart", "Your Cart") +
      drawerMarkup("wishlist", "Wishlist") +
      '<div class="store-toast" role="status" aria-live="polite"></div>',
  );
  const toast = (message) => {
    const node = document.querySelector(".store-toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("show"), 1800);
  };
  const openDrawer = (type) => {
    document.querySelector(`#${type}-drawer`).classList.add("open");
    document
      .querySelector(`[data-close-drawer="${type}"].store-drawer-backdrop`)
      .classList.add("open");
    document
      .querySelector(`#${type}-drawer`)
      .setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
  };
  const closeDrawer = (type) => {
    document.querySelector(`#${type}-drawer`).classList.remove("open");
    document
      .querySelector(`[data-close-drawer="${type}"].store-drawer-backdrop`)
      .classList.remove("open");
    document
      .querySelector(`#${type}-drawer`)
      .setAttribute("aria-hidden", "true");
    if (!document.querySelector(".store-drawer.open"))
      document.body.classList.remove("drawer-open");
  };
  const cartButton = document.querySelector(
      ".home-cart-button, .product-cart-button",
    ),
    wishlistHeader = document.querySelector(
      'header a[title="Wishlist"], .product-header-wishlist',
    );
  cartButton?.setAttribute("aria-label", "Open shopping cart");
  wishlistHeader?.setAttribute("aria-label", "Open wishlist");

  let renderCheckout = () => {};
  function changeQuantity(key, amount) {
    const item = cart.find((entry) => (entry.key || entry.id) === key);
    if (!item) return;
    item.quantity += amount;
    if (item.quantity < 1)
      cart = cart.filter((entry) => (entry.key || entry.id) !== key);
    save(CART_KEY, cart);
    renderState();
    renderCheckout();
  }
  function addToCart(id, options = {}) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    const isActive = isProductPage && id === activeProduct?.id,
      configured = isActive ? configuredProduct() : product,
      storage = options.storage ?? (isActive ? selectedProductStorage : null),
      amount = options.quantity ?? (isActive ? purchaseQuantity : 1),
      key = `${id}::${storage || "default"}`;
    const existing = cart.find(
      (item) =>
        (item.key || `${item.id}::${item.storage || "default"}`) === key,
    );
    if (existing) existing.quantity += amount;
    else
      cart.push({
        key,
        id,
        storage,
        name: configured.name,
        price: options.price ?? configured.price,
        image: configured.image,
        quantity: amount,
      });
    save(CART_KEY, cart);
    renderState();
    if (!options.silent)
      toast(
        language === "ar"
          ? "تمت إضافة المنتج إلى السلة"
          : "Product added to cart",
      );
  }
  function toggleWishlist(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    const exists = wishlist.some((item) => item.id === id);
    wishlist = exists
      ? wishlist.filter((item) => item.id !== id)
      : [
          ...wishlist,
          {
            id,
            name: product.name,
            price: product.price,
            image: product.image,
          },
        ];
    save(WISHLIST_KEY, wishlist);
    renderState();
    toast(
      exists
        ? language === "ar"
          ? "تمت الإزالة من المفضلة"
          : "Removed from wishlist"
        : language === "ar"
          ? "تمت الإضافة إلى المفضلة"
          : "Added to wishlist",
    );
  }
  function renderState() {
    const count = cart.reduce((total, item) => total + item.quantity, 0),
      total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      cartLabel = cartButton?.querySelector(".text-sm");
    if (cartLabel)
      cartLabel.innerHTML = `${language === "ar" ? "السلة" : "Cart"}: <span class="text-mumez-green">${count}</span> | ${money(total)}`;
    const homeCartMeta = cartButton?.querySelector(".home-cart-meta"),
      homeCartTotal = cartButton?.querySelector(".home-cart-total");
    if (homeCartMeta)
      homeCartMeta.textContent = `${language === "ar" ? "السلة" : "Cart"}: ${count} ${language === "ar" ? "منتج" : "items"}`;
    if (homeCartTotal) homeCartTotal.textContent = money(total);
    if (wishlistHeader) {
      const label = wishlistHeader.querySelector("span:last-child");
      if (label)
        label.textContent = wishlistHeader.classList.contains(
          "home-header-wishlist",
        )
          ? wishlist.length
          : `${language === "ar" ? "المفضلة" : "Wishlist"}${wishlist.length ? ` (${wishlist.length})` : ""}`;
    }
    productCards.forEach((product) => {
      const active = wishlist.some((item) => item.id === product.id);
      product.wishlistButton?.classList.toggle("wishlist-active", active);
      const icon = product.wishlistButton?.querySelector(
        ".material-symbols-outlined",
      );
      if (icon)
        icon.style.fontVariationSettings = active ? "'FILL' 1" : "'FILL' 0";
    });
    document.querySelector("[data-cart-items]").innerHTML = cart.length
      ? cart
          .map(
            (item) =>
              `<article class="drawer-item"><img src="${item.image}" alt=""><div><h3>${item.name}</h3>${item.storage ? `<small>${storageLabel(item.storage)}</small>` : ""}<strong>${money(item.price)}</strong><div class="quantity"><button data-quantity="-1" data-id="${item.key || item.id}">−</button><span>${item.quantity}</span><button data-quantity="1" data-id="${item.key || item.id}">+</button></div></div><button class="remove-item" data-remove-cart="${item.key || item.id}" aria-label="Remove">delete</button></article>`,
          )
          .join("")
      : `<p class="drawer-empty">${language === "ar" ? "السلة فارغة." : "Your cart is empty."}</p>`;
    document.querySelector("[data-cart-drawer-total]").textContent =
      money(total);
    document.querySelector("[data-wishlist-items]").innerHTML = wishlist.length
      ? wishlist
          .map(
            (item) =>
              `<article class="drawer-item"><img src="${item.image}" alt=""><div><h3>${item.name}</h3><strong>${money(item.price)}</strong><button class="move-to-cart" data-wishlist-to-cart="${item.id}">${language === "ar" ? "أضف للسلة" : "Add to cart"}</button></div><button class="remove-item" data-remove-wishlist="${item.id}" aria-label="Remove">delete</button></article>`,
          )
          .join("")
      : `<p class="drawer-empty">${language === "ar" ? "لا توجد منتجات في المفضلة." : "Your wishlist is empty."}</p>`;
    if (isProductPage) {
      const lines = cartButton?.querySelectorAll("p");
      if (lines?.[0])
        lines[0].textContent = `${language === "ar" ? "السلة" : "Cart"}: ${count} ${language === "ar" ? "منتج" : "items"}`;
      if (lines?.[1]) lines[1].textContent = money(total);
      const badge = wishlistHeader?.querySelector("span:last-child");
      if (badge) badge.textContent = wishlist.length;
      document.querySelectorAll("[data-product-wishlist]").forEach((button) => {
        const active = wishlist.some((item) => item.id === activeProduct.id);
        button.classList.toggle("wishlist-active", active);
        button.setAttribute("aria-pressed", String(active));
        const icon = button.querySelector(".material-symbols-outlined");
        if (icon)
          icon.style.fontVariationSettings = active ? "'FILL' 1" : "'FILL' 0";
      });
    }
  }
  function filterProducts(category = "all", query = "") {
    const normalizedQuery = normalize(query);
    let matches = 0;
    productCards.forEach((product) => {
      const categoryMatch =
          category === "all" ||
          category === "electronics" ||
          product.category === category,
        searchMatch =
          !normalizedQuery ||
          product.card.dataset.search.includes(normalizedQuery),
        visible = categoryMatch && searchMatch;
      product.card.hidden = !visible;
      if (visible) matches++;
    });
    document
      .querySelectorAll("[data-empty-products]")
      .forEach((node) => node.remove());
    if (!matches)
      productCards[0]?.card.parentElement.insertAdjacentHTML(
        "afterend",
        `<p data-empty-products class="product-empty">${language === "ar" ? "لا توجد منتجات مطابقة." : "No matching products found."}</p>`,
      );
    return matches;
  }
  const filterButtons = [...document.querySelectorAll("main button")].filter(
    (button) =>
      ["Electronics", "Mobiles", "Appliances", "Audio"].includes(
        button.textContent.trim(),
      ),
  );
  filterButtons.forEach((button) => {
    button.dataset.productFilter = button.textContent.trim().toLowerCase();
    button.addEventListener("click", () => {
      filterButtons.forEach((item) =>
        item.classList.toggle("filter-active", item === button),
      );
      filterProducts(button.dataset.productFilter);
      productCards[0]?.card
        .closest("section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  const categoryLinks = [...document.querySelectorAll("main h3")]
    .filter((node) =>
      [
        "Mobiles & Tablets",
        "Laptops & PCs",
        "Audio & Sound",
        "Smart TV & Video",
        "Home Appliances",
        "Gaming Gear",
      ].includes(node.textContent.trim()),
    )
    .map((node) => node.closest("a"));
  [
    "mobiles",
    "electronics",
    "audio",
    "electronics",
    "appliances",
    "electronics",
  ].forEach((category, index) =>
    categoryLinks[index]?.addEventListener("click", (event) => {
      event.preventDefault();
      filterProducts(category);
      productCards[0]?.card
        .closest("section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }),
  );
  const searchInput = document.querySelector(
      'header input[placeholder*="Search"]',
    ),
    searchButton = searchInput?.parentElement.querySelector("button");
  const runSearch = () => {
    const query = searchInput.value.trim(),
      matches = filterProducts("all", query);
    if (query)
      toast(
        language === "ar"
          ? `تم العثور على ${matches} منتج`
          : `${matches} product${matches === 1 ? "" : "s"} found`,
      );
    productCards[0]?.card
      .closest("section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  searchButton?.addEventListener("click", runSearch);
  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runSearch();
  });
  searchInput?.addEventListener("input", () => {
    if (!searchInput.value) filterProducts();
  });

  const translations = new Map(
    Object.entries({
      "Apple iPhone 15 Pro Max - 256GB Natural Titanium (Regional Spec / FaceTime)":
        "آبل آيفون 15 برو ماكس - 256 جيجابايت تيتانيوم طبيعي (مواصفات إقليمية / فيس تايم)",
      "Cairo Delivery: Under 24h": "توصيل القاهرة: خلال 24 ساعة",
      "Official Apple Regional Spec": "مواصفات آبل الإقليمية الرسمية",
      "Search iPhone, Mac, gaming gear, smart watches...":
        "ابحث عن آيفون، ماك، معدات الألعاب والساعات الذكية...",
      "Mobiles & Tablets": "الهواتف والأجهزة اللوحية",
      "Laptops & PCs": "اللابتوب والكمبيوتر",
      "Hot Offers": "عروض ساخنة",
      "Brand: Apple Egypt": "العلامة التجارية: آبل مصر",
      "In Stock - 14 left in Cairo Warehouse":
        "متوفر - متبقي 14 في مخزن القاهرة",
      "Regional Spec": "مواصفات إقليمية",
      "Save 4,000 EGP": "وفر 4,000 ج.م",
      "Direct Apple Authorized Source": "مصدر معتمد من آبل مباشرة",
      "2-Year Agent Warranty": "ضمان الوكيل لمدة عامين",
      "Full Local Egyptian Coverage": "تغطية مصرية محلية كاملة",
      "Price inclusive of 14% VAT • Official Customs Cleared":
        "السعر شامل ضريبة القيمة المضافة 14% • خالص الجمارك رسميًا",
      "0% interest up to 12 months": "0% فوائد حتى 12 شهرًا",
      "Finish:": "اللون:",
      "Natural Titanium": "تيتانيوم طبيعي",
      "Aerospace-grade Grade 5 Titanium": "تيتانيوم طيران من الدرجة الخامسة",
      "Storage Capacity:": "سعة التخزين:",
      "Need help deciding?": "تحتاج مساعدة في الاختيار؟",
      "Buy Now with 1-Click Checkout": "اشترِ الآن وأتمم الطلب بنقرة واحدة",
      "24h Express Delivery to Cairo & Giza":
        "توصيل سريع خلال 24 ساعة للقاهرة والجيزة",
      "14-Day Free Hassle-free Returns": "إرجاع مجاني خلال 14 يومًا",
      "Cash & Card on Delivery Available":
        "الدفع نقدًا أو بالبطاقة عند الاستلام",
      "Special Tech Bundle": "باقة تقنية خاصة",
      "Frequently Bought Together": "يتم شراؤها معًا عادةً",
      "Save 650 EGP Extra": "وفر 650 ج.م إضافية",
      "Bundle Total (3 items):": "إجمالي الباقة (3 منتجات):",
      "Add All 3 to Cart": "أضف المنتجات الثلاثة للسلة",
      "Technical Specifications": "المواصفات التقنية",
      "Customer Reviews (320)": "تقييمات العملاء (320)",
      Display: "الشاشة",
      Processor: "المعالج",
      "Main Camera": "الكاميرا الرئيسية",
      "Front Camera": "الكاميرا الأمامية",
      "Battery & Charging": "البطارية والشحن",
      "Operating System": "نظام التشغيل",
      "Build & Materials": "التصنيع والخامات",
      "Water & Dust Resistance": "مقاومة الماء والغبار",
      "Top Verified Egyptian Buyers": "أفضل المشترين المصريين الموثقين",
      "Verified Buyer": "مشتري موثق",
      Company: "الشركة",
      "Customer Care": "خدمة العملاء",
      "Security & Guarantee": "الأمان والضمان",
      "Accepted Payment Methods": "طرق الدفع المقبولة",
      "All rights reserved.": "جميع الحقوق محفوظة.",
      "Authorized Regional Tech Distributor.": "موزع إقليمي معتمد للتقنية.",
      "Cart:": "السلة:",
      items: "منتجات",
      Home: "الرئيسية",
      About: "من نحن",
      Accessories: "الإكسسوارات",
      Blog: "المدونة",
      Contact: "اتصل بنا",
      Wishlist: "المفضلة",
      Login: "تسجيل الدخول",
      "Sign Up": "إنشاء حساب",
      Search: "بحث",
      "Shop Now": "تسوق الآن",
      "Learn More": "اعرف المزيد",
      "Flash Deals": "العروض السريعة",
      Flash: "عروض",
      Deals: "سريعة",
      "View All Deals": "عرض كل العروض",
      "Shop by": "تسوق حسب",
      Category: "القسم",
      "Shop by Category": "تسوق حسب القسم",
      Featured: "منتجات",
      "Tech Collections": "تقنية مميزة",
      "Featured Tech Collections": "منتجات تقنية مميزة",
      Electronics: "الإلكترونيات",
      Mobiles: "الموبايلات",
      Appliances: "الأجهزة المنزلية",
      Audio: "الصوتيات",
      "Add to Cart": "أضف إلى السلة",
      Company: "الشركة",
      Customer: "خدمة",
      Care: "العملاء",
      "Customer Care": "خدمة العملاء",
      Payment: "طرق الدفع",
      Options: "المتاحة",
      "Payment Options": "طرق الدفع",
      "Help Center": "مركز المساعدة",
      "About Us": "من نحن",
      Careers: "الوظائف",
      "Press Releases": "البيانات الصحفية",
      "Privacy Policy": "سياسة الخصوصية",
      "Terms of Service": "شروط الخدمة",
      "Returns & Refunds": "الاسترجاع والاسترداد",
      "Track Order": "تتبع الطلب",
      "Shipping & Delivery": "الشحن والتوصيل",
      "Contact Support": "تواصل مع الدعم",
      "ALMUMEZ EXCLUSIVE • UP TO 35% OFF": "عرض حصري من المميز • خصم حتى 35%",
      "iPhone 15 Pro Max": "آيفون 15 برو ماكس",
      "& Spatial Pro Buds": "وسماعات سبيشال برو",
      "Engineered with aerospace-grade titanium, A17 Pro chip, and":
        "مصمم من تيتانيوم بدرجة صناعة الطيران، مع شريحة A17 Pro و",
      "studio-fidelity acoustic tuning. Next-day fulfillment across Cairo":
        "صوت احترافي عالي الدقة. توصيل في اليوم التالي داخل القاهرة",
      "& Alexandria through AlMumez Express.":
        "والإسكندرية عبر خدمة المميز إكسبريس.",
      Starts: "يبدأ من",
      From: "ابتداءً من",
      "Connected Living": "منزل متصل",
      Smart: "ذكي",
      "Home Revolution": "ثورة المنزل",
      "Smart Home Revolution": "ثورة المنزل الذكي",
      "Automate your ambiance &": "تحكم آليًا في أجواء منزلك و",
      "security. Up to 40% discount with AlMumez Guarantee.":
        "الأمان. خصم حتى 40% مع ضمان المميز.",
      "Student & Creator Pass": "عرض الطلاب وصناع المحتوى",
      "Back to": "العودة إلى",
      "College Tech": "تقنيات الدراسة",
      "0% Interest up to 12 months with": "تقسيط بدون فوائد حتى 12 شهرًا مع",
      "ValU & regional credit cards.": "فاليو وبطاقات الائتمان المحلية.",
      "0% Down": "بدون مقدم",
      from: "من",
      EGP: "ج.م",
      "24h Express": "توصيل سريع خلال 24 ساعة",
      Delivery: "التوصيل",
      "Cairo & Giza guaranteed": "مضمون داخل القاهرة والجيزة",
      "Secure Payment": "دفع آمن",
      "Cards, ValU, Meeza, COD": "بطاقات، فاليو، ميزة، والدفع عند الاستلام",
      "14-Day Free": "إرجاع مجاني خلال 14 يومًا",
      Returns: "الإرجاع",
      "No hassle replacement": "استبدال بدون تعقيد",
      "24/7 VIP Support": "دعم مميز على مدار الساعة",
      "WhatsApp & Phone Live": "واتساب وهاتف مباشر",
      "Ends in:": "ينتهي خلال:",
      "All 24 Departments": "كل الأقسام الـ24",
      "Explore certified tech": "اكتشف منتجات تقنية معتمدة",
      "curated across high-demand sectors":
        "مختارة بعناية من أكثر الأقسام طلبًا",
      "Mobiles &": "الهواتف و",
      Tablets: "الأجهزة اللوحية",
      Laptops: "أجهزة اللابتوب",
      "& PCs": "والكمبيوتر",
      "Audio & Sound": "الصوتيات",
      "Smart TV &": "الشاشات الذكية و",
      Video: "الفيديو",
      "Home Appliances": "الأجهزة المنزلية",
      "Gaming Gear": "معدات الألعاب",
      Items: "منتج",
      "Top-rated performance": "منتجات عالية التقييم",
      "units backed by manufacturer warranties":
        "بضمانات رسمية من الشركات المصنعة",
      Official: "ضمان",
      Warranty: "رسمي",
      New: "وصل",
      Arrival: "حديثًا",
      Best: "الأكثر",
      Seller: "مبيعًا",
      Promo: "خصم",
      Displays: "الشاشات",
      "& Monitors": "والمونيتور",
      "Laptops & Mac": "اللابتوب وماك",
      Gaming: "أجهزة",
      Consoles: "الألعاب",
      Kitchen: "المطبخ",
      "Smart Living": "الذكي",
      "Sony WF-1000XM5 Wireless Noise Canceling":
        "سماعات سوني WF-1000XM5 بعزل الضوضاء",
      "Samsung Galaxy Watch 6 Classic 47mm LTE":
        "ساعة سامسونج جالاكسي 6 كلاسيك LTE",
      "Dell G15 Core i7 13th Gen RTX 4060 16GB":
        "لابتوب ديل G15 بمعالج Core i7 وكارت RTX 4060",
      "Philips Barista Touch Smart Coffee Machine":
        "ماكينة قهوة فيليبس باريستا تاتش الذكية",
      "Anker 10,000mAh MagGo Wireless Fast Pack":
        "باور بانك أنكر MagGo اللاسلكي 10,000mAh",
      'Samsung Odyssey G9 49" OLED 240Hz 0.03ms':
        "شاشة سامسونج أوديسي G9 OLED مقاس 49 بوصة",
      'MacBook Pro 16" M3 Max 36GB Unified 1TB':
        "ماك بوك برو 16 بوصة M3 Max بسعة 1TB",
      "Sony PlayStation 5 Slim 1TB + Extra DualSense":
        "بلايستيشن 5 سليم 1TB مع ذراع إضافي",
      "Philips XXL Smart Sensing Digital Airfryer":
        "قلاية فيليبس XXL الذكية بدون زيت",
      "Claimed: 84%": "تم حجز: 84%",
      "Claimed: 62%": "تم حجز: 62%",
      "Claimed: 91%": "تم حجز: 91%",
      "Claimed: 45%": "تم حجز: 45%",
      "Claimed: 76%": "تم حجز: 76%",
      "12 Left": "متبقي 12",
      "28 Left": "متبقي 28",
      "4 Left": "متبقي 4",
      "19 Left": "متبقي 19",
      "14 Left": "متبقي 14",
      Upgrade: "ترقية",
      Pass: "مميزة",
      "PC Building & Workstations": "تجميع الكمبيوتر ومحطات العمل",
      "Custom assembly with certified": "تجميع مخصص مع اختبارات",
      "stress testing and 3-year door-to-door AlMumez warranty.":
        "ضغط معتمدة وضمان المميز لمدة 3 سنوات حتى باب المنزل.",
      "Configure Setup": "خصص جهازك",
      "Home Bundle": "باقة المنزل",
      "Kitchen Ecosystems": "منظومة المطبخ الذكي",
      "Save an extra 2,000 EGP when": "وفر 2,000 جنيه إضافية عند",
      "pairing any smart refrigerator with multi-cooker appliances.":
        "شراء ثلاجة ذكية مع أحد أجهزة الطهي المتعددة.",
      "Explore Bundles": "استكشف الباقات",
      Authenticity: "أصالة",
      Guaranteed: "مضمونة",
      Authorized: "وكلاء",
      "Regional Partner Brands": "معتمدون للعلامات العالمية",
      "AlMumez Priority Insider": "عضوية المميز الحصرية",
      Get: "احصل على خصم",
      "200 EGP Off Your First Order": "200 جنيه على طلبك الأول",
      "Subscribe for flash drop": "اشترك لتصلك إشعارات العروض السريعة",
      "notifications, exclusive warehouse sale invites, and member-only":
        "ودعوات عروض المخازن الحصرية وقسائم خاصة",
      "tech vouchers.": "بأعضاء المميز.",
      "Claim Voucher": "احصل على القسيمة",
      "Authorized Regional Tech Distributor.":
        "موزع إقليمي معتمد للمنتجات التقنية.",
      "Commercial Registry: #198273": "السجل التجاري: #198273",
      "Tax Registration: 492-811-002": "الرقم الضريبي: 492-811-002",
      "Cairo, Egypt": "القاهرة، مصر",
      Cash: "الدفع",
      "on Delivery": "عند الاستلام",
      "Claimed:": "تم حجز:",
      Left: "متبقي",
      Reviews: "مراجعة",
      "“Ordered my iPhone 15 Pro Max at 11 PM and it was delivered to New Cairo before 2 PM next day with genuine regional warranty stamps from AlMumez.”":
        "“طلبت آيفون 15 برو ماكس الساعة 11 مساءً ووصل إلى القاهرة الجديدة قبل الثانية ظهر اليوم التالي بضمان إقليمي أصلي من المميز.”",
      "“ValU 0% interest payment was completely seamless during checkout. No hidden processing charges. AlMumez Store is truly our premier tech destination.”":
        "“الدفع بالتقسيط بدون فوائد عبر فاليو كان سهلًا للغاية، بدون أي رسوم مخفية. متجر المميز هو وجهتنا الأولى للتقنية.”",
      "“Replaced an open-box display adapter within 24 hours under their 14-day policy without any hassle. Exceptional customer care team at AlMumez.”":
        "“تم استبدال محول شاشة مفتوح خلال 24 ساعة وفق سياسة الإرجاع خلال 14 يومًا دون أي تعقيد. خدمة عملاء المميز ممتازة.”",
      "Tamer M.,": "تامر م.،",
      "Nourhan S.,": "نورهان س.،",
      "Ahmed K.,": "أحمد ك.،",
      Alexandria: "الإسكندرية",
      Cairo: "القاهرة",
      Giza: "الجيزة",
      "المميز ستور - AlMumez Online Store is Egypt and the region's":
        "متجر المميز هو الموزع المعتمد في مصر والمنطقة لـ",
      "certified premier distributor for genuine consumer electronics,":
        "الإلكترونيات الاستهلاكية الأصلية،",
      "premium computing hardware, and smart lifestyle tech.":
        "وأجهزة الكمبيوتر المتقدمة وتقنيات الحياة الذكية.",
      "© 2025 AlMumez Online Store (المميز ستور). All rights reserved.":
        "© 2025 متجر المميز. جميع الحقوق محفوظة.",
    }),
  );
  Object.entries({
    "Secure Checkout": "إتمام الطلب بأمان",
    "3 quick steps — your order arrives tomorrow with Express.":
      "3 خطوات سريعة — طلبك يصلك غدًا مع التوصيل السريع.",
    Shipping: "الشحن",
    Payment: "الدفع",
    Review: "المراجعة",
    "Contact & address": "بيانات التواصل والعنوان",
    "Full name": "الاسم بالكامل",
    "Phone (WhatsApp)": "رقم الهاتف (واتساب)",
    Email: "البريد الإلكتروني",
    "Street address": "عنوان الشارع",
    City: "المدينة",
    "Apartment / Floor (optional)": "الشقة / الدور (اختياري)",
    "Delivery method": "طريقة التوصيل",
    "Express (24h)": "توصيل سريع (24 ساعة)",
    "Cairo & Giza only": "القاهرة والجيزة فقط",
    Standard: "توصيل عادي",
    "2–4 business days": "من يومين إلى 4 أيام عمل",
    "Store pickup": "الاستلام من المتجر",
    "Ready in 2 hours": "جاهز خلال ساعتين",
    Free: "مجاني",
    "Continue to payment": "المتابعة إلى الدفع",
    "Payment method": "طريقة الدفع",
    "Choose your preferred secure payment option.":
      "اختر وسيلة الدفع الآمنة المناسبة لك.",
    "Credit or debit card": "بطاقة ائتمان أو خصم",
    "Visa, Mastercard and Meeza": "فيزا وماستركارد وميزة",
    "ValU installments": "تقسيط فاليو",
    "Cash on delivery": "الدفع عند الاستلام",
    "Review order": "مراجعة الطلب",
    "Review & confirm": "المراجعة والتأكيد",
    "Check your delivery and payment details before placing the order.":
      "راجع بيانات التوصيل والدفع قبل تأكيد الطلب.",
    "I agree to the terms of service and return policy.":
      "أوافق على شروط الخدمة وسياسة الاسترجاع.",
    "Place order securely": "تأكيد الطلب بأمان",
    "Order summary": "ملخص الطلب",
    "Promo code": "كود الخصم",
    Apply: "تطبيق",
    Subtotal: "المجموع الفرعي",
    Discount: "الخصم",
    "VAT (included)": "ضريبة القيمة المضافة (مشمولة)",
    Total: "الإجمالي",
    "Genuine warranty": "ضمان أصلي",
    "14-day returns": "إرجاع خلال 14 يومًا",
    "Secure payment": "دفع آمن",
    "Order confirmed!": "تم تأكيد الطلب!",
    "Continue shopping": "متابعة التسوق",
  }).forEach(([english, arabic]) => translations.set(english, arabic));
  const mobileNav = document.querySelector(".home-navigation > div");
  if (mobileNav && !mobileNav.querySelector(".mobile-menu-login"))
    mobileNav.insertAdjacentHTML(
      "beforeend",
      '<a class="mobile-menu-login text-slate-600 hover:text-navy-dark font-semibold transition-colors duration-150 pb-1" href="auth.html"><span class="material-symbols-outlined">login</span><span>Login</span></a>',
    );
  const originalTexts = new WeakMap();
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (
          !node.textContent.trim() ||
          !parent ||
          parent.matches("script,style,.material-symbols-outlined")
        )
          return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );
  const translatableNodes = [];
  while (walker.nextNode()) {
    translatableNodes.push(walker.currentNode);
    originalTexts.set(walker.currentNode, walker.currentNode.textContent);
  }
  function applyLanguage(nextLanguage) {
    language = nextLanguage;
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.body.classList.toggle("is-arabic", language === "ar");
    translatableNodes.forEach((node) => {
      const original = originalTexts.get(node);
      if (language !== "ar") {
        node.textContent = original;
        return;
      }
      let translated = original;
      [...translations.entries()]
        .sort((a, b) => b[0].length - a[0].length)
        .forEach(([english, arabic]) => {
          translated = translated.replaceAll(english, arabic);
        });
      node.textContent = translated;
    });
    if (searchInput)
      searchInput.placeholder =
        language === "ar"
          ? "ابحث عن المنتجات والإكسسوارات واللابتوب..."
          : "Search genuine electronics, accessories, laptops...";
    if (languageToggle) {
      const labels = [...languageToggle.querySelectorAll("span")].filter(
        (span) => !span.classList.contains("material-symbols-outlined"),
      );
      if (labels[0])
        labels[0].textContent = language === "ar" ? "العربية" : "English";
      if (labels[1]) labels[1].hidden = true;
      languageToggle.setAttribute(
        "aria-label",
        language === "ar"
          ? "اللغة الحالية: العربية"
          : "Current language: English",
      );
    }
    const productLanguage = document.querySelector(".product-language-button");
    if (productLanguage) {
      const label = [...productLanguage.querySelectorAll("span")].find(
        (span) => !span.classList.contains("material-symbols-outlined"),
      );
      if (label) label.textContent = language === "ar" ? "العربية" : "English";
      productLanguage.setAttribute(
        "aria-label",
        language === "ar"
          ? "اللغة الحالية: العربية"
          : "Current language: English",
      );
    }
    renderState();
  }
  const languageToggle =
    document.querySelector(".home-language-toggle") ||
    [...document.querySelectorAll("div")].find(
      (node) =>
        /العربية/.test(node.textContent) &&
        /\/\s*EN/.test(node.textContent) &&
        node.querySelector(".material-symbols-outlined")?.textContent.trim() ===
          "language",
    );
  languageToggle?.classList.add("language-toggle");
  languageToggle?.addEventListener("click", () =>
    applyLanguage(language === "en" ? "ar" : "en"),
  );
  languageToggle?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      applyLanguage(language === "en" ? "ar" : "en");
    }
  });
  languageToggle?.setAttribute("role", "button");
  languageToggle?.setAttribute("tabindex", "0");
  if (isAccessoriesPage) {
    const aside = document.querySelector("main aside"),
      productGrid = productCards[0]?.card.parentElement,
      sortSelect = document.querySelector("#sort-select"),
      range = aside?.querySelector('input[type="range"]'),
      numberInputs = [
        ...(aside?.querySelectorAll('input[type="number"]') || []),
      ],
      brandNames = ["Apple", "Samsung", "Xiaomi", "Sony", "Dell", "Anker"];
    productCards.forEach((product) => {
      const favorite = product.card.querySelector("button.absolute");
      if (favorite) {
        favorite.dataset.toggleWishlist = product.id;
        favorite.title = "Add to Wishlist";
        favorite.setAttribute("aria-label", `Add ${product.name} to wishlist`);
        product.wishlistButton = favorite;
      }
    });
    const brandChecks = [...(aside?.querySelectorAll("label") || [])]
      .map((label) => ({
        label,
        input: label.querySelector("input"),
        brand: brandNames.find((brand) =>
          label.textContent.trim().startsWith(brand),
        ),
      }))
      .filter((item) => item.input && item.brand);
    const ratingRadios = [
        ...(aside?.querySelectorAll('input[type="radio"]') || []),
      ],
      storageButtons = [...(aside?.querySelectorAll("button") || [])].filter(
        (button) => /^(128GB|256GB|512GB|1TB)$/.test(button.textContent.trim()),
      ),
      categoryLinks = [...(aside?.querySelectorAll("ul a") || [])],
      availability = [...(aside?.querySelectorAll("label") || [])]
        .filter((label) =>
          /In Stock Only|On Sale \/ Deals|Express Cairo Delivery/.test(
            label.textContent,
          ),
        )
        .map((label) => ({ label, input: label.querySelector("input") }));
    const appliedRow = [...document.querySelectorAll("div")].find(
        (node) => node.firstElementChild?.textContent.trim() === "Applied:",
      ),
      countNode = [...document.querySelectorAll("span")].find((node) =>
        /Showing \d+ Products/.test(node.textContent),
      );
    const toolbar = sortSelect?.closest(".bg-white"),
      toolbarTop = toolbar?.firstElementChild;
    if (toolbarTop) {
      const mobileFilter = document.createElement("button");
      mobileFilter.type = "button";
      mobileFilter.className = "accessories-mobile-filter";
      mobileFilter.innerHTML =
        '<span class="material-symbols-outlined">tune</span><span>Filters</span>';
      mobileFilter.setAttribute("aria-expanded", "false");
      mobileFilter.addEventListener("click", () => {
        const open = aside.classList.toggle("filters-open");
        mobileFilter.setAttribute("aria-expanded", String(open));
        document.body.classList.toggle("accessories-filter-open", open);
      });
      toolbarTop.prepend(mobileFilter);
      const closeFilter = document.createElement("button");
      closeFilter.type = "button";
      closeFilter.className = "accessories-filter-close";
      closeFilter.innerHTML =
        '<span class="material-symbols-outlined">close</span>';
      closeFilter.setAttribute("aria-label", "Close filters");
      closeFilter.addEventListener("click", () => {
        aside.classList.remove("filters-open");
        mobileFilter.setAttribute("aria-expanded", "false");
        document.body.classList.remove("accessories-filter-open");
      });
      aside.firstElementChild?.prepend(closeFilter);
    }
    const originalOrder = [...productCards],
      productMeta = new Map(
        productCards.map((product, index) => [
          product.id,
          {
            storage: [256, 512, 128, 256, 256, 256, 256, 512, 64][index] || 256,
            sale: Boolean(product.oldPrice || product.discount),
            express: index !== 6,
            newest: index,
          },
        ]),
      );
    let brandFilterActive = false,
      selectedCategory = "all",
      selectedStorage = new Set(
        storageButtons
          .filter((button) => button.classList.contains("bg-brand-green/20"))
          .map((button) => button.textContent.trim()),
      ),
      view = "grid";
    const updateApplied = () => {
      if (!appliedRow) return;
      [...appliedRow.querySelectorAll("[data-applied-filter]")].forEach(
        (node) => node.remove(),
      );
      const tags = [];
      if (selectedCategory !== "all")
        tags.push({
          type: "category",
          value: selectedCategory,
          label: selectedCategory,
        });
      if (brandFilterActive)
        brandChecks
          .filter((item) => item.input.checked)
          .forEach((item) =>
            tags.push({ type: "brand", value: item.brand, label: item.brand }),
          );
      selectedStorage.forEach((value) =>
        tags.push({ type: "storage", value, label: value }),
      );
      tags.forEach((tag) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.dataset.appliedFilter = tag.type;
        chip.dataset.filterValue = tag.value;
        chip.className =
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/15 text-primary text-xs font-bold border border-brand-green/30";
        chip.innerHTML = `${tag.label}<span class="material-symbols-outlined text-[14px]">close</span>`;
        appliedRow.append(chip);
      });
    };
    const showEmpty = (visible) => {
      document.querySelector("[data-accessories-empty]")?.remove();
      if (!visible.length)
        productGrid?.insertAdjacentHTML(
          "afterend",
          `<div data-accessories-empty class="product-empty" role="status">${language === "ar" ? "لا توجد منتجات مطابقة للفلاتر المختارة." : "No products match the selected filters."}</div>`,
        );
    };
    const updateAccessoryProducts = () => {
      let min = Math.max(0, Number(numberInputs[0]?.value || 0)),
        max = Math.max(
          0,
          Number(numberInputs[1]?.value || Number.MAX_SAFE_INTEGER),
        );
      if (min > max) [min, max] = [max, min];
      const selectedBrands = brandFilterActive
          ? brandChecks
              .filter((item) => item.input.checked)
              .map((item) => item.brand)
          : [],
        rating = ratingRadios.findIndex((input) => input.checked) === 1 ? 3 : 4,
        inStock = availability[0]?.input.checked,
        onSale = availability[1]?.input.checked,
        express = availability[2]?.input.checked;
      let visible = productCards.filter((product) => {
        const meta = productMeta.get(product.id),
          brandOk =
            !selectedBrands.length ||
            selectedBrands.some((brand) =>
              product.name.toLowerCase().startsWith(brand.toLowerCase()),
            ),
          categoryOk =
            selectedCategory === "all" || product.category === selectedCategory,
          storageOk =
            !selectedStorage.size ||
            selectedStorage.has(
              `${meta.storage === 1000 ? "1TB" : `${meta.storage}GB`}`,
            ),
          priceOk = product.price >= min && product.price <= max,
          ratingOk = product.rating >= rating,
          statusOk =
            (!inStock || product.stock > 0) &&
            (!onSale || meta.sale) &&
            (!express || meta.express),
          show =
            brandOk &&
            categoryOk &&
            storageOk &&
            priceOk &&
            ratingOk &&
            statusOk;
        product.card.hidden = !show;
        return show;
      });
      const option = sortSelect?.selectedOptions[0]?.textContent || "";
      if (/Price: Low/i.test(option)) visible.sort((a, b) => a.price - b.price);
      else if (/Price: High/i.test(option))
        visible.sort((a, b) => b.price - a.price);
      else if (/Rating/i.test(option))
        visible.sort((a, b) => b.rating - a.rating);
      else if (/Newest/i.test(option))
        visible.sort(
          (a, b) => productMeta.get(b.id).newest - productMeta.get(a.id).newest,
        );
      else
        visible.sort(
          (a, b) => originalOrder.indexOf(a) - originalOrder.indexOf(b),
        );
      visible.forEach((product) => productGrid?.append(product.card));
      if (countNode)
        countNode.textContent = `Showing ${visible.length} Products`;
      productGrid?.classList.toggle("accessories-list-view", view === "list");
      productGrid?.classList.toggle(
        "accessories-compact-view",
        view === "compact",
      );
      updateApplied();
      showEmpty(visible);
      return visible.length;
    };
    brandChecks.forEach((item) =>
      item.input.addEventListener("change", () => {
        brandFilterActive = true;
        updateAccessoryProducts();
      }),
    );
    ratingRadios.forEach((input) =>
      input.addEventListener("change", updateAccessoryProducts),
    );
    availability.forEach((item) =>
      item.input?.addEventListener("change", updateAccessoryProducts),
    );
    sortSelect?.addEventListener("change", updateAccessoryProducts);
    range?.addEventListener("input", () => {
      if (numberInputs[1]) numberInputs[1].value = range.value;
      updateAccessoryProducts();
    });
    numberInputs.forEach((input) =>
      input.addEventListener("input", updateAccessoryProducts),
    );
    const applyPrice = [...(aside?.querySelectorAll("button") || [])].find(
      (button) => button.title === "Apply filter",
    );
    applyPrice?.addEventListener("click", updateAccessoryProducts);
    const viewButtons = [...document.querySelectorAll('button[title$="View"]')];
    viewButtons.forEach((button, index) =>
      button.addEventListener("click", () => {
        view = index === 1 ? "compact" : index === 2 ? "list" : "grid";
        viewButtons.forEach((item) =>
          item.classList.toggle("accessory-view-active", item === button),
        );
        updateAccessoryProducts();
      }),
    );
    categoryLinks.forEach((link, index) =>
      link.addEventListener("click", (event) => {
        event.preventDefault();
        selectedCategory =
          [
            "mobiles",
            "electronics",
            "electronics",
            "audio",
            "mobiles",
            "mobiles",
          ][index] || "all";
        categoryLinks.forEach((item) =>
          item.classList.toggle("accessory-category-active", item === link),
        );
        updateAccessoryProducts();
      }),
    );
    storageButtons.forEach((button) =>
      button.addEventListener("click", () => {
        const value = button.textContent.trim();
        selectedStorage.has(value)
          ? selectedStorage.delete(value)
          : selectedStorage.add(value);
        button.classList.toggle(
          "accessory-storage-active",
          selectedStorage.has(value),
        );
        updateAccessoryProducts();
      }),
    );
    appliedRow?.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-applied-filter]");
      if (!chip) return;
      if (chip.dataset.appliedFilter === "brand") {
        const item = brandChecks.find(
          (entry) => entry.brand === chip.dataset.filterValue,
        );
        if (item) item.input.checked = false;
      } else if (chip.dataset.appliedFilter === "storage")
        selectedStorage.delete(chip.dataset.filterValue);
      else if (chip.dataset.appliedFilter === "category") {
        selectedCategory = "all";
        categoryLinks.forEach((link) =>
          link.classList.remove("accessory-category-active"),
        );
      }
      updateAccessoryProducts();
    });
    const reset = () => {
      brandFilterActive = false;
      selectedCategory = "all";
      selectedStorage.clear();
      brandChecks.forEach((item) => (item.input.checked = false));
      availability.forEach((item) => {
        if (item.input) item.input.checked = false;
      });
      storageButtons.forEach((button) =>
        button.classList.remove("accessory-storage-active"),
      );
      categoryLinks.forEach((link) =>
        link.classList.remove("accessory-category-active"),
      );
      if (range) range.value = 70000;
      if (numberInputs[0]) numberInputs[0].value = 1000;
      if (numberInputs[1]) numberInputs[1].value = 70000;
      if (ratingRadios[1]) ratingRadios[1].checked = true;
      if (sortSelect) sortSelect.selectedIndex = 0;
      updateAccessoryProducts();
    };
    [...document.querySelectorAll("button")]
      .filter((button) =>
        /Reset All|Clear All Filters/.test(
          button.textContent.replace(/\s+/g, " ").trim(),
        ),
      )
      .forEach((button) => button.addEventListener("click", reset));
    const pagination = [
      ...document.querySelectorAll("main section button"),
    ].filter((button) =>
      /^(Prev|Next|\d+)$/.test(button.textContent.replace(/\s+/g, " ").trim()),
    );
    pagination.forEach((button) =>
      button.addEventListener("click", () => {
        pagination
          .filter((item) => /^\d+$/.test(item.textContent.trim()))
          .forEach((item) => item.classList.remove("accessory-page-active"));
        if (/^\d+$/.test(button.textContent.trim()))
          button.classList.add("accessory-page-active");
        productGrid?.scrollIntoView({ behavior: "smooth", block: "start" });
      }),
    );
    reset();
  }
  if (isCheckoutPage) {
    const form = document.querySelector("#checkout-form"),
      stages = [...document.querySelectorAll("[data-stage]")],
      stepButtons = [...document.querySelectorAll("[data-checkout-step]")],
      itemsList = document.querySelector("[data-checkout-items]"),
      promoInput = document.querySelector(".checkout-promo input"),
      promoButton = document.querySelector(".checkout-promo button"),
      promoMessage = document.querySelector(".checkout-promo-message"),
      success = document.querySelector(".checkout-success");
    let currentStep = 1,
      delivery = "express",
      shipping = 150,
      payment = "card",
      discount = 0;
    const esc = (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
          })[char],
      );
    const error = (input, message = "") => {
      const label = input.closest("label"),
        small = label?.querySelector("small");
      label?.classList.toggle("has-error", Boolean(message));
      if (small) small.textContent = message;
    };
    const validateContact = () => {
      let valid = true;
      form
        .querySelectorAll('[data-stage="1"] input[required]')
        .forEach((input) => {
          let message = "";
          if (!input.value.trim())
            message =
              language === "ar" ? "هذا الحقل مطلوب" : "This field is required";
          else if (!input.checkValidity())
            message =
              language === "ar" ? "أدخل بيانات صحيحة" : "Enter a valid value";
          error(input, message);
          if (message) valid = false;
        });
      return valid;
    };
    const validatePayment = () => {
      if (payment !== "card") return true;
      const checks = [
        [form.elements.cardNumber, /^\d{16}$/],
        [form.elements.expiry, /^(0[1-9]|1[0-2])\/\d{2}$/],
        [form.elements.cvv, /^\d{3,4}$/],
      ];
      let valid = true;
      checks.forEach(([input, pattern]) => {
        const value =
            input.name === "cardNumber"
              ? input.value.replace(/\s/g, "")
              : input.value,
          message = pattern.test(value)
            ? ""
            : language === "ar"
              ? "أدخل بيانات البطاقة بشكل صحيح"
              : "Enter valid card details";
        error(input, message);
        if (message) valid = false;
      });
      return valid;
    };
    const renderReview = () => {
      const data = new FormData(form),
        box = document.querySelector("[data-checkout-review]");
      box.innerHTML = `<article><span class="material-symbols-outlined">local_shipping</span><div><b>Delivery</b><p>${esc(data.get("fullName"))} · ${esc(data.get("phone"))}<br>${esc(data.get("address"))}, ${esc(data.get("city"))}<br>${delivery === "express" ? "Express (24h)" : delivery === "standard" ? "Standard delivery" : "Store pickup"}</p></div><button type="button" data-edit-step="1">Edit</button></article><article><span class="material-symbols-outlined">payments</span><div><b>Payment</b><p>${payment === "card" ? "Card ending in " + esc(String(data.get("cardNumber")).replace(/\s/g, "").slice(-4)) : payment === "valu" ? "ValU installments" : "Cash on delivery"}</p></div><button type="button" data-edit-step="2">Edit</button></article>`;
    };
    const goStep = (step) => {
      currentStep = step;
      stages.forEach((stage) => {
        const active = Number(stage.dataset.stage) === step;
        stage.hidden = !active;
        stage.classList.toggle("is-active", active);
      });
      stepButtons.forEach((button, index) => {
        const number = index + 1;
        button.disabled = number > step;
        button.classList.toggle("is-active", number === step);
        button.classList.toggle("is-complete", number < step);
      });
      if (step === 3) renderReview();
      document
        .querySelector(".checkout-steps")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    renderCheckout = () => {
      const subtotal = cart.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        total = Math.max(0, subtotal + shipping - discount);
      itemsList.innerHTML = cart.length
        ? cart
            .map(
              (item) =>
                `<li><div><img src="${item.image}" alt="${esc(item.name)}"><span>${item.quantity}</span></div><p>${esc(item.name)}</p><strong>${money(item.price * item.quantity)}</strong></li>`,
            )
            .join("")
        : `<li class="checkout-summary-empty">${language === "ar" ? "سلة التسوق فارغة" : "Your cart is empty"}</li>`;
      document.querySelector("[data-checkout-subtotal]").textContent =
        money(subtotal);
      document.querySelector("[data-checkout-shipping]").textContent = shipping
        ? money(shipping)
        : language === "ar"
          ? "مجاني"
          : "Free";
      document.querySelector("[data-checkout-discount]").textContent = discount
        ? `-${money(discount)}`
        : "0 EGP";
      document.querySelector("[data-checkout-total]").textContent =
        money(total);
    };
    document.querySelectorAll("[data-delivery]").forEach((button) =>
      button.addEventListener("click", () => {
        delivery = button.dataset.delivery;
        shipping = Number(button.dataset.price);
        document
          .querySelectorAll("[data-delivery]")
          .forEach((item) =>
            item.classList.toggle("is-selected", item === button),
          );
        renderCheckout();
      }),
    );
    document.querySelectorAll("[data-payment]").forEach((button) =>
      button.addEventListener("click", () => {
        payment = button.dataset.payment;
        document
          .querySelectorAll("[data-payment]")
          .forEach((item) =>
            item.classList.toggle("is-selected", item === button),
          );
        document.querySelector("[data-card-fields]").hidden =
          payment !== "card";
      }),
    );
    document.querySelectorAll("[data-checkout-next]").forEach((button) =>
      button.addEventListener("click", () => {
        const next = Number(button.dataset.checkoutNext);
        if (!cart.length)
          return toast(
            language === "ar" ? "السلة فارغة" : "Your cart is empty",
          );
        if (currentStep === 1 && !validateContact())
          return toast(
            language === "ar"
              ? "راجع بيانات الشحن"
              : "Check your shipping details",
          );
        if (currentStep === 2 && !validatePayment())
          return toast(
            language === "ar"
              ? "راجع بيانات الدفع"
              : "Check your payment details",
          );
        goStep(next);
      }),
    );
    document
      .querySelectorAll("[data-checkout-back]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          goStep(Number(button.dataset.checkoutBack)),
        ),
      );
    form.addEventListener("input", (event) => {
      if (!event.target.matches("input")) return;
      error(event.target);
      if (event.target.name === "cardNumber")
        event.target.value = event.target.value
          .replace(/\D/g, "")
          .slice(0, 16)
          .replace(/(.{4})/g, "$1 ")
          .trim();
      if (event.target.name === "expiry") {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
        event.target.value =
          digits.length > 2
            ? `${digits.slice(0, 2)}/${digits.slice(2)}`
            : digits;
      }
      if (event.target.name === "cvv")
        event.target.value = event.target.value.replace(/\D/g, "").slice(0, 4);
    });
    promoButton.addEventListener("click", () => {
      const valid = promoInput.value.trim().toUpperCase() === "MUMEZ25";
      discount =
        valid && cart.length
          ? Math.min(
              500,
              cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
            )
          : 0;
      promoMessage.textContent = valid
        ? language === "ar"
          ? "تم تطبيق خصم 500 جنيه"
          : "500 EGP discount applied"
        : language === "ar"
          ? "كود الخصم غير صحيح"
          : "Invalid promo code";
      promoMessage.classList.toggle("is-error", !valid);
      renderCheckout();
    });
    document
      .querySelector("[data-checkout-review]")
      .addEventListener("click", (event) => {
        const edit = event.target.closest("[data-edit-step]");
        if (edit) goStep(Number(edit.dataset.editStep));
      });
    document
      .querySelector("[data-open-cart]")
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        openDrawer("cart");
      });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.elements.terms.checked)
        return toast(
          language === "ar"
            ? "وافق على الشروط أولًا"
            : "Please accept the terms first",
        );
      if (!cart.length)
        return toast(language === "ar" ? "السلة فارغة" : "Your cart is empty");
      form.hidden = true;
      success.hidden = false;
      cart = [];
      save(CART_KEY, cart);
      renderState();
      renderCheckout();
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    renderCheckout();
  }
  if (isProductPage) {
    const buttons = [...document.querySelectorAll("main button")],
      byText = (text) =>
        buttons.find((button) => button.textContent.includes(text)),
      addButton = byText("Add to Cart"),
      buyButton = byText("Buy Now"),
      bundleSection = [...document.querySelectorAll("main section")].find(
        (section) => section.textContent.includes("Frequently Bought Together"),
      ),
      mainImage = document.querySelector("#mainProductImage"),
      thumbButtons = [
        ...document.querySelectorAll(
          "main section:first-child .grid.grid-cols-4 button",
        ),
      ],
      storageButtons = [...document.querySelectorAll("main [data-storage]")];
    productDetails.suggestions.forEach((item) => {
      if (!products.some((product) => product.id === item.id))
        products.push(item);
    });
    if (addButton) addButton.dataset.addToCart = activeProduct.id;
    const productWishlist = buttons.find((button) =>
        /Wishlist/.test(button.title || ""),
      ),
      floatingWishlist = mainImage?.closest(".group")?.querySelector("button");
    [productWishlist, floatingWishlist].filter(Boolean).forEach((button) => {
      button.dataset.toggleWishlist = activeProduct.id;
      button.dataset.productWishlist = "true";
      button.setAttribute(
        "aria-pressed",
        String(wishlist.some((item) => item.id === activeProduct.id)),
      );
    });
    const counter = addButton?.parentElement?.querySelector(".rounded-full"),
      counterValue = counter?.querySelector(
        "span:not(.material-symbols-outlined)",
      );
    counter?.querySelectorAll("button").forEach((button) => {
      button.type = "button";
      button.setAttribute(
        "aria-label",
        button.textContent.trim() === "add"
          ? "Increase quantity"
          : "Decrease quantity",
      );
      button.addEventListener("click", () => {
        purchaseQuantity = Math.max(
          1,
          purchaseQuantity + (button.textContent.trim() === "add" ? 1 : -1),
        );
        counterValue.textContent = purchaseQuantity;
      });
    });
    let galleryIndex = 0,
      touchStartX = 0;
    productDetails.images.forEach((src) => {
      const image = new Image();
      image.src = src;
    });
    const showGalleryImage = (index, fromLightbox = false) => {
      galleryIndex =
        (index + productDetails.images.length) % productDetails.images.length;
      const src = productDetails.images[galleryIndex];
      mainImage.classList.add("product-image-fade");
      setTimeout(() => {
        mainImage.src = src;
        mainImage.alt = `${configuredProduct().name} — view ${galleryIndex + 1}`;
        mainImage.classList.remove("product-image-fade");
      }, 120);
      thumbButtons.forEach((button, i) => {
        const active = i === galleryIndex;
        button.classList.toggle("border-2", active);
        button.classList.toggle("border-primary-container", active);
        button.classList.toggle("border", !active);
        button.classList.toggle("border-surface-container-high", !active);
        button.setAttribute("aria-pressed", String(active));
      });
      if (fromLightbox) {
        const lightboxImage = document.querySelector(".product-lightbox img"),
          counter = document.querySelector(".product-lightbox-counter");
        if (lightboxImage) lightboxImage.src = src;
        if (counter)
          counter.textContent = `${galleryIndex + 1} / ${productDetails.images.length}`;
      }
    };
    thumbButtons.forEach((button, index) => {
      const image = button.querySelector("img");
      if (image) {
        image.src = productDetails.images[index];
        image.alt = `${activeProduct.name} view ${index + 1}`;
      }
      button.type = "button";
      button.setAttribute("aria-label", `Show product image ${index + 1}`);
      button.setAttribute("aria-pressed", String(index === 0));
      button.addEventListener("click", () => showGalleryImage(index));
    });
    const galleryCard = mainImage?.parentElement,
      zoomButton = galleryCard?.querySelector(".absolute.bottom-3");
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="product-lightbox" hidden role="dialog" aria-modal="true" aria-label="Product image viewer"><button type="button" class="product-lightbox-close" aria-label="Close image viewer">×</button><button type="button" class="product-lightbox-arrow prev" aria-label="Previous image">‹</button><figure><img src="${productDetails.images[0]}" alt="${activeProduct.name}"><figcaption class="product-lightbox-counter">1 / ${productDetails.images.length}</figcaption></figure><button type="button" class="product-lightbox-arrow next" aria-label="Next image">›</button></div>`,
    );
    const lightbox = document.querySelector(".product-lightbox"),
      closeLightbox = () => {
        lightbox.hidden = true;
        document.body.classList.remove("drawer-open");
      },
      openLightbox = () => {
        showGalleryImage(galleryIndex, true);
        lightbox.hidden = false;
        document.body.classList.add("drawer-open");
        lightbox.querySelector(".product-lightbox-close").focus();
      };
    zoomButton?.setAttribute("role", "button");
    zoomButton?.setAttribute("tabindex", "0");
    zoomButton?.setAttribute("aria-label", "Zoom product image");
    zoomButton?.addEventListener("click", openLightbox);
    zoomButton?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox();
      }
    });
    lightbox
      .querySelector(".prev")
      .addEventListener("click", () =>
        showGalleryImage(galleryIndex - 1, true),
      );
    lightbox
      .querySelector(".next")
      .addEventListener("click", () =>
        showGalleryImage(galleryIndex + 1, true),
      );
    lightbox
      .querySelector(".product-lightbox-close")
      .addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (event.target.matches("input,textarea,select")) return;
      if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
      if (event.key === "ArrowRight")
        showGalleryImage(galleryIndex + 1, !lightbox.hidden);
      if (event.key === "ArrowLeft")
        showGalleryImage(galleryIndex - 1, !lightbox.hidden);
    });
    galleryCard?.addEventListener(
      "touchstart",
      (event) => (touchStartX = event.changedTouches[0].clientX),
      { passive: true },
    );
    galleryCard?.addEventListener(
      "touchend",
      (event) => {
        const delta = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) > 45)
          showGalleryImage(galleryIndex + (delta < 0 ? 1 : -1));
      },
      { passive: true },
    );
    galleryCard?.addEventListener("mousemove", (event) => {
      if (matchMedia("(hover:hover) and (pointer:fine)").matches) {
        const rect = galleryCard.getBoundingClientRect();
        mainImage.style.transformOrigin = `${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`;
        mainImage.style.transform = "scale(1.1)";
      }
    });
    galleryCard?.addEventListener("mouseleave", () => {
      mainImage.style.transform = "";
      mainImage.style.transformOrigin = "";
    });
    const specRows = [
        ...document.querySelectorAll("main section:last-of-type > .mt-6 > div"),
      ],
      currentPriceRow = specRows.find((row) =>
        /Current Price/i.test(row.textContent),
      ),
      previousPriceRow = specRows.find((row) =>
        /Previous Price/i.test(row.textContent),
      ),
      title = document.querySelector("main h1"),
      breadcrumb = document.querySelector(
        'nav[aria-label="Breadcrumb"] li:last-child',
      ),
      skuNode = [...document.querySelectorAll("main .text-outline")].find(
        (node) => node.textContent.includes("SKU:"),
      ),
      priceNode = document.querySelector("main .text-headline-lg"),
      oldPriceNode = priceNode?.parentElement?.querySelector(".line-through"),
      discountNode = priceNode?.parentElement?.querySelector(
        ".bg-primary-container",
      ),
      monthlyNode = [...document.querySelectorAll("main strong")].find((node) =>
        /EGP\/month/.test(node.textContent),
      );
    const selectedSuggestions = new Set(
      productDetails.suggestions.map((item) => item.id),
    );
    let renderBundle = () => {};
    const updateProductPricing = () => {
      const configured = configuredProduct(),
        saving = Math.max(0, configured.oldPrice - configured.price);
      [
        priceNode,
        monthlyNode,
        currentPriceRow?.querySelector("span:last-child"),
        previousPriceRow?.querySelector("span:last-child"),
      ]
        .filter(Boolean)
        .forEach((node) => {
          node.classList.add("price-updating");
          setTimeout(() => node.classList.remove("price-updating"), 260);
        });
      priceNode.textContent = money(configured.price);
      if (oldPriceNode) {
        oldPriceNode.textContent = configured.oldPrice
          ? money(configured.oldPrice)
          : "";
        oldPriceNode.hidden = !configured.oldPrice;
      }
      if (discountNode)
        discountNode.textContent = saving
          ? `Save ${money(saving)}`
          : "Best Price";
      if (monthlyNode)
        monthlyNode.textContent = `${money(Math.ceil(configured.price / 12))}/month`;
      if (currentPriceRow?.querySelector("span:last-child"))
        currentPriceRow.querySelector("span:last-child").textContent = money(
          configured.price,
        );
      if (previousPriceRow?.querySelector("span:last-child"))
        previousPriceRow.querySelector("span:last-child").textContent =
          configured.oldPrice ? money(configured.oldPrice) : "—";
      if (title) title.textContent = configured.name;
      if (breadcrumb) breadcrumb.textContent = configured.name;
      if (skuNode) skuNode.textContent = `SKU: ${configured.sku}`;
      storageButtons.forEach((button, index) => {
        const value = [256, 512, 1024][index],
          active = value === selectedProductStorage;
        button.classList.toggle("border-2", active);
        button.classList.toggle("border-primary-container", active);
        button.classList.toggle("bg-primary-container/10", active);
        button.classList.toggle("border", !active);
        button.classList.toggle("border-surface-container-high", !active);
        button.setAttribute("aria-pressed", String(active));
        const price = button.querySelector("span:last-child");
        if (price)
          price.textContent =
            value === 256
              ? money(productDetails.storagePrices[value])
              : `+${money(productDetails.storagePrices[value] - productDetails.storagePrices[256])}`;
      });
      const url = new URL(location.href);
      url.searchParams.set("id", activeProduct.id);
      url.searchParams.set("storage", selectedProductStorage);
      history.replaceState(null, "", url);
      renderBundle();
    };
    storageButtons.forEach((button) => {
      const value = Number(button.dataset.storage);
      button.type = "button";
      button.setAttribute(
        "aria-label",
        `Select ${storageLabel(value)} storage`,
      );
      button.addEventListener("click", () => {
        selectedProductStorage = value;
        updateProductPricing();
      });
    });
    if (bundleSection) {
      const itemsWrap = bundleSection.querySelector(
          ".flex.flex-wrap.items-center.justify-center",
        ),
        pricing = [...bundleSection.querySelectorAll("div")].find(
          (node) =>
            node.textContent.includes("Bundle Total") &&
            node.querySelector("button"),
        ),
        totalNode = pricing?.querySelector(".font-headline-sm"),
        originalNode = pricing?.querySelector(".line-through"),
        labelNode = pricing?.querySelector("p.text-xs"),
        bundleButton = pricing?.querySelector("button"),
        saveBadge = [...bundleSection.querySelectorAll("span")].find((node) =>
          /Save .* Extra/.test(node.textContent),
        );
      renderBundle = () => {
        const configured = configuredProduct(),
          entries = [
            {
              ...configured,
              subtitle: storageLabel(selectedProductStorage),
              fixed: true,
            },
            ...productDetails.suggestions,
          ],
          chosen = entries.filter(
            (item) => item.fixed || selectedSuggestions.has(item.id),
          ),
          original = chosen.reduce(
            (sum, item) => sum + (item.oldPrice || item.price),
            0,
          ),
          raw = chosen.reduce((sum, item) => sum + item.price, 0),
          discountValue = selectedSuggestions.size
            ? Math.min(productDetails.bundleDiscount, raw)
            : 0,
          total = raw - discountValue;
        itemsWrap.innerHTML = entries
          .map(
            (item, index) =>
              `<${item.fixed ? "div" : "button"} class="bundle-item-1 bundle-choice ${item.fixed || selectedSuggestions.has(item.id) ? "is-selected" : ""}" ${item.fixed ? 'aria-label="Main product always included"' : `type="button" data-bundle-toggle="${item.id}" aria-pressed="${selectedSuggestions.has(item.id)}"`}><span class="bundle-check material-symbols-outlined">${item.fixed || selectedSuggestions.has(item.id) ? "check_circle" : "radio_button_unchecked"}</span><img src="${item.fixed ? productDetails.images[0] : item.image}" alt="${item.name}" data-bundle-open="${item.id}"><div><p class="font-label-md text-label-md font-bold text-on-surface" data-bundle-open="${item.id}">${item.name}</p><p class="text-xs text-outline">${item.subtitle || item.category}</p><p class="font-label-sm text-label-sm font-bold text-inverse-surface mt-1">${money(item.price)}</p></div></${item.fixed ? "div" : "button"}>${index < entries.length - 1 ? '<span class="bundle-plus">+</span>' : ""}`,
          )
          .join("");
        if (labelNode)
          labelNode.textContent = `Bundle Total (${chosen.length} item${chosen.length === 1 ? "" : "s"}):`;
        if (totalNode) totalNode.textContent = money(total);
        if (originalNode) {
          originalNode.textContent = money(original);
          originalNode.hidden = !discountValue;
        }
        if (saveBadge)
          saveBadge.textContent = discountValue
            ? `Save ${money(discountValue)} Extra`
            : "Choose extras to save";
        bundleButton.disabled = !selectedSuggestions.size;
        bundleButton.textContent = selectedSuggestions.size
          ? `Add All ${chosen.length} to Cart`
          : "Select an extra item";
      };
      itemsWrap.addEventListener("click", (event) => {
        const open = event.target.closest("[data-bundle-open]");
        if (open && event.target.closest("[data-bundle-toggle]") == null) {
          const item = entries.find(
            (entry) => entry.id === open.dataset.bundleOpen,
          );
          if (item && !item.fixed) {
            save(SELECTED_PRODUCT_KEY, item);
            location.href = `product.html?id=${encodeURIComponent(item.id)}`;
          }
          return;
        }
        const toggle = event.target.closest("[data-bundle-toggle]");
        if (!toggle) return;
        selectedSuggestions.has(toggle.dataset.bundleToggle)
          ? selectedSuggestions.delete(toggle.dataset.bundleToggle)
          : selectedSuggestions.add(toggle.dataset.bundleToggle);
        renderBundle();
      });
      bundleButton.addEventListener("click", () => {
        if (!selectedSuggestions.size) return;
        addToCart(activeProduct.id, {
          storage: selectedProductStorage,
          price: configuredProduct().price,
          quantity: 1,
        });
        productDetails.suggestions
          .filter((item) => selectedSuggestions.has(item.id))
          .forEach((item) =>
            addToCart(item.id, { price: item.price, quantity: 1 }),
          );
        toast(
          language === "ar"
            ? "تمت إضافة الباقة إلى السلة"
            : "Bundle added to cart",
        );
      });
    }
    const syncBundleBeforeDiscount = () => {
      if (!bundleSection) return;
      const pricing = [...bundleSection.querySelectorAll("div")].find(
          (node) =>
            node.textContent.includes("Bundle Total") &&
            node.querySelector("button"),
        ),
        total = pricing?.querySelector(".font-headline-sm"),
        before = pricing?.querySelector(".line-through"),
        action = pricing?.querySelector("button");
      if (action) action.setAttribute("aria-disabled", String(action.disabled));
      if (!total || !before) return;
      const totalValue = Number(total.textContent.replace(/[^0-9]/g, ""));
      before.textContent = money(
        totalValue +
          (selectedSuggestions.size ? productDetails.bundleDiscount : 0),
      );
    };
    const bundleTotalNode = bundleSection?.querySelector(".font-headline-sm");
    if (bundleTotalNode)
      new MutationObserver(syncBundleBeforeDiscount).observe(bundleTotalNode, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    syncBundleBeforeDiscount();
    bundleSection?.addEventListener(
      "click",
      (event) => {
        const open = event.target.closest("[data-bundle-open]");
        if (!open) return;
        const item = productDetails.suggestions.find(
          (entry) => entry.id === open.dataset.bundleOpen,
        );
        if (!item) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        save(SELECTED_PRODUCT_KEY, item);
        location.href = `product.html?id=${encodeURIComponent(item.id)}`;
      },
      true,
    );
    bundleSection?.addEventListener(
      "keydown",
      (event) => {
        const open = event.target.closest("[data-bundle-open]");
        if (!open || !(event.key === "Enter" || event.key === " ")) return;
        const item = productDetails.suggestions.find(
          (entry) => entry.id === open.dataset.bundleOpen,
        );
        if (!item) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        save(SELECTED_PRODUCT_KEY, item);
        location.href = `product.html?id=${encodeURIComponent(item.id)}`;
      },
      true,
    );
    buttons
      .filter((button) =>
        [
          "Natural Titanium",
          "Blue Titanium",
          "White Titanium",
          "Black Titanium",
        ].includes(button.title),
      )
      .forEach((button) =>
        button.addEventListener("click", () => {
          buttons
            .filter((item) =>
              [
                "Natural Titanium",
                "Blue Titanium",
                "White Titanium",
                "Black Titanium",
              ].includes(item.title),
            )
            .forEach((item) =>
              item.classList.remove(
                "ring-2",
                "ring-primary-container",
                "ring-offset-2",
              ),
            );
          button.classList.add(
            "ring-2",
            "ring-primary-container",
            "ring-offset-2",
          );
        }),
      );
    buyButton?.addEventListener("click", () => {
      addToCart(activeProduct.id);
      location.href = "checkout.html";
    });
    const tabButtons = [
        ...document.querySelectorAll(
          "main section:last-of-type > div:first-child button",
        ),
      ],
      tabPanels = [
        ...document.querySelectorAll("main section:last-of-type > div"),
      ].slice(1);
    tabButtons.forEach((button, index) =>
      button.addEventListener("click", () => {
        tabButtons.forEach((item, i) => {
          item.classList.toggle("border-b-2", i === index);
          item.classList.toggle("border-primary-container", i === index);
          item.classList.toggle("text-inverse-surface", i === index);
          item.classList.toggle("text-outline", i !== index);
        });
        tabPanels.forEach((panel, i) => (panel.hidden = i !== index));
      }),
    );
    showGalleryImage(0);
    updateProductPricing();
  }
  document.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add-to-cart]"),
      favorite = event.target.closest("[data-toggle-wishlist]"),
      quantity = event.target.closest("[data-quantity]");
    if (add) addToCart(add.dataset.addToCart);
    if (favorite) toggleWishlist(favorite.dataset.toggleWishlist);
    if (quantity)
      changeQuantity(quantity.dataset.id, Number(quantity.dataset.quantity));
    if (event.target.closest(".home-cart-button, .product-cart-button"))
      openDrawer("cart");
    if (
      event.target.closest(
        'header a[title="Wishlist"], .product-header-wishlist',
      )
    ) {
      event.preventDefault();
      openDrawer("wishlist");
    }
    if (event.target.closest("[data-remove-cart]")) {
      const removeKey =
        event.target.closest("[data-remove-cart]").dataset.removeCart;
      cart = cart.filter((item) => (item.key || item.id) !== removeKey);
      save(CART_KEY, cart);
      renderState();
      renderCheckout();
    }
    if (event.target.closest("[data-remove-wishlist]")) {
      wishlist = wishlist.filter(
        (item) =>
          item.id !==
          event.target.closest("[data-remove-wishlist]").dataset.removeWishlist,
      );
      save(WISHLIST_KEY, wishlist);
      renderState();
    }
    if (event.target.closest("[data-wishlist-to-cart]"))
      addToCart(
        event.target.closest("[data-wishlist-to-cart]").dataset.wishlistToCart,
      );
    const close = event.target.closest("[data-close-drawer]");
    if (close) closeDrawer(close.dataset.closeDrawer);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer("cart");
      closeDrawer("wishlist");
    }
  });
  const mobileMenuButton = document.querySelector(".mobile-menu-button");
  mobileMenuButton?.addEventListener("click", (event) => {
    const nav = document.querySelector(".home-navigation"),
      open = nav.classList.toggle("is-open");
    event.currentTarget.setAttribute("aria-expanded", open);
    event.currentTarget.querySelector(
      ".material-symbols-outlined",
    ).textContent = open ? "close" : "menu";
  });
  applyLanguage(language);
})();
