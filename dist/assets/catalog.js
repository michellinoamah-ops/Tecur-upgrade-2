import { gallery } from "./content.js";
import { $, $$, read, write, toast, safeImage, money } from "./app.js";
import { connect } from "./firebase.js";
let saved = read("tecur-saved", []),
  onlySaved = false;
function saveButton(b) {
  const on = saved.includes(b.dataset.save);
  b.setAttribute("aria-pressed", on);
  b.textContent = on ? "♥" : "♡";
  b.onclick = () => {
    const id = b.dataset.save;
    saved = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    write("tecur-saved", saved);
    saveButton(b);
    filter();
  };
}
const PAGE_SIZE = 20;
let currentPage = 1;
function filter(resetPage = false) {
  if (resetPage === true) currentPage = 1;
  if (!$("#catalog-grid")) return;
  const term = $("#catalog-search").value.toLowerCase().trim(),
    cat = $("#category-filter").value;
  const cards = $$("#catalog-grid .catalog-card");
  const matches = cards.filter((c) =>
    c.dataset.search.includes(term) &&
    (!cat || c.dataset.category === cat) &&
    (!onlySaved || saved.includes(c.dataset.id))
  );
  const n = matches.length;
  const pages = Math.max(1, Math.ceil(n / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  cards.forEach((c) => { c.hidden = true; });
  matches.slice(start, start + PAGE_SIZE).forEach((c) => { c.hidden = false; });
  $("#catalog-count").textContent = n
    ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, n)} of ${n} listings`
    : "No matching listings";
  $("#catalog-count").setAttribute("aria-live", "polite");
  $("#catalog-empty").classList.toggle("hidden", n > 0);
  let nav = $("#catalog-pagination");
  if (!nav) {
    nav = el("nav", null, "catalog-pagination");
    nav.id = "catalog-pagination";
    nav.setAttribute("aria-label", "Listing pages");
    $("#catalog-grid").after(nav);
  }
  nav.replaceChildren();
  nav.hidden = pages <= 1;
  if (pages <= 1) return;
  function pageButton(label, page, disabled = false) {
    const button = el("button", label);
    button.type = "button";
    button.disabled = disabled;
    if (typeof label === "number") {
      button.setAttribute("aria-label", "Page " + page);
      if (page === currentPage) button.setAttribute("aria-current", "page");
    }
    button.onclick = () => {
      currentPage = page;
      filter();
      const grid = $("#catalog-grid");
      grid.setAttribute("tabindex", "-1");
      grid.focus({ preventScroll: true });
      grid.scrollIntoView({ block: "start", behavior: "auto" });
    };
    nav.append(button);
  }
  pageButton("Previous", currentPage - 1, currentPage === 1);
  const visible = new Set([1, pages, currentPage - 1, currentPage, currentPage + 1]);
  const numbers = [...visible].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  let previous = 0;
  for (const page of numbers) {
    if (previous && page - previous > 1) {
      const gap = el("span", "…");
      gap.setAttribute("aria-hidden", "true");
      nav.append(gap);
    }
    pageButton(page, page);
    previous = page;
  }
  pageButton("Next", currentPage + 1, currentPage === pages);
}
$$("[data-save]").forEach(saveButton);
$("#catalog-search")?.addEventListener("input", () => filter(true));
$("#category-filter")?.addEventListener("change", () => filter(true));
$("#saved-filter")?.addEventListener("click", (e) => {
  onlySaved = !onlySaved;
  e.currentTarget.setAttribute("aria-pressed", onlySaved);
  filter(true);
});
filter();
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function card(c) {
  const article = el("article", null, "catalog-card");
  article.dataset.id = c.id;
  article.dataset.search = [c.title, c.model, c.category].join(" ").toLowerCase();
  article.dataset.category = c.category;
  const a = el("a");
  a.href = "/listing/?id=" + encodeURIComponent(c.id);
  const img = el("img");
  img.src = safeImage(c.image);
  img.alt = c.title;
  img.loading = "lazy";
  img.width = 640;
  img.height = 430;
  const body = el("div", null, "card-body");
  body.append(
    el("span", c.category, "tag"),
    el("h3", c.title),
    el("p", c.model),
    el("div", c.price ? money(c.price) : "Request a quotation", "price"),
  );
  body.append(el("span", "View details ↗", "listing-details"));
  a.append(img, body);
  const b = el("button", "♡", "save");
  b.dataset.save = c.id;
  b.style.cssText = "position:absolute;right:15px;top:15px";
  b.setAttribute("aria-label", "Save " + c.title);
  saveButton(b);
  article.append(a, b);
  return article;
}
try {
  const f = await connect();
  const id = new URLSearchParams(location.search).get("id");
  if ($("#live-detail")) {
    if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw Error("Invalid listing");
    const snap = await f.d.getDoc(f.d.doc(f.db, "listings", id));
    if (!snap.exists() || snap.data().status !== "published") throw Error("Not found");
    const c = snap.data(),
      wrap = $("#live-detail");
    wrap.replaceChildren();
    wrap.classList.add("feature");
    const img = el("img");
    img.src = safeImage(c.image);
    img.alt = c.title;
    img.className = "detail-image";
    const content = el("div", null, "prose");
    content.append(
      el("span", c.category, "tag"),
      el("h2", c.title),
      el("p", c.description),
      el("p", "Model / fitment: " + c.model + " · " + c.year),
      el("h3", c.price ? money(c.price) : "Request a quotation"),
    );
    const a = el("a", "Enquire about this listing ↗", "btn");
    a.href = "/book/?part=" + encodeURIComponent(c.title);
    content.append(a);
    wrap.append(gallery(c.images?.length ? c.images : [c.image], c.title), content);
    document.title = c.title + " | Tecur Automotive";
  } else {
    f.d.onSnapshot(
      f.d.query(f.d.collection(f.db, "listings"), f.d.where("status", "==", "published")),
      (snap) => {
        const grid = $("#catalog-grid");
        if (!grid) return;
        grid.replaceChildren(...snap.docs.map((d) => card({ ...d.data(), id: d.id })));
        $("#catalog-status").textContent =
          "Published listings from Tecur. Confirm availability and fitment before ordering.";
        filter();
      },
      (error) => {
        console.warn("Live listings could not load:", error.code);
        if ($("#catalog-status"))
          $("#catalog-status").textContent =
            "Latest listings could not load. Please refresh or contact the team.";
      },
    );
  }
} catch (e) {
  if ($("#live-detail"))
    $("#live-detail").textContent =
      "This listing is unavailable. Please return to the parts catalogue or contact the team.";
  else if ($("#catalog-status"))
    $("#catalog-status").textContent =
      "Showing the website catalogue. Live inventory is not currently available; contact the team to confirm stock.";
}
