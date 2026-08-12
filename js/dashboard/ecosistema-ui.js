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
        this.updateSwitchVisuals('sostieni', !!data.sostieni_il_progetto);
        this.updateSwitchVisuals('monetizzazione', !!data.monetizzazione);
        this.updateSwitchVisuals('esperienze', !!data.esperienze);

        // Aggiornamento Campi Sostieni il Progetto
        const sostieni = data.sostieni_config || {};
        const elPaypal = document.getElementById('sostieni-paypal-link');
        const elTestoGratuito = document.getElementById('sostieni-testo-gratuito');
        const elTestoFuturo = document.getElementById('sostieni-testo-futuro');
        const elRingraziamento = document.getElementById('sostieni-ringraziamento');
        
        if (elPaypal) elPaypal.value = sostieni.paypal_link || '';
        if (elTestoGratuito) elTestoGratuito.value = sostieni.testo_gratuito || "❤️ Sostieni Prof. Memmo.\nQuest'anno scolastico le piattaforme sono gratuite. Le donazioni aiutano a creare nuovi giochi didattici per la scuola secondaria.";
        if (elTestoFuturo) elTestoFuturo.value = sostieni.testo_futuro || "❤️ Sostieni Prof. Memmo.\nGli abbonamenti permettono di mantenere attive le piattaforme e sviluppare nuove funzionalità.\nSe vuoi contribuire ulteriormente alla crescita del progetto educativo, puoi sostenere liberamente Prof. Memmo con una donazione.";
        if (elRingraziamento) elRingraziamento.value = sostieni.ringraziamento || '';

        // Aggiornamento Campi Monetizzazione (Prezzi e Massimale Fiscale)
        const monet = data.monetizzazione_config || {};
        const elPriceViandante = document.getElementById('price-viandante');
        const elPriceDidattico = document.getElementById('price-docente-didattico');
        const elPriceEcosistema = document.getElementById('price-docente-ecosistema');
        const elMassimale = document.getElementById('hub-massimale-incassi');
        
        if (elPriceViandante) elPriceViandante.value = monet.price_viandante || '9.99';
        if (elPriceDidattico) elPriceDidattico.value = monet.price_docente_didattico || '19.99';
        if (elPriceEcosistema) elPriceEcosistema.value = monet.price_docente_ecosistema || '24.99';
        
        const massimale = data.massimale_incassi || 4500;
        const incassato = data.totale_incassato_anno || 0;
        const residuo = Math.max(0, massimale - incassato);

        if (elMassimale) elMassimale.value = massimale;
        
        const elDispMassimale = document.getElementById('analytics-massimale-display');
        const elDispIncassato = document.getElementById('analytics-incassato-display');
        const elDispResiduo = document.getElementById('analytics-residuo-display');
        const elHubIncassato = document.getElementById('hub-totale-incassato-display');

        const fmt = val => val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
        if (elDispMassimale) elDispMassimale.textContent = fmt(massimale);
        if (elDispIncassato) elDispIncassato.textContent = fmt(incassato);
        if (elDispResiduo) elDispResiduo.textContent = fmt(residuo);
        if (elHubIncassato) elHubIncassato.textContent = fmt(incassato);
    },

    saveMassimaleConfig: async function() {
        const val = parseFloat(document.getElementById('hub-massimale-incassi').value) || 4500;
        try {
            await window.EcosystemService.saveEcosystemSettings({ massimale_incassi: val });
            alert("✅ Massimale fiscale annuale salvato con successo: " + val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }));
        } catch (e) {
            console.error("Errore salvataggio massimale:", e);
            alert("Errore durante il salvataggio del massimale.");
        }
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
        if (settingId === 'esperienze') dbKey = 'esperienze';
        
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

    saveSostieniSettings: async function() {
        if (!window.EcosystemService) return;
        
        const configToSave = {
            paypal_link: document.getElementById('sostieni-paypal-link').value,
            testo_gratuito: document.getElementById('sostieni-testo-gratuito').value,
            testo_futuro: document.getElementById('sostieni-testo-futuro').value,
            ringraziamento: document.getElementById('sostieni-ringraziamento').value,
        };

        try {
            await window.EcosystemService.saveEcosystemSettings({ sostieni_config: configToSave });
            alert("Configurazioni Sostieni salvate con successo!");
            this.settingsData.sostieni_config = configToSave;
        } catch (error) {
            console.error("Errore salvataggio sostieni:", error);
            alert("Errore durante il salvataggio: " + error.message);
        }
    },

    saveMonetizationSettings: async function() {
        if (!window.EcosystemService) return;
        
        const configToSave = {
            price_viandante: document.getElementById('price-viandante').value,
            price_docente_didattico: document.getElementById('price-docente-didattico').value,
            price_docente_ecosistema: document.getElementById('price-docente-ecosistema').value,
        };

        try {
            await window.EcosystemService.saveEcosystemSettings({ monetizzazione_config: configToSave });
            alert("Prezzi salvati con successo!");
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
