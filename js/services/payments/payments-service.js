// --- PAYMENTS SERVICE (Gestione Registro Pagamenti e Transazioni Stripe) ---
const PaymentsService = {
    /**
     * Ascolta in tempo reale le transazioni economiche registrate su Firestore (hub_transactions)
     * Fonte primaria per il Registro Pagamenti contabile/fiscale.
     */
    listenToTransactions: function(callback) {
        if (!window.fbDb || !window.fbDb.hub) {
            console.warn("Firebase Hub DB non disponibile per listenToTransactions");
            return () => {};
        }

        try {
            return window.fbDb.hub.collection("hub_transactions")
                .orderBy("createdAt", "desc")
                .onSnapshot(snapshot => {
                    const transactions = [];
                    snapshot.forEach(doc => {
                        transactions.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    callback(transactions);
                }, error => {
                    console.error("Errore caricamento hub_transactions:", error);
                    callback([]);
                });
        } catch (e) {
            console.error("Eccezione durante l'ascolto di hub_transactions:", e);
            callback([]);
            return () => {};
        }
    },

    /**
     * Recupera una singola transazione per ID
     */
    getTransactionById: async function(transactionId) {
        if (!window.fbDb || !window.fbDb.hub) return null;
        try {
            const doc = await window.fbDb.hub.collection("hub_transactions").doc(transactionId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
        } catch (e) {
            console.error("Errore lettura transazione:", e);
        }
        return null;
    }
};

window.PaymentsService = PaymentsService;
