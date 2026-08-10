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
        
        // Aggiornamento Light Switches
        this.updateSwitchVisuals('analytics', !!data.analytics);
        this.updateSwitchVisuals('sostieni', !!data.sostieni_il_progetto);
        this.updateSwitchVisuals('monetizzazione', !!data.monetizzazione);

        // Aggiornamento Campi Monetizzazione
        const monet = data.monetizzazione_config || {};
        const elTesto = document.getElementById('monet-sostieni-testo');
        const elLink = document.getElementById('monet-paypal-link');
        const elPriceViandante = document.getElementById('price-viandante');
        const elPriceDidattico = document.getElementById('price-docente-didattico');
        const elPriceEcosistema = document.getElementById('price-docente-ecosistema');
        
        if (elTesto) elTesto.value = monet.sostieni_testo || '';
        if (elLink) elLink.value = monet.paypal_link || '';
        if (elPriceViandante) elPriceViandante.value = monet.price_viandante || '9.99';
        if (elPriceDidattico) elPriceDidattico.value = monet.price_docente_didattico || '19.99';
        if (elPriceEcosistema) elPriceEcosistema.value = monet.price_docente_ecosistema || '24.99';
    },

    updateSwitchVisuals: function(settingId, isChecked) {
        const btn = document.getElementById('btn-toggle-' + settingId);
        const text = document.getElementById('status-text-' + settingId);
        if (!btn || !text) return;
        
        if (isChecked) {
            btn.classList.add('on');
            text.textContent = 'ON';
        } else {
            btn.classList.remove('on');
            text.textContent = 'OFF';
        }
    },

    toggleSwitchBtn: async function(settingId) {
        if (!window.EcosystemService) return;
        
        let dbKey = settingId;
        if (settingId === 'sostieni') dbKey = 'sostieni_il_progetto';
        
        const currentVal = this.settingsData[dbKey] || false;
        const newVal = !currentVal;
        
        // Optimistic UI update
        this.settingsData[dbKey] = newVal;
        this.updateSwitchVisuals(settingId, newVal);
        
        try {
            await window.EcosystemService.saveEcosystemSettings({ [dbKey]: newVal });
            console.log(`Setting ${dbKey} aggiornato a ${newVal}`);
        } catch (error) {
            console.error("Errore aggiornamento toggle ecosistema:", error);
            // Revert on error
            this.settingsData[dbKey] = currentVal;
            this.updateSwitchVisuals(settingId, currentVal);
            alert("Errore durante il salvataggio. Riprova.");
        }
    },

    saveMonetizationSettings: async function() {
        if (!window.EcosystemService) return;
        
        const configToSave = {
            sostieni_testo: document.getElementById('monet-sostieni-testo').value,
            paypal_link: document.getElementById('monet-paypal-link').value,
            price_viandante: document.getElementById('price-viandante').value,
            price_docente_didattico: document.getElementById('price-docente-didattico').value,
            price_docente_ecosistema: document.getElementById('price-docente-ecosistema').value,
        };

        try {
            await window.EcosystemService.saveEcosystemSettings({ monetizzazione_config: configToSave });
            alert("Configurazioni salvate con successo!");
            this.settingsData.monetizzazione_config = configToSave;
        } catch (error) {
            console.error("Errore salvataggio monetizzazione:", error);
            alert("Errore durante il salvataggio: " + error.message);
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    // Il caricamento è gestito dall'orchestratore HubApp che chiama EcosistemaUI.init()
    // per assicurarsi che l'EcosystemService sia pronto.
});

window.EcosistemaUI = EcosistemaUI;
