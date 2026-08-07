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
        this.loadGamesStatus();
        
        // Esegue lo script di riparazione silenziosa DB (una tantum)
        if(window.DBFixer) window.DBFixer.fixDatabasesBackground();
        
        // Nuove sezioni
        loadNewsletters();

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
