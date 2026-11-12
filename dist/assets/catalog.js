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
function filter() {
  if (!$("#catalog-grid")) return;
  const term = $("#catalog-search").value.toLowerCase().trim(),
    cat = $("#category-filter").value;
  let n = 0;
  $$("#catalog-grid .catalog-card").forEach((c) => {
    const show =
      c.dataset.search.includes(term) &&
      (!cat || c.dataset.category === cat) &&
      (!onlySaved || saved.includes(c.dataset.id));
    c.hidden = !show;
    if (show) n++;
  });
  $("#catalog-count").textContent = n + " matching " + (n === 1 ? "listing" : "listings");
  $("#catalog-empty").classList.toggle("hidden", n > 0);
}
$$("[data-save]").forEach(saveButton);
$("#catalog-search")?.addEventListener("input", filter);
$("#category-filter")?.addEventListener("change", filter);
$("#saved-filter")?.addEventListener("click", (e) => {
  onlySaved = !onlySaved;
  e.currentTarget.setAttribute("aria-pressed", onlySaved);
  filter();
});
filter();
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
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
