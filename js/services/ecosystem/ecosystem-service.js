// --- Ecosystem Service ---
// Gestisce i toggle globali dell'Ecosistema

const EcosystemService = {
    listenToEcosystemSettings: function(callback) {
        if (!window.fbDb || !window.fbDb.hub) return;
        return window.fbDb.hub.collection("hub_settings").doc("ecosistema").onSnapshot(doc => {
            if (doc.exists) {
                callback(doc.data());
            } else {
                callback(null);
            }
        });
    },

    saveEcosystemSettings: async function(data) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase non inizializzato");
        return window.fbDb.hub.collection("hub_settings").doc("ecosistema").set(data, { merge: true });
    }
};

window.EcosystemService = EcosystemService;
