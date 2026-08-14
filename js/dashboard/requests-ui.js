// --- REQUESTS UI (Dashboard Rendering) ---
const RequestsUI = {
    richiesteDati: [],
    currentSortRichieste: { column: 'data', asc: false },

    init: function() {
        this.setupBridges();
        this.loadEmailTemplates();
    },

    setupBridges: function() {
        window.HubApp = window.HubApp || {};
        window.HubApp.loadRichiesteIscrizione = this.loadRichiesteIscrizione.bind(this);
        window.HubApp.sortRichieste = this.sortRichieste.bind(this);
        window.HubApp.filterRichieste = this.filterRichieste.bind(this);
        window.HubApp.approvaRichiestaHub = this.approvaRichiestaHub.bind(this);
        window.HubApp.rifiutaRichiestaHub = this.rifiutaRichiestaHub.bind(this);
        window.HubApp.loadEmailTemplateForSelected = this.loadEmailTemplateForSelected.bind(this);
        window.HubApp.saveEmailTemplate = this.saveEmailTemplate.bind(this);
    },

    loadRichiesteIscrizione: async function() {
        const tbody = document.querySelector('#hub-richieste-table tbody');
        if(!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Lettura richieste in corso...</td></tr>';
        
        try {
            this.richiesteDati = await window.RequestsService.fetchAllRequests();
            this.renderRichieste();
        } catch(error) {
            console.error("Errore generale loadRichiesteIscrizione:", error);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:red;">Si è verificato un errore durante il caricamento delle richieste. Controlla la console.</td></tr>';
        }
    },

    renderRichieste: function() {
        const tbody = document.querySelector('#hub-richieste-table tbody');
        if (!tbody) return;
        
        const textSearch = (document.getElementById('search-richieste') ? document.getElementById('search-richieste').value.toLowerCase() : '');
        const giocoFilter = (document.getElementById('filter-richieste-gioco') ? document.getElementById('filter-richieste-gioco').value : 'all');
        
        let filtered = this.richiesteDati.filter(r => {
            const matchesText = r.nome.toLowerCase().includes(textSearch) || r.email.toLowerCase().includes(textSearch);
            const matchesGioco = (giocoFilter === 'all' || r.gioco === giocoFilter);
            return matchesText && matchesGioco;
        });

        filtered.sort((a, b) => {
            let valA = a[this.currentSortRichieste.column] || '';
            let valB = b[this.currentSortRichieste.column] || '';
            
            if (this.currentSortRichieste.column === 'data') {
                valA = a.dataValue || 0;
                valB = b.dataValue || 0;
            }
            if (valA < valB) return this.currentSortRichieste.asc ? -1 : 1;
            if (valA > valB) return this.currentSortRichieste.asc ? 1 : -1;
            return 0;
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nessuna richiesta in sospeso.</td></tr>';
            return;
        }

        filtered.forEach(req => {
            const dateStr = req.dataValue > 0 ? new Date(req.dataValue).toLocaleDateString('it-IT') : 'N/D';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px;"><strong>${req.nome}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${req.email}</span></td>
                <td style="padding: 10px;">${req.ruolo}</td>
                <td style="padding: 10px; font-size:0.85rem;">${dateStr}</td>
                <td style="padding: 10px; font-weight:bold;">${req.gioco}</td>
                <td style="padding: 10px; text-align:center;">
                <button class="btn" style="padding: 6px 12px; font-size: 0.8rem;" onclick="HubApp.approvaRichiestaHub('${req.gioco}', '${req.id}', '${req.email}', '${req.nome}')"><i class="fa-solid fa-check"></i> Approva</button>
                <button class="btn" style="background:#e74c3c; padding: 6px 12px; font-size: 0.8rem; margin-top:5px;" onclick="HubApp.rifiutaRichiestaHub('${req.gioco}', '${req.id}')"><i class="fa-solid fa-xmark"></i> Rifiuta</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    sortRichieste: function(colName) {
        if (this.currentSortRichieste.column === colName) {
            this.currentSortRichieste.asc = !this.currentSortRichieste.asc;
        } else {
            this.currentSortRichieste.column = colName;
            this.currentSortRichieste.asc = true;
        }
        this.renderRichieste();
    },

    filterRichieste: function() {
        this.renderRichieste();
    },

    approvaRichiestaHub: async function(gioco, docId, email, nome) {
        if (!confirm(`Sei sicuro di voler approvare l'iscrizione per ${nome} su ${gioco}?`)) return;
        
        try {
            await window.RequestsService.approvaRichiesta(gioco, docId, email, nome);
            alert("Approvazione eseguita con successo su Firestore!");
            this.inviaMailApprovazione(gioco, email, nome);
            this.loadRichiesteIscrizione(); 
        } catch(err) {
            console.error("Errore approvazione:", err);
            alert("Errore durante l'approvazione (potrebbe servire fare login nel sito specifico per rinnovare i permessi). " + err.message);
        }
    },

    rifiutaRichiestaHub: async function(gioco, docId) {
        if (!confirm(`Sei sicuro di voler rifiutare ed eliminare la richiesta di ${docId} su ${gioco}?`)) return;
        try {
            await window.RequestsService.rifiutaRichiesta(gioco, docId);
            alert("Richiesta eliminata.");
            this.loadRichiesteIscrizione();
        } catch(err) {
            console.error("Errore eliminazione:", err);
            alert("Errore durante l'eliminazione: " + err.message);
        }
    },

    _defaultTemplates: {
        'Fantaletteratura': `Oggetto: Richiesta Approvata - Benvenuto su FantaLetteratura! 🎉\n\nGentile Docente,\n\nla tua richiesta di accesso a FantaLetteratura è stata approvata con successo!\n\nDa oggi puoi accedere alla piattaforma per gestire le tue classi didattiche, organizzare gare letterarie e monitorare l'attività degli studenti.\n\nAccedi ora con il tuo account Google:\nhttps://prof-memmo.github.io/Fantaletteratura\n\nBuon lavoro e buone sfide in classe,\nProf. Memmo`,

        'La Rotta degli Eroi': `Oggetto: Richiesta Approvata - Benvenuto su La Rotta degli Eroi! 🧭\n\nGentile Docente,\n\nla tua richiesta di accesso a La Rotta degli Eroi è stata approvata!\n\nPuoi ora condurre i tuoi studenti nei percorsi di epica e mitologia, impostare compiti autentici ed esplorare le rotte narrative.\n\nAccedi alla piattaforma:\nhttps://prof-memmo.github.io/rotta-eroi\n\nBuon viaggio didattico,\nProf. Memmo`,

        'La Corte della Commedia': `Oggetto: Richiesta Approvata - Benvenuto su La Corte della Commedia! 🎭\n\nGentile Docente,\n\nla tua richiesta di accesso a La Corte della Commedia è stata approvata!\n\nEsplora il teatro, la drammaturgia e la commedia con le tue classi attraverso attività cooperative e simulazioni coinvolgenti.\n\nAccedi alla piattaforma:\nhttps://prof-memmo.github.io/corte-commedia\n\nA presto,\nProf. Memmo`,

        'Palestra di Riflessione': `Oggetto: Richiesta Approvata - Benvenuto su Palestra di Riflessione! 🧠\n\nGentile Docente,\n\nla tua richiesta di accesso a Palestra di Riflessione è stata approvata con successo!\n\nPuoi iniziare a utilizzare gli esercizi modulari di grammatica, analisi sintattica e riflessione linguistica con i tuoi studenti.\n\nAccedi subito:\nhttps://prof-memmo.github.io/palestra-di-riflessione\n\nBuon allenamento didattico,\nProf. Memmo`,

        'Ops! Operazione Storia': `Oggetto: Richiesta Approvata - Benvenuto su Ops! Operazione Storia! ⏳\n\nGentile Docente,\n\nla tua richiesta di accesso a Ops! Operazione Storia è stata approvata!\n\nAccedi alla piattaforma per guidare gli studenti nelle indagini storiche e nelle missioni nel tempo:\nhttps://prof-memmo.github.io/games/giochi.html\n\nBuona esplorazione,\nProf. Memmo`,

        'abbonamento_attivo': `Oggetto: Il tuo abbonamento Prof. Memmo è attivo 🎉\n\nGentile Utente,\n\nil tuo abbonamento all'Ecosistema Prof. Memmo è stato attivato con successo dall'amministratore.\n\nAccedi subito al tuo profilo e a tutte le piattaforme abilitate:\nhttps://prof-memmo.github.io/games/profilo.html\n\nA presto,\nProf. Memmo`,

        'abbonamento_pagamento': `Oggetto: Conferma Pagamento e Attivazione Piano - Prof. Memmo 🎉\n\nGentile Utente,\n\nabbiamo ricevuto la conferma del tuo ordine e il tuo piano è ora attivo.\n\nAccedi subito al tuo profilo personale per verificare lo stato e le piattaforme sbloccate:\nhttps://prof-memmo.github.io/games/profilo.html\n\nGrazie per il tuo supporto all'Ecosistema Didattico!\nA presto,\nProf. Memmo`,

        'abbonamento_in_scadenza': `Oggetto: Il tuo abbonamento Prof. Memmo è in scadenza ⏰\n\nGentile Utente,\n\nti ricordiamo che il tuo abbonamento è in scadenza al termine del periodo corrente.\n\nPer continuare a utilizzare tutte le funzionalità avanzate e i materiali didattici senza interruzioni, puoi rinnovare il tuo piano dalla pagina dedicata:\nhttps://prof-memmo.github.io/games/prezzi.html\n\nA presto,\nProf. Memmo`
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
    },

    inviaMailApprovazione: async function(gioco, email, nome) {
        let rawText = '';
        try {
            if (window.RequestsService) {
                const dbData = await window.RequestsService.getTemplatesFromDb();
                if (dbData && dbData[gioco]) {
                    rawText = dbData[gioco];
                }
            }
        } catch(e) {}

        if (!rawText) {
            rawText = this._defaultTemplates[gioco] || `Oggetto: Approvazione Registrazione Docente - ${gioco}\n\nGent.le docente,\n\nLa tua registrazione al progetto '${gioco}' è stata approvata.`;
        }

        let subject = `Approvazione Registrazione Docente - ${gioco}`;
        let body = rawText;
        if (rawText.startsWith('Oggetto:')) {
            const parts = rawText.split('\n\n');
            subject = parts[0].replace('Oggetto:', '').trim();
            body = parts.slice(1).join('\n\n');
        }
        if (nome) {
            body = body.replace(/\[NOME\]/g, nome);
        }

        try {
            if (window.RequestsService) {
                await window.RequestsService.salvaPostaInviata(email, nome, gioco, subject);
            }
        } catch(e) { console.warn("Errore salvataggio posta inviata:", e); }

        window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
};
window.RequestsUI = RequestsUI;
