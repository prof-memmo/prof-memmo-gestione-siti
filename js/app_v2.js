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
        if(window.PaymentsUI) window.PaymentsUI.init();
        if(window.NewsletterUI) window.NewsletterUI.init();
        if(window.EcosistemaUI) window.EcosistemaUI.init();
        if(window.ImpostazioniUI) window.ImpostazioniUI.init();
        if(window.DiagnosticsUI) window.DiagnosticsUI.init();
        
        // Carica i dati aggregati (Utenti, Analytics, Newsletter)
        this.loadIscrittiAggregati();

        // Carica e monitora le modifiche didattiche Live Editor nel cloud
        this.loadDidacticOverrides();

        // Esegue lo script di riparazione silenziosa DB (una tantum)
        if(window.DBFixer) window.DBFixer.fixDatabasesBackground();
    },

    loadDidacticOverrides: async function() {
        const dbHub = (window.fbDb && window.fbDb.hub) || window.db;
        if (!dbHub) return;
        const banner = document.getElementById('hub-didactic-sync-banner');
        const titleEl = document.getElementById('hub-didactic-sync-title');
        const descEl = document.getElementById('hub-didactic-sync-desc');
        const tbody = document.getElementById('didactic-overrides-body');

        try {
            const snapshot = await dbHub.collection('hub_didactic_overrides').get();
            const overrides = [];
            snapshot.forEach(doc => {
                overrides.push({ id: doc.id, ...doc.data() });
            });

            this._cachedDidacticOverrides = overrides;

            // Aggiorna banner Dashboard
            if (banner) {
                if (overrides.length > 0) {
                    banner.style.display = 'block';
                    if (titleEl) titleEl.innerHTML = `🔔 ${overrides.length} Correzion${overrides.length === 1 ? 'e Didattica' : 'i Didattiche'} nel Cloud`;
                    if (descEl) descEl.innerHTML = `Hai <b>${overrides.length}</b> modifiche salvate al volo nei giochi. Gli studenti vedono già i testi corretti. Ricordati di consolidarle su GitHub quando possibile.`;
                } else {
                    banner.style.display = 'none';
                }
            }

            // Aggiorna tabella in Gestione Notifiche / Didattica
            if (tbody) {
                if (overrides.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 25px; color: #16a34a; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Nessuna modifica pendente nel cloud. Tutti i testi sono allineati con GitHub!</td></tr>';
                } else {
                    tbody.innerHTML = overrides.map(ov => {
                        const dateStr = ov.updatedAt ? new Date(ov.updatedAt).toLocaleString('it-IT') : 'N/D';
                        const pName = ov.platformName || ov.platform || 'Gioco';
                        const text = (ov.data && (ov.data.text || ov.data.frase || ov.data.sentence || ov.data.domanda)) || JSON.stringify(ov.data || {});
                        const safeId = ov.id;
                        return `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px; font-size: 0.85rem; color: #64748b;">${dateStr}</td>
                                <td style="padding: 10px;"><span style="background: #eef2ff; color: #4f46e5; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 0.82rem;">${pName}</span></td>
                                <td style="padding: 10px;"><code style="font-size: 0.82rem; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${ov.itemKey || ov.id}</code></td>
                                <td style="padding: 10px; font-size: 0.9rem; max-width: 350px; word-break: break-word;">${text}</td>
                                <td style="padding: 10px; text-align: right; white-space: nowrap;">
                                    <button class="btn btn-secondary" onclick="window.HubApp.deleteDidacticOverride('${safeId}')" style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;" title="Rimuovi dal cloud / Segna come consolidato">
                                        <i class="fa-solid fa-check"></i> Consolidato
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        } catch (err) {
            console.warn("Recupero hub_didactic_overrides:", err);
        }
    },

    deleteDidacticOverride: async function(docId) {
        if (!confirm("Hai già inserito questa modifica nei file su GitHub o vuoi rimuovere questo override dal cloud?")) return;
        const dbHub = (window.fbDb && window.fbDb.hub) || window.db;
        try {
            if (dbHub) await dbHub.collection('hub_didactic_overrides').doc(docId).delete();
            alert("✅ Override rimosso con successo dal cloud!");
            this.loadDidacticOverrides();
        } catch (e) {
            alert("Errore eliminazione override: " + e.message);
        }
    },

    exportDidacticOverrides: function() {
        const overrides = this._cachedDidacticOverrides || [];
        if (overrides.length === 0) {
            alert("Nessuna modifica didattica attualmente presente nel cloud.");
            return;
        }
        const jsonStr = JSON.stringify(overrides, null, 2);
        navigator.clipboard.writeText(jsonStr).then(() => {
            alert("📋 Riepilogo modifiche copiato negli appunti in formato JSON! Puoi condividerlo o incollarlo per integrarlo nei file sorgente.");
        }).catch(() => {
            prompt("Copia il riepilogo JSON delle modifiche:", jsonStr);
        });
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
    filterByGameCard: function(gameName) {
        const select = document.getElementById('filter-gioco');
        if (select) {
            select.value = gameName;
        }
        document.querySelectorAll('.hub-game-filter').forEach(c => c.classList.remove('active'));
        
        let targetId = 'game-filter-all';
        if (gameName !== 'all') {
            if (gameName.includes('Eroi')) targetId = 'game-filter-eroi';
            else if (gameName.includes('Commedia')) targetId = 'game-filter-commedia';
            else if (gameName.includes('Fanta')) targetId = 'game-filter-fanta';
            else if (gameName.includes('Palestra')) targetId = 'game-filter-palestra';
            else if (gameName.includes('Ops')) targetId = 'game-filter-ops';
        }
        const activeCard = document.getElementById(targetId);
        if (activeCard) activeCard.classList.add('active');

        if (window.UsersUI) window.UsersUI.filterIscritti();
        const table = document.getElementById('hub-iscritti-table');
        if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    
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
        'Fantaletteratura': `Oggetto: Richiesta Approvata - Benvenuto su FantaLetteratura! 🎉\n\nGentile Docente,\n\nla tua richiesta di accesso a FantaLetteratura è stata approvata con successo!\n\nDa oggi puoi accedere alla piattaforma per gestire le tue classi didattiche, organizzare gare letterarie e monitorare l'attività degli studenti.\n\nAccedi ora con il tuo account Google:\nhttps://prof-memmo.github.io/Fantaletteratura\n\nBuon lavoro e buone sfide in classe,\nProf. Memmo`,

        'La Rotta degli Eroi': `Oggetto: Richiesta Approvata - Benvenuto su La Rotta degli Eroi! 🧭\n\nGentile Docente,\n\nla tua richiesta di accesso a La Rotta degli Eroi è stata approvata!\n\nPuoi ora condurre i tuoi studenti nei percorsi di epica e mitologia, impostare compiti autentici ed esplorare le rotte narrative.\n\nAccedi alla piattaforma:\nhttps://prof-memmo.github.io/rotta-eroi\n\nBuon viaggio didattico,\nProf. Memmo`,

        'La Corte della Commedia': `Oggetto: Richiesta Approvata - Benvenuto su La Corte della Commedia! 🎭\n\nGentile Docente,\n\nla tua richiesta di accesso a La Corte della Commedia è stata approvata!\n\nEsplora il teatro, la drammaturgia e la commedia con le tue classi attraverso attività cooperative e simulazioni coinvolgenti.\n\nAccedi alla piattaforma:\nhttps://prof-memmo.github.io/corte-commedia\n\nA presto,\nProf. Memmo`,

        'Palestra di Riflessione': `Oggetto: Richiesta Approvata - Benvenuto su Palestra di Riflessione! 🧠\n\nGentile Docente,\n\nla tua richiesta di accesso a Palestra di Riflessione è stata approvata con successo!\n\nPuoi iniziare a utilizzare gli esercizi modulari di grammatica, analisi sintattica e riflessione linguistica con i tuoi studenti.\n\nAccedi subito:\nhttps://prof-memmo.github.io/palestra-di-riflessione\n\nBuon allenamento didattico,\nProf. Memmo`,

        'Ops! Operazione Storia': `Oggetto: Richiesta Approvata - Benvenuto su Ops! Operazione Storia! ⏳\n\nGentile Docente,\n\nla tua richiesta di accesso a Ops! Operazione Storia è stata approvata!\n\nAccedi alla piattaforma per guidare gli studenti nelle indagini storiche e nelle missioni nel tempo:\nhttps://prof-memmo.github.io/games/giochi.html\n\nBuona esplorazione,\nProf. Memmo`,

        'abbonamento_attivo': `Oggetto: Il tuo abbonamento Prof. Memmo è attivo 🎉\n\nCiao [NOME],\n\nil tuo abbonamento all'Ecosistema Prof. Memmo è stato attivato con successo.\n\nPiano attivo: [PIANO]\n\nAccedi subito al tuo profilo e a tutte le piattaforme abilitate:\nhttps://prof-memmo.github.io/games/profilo.html\n\nA presto,\nProf. Memmo`,

        'abbonamento_pagamento': `Oggetto: Conferma Pagamento e Attivazione Piano - Prof. Memmo 🎉\n\nCiao [NOME],\n\nabbiamo ricevuto la conferma del tuo ordine e il tuo piano è ora attivo.\n\n--- RIEPILOGO ABBONAMENTO ---\nPiano: [PIANO]\nData: [DATA]\n\nAccedi subito al tuo profilo personale:\nhttps://prof-memmo.github.io/games/profilo.html\n\nGrazie per aver scelto l'Ecosistema Didattico Prof. Memmo!\nA presto,\nProf. Memmo`,

        'abbonamento_in_scadenza': `Oggetto: Il tuo abbonamento Prof. Memmo è in scadenza ⏰\n\nCiao [NOME],\n\nti ricordiamo che il tuo abbonamento [PIANO] è in scadenza al termine del periodo corrente.\n\nPer continuare a utilizzare tutte le funzionalità avanzate e i materiali didattici senza interruzioni, puoi rinnovare il tuo piano dalla pagina dedicata:\nhttps://prof-memmo.github.io/games/prezzi.html\n\nSe hai domande o desideri chiarimenti, rispondi pure a questa email.\n\nA presto,\nProf. Memmo`
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
