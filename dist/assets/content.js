import DOMPurify from "./vendor/purify.es.mjs";
export const cleanURL = (value, image = false) => {
  if (typeof value !== "string") return "";
  const s = value.trim();
  if (/^\/(?!\/)[\w/?#%&=.+-]*$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (
      u.protocol === "https:" ||
      (image && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s))
    )
      return s;
  } catch {}
  return "";
};
export function sanitize(html) {
  const fragment = DOMPurify.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    ALLOWED_TAGS: [
      "p",
      "br",
      "h2",
      "h3",
      "h4",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "figure",
      "figcaption",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "hr",
      "sup",
      "sub",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "colspan", "rowspan"],
    ALLOW_DATA_ATTR: false,
  });
  fragment.querySelectorAll("a").forEach((a) => {
    const url = cleanURL(a.getAttribute("href"));
    if (url) {
      a.href = url;
      a.rel = "noopener noreferrer";
    } else a.removeAttribute("href");
  });
  fragment.querySelectorAll("img").forEach((img) => {
    const src = cleanURL(img.getAttribute("src"), true);
    if (!src) img.remove();
    else {
      img.src = src;
      img.loading = "lazy";
      img.alt = img.alt || "Article illustration";
    }
  });
  fragment.querySelectorAll("[colspan],[rowspan]").forEach((c) =>
    ["colspan", "rowspan"].forEach((k) => {
      if (c.hasAttribute(k))
        c.setAttribute(k, String(Math.max(1, Math.min(20, parseInt(c.getAttribute(k)) || 1))));
    }),
  );
  const box = document.createElement("div");
  box.append(fragment);
  return box.innerHTML;
}
export function gallery(images, title = "Listing photograph") {
  const urls = [...new Set((images || []).map((x) => cleanURL(x, true)).filter(Boolean))].slice(
    0,
    12,
  );
  if (!urls.length) urls.push("/assets/detail.webp");
  const root = document.createElement("div");
  root.className = "gallery";
  const main = document.createElement("img");
  main.className = "detail-image";
  main.alt = title;
  const controls = document.createElement("div");
  controls.className = "gallery-controls";
  const prev = document.createElement("button"),
    next = document.createElement("button"),
    play = document.createElement("button"),
    count = document.createElement("span");
  prev.textContent = "←";
  next.textContent = "→";
  play.textContent = "Play slideshow";
  prev.setAttribute("aria-label", "Previous photograph");
  next.setAttribute("aria-label", "Next photograph");
  count.setAttribute("aria-live", "polite");
  const thumbs = document.createElement("div");
  thumbs.className = "gallery-thumbs";
  let i = 0,
    timer;
  function show(n) {
    i = (n + urls.length) % urls.length;
    main.src = urls[i];
    main.alt = title + " — photo " + (i + 1);
    count.textContent = i + 1 + " / " + urls.length;
    [...thumbs.children].forEach((b, k) => b.setAttribute("aria-pressed", k === i));
  }
  function stop() {
    clearInterval(timer);
    timer = null;
    play.textContent = "Play slideshow";
  }
  urls.forEach((u, k) => {
    const b = document.createElement("button"),
      im = document.createElement("img");
    im.src = u;
    im.alt = "";
    im.loading = "lazy";
    b.setAttribute("aria-label", "Show photograph " + (k + 1));
    b.append(im);
    b.onclick = () => {
      stop();
      show(k);
    };
    thumbs.append(b);
  });
  prev.onclick = () => {
    stop();
    show(i - 1);
  };
  next.onclick = () => {
    stop();
    show(i + 1);
  };
  play.onclick = () => {
    if (timer) stop();
    else {
      timer = setInterval(() => show(i + 1), 4000);
      play.textContent = "Pause slideshow";
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  controls.append(prev, count, next, play);
  root.append(main, controls, thumbs);
  if (urls.length === 1) {
    controls.hidden = true;
    thumbs.hidden = true;
  }
  let start;
  main.addEventListener("touchstart", (e) => (start = e.changedTouches[0].clientX), {
    passive: true,
  });
  main.addEventListener(
    "touchend",
    (e) => {
      const delta = e.changedTouches[0].clientX - start;
      if (Math.abs(delta) > 40) {
        stop();
        show(i + (delta < 0 ? 1 : -1));
      }
    },
    { passive: true },
  );
  show(0);
  return root;
}
export async function published(collection) {
  const { connect } = await import("./firebase.js");
  const f = await connect();
  const s = await f.d.getDocs(
    f.d.query(
      f.d.collection(f.db, collection),
      f.d.where("status", "==", "published"),
      f.d.limit(100),
    ),
  );
  return s.docs.map((x) => ({ ...x.data(), id: x.id }));
}

export function displayError(error, fallback = "Please try again or contact the website owner.") {
  if (error?.code || /firebase/i.test(error?.message || "")) return fallback;
  return error?.message || fallback;
}
