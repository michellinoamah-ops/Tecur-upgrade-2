const $ = (s) => document.querySelector(s);
const form = $("#booking-form");
let photos = [],
  position = null,
  watch = null,
  timer = null,
  active = null,
  lastUpdate = 0,
  busy = false,
  photoBusy = false;
const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
function invalidate() {
  if (form) {
    delete form.dataset.requestId;
    $("#booking-review").classList.remove("visible");
  }
}
const point = (p) => ({
  lat: p.coords.latitude,
  lng: p.coords.longitude,
  accuracy: Math.round(p.coords.accuracy),
  capturedAt: new Date(p.timestamp).toISOString(),
});
export function mapURL(p) {
  return "https://www.google.com/maps?q=" + encodeURIComponent(p.lat + "," + p.lng);
}
export function enquiryExtras() {
  if (photoBusy) throw Error("Please wait for the photos to finish preparing.");
  return {
    photos,
    location: position,
    live: Boolean(position && $("#live-location")?.checked),
    trackingToken:
      form?.dataset.trackingToken || (form ? (form.dataset.trackingToken = random()) : ""),
  };
}
export function attachmentNote() {
  return (
    (position ? "\nMap location: " + mapURL(position) : "") +
    (photos.length
      ? "\nPhotos: " + photos.length + " selected. Please attach these separately in WhatsApp."
      : "")
  );
}
async function compress(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw Error("Use JPEG, PNG or WebP photos under 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (img.width * img.height > 40000000)
      throw Error("This photo is too large. Please choose a smaller image.");
    const scale = Math.min(1, 1200 / img.width, 1200 / img.height),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL("image/jpeg", 0.72);
    if (data.length > 500000) data = canvas.toDataURL("image/jpeg", 0.45);
    if (data.length > 500000)
      throw Error("This image is too detailed. Please use a smaller photo.");
    return { name: file.name.slice(0, 100), data };
  } finally {
    URL.revokeObjectURL(url);
  }
}
function renderPhotos() {
  const grid = $("#enquiry-photo-preview");
  grid.replaceChildren();
  photos.forEach((p, i) => {
    const box = document.createElement("div"),
      img = document.createElement("img"),
      button = document.createElement("button");
    img.src = p.data;
    img.alt = "Selected enquiry photo " + (i + 1);
    button.type = "button";
    button.textContent = "Remove photo " + (i + 1);
    button.onclick = () => {
      photos.splice(i, 1);
      renderPhotos();
      invalidate();
    };
    box.append(img, button);
    grid.append(box);
  });
}
export async function startTracking(answer, f, extras) {
  if (!extras.live || !extras.location) return;
  if (active) await stopTracking();
  active = { id: answer.id, token: extras.trackingToken, f };
  $("#stop-location").hidden = false;
  $("#location-status").textContent =
    "Live location sharing started. Keep this page open. Stops automatically in 30 minutes.";
  watch = navigator.geolocation.watchPosition(
    async (p) => {
      if (!active || busy || Date.now() - lastUpdate < 15000) return;
      lastUpdate = Date.now();
      busy = true;
      const next = point(p);
      try {
        await f.fn.httpsCallable(
          f.functions,
          "updateEnquiryLocation",
        )({ id: active.id, token: active.token, location: next });
        $("#location-status").textContent =
          "Location updated at " +
          new Date().toLocaleTimeString() +
          ". Sharing stops within 30 minutes.";
      } catch {
        $("#location-status").textContent =
          "Location update could not be sent. We will retry when another position is available.";
      } finally {
        busy = false;
      }
    },
    () => {
      $("#location-status").textContent =
        "Location updates are unavailable. Stop sharing or check your device permission.";
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
  );
  timer = setTimeout(() => stopTracking(), 30 * 60000);
}
async function stopTracking() {
  if (watch !== null) navigator.geolocation.clearWatch(watch);
  watch = null;
  clearTimeout(timer);
  const session = active;
  active = null;
  $("#stop-location").hidden = true;
  $("#live-location").checked = false;
  $("#location-status").textContent = "Live location stopped on this device.";
  if (session)
    try {
      await session.f.fn.httpsCallable(
        session.f.functions,
        "updateEnquiryLocation",
      )({ id: session.id, token: session.token, stop: true });
    } catch {
      $("#location-status").textContent =
        "Updates stopped on this device. The team may see the last position until the session expires.";
    }
}
if (form) {
  $("#enquiry-photos").onchange = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (photos.length + files.length > 3) {
      $("#photo-status").textContent = "Choose no more than 3 photos in total.";
      return;
    }
    photoBusy = true;
    $("#photo-status").textContent = "Preparing photos…";
    try {
      const prepared = [];
      for (const file of files) prepared.push(await compress(file));
      photos.push(...prepared);
      renderPhotos();
      invalidate();
      $("#photo-status").textContent =
        photos.length + " photo(s) ready. Photos are sent only when you send your enquiry.";
    } catch (err) {
      $("#photo-status").textContent = err.message;
    } finally {
      photoBusy = false;
    }
  };
  const mobile = () => {
    const yes = form.elements.mode.value === "Mobile service request";
    $("#mobile-location").hidden = !yes;
    if (!yes) {
      position = null;
      $("#live-location").disabled = true;
      $("#live-location").checked = false;
      if (active) stopTracking();
      else $("#location-status").textContent = "Location has not been shared.";
    }
  };
  form.elements.mode.addEventListener("change", mobile);
  mobile();
  $("#get-location").onclick = () => {
    if (!navigator.geolocation || !window.isSecureContext) {
      $("#location-status").textContent =
        "Location needs a secure connection and a supported browser. You can type your area above instead.";
      return;
    }
    $("#location-status").textContent = "Waiting for your location permission…";
    navigator.geolocation.getCurrentPosition(
      (p) => {
        position = point(p);
        $("#live-location").disabled = false;
        $("#clear-location").hidden = false;
        $("#location-status").textContent =
          "Location added (accuracy about " +
          position.accuracy +
          " metres). It will be shared when you send.";
        invalidate();
      },
      () => {
        $("#location-status").textContent =
          "Location was not added. You can still send your enquiry or type your area above.";
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };
  $("#clear-location").onclick = () => {
    position = null;
    $("#live-location").disabled = true;
    stopTracking();
    $("#clear-location").hidden = true;
    $("#location-status").textContent = "Location removed from this enquiry.";
    invalidate();
  };
  $("#stop-location").onclick = stopTracking;
  window.addEventListener("pagehide", () => {
    if (watch !== null) navigator.geolocation.clearWatch(watch);
    clearTimeout(timer);
  });
}
