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
        this.updateSwitchVisuals('come-funziona', data.come_funziona_visibile !== false);

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

        // Prezzi piani
        const monet = data.monetizzazione_config || {};
        const elPriceViandante = document.getElementById('price-viandante');
        const elPriceDocente = document.getElementById('price-docente');
        const elPriceEcosistema = document.getElementById('price-ecosistema');
        const elMassimale = document.getElementById('hub-massimale-incassi');
        
        if (elPriceViandante) elPriceViandante.value = monet.price_viandante || '9.99';
        if (elPriceDocente) elPriceDocente.value = monet.price_docente || '19.99';
        if (elPriceEcosistema) elPriceEcosistema.value = monet.price_ecosistema || '24.99';
        
        // Diciture piani
        const piani = data.piani_config || {};
        const setVal = (id, def) => { const el = document.getElementById(id); if (el) el.value = piani[id] !== undefined ? piani[id] : def; };
        setVal('desc-viandante', 'Perfetto per appassionati e giocatori che vogliono esplorare i giochi e le storie.');
        setVal('btn-viandante', 'Scegli Viandante');
        setVal('features-viandante', '+ FantaLetteratura (Versione Base)\n+ Palestra di Riflessione (Versione Base)\n+ La Rotta degli Eroi\n+ La Corte dei Dannati\n+ Accesso ai futuri giochi narrativi\n- Strumenti docente (creazione classi, tornei, dashboard)');
        setVal('desc-docente', 'Gli strumenti definitivi per gestire le tue classi e la didattica.');
        setVal('btn-docente', 'Scegli Docente');
        setVal('features-docente', '+ FantaLetteratura (Completo): Tornei, missioni\n+ Palestra (Completa): Analisi logica, testi B2\n+ Gestione Classi e Studenti\n+ Codici Classe privati\n+ Strumenti Docente e Dashboard avanzata\n- Non include La Rotta degli Eroi o Travel Agency');
        setVal('desc-ecosistema', "L'esperienza totale. Accesso illimitato a tutti i contenuti e strumenti.");
        setVal('btn-ecosistema', 'Ottieni Tutto');
        setVal('features-ecosistema', '+ Tutto il piano Docente Completo Didattico\n+ La Rotta degli Eroi\n+ Travel Agency C.\n+ Tutti i futuri giochi completi in anteprima\n+ Assistenza dedicata');

        // Campi Come Funziona
        const cf = data.come_funziona_config || {};
        const setInputVal = (id, def) => { const el = document.getElementById(id); if (el) el.value = cf[id] !== undefined ? cf[id] : def; };
        setInputVal('scheda1-titolo', 'Funzionalità Attualmente Attive');
        setInputVal('scheda1-docenti', 'Creazione ed organizzazione delle classi didattiche\nGenerazione di Codici Classe per gli studenti\nGestione fino a 4 squadre su FantaLetteratura\nAttività di riflessione e grammatica su Palestra di Riflessione');
        setInputVal('scheda1-studenti', 'Accesso alle classi create dal proprio docente tramite codice\nPartecipazione attiva ai giochi didattici e alle sfide\nMonitoraggio dei progressi e delle attività svolte\nProfilo Studente attivo e collegato alla scuola');
        setInputVal('scheda1-viandanti', "Esplorazione libera delle app e dei giochi disponibili\nAccesso alle versioni dimostrative ed alle attività aperte\nPartecipazione alla filosofia ludica dell'Ecosistema");
        setInputVal('scheda2-titolo', 'In Lavorazione / Prossimamente');
        setInputVal('scheda2-intro', "L'Ecosistema Prof. Memmo è in continua evoluzione. Stiamo sviluppando nuove espansioni e funzionalità avanzate per arricchire l'esperienza in classe:");
        setInputVal('scheda2-voci', 'Tornei interscolastici estesi\nModuli avanzati di analisi sintattica e del periodo\nNuovi giochi di ruolo e storie interattive\nStrumenti di reportistica e statistiche per docenti');
        this.updateSwitchVisuals('scheda1', cf.scheda1_visibile !== false);
        this.updateSwitchVisuals('scheda2', cf.scheda2_visibile !== false);

        // Massimale
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
        
        // Mappa settingId -> chiave Firestore
        const keyMap = {
            'sostieni': 'sostieni_il_progetto',
            'esperienze': 'esperienze',
            'monetizzazione': 'monetizzazione',
            'come_funziona': 'come_funziona_visibile',
        };
        
        // scheda1 e scheda2 sono dentro come_funziona_config
        if (settingId === 'scheda1' || settingId === 'scheda2') {
            const cf = this.settingsData.come_funziona_config || {};
            const key = settingId + '_visibile';
            const newVal = !(cf[key] !== false);
            cf[key] = newVal;
            this.settingsData.come_funziona_config = cf;
            this.updateSwitchVisuals(settingId, newVal);
            try {
                await window.EcosystemService.saveEcosystemSettings({ come_funziona_config: cf });
            } catch (e) {
                console.error('Errore toggle scheda:', e);
            }
            return;
        }
        
        const dbKey = keyMap[settingId] || settingId;
        const currentVal = this.settingsData[dbKey] || false;
        const newVal = !currentVal;
        
        this.settingsData[dbKey] = newVal;
        this.updateSwitchVisuals(settingId, newVal);
        
        try {
            await window.EcosystemService.saveEcosystemSettings({ [dbKey]: newVal });
        } catch (error) {
            console.error('Errore toggle:', error);
            this.settingsData[dbKey] = currentVal;
            this.updateSwitchVisuals(settingId, currentVal);
            alert('Errore durante il salvataggio. Riprova.');
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

    saveComeFunziona: async function() {
        if (!window.EcosystemService) return;
        const cf = this.settingsData.come_funziona_config || {};
        const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
        const config = {
            ...cf,
            'scheda1-titolo': g('scheda1-titolo'),
            'scheda1-docenti': g('scheda1-docenti'),
            'scheda1-studenti': g('scheda1-studenti'),
            'scheda1-viandanti': g('scheda1-viandanti'),
            'scheda2-titolo': g('scheda2-titolo'),
            'scheda2-intro': g('scheda2-intro'),
            'scheda2-voci': g('scheda2-voci'),
        };
        try {
            await window.EcosystemService.saveEcosystemSettings({ come_funziona_config: config });
            this.settingsData.come_funziona_config = config;
            alert('✅ Contenuto pagina "Come Funziona" salvato!');
        } catch (e) {
            console.error('Errore salvataggio Come Funziona:', e);
            alert('Errore durante il salvataggio.');
        }
    },

    savePrices: async function() {
        if (!window.EcosystemService) return;
        const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
        const monetConfig = {
            price_viandante: g('price-viandante'),
            price_docente: g('price-docente'),
            price_ecosistema: g('price-ecosistema'),
        };
        const pianiConfig = {
            'desc-viandante': g('desc-viandante'),
            'btn-viandante': g('btn-viandante'),
            'features-viandante': g('features-viandante'),
            'desc-docente': g('desc-docente'),
            'btn-docente': g('btn-docente'),
            'features-docente': g('features-docente'),
            'desc-ecosistema': g('desc-ecosistema'),
            'btn-ecosistema': g('btn-ecosistema'),
            'features-ecosistema': g('features-ecosistema'),
        };
        try {
            await window.EcosystemService.saveEcosystemSettings({
                monetizzazione_config: monetConfig,
                piani_config: pianiConfig
            });
            this.settingsData.monetizzazione_config = monetConfig;
            this.settingsData.piani_config = pianiConfig;
            alert('✅ Prezzi e diciture piani salvati!');
        } catch (e) {
            console.error('Errore salvataggio prezzi:', e);
            alert('Errore durante il salvataggio.');
        }
    },

    saveMonetizationSettings: async function() {
        // Alias per compatibilità
        return this.savePrices();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    // Il caricamento è gestito dall'orchestratore HubApp che chiama EcosistemaUI.init()
    // per assicurarsi che l'EcosystemService sia pronto.
});

window.EcosistemaUI = EcosistemaUI;
