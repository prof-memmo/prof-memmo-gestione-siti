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

// Inizializzazione Firebase
window.fbApps = {};
window.fbDb = {};

try {
    // L'app principale (di default usa Eroi per il login dell'Admin)
    const appEroi = firebase.initializeApp(configEroi);
    window.fbApps.eroi = appEroi;
    window.fbDb.eroi = appEroi.firestore();
    
    // Auth principale (useremo Eroi come sistema centrale per loggare il Prof. Memmo)
    window.fbAuth = appEroi.auth();
    
    // Inizializza l'app secondaria (Commedia)
    const appCommedia = firebase.initializeApp(configCommedia, "Commedia");
    window.fbApps.commedia = appCommedia;
    window.fbDb.commedia = appCommedia.firestore();

    console.log("🔥 Firebase Multi-Istanza inizializzato correttamente");
} catch (e) {
    console.error("Errore inizializzazione Firebase:", e);
}
