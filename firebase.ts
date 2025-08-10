
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCGQJocwgiNtGkfiOHucyn1E-8IHxGpoKA",
  authDomain: "cafe-roma-pos.firebaseapp.com",
  projectId: "cafe-roma-pos",
  storageBucket: "cafe-roma-pos.firebasestorage.app",
  messagingSenderId: "353032502861",
  appId: "1:353032502861:web:2becd875af14d271e0e604"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db: any = null;
let dbError: Error | null = null;

try {
  db = getFirestore(app);
  // Enable offline persistence for Firestore. This allows the app to work offline
  // and sync data automatically when a connection is re-established.
  // This must be called before any other Firestore operations.
  enableIndexedDbPersistence(db, {
    // Use unlimited cache size. The browser will manage storage quotas.
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // This can happen if multiple tabs are open, as persistence can only be
      // enabled in one tab at a time. The app will continue to function
      // online in this tab.
      console.warn("Firestore persistence failed, likely due to multiple tabs. App will still work online.");
    } else if (err.code == 'unimplemented') {
      // The browser is not supported for persistence.
      console.warn("Firestore persistence is not supported in this browser.");
    }
  });
} catch (e: any) {
  console.error("CRITICAL: Failed to initialize Firestore. This can be caused by incorrect configuration or the service not being enabled in your Firebase project.", e);
  dbError = e;
}

export { db, auth, dbError };