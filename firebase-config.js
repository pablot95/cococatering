// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD8tAHsCsRH1ZfXri3UsbDvt31gBYpoWME",
  authDomain: "cococatering-aba04.firebaseapp.com",
  projectId: "cococatering-aba04",
  storageBucket: "cococatering-aba04.firebasestorage.app",
  messagingSenderId: "632665072150",
  appId: "1:632665072150:web:52573c2ced6bc8b2818b37"
};

// Esperar a que Firebase esté disponible y retornar una promesa con db
const dbPromise = new Promise((resolve) => {
  function checkFirebase() {
    if (typeof window.firebase !== 'undefined') {
      // Initialize Firebase si no está inicializado
      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase inicializado');
      }
      
      const db = window.firebase.firestore();
      resolve(db);
    } else {
      setTimeout(checkFirebase, 50);
    }
  }
  
  checkFirebase();
});

// Exportar db que es el resultado de la promesa
let db = await dbPromise;

export { db };
