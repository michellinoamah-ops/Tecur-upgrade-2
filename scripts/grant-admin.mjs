import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/grant-admin.mjs FIREBASE_USER_UID");
  process.exit(1);
}
initializeApp({ credential: applicationDefault(), projectId: "tecur-automotive" });
const user = await getAuth().getUser(uid);
await getAuth().setCustomUserClaims(uid, { ...user.customClaims, admin: true });
console.log("Administrator role assigned. Sign out and sign in to refresh claims.");
