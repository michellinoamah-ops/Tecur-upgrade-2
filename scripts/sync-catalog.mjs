import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { writeFile } from "node:fs/promises";
initializeApp({ credential: applicationDefault(), projectId: "tecur-automotive" });
const snap = await getFirestore().collection("listings").where("status", "==", "published").get();
const data = snap.docs.map((d) => {
  const { updatedAt, ...values } = d.data();
  return { ...values, id: d.id };
});
await writeFile("data/catalog.json", JSON.stringify(data, null, 2));
console.log(
  `Exported ${data.length} published listings. Run the production build and deploy to refresh static pages and sitemap.`,
);

const content = {};
for (const key of ["posts", "popups"]) {
  const result = await getFirestore().collection(key).where("status", "==", "published").get();
  content[key] = result.docs.map((d) => {
    const { updatedAt, ...data } = d.data();
    return { ...data, id: d.id };
  });
}
await writeFile("data/content.json", JSON.stringify(content, null, 2));
console.log("Exported blog posts and pop-up campaigns.");
