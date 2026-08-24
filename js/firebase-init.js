// firebase-init.js
// Configurazione Hub Centrale Unificato Prof. Memmo (Piattaforma Unica Firebase)

const configHub = {
  apiKey: "AIzaSyD-n2m-kYEuzGXPMKclZTggf4Y5Zm8_cdM",
  authDomain: "prof-memmo-hub.firebaseapp.com",
  projectId: "prof-memmo-hub",
  storageBucket: "prof-memmo-hub.firebasestorage.app",
  messagingSenderId: "839149485689",
  appId: "1:839149485689:web:04ee4fa6237d94d0b71ea8"
};

// Inizializzazione Firebase
window.fbApps = {};
window.fbDb = {};

try {
    const appHub = (firebase.apps || []).find(a => a.name === '[DEFAULT]') || firebase.initializeApp(configHub);
    window.fbApps.hub = appHub;
    const firestoreHub = appHub.firestore();
    
    window.fbDb.hub = firestoreHub;
    window.fbDb.eroi = firestoreHub;
    window.fbDb.commedia = firestoreHub;
    window.fbDb.fanta = firestoreHub;
    window.fbDb.palestra = firestoreHub;
    window.fbDb.ops = firestoreHub;
    
    // Auth principale
    window.fbAuth = appHub.auth();
    window.db = firestoreHub;
    window.auth = window.fbAuth;

    console.log("🔥 Firebase Hub Centrale Unico inizializzato con successo su prof-memmo-hub.");
} catch (e) {
    console.error("Errore inizializzazione Firebase Hub:", e);
}
