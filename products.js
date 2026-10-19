(function () {
  "use strict";
  const grid = document.querySelector('[data-products-section="all-products"]');
  if (!grid || !window.StoreProducts) return;
  const params = new URLSearchParams(location.search),
    lang = localStorage.getItem("almumez-language") === "ar" ? "ar" : "en",
    placement = params.get("placement") || "",
    q = document.querySelector('[name="q"]'),
    brand = document.querySelector("[data-filter-brand]"),
    price = document.querySelector("[data-filter-price]"),
    sort = document.querySelector("[data-sort]"),
    tabs = document.querySelector("[data-catalog-tabs]"),
    count = document.querySelector("[data-catalog-count]"),
    empty = document.querySelector("[data-catalog-empty]"),
    more = document.querySelector("[data-load-more]");
  let limit = 12,
    category = params.get("category") || "";
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  q.value = params.get("q") || "";
  brand.value = params.get("brand") || "";
  price.value = params.get("price") || "";
  sort.value = params.get("sort") || "featured";
  const all = StoreProducts.read(),
    local = (product) => StoreProducts.localized(product, lang);
  [...new Set(all.map((product) => local(product).brand))]
    .sort()
    .forEach((value) =>
      brand.insertAdjacentHTML("beforeend", `<option>${value}</option>`),
    );
  const categories = [...new Set(all.map((product) => product.category))];
  tabs.innerHTML =
    `<button data-category="" class="${category ? "" : "is-active"}">${lang === "ar" ? "الكل" : "All"}</button>` +
    categories
      .map(
        (value) =>
          `<button data-category="${value}" class="${category === value ? "is-active" : ""}">${value}</button>`,
      )
      .join("");
  const sync = () => {
    const next = new URLSearchParams();
    if (q.value.trim()) next.set("q", q.value.trim());
    if (category) next.set("category", category);
    if (placement) next.set("placement", placement);
    if (brand.value) next.set("brand", brand.value);
    if (price.value) next.set("price", price.value);
    if (sort.value !== "featured") next.set("sort", sort.value);
    history.replaceState(
      null,
      "",
      `products.html${next.size ? `?${next}` : ""}`,
    );
  };
  const render = () => {
    let list = all.filter((product) => {
      const localized = local(product),
        haystack =
          `${localized.name} ${localized.brand} ${localized.subcategory}`.toLowerCase(),
        range = price.value.split("-").map(Number);
      return (
        (!placement || product.placements?.[placement] != null) &&
        (!q.value || haystack.includes(q.value.toLowerCase())) &&
        (!category || product.category === category) &&
        (!brand.value || localized.brand === brand.value) &&
        (!price.value ||
          (product.price >= range[0] && product.price <= range[1]))
      );
    });
    if (sort.value === "newest")
      list.sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      );
    if (sort.value === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort.value === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort.value === "rating") list.sort((a, b) => b.rating - a.rating);
    count.textContent = `${list.length} ${lang === "ar" ? "منتج" : "products"}`;
    grid.innerHTML = list
      .slice(0, limit)
      .map((product) => StoreCatalogUI.card(product, "products"))
      .join("");
    empty.hidden = Boolean(list.length);
    more.hidden = list.length <= limit;
    sync();
  };
  document.querySelectorAll("select,input").forEach((element) =>
    element.addEventListener(
      element.tagName === "INPUT" ? "input" : "change",
      () => {
        limit = 12;
        render();
      },
    ),
  );
  tabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    category = button.dataset.category;
    tabs
      .querySelectorAll("button")
      .forEach((item) => item.classList.toggle("is-active", item === button));
    limit = 12;
    render();
  });
  more.addEventListener("click", () => {
    limit += 12;
    render();
  });
  render();
})();
