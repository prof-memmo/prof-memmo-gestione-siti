// --- EMAIL TEMPLATES UI (Dashboard Rendering) ---
const RequestsUI = {
    init: function() {
        this.setupBridges();
        this.loadEmailTemplates();
    },

    setupBridges: function() {
        window.HubApp = window.HubApp || {};
        window.HubApp.loadEmailTemplateForSelected = this.loadEmailTemplateForSelected.bind(this);
        window.HubApp.saveEmailTemplate = this.saveEmailTemplate.bind(this);
    },

    _defaultTemplates: {
        'abbonamento_attivo': `Oggetto: Il tuo account Prof. Memmo è attivo 🎉\n\nGentile Utente,\n\nil tuo account all'Ecosistema Prof. Memmo è stato attivato con successo.\n\nAccedi subito al tuo profilo personale e a tutte le piattaforme abilitate:\nhttps://prof-memmo.github.io/games/profilo.html\n\nA presto,\nProf. Memmo`,

        'abbonamento_pagamento': `Oggetto: Conferma Pagamento e Attivazione Piano - Prof. Memmo 🎉\n\nGentile Utente,\n\nabbiamo ricevuto la conferma del tuo ordine e il tuo piano è ora attivo.\n\nAccedi subito al tuo profilo personale per verificare lo stato e le piattaforme sbloccate:\nhttps://prof-memmo.github.io/games/profilo.html\n\nGrazie per il tuo supporto all'Ecosistema Didattico!\nA presto,\nProf. Memmo`,

        'abbonamento_in_scadenza': `Oggetto: Il tuo abbonamento Prof. Memmo è in scadenza ⏰\n\nGentile Utente,\n\nti ricordiamo che il tuo abbonamento è in scadenza al termine del periodo corrente.\n\nPer continuare a utilizzare tutte le funzionalità avanzate e i materiali didattici senza interruzioni, puoi rinnovare il tuo piano dalla pagina dedicata:\nhttps://prof-memmo.github.io/games/prezzi.html\n\nA presto,\nProf. Memmo`,

        'risposta_contatti': `Gentile Utente,\n\ngrazie per averci contattato tramite il nostro modulo online.\n\nIn merito alla tua richiesta, desideriamo informarti che:\n[MESSAGGIO]\n\nRestiamo a tua completa disposizione per qualsiasi ulteriore chiarimento.\n\nCordiali saluti,\nProf. Memmo`
    },

    // EMAIL TEMPLATES
    loadEmailTemplates: async function() {
        this.loadEmailTemplateForSelected();
    },

    loadEmailTemplateForSelected: async function() {
        const select = document.getElementById('email-template-select');
        const textarea = document.getElementById('email-template-text');
        if (!select || !textarea) return;
        const key = select.value;

        // 1. Mostra subito il default
        textarea.value = this._defaultTemplates[key] || '';

        // 2. Se personalizzato su Firestore, carica la personalizzazione
        try {
            if (window.RequestsService) {
                const dbData = await window.RequestsService.getTemplatesFromDb();
                if (dbData && dbData[key]) {
                    textarea.value = dbData[key];
                }
            }
        } catch(e) {
            console.warn("Uso template default per:", key);
        }
    },

    saveEmailTemplate: async function() {
        const select = document.getElementById('email-template-select');
        const textarea = document.getElementById('email-template-text');
        if (!select || !textarea) return;
        const key = select.value;
        const text = textarea.value;

        try {
            if (window.RequestsService) {
                await window.RequestsService.saveTemplatesToDb({ [key]: text });
                alert("✅ Modello email salvato per: " + select.options[select.selectedIndex].text);
            }
        } catch(e) {
            console.error("Errore salvataggio template:", e);
            alert("Errore durante il salvataggio.");
        }
    }
};
window.RequestsUI = RequestsUI;
