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
        if(window.GamesUI) window.GamesUI.init();
        if(window.NewsletterUI) window.NewsletterUI.init();
        
        // Esegue lo script di riparazione silenziosa DB (una tantum)
        if(window.DBFixer) window.DBFixer.fixDatabasesBackground();
    },



    loadIscrittiAggregati: async function() {
        try {
            const tbody = document.querySelector('#hub-iscritti-table tbody');
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento iscritti da tutti i server...</td></tr>';
            
            const data = await window.CrossProjectsService.fetchAllUsers();
            
            this.currentSortCol = 'data';
            this.currentSortAsc = false;
            this.allUsers = data.users; // Salva per i filtri

            // Aggiorna Contatori
            document.getElementById('counter-eroi').innerText = data.stats.eroi;
            document.getElementById('counter-commedia').innerText = data.stats.commedia;
            document.getElementById('counter-fanta').innerText = data.stats.fanta;
            document.getElementById('counter-palestra').innerText = data.stats.palestra;
            document.getElementById('counter-ops').innerText = data.stats.ops;

            const elStudenti = document.getElementById('counter-studenti');
            if (elStudenti) elStudenti.innerText = data.stats.studenti;
            const elDocenti = document.getElementById('counter-docenti');
            if (elDocenti) elDocenti.innerText = data.stats.docenti;
            const elViandanti = document.getElementById('counter-viandanti');
            if (elViandanti) elViandanti.innerText = data.stats.viandanti;
            const elScuole = document.getElementById('counter-scuole');
            if (elScuole) elScuole.innerText = data.stats.scuoleSetSize;
            const elTutti = document.getElementById('counter-tutti');
            if (elTutti) elTutti.innerText = data.stats.total;
            
            const elTotal = document.getElementById('counter-total');
            if (elTotal) elTotal.innerText = data.stats.total;

            this.renderIscrittiTable(this.allUsers);
            
            // Passa i dati al modulo Newsletter
            if(window.NewsletterUI) window.NewsletterUI.setUsers(this.allUsers);

        } catch(e) {
            console.error("Errore aggregazione iscritti:", e);
            document.querySelector('#hub-iscritti-table tbody').innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color:red;">Errore caricamento iscritti</td></tr>';
        }
    },


    renderIscrittiTable: function(usersArray) {
        const tbody = document.querySelector('#hub-iscritti-table tbody');
        tbody.innerHTML = '';
        if (usersArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Nessun iscritto trovato con questi criteri.</td></tr>';
            return;
        }

        usersArray.forEach(user => {
            const tr = document.createElement('tr');
            const dataStr = user.dataValue > 0 ? new Date(user.dataValue).toLocaleDateString('it-IT') : 'N/D';
            tr.innerHTML = `
                <td style="padding: 10px;"><strong>${user.nome}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${user.email}</span></td>
                <td style="padding: 10px; text-transform:capitalize;">${user.ruolo}</td>
                <td style="padding: 10px; font-size:0.85rem; color:var(--text-muted);">${dataStr}</td>
                <td style="padding: 10px; color:${user.giocoColor};"><i class="fa-solid ${user.giocoIcon}"></i> ${user.gioco}</td>
                <td style="padding: 10px;"><span style="background: #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">Base (Gratuito)</span></td>
                <td style="padding: 10px; font-size:0.85rem; color:var(--text-muted);">-</td>
                <td style="padding: 10px; text-align:center;"><a href="mailto:${user.email}" title="Scrivi a ${user.nome}" style="color:var(--primary-color); font-size:1.1rem; text-decoration:none;"><i class="fa-solid fa-envelope"></i></a></td>
            `;
            tbody.appendChild(tr);
        });
    },

    currentSortCol: 'nome',
    currentSortAsc: true,

    sortIscritti: function(column) {
        if (!this.allUsers || this.allUsers.length === 0) return;

        if (this.currentSortCol === column) {
            this.currentSortAsc = !this.currentSortAsc; // Inverti
        } else {
            this.currentSortCol = column;
            this.currentSortAsc = true;
        }

        this.allUsers.sort((a, b) => {
            if (column === 'data') {
                let valA = a.dataValue || 0;
                let valB = b.dataValue || 0;
                if (valA < valB) return this.currentSortAsc ? -1 : 1;
                if (valA > valB) return this.currentSortAsc ? 1 : -1;
                return 0;
            }

            let valA = (a[column] || '').toString().toLowerCase();
            let valB = (b[column] || '').toString().toLowerCase();
            
            if (valA < valB) return this.currentSortAsc ? -1 : 1;
            if (valA > valB) return this.currentSortAsc ? 1 : -1;
            return 0;
        });
        
        this.filterIscritti(); // Ridisegna con i filtri attivi
    },

    activeRoleFilter: 'tutti',

    filterIscrittiByCard: function(roleType) {
        this.activeRoleFilter = roleType;
        
        // Update UI
        document.querySelectorAll('.hub-card').forEach(card => card.classList.remove('active'));
        const activeCard = document.getElementById(`card-stats-${roleType}`);
        if (activeCard) activeCard.classList.add('active');

        this.filterIscritti();
    },

    filterIscritti: function() {
        const searchInput = document.getElementById('search-iscritti').value.toLowerCase();
        const filterGioco = document.getElementById('filter-gioco').value;

        if (!this.allUsers) return;

        const filtered = this.allUsers.filter(user => {
            const matchesSearch = user.nome.toLowerCase().includes(searchInput) || (user.email && user.email.toLowerCase().includes(searchInput));
            const matchesGioco = filterGioco === 'all' || user.gioco === filterGioco;
            
            let matchesRole = true;
            if (this.activeRoleFilter !== 'tutti') {
                const r = (user.ruolo || '').toLowerCase();
                const c = (user.classe || '').toUpperCase().trim();
                
                if (this.activeRoleFilter === 'studenti') {
                    matchesRole = r.includes('student');
                } else if (this.activeRoleFilter === 'docenti') {
                    matchesRole = r.includes('teacher') || r.includes('admin') || r.includes('docente');
                } else if (this.activeRoleFilter === 'viandanti') {
                    matchesRole = !r.includes('student') && !r.includes('teacher') && !r.includes('admin') && !r.includes('docente');
                } else if (this.activeRoleFilter === 'scuole') {
                    matchesRole = (c && c !== 'N/A' && c !== '' && c !== 'TEST' && c !== 'N/D');
                }
            }

            return matchesSearch && matchesGioco && matchesRole;
        });

        this.renderIscrittiTable(filtered);
    },
    
    // --- BRIDGE NEWSLETTER (Richiamati da HTML via HubApp.*) ---
    sortNews: function(column) { if(window.NewsletterUI) window.NewsletterUI.sortNews(column); },
    filterNews: function() { if(window.NewsletterUI) window.NewsletterUI.filterNews(); },
    toggleAllNews: function(selectAll) { if(window.NewsletterUI) window.NewsletterUI.toggleAllNews(selectAll); },
    toggleUserSelection: function(email, isChecked) { if(window.NewsletterUI) window.NewsletterUI.toggleUserSelection(email, isChecked); },


    loadArchivi: async function() {
        try {
            const tbody = document.querySelector('#hub-archivi-table tbody');
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</td></tr>';
            
            let allArchives = [];

            // Fetch da La Rotta degli Eroi
            if (window.fbDb.eroi) {
                const snapEroi = await window.fbDb.eroi.collection("archives").orderBy("timestamp", "desc").get();
                snapEroi.forEach(doc => {
                    const data = doc.data();
                    allArchives.push({
                        id: doc.id,
                        nomeAnno: data.yearName || 'N/A',
                        timestamp: data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('it-IT') : 'N/A',
                        gioco: 'La Rotta degli Eroi',
                        giocoColor: '#3498db',
                        giocoIcon: 'fa-ship'
                    });
                });
            }

            // Fetch da Fantaletteratura
            if (window.fbDb.fanta) {
                const snapFanta = await window.fbDb.fanta.collection("archives").orderBy("timestamp", "desc").get();
                snapFanta.forEach(doc => {
                    const data = doc.data();
                    allArchives.push({
                        id: doc.id,
                        nomeAnno: data.yearName || 'N/A',
                        timestamp: data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('it-IT') : 'N/A',
                        gioco: 'Fantaletteratura',
                        giocoColor: '#9b59b6',
                        giocoIcon: 'fa-dragon'
                    });
                });
            }

            tbody.innerHTML = '';
            if (allArchives.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">Nessun archivio storico trovato.</td></tr>';
                return;
            }

            allArchives.forEach(arch => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 10px; font-size:0.9rem; color:#aaa;">${arch.timestamp}</td>
                    <td style="padding: 10px;"><strong>${arch.nomeAnno}</strong></td>
                    <td style="padding: 10px; color:${arch.giocoColor};"><i class="fa-solid ${arch.giocoIcon}"></i> ${arch.gioco}</td>
                `;
                tbody.appendChild(tr);
            });

        } catch(e) {
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










    // --- BRIDGE VETRINA GIOCHI (Richiamati da HTML via HubApp.*) ---
    toggleGameStatus: function(gameId, targetStatus) { if(window.GamesUI) window.GamesUI.toggleGameStatus(gameId, targetStatus); },
    editGame: function(gameId, gameName) { if(window.GamesUI) window.GamesUI.editGame(gameId, gameName); },
    saveGameInfo: function() { if(window.GamesUI) window.GamesUI.saveGameInfo(); }
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
