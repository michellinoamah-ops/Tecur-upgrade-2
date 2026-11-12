import { $, $$, toast } from "./app.js";
import { sanitize, cleanURL, displayError } from "./content.js";
import { showPopup } from "./popup.js";
let ctx,
  posts = [],
  popups = [],
  range = null;
const uid = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
function el(tag, text) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  return e;
}
export async function openContent(context) {
  ctx = context;
  const f = ctx.f;
  const [postSnapshot, popupSnapshot] = await Promise.all(
    ["posts", "popups"].map((collection) =>
      f.d.getDocs(f.d.query(f.d.collection(f.db, collection), f.d.limit(200))),
    ),
  );
  posts = postSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  popups = popupSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  draw();
}

async function save(collection, data) {
  {
    const { id, ...payload } = data,
      f = ctx.f;
    await f.d.setDoc(f.d.doc(f.db, collection, id), {
      ...payload,
      updatedAt: f.d.serverTimestamp(),
    });
  }
  const list = collection === "posts" ? posts : popups;
  const i = list.findIndex((x) => x.id === data.id);
  if (i < 0) list.unshift(data);
  else list[i] = data;
  draw();
}
function draw() {
  for (const [key, list] of [
    ["posts", posts],
    ["popups", popups],
  ]) {
    const box = $("#manage-" + key);
    box.replaceChildren();
    list.forEach((p) => {
      const row = el("div");
      row.className = "management-row";
      const text = el("div");
      text.append(
        el("strong", p.title),
        el(
          "small",
          p.status +
          (key === "posts" ? " · /blog/?id=" + p.id : " · " + p.template + " · " + p.pages),
        ),
      );
      const edit = el("button", "Edit");
      edit.className = "btn ghost";
      edit.onclick = () => (key === "posts" ? editPost(p) : editPopup(p));
      const remove = el("button", "Delete");
      remove.type = "button";
      remove.className = "btn ghost";
      remove.style.color = "#b42318";
      remove.setAttribute("aria-label", "Delete " + p.title);
      remove.onclick = async () => {
        remove.disabled = true;
        try {
          if (await deleteAdminItem(ctx.f, key, p)) {
            if (key === "posts") posts = posts.filter((item) => item.id !== p.id);
            else popups = popups.filter((item) => item.id !== p.id);
            draw();
            toast(
              key === "posts"
                ? "Article deleted."
                : "Pop-up deleted. Visitors may need to refresh an already open page.",
            );
          }
        } catch (error) {
          toast(
            displayError(
              error,
              "Could not delete. Check your connection and administrator access.",
            ),
          );
        } finally {
          remove.disabled = false;
        }
      };
      row.append(text, edit, remove);
      {
        const contentName = key === "posts" ? "Article" : "Pop-up";
        const publish = el("button", p.status === "published" ? "Unpublish" : "Publish");
        publish.type = "button";
        publish.className = p.status === "published" ? "btn ghost" : "btn";
        publish.setAttribute(
          "aria-label",
          (p.status === "published" ? "Unpublish " : "Publish ") + p.title,
        );
        const feedback = el("p");
        feedback.setAttribute("role", "status");
        publish.onclick = async () => {
          if (publish.disabled) return;
          const nextStatus = p.status === "published" ? "draft" : "published";
          publish.disabled = true;
          edit.disabled = true;
          remove.disabled = true;
          feedback.textContent = nextStatus === "published" ? "Publishing…" : "Unpublishing…";
          try {
            const f = ctx.f;
            const changes = { status: nextStatus, updatedAt: f.d.serverTimestamp() };
            if (key === "posts" && nextStatus === "published")
              changes.publishedAt = new Date().toISOString();
            // Update only publication fields: preserve the stored article and its pictures.
            await f.d.updateDoc(f.d.doc(f.db, key, p.id), changes);
            p.status = nextStatus;
            if (changes.publishedAt) p.publishedAt = changes.publishedAt;
            draw();
            toast(
              nextStatus === "published"
                ? key === "posts"
                  ? "Article published. Use View article to see it on the website."
                  : "Pop-up published. It will appear on its selected pages according to its timing and frequency settings."
                : contentName + " unpublished. It is now a draft.",
            );
          } catch (error) {
            console.warn("Content publication failed:", error.code || error.message);
            feedback.textContent =
              error.code === "permission-denied"
                ? "Publishing was denied. Sign in with an authorised admin account and check the deployed content rules. Your draft is still saved."
                : "Could not update publication. Check your connection and try again. Your saved article has not been changed here.";
          } finally {
            publish.disabled = false;
            edit.disabled = false;
            remove.disabled = false;
          }
        };
        row.append(publish, feedback);
      }

      if (key === "posts" && p.status === "published") {
        const view = el("a", "View article / reply to comments");
        view.href = "/blog/?id=" + encodeURIComponent(p.id);
        view.className = "btn ghost";
        row.append(view);
      }
      box.append(row);
    });
    if (!list.length)
      box.append(
        el(
          "p",
          key === "posts"
            ? "No posts yet. Write or import your first article."
            : "No pop-ups configured. Create a campaign to begin.",
        ),
      );
  }
}
export async function uploadImage(file, path) {
  if (file.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error("Use a JPEG, PNG or WebP image smaller than 5 MB.");
  const f = ctx.f,
    ref = f.s.ref(f.storage, path + "/" + uid());
  await f.s.uploadBytes(ref, file, { contentType: file.type });
  return f.s.getDownloadURL(ref);
}
function editPost(p = {}) {
  const form = $("#post-form");
  form.reset();
  for (const k of ["id", "title", "slug", "excerpt", "author", "status", "cover"])
    if (p[k]) form.elements[k].value = p[k];
  $("#rich-editor").innerHTML = sanitize(p.html || "");
  coverPreview.removeAttribute("src");
  coverPreview.hidden = true;
  if (cleanURL(p.cover, true)) {
    coverPreview.src = cleanURL(p.cover, true);
    coverPreview.hidden = false;
  }
  $("#post-status").textContent = "";
  syncPostButtons();
  $("#post-editor").showModal();
}
function editPopup(p = {}) {
  const form = $("#popup-form");
  form.reset();
  Object.entries(p).forEach(([k, v]) => {
    if (form.elements[k])
      form.elements[k].value =
        k.endsWith("At") && v
          ? new Date(Date.parse(v) - new Date(v).getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
          : v;
  });
  $("#popup-status").textContent = "";
  $("#popup-editor").showModal();
}
const editor = $("#rich-editor");
document.addEventListener("selectionchange", () => {
  const s = getSelection();
  if (s.rangeCount && editor.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange();
});
function restore() {
  editor.focus();
  if (range && editor.contains(range.commonAncestorContainer)) {
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(range);
  }
}
function insert(html) {
  restore();
  document.execCommand("insertHTML", false, sanitize(html));
}
$$("[data-format]").forEach((b) => {
  b.onmousedown = (e) => e.preventDefault();
  b.onclick = () => {
    restore();
    document.execCommand(b.dataset.format);
  };
});
$$("[data-block]").forEach((b) => {
  b.onmousedown = (e) => e.preventDefault();
  b.onclick = () => {
    restore();
    document.execCommand("formatBlock", false, b.dataset.block);
  };
});
$("#insert-link").onclick = () => {
  const url = prompt("Link destination (HTTPS or a site path)");
  if (url === null) return;
  if (!cleanURL(url)) {
    toast("Enter an HTTPS URL or a local site path.");
    return;
  }
  restore();
  document.execCommand("createLink", false, cleanURL(url));
};
$("#insert-table").onclick = () => {
  const n = Number(prompt("Rows (1–20)", "3")),
    m = Number(prompt("Columns (1–8)", "3"));
  if (!Number.isInteger(n) || n < 1 || n > 20 || !Number.isInteger(m) || m < 1 || m > 8) return;
  insert(
    "<table><tbody>" +
    Array.from(
      { length: n },
      (_, r) =>
        "<tr>" +
        Array.from({ length: m }, () => (r === 0 ? "<th>Heading</th>" : "<td>Cell</td>")).join(
          "",
        ) +
        "</tr>",
    ).join("") +
    "</tbody></table><p><br></p>",
  );
};
$("#insert-image").onclick = () => $("#article-image").click();
$("#article-image").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const src = await uploadImage(
      file,
      "blogmedia/" + ($("#post-form").elements.id.value || "new"),
    );
    const img = el("img");
    img.src = src;
    img.alt = prompt("Image description", "Article illustration") || "Article illustration";
    insert(img.outerHTML);
  } catch (err) {
    toast(err.message);
  }
  e.target.value = "";
};
editor.addEventListener("paste", (e) => {
  e.preventDefault();
  const text = e.clipboardData.getData("text/html");
  if (text) insert(text);
  else document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
});
editor.addEventListener("drop", (e) => e.preventDefault());
function zipBudget(buffer) {
  const v = new DataView(buffer);
  let sum = 0,
    count = 0;
  for (let i = 0; i <= v.byteLength - 46; i++) {
    if (v.getUint32(i, true) === 0x02014b50) {
      sum += v.getUint32(i + 24, true);
      count++;
      if (sum > 25 * 1024 * 1024 || count > 2000)
        throw Error("This document expands beyond the import limit. Please reduce its size.");
      i += 45 + v.getUint16(i + 28, true) + v.getUint16(i + 30, true) + v.getUint16(i + 32, true);
    }
  }
  if (!count) throw Error("This is not a valid Word document.");
}
$("#document-import").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const status = $("#post-status");
  status.textContent = "Importing document…";
  try {
    if (file.size > 5 * 1024 * 1024) throw Error("Document must be smaller than 5 MB.");
    let html;
    if (/\.docx$/i.test(file.name)) {
      const buffer = await file.arrayBuffer();
      zipBudget(buffer);
      html = await new Promise((resolve, reject) => {
        const w = new Worker("/assets/docx-worker.js");
        const timer = setTimeout(() => {
          w.terminate();
          reject(Error("Import timed out. Try a smaller document."));
        }, 20000);
        w.onmessage = (e) => {
          clearTimeout(timer);
          w.terminate();
          e.data.error ? reject(Error(e.data.error)) : resolve(e.data.html);
        };
        w.onerror = () => {
          clearTimeout(timer);
          w.terminate();
          reject(Error("Could not read this Word document."));
        };
        w.postMessage(buffer, [buffer]);
      });
    } else if (/\.html?$/i.test(file.name)) html = await file.text();
    else if (/\.txt$/i.test(file.name)) {
      const p = el("p", await file.text());
      html = p.outerHTML;
    } else throw Error("Choose a .docx, .html or .txt file.");
    const safe = sanitize(html);
    if (safe.length > 4 * 1024 * 1024)
      throw Error("Imported content is too large. Reduce the image sizes.");
    editor.innerHTML = safe;
    status.textContent = "Document imported. Review headings, images and tables before publishing.";
  } catch (err) {
    status.textContent = displayError(err);
  }
  e.target.value = "";
};
$("#post-form").elements.title.addEventListener("input", (e) => {
  const form = $("#post-form");
  if (!form.elements.id.value)
    form.elements.slug.value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100);
});
$("#post-preview").onclick = () => {
  $("#article-preview-body").innerHTML = sanitize(editor.innerHTML);
  $("#article-preview").showModal();
};
$("#post-form").onsubmit = async (e) => {
  e.preventDefault();
  const form = e.target,
    b = $("button[type=submit]", form),
    status = $("#post-status");
  if (form.dataset.saving === "true") return;
  form.dataset.saving = "true";
  const intendedStatus = e.submitter?.dataset.postAction || form.elements.status.value;
  const submitButtons = [...form.querySelectorAll('button[type="submit"]')];
  submitButtons.forEach((button) => (button.disabled = true));
  status.textContent = intendedStatus === "published" ? "Publishing article…" : "Saving article…";
  try {
    const data = Object.fromEntries(new FormData(form));
    data.status = intendedStatus;
    data.id = data.id || uid();
    if (posts.some((p) => p.slug === data.slug && p.id !== data.id))
      throw Error("Another post uses this slug. Choose a unique slug.");
    const temp = el("div");
    temp.innerHTML = sanitize(editor.innerHTML);
    if (temp.textContent.trim().length < 20)
      throw Error("Add at least 20 characters of article content.");
    const imgs = [...temp.querySelectorAll("img")];
    if (imgs.length > 20) throw Error("Use no more than 20 images per article.");
    for (const img of imgs) {
      if (img.src.startsWith("data:")) {
        const blob = await fetch(img.src).then((r) => r.blob());
        img.src = await uploadImage(blob, "blogmedia/" + data.id);
      }
    }
    data.html = sanitize(temp.innerHTML);
    if (data.html.length > 500000)
      throw Error("Article is too large. Reduce embedded image sizes.");
    if (coverPicker.files[0])
      data.cover = await uploadImage(coverPicker.files[0], "blogmedia/" + data.id);
    else data.cover = cleanURL(data.cover, true);
    const existingPost = posts.find((p) => p.id === data.id);
    data.publishedAt =
      data.status === "published" && existingPost?.status !== "published"
        ? new Date().toISOString()
        : existingPost?.publishedAt || new Date().toISOString();
    await save("posts", data);
    $("#post-editor").close();
    toast(
      data.status === "published"
        ? "Article published. Open it on the website to view or reply to comments."
        : "Article saved as " + data.status + ". Publish it to show it on the website.",
    );
  } catch (err) {
    status.textContent = displayError(
      err,
      "Could not save article. Check your connection and access.",
    );
  } finally {
    delete form.dataset.saving;
    submitButtons.forEach((button) => (button.disabled = false));
  }
};
function popupData() {
  const data = Object.fromEntries(new FormData($("#popup-form")));
  delete data.photo;
  for (const k of ["delay", "threshold", "priority"]) data[k] = Number(data[k]);
  for (const k of ["startsAt", "endsAt"]) data[k] = data[k] ? new Date(data[k]).toISOString() : "";
  if (data.startsAt && data.endsAt && Date.parse(data.endsAt) <= Date.parse(data.startsAt))
    throw Error("End time must be after start time.");
  if (!cleanURL(data.url)) throw Error("Use an HTTPS link or site path for the button.");
  if (data.image && !cleanURL(data.image, true)) throw Error("Invalid image URL.");
  if (data.pages !== "*" && !data.pages.split(",").every((p) => /^\/(?!\/)[\w/-]*$/.test(p.trim())))
    throw Error("Enter site paths such as /, /parts/, /journal/.");
  return data;
}
$("#preview-popup").onclick = () => {
  try {
    const data = popupData();
    $("#popup-editor").close();
    showPopup(data, true);
  } catch (e) {
    $("#popup-status").textContent = e.message;
  }
};
$("#popup-form").onsubmit = async (e) => {
  e.preventDefault();
  const b = $("button[type=submit]", e.target);
  b.disabled = true;
  try {
    const data = popupData();
    data.id = data.id || uid();
    const photo = e.target.elements.photo.files[0];
    if (photo) data.image = await uploadImage(photo, "popupmedia/" + data.id);
    if (data.template === "image" && !data.image)
      throw Error("Add a photo for the photo template.");
    await save("popups", data);
    $("#popup-editor").close();
    toast("Pop-up saved.");
  } catch (err) {
    $("#popup-status").textContent = displayError(
      err,
      "Could not save pop-up. Check your connection and access.",
    );
  } finally {
    b.disabled = false;
  }
};
$("#add-post").onclick = () => editPost();
$("#add-popup").onclick = () => editPopup();
$("#export-content").onclick = () => {
  const a = el("a");
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ posts, popups }, null, 2)], { type: "application/json" }),
  );
  a.href = url;
  a.download = "content.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Cover upload is separate from the rich-text editor's existing picture picker.
const coverField = $("#post-form").elements.cover;
coverField.parentElement.firstChild.textContent = "Cover photo URL (optional)";
const coverLabel = el("label", "Or choose a cover picture from your device");
const coverPicker = el("input");
coverPicker.type = "file";
coverPicker.accept = "image/jpeg,image/png,image/webp";
const coverPreview = el("img");
coverPreview.alt = "Selected article cover";
coverPreview.hidden = true;
coverPreview.style.cssText = "max-width:100%;max-height:220px;object-fit:contain";
const coverHint = el(
  "small",
  "JPEG, PNG or WebP, under 5 MB. A selected file replaces the URL when saved.",
);
coverLabel.append(coverPicker, coverHint, coverPreview);
coverField.parentElement.after(coverLabel);
let coverObjectURL;
coverPicker.onchange = () => {
  if (coverObjectURL) URL.revokeObjectURL(coverObjectURL);
  const file = coverPicker.files[0];
  if (!file) {
    coverPreview.hidden = true;
    return;
  }
  if (
    file.size >= 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  ) {
    $("#post-status").textContent = "Choose a JPEG, PNG or WebP picture under 5 MB.";
    coverPicker.value = "";
    coverPreview.hidden = true;
    return;
  }
  coverField.value = "";
  coverObjectURL = URL.createObjectURL(file);
  coverPreview.src = coverObjectURL;
  coverPreview.hidden = false;
};

async function deleteAdminItem(f, collection, item) {
  if (!["posts", "popups"].includes(collection) || !item?.id) throw Error("Choose a saved item.");
  if (!confirm(`Delete “${item.title}”? This cannot be undone here. Uploaded pictures are kept.`))
    return false;
  await f.d.deleteDoc(f.d.doc(f.db, collection, item.id));
  return true;
}

// Explicit publication action alongside the existing save/visibility controls.
const postForm = $("#post-form");
const savePostButton = postForm.querySelector('button[type="submit"]');
const publishPostButton = el("button", "Publish article");
publishPostButton.type = "submit";
publishPostButton.dataset.postAction = "published";
publishPostButton.className = "btn";
savePostButton.after(publishPostButton);
function syncPostButtons() {
  savePostButton.textContent =
    postForm.elements.status.value === "draft" ? "Save draft" : "Save changes";
  publishPostButton.textContent =
    postForm.elements.status.value === "published" ? "Save and publish" : "Publish article";
}
postForm.elements.status.addEventListener("change", syncPostButtons);
syncPostButtons();
