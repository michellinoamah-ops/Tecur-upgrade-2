import { cleanURL } from "./content.js";
export function eligible(p, path, now = Date.now()) {
  return (
    p.status === "published" &&
    (!p.startsAt || Date.parse(p.startsAt) <= now) &&
    (!p.endsAt || Date.parse(p.endsAt) > now) &&
    (p.pages === "*" ||
      p.pages
        .split(",")
        .map((x) => x.trim())
        .includes(path))
  );
}
export function showPopup(p, preview = false) {
  const old = document.getElementById("campaign-popup");
  if (old) old.remove();
  const box = document.createElement(
    p.template === "modal" || p.template === "image" ? "dialog" : "section",
  );
  box.id = "campaign-popup";
  box.className = "campaign campaign-" + p.template;
  box.setAttribute("aria-label", p.title);
  const close = document.createElement("button");
  close.className = "icon-btn";
  close.textContent = "×";
  close.setAttribute("aria-label", "Dismiss announcement");
  const heading = document.createElement("h2");
  heading.textContent = p.title;
  const body = document.createElement("p");
  body.textContent = p.body;
  box.append(close);
  if (p.template === "image" && cleanURL(p.image, true)) {
    const img = document.createElement("img");
    img.src = cleanURL(p.image, true);
    img.alt = "Announcement illustration";
    box.append(img);
  }
  box.append(heading, body);
  const url = cleanURL(p.url);
  if (url) {
    const a = document.createElement("a");
    a.className = "btn";
    a.textContent = p.button || "Find out more";
    a.href = url;
    box.append(a);
  }
  function dismiss() {
    if (!preview) {
      try {
        const st = p.frequency === "session" ? sessionStorage : localStorage;
        st.setItem("tecur-popup-" + p.id, String(Date.now()));
      } catch {}
    }
    box.remove();
    if (preview) {
      const editor = document.getElementById("popup-editor");
      if (editor && !editor.open) editor.showModal();
    }
  }
  close.onclick = dismiss;
  box.addEventListener("cancel", (e) => {
    e.preventDefault();
    dismiss();
  });
  document.body.append(box);
  if (box.tagName === "DIALOG") box.showModal();
  return box;
}
export function schedulePopups(items) {
  if (location.pathname.startsWith("/admin/")) return;
  const now = Date.now();
  const p = items
    .filter((x) => eligible(x, location.pathname, now))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .find((x) => {
      if (x.frequency === "always") return true;
      try {
        const v = Number(
          (x.frequency === "session" ? sessionStorage : localStorage).getItem(
            "tecur-popup-" + x.id,
          ) || 0,
        );
        return !v || (x.frequency === "daily" && now - v > 86400000);
      } catch {
        return true;
      }
    });
  if (!p) return;
  let fired = false;
  const show = () => {
    if (
      fired ||
      document.hidden ||
      document.querySelector("dialog[open]") ||
      !eligible(p, location.pathname)
    )
      return false;
    fired = true;
    showPopup(p);
    return true;
  };
  if (p.trigger === "scroll") {
    const fn = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (max > 0 && (scrollY / max) * 100 >= p.threshold && show())
        window.removeEventListener("scroll", fn);
    };
    window.addEventListener("scroll", fn, { passive: true });
    fn();
  } else {
    const due = Date.now() + Math.max(0, p.delay) * 1000;
    const timer = setInterval(() => {
      if (Date.now() >= due && show()) clearInterval(timer);
      if (!eligible(p, location.pathname)) clearInterval(timer);
    }, 1000);
  }
}
