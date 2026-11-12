import { attachmentNote } from "./enquiry-media.js";
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
export const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
export const money = (n) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
export function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.remove("hidden");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el.classList.add("hidden"), 3500);
}
export const safeImage = (url) =>
  typeof url === "string" && (/^https:\/\//.test(url) || /^\/assets\/[a-zA-Z0-9_.-]+$/.test(url))
    ? url
    : "/assets/detail.webp";
const menu = $(".menu-toggle");
menu?.addEventListener("click", () => {
  const open = $("#navlinks").classList.toggle("open");
  menu.setAttribute("aria-expanded", open);
  menu.textContent = open ? "×" : "☰";
});
const command = $("#command");
$$("[data-command]").forEach((b) =>
  b.addEventListener("click", () => {
    command.showModal();
    $("#command-search").focus();
  }),
);
$$("[data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) &&
    !document.querySelector("dialog[open]")
  ) {
    e.preventDefault();
    command.showModal();
    $("#command-search").focus();
  }
});
$("#command-search")?.addEventListener("input", (e) =>
  $$(".command-links a").forEach(
    (a) => (a.hidden = !a.textContent.toLowerCase().includes(e.target.value.toLowerCase())),
  ),
);
if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.documentElement.classList.add("js-motion");
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("shown");
          observer.unobserve(e.target);
        }
      }),
    { threshold: 0.08 },
  );
  $$(".reveal").forEach((e) => observer.observe(e));
}
const symptoms = {
  starting: [
    "Start with an electrical assessment.",
    "Note whether you hear a click, slow cranking or nothing at all. Battery, starter and connection faults can look similar.",
    "electrical",
  ],
  heat: [
    "Stop safely if the engine is overheating.",
    "Let the engine cool. Never open a hot coolant cap. Contact the team before continuing your journey.",
    "cooling",
  ],
  brakes: [
    "A brake inspection is the right starting point.",
    "Describe whether the sound occurs while braking or driving. If braking ability changes or the pedal feels soft, stop driving and seek assistance.",
    "brakes",
  ],
  light: [
    "Tell us exactly which warning light you see.",
    "Record whether the light is steady or flashing and any other symptoms. Follow the urgent instructions in your owner’s manual.",
    "diagnostics",
  ],
  routine: [
    "Bring your service history and mileage.",
    "Maintenance needs depend on your Toyota, service history and operating conditions. We will use those details to plan the next checks.",
    "maintenance",
  ],
};
$$("[data-symptom]").forEach((b) =>
  b.addEventListener("click", () => {
    const [title, desc, service] = symptoms[b.dataset.symptom];
    $$("[data-symptom]").forEach((x) => {
      x.classList.toggle("selected", x === b);
      x.setAttribute("aria-pressed", x === b);
    });
    const result = $("#symptom-result");
    result.replaceChildren();
    const h = document.createElement("h3");
    h.textContent = title;
    const p = document.createElement("p");
    p.textContent = desc;
    const a = document.createElement("a");
    a.className = "textlink";
    a.href = "/book/?service=" + service;
    a.textContent = "Prepare this service request ↗";
    result.append(h, p, a);
    result.classList.add("visible");
  }),
);
const garage = $("#garage-form");
if (garage) {
  const saved = read("tecur-vehicle", {});
  Object.entries(saved).forEach(([k, v]) => {
    if (garage.elements[k]) garage.elements[k].value = v;
  });
  garage.addEventListener("submit", (e) => {
    e.preventDefault();
    const ok = write("tecur-vehicle", Object.fromEntries(new FormData(garage)));
    $("#garage-status").textContent = ok
      ? "Your Toyota is saved on this device. Your next booking will be prefilled."
      : "Storage is unavailable in this browser.";
  });
  $("#garage-clear").addEventListener("click", () => {
    write("tecur-vehicle", {});
    garage.reset();
    $("#garage-status").textContent = "Vehicle details cleared.";
  });
  const checks = read("tecur-checks", []);
  $$("[data-check]").forEach((c) => {
    c.checked = checks.includes(c.dataset.check);
    c.addEventListener("change", () => {
      write(
        "tecur-checks",
        $$("[data-check]:checked").map((x) => x.dataset.check),
      );
      updateChecks();
    });
  });
  function updateChecks() {
    const n = $$("[data-check]:checked").length;
    $("#check-progress").textContent = n + " of 5 checked";
    $("#check-meter").value = n;
  }
  updateChecks();
  function costs() {
    const fields = ["distance", "economy", "fuel", "reserve"].map((id) => $("#cost-" + id));
    if (fields.some((x) => !x.checkValidity())) {
      $("#cost-total").textContent = "Enter valid positive amounts.";
      return;
    }
    const [d, e, f, r] = fields.map((x) => Number(x.value));
    $("#cost-total").textContent = money((d / 100) * e * f + r) + " / month";
  }
  $$('[id^="cost-"]')
    .filter((x) => x.tagName === "INPUT")
    .forEach((x) => x.addEventListener("input", costs));
  costs();
}
const booking = $("#booking-form");
if (booking) {
  const saved = read("tecur-vehicle", {});
  ["model", "year"].forEach((k) => {
    if (saved[k]) booking.elements[k].value = saved[k];
  });
  const params = new URLSearchParams(location.search);
  const service = params.get("service");
  if (service === "mobile") {
    booking.elements.mode.value = "Mobile service request";
  } else if (service && [...booking.elements.service.options].some((x) => x.value === service))
    booking.elements.service.value = service;
  if (params.has("part")) {
    booking.elements.service.value = "parts";
    booking.elements.message.value = "Parts enquiry: " + params.get("part").slice(0, 150);
  }
  booking.elements.mode.dispatchEvent(new Event("change"));
  const now = new Date();
  booking.elements.date.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  booking.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(booking));
    const text = `Hello Tecur, I would like to enquire about ${d.service}.\nName: ${d.name}\nPhone: ${d.phone}\nToyota: ${d.model} (${d.year})\nService: ${d.mode}\nPreferred date: ${d.date || "Please discuss"}\nLocation: ${d.location || (d.mode === "Mobile service request" ? "To be confirmed" : "Workshop")}\nDetails: ${d.message}${attachmentNote()}\nPlease confirm availability and next steps.`;
    const review = $("#booking-review");
    review.replaceChildren();
    const p = document.createElement("p");
    p.style.whiteSpace = "pre-line";
    p.textContent = text;
    const a = document.createElement("a");
    a.className = "btn";
    a.href = "https://wa.me/2347043966114?text=" + encodeURIComponent(text);
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Open WhatsApp to send ↗";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "btn ghost";
    copy.textContent = "Copy request";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        toast("Request copied");
      } catch {
        toast("Select and copy the request above.");
      }
    });
    const note = document.createElement("p");
    note.className = "small-note";
    note.textContent =
      "WhatsApp opens with your message and map pin. Add photos using the attachment button in the chat. For continuing live location, choose Location → Share live location in WhatsApp.";
    review.append(p, a, copy, note);
    review.classList.add("visible");
    review.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  booking.addEventListener("input", () => $("#booking-review").classList.remove("visible"));
}
if ($("#photo-credits")) {
  fetch("/assets/CREDITS.md")
    .then((r) => r.text())
    .then((t) => {
      const pre = document.createElement("p");
      pre.style.whiteSpace = "pre-line";
      pre.textContent = t;
      $("#photo-credits").append(pre);
    });
}
const progress = document.createElement("div");
progress.className = "reading-progress";
progress.setAttribute("aria-hidden", "true");
document.body.append(progress);
let ticking = false;
window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight;
        progress.style.transform = "scaleX(" + (max > 0 ? scrollY / max : 0) + ")";
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true },
);
