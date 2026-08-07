// --- HUB DB Service (Posta ed Esperienze) ---
const HubDbService = {
    listenToEsperienze: function(callback) {
        if (!window.fbDb || !window.fbDb.hub) return;
        return window.fbDb.hub.collection("hub_esperienze").orderBy("timestamp", "desc").onSnapshot(snap => {
            const data = [];
            snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            callback(data);
        });
    },

    approveEsperienza: async function(docId) {
        if (!window.fbDb || !window.fbDb.hub) return;
        return window.fbDb.hub.collection("hub_esperienze").doc(docId).update({
            approvata: true
        });
    },

    deleteEsperienza: async function(docId) {
        if (!window.fbDb || !window.fbDb.hub) return;
        return window.fbDb.hub.collection("hub_esperienze").doc(docId).delete();
    },

    listenToPostaArrivo: function(callback) {
        if (!window.fbDb || !window.fbDb.hub) return;
        return window.fbDb.hub.collection("hub_posta").orderBy("timestamp", "desc").onSnapshot(snap => {
            const data = [];
            snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            callback(data);
        });
    },

    listenToPostaInviata: function(callback) {
        if (!window.fbDb || !window.fbDb.hub) return;
        return window.fbDb.hub.collection("hub_posta_inviata").orderBy("timestamp", "desc").onSnapshot(snap => {
            const data = [];
            snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            callback(data);
        });
    },

    deletePosta: async function(docId, inArrivo = true) {
        if (!window.fbDb || !window.fbDb.hub) return;
        const col = inArrivo ? "hub_posta" : "hub_posta_inviata";
        return window.fbDb.hub.collection(col).doc(docId).delete();
    }
};
window.HubDbService = HubDbService;
