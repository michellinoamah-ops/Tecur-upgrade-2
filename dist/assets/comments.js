import { connect } from "./firebase.js";
let dispose = () => { };
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
export async function mountComments(article, postId) {
  dispose();
  article.querySelector(".article-comments")?.remove();
  const stops = [];
  let alive = true;
  dispose = () => {
    alive = false;
    stops.forEach((stop) => stop());
  };
  if (!document.querySelector("link[data-comments-style]")) {
    const css = el("link");
    css.rel = "stylesheet";
    css.href = "/assets/comments.css?v=20261112";
    css.dataset.commentsStyle = "true";
    document.head.append(css);
  }
  const section = el("section", null, "article-comments");
  section.setAttribute("aria-label", "Article comments");
  const status = el("p", "Loading comments…");
  status.setAttribute("role", "status");
  section.append(
    el("h2", "Comments"),
    el(
      "p",
      "Ask a question or share your experience. Please keep personal contact details out of comments.",
    ),
    status,
  );
  article.append(section);
  try {
    const f = await connect();
    await f.auth.authStateReady();
    if (!alive || !section.isConnected) return;
    const { d, db } = f;
    const comments = d.collection(db, "posts", postId, "comments");
    const ref = (id) => d.doc(comments, id);
    let isAdmin = false;
    let signingIn;
    let nextCommentAt = 0;
    async function user() {
      await f.auth.authStateReady();
      let u = f.auth.currentUser;
      if (!u) {
        signingIn ||= f.a.signInAnonymously(f.auth).finally(() => { signingIn = null; });
        u = (await signingIn).user;
      }
      isAdmin = (await u.getIdTokenResult()).claims.admin === true;
      return u;
    }
    if (f.auth.currentUser)
      isAdmin = (await f.auth.currentUser.getIdTokenResult()).claims.admin === true;
    function errorMessage(error) {
      const code = error.code || "unknown";
      console.warn("Comment action failed:", code, error.message);
      const messages = {
        "auth/operation-not-allowed": "Guest comments are not enabled yet. Please let the team know.",
        "auth/admin-restricted-operation": "Guest comments are not enabled yet. Please let the team know.",
        "auth/configuration-not-found": "Guest comments need to be activated by the website team.",
        "auth/unauthorized-domain": "Comments are not enabled for this website address. Please let the team know.",
        "auth/invalid-api-key": "The comment service needs attention from the website team.",
        "auth/app-not-authorized": "The comment service is not authorised for this website address.",
        "auth/too-many-requests": "Too many attempts. Please wait a few minutes before trying again.",
        "permission-denied": "Comment access was denied. Wait 15 seconds and retry. If it continues, the website team needs to check comment permissions.",
        "failed-precondition": "Comments need a service setup update. Please let the team know.",
        "unauthenticated": "Your comment session has expired. Refresh the page and try again.",
        "auth/user-token-expired": "Your comment session has expired. Refresh the page and try again.",
        "auth/network-request-failed": "Could not reach the comment service. Check your internet connection and try again.",
        "unavailable": "The comment service is temporarily unavailable. Please try again shortly.",
        "resource-exhausted": "The comment service is busy. Please try again later.",
      };
      return (messages[code] || "Could not complete this action. Please share the error code with the website team.") + " (Code: " + code + ")";
    }
    function form(parentId = "", targetName = "") {
      const form = el("form", null, "comment-form");
      const label = el(
        "label",
        isAdmin ? "Posting as TECUR Automotive · Admin" : "Your display name",
      );
      const name = el("input");
      name.type = "text";
      name.maxLength = 60;
      name.minLength = 2;
      name.required = !isAdmin;
      name.autocomplete = "nickname";
      name.hidden = isAdmin;
      label.append(name);
      const emailLabel = el("label", "Email address");
      const email = el("input");
      email.type = "email";
      email.name = "email";
      email.required = true;
      email.maxLength = 254;
      email.autocomplete = "email";
      email.autocapitalize = "none";
      email.spellcheck = false;
      if (isAdmin && f.auth.currentUser?.email) email.value = f.auth.currentUser.email;
      emailLabel.append(email);
      const privacy = el("small", "Your email is private. Only the website team can see it and use it to follow up on your comment. It will not appear beside your comment.");
      const bodyLabel = el("label", parentId ? "Your reply to " + targetName : "Your comment");
      const body = el("textarea");
      body.required = true;
      body.minLength = 2;
      body.maxLength = 2000;
      body.rows = 4;
      bodyLabel.append(body);
      const send = el("button", parentId ? "Send reply" : "Post comment", "btn");
      send.type = "submit";
      const note = el("p");
      note.setAttribute("role", "status");
      form.append(label, emailLabel, privacy, bodyLabel, send, note);
      form.onsubmit = async (event) => {
        event.preventDefault();
        if (send.disabled || !form.reportValidity()) return;
        if (Date.now() < nextCommentAt) {
          note.textContent = "Please wait " + Math.ceil((nextCommentAt - Date.now()) / 1000) + " seconds before posting again.";
          return;
        }
        if (body.value.trim().length < 2 || (!isAdmin && name.value.trim().length < 2)) {
          note.textContent = "Enter a name and comment with at least two characters.";
          return;
        }
        send.disabled = true;
        note.textContent = "Sending…";
        try {
          const u = await user();
          const displayName = isAdmin ? "TECUR Automotive" : name.value.trim();
          const text = body.value.trim();
          if (displayName.length < 2 || text.length < 2) throw Error("Empty comment");
          const privateEmail = email.value.trim();
          if (privateEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privateEmail)) {
            note.textContent = "Enter a valid email address.";
            return;
          }
          const commentRef = d.doc(comments);
          const batch = d.writeBatch(db);
          batch.set(d.doc(db, "commentLimits", u.uid), {
            updatedAt: d.serverTimestamp(),
            postId,
            commentId: commentRef.id,
          });
          batch.set(commentRef, {
            uid: u.uid,
            name: displayName,
            text,
            parentId,
            isAdmin,
            createdAt: d.serverTimestamp(),
          });
          // Contact details are a separate admin-only record, never public comment fields.
          batch.set(d.doc(db, "commentContacts", commentRef.id), {
            uid: u.uid,
            postId,
            name: displayName,
            email: privateEmail,
            createdAt: d.serverTimestamp(),
          });
          await batch.commit();
          nextCommentAt = Date.now() + 15000;
          body.value = "";
          note.textContent = parentId ? "Reply posted." : "Comment posted.";
        } catch (error) {
          note.textContent = errorMessage(error);
        } finally {
          send.disabled = false;
        }
      };
      return form;
    }
    section.append(form());
    const list = el("div");
    section.append(list);
    const note = el(
      "small",
      "Showing the latest 25 conversations. Each conversation can display its latest 50 replies.",
    );
    section.append(note);
    function row(snapshot, nested = false) {
      const c = snapshot.data(),
        id = snapshot.id;
      const card = el("article", null, "comment-item");
      const author = el("strong", c.isAdmin ? "TECUR Automotive" : c.name);
      card.append(author);
      if (c.isAdmin) card.append(el("span", "Admin", "comment-admin"));
      const date = c.createdAt?.toDate?.();
      if (date) card.append(el("small", date.toLocaleString("en-NG"), "comment-date"));
      card.append(el("p", c.text, "comment-text"));
      const actions = el("div", null, "comment-actions");
      const like = el("button", "Like");
      like.type = "button";
      like.setAttribute("aria-pressed", "false");
      const feedback = el("p");
      feedback.setAttribute("role", "status");
      const likes = d.collection(ref(id), "likes");
      async function countLikes() {
        try {
          const count = await d.getCountFromServer(likes);
          const u = f.auth.currentUser;
          const liked = u ? (await d.getDoc(d.doc(likes, u.uid))).exists() : false;
          if (!alive) return;
          like.textContent = (liked ? "Unlike" : "Like") + " (" + count.data().count + ")";
          like.setAttribute("aria-pressed", String(liked));
        } catch {
          like.textContent = "Like";
        }
      }
      countLikes();
      like.onclick = async () => {
        like.disabled = true;
        feedback.textContent = "";
        try {
          const u = await user();
          const own = d.doc(likes, u.uid);
          await d.runTransaction(db, async (transaction) => {
            const snap = await transaction.get(own);
            if (snap.exists()) transaction.delete(own);
            else transaction.set(own, { createdAt: d.serverTimestamp() });
          });
          await countLikes();
        } catch (error) {
          feedback.textContent = errorMessage(error);
        } finally {
          like.disabled = false;
        }
      };
      actions.append(like);
      // Replies share their root conversation; replying to a reply addresses its author.
      const reply = el("button", "Reply");
      reply.type = "button";
      const editor = el("div");
      editor.hidden = true;
      reply.onclick = () => {
        editor.hidden = !editor.hidden;
        if (!editor.childElementCount) editor.append(form(c.parentId || id, c.name));
      };
      actions.append(reply);
      if (isAdmin) {
        const remove = el("button", "Remove");
        remove.type = "button";
        remove.onclick = async () => {
          if (!confirm("Remove this comment? Removing a conversation also hides its replies."))
            return;
          remove.disabled = true;
          try {
            await d.deleteDoc(ref(id));
            card.remove();
          } catch (error) {
            feedback.textContent = errorMessage(error);
            remove.disabled = false;
          }
        };
        actions.append(remove);
      }
      card.append(actions, feedback, editor);
      if (!nested) {
        const toggle = el("button", "View replies");
        toggle.type = "button";
        toggle.className = "comment-replies-toggle";
        const replies = el("div", null, "comment-replies");
        replies.hidden = true;
        let started = false;
        toggle.onclick = () => {
          replies.hidden = !replies.hidden;
          toggle.textContent = replies.hidden ? "View replies" : "Hide replies";
          if (started) return;
          started = true;
          replies.textContent = "Loading replies…";
          const q = d.query(
            comments,
            d.where("parentId", "==", id),
            d.orderBy("createdAt", "desc"),
            d.limit(50),
          );
          stops.push(
            d.onSnapshot(
              q,
              (snap) => {
                if (!alive) return;
                replies.replaceChildren(
                  ...snap.docs
                    .slice()
                    .reverse()
                    .map((doc) => row(doc, true)),
                );
                if (snap.empty) replies.textContent = "No replies yet.";
              },
              (error) => {
                console.warn("Replies failed:", error.code);
                replies.textContent = errorMessage(error);
              },
            ),
          );
        };
        card.append(toggle, replies);
      }
      return card;
    }
    stops.push(
      d.onSnapshot(
        d.query(
          comments,
          d.where("parentId", "==", ""),
          d.orderBy("createdAt", "desc"),
          d.limit(25),
        ),
        (snap) => {
          if (!alive) return;
          status.textContent = snap.empty ? "Be the first to comment." : "";
          list.replaceChildren(...snap.docs.map((doc) => row(doc)));
        },
        (error) => {
          console.warn("Comments failed:", error.code);
          status.textContent = errorMessage(error);
        },
      ),
    );
  } catch (error) {
    console.warn("Comments unavailable:", error.code);
    status.textContent = "Comments could not start. Please refresh. (Code: " + (error.code || "initialisation-failed") + ")";
  }
}
