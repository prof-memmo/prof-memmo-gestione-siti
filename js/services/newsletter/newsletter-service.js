// --- Newsletter Service ---
// Gestisce la comunicazione con Firebase e la sincronizzazione con Brevo (Lista ID 3)

const NewsletterService = {
    /**
     * Ascolta lo stato e la data dell'ultimo sync con Brevo
     */
    listenToSyncStatus: function(callback) {
        if (!window.fbDb || !window.fbDb.hub) return;
        return window.fbDb.hub.collection("hub_settings").doc("newsletter_sync").onSnapshot(doc => {
            if (doc.exists) {
                callback(doc.data());
            } else {
                callback(null);
            }
        }, err => {
            console.warn("Avviso ascolto stato sync Brevo:", err);
            callback(null);
        });
    },

    /**
     * Esegue la sincronizzazione forzata massiva di tutti gli utenti verso Brevo
     */
    syncAllWithBrevo: async function() {
        if (!window.firebase || !window.firebase.functions) {
            throw new Error("Modulo Firebase Functions non caricato.");
        }

        const syncFn = window.firebase.functions().httpsCallable("syncAllBrevoContacts");
        const result = await syncFn({});
        return result.data;
    },

    listenToNewsletters: function(callback) {
        if (!window.fbDb || !window.fbDb.hub) return;
        return window.fbDb.hub.collection("hub_newsletters").orderBy("timestamp", "desc").onSnapshot(snap => {
            const data = [];
            snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            callback(data);
        });
    },

    saveNewsletterDraft: async function(oggetto, corpo) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase non inizializzato");
        return window.fbDb.hub.collection("hub_newsletters").add({
            oggetto: oggetto,
            corpo: corpo,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    deleteNewsletterDraft: async function(docId) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase non inizializzato");
        return window.fbDb.hub.collection("hub_newsletters").doc(docId).delete();
    }
};

window.NewsletterService = NewsletterService;
