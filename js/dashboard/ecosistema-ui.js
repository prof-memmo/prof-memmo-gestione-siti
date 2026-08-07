// --- Ecosistema UI Service ---
// Gestisce gli interruttori globali per l'ecosistema Hub

const EcosistemaUI = {
    settingsData: {},
    
    init: function() {
        if (!window.EcosystemService) {
            console.error("EcosystemService non caricato.");
            return;
        }
        
        window.EcosystemService.listenToEcosystemSettings(data => {
            if (data) {
                this.settingsData = data;
                this.renderUI();
            }
        });
    },

    renderUI: function() {
        const data = this.settingsData;
        const toggleAnalytics = document.getElementById('toggle-analytics');
        if (toggleAnalytics) toggleAnalytics.checked = !!data.analytics;
        
        const toggleSostieni = document.getElementById('toggle-sostieni');
        if (toggleSostieni) toggleSostieni.checked = !!data.sostieni_il_progetto;
        
        const toggleMonetizzazione = document.getElementById('toggle-monetizzazione');
        if (toggleMonetizzazione) toggleMonetizzazione.checked = !!data.monetizzazione;
    },

    toggleSetting: async function(settingId, isChecked) {
        if (!window.EcosystemService) return;
        
        let dbKey = settingId;
        if (settingId === 'sostieni') dbKey = 'sostieni_il_progetto';
        
        const currentVal = this.settingsData[dbKey] || false;
        const newVal = isChecked !== undefined ? isChecked : !currentVal;
        
        // Optimistic UI update
        this.settingsData[dbKey] = newVal;
        this.renderUI();
        
        try {
            await window.EcosystemService.saveEcosystemSettings({ [dbKey]: newVal });
            console.log(`Setting ${dbKey} aggiornato a ${newVal}`);
        } catch (error) {
            console.error("Errore aggiornamento toggle ecosistema:", error);
            // Revert on error
            this.settingsData[dbKey] = currentVal;
            this.renderUI();
            alert("Errore durante il salvataggio. Riprova.");
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    // Il caricamento è gestito dall'orchestratore HubApp che chiama EcosistemaUI.init()
    // per assicurarsi che l'EcosystemService sia pronto.
});

window.EcosistemaUI = EcosistemaUI;
