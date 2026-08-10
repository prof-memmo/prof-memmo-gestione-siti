// --- Games Service ---
// Gestisce esclusivamente le comunicazioni con Firebase per lo stato dei giochi (Vetrina)

const GamesService = {
    listenToGamesStatus: function(callback) {
        if (!window.fbDb || !window.fbDb.hub) return;
        return window.fbDb.hub.collection('games_status').onSnapshot(snapshot => {
            const statusMap = {};
            snapshot.forEach(doc => {
                statusMap[doc.id] = doc.data();
            });
            callback(statusMap);
        }, error => {
            console.error("Errore listenToGamesStatus (Controlla Regole DB):", error);
            callback({}); // Restituisce oggetto vuoto per sbloccare il caricamento
        });
    },

    updateGameStatus: async function(gameId, isActive) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase non inizializzato");
        return window.fbDb.hub.collection('games_status').doc(gameId).set({
            isActive: isActive,
            popupType: 'wip_text'
        }, { merge: true });
    },

    getGameDetails: async function(gameId) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase non inizializzato");
        const doc = await window.fbDb.hub.collection('games_status').doc(gameId).get();
        return doc.exists ? doc.data() : {};
    },

    saveGameDetails: async function(gameId, data) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase non inizializzato");
        return window.fbDb.hub.collection('games_status').doc(gameId).set(data, { merge: true });
    }
};

window.GamesService = GamesService;
