import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
const env = await initializeTestEnvironment({
  projectId: "demo-tecur",
  firestore: { rules: readFileSync("firestore.rules", "utf8") },
});
try {
  const publicDb = env.unauthenticatedContext().firestore(),
    userDb = env.authenticatedContext("visitor").firestore(),
    adminDb = env.authenticatedContext("staff", { admin: true }).firestore();
  const listing = {
    title: "Test alternator",
    kind: "part",
    category: "Electrical",
    model: "Camry",
    year: "Confirm by VIN",
    description: "Test part description for a security rule check.",
    price: 0,
    status: "published",
    image: "/assets/detail.webp",
    featured: false,
    updatedAt: serverTimestamp(),
  };
  await assertFails(setDoc(doc(publicDb, "listings", "public-write"), listing));
  await assertFails(setDoc(doc(userDb, "listings", "user-write"), listing));
  await assertSucceeds(setDoc(doc(adminDb, "listings", "published"), listing));
  await assertSucceeds(setDoc(doc(adminDb, "listings", "draft"), { ...listing, status: "draft" }));
  await assertSucceeds(getDoc(doc(publicDb, "listings", "published")));
  await assertFails(getDoc(doc(publicDb, "listings", "draft")));
  await assertSucceeds(
    getDocs(query(collection(publicDb, "listings"), where("status", "==", "published"))),
  );
  await assertFails(getDocs(collection(publicDb, "listings")));
  await assertFails(setDoc(doc(adminDb, "listings", "invalid"), { ...listing, price: -1 }));
  await assertFails(
    setDoc(doc(adminDb, "listings", "xss-image"), { ...listing, image: "javascript:alert(1)" }),
  );
  await assertFails(setDoc(doc(adminDb, "listings", "extra"), { ...listing, unexpected: true }));
  await assertFails(getDoc(doc(publicDb, "requests", "private")));
  await assertFails(setDoc(doc(userDb, "users", "visitor"), { admin: true }));
  const post = {
    title: "Test post",
    slug: "test-post",
    excerpt: "Test article summary",
    author: "Tecur",
    status: "draft",
    cover: "",
    html: "<p>Article body with enough text.</p>",
    publishedAt: "2026-10-31T00:00:00Z",
    updatedAt: serverTimestamp(),
  };
  await assertFails(setDoc(doc(publicDb, "posts", "public-write"), post));
  await assertSucceeds(setDoc(doc(adminDb, "posts", "draft"), post));
  await assertFails(getDoc(doc(publicDb, "posts", "draft")));
  await assertSucceeds(
    setDoc(doc(adminDb, "posts", "published"), { ...post, status: "published" }),
  );
  await assertSucceeds(getDoc(doc(publicDb, "posts", "published")));
  await assertFails(
    setDoc(doc(adminDb, "listings", "bad-gallery"), {
      ...listing,
      images: ["javascript:alert(1)"],
    }),
  );
  await assertSucceeds(
    setDoc(doc(adminDb, "listings", "gallery"), {
      ...listing,
      images: ["/assets/hero.webp", "/assets/detail.webp"],
    }),
  );
  await assertFails(
    setDoc(doc(adminDb, "listings", "too-many"), {
      ...listing,
      images: Array(13).fill("/assets/detail.webp"),
    }),
  );
  const campaign = {
    title: "Workshop update",
    body: "Book a service with our team.",
    template: "card",
    status: "published",
    image: "",
    button: "Book",
    url: "/book/",
    pages: "/",
    trigger: "delay",
    frequency: "session",
    delay: 8,
    threshold: 50,
    startsAt: "",
    endsAt: "",
    priority: 1,
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(setDoc(doc(adminDb, "popups", "campaign"), campaign));
  await assertSucceeds(getDoc(doc(publicDb, "popups", "campaign")));
  await assertFails(setDoc(doc(userDb, "popups", "campaign"), campaign));
  await assertFails(
    setDoc(doc(adminDb, "popups", "unsafe"), { ...campaign, url: "javascript:alert(1)" }),
  );
  await assertFails(setDoc(doc(adminDb, "popups", "bad-delay"), { ...campaign, delay: -1 }));
  await assertFails(
    setDoc(doc(publicDb, "requests", "spam"), {
      name: "Spam",
      phone: "08000000000",
      summary: "No direct public writes",
      status: "new",
      updatedAt: serverTimestamp(),
    }),
  );

  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "requests", "with-media"), {
      name: "Test",
      phone: "08000000000",
      summary: "Test enquiry",
      status: "new",
      photos: ["enquiry-media/test/0.jpg"],
      location: { lat: 6.4, lng: 3.4 },
      liveUntil: "",
      uploadState: "complete",
      updatedAt: serverTimestamp(),
    });
  });
  await assertSucceeds(
    updateDoc(doc(adminDb, "requests", "with-media"), {
      status: "contacted",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(getDoc(doc(publicDb, "requests", "with-media")));
  await assertFails(
    updateDoc(doc(userDb, "requests", "with-media"), {
      status: "closed",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(adminDb, "requests", "with-media"), { photos: [], updatedAt: serverTimestamp() }),
  );
  await assertFails(getDoc(doc(publicDb, "_enquiryTracking", "test")));
  console.log("Firestore access and schema tests passed.");
} finally {
  await env.cleanup();
}
