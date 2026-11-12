import { deleteAdminItem } from "./admin-delete.js";
import { openContent, uploadImage } from "./admin-content.js";
import { cleanURL, displayError } from "./content.js";
import { $, $$, toast, safeImage } from "./app.js";
import { connect } from "./firebase.js";
const uid = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
let f = null,
  listings = [],
  requests = [],
  settings = {},
  ready = false;
const status = (t) => ($("#admin-status").textContent = t);
function node(tag, text) {
  const e = document.createElement(tag);
  e.textContent = text;
  return e;
}
function tab(name) {
  $$("[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== name));
}
$$("[data-tab]").forEach((b) => (b.onclick = () => tab(b.dataset.tab)));
function render() {
  $("#stat-all").textContent = listings.length;
  $("#stat-published").textContent = listings.filter((c) => c.status === "published").length;
  $("#stat-requests").textContent = requests.filter((r) => r.status !== "closed").length;
  const term = $("#admin-search").value.toLowerCase(),
    filter = $("#admin-filter").value;
  const tbody = $("#admin-listings");
  tbody.replaceChildren();
  listings
    .filter(
      (c) =>
        (c.title + " " + c.model).toLowerCase().includes(term) && (!filter || c.status === filter),
    )
    .forEach((c) => {
      const tr = document.createElement("tr");
      tr.append(node("td", c.title), node("td", c.category), node("td", c.status));
      const td = document.createElement("td");
      for (const [label, action] of [
        ["Edit", () => edit(c)],
        ["Duplicate", () => edit({ ...c, id: "", title: c.title + " (copy)", status: "draft" })],
        [
          c.status === "published" ? "Unpublish" : "Publish",
          async (event) => {
            const buttons = [...event.currentTarget.closest("td").querySelectorAll("button")];
            if (event.currentTarget.disabled) return;
            buttons.forEach((button) => (button.disabled = true));
            const nextStatus = c.status === "published" ? "draft" : "published";
            status(nextStatus === "published" ? "Publishing listing…" : "Unpublishing listing…");
            try {
              await f.d.updateDoc(f.d.doc(f.db, "listings", c.id), {
                status: nextStatus,
                updatedAt: f.d.serverTimestamp(),
              });
              c.status = nextStatus;
              render();
              status(
                nextStatus === "published"
                  ? "Listing published. It is now available in the public catalogue."
                  : "Listing unpublished. It is now a draft.",
              );
            } catch (error) {
              status(
                error.code === "permission-denied"
                  ? "Publishing access was denied. Check your administrator account and deployed listing rules."
                  : "Could not change publication. Check your connection and try again.",
              );
            } finally {
              buttons.forEach((button) => (button.disabled = false));
            }
          },
        ],
        ["Archive", () => archive(c)],
        [
          "Delete",
          async (event) => {
            const button = event.currentTarget;
            button.disabled = true;
            try {
              if (await deleteAdminItem(f, "listings", c)) {
                listings = listings.filter((item) => item.id !== c.id);
                render();
                status("Listing deleted. Rebuild any previously exported static listing pages.");
              }
            } catch {
              status("Could not delete. Check your connection and administrator access.");
            } finally {
              button.disabled = false;
            }
          },
        ],
      ]) {
        const b = node("button", label);
        b.type = "button";
        b.setAttribute("aria-label", label + " " + c.title);
        b.onclick = action;
        td.append(b);
      }
      tr.append(td);
      tbody.append(tr);
    });
  if (!tbody.children.length) {
    const tr = document.createElement("tr"),
      td = node("td", "No matching listings. Add your first listing to begin.");
    td.colSpan = 4;
    tr.append(td);
    tbody.append(tr);
  }
  const rt = $("#request-list");
  rt.replaceChildren();
  requests.forEach((r) => {
    const tr = document.createElement("tr");
    const details = node("td", r.name + " · " + r.phone + " — " + r.summary);
    requestMedia(details, r);
    tr.append(details, node("td", r.status));
    const td = document.createElement("td");
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Status for " + r.name);
    ["new", "contacted", "booked", "closed"].forEach((s) => {
      const o = node("option", s);
      o.value = s;
      select.append(o);
    });
    select.value = r.status;
    select.onchange = async () => {
      try {
        await f.d.updateDoc(f.d.doc(f.db, "requests", r.id), {
          status: select.value,
          updatedAt: f.d.serverTimestamp(),
        });
        r.status = select.value;
        render();
        status("Request updated.");
      } catch {
        select.value = r.status;
        status("Could not update the request. Check access and connection.");
      }
    };
    td.append(select);
    tr.append(td);
    rt.append(tr);
  });
  if (!requests.length) {
    const tr = document.createElement("tr"),
      td = node("td", "No requests logged yet.");
    td.colSpan = 3;
    tr.append(td);
    rt.append(tr);
  }
  $("#settings-form").elements.capacity.value = settings.capacity || 6;
  $("#settings-form").elements.notes.value = settings.notes || "";
}
let unsubscribeRequests;
let unsubscribeCommentContacts;
async function enter() {
  const [listingSnapshot, requestSnapshot, workshopSnapshot] = await Promise.all([
    f.d.getDocs(f.d.query(f.d.collection(f.db, "listings"), f.d.limit(500))),
    f.d.getDocs(f.d.query(f.d.collection(f.db, "requests"), f.d.limit(500))),
    f.d.getDoc(f.d.doc(f.db, "settings", "workshop")),
  ]);
  listings = listingSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  requests = requestSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  settings = workshopSnapshot.exists() ? workshopSnapshot.data() : {};
  await openContent({ f });
  unsubscribeRequests?.();
  unsubscribeRequests = f.d.onSnapshot(
    f.d.query(f.d.collection(f.db, "requests"), f.d.orderBy("updatedAt", "desc"), f.d.limit(500)),
    (snapshot) => {
      requests = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      render();
    },
    () => status("Inbox updates unavailable. Check your permissions and connection."),
  );
  watchCommentContacts();
  ready = true;
  $("#admin-login").hidden = true;
  $("#admin-workspace").hidden = false;
  $("#admin-mode").textContent = "ADMIN WORKSPACE";
  render();
}

$("#login-form").onsubmit = async (e) => {
  e.preventDefault();
  const b = $("button", e.target);
  b.disabled = true;
  $("#login-status").textContent = "Checking your account…";
  try {
    f = await connect();
    const data = new FormData(e.target);
    const user = await f.a.signInWithEmailAndPassword(
      f.auth,
      data.get("email"),
      data.get("password"),
    );
    const token = await user.user.getIdTokenResult(true);
    if (token.claims.admin !== true) {
      await f.a.signOut(f.auth);
      throw Error("role");
    }
    await enter();
    e.target.reset();
  } catch (e) {
    $("#login-status").textContent =
      e.message === "role"
        ? "This account does not have administrator access. Ask the project owner to grant the server-side admin role."
        : "Unable to sign in. Check your email and password, or contact the website owner.";
  } finally {
    b.disabled = false;
  }
};
$("#reset-password").onclick = async () => {
  const email = $("#login-form").elements.email.value;
  if (!email || !$("#login-form").elements.email.checkValidity()) {
    toast("Enter a valid email first.");
    return;
  }
  try {
    f = await connect();
    await f.a.sendPasswordResetEmail(f.auth, email);
    $("#login-status").textContent =
      "If an eligible account exists, password reset instructions will be sent.";
  } catch {
    $("#login-status").textContent =
      "Password reset is unavailable. Please contact the website owner.";
  }
};
$("#logout").onclick = async () => {
  unsubscribeRequests?.();
  unsubscribeCommentContacts?.();
  document.querySelector("#comment-contact-list")?.replaceChildren();
  if (f) await f.a.signOut(f.auth);
  ready = false;
  listings = [];
  requests = [];
  $("#admin-login").hidden = false;
  $("#admin-workspace").hidden = true;
  $("#login-status").textContent = "Signed out.";
};
$("#admin-search").oninput = render;
$("#admin-filter").onchange = render;
function edit(c = {}) {
  const form = $("#listing-form");
  form.reset();
  for (const [key, value] of Object.entries(c)) {
    const field = form.elements[key];
    if (field) {
      if (field.type === "checkbox") field.checked = !!value;
      else field.value = value;
    }
  }
  form.elements.gallery.value = (c.images || []).join("\n");
  drawGallery();
  $("#editor-status").textContent = "";
  $("#listing-editor").showModal();
}
$("#add-listing").onclick = () => edit();
$("#overview-add").onclick = () => {
  tab("inventory");
  edit();
};
async function archive(c) {
  if (!confirm("Archive “" + c.title + "”? It will be removed from the live public catalogue."))
    return;
  try {
    await f.d.updateDoc(f.d.doc(f.db, "listings", c.id), {
      status: "archived",
      updatedAt: f.d.serverTimestamp(),
    });
    c.status = "archived";
    render();
    status("Listing archived. Rebuild static pages to remove any previously exported page.");
  } catch {
    status("Could not archive. Check your connection and administrator access.");
  }
}
$("#listing-form").onsubmit = async (e) => {
  e.preventDefault();
  if (!ready) return;
  const form = e.target,
    b = $("button[type=submit]", form);
  b.disabled = true;
  $("#editor-status").textContent = "Saving…";
  try {
    const data = new FormData(form),
      id = data.get("id") || uid();
    let image = data.get("image").trim() || "/assets/detail.webp";
    if (!cleanURL(image, true)) throw Error("Use an HTTPS image URL or a local /assets/ image.");
    const images = [
      ...new Set([
        image,
        ...data
          .get("gallery")
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
      ]),
    ];
    if (images.length > 12) throw Error("Choose no more than 12 photos.");
    if (images.some((u) => !cleanURL(u, true))) throw Error("Use valid HTTPS image URLs.");
    const c = {
      id,
      title: data.get("title").trim(),
      kind: data.get("kind"),
      category: data.get("category"),
      model: data.get("model").trim(),
      year: data.get("year").trim(),
      description: data.get("description").trim(),
      price: Number(data.get("price")),
      status: data.get("status"),
      image,
      images,
      featured: data.get("featured") === "on",
    };
    if (c.title.length < 3 || c.description.length < 20)
      throw Error("Add a clear title and at least 20 characters of description.");
    {
      const { id: _, ...doc } = c;
      await f.d.setDoc(f.d.doc(f.db, "listings", id), { ...doc, updatedAt: f.d.serverTimestamp() });
    }
    const index = listings.findIndex((x) => x.id === id);
    if (index < 0) listings.unshift(c);
    else listings[index] = c;
    render();
    $("#listing-editor").close();
    status("Listing saved. Export and rebuild to update its search page.");
  } catch (err) {
    $("#editor-status").textContent =
      err.message?.startsWith("Use ") ||
        err.message?.startsWith("Choose ") ||
        err.message?.startsWith("Add ")
        ? err.message
        : "Save failed. Check your connection or contact the website owner.";
  } finally {
    b.disabled = false;
  }
};
$("#add-request").onclick = () => {
  $("#request-form").reset();
  $("#request-editor").showModal();
};
$("#request-form").onsubmit = async (e) => {
  e.preventDefault();
  const b = $("button", e.target);
  b.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(e.target));
    let r = { ...data, status: "new", id: uid() };
    {
      const { id, ...doc } = r;
      await f.d.setDoc(f.d.doc(f.db, "requests", id), { ...doc, updatedAt: f.d.serverTimestamp() });
    }
    requests.unshift(r);
    render();
    $("#request-editor").close();
    status("Request logged.");
  } catch {
    toast("Could not save request. Check access and connection.");
  } finally {
    b.disabled = false;
  }
};
$("#settings-form").onsubmit = async (e) => {
  e.preventDefault();
  const next = {
    capacity: Number(e.target.elements.capacity.value),
    notes: e.target.elements.notes.value,
  };
  try {
    await f.d.setDoc(f.d.doc(f.db, "settings", "workshop"), next);
    settings = next;
    status("Internal settings saved.");
  } catch {
    status("Could not save settings.");
  }
};
function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#export-catalog").onclick = () =>
  download(
    "catalog.json",
    listings.map(({ updatedAt, ...c }) => c),
  );
$("#export-requests").onclick = () => download("tecur-requests.json", requests);

function drawGallery() {
  const form = $("#listing-form"),
    urls = [form.elements.image.value, ...form.elements.gallery.value.split("\n")].filter(Boolean);
  $("#gallery-edit-preview").replaceChildren(
    ...urls.slice(0, 12).map((u) => {
      const img = document.createElement("img");
      img.src = cleanURL(u, true);
      img.alt = "Gallery image";
      return img;
    }),
  );
}
$("#listing-form").elements.gallery.oninput = drawGallery;
$("#gallery-upload").onchange = async (e) => {
  const files = [...e.target.files],
    form = $("#listing-form"),
    status = $("#editor-status");
  const existing = form.elements.gallery.value.split("\n").filter(Boolean);
  if (files.length + existing.length + (form.elements.image.value ? 1 : 0) > 12) {
    status.textContent = "Choose no more than 12 photos in total.";
    return;
  }
  const saveButton = $("button[type=submit]", form);
  saveButton.disabled = true;
  status.textContent = "Uploading gallery images…";
  try {
    const id = form.elements.id.value || uid();
    form.elements.id.value = id;
    for (const file of files) {
      const url = await uploadImage(file, "listings/" + id);
      if (!form.elements.image.value) form.elements.image.value = url;
      else existing.push(url);
    }
    form.elements.gallery.value = existing.join("\n");
    drawGallery();
    status.textContent = "Photos ready. Save the listing to publish these changes.";
  } catch (err) {
    status.textContent = displayError(err);
  } finally {
    saveButton.disabled = false;
    e.target.value = "";
  }
};

function requestMedia(cell, r) {
  if (r.location && Number.isFinite(r.location.lat) && Number.isFinite(r.location.lng)) {
    const a = node("a", "Open customer location ↗");
    a.className = "textlink";
    a.href =
      "https://www.google.com/maps?q=" + encodeURIComponent(r.location.lat + "," + r.location.lng);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    cell.append(
      document.createElement("br"),
      a,
      node(
        "p",
        "Position captured: " +
        r.location.capturedAt +
        " · accuracy about " +
        r.location.accuracy +
        " m. " +
        (r.liveUntil && Date.parse(r.liveUntil) > Date.now()
          ? "Live sharing session open until " +
          new Date(r.liveUntil).toLocaleTimeString() +
          ". Updates depend on the customer’s connection."
          : "Live updates off or expired."),
      ),
    );
  }
  if (r.photos?.length) {
    const b = node("button", "View " + r.photos.length + " customer photo(s)");
    b.type = "button";
    cell.append(document.createElement("br"), b);
    b.onclick = async () => {
      b.disabled = true;
      const grid = document.createElement("div");
      grid.className = "enquiry-photo-preview";
      try {
        for (let i = 0; i < r.photos.length; i++) {
          const data = (
            await f.fn.httpsCallable(f.functions, "getEnquiryPhoto")({ id: r.id, index: i })
          ).data.data;
          const img = document.createElement("img");
          img.src = data;
          img.alt = "Customer enquiry photo " + (i + 1);
          grid.append(img);
        }
        cell.append(grid);
        b.remove();
      } catch {
        b.disabled = false;
        b.textContent = "Could not load photos. Retry.";
      }
    };
  }
  if (r.uploadState === "pending")
    cell.append(
      node("p", "Photos are still uploading; ask the customer to retry sending if this persists."),
    );
}


// Private email follow-up list; the rules allow only verified administrators to read it.
function watchCommentContacts() {
  unsubscribeCommentContacts?.();
  let panel = document.querySelector("#comment-follow-up");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "comment-follow-up";
    panel.style.cssText = "margin-top:2rem;padding:24px;background:#fff;color:#10152e;border-radius:12px";
    const heading = node("h2", "Comment follow-up");
    heading.style.color = "#10152e";
    const help = node("p", "Private email addresses from comments and replies. Only administrators can view this list. Addresses are supplied by visitors and are not verified.");
    help.style.color = "#10152e";
    const list = document.createElement("div");
    list.id = "comment-contact-list";
    const note = node("p", "");
    note.id = "comment-contact-status";
    note.setAttribute("role", "status");
    panel.append(heading, help, note, list);
    document.querySelector('[data-panel="requests"]').append(panel);
  }
  const list = panel.querySelector("#comment-contact-list");
  const note = panel.querySelector("#comment-contact-status");
  note.textContent = "Loading follow-up contacts…";
  unsubscribeCommentContacts = f.d.onSnapshot(
    f.d.query(f.d.collection(f.db, "commentContacts"), f.d.orderBy("createdAt", "desc"), f.d.limit(200)),
    (snapshot) => {
      list.replaceChildren();
      note.textContent = snapshot.empty ? "No comment email addresses yet. New comments will appear here." : "Latest 200 comment contacts";
      snapshot.docs.forEach((snapshotDoc) => {
        const contact = snapshotDoc.data();
        const item = document.createElement("article");
        item.style.cssText = "padding:16px 0;border-top:1px solid #a6b3cb;overflow-wrap:anywhere;color:#10152e";
        const name = node("strong", contact.name);
        name.style.color = "#10152e";
        const address = node("p", contact.email);
        address.style.color = "#10152e";
        item.append(name, address);
        const email = node("a", "Follow up by email");
        email.href = "mailto:" + encodeURIComponent(contact.email) + "?subject=" + encodeURIComponent("Your comment on TECUR Automotive");
        email.className = "btn";
        const view = node("a", "Open article and comments");
        view.href = "/blog/?id=" + encodeURIComponent(contact.postId);
        view.className = "btn";
        view.style.marginLeft = "12px";
        item.append(email, view);
        list.append(item);
      });
    },
    () => { note.textContent = "Could not load private contacts. Check that the updated rules are published and you are signed in as an administrator."; }
  );
}
