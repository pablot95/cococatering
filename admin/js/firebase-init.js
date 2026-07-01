// Firebase Admin Initialization
// Usa el mismo proyecto que el resto del sitio

const firebaseConfig = {
  apiKey: "AIzaSyD8tAHsCsRH1ZfXri3UsbDvt31gBYpoWME",
  authDomain: "cococatering-aba04.firebaseapp.com",
  projectId: "cococatering-aba04",
  storageBucket: "cococatering-aba04.firebasestorage.app",
  messagingSenderId: "632665072150",
  appId: "1:632665072150:web:52573c2ced6bc8b2818b37"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.db      = firebase.firestore();
window.auth    = typeof firebase.auth    === 'function' ? firebase.auth()    : null;
window.storage = typeof firebase.storage === 'function' ? firebase.storage() : null;

// NOTA: Para usar este panel necesitás:
// 1. Habilitar "Email/Password" en Firebase Console → Authentication → Sign-in methods
// 2. Crear el usuario admin en Firebase Console → Authentication → Users
