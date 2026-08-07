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

    // EMAIL TEMPLATES
    loadEmailTemplates: async function() {
        window.HubEmailTemplates = {};
        const defaultTemplates = {
            'Fantaletteratura': `Gent.le docente,\n\nla tua richiesta di iscrizione a Fantaletteratura è stata APPROVATA. 🎉\n...`,
            'La Rotta degli Eroi': `Gent.le docente,\n\nla tua richiesta di iscrizione a La Rotta degli Eroi è stata APPROVATA. 🎉\n...`,
            'La Corte della Commedia': `Gent.le docente,\n\nla tua richiesta di iscrizione alla Loggia dei Magistrati de La Corte della Commedia è stata APPROVATA. 🎉\n...`,
            'Palestra di Riflessione': `Gent.le docente,\n\nla tua richiesta di iscrizione alla Palestra di Riflessione è stata APPROVATA. 🎉\n...`,
            'Ops! Operazione Storia': `Gent.le docente,\n\nla tua richiesta di iscrizione a Ops! Operazione Storia è stata APPROVATA. 🎉\n...`
        };

        try {
            const dbData = await window.RequestsService.getTemplatesFromDb();
            if (dbData) {
                window.HubEmailTemplates = dbData;
            } else {
                window.HubEmailTemplates = defaultTemplates;
                await window.RequestsService.saveTemplatesToDb(defaultTemplates);
            }
        } catch(e) {
            window.HubEmailTemplates = defaultTemplates;
        }

        this.loadEmailTemplateForSelected();
    },

    loadEmailTemplateForSelected: function() {
        const select = document.getElementById('email-template-select');
        const textarea = document.getElementById('email-template-text');
        if (!select || !textarea || !window.HubEmailTemplates) return;
        textarea.value = window.HubEmailTemplates[select.value] || '';
    },

    saveEmailTemplate: async function() {
        const select = document.getElementById('email-template-select');
        const textarea = document.getElementById('email-template-text');
        if (!select || !textarea || !window.HubEmailTemplates) return;

        window.HubEmailTemplates[select.value] = textarea.value;
        try {
            await window.RequestsService.saveTemplatesToDb(window.HubEmailTemplates);
            alert("Modello email salvato con successo per " + select.value + "!");
        } catch(e) {
            alert("Errore nel salvataggio del modello.");
        }
    },

    inviaMailApprovazione: async function(gioco, email, nome) {
        let subject = `Approvazione Registrazione Docente - ${gioco}`;
        let body = (window.HubEmailTemplates && window.HubEmailTemplates[gioco]) ? window.HubEmailTemplates[gioco] : `Gent.le docente,\n\nLa tua registrazione al progetto '${gioco}' è stata approvata.`;
        
        body = encodeURIComponent(body);
        
        try {
            await window.RequestsService.salvaPostaInviata(email, nome, gioco, subject);
        } catch(e) { console.warn("Errore salvataggio posta inviata:", e); }

        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    }
};
window.RequestsUI = RequestsUI;
