import { firebaseConfig, appCheckSiteKey } from "./config.js";
let connection;
export function connect() {
  if (!connection)
    connection = (async () => {
      const [appSDK, authSDK, dbSDK, storageSDK, functionsSDK] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/13.1.0/firebase-storage.js"),
        import("https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js"),
      ]);
      const app = appSDK.initializeApp(firebaseConfig);
      if (appCheckSiteKey) {
        const ac = await import("https://www.gstatic.com/firebasejs/13.1.0/firebase-app-check.js");
        ac.initializeAppCheck(app, {
          provider: new ac.ReCaptchaEnterpriseProvider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
      }
      const auth = authSDK.getAuth(app);
      await authSDK.setPersistence(auth, authSDK.browserSessionPersistence).catch(() => {});
      return {
        functions: functionsSDK.getFunctions(app, "europe-west1"),
        fn: functionsSDK,
        auth,
        db: dbSDK.getFirestore(app),
        storage: storageSDK.getStorage(app),
        a: authSDK,
        d: dbSDK,
        s: storageSDK,
      };
    })().catch((error) => {
      connection = null;
      throw error;
    });
  return connection;
}
