// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD8tAHsCsRH1ZfXri3UsbDvt31gBYpoWME",
  authDomain: "cococatering-aba04.firebaseapp.com",
  projectId: "cococatering-aba04",
  storageBucket: "cococatering-aba04.firebasestorage.app",
  messagingSenderId: "632665072150",
  appId: "1:632665072150:web:52573c2ced6bc8b2818b37"
};

// Initialize Firebase (usando objeto global de firebase-compat)
if (!window.firebase.apps.length) {
  window.firebase.initializeApp(firebaseConfig);
}

const db = window.firebase.firestore();

export { db };
