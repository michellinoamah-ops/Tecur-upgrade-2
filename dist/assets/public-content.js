import { enquiryExtras, startTracking } from "./enquiry-media.js";
import { $ } from "./app.js";
import { sanitize, cleanURL, gallery } from "./content.js";
import { schedulePopups } from "./popup.js";
const visualStyle = document.createElement("link");
visualStyle.rel = "stylesheet";
visualStyle.href = "/assets/visual-refresh.css";
document.head.append(visualStyle);
function node(tag, text, cls) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}
let currentPosts = [],
  livePostsReceived = false;
async function content() {
  // Offline exports are a fallback only. A live empty result must clear old posts.
  fetch("/assets/content.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw Error("Content unavailable");
      return r.json();
    })
    .then((local) => {
      if (!livePostsReceived) {
        currentPosts = local.posts || [];
        render({ posts: currentPosts });
      }
    })
    .catch(() => { });
  try {
    const { connect } = await import("./firebase.js");
    const f = await connect();
    const watch = (name, success, failure) =>
      f.d.onSnapshot(
        f.d.query(f.d.collection(f.db, name), f.d.where("status", "==", "published")),
        (snap) => success(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        failure,
      );
    if ($("#published-posts"))
      watch(
        "posts",
        (posts) => {
          livePostsReceived = true;
          currentPosts = posts;
          render({ posts });
        },
        (error) => {
          console.warn("Article feed could not load:", error.code);
          const status = $("#posts-status");
          if (status)
            status.textContent =
              "Latest articles could not load. Please refresh or try again shortly.";
        },
      );
    const article = $("#published-article");
    const id = new URLSearchParams(location.search).get("id");
    if (article && id && /^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
      f.d.onSnapshot(
        f.d.doc(f.db, "posts", id),
        (snap) => {
          livePostsReceived = true;
          render({ posts: snap.exists() ? [{ ...snap.data(), id: snap.id }] : [] });
        },
        (error) => {
          console.warn("Article could not load:", error.code);
          article.textContent =
            "This article could not load. It may be unavailable. Please try again shortly.";
        },
      );
    }
    if (location.pathname === "/" || location.pathname === "/index.html") {
      const section = node("section", null, "section light");
      const shell = node("div", null, "shell");
      const cards = node("div", null, "grid three");
      const note = node("p", "Loading listings…");
      note.setAttribute("role", "status");
      shell.append(node("h2", "Latest parts and listings"), note, cards);
      const all = node("a", "Browse all listings ↗", "textlink");
      all.href = "/parts/";
      shell.append(all);
      section.append(shell);
      $("#published-posts")?.closest("section")?.before(section);
      watch(
        "listings",
        (listings) => {
          cards.replaceChildren();
          listings.sort(
            (a, b) =>
              Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
              publishedDate(b.updatedAt) - publishedDate(a.updatedAt),
          );
          for (const item of listings.slice(0, 3)) {
            const card = node("a", null, "journal-card");
            card.href = "/listing/?id=" + encodeURIComponent(item.id);
            if (cleanURL(item.image, true)) {
              const image = node("img");
              image.src = cleanURL(item.image, true);
              image.alt = item.title;
              image.loading = "lazy";
              image.style.cssText = "width:100%;height:210px;object-fit:cover;border-radius:14px";
              card.append(image);
            }
            card.append(
              node("h3", item.title),
              node("p", item.model),
              node("span", "View details ↗", "textlink"),
            );
            cards.append(card);
          }
          note.textContent = listings.length
            ? "Confirm availability and fitment with the team."
            : "New listings will appear here when published.";
        },
        (error) => {
          console.warn("Homepage listings failed:", error.code);
          note.textContent = "Latest listings could not load. Please try again shortly.";
        },
      );
    }
    // Pop-up failures never block articles.
    watch(
      "popups",
      (popups) => {
        if (!popupScheduled && popups.length) {
          popupScheduled = true;
          schedulePopups(popups);
        }
      },
      (error) => console.warn("Promotions could not load:", error.code),
    );
  } catch (error) {
    console.warn("Live content connection failed:", error.code || error.message);
    const status = $("#posts-status");
    if (status)
      status.textContent = "Latest articles could not load. Please refresh or try again shortly.";
  }
}
function publishedDate(value) {
  const n = value?.toMillis ? value.toMillis() : Date.parse(value || "");
  return Number.isFinite(n) ? n : 0;
}
let popupScheduled = false;
function render({ posts = [], popups = [] }) {
  const grid = $("#published-posts");
  if (grid) {
    grid.replaceChildren();
    posts
      .filter((p) => p.status === "published")
      .sort((a, b) => publishedDate(b.publishedAt) - publishedDate(a.publishedAt))
      .slice(0, 6)
      .forEach((p) => {
        const a = node("a", null, "journal-card");
        a.href = "/blog/?id=" + encodeURIComponent(p.id);
        if (cleanURL(p.cover, true)) {
          const image = node("img");
          image.src = cleanURL(p.cover, true);
          image.alt = p.title;
          image.loading = "lazy";
          image.style.cssText =
            "width:100%;height:210px;object-fit:cover;border-radius:14px;margin-bottom:18px";
          a.append(image);
        }
        a.append(
          node("span", p.author, "tag"),
          node("h3", p.title),
          node("p", p.excerpt),
          node("span", "Read article ↗", "textlink"),
        );
        grid.append(a);
      });
    if ($("#posts-status"))
      $("#posts-status").textContent = posts.length
        ? ""
        : "New workshop articles will appear here when published.";
  }
  const article = $("#published-article");
  if (article) {
    const id = new URLSearchParams(location.search).get("id"),
      post = posts.find((p) => p.id === id && p.status === "published");
    if (post) {
      article.replaceChildren(
        node("h2", post.title),
        node("p", post.author + " · " + new Date(post.publishedAt).toLocaleDateString("en-NG")),
      );
      if (cleanURL(post.cover, true)) {
        const image = node("img");
        image.src = cleanURL(post.cover, true);
        image.alt = post.title;
        image.style.cssText = "width:100%;max-height:520px;object-fit:cover;border-radius:18px";
        article.append(image);
      }
      const body = node("div", null, "article-reading");
      body.innerHTML = sanitize(post.html);
      article.append(body);
      document.title = post.title + " | Tecur Automotive";
      import("./comments.js")
        .then(({ mountComments }) => mountComments(article, post.id))
        .catch(() => article.append(node("p", "Comments could not load. Please refresh.")));
    } else
      article.textContent =
        "This article is not available. Browse our field notes or contact the team.";
  }
  if (!popupScheduled && popups.length) {
    popupScheduled = true;
    schedulePopups(popups);
  }
}
if (!location.pathname.startsWith("/admin/")) content();
// Static listing pages use the same gallery as live listings.
if (location.pathname.startsWith("/parts/") && location.pathname !== "/parts/") {
  fetch("/assets/catalog.json")
    .then((r) => r.json())
    .then((list) => {
      const id = location.pathname.split("/")[2],
        c = list.find((x) => x.id === id),
        img = $(".feature > img");
      if (c && img) img.replaceWith(gallery(c.images?.length ? c.images : [c.image], c.title));
    })
    .catch(() => { });
}
const review = $("#booking-review");
if (review) {
  new MutationObserver(() => {
    if (!review.classList.contains("visible") || $("#direct-enquiry")) return;
    const button = node("button", "Send enquiry to the team", "btn");
    button.type = "button";
    button.id = "direct-enquiry";
    const result = node("p");
    result.setAttribute("role", "status");
    button.onclick = async () => {
      const form = $("#booking-form");
      if (!form.reportValidity()) return;
      button.disabled = true;
      result.textContent = "Sending…";
      const data = Object.fromEntries(new FormData(form));
      const summary = `Toyota ${data.model} (${data.year}) · ${data.service} · ${data.mode}\nPreferred date: ${data.date || "To discuss"}\nLocation: ${data.location || (data.mode === "Mobile service request" ? "To be confirmed" : "Workshop")}\n${data.message}`;
      try {
        const extras = enquiryExtras();
        const { appCheckSiteKey } = await import("./config.js");
        if (!appCheckSiteKey)
          throw Error(
            "Direct enquiries are not activated yet. Please use WhatsApp or call the team.",
          );
        const { connect } = await import("./firebase.js");
        const f = await connect();
        const requestId =
          form.dataset.requestId ||
          (form.dataset.requestId = Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) =>
            x.toString(16).padStart(2, "0"),
          ).join(""));
        const send = f.fn.httpsCallable(f.functions, "submitEnquiry");
        const answer = await send({
          name: data.name,
          phone: data.phone,
          summary,
          website: data.website || "",
          consent: true,
          requestId,
          ...extras,
        });
        await startTracking(answer.data, f, extras);
        result.textContent =
          "Enquiry sent to the team. Reference: " +
          answer.data.reference +
          ". We will contact you to confirm next steps.";
        button.textContent = "Enquiry received";
      } catch (e) {
        result.textContent =
          e.message?.includes("not activated") || e.message?.includes("photos to finish")
            ? e.message
            : e.code === "functions/resource-exhausted"
              ? "Too many attempts. Please try later or contact us on WhatsApp."
              : "Could not send your enquiry. Please retry or use WhatsApp.";
        button.disabled = false;
      }
    };
    review.prepend(button);
    review.append(result);
  }).observe(review, { childList: true, attributes: true, attributeFilter: ["class"] });
  $("#booking-form").addEventListener("input", () => delete $("#booking-form").dataset.requestId);
}
