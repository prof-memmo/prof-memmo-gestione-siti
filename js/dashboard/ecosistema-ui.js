// --- Ecosistema UI Service ---
// Gestisce gli interruttori globali per l'ecosistema Hub

const EcosistemaUI = {
    docRef: null,
    unsubscribe: null,
    
    init: function() {
        if (!window.fbDb || !window.fbDb.hub) {
            console.error("Firebase Hub DB not initialized for EcosistemaUI");
            return;
        }

        // Referenza al documento globale
        this.docRef = window.fbDb.hub.collection("hub_settings").doc("ecosistema");

        // Ascolta in tempo reale le modifiche
        this.unsubscribe = this.docRef.onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                
                // Aggiorna la UI in base al database
                const toggleAnalytics = document.getElementById('toggle-analytics');
                if (toggleAnalytics) toggleAnalytics.checked = !!data.analytics;
                
                const toggleSostieni = document.getElementById('toggle-sostieni');
                if (toggleSostieni) toggleSostieni.checked = !!data.sostieni_il_progetto;
                
                const toggleMonetizzazione = document.getElementById('toggle-monetizzazione');
                if (toggleMonetizzazione) toggleMonetizzazione.checked = !!data.monetizzazione;
            } else {
                // Il documento non esiste, creiamo i valori di default
                this.docRef.set({
                    analytics: false,
                    sostieni_il_progetto: false,
                    monetizzazione: false,
                    newsletter: true
                }, { merge: true });
            }
        }, err => {
            console.error("Errore lettura hub_settings/ecosistema:", err);
        });
    },

    toggleSetting: async function(settingId, isChecked) {
        if (!this.docRef) {
            alert("Database non connesso");
            return;
        }
        
        let updateData = {};
        if (settingId === 'analytics') updateData.analytics = isChecked;
        if (settingId === 'sostieni') updateData.sostieni_il_progetto = isChecked;
        if (settingId === 'monetizzazione') updateData.monetizzazione = isChecked;

        try {
            await this.docRef.set(updateData, { merge: true });
            console.log(`Impostazione ${settingId} aggiornata a ${isChecked}`);
        } catch (error) {
            console.error(`Errore aggiornamento impostazione ${settingId}:`, error);
            alert("Errore durante l'aggiornamento. Riprova.");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(window.fbDb && window.fbDb.hub) {
            EcosistemaUI.init();
        } else {
            console.warn("fbDb.hub non trovato in tempo per EcosistemaUI");
            // Retry
            setTimeout(() => {
                if(window.fbDb && window.fbDb.hub) EcosistemaUI.init();
            }, 2000);
        }
    }, 1500);
});

window.EcosistemaUI = EcosistemaUI;
