const standalone =
  matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
if (standalone && !location.pathname.startsWith("/admin")) {
  const nav = document.createElement("nav");
  nav.className = "app-dock";
  nav.setAttribute("aria-label", "Quick navigation");
  for (const [url, mark, label] of [
    ["/", "⌂", "Home"],
    ["/parts/", "▦", "Parts"],
    ["/book/", "＋", "Enquire"],
    ["/garage/", "◇", "My Toyota"],
    ["/contact/", "✆", "Contact"],
  ]) {
    const a = document.createElement("a");
    a.href = url;
    const icon = document.createElement("span");
    icon.textContent = mark;
    icon.setAttribute("aria-hidden", "true");
    a.append(icon, document.createTextNode(label));
    if (location.pathname === url) a.setAttribute("aria-current", "page");
    nav.append(a);
  }
  document.body.append(nav);
  document.body.classList.add("has-app-dock");
}
const status = document.querySelector("#app-install-status"),
  button = document.querySelector("#install-app");
if (standalone && status) status.textContent = "You’re already using the TECUR app.";
let installPrompt;
window.addEventListener("beforeinstallprompt", (event) => {
  if (!button || standalone) return;
  event.preventDefault();
  installPrompt = event;
  button.hidden = false;
});
button?.addEventListener("click", async () => {
  if (!installPrompt) return;
  button.disabled = true;
  try {
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    status.textContent =
      choice.outcome === "accepted"
        ? "Installation requested. Look for TECUR on your home screen."
        : "You can install whenever you’re ready.";
  } catch {
    status.textContent = "Use your browser menu to add TECUR to your home screen.";
  } finally {
    installPrompt = null;
    button.hidden = true;
    button.disabled = false;
  }
});
window.addEventListener("appinstalled", () => {
  if (button) button.hidden = true;
  if (status) status.textContent = "TECUR has been installed.";
});
if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/sw.js").catch(() => {
      if (status)
        status.textContent =
          "The website is ready to use. Offline support is currently unavailable.";
    }),
  );
}
