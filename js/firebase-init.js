// firebase-init.js
// Configurazione per connettersi simultaneamente a molteplici progetti Firebase.

const configEroi = {
    apiKey: "AIzaSyCVCg9G6RbDDYMoQ0oWCs2Z9-1iFBSZZ5A",
    authDomain: "la-rotta-degli-eroi.firebaseapp.com",
    projectId: "la-rotta-degli-eroi",
    storageBucket: "la-rotta-degli-eroi.firebasestorage.app",
    messagingSenderId: "947694535022",
    appId: "1:947694535022:web:905d6739ebe61fe27f417f"
};

const configCommedia = {
    apiKey: "AIzaSyCgz52XehTx0qQQ1MkKtTnIM5LmjJKcPls",
    authDomain: "la-corte-della-commedia.firebaseapp.com",
    projectId: "la-corte-della-commedia",
    storageBucket: "la-corte-della-commedia.firebasestorage.app",
    messagingSenderId: "298739188542",
    appId: "1:298739188542:web:f1613b00d197ff4859e26f"
};

const configHub = {
  apiKey: "AIzaSyD-n2m-kYEuzGXPMKclZTggf4Y5Zm8_cdM",
  authDomain: "prof-memmo-hub.firebaseapp.com",
  projectId: "prof-memmo-hub",
  storageBucket: "prof-memmo-hub.firebasestorage.app",
  messagingSenderId: "839149485689",
  appId: "1:839149485689:web:04ee4fa6237d94d0b71ea8"
};

const configFanta = {
  apiKey: "AIzaSyB3wKx8ssbZVMtbiH5vbDDvAEgwzZcfRVQ",
  authDomain: "fantaletteratura-a7ff1.firebaseapp.com",
  projectId: "fantaletteratura-a7ff1",
  storageBucket: "fantaletteratura-a7ff1.firebasestorage.app",
  messagingSenderId: "358353594988",
  appId: "1:358353594988:web:07d26d2f4439e9116b8649"
};

const configPalestra = {
  apiKey: "AIzaSyC9WhGYaWyaJtqDHhKhii5yhnP363SczJo",
  authDomain: "palestra-riflessione.firebaseapp.com",
  projectId: "palestra-riflessione",
  storageBucket: "palestra-riflessione.firebasestorage.app",
  messagingSenderId: "617112106958",
  appId: "1:617112106958:web:f017958c52e4f1d5845d9f"
};

// Inizializzazione Firebase
window.fbApps = {};
window.fbDb = {};

try {
    // L'app principale (di default usa Eroi per il login dell'Admin)
    const appEroi = firebase.initializeApp(configEroi);
    window.fbApps.eroi = appEroi;
    window.fbDb.eroi = appEroi.firestore();
    
    // Inizializza l'app centrale (Hub per posta, calendario ed esperienze)
    const appHub = firebase.initializeApp(configHub, "Hub");
    window.fbApps.hub = appHub;
    window.fbDb.hub = appHub.firestore();
    
    // Auth principale (useremo il progetto Hub dedicato per loggare il Prof. Memmo)
    window.fbAuth = appHub.auth();
    
    // Inizializza l'app secondaria (Commedia)
    const appCommedia = firebase.initializeApp(configCommedia, "Commedia");
    window.fbApps.commedia = appCommedia;
    window.fbDb.commedia = appCommedia.firestore();

    // Inizializza Fantaletteratura
    const appFanta = firebase.initializeApp(configFanta, "Fanta");
    window.fbApps.fanta = appFanta;
    window.fbDb.fanta = appFanta.firestore();

    // Inizializza Palestra di Riflessione
    const appPalestra = firebase.initializeApp(configPalestra, "Palestra");
    window.fbApps.palestra = appPalestra;
    window.fbDb.palestra = appPalestra.firestore();

    console.log("🔥 Firebase Multi-Istanza inizializzato correttamente (Eroi, Commedia, Hub, Fanta, Palestra)");
} catch (e) {
    console.error("Errore inizializzazione Firebase:", e);
}
