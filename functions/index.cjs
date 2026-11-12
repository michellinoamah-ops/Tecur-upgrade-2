const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { createHash } = require("node:crypto");
const sharp = require("sharp");
const { validate, location, photos } = require("./validation.cjs");

initializeApp();

// Set v2 global options properly
setGlobalOptions({
  region: "europe-west1",
  maxInstances: 5,
  timeoutSeconds: 60,
  memory: "256MiB",
});

const hash = (s) => createHash("sha256").update(s).digest("hex");
const bucket = () => getStorage().bucket("tecur-automotive.firebasestorage.app");

exports.submitEnquiry = onCall({ enforceAppCheck: true }, async (request) => {
  let input, point, images;
  try {
    input = validate(request.data);
    point = location(request.data.location);
    images = photos(request.data.photos);
    if (request.data.live && (!point || !/^[a-f0-9]{48}$/.test(request.data.trackingToken || "")))
      throw Error("Invalid live location request.");
  } catch (e) {
    throw new HttpsError("invalid-argument", e.message);
  }
  const db = getFirestore(),
    now = Date.now(),
    hour = Math.floor(now / 3600000),
    ip = request.rawRequest.ip;
  if (!ip) throw new HttpsError("unavailable", "Unable to validate request origin.");
  const safeImages = [];
  try {
    for (const bytes of images)
      safeImages.push(
        await sharp(bytes, { limitInputPixels: 40000000 })
          .rotate()
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toBuffer(),
      );
  } catch {
    throw new HttpsError(
      "invalid-argument",
      "A photo could not be decoded. Please choose another image.",
    );
  }
  const id = hash(request.data.requestId + "|" + request.app.appId),
    entry = db.collection("requests").doc(id),
    limit = db.collection("_enquiryLimits").doc(hash(ip + "|" + request.app.appId + "|" + hour)),
    tracking = db.collection("_enquiryTracking").doc(id);
  const liveUntil = request.data.live ? new Date(now + 30 * 60000).toISOString() : "";
  await db.runTransaction(async (tx) => {
    const [old, rate] = await Promise.all([tx.get(entry), tx.get(limit)]);
    if (old.exists) return;
    const r = rate.exists ? rate.data() : { count: 0, last: 0 };
    if (r.count >= 5 || now - r.last < 15000)
      throw new HttpsError("resource-exhausted", "Please wait before sending another enquiry.");
    tx.set(limit, {
      count: r.count + 1,
      last: now,
      expiresAt: Timestamp.fromMillis(now + 7200000),
    });
    tx.create(entry, {
      ...input,
      location: point,
      photos: [],
      liveUntil,
      status: "new",
      updatedAt: FieldValue.serverTimestamp(),
      uploadState: images.length ? "pending" : "complete",
    });
    if (request.data.live)
      tx.create(tracking, {
        tokenHash: hash(request.data.trackingToken),
        appId: request.app.appId,
        expiresAt: Timestamp.fromMillis(now + 30 * 60000),
        active: true,
        last: 0,
      });
  });
  const saved = await entry.get();
  if (saved.data().uploadState === "pending") {
    const paths = [];
    for (let i = 0; i < images.length; i++) {
      const path = "enquiry-media/" + id + "/" + i + ".jpg";
      await bucket()
        .file(path)
        .save(safeImages[i], {
          resumable: false,
          contentType: "image/jpeg",
          metadata: { cacheControl: "private, no-store" },
        });
      paths.push(path);
    }
    await entry.update({
      photos: paths,
      uploadState: "complete",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  return { ok: true, id, reference: id.slice(0, 12).toUpperCase() };
});

exports.updateEnquiryLocation = onCall({ enforceAppCheck: true }, async (request) => {
  const d = request.data || {};
  if (!/^[a-f0-9]{64}$/.test(d.id || "") || !/^[a-f0-9]{48}$/.test(d.token || ""))
    throw new HttpsError("permission-denied", "Invalid sharing session.");
  let point = null;
  if (!d.stop)
    try {
      point = location(d.location);
      if (!point) throw Error();
    } catch {
      throw new HttpsError("invalid-argument", "Invalid location.");
    }
  const db = getFirestore(),
    ref = db.collection("_enquiryTracking").doc(d.id),
    entry = db.collection("requests").doc(d.id),
    now = Date.now();
  await db.runTransaction(async (tx) => {
    const [snap, enquiry] = await Promise.all([tx.get(ref), tx.get(entry)]);
    const s = snap.data();
    if (
      !s ||
      !enquiry.exists ||
      s.appId !== request.app.appId ||
      s.tokenHash !== hash(d.token) ||
      !s.active ||
      s.expiresAt.toMillis() < now
    )
      throw new HttpsError("permission-denied", "Sharing session ended.");
    if (d.stop) {
      tx.update(ref, { active: false });
      tx.update(entry, { liveUntil: "", updatedAt: FieldValue.serverTimestamp() });
      return;
    }
    if (now - s.last < 10000) throw new HttpsError("resource-exhausted", "Please wait.");
    tx.update(ref, { last: now });
    tx.update(entry, { location: point, updatedAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

exports.getEnquiryPhoto = onCall({ enforceAppCheck: true }, async (request) => {
  if (request.auth?.token.admin !== true)
    throw new HttpsError("permission-denied", "Staff access required.");
  const d = request.data || {};
  if (
    !/^[a-f0-9]{64}$/.test(d.id || "") ||
    !Number.isInteger(d.index) ||
    d.index < 0 ||
    d.index > 2
  )
    throw new HttpsError("invalid-argument", "Invalid photo.");

  const snap = await getFirestore().collection("requests").doc(d.id).get();
  const path = snap.data()?.photos?.[d.index];

  if (path !== "enquiry-media/" + d.id + "/" + d.index + ".jpg")
    throw new HttpsError("not-found", "Photo unavailable.");
  const [bytes] = await bucket().file(path).download();
  return { data: "data:image/jpeg;base64," + bytes.toString("base64") };
});