const HubApp = {
    user: null,
    allUsers: [], // Array globale per i filtri di ricerca

    init: function() {
        this.bindEvents();
        if (window.fbAuth && window.AuthService) {
            window.AuthService.init(window.fbAuth);
        }
        this.checkAuth();
    },

    bindEvents: function() {
        // Eventuali altri listener
    },

    checkAuth: function() {
        if (!window.fbAuth || !window.AuthService) {
            document.getElementById('login-overlay').innerHTML = "<h2 style='color:red;'>Errore Inizializzazione Firebase/AuthService</h2><p>Controlla la console.</p>";
            return;
        }

        window.AuthService.onAuthStateChanged((user, error) => {
            if (error) {
                console.error(error);
                return;
            }
            if (user) {
                this.user = user;
                // Controlla se l'utente è l'admin (Prof Memmo)
                if (user.email && user.email.toLowerCase() === 'prof.memmo@gmail.com') {
                    document.getElementById('login-overlay').style.display = 'none';
                    this.loadData();
                } else {
                    alert("Accesso negato. L'email riconosciuta è: " + (user.email || 'Nessuna email') + ". Solo l'amministratore può accedere.");
                    this.logout();
                }
            } else {
                this.user = null;
                document.getElementById('login-overlay').style.display = 'flex';
                const btn = document.getElementById('btn-google-login');
                if(btn) btn.innerHTML = '<i class="fa-brands fa-google"></i> Accedi con Google';
            }
        });
    },

    logout: function() {
        if (window.AuthService) {
            window.AuthService.logout().then(() => {
                window.location.reload();
            });
        }
    },

    loadData: function() {
        if(window.MessagesUI) window.MessagesUI.init();
        
        // Inizializza i nuovi sottomoduli UI
        if(window.UsersUI) window.UsersUI.init();
        if(window.GamesUI) window.GamesUI.init();
        if(window.RequestsUI) window.RequestsUI.init();
        if(window.NewsletterUI) window.NewsletterUI.init();
        if(window.EcosistemaUI) window.EcosistemaUI.init();
        
        // Carica i dati aggregati (Utenti, Analytics, Newsletter)
        this.loadIscrittiAggregati();

        // Esegue lo script di riparazione silenziosa DB (una tantum)
        if(window.DBFixer) window.DBFixer.fixDatabasesBackground();
    },



    loadIscrittiAggregati: async function() {
        try {
            const tbody = document.querySelector('#hub-iscritti-table tbody');
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento iscritti da tutti i server...</td></tr>';
            
            const data = await window.CrossProjectsService.fetchAllUsers();
            
            this.allUsers = data.users; // Salva per i filtri globali (se serve ad altri moduli)
            
            // Passa i dati al modulo Dashboard Utenti (UI)
            if (window.UsersUI) {
                window.UsersUI.updateCounters(data.stats);
                window.UsersUI.setUsers(data.users);
            }

            // Passa i dati al modulo Newsletter
            if(window.NewsletterUI) window.NewsletterUI.setUsers(this.allUsers);
            
            // Passa i dati al modulo Analytics
            if(window.AnalyticsUI) window.AnalyticsUI.render(this.allUsers);

        } catch(e) {
            console.error("Errore aggregazione iscritti:", e);
            document.querySelector('#hub-iscritti-table tbody').innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color:red;">Errore caricamento iscritti</td></tr>';
        }
    },


    // --- BRIDGE DASHBOARD UTENTI (Richiamati da HTML via HubApp.*) ---
    sortIscritti: function(column) { if(window.UsersUI) window.UsersUI.sortIscritti(column); },
    filterIscrittiByCard: function(roleType) { if(window.UsersUI) window.UsersUI.filterIscrittiByCard(roleType); },
    filterIscritti: function() { if(window.UsersUI) window.UsersUI.filterIscritti(); },
    
    // --- BRIDGE NEWSLETTER (Richiamati da HTML via HubApp.*) ---
    sortNews: function(column) { if(window.NewsletterUI) window.NewsletterUI.sortNews(column); },
    filterNews: function() { if(window.NewsletterUI) window.NewsletterUI.filterNews(); },
    toggleAllNews: function(selectAll) { if(window.NewsletterUI) window.NewsletterUI.toggleAllNews(selectAll); },
    toggleUserSelection: function(email, isChecked) { if(window.NewsletterUI) window.NewsletterUI.toggleUserSelection(email, isChecked); },


    loadArchivi: async function() {
        if (!window.ArchiveService) {
            console.error("ArchiveService non caricato.");
            return;
        }

        try {
            const tbody = document.querySelector('#hub-archivi-table tbody');
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</td></tr>';
            
            const allArchives = await window.ArchiveService.fetchArchives();
            
            // Render Table
            tbody.innerHTML = '';
            if (allArchives.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px; color:var(--text-muted);">Nessun archivio trovato.</td></tr>';
                return;
            }

            allArchives.forEach(arch => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 10px; font-weight:bold;">${arch.nomeAnno}</td>
                    <td style="padding: 10px; font-size:0.85rem; color:var(--text-muted);">${arch.timestamp}</td>
                    <td style="padding: 10px; color:${arch.giocoColor};"><i class="fa-solid ${arch.giocoIcon}"></i> ${arch.gioco}</td>
                `;
                tbody.appendChild(tr);
            });

        } catch (e) {
            console.error("Errore caricamento archivi:", e);
            document.querySelector('#hub-archivi-table tbody').innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px; color:red;">Errore caricamento archivi</td></tr>';
        }
    },





    fetchPendingRequestsREST: async function(projectId, apiKey) {
        // Stessa logica di fetchUsersREST ma punta a pending_requests
        const token = await window.tokenManager.getAuthTokenFromDB(apiKey);
        if (!token) throw new Error("Token non trovato o scaduto per " + projectId);
        
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/pending_requests`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) {
            if (res.status === 404) return []; // Collezione non trovata o vuota
            throw new Error(`Errore HTTP ${res.status} per ${projectId}`);
        }
        
        const data = await res.json();
        if (!data.documents) return [];
        
        return data.documents.map(doc => {
            const id = doc.name.split('/').pop();
            const fields = doc.fields || {};
            const parseVal = (f) => {
                if (!f) return null;
                if (f.stringValue !== undefined) return f.stringValue;
                if (f.timestampValue !== undefined) return f.timestampValue;
                return null;
            };
            return {
                id,
                nome: parseVal(fields.nome) || parseVal(fields.displayName),
                cognome: parseVal(fields.cognome),
                email: parseVal(fields.email),
                ruolo: parseVal(fields.ruolo) || parseVal(fields.role),
                timestamp: parseVal(fields.timestamp)
            };
        });
    },










    toggleGameStatus: function(gameId, targetStatus) { if(window.GamesUI) window.GamesUI.toggleGameStatus(gameId, targetStatus); },
    editGame: function(gameId, gameName) { if(window.GamesUI) window.GamesUI.editGame(gameId, gameName); },
    saveGameInfo: function() { if(window.GamesUI) window.GamesUI.saveGameInfo(); },

    // --- EMAIL TEMPLATES ---
    _defaultTemplates: {
        'abbonamento_attivo': `Oggetto: Il tuo abbonamento Prof. Memmo è attivo 🎉\n\nCiao [NOME],\n\nil tuo abbonamento all'Ecosistema Prof. Memmo è stato attivato.\n\nPiano attivo: [PIANO]\n\nEcco cosa puoi fare:\n[DESCRIZIONE]\n\nAccedi subito alla piattaforma:\nhttps://prof-memmo.github.io/games/\n\nA presto,\nProf. Memmo`,

        'abbonamento_pagamento': `Oggetto: Grazie per il tuo abbonamento a Prof. Memmo! 🎉\n\nCiao [NOME],\n\nAbbiamo ricevuto il tuo ordine.\n\n--- RIEPILOGO ORDINE ---\nOrdine #[ORDINE_ID] ([DATA])\n\nPiano: [PIANO]\nPrezzo: [PREZZO]\nMetodo di pagamento: [METODO]\n\n--- COSA PUOI FARE ---\n[DESCRIZIONE]\n\nAccedi subito:\nhttps://prof-memmo.github.io/games/\n\nSe non ricordi la password, usa "Password dimenticata" nella schermata di login.\n\nGrazie per aver scelto Prof. Memmo!\nA presto,\nProf. Memmo`,

        'abbonamento_in_scadenza': `Oggetto: Il tuo abbonamento Prof. Memmo sta per scadere ⏰\n\nCiao [NOME],\n\nti ricordiamo che il tuo abbonamento [PIANO] scadrà il [DATA_SCADENZA].\n\nPer continuare a usufruire di tutti i vantaggi del tuo piano, rinnova prima della scadenza.\n\nRinnova ora:\nhttps://prof-memmo.github.io/games/prezzi.html\n\nSe hai domande o hai bisogno di assistenza, rispondi a questa email.\n\nA presto,\nProf. Memmo`
    },

    loadEmailTemplateForSelected: async function() {
        const sel = document.getElementById('email-template-select');
        const textarea = document.getElementById('email-template-text');
        if (!sel || !textarea) return;
        const key = sel.value;

        let text = null;
        try {
            if (window.fbDb && window.fbDb.hub) {
                const doc = await window.fbDb.hub.collection('hub_settings').doc('email_templates').get();
                if (doc.exists && doc.data()[key]) {
                    text = doc.data()[key];
                }
            }
        } catch(e) { /* usa default */ }

        if (!text) {
            text = this._defaultTemplates[key] || '';
        }
        textarea.value = text;
    },

    saveEmailTemplate: async function() {
        const sel = document.getElementById('email-template-select');
        const textarea = document.getElementById('email-template-text');
        if (!sel || !textarea) return;
        const key = sel.value;
        const text = textarea.value;

        try {
            if (window.fbDb && window.fbDb.hub) {
                await window.fbDb.hub.collection('hub_settings').doc('email_templates').set(
                    { [key]: text },
                    { merge: true }
                );
                alert('✅ Modello email salvato per: ' + sel.options[sel.selectedIndex].text);
            } else {
                alert('Database Hub non disponibile.');
            }
        } catch(e) {
            console.error('Errore salvataggio template email:', e);
            alert('Errore durante il salvataggio: ' + e.message);
        }
    }
};


// --- BRIDGE GLOBALI NEWSLETTER (Richiamati da HTML senza HubApp.*) ---
window.salvaBozzaNewsletter = function() { if(window.NewsletterUI) window.NewsletterUI.salvaBozzaNewsletter(); };
window.preparaInvioGmail = function() { if(window.NewsletterUI) window.NewsletterUI.preparaInvioGmail(); };


async function eseguiLoginGoogle() {
    console.log("Login button clicked! Deleghiamo ad AuthService...");
    if (!window.AuthService) {
        alert("Errore critico: AuthService non caricato.");
        return;
    }
    
    try {
        await window.AuthService.login(['https://www.googleapis.com/auth/calendar.events']);
    } catch (e) {
        alert("Si è verificato un errore durante l'accesso con Google: " + (e.code || "Sconosciuto") + " - " + e.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    HubApp.init();
});

window.HubApp = HubApp;

window.eseguiLoginGoogle = eseguiLoginGoogle;
