// --- Newsletter Service ---
// Gestisce la comunicazione con Firebase per la Newsletter

const NewsletterService = {
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
