const HubApp = {
    user: null,
    allUsers: [], // Array globale per i filtri di ricerca

    init: function() {
        this.bindEvents();
        this.checkAuth();
    },

    bindEvents: function() {
        // Il listener per il login Google è gestito direttamente nell'HTML con onclick="eseguiLoginGoogle()"
    },

    checkAuth: function() {
        if (!window.fbAuth) {
            document.getElementById('login-overlay').innerHTML = "<h2 style='color:red;'>Errore Inizializzazione Firebase</h2><p>Controlla la console.</p>";
            return;
        }

        window.fbAuth.onAuthStateChanged(user => {
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
        if (window.fbAuth) {
            window.fbAuth.signOut().then(() => {
                window.location.reload();
            });
        }
    },

    loadData: function() {
        this.loadEsperienze();
        this.loadPosta();
        this.loadGamesStatus();
        
        // Esegue lo script di riparazione silenziosa DB (una tantum)
        if(window.DBFixer) window.DBFixer.fixDatabasesBackground();
        
        // Nuove sezioni
        loadNewsletters();
        this.loadEmailTemplates();
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

            this.initNewsUsers();
            this.renderIscrittiTable(this.allUsers);
            this.renderNewsTable(this.allUsers);

        } catch(e) {
            console.error("Errore aggregazione iscritti:", e);
            document.querySelector('#hub-iscritti-table tbody').innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color:red;">Errore caricamento iscritti</td></tr>';
        }
    },


    renderIscrittiTable: function(usersArray) {
        const tbody = document.querySelector('#hub-iscritti-table tbody');
        tbody.innerHTML = '';
        if (usersArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Nessun iscritto trovato con questi criteri.</td></tr>';
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
    
    // --- NEWSLETTER MANAGER TABLE ---
    newsSortCol: 'data',
    newsSortAsc: false,

    initNewsUsers: function() {
        if (!this.allUsers) return;
        this.allUsers.forEach(u => {
            if (u.newsSelected === undefined) u.newsSelected = true;
        });
    },

    renderNewsTable: function(usersArray) {
        const tbody = document.querySelector('#newsletter-iscritti-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!usersArray || usersArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color:var(--text-muted);">Nessun utente trovato con i filtri attuali.</td></tr>';
            return;
        }

        usersArray.forEach(user => {
            if (!user.email) return;
            const tr = document.createElement('tr');
            const dataStr = user.dataValue > 0 ? new Date(user.dataValue).toLocaleDateString('it-IT') : 'N/D';
            tr.innerHTML = `
                <td style="padding: 10px; text-align:center;">
                    <input type="checkbox" style="cursor:pointer;" class="news-dest-checkbox" value="${user.email}" ${user.newsSelected ? 'checked' : ''} onchange="window.HubApp.toggleUserSelection('${user.email}', this.checked)">
                </td>
                <td style="padding: 10px;"><strong>${user.nome}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${user.email}</span></td>
                <td style="padding: 10px; text-transform:capitalize;">${user.ruolo}</td>
                <td style="padding: 10px; font-size:0.85rem; color:var(--text-muted);">${dataStr}</td>
                <td style="padding: 10px; color:${user.giocoColor};"><i class="fa-solid ${user.giocoIcon}"></i> ${user.gioco}</td>
                <td style="padding: 10px; text-align:center;"><a href="mailto:${user.email}" title="Scrivi a ${user.nome}" style="color:var(--primary-color); font-size:1.1rem; text-decoration:none;"><i class="fa-solid fa-envelope"></i></a></td>
            `;
            tbody.appendChild(tr);
        });
        
        this.updateNewsCount();
    },

    sortNews: function(column) {
        if (!this.allUsers || this.allUsers.length === 0) return;

        if (this.newsSortCol === column) {
            this.newsSortAsc = !this.newsSortAsc;
        } else {
            this.newsSortCol = column;
            this.newsSortAsc = true;
        }

        this.allUsers.sort((a, b) => {
            if (column === 'data') {
                let valA = a.dataValue || 0;
                let valB = b.dataValue || 0;
                if (valA < valB) return this.newsSortAsc ? -1 : 1;
                if (valA > valB) return this.newsSortAsc ? 1 : -1;
                return 0;
            }

            let valA = (a[column] || '').toString().toLowerCase();
            let valB = (b[column] || '').toString().toLowerCase();
            
            if (valA < valB) return this.newsSortAsc ? -1 : 1;
            if (valA > valB) return this.newsSortAsc ? 1 : -1;
            return 0;
        });

        this.filterNews();
    },

    filterNews: function() {
        const searchInput = document.getElementById('search-news-iscritti').value.toLowerCase();
        const filterGioco = document.getElementById('filter-news-gioco-col').value;

        if (!this.allUsers) return;

        const filtered = this.allUsers.filter(user => {
            const matchesSearch = user.nome.toLowerCase().includes(searchInput) || (user.email && user.email.toLowerCase().includes(searchInput));
            const matchesGioco = filterGioco === 'all' || user.gioco === filterGioco;
            return matchesSearch && matchesGioco;
        });

        this.renderNewsTable(filtered);
    },

    toggleAllNews: function(selectAll) {
        if (!this.allUsers) return;
        const searchInput = document.getElementById('search-news-iscritti').value.toLowerCase();
        const filterGioco = document.getElementById('filter-news-gioco-col').value;

        this.allUsers.forEach(user => {
            if (!user.email) return;
            const matchesSearch = user.nome.toLowerCase().includes(searchInput) || user.email.toLowerCase().includes(searchInput);
            const matchesGioco = filterGioco === 'all' || user.gioco === filterGioco;
            if (matchesSearch && matchesGioco) {
                user.newsSelected = selectAll;
            }
        });
        this.filterNews();
    },
    
    toggleUserSelection: function(email, isChecked) {
        if (!this.allUsers) return;
        const user = this.allUsers.find(u => u.email === email);
        if (user) user.newsSelected = isChecked;
        this.updateNewsCount();
    },
    
    updateNewsCount: function() {
        const countSpan = document.getElementById('news-dest-count');
        if (countSpan && this.allUsers) {
            const selected = this.allUsers.filter(u => u.newsSelected && u.email).length;
            countSpan.textContent = selected > 0 ? `(${selected})` : '';
        }
    },


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

    loadEsperienze: function() {
        if (!window.fbDb.hub) return;

        window.fbDb.hub.collection("hub_esperienze").orderBy("timestamp", "desc").onSnapshot(snap => {
            const tbody = document.querySelector('#hub-esperienze-table tbody');
            tbody.innerHTML = '';
            
            if (snap.empty) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Nessuna esperienza registrata.</td></tr>';
                return;
            }

            snap.forEach(doc => {
                const data = doc.data();
                const tr = document.createElement('tr');
                const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('it-IT') : 'N/A';
                
                let actions = '';
                if (data.status === 'pending') {
                    actions = `
                        <button onclick="HubApp.approveEsperienza('${doc.id}')" style="background:#2ecc71; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; margin-right:5px;"><i class="fa-solid fa-check"></i> Approva</button>
                        <button onclick="HubApp.deleteEsperienza('${doc.id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                    `;
                } else {
                    actions = `
                        <button onclick="HubApp.deleteEsperienza('${doc.id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i> Rimuovi</button>
                    `;
                }

                const statusColor = data.status === 'approved' ? '#2ecc71' : '#f39c12';
                const statusText = data.status === 'approved' ? 'Approvata' : 'In attesa';

                tr.innerHTML = `
                    <td style="padding: 10px; font-size:0.9rem; color:#aaa;">${date}</td>
                    <td style="padding: 10px;"><strong>${data.nome || 'Anonimo'}</strong></td>
                    <td style="padding: 10px;">${data.gioco || 'N/A'}</td>
                    <td style="padding: 10px; font-style:italic;">"${data.esperienza || ''}"</td>
                    <td style="padding: 10px;"><span style="color:${statusColor}; font-weight:bold;">${statusText}</span></td>
                    <td style="padding: 10px;">${actions}</td>
                `;
                tbody.appendChild(tr);
            });
        });
    },

    loadPosta: function() {
        if (!window.fbDb.hub) return;

        // Posta in arrivo
        window.fbDb.hub.collection("hub_posta").orderBy("timestamp", "desc").onSnapshot(snap => {
            const tbody = document.querySelector('#hub-posta-table tbody');
            tbody.innerHTML = '';
            
            if (snap.empty) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nessun messaggio in arrivo.</td></tr>';
                return;
            }

            snap.forEach(doc => {
                const data = doc.data();
                const tr = document.createElement('tr');
                const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('it-IT') : 'N/A';

                tr.innerHTML = `
                    <td style="padding: 10px; font-size:0.9rem; color:#aaa;">${date}</td>
                    <td style="padding: 10px;"><strong>${data.nome || 'Anonimo'}</strong><br><span style="font-size:0.8rem; color:#aaa;">${data.email || ''}</span><br><span style="font-size:0.7rem; color:var(--accent);">${data.site_origin || ''}</span></td>
                    <td style="padding: 10px;"><strong>${data.topic || 'N/A'}</strong><br><span style="font-size:0.9rem;">${data.messaggio || ''}</span></td>
                    <td style="padding: 10px;">In arrivo</td>
                    <td style="padding: 10px;">
                        <button onclick="HubApp.deletePosta('${doc.id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });

        // Posta Inviata
        window.fbDb.hub.collection("hub_posta_inviata").orderBy("timestamp", "desc").onSnapshot(snap => {
            const tbody = document.querySelector('#hub-posta-inviata-table tbody');
            if(!tbody) return;
            tbody.innerHTML = '';
            
            if (snap.empty) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Nessuna email inviata.</td></tr>';
                return;
            }

            snap.forEach(doc => {
                const data = doc.data();
                const tr = document.createElement('tr');
                const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('it-IT') : 'N/A';

                tr.innerHTML = `
                    <td style="padding: 10px; font-size:0.9rem; color:#aaa;">${date}</td>
                    <td style="padding: 10px;"><strong>${data.destinatarioNome || 'Utente'}</strong><br><span style="font-size:0.8rem; color:#aaa;">${data.destinatarioEmail || ''}</span></td>
                    <td style="padding: 10px;">${data.oggetto || 'N/A'}</td>
                    <td style="padding: 10px;">${data.gioco || 'N/A'}</td>
                `;
                tbody.appendChild(tr);
            });
        });
    },

    approveEsperienza: function(docId) {
        if (!window.fbDb.hub) return;
        window.fbDb.hub.collection("hub_esperienze").doc(docId).update({
            status: "approved"
        }).catch(err => {
            alert("Errore durante l'approvazione: " + err.message);
        });
    },

    deleteEsperienza: function(docId) {
        if (!window.fbDb.hub) return;
        if (confirm("Sei sicuro di voler eliminare questa esperienza? L'azione è irreversibile.")) {
            window.fbDb.hub.collection("hub_esperienze").doc(docId).delete().catch(err => {
                alert("Errore durante l'eliminazione: " + err.message);
            });
        }
    },

    deletePosta: function(docId) {
        if (!window.fbDb.hub) return;
        if (confirm("Sei sicuro di voler eliminare questo messaggio?")) {
            window.fbDb.hub.collection("hub_posta").doc(docId).delete().catch(err => {
                alert("Errore durante l'eliminazione: " + err.message);
            });
        }
    },

    // ----------------------------------------------------
    // RICHIESTE ISCRIZIONE (UNIFICATE)
    // ----------------------------------------------------
    richiesteDati: [],
    currentSortRichieste: { column: 'data', asc: false },

    loadRichiesteIscrizione: async function() {
        const tbody = document.querySelector('#hub-richieste-table tbody');
        if(!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Lettura richieste in corso...</td></tr>';
        
        this.richiesteDati = [];
        
        try {
            // 1. Fantaletteratura (Usa pending_requests tramite REST)
            try {
                const fantaReq = await this.fetchPendingRequestsREST("fantaletteratura-a7ff1", "AIzaSyB3wKx8ssbZVMtbiH5vbDDvAEgwzZcfRVQ");
                fantaReq.forEach(req => {
                    this.richiesteDati.push({
                        id: req.id,
                        nome: req.nome,
                        cognome: req.cognome || '',
                        email: req.email,
                        ruolo: req.ruolo || req.role || 'Docente',
                        data: req.timestamp || null,
                        gioco: 'Fantaletteratura',
                        giocoColor: '#a855f7'
                    });
                });
            } catch(e) { console.warn("Errore Fanta req:", e); }

            // 2. La Rotta degli Eroi (Usa pending_requests tramite REST)
            try {
                const eroiReq = await this.fetchPendingRequestsREST("la-rotta-degli-eroi", "AIzaSyCVCg9G6RbDDYMoQ0oWCs2Z9-1iFBSZZ5A");
                eroiReq.forEach(req => {
                    this.richiesteDati.push({
                        id: req.id,
                        nome: req.nome || req.displayName || 'Sconosciuto',
                        cognome: req.cognome || '',
                        email: req.email,
                        ruolo: req.ruolo || req.role || 'Docente',
                        data: req.timestamp || null,
                        gioco: 'La Rotta degli Eroi',
                        giocoColor: '#3b82f6'
                    });
                });
            } catch(e) { console.warn("Errore Eroi req:", e); }

            // 3. La Corte della Commedia (Cerca in users dove role = 'pending')
            try {
                const commediaUsers = await this.fetchUsersREST("la-corte-della-commedia", "AIzaSyCgz52XehTx0qQQ1MkKtTnIM5LmjJKcPls");
                const pendingCommedia = commediaUsers.filter(u => u.role === 'pending');
                pendingCommedia.forEach(u => {
                    this.richiesteDati.push({
                        id: u.uid || u.email,
                        nome: u.displayName || 'Sconosciuto',
                        cognome: '',
                        email: u.email,
                        ruolo: 'Docente (o Studente)',
                        data: u.createdAt || null, // Se presente
                        gioco: 'La Corte della Commedia',
                        giocoColor: '#ef4444'
                    });
                });
            } catch(e) { console.warn("Errore Commedia req:", e); }

            // 4. Palestra di Riflessione (Cerca in users dove role = 'pending')
            try {
                const palestraUsers = await this.fetchUsersREST("palestra-riflessione", "AIzaSyC9WhGYaWyaJtqDHhKhii5yhnP363SczJo");
                const pendingPalestra = palestraUsers.filter(u => u.role === 'pending');
                pendingPalestra.forEach(u => {
                    this.richiesteDati.push({
                        id: u.uid || u.id || u.email,
                        nome: u.displayName || u.name || 'Sconosciuto',
                        cognome: u.surname || '',
                        email: u.email,
                        ruolo: 'Docente (o Studente)',
                        data: u.createdAt || null,
                        gioco: 'Palestra di Riflessione',
                        giocoColor: '#22c55e'
                    });
                });
            } catch(e) { console.warn("Errore Palestra req:", e); }

            this.renderRichieste();
            
        } catch (error) {
            console.error("Errore generale loadRichiesteIscrizione:", error);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color:#ef4444;">Errore: ${error.message}</td></tr>`;
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

    renderRichieste: function() {
        const tbody = document.querySelector('#hub-richieste-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        // Filtra
        const textSearch = (document.getElementById('search-richieste') ? document.getElementById('search-richieste').value.toLowerCase() : '');
        const giocoFilter = (document.getElementById('filter-richieste-gioco') ? document.getElementById('filter-richieste-gioco').value : 'all');
        
        let filtered = this.richiesteDati.filter(r => {
            const matchesText = (r.nome + " " + r.cognome + " " + r.email).toLowerCase().includes(textSearch);
            const matchesGioco = (giocoFilter === 'all' || r.gioco === giocoFilter);
            return matchesText && matchesGioco;
        });
        
        // Sort
        filtered.sort((a, b) => {
            let valA = a[this.currentSortRichieste.column] || '';
            let valB = b[this.currentSortRichieste.column] || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return this.currentSortRichieste.asc ? -1 : 1;
            if (valA > valB) return this.currentSortRichieste.asc ? 1 : -1;
            return 0;
        });
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nessuna richiesta in sospeso.</td></tr>';
            return;
        }
        
        filtered.forEach(req => {
            const tr = document.createElement('tr');
            const dateStr = req.data ? new Date(req.data).toLocaleDateString('it-IT') : 'N/A';
            
            // Bottone Approva / Rifiuta
            const azioniHTML = `
                <button class="btn" style="padding: 6px 12px; font-size: 0.8rem;" onclick="HubApp.approvaRichiestaHub('${req.gioco}', '${req.id}', '${req.email}', '${req.nome}')"><i class="fa-solid fa-check"></i> Approva</button>
                <button class="btn" style="background:#e74c3c; padding: 6px 12px; font-size: 0.8rem; margin-top:5px;" onclick="HubApp.rifiutaRichiestaHub('${req.gioco}', '${req.id}')"><i class="fa-solid fa-xmark"></i> Rifiuta</button>
            `;
            
            tr.innerHTML = `
                <td style="padding: 10px;"><strong>${req.nome} ${req.cognome}</strong><br><span style="font-size:0.8rem; color:#aaa;">${req.email}</span></td>
                <td style="padding: 10px;">${req.ruolo}</td>
                <td style="padding: 10px; font-size:0.9rem; color:#888;">${dateStr}</td>
                <td style="padding: 10px;"><span style="color: ${req.giocoColor}; font-weight:bold;">${req.gioco}</span></td>
                <td style="padding: 10px;">${azioniHTML}</td>
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
            if (gioco === 'Fantaletteratura') {
                const dbFanta = window.fbDb.fanta;
                const docSnap = await dbFanta.collection('pending_requests').doc(docId).get();
                if(docSnap.exists) {
                    const data = docSnap.data();
                    await dbFanta.collection('users').doc(docId).set({
                        email: data.email,
                        nome: data.nome,
                        cognome: data.cognome,
                        role: data.ruolo === 'Docente' ? 'teacher' : 'student',
                        teamName: data.nomeSquadra || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    await dbFanta.collection('pending_requests').doc(docId).delete();
                }
            } else if (gioco === 'La Rotta degli Eroi') {
                const dbEroi = window.fbDb.eroi;
                // Qui sappiamo che docId è l'email (come usato in Eroi)
                await dbEroi.collection('users').doc(docId).update({
                    role: 'teacher', // o docente
                    approved: true
                });
                await dbEroi.collection('pending_requests').doc(docId).delete();
            } else if (gioco === 'La Corte della Commedia') {
                const dbCommedia = window.fbDb.commedia;
                // docId è l'uid
                await dbCommedia.collection('users').doc(docId).update({
                    role: 'teacher'
                });
            } else if (gioco === 'Palestra di Riflessione') {
                const dbPalestra = window.fbDb.palestra;
                // docId è l'uid
                await dbPalestra.collection('users').doc(docId).update({
                    role: 'docente' // In Palestra usano 'docente' e 'studente'
                });
            }

            alert("Approvazione eseguita con successo su Firestore!");
            
            // Invia mail e registra su hub_posta_inviata
            this.inviaMailApprovazione(gioco, email, nome);
            this.loadRichiesteIscrizione(); // Ricarica
            
        } catch(err) {
            console.error("Errore approvazione:", err);
            alert("Errore durante l'approvazione (potrebbe servire fare login nel sito specifico per rinnovare i permessi). " + err.message);
        }
    },

    rifiutaRichiestaHub: async function(gioco, docId) {
        if (!confirm(`Sei sicuro di voler rifiutare ed eliminare la richiesta di ${docId} su ${gioco}?`)) return;
        
        try {
            if (gioco === 'Fantaletteratura') {
                await window.fbDb.fanta.collection('pending_requests').doc(docId).delete();
            } else if (gioco === 'La Rotta degli Eroi') {
                await window.fbDb.eroi.collection('pending_requests').doc(docId).delete();
                // Forse anche rimuovere da users?
            } else if (gioco === 'La Corte della Commedia') {
                await window.fbDb.commedia.collection('users').doc(docId).delete();
            } else if (gioco === 'Palestra di Riflessione') {
                await window.fbDb.palestra.collection('users').doc(docId).delete();
            }
            alert("Richiesta eliminata.");
            this.loadRichiesteIscrizione();
        } catch(err) {
            console.error("Errore eliminazione:", err);
            alert("Errore durante l'eliminazione: " + err.message);
        }
    },

    loadEmailTemplates: async function() {
        window.HubEmailTemplates = {};
        const defaultTemplates = {
            'Fantaletteratura': `Gent.le docente,\n\nla tua richiesta di iscrizione a Fantaletteratura è stata APPROVATA. 🎉\nPuoi ora accedere alla piattaforma utilizzando l'account scelto in fase di registrazione.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📚 CHE COS'È FANTALETTERATURA?\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nFantaletteratura è un gioco didattico che trasforma lo studio della letteratura in una sfida a squadre creativa, cooperativa e coinvolgente.\n\nOgni classe forma una o più SQUADRE. Ogni squadra sceglie 5 AUTORI letterari rispettando un budget iniziale di 20.000 lire (unità di misura del gioco). Gli autori accumulano punti in base alle loro schede segrete — bonus e malus legati alla loro vita e alle loro opere.\n\nLe squadre possono guadagnare punti extra completando MISSIONI DIDATTICHE, svolgendo giochi in classe e in autonomia, oppure attraverso letture, performance, approfondimenti e scoperte letterarie (ogni missione vale 5 punti).\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🏆 LE CLASSIFICHE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nEsistono tre classifiche:\n• Classifica Autori — basata sui punti accumulati dagli autori scelti\n• Classifica Missioni — basata sui bonus dinamici delle attività svolte\n• Classifica Globale — la somma di entrambe\n\nI punteggi vengono aggiornati periodicamente dal Game Master (il prof referente).\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎯 COSA PUOI FARE COME DOCENTE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n• Creare e gestire le squadre della tua classe\n• Caricare le missioni e gestire i giochi\n• Consultare le classifiche in tempo reale\n• Invitare colleghi a partecipare con le loro classi\n• Creare tornei privati tra classi o scuole diverse\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔗 ACCEDI ORA\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nPuoi effettuare il login da qui:\nhttps://prof-memmo.github.io/fantaletteratura/\n\nBuon divertimento e che la letteratura sia con te!\nIl team di Prof. Memmo`,
            'La Rotta degli Eroi': `Gent.le docente,\n\nla tua richiesta di iscrizione a La Rotta degli Eroi è stata APPROVATA. 🎉\nPuoi ora accedere alla piattaforma utilizzando l'account scelto in fase di registrazione.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚓️ IL TUO RUOLO NEL VIAGGIO\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nIn qualità di Docente, avrai il pieno controllo del viaggio epico della tua classe. All'interno della piattaforma potrai:\n\n• Creare e gestire le squadre dei tuoi studenti\n• Sbloccare progressivamente i Nodi della Mappa, abilitando il Diario di Bordo e le riflessioni guidate\n• Gestire l'Inventario, sbloccando e assegnando Aiutanti e potenti Artefatti\n• Valutare le riflessioni e assegnare Punti Esperienza (XP) e Dracme\n• Monitorare la progressione dell'intero equipaggio lungo le rotte del mito\n\nAiutaci a far crescere la community condividendo la tua esperienza:\nhttps://prof-memmo.github.io/games/condividi-esperienza.html\n\nChe l'epica sia con te!\nIl Team de La Rotta degli Eroi`,
            'La Corte della Commedia': `Gent.le docente,\n\nla tua richiesta di iscrizione alla Loggia dei Magistrati de La Corte della Commedia è stata APPROVATA. 🎉\nPuoi ora accedere alla piattaforma utilizzando l'account scelto in fase di registrazione.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📜 CHE COS'È LA CORTE DELLA COMMEDIA?\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nLa Corte della Commedia è un'avventura didattica immersiva in cui la classe si trasforma in un vero e proprio Tribunale Dantesco. \n\nI tuoi studenti non si limitano a leggere la Divina Commedia, ma studiano i Fascicoli Processuali dei personaggi incrociati da Dante, esaminano le fonti e argomentano le loro posizioni in veri e propri dibattiti (Sentenze). Dovranno dimostrare non solo la conoscenza dell'opera, ma anche capacità logiche ed espositive.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚖️ IL TUO RUOLO COME MAGISTRATO\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nIn qualità di Docente (Magistrato della Corte) potrai:\n• Creare e gestire i Fascicoli di Classe\n• Ascoltare e valutare i dibattiti e le Sentenze pronunciate dai tuoi studenti\n• Assegnare Punti Esperienza (XP) e Titoli di Merito (Badge)\n• Guidare il percorso di analisi e riflessione critica sui versi di Dante\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔗 ACCEDI ORA\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nPuoi varcare la soglia del Supremo Tribunale da qui:\nhttps://prof-memmo.github.io/la-corte-della-commedia/\n\nBuon lavoro e che le stelle ti guidino!\nIl team di Prof. Memmo`,
            'Palestra di Riflessione': `Gent.le docente,\n\nla tua richiesta di iscrizione alla Palestra di Riflessione è stata APPROVATA. 🎉\nPuoi ora accedere alla piattaforma utilizzando l'account scelto in fase di registrazione.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🏋️‍♂️ CHE COS'È LA PALESTRA DI RIFLESSIONE?\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nLa Palestra è un ambiente digitale dinamico pensato per la scuola secondaria di primo grado, dove gli studenti possono allenare le loro competenze linguistiche attraverso sfide interattive.\n\nSi affronteranno esercizi di punteggiatura, lettura, analisi grammaticale, logica e del periodo, trasformando lo studio della lingua in un allenamento coinvolgente.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 COSA PUOI FARE COME DOCENTE (ALLENATORE)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n• Gestire le tue classi e i tuoi atleti (studenti)\n• Assegnare schede di allenamento specifiche\n• Monitorare i progressi, gli errori frequenti e i tempi di esecuzione\n• Stimolare il ragionamento e la riflessione metalinguistica\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔗 ENTRA IN CAMPO\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nPuoi accedere al pannello di controllo da qui:\nhttps://prof-memmo.github.io/palestra-di-riflessione/\n\nBuon allenamento!\nIl team di Prof. Memmo`,
            'Ops! Operazione Storia': `Gent.le docente,\n\nla tua richiesta di iscrizione a Ops! Operazione Storia è stata APPROVATA. 🎉\nPuoi ora accedere alla piattaforma utilizzando l'account scelto in fase di registrazione.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📜 CHE COS'È OPS! OPERAZIONE STORIA?\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nOps! Operazione Storia è un gioco didattico progettato per far vivere la Storia ai tuoi studenti in modo avvincente e cooperativo, trasformando le lezioni in indagini e sfide temporali.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎯 IL TUO RUOLO COME DOCENTE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n• Gestire le squadre e le missioni storiche\n• Monitorare l'avanzamento sulla plancia di gioco\n• Valutare le sfide affrontate dai tuoi studenti\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔗 ACCEDI ORA\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nPuoi effettuare il login da qui:\nhttps://prof-memmo.github.io/ops-storia/\n\nBuon viaggio nel tempo!\nIl team di Prof. Memmo`
        };

        if (window.fbDb.hub) {
            try {
                const docRef = window.fbDb.hub.collection("hub_settings").doc("email_templates");
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    window.HubEmailTemplates = docSnap.data();
                } else {
                    window.HubEmailTemplates = defaultTemplates;
                    await docRef.set(defaultTemplates);
                }
            } catch(e) {
                console.warn("Errore caricamento template email:", e);
                window.HubEmailTemplates = defaultTemplates;
            }
        } else {
            window.HubEmailTemplates = defaultTemplates;
        }

        this.loadEmailTemplateForSelected();
    },

    loadEmailTemplateForSelected: function() {
        const select = document.getElementById('email-template-select');
        const textarea = document.getElementById('email-template-text');
        if (!select || !textarea || !window.HubEmailTemplates) return;

        const gioco = select.value;
        textarea.value = window.HubEmailTemplates[gioco] || '';
    },

    saveEmailTemplate: async function() {
        const select = document.getElementById('email-template-select');
        const textarea = document.getElementById('email-template-text');
        if (!select || !textarea || !window.HubEmailTemplates) return;

        const gioco = select.value;
        const text = textarea.value;

        window.HubEmailTemplates[gioco] = text;

        if (window.fbDb.hub) {
            try {
                const docRef = window.fbDb.hub.collection("hub_settings").doc("email_templates");
                await docRef.set(window.HubEmailTemplates, {merge: true});
                alert("Modello email salvato con successo per " + gioco + "!");
            } catch(e) {
                console.error("Errore salvataggio template:", e);
                alert("Errore nel salvataggio del modello.");
            }
        }
    },

    inviaMailApprovazione: async function(gioco, email, nome) {
        let subject = `Approvazione Registrazione Docente - ${gioco}`;
        let body = '';

        if (window.HubEmailTemplates && window.HubEmailTemplates[gioco]) {
            body = window.HubEmailTemplates[gioco];
        } else {
            body = `Gent.le docente,\n\nLa tua registrazione al progetto '${gioco}' è stata approvata con successo.\n\nPuoi ora accedere al pannello docente e iniziare a gestire le tue classi per i tuoi studenti.\n\nBuon lavoro!\nIl Team di Prof. Memmo`;
        }

        // Codifichiamo l'URI
        body = encodeURIComponent(body);
        
        // Registra in Firestore (Hub)
        if (window.fbDb.hub) {
            try {
                await window.fbDb.hub.collection("hub_posta_inviata").add({
                    destinatarioEmail: email,
                    destinatarioNome: nome,
                    gioco: gioco,
                    oggetto: subject,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch(e) { console.warn("Errore salvataggio posta inviata:", e); }
        }

        // Lancia il client di posta
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    },

    loadGamesStatus: function() {
        if (!window.fbDb || !window.fbDb.hub) return;
        const db = window.fbDb.hub;
        
        const defaultGames = [
            { id: 'fantaletteratura', name: 'Fantaletteratura' },
            { id: 'la-rotta-degli-eroi', name: 'La Rotta degli Eroi' },
            { id: 'palestra-di-riflessione', name: 'Palestra di Riflessione' },
            { id: 'ops', name: 'Ops!' },
            { id: 'la-corte-della-commedia', name: 'La Corte della Commedia' },
            { id: 'travel-agency', name: 'Travel Agency' },
            { id: 'il-mio-quaderno-alternativo', name: 'Il mio quaderno alternativo' },
            { id: 'la-roulette', name: 'La Roulette' }
        ];

        db.collection('games_status').onSnapshot(snapshot => {
            const statusMap = {};
            snapshot.forEach(doc => {
                statusMap[doc.id] = doc.data();
            });

            const tbody = document.getElementById('games-list-body');
            if(!tbody) return;
            tbody.innerHTML = '';

            defaultGames.forEach(game => {
                let defaultActive = true;
                if (['ops', 'la-corte-della-commedia', 'la-roulette'].includes(game.id)) {
                    defaultActive = false;
                }
                const data = statusMap[game.id] || { isActive: defaultActive, popupType: 'wip_text' };
                
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #e5e7eb';
                
                tr.innerHTML = `
                    <td style="padding:15px 10px; font-weight: 500;">${game.name}</td>
                    <td style="padding:15px 10px;">
                        <span style="padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:bold; 
                            background: ${data.isActive ? '#dcfce7' : '#fee2e2'}; 
                            color: ${data.isActive ? '#166534' : '#991b1b'};">
                            ${data.isActive ? 'ATTIVO' : 'DISATTIVATO'}
                        </span>
                    </td>
                    <td style="padding:15px 10px;">
                        <button class="btn btn-sm" onclick="HubApp.toggleGameStatus('${game.id}', ${!data.isActive})" 
                            style="background:${data.isActive ? '#ef4444' : '#10b981'}; color:white; padding:5px 10px; border:none; border-radius:4px; cursor:pointer; margin-right: 5px;">
                            ${data.isActive ? 'Disattiva' : 'Attiva'}
                        </button>
                        <button class="btn btn-sm" onclick="HubApp.editGame('${game.id}', '${game.name}')" 
                            style="background:#3b82f6; color:white; padding:5px 10px; border:none; border-radius:4px; cursor:pointer;">
                            Modifica Card
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
    },

    toggleGameStatus: function(gameId, targetStatus) {
        alert("Test cache: Sto tentando di cambiare stato!");
        if (!window.fbDb || !window.fbDb.hub) return;
        const db = window.fbDb.hub;
        
        db.collection('games_status').doc(gameId).set({
            isActive: targetStatus,
            popupType: 'wip_text'
        }, { merge: true }).then(() => {
            console.log("Game status updated");
            alert("Stato aggiornato con successo!");
        }).catch((err) => {
            console.error("Firebase write error:", err);
            alert("Errore di salvataggio su Firebase! Probabilmente mancano i permessi nel database (Regole di sicurezza). Dettagli: " + err.message);
        });
    },

    editGame: function(gameId, gameName) {
        if (!window.fbDb || !window.fbDb.hub) return;
        
        document.getElementById('edit-game-name').innerText = gameName;
        document.getElementById('edit-game-id').value = gameId;
        
        // Fetch current data from Firebase
        window.fbDb.hub.collection('games_status').doc(gameId).get().then(doc => {
            const data = doc.exists ? doc.data() : {};
            
            const defaultGamesData = {
                'fantaletteratura': { shortDesc: "Costruisci la tua squadra di autori e generi letterari sfidandoti in un fanta-campionato culturale.", longDesc: "Costruisci la tua squadra di autori e generi letterari sfidandoti in un fanta-campionato culturale.", materia: "Letteratura", giocatori: "Squadre / Singoli", durata: "Intero anno scolastico", obiettivi: "Gamification, conoscenza autori", classe: "Sec. di 1° grado", uso: "Classe, Casa" },
                'la-rotta-degli-eroi': { shortDesc: "Affronta le missioni, accumula dracme e costruisci la tua base nel mondo epico e mitologico.", longDesc: "Affronta le missioni, accumula dracme e costruisci la tua base nel mondo epico e mitologico.", materia: "Epica e Mito", giocatori: "Singolo / Squadre", durata: "Intero anno scolastico", obiettivi: "Gamification, conoscenza miti", classe: "Classi prime (11-12 anni)", uso: "Classe, Casa" },
                'palestra-di-riflessione': { shortDesc: "Un allenamento completo per la lingua: percorsi personalizzati per studenti, docenti e amici della palestra.", longDesc: "Un allenamento completo per la lingua: percorsi personalizzati per studenti, docenti e amici della palestra.", materia: "Grammatica / Italiano", giocatori: "Singolo", durata: "Flessibile", obiettivi: "Analisi logica e grammaticale", classe: "Sec. di 1° grado", uso: "Recupero, Laboratorio, Casa" },
                'travel-agency': { shortDesc: "I giocatori diventano agenzie di viaggio e creano pacchetti turistici per clienti esigenti gestendo un budget.", longDesc: "I giocatori diventano agenzie di viaggio e creano pacchetti turistici per clienti esigenti gestendo un budget.", materia: "Geografia", giocatori: "2-4 (a squadre)", durata: "60-120 min", obiettivi: "Ricerca, gestione budget", classe: "Sec. di 1° grado", uso: "Classe, Laboratorio" },
                'il-mio-quaderno-alternativo': { shortDesc: "Percorsi alternativi all'IRC per esplorare temi etici, filosofici e civici in modo attivo e creativo, classe per classe.", longDesc: "Percorsi alternativi all'IRC per esplorare temi etici, filosofici e civici in modo attivo e creativo, classe per classe.", materia: "Alternativa alla Religione", giocatori: "Singolo", durata: "Intero anno scolastico", obiettivi: "Etica, cittadinanza, valori", classe: "Sec. di 1° grado", uso: "Classe" },
                'la-corte-della-commedia': { shortDesc: "Trasforma la classe in un Tribunale Dantesco, dove gli studenti analizzano fascicoli processuali e dibattono per giudicare i personaggi della Divina Commedia.", longDesc: "Trasforma la classe in un Tribunale Dantesco, dove gli studenti analizzano fascicoli processuali e dibattono per giudicare i personaggi della Divina Commedia.", materia: "Letteratura", giocatori: "Squadre / Singoli", durata: "Intero anno scolastico", obiettivi: "Gamification, analisi testo", classe: "Sec. di 1° grado", uso: "Classe" },
                'ops': { shortDesc: "Riscopri gli imprevisti storici e gli \"errori\" che hanno cambiato i destini del nostro passato.", longDesc: "Riscopri gli imprevisti storici e gli \"errori\" che hanno cambiato i destini del nostro passato.", materia: "Storia", giocatori: "2-4", durata: "45 min", obiettivi: "Causa-effetto, eventi storici", classe: "Sec. di 1° grado", uso: "Classe" },
                'la-roulette': { shortDesc: "Sfida a squadre per esplorare in modo casuale e interattivo diverse destinazioni del mondo.", longDesc: "Sfida a squadre per esplorare in modo casuale e interattivo diverse destinazioni del mondo.", materia: "Geografia", giocatori: "Classe intera (squadre)", durata: "30-45 min", obiettivi: "Ripasso, esplorazione rapida", classe: "Sec. di 1° grado", uso: "Classe, Ripasso" }
            };
            const defs = defaultGamesData[gameId] || {};

            document.getElementById('edit-game-shortdesc').value = data.shortDescription || defs.shortDesc || '';
            document.getElementById('edit-game-longdesc').value = data.longDescription || defs.longDesc || '';
            document.getElementById('edit-game-materia').value = data.materia || defs.materia || '';
            document.getElementById('edit-game-giocatori').value = data.giocatori || defs.giocatori || '';
            document.getElementById('edit-game-durata').value = data.durata || defs.durata || '';
            document.getElementById('edit-game-obiettivi').value = data.obiettivi || defs.obiettivi || '';
            document.getElementById('edit-game-classe').value = data.classe || defs.classe || '';
            document.getElementById('edit-game-uso').value = data.uso || defs.uso || '';
            
            document.getElementById('modal-edit-game').style.display = 'flex';
        }).catch(err => {
            console.error("Error fetching game details", err);
            alert("Errore nel recupero dei dettagli: " + err.message);
        });
    },
    
    saveGameInfo: function() {
        if (!window.fbDb || !window.fbDb.hub) return;
        const gameId = document.getElementById('edit-game-id').value;
        
        const dataToSave = {
            shortDescription: document.getElementById('edit-game-shortdesc').value,
            longDescription: document.getElementById('edit-game-longdesc').value,
            materia: document.getElementById('edit-game-materia').value,
            giocatori: document.getElementById('edit-game-giocatori').value,
            durata: document.getElementById('edit-game-durata').value,
            obiettivi: document.getElementById('edit-game-obiettivi').value,
            classe: document.getElementById('edit-game-classe').value,
            uso: document.getElementById('edit-game-uso').value,
        };
        
        window.fbDb.hub.collection('games_status').doc(gameId).set(dataToSave, { merge: true }).then(() => {
            document.getElementById('modal-edit-game').style.display = 'none';
            alert("Card gioco aggiornata con successo!");
        }).catch(err => {
            console.error("Firebase write error:", err);
            alert("Errore di salvataggio. Controlla le regole Firebase. Dettagli: " + err.message);
        });
    }
};


// --- LOGICA NEWSLETTER ---
function loadNewsletters() {
    if (!window.fbDb.hub) return;
    window.fbDb.hub.collection("hub_newsletters").orderBy("timestamp", "desc").onSnapshot(snap => {
        const list = document.getElementById('newsletter-lista-bozze');
        if(!list) return;
        
        list.innerHTML = '';
        if(snap.empty) {
            list.innerHTML = '<p style="color:#888; text-align:center;">Nessuna bozza salvata.</p>';
            return;
        }
        
        snap.forEach(doc => {
            const data = doc.data();
            const dateStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('it-IT') : 'N/A';
            const div = document.createElement('div');
            div.style.padding = "10px";
            div.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
            div.style.cursor = "pointer";
            div.innerHTML = `
                <div style="font-weight:bold; color:var(--gold);">${data.oggetto || 'Senza Oggetto'}</div>
                <div style="font-size:0.8rem; color:#aaa;">Modificato: ${dateStr}</div>
            `;
            div.onclick = () => {
                document.getElementById('news-oggetto').value = data.oggetto;
                document.getElementById('news-corpo').value = data.corpo;
            };
            
            // Bottone elimina
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            delBtn.style = "float:right; background:transparent; border:none; color:#e74c3c; cursor:pointer;";
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if(confirm("Eliminare questa bozza?")) window.fbDb.hub.collection("hub_newsletters").doc(doc.id).delete();
            };
            div.prepend(delBtn);
            
            list.appendChild(div);
        });
    });
}

async function salvaBozzaNewsletter() {
    if (!window.fbDb.hub) return;
    const oggetto = document.getElementById('news-oggetto').value;
    const corpo = document.getElementById('news-corpo').value;
    
    if(!oggetto && !corpo) return alert("Inserisci qualcosa da salvare!");
    
    try {
        await window.fbDb.hub.collection("hub_newsletters").add({
            oggetto,
            corpo,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Bozza salvata con successo!");
        document.getElementById('news-oggetto').value = '';
        document.getElementById('news-corpo').value = '';
    } catch(e) {
        alert("Errore salvataggio: " + e.message);
    }
}

function preparaInvioGmail() {
    const oggetto = encodeURIComponent(document.getElementById('news-oggetto').value);
    const corpo = encodeURIComponent(document.getElementById('news-corpo').value);
    
    let emails = [];
    if (window.HubApp.allUsers) {
        emails = window.HubApp.allUsers.filter(u => u.newsSelected && u.email && u.email.includes('@')).map(u => u.email);
    }
    
    if(emails.length === 0 && (document.getElementById('news-oggetto').value || document.getElementById('news-corpo').value)) {
        if(!confirm("Non hai selezionato nessun destinatario valido. Vuoi preparare l'email vuota su Gmail?")) return;
    }
    
    const bccString = encodeURIComponent(emails.join(', '));
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${oggetto}&body=${corpo}&bcc=${bccString}`, '_blank');
}


async function eseguiLoginGoogle() {
    console.log("Login button clicked!");
    
    if (!window.fbAuth) {
        alert("Errore critico: Firebase non è inizializzato. Controlla la console.");
        return;
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
        const result = await window.fbAuth.signInWithPopup(provider);
        // Il login è andato a buon fine, onAuthStateChanged in checkAuth si occuperà del resto
    } catch (e) {
        console.error("Errore Google Login:", e);
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
            console.warn("Popup bloccato, fallback su redirect...");
            window.fbAuth.signInWithRedirect(provider);
        } else {
            alert("Si è verificato un errore durante l'accesso con Google: " + e.code + " - " + e.message);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    HubApp.init();
});

window.HubApp = HubApp;

window.eseguiLoginGoogle = eseguiLoginGoogle;
