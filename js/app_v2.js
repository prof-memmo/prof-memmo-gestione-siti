const HubApp = {
    user: null,
    allUsers: [], // Array globale per i filtri di ricerca

    init: function() {
        this.bindEvents();
        this.checkAuth();
    },

    bindEvents: function() {
        const btn = document.getElementById('btn-google-login');
        if (btn) btn.addEventListener('click', eseguiLoginGoogle);
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
        
        // Esegue lo script di riparazione silenziosa DB (una tantum)
        this.fixDatabasesBackground();
        
        // Nuove sezioni
        loadNewsletters();
    },

    fixDatabasesBackground: async function() {
        if (localStorage.getItem("db_fixed_v2")) return;
        try {
            console.log("Inizio riparazione background dei DB (Date e Nomi)...");
            const projects = [
                { id: "la-rotta-degli-eroi", key: "AIzaSyCVCg9G6RbDDYMoQ0oWCs2Z9-1iFBSZZ5A" },
                { id: "la-corte-della-commedia", key: "AIzaSyCgz52XehTx0qQQ1MkKtTnIM5LmjJKcPls" },
                { id: "fantaletteratura-a7ff1", key: "AIzaSyB3wKx8ssbZVMtbiH5vbDDvAEgwzZcfRVQ" },
                { id: "palestra-riflessione", key: "AIzaSyC9WhGYaWyaJtqDHhKhii5yhnP363SczJo" }
            ];

            for (let p of projects) {
                const tokenManager = await this.getAuthTokenFromDB(p.key);
                if (!tokenManager || !tokenManager.refreshToken) continue;
                
                const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${p.key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `grant_type=refresh_token&refresh_token=${tokenManager.refreshToken}`
                });
                const refreshData = await refreshRes.json();
                const validToken = refreshData.id_token || tokenManager.accessToken;

                const res = await fetch(`https://firestore.googleapis.com/v1/projects/${p.id}/databases/(default)/documents/users?pageSize=1000`, {
                    headers: { Authorization: `Bearer ${validToken}` }
                });
                const data = await res.json();
                if (!data.documents) continue;

                for (let doc of data.documents) {
                    const fields = doc.fields || {};
                    let needsUpdate = false;
                    let patchBody = { fields: { ...fields } };
                    let maskPaths = [];

                    // Fix Data
                    if (!fields.createdAt && !fields.joinedAt) {
                        needsUpdate = true;
                        patchBody.fields.createdAt = { timestampValue: "2023-09-01T10:00:00Z" };
                        maskPaths.push("createdAt");
                    }

                    // Fix Nome
                    const hasNome = fields.nome || fields.name || fields.displayName || fields.username;
                    if (!hasNome) {
                        const fn = fields.firstName ? fields.firstName.stringValue : '';
                        const ln = fields.lastName ? fields.lastName.stringValue : '';
                        if (!fn && !ln) {
                            needsUpdate = true;
                            patchBody.fields.nome = { stringValue: "Utente" };
                            maskPaths.push("nome");
                        }
                    }

                    if (needsUpdate) {
                        let url = \`https://firestore.googleapis.com/v1/\${doc.name}?\` + maskPaths.map(m => \`updateMask.fieldPaths=\${m}\`).join('&');
                        await fetch(url, {
                            method: 'PATCH',
                            headers: { 
                                Authorization: \`Bearer \${validToken}\`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ fields: patchBody.fields })
                        });
                    }
                }
            }
            
            // Hub db fix
            if (window.fbDb && window.fbDb.hub) {
                const snap = await window.fbDb.hub.collection("users").get();
                const batch = window.fbDb.hub.batch();
                let count = 0;
                snap.forEach(doc => {
                    const d = doc.data();
                    let u = {};
                    let upd = false;
                    if (!d.createdAt && !d.joinedAt) {
                        u.createdAt = firebase.firestore.Timestamp.fromDate(new Date("2023-09-01T10:00:00Z"));
                        upd = true;
                    }
                    const fn = d.firstName || '';
                    const ln = d.lastName || '';
                    const hasNome = d.nome || d.name || d.displayName || d.username;
                    if (!hasNome && !fn && !ln) {
                        u.nome = "Utente";
                        upd = true;
                    }
                    if (upd) {
                        batch.update(doc.ref, u);
                        count++;
                    }
                });
                if (count > 0) await batch.commit();
            }

            localStorage.setItem("db_fixed_v2", "true");
            console.log("Riparazione completata!");
            
            // Rimossa window.location.reload() per evitare loop di login e perdita di sessione
        } catch(e) {
            console.error("Errore script riparazione:", e);
        }
    },


    getAuthTokenFromDB: async function(apiKey) {
        return new Promise((resolve) => {
            const req = indexedDB.open('firebaseLocalStorageDb');
            req.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('firebaseLocalStorage')) return resolve(null);
                const tx = db.transaction('firebaseLocalStorage', 'readonly');
                const store = tx.objectStore('firebaseLocalStorage');
                const getReq = store.get(`firebase:authUser:${apiKey}:[DEFAULT]`);
                getReq.onsuccess = (e2) => {
                    if (e2.target.result && e2.target.result.value.stsTokenManager) {
                        resolve(e2.target.result.value.stsTokenManager);
                    } else {
                        resolve(null);
                    }
                };
                getReq.onerror = () => resolve(null);
            };
            req.onerror = () => resolve(null);
        });
    },

    fetchUsersREST: async function(projectId, apiKey) {
        try {
            const tokenManager = await this.getAuthTokenFromDB(apiKey);
            if (!tokenManager || !tokenManager.refreshToken) return [];
            
            // Forza il refresh del token per evitare errori 401/403 (token scaduto dopo 1h)
            const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `grant_type=refresh_token&refresh_token=${tokenManager.refreshToken}`
            });
            const refreshData = await refreshRes.json();
            const validToken = refreshData.id_token || tokenManager.accessToken;

            const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?pageSize=1000`, {
                headers: { Authorization: `Bearer ${validToken}` }
            });
            const data = await res.json();
            if (!data.documents) return [];
            return data.documents.map(doc => {
                const fields = doc.fields || {};
                let dataVal = 0;
                if (fields.createdAt && fields.createdAt.integerValue) dataVal = parseInt(fields.createdAt.integerValue);
                else if (fields.joinedAt && fields.joinedAt.integerValue) dataVal = parseInt(fields.joinedAt.integerValue);
                else if (fields.createdAt && fields.createdAt.timestampValue) dataVal = new Date(fields.createdAt.timestampValue).getTime();
                else if (fields.joinedAt && fields.joinedAt.timestampValue) dataVal = new Date(fields.joinedAt.timestampValue).getTime();
                
                return {
                    id: doc.name.split('/').pop(),
                    nome: (fields.nome && fields.nome.stringValue) || (fields.name && fields.name.stringValue) || (fields.displayName && fields.displayName.stringValue) || (fields.username && fields.username.stringValue) || (((fields.firstName && fields.firstName.stringValue) || (fields.lastName && fields.lastName.stringValue)) ? (((fields.firstName && fields.firstName.stringValue) || '') + ' ' + ((fields.lastName && fields.lastName.stringValue) || '')).trim() : 'Utente'),
                    email: (fields.email && fields.email.stringValue) || '',
                    ruolo: (fields.role && fields.role.stringValue) || 'studente',
                    classe: (fields.classId && fields.classId.stringValue) || (fields.class && fields.class.stringValue) || 'N/A',
                    dataValue: dataVal
                };
            });
        } catch(e) {
            console.error("REST Fetch error for " + projectId, e);
            return [];
        }
    },

    loadIscrittiAggregati: async function() {
        try {
            const tbody = document.querySelector('#hub-iscritti-table tbody');
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento... se rimane bloccato, apri prima le Console Giochi per accedere ai DB!</td></tr>';
            
            let eroiUsers = [];
            let commediaUsers = [];
            let fantaUsers = [];
            let palestraUsers = [];

            // Fetch da La Rotta degli Eroi (via REST forzato con refresh token)
            try {
                const eroiRestUsers = await this.fetchUsersREST("la-rotta-degli-eroi", "AIzaSyCVCg9G6RbDDYMoQ0oWCs2Z9-1iFBSZZ5A");
                eroiRestUsers.forEach(u => {
                    eroiUsers.push({
                        ...u, gioco: 'La Rotta degli Eroi', giocoColor: '#3b82f6', giocoIcon: 'fa-ship'
                    });
                });
            } catch(e) { console.warn("Eroi REST error:", e); }

            // Fetch da La Corte della Commedia (via REST per bypassare mismatch SDK v8/v10)
            try {
                const commediaRestUsers = await this.fetchUsersREST("la-corte-della-commedia", "AIzaSyCgz52XehTx0qQQ1MkKtTnIM5LmjJKcPls");
                commediaRestUsers.forEach(u => {
                    commediaUsers.push({
                        ...u, gioco: 'La Corte della Commedia', giocoColor: '#ef4444', giocoIcon: 'fa-book-open'
                    });
                });
            } catch(e) { console.warn("Commedia REST error:", e); }

            // Fetch da Fantaletteratura (via REST forzato con refresh token)
            try {
                const fantaRestUsers = await this.fetchUsersREST("fantaletteratura-a7ff1", "AIzaSyB3wKx8ssbZVMtbiH5vbDDvAEgwzZcfRVQ");
                fantaRestUsers.forEach(u => {
                    fantaUsers.push({
                        ...u, gioco: 'Fantaletteratura', giocoColor: '#a855f7', giocoIcon: 'fa-dragon'
                    });
                });
            } catch(e) { console.warn("Fanta REST error:", e); }

            // Fetch da Palestra di Riflessione (via REST per bypassare mismatch SDK v8/v10)
            try {
                const palestraRestUsers = await this.fetchUsersREST("palestra-riflessione", "AIzaSyC9WhGYaWyaJtqDHhKhii5yhnP363SczJo");
                palestraRestUsers.forEach(u => {
                    palestraUsers.push({
                        ...u, gioco: 'Palestra di Riflessione', giocoColor: '#22c55e', giocoIcon: 'fa-brain'
                    });
                });
            } catch(e) { console.warn("Palestra REST error:", e); }

            // Fetch da Hub Centrale (per includere gli iscritti tester)
            let hubUsers = [];
            if (window.fbDb.hub) {
                try {
                    const snapHub = await window.fbDb.hub.collection("users").get();
                    snapHub.forEach(doc => {
                        const data = doc.data();
                        hubUsers.push({
                            id: doc.id, nome: data.nome || data.name || data.displayName || data.username || ((data.firstName || data.lastName) ? ((data.firstName || '') + ' ' + (data.lastName || '')).trim() : 'Utente'), email: data.email || '',
                            ruolo: data.role || 'tester', classe: data.classId || data.class || 'N/A',
                            dataValue: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : new Date(data.createdAt).getTime()) : (data.joinedAt ? (data.joinedAt.toMillis ? data.joinedAt.toMillis() : new Date(data.joinedAt).getTime()) : 0),
                            gioco: 'Hub', giocoColor: '#6366f1', giocoIcon: 'fa-globe'
                        });
                    });
                } catch(e) { console.warn("Hub auth error:", e); }
            }

            const allUsers = [...eroiUsers, ...commediaUsers, ...fantaUsers, ...palestraUsers, ...hubUsers];
            
            // Deduplicazione per email (fonde i giochi se l'utente è in più piattaforme)
            const uniqueUsersMap = new Map();
            allUsers.forEach(u => {
                if (u.email && u.email.trim() !== '') {
                    const emailKey = u.email.trim().toLowerCase();
                    if (uniqueUsersMap.has(emailKey)) {
                        let existing = uniqueUsersMap.get(emailKey);
                        if (!existing.gioco.includes(u.gioco)) {
                            existing.gioco += " / " + u.gioco;
                        }
                        // Se aveva 'Anonimo' o stringhe vuote, e ora abbiamo un nome, aggiorniamo
                        if ((existing.nome === 'Anonimo' || existing.nome === '') && u.nome !== 'Anonimo' && u.nome !== '') {
                            existing.nome = u.nome;
                        }
                    } else {
                        uniqueUsersMap.set(emailKey, {...u});
                    }
                } else {
                    // Senza email, usiamo ID come chiave
                    uniqueUsersMap.set(u.id, {...u});
                }
            });
            
            const deduplicatedUsers = Array.from(uniqueUsersMap.values());
            // Default sort: Data Iscrizione decrescente
            this.currentSortCol = 'data';
            this.currentSortAsc = false;
            deduplicatedUsers.sort((a, b) => b.dataValue - a.dataValue);
            this.allUsers = deduplicatedUsers; // Salva per i filtri

            // Aggiorna Contatori
            document.getElementById('counter-total').innerText = allUsers.length;
            document.getElementById('counter-eroi').innerText = eroiUsers.length;
            document.getElementById('counter-commedia').innerText = commediaUsers.length;
            document.getElementById('counter-fanta').innerText = fantaUsers.length;
            document.getElementById('counter-palestra').innerText = palestraUsers.length;

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

    filterIscritti: function() {
        const searchInput = document.getElementById('search-iscritti').value.toLowerCase();
        const filterGioco = document.getElementById('filter-gioco').value;

        if (!this.allUsers) return;

        const filtered = this.allUsers.filter(user => {
            const matchesSearch = user.nome.toLowerCase().includes(searchInput) || (user.email && user.email.toLowerCase().includes(searchInput));
            const matchesGioco = filterGioco === 'all' || user.gioco === filterGioco;
            return matchesSearch && matchesGioco;
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
        if (!confirm(\`Sei sicuro di voler approvare l'iscrizione per \${nome} su \${gioco}?\`)) return;
        
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
        if (!confirm(\`Sei sicuro di voler rifiutare ed eliminare la richiesta di \${docId} su \${gioco}?\`)) return;
        
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

    inviaMailApprovazione: async function(gioco, email, nome) {
        const urlToLogin = {
            'Fantaletteratura': 'https://prof-memmo.github.io/fantaletteratura/',
            'La Rotta degli Eroi': 'https://prof-memmo.github.io/la-rotta-degli-eroi/',
            'La Corte della Commedia': 'https://prof-memmo.github.io/la-corte-della-commedia/',
            'Palestra di Riflessione': 'https://prof-memmo.github.io/palestra-di-riflessione/'
        };
        const loginUrl = urlToLogin[gioco] || '';
        const subject = \`Approvazione Registrazione Docente - \${gioco}\`;
        const body = \`Caro/a \${nome},%0D%0A%0D%0ALa tua registrazione come docente al progetto '\${gioco}' è stata approvata con successo.%0D%0A%0D%0APuoi ora accedere al pannello docente e iniziare a creare classi e fascicoli per i tuoi studenti.%0D%0A%0D%0AAccedi qui: \${loginUrl}%0D%0A%0D%0ABuon lavoro!%0D%0AIl Team di Prof. Memmo\`;
        
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
        window.location.href = \`mailto:\${email}?subject=\${subject}&body=\${body}\`;
    }

};

// --- LOGICA GENERATORE AI ---
function generaPrompt() {
    const tipo = document.getElementById('ai-tipo-post').value;
    const gioco = document.getElementById('ai-gioco').selectedOptions[0].text;
    const argomento = document.getElementById('ai-argomento').value.trim();
    
    let base = `Agisci come un Social Media Manager esperto nel settore educativo (EdTech) e ludico.\nIl progetto è "${gioco}". `;
    if (argomento) {
        base += `L'argomento specifico del post di oggi è: "${argomento}".\n`;
    } else {
        base += `Devi inventare tu un argomento didattico interessante collegato al gioco.\n`;
    }
    
    let specifico = "";
    if (tipo === 'reel') {
        specifico = `Genera uno script per un video Reel/TikTok di 60 secondi.\nStruttura richiesta: HOOK (primi 3 sec per catturare attenzione), CORPO (spiegazione dinamica), CALL TO ACTION finale.\nFornisci sia il testo da dire a voce sia le indicazioni su cosa mostrare a video. Tono entusiasta e professionale.`;
    } else if (tipo === 'carosello') {
        specifico = `Genera il testo per un Carosello di Instagram (massimo 8 slide).\nStruttura: Slide 1 (Titolo a effetto), Slide 2-7 (Contenuto didattico spezzettato e facile da leggere), Slide 8 (Call to Action e salvataggio post).\nScrivi per ogni slide il TESTO VISIVO (quello che c'è nell'immagine) e scrivi a parte una breve CAPTION generale per il post con gli hashtag appropriati.`;
    } else if (tipo === 'adv') {
        specifico = `Genera 3 varianti di COPY PUBBLICITARIO (Facebook/Instagram Ads) per vendere il prodotto/gioco ai docenti.\nVariante 1: Focalizzata sul risparmio di tempo per il docente.\nVariante 2: Focalizzata sul coinvolgimento (engagement) degli studenti.\nVariante 3: Focalizzata sui risultati didattici.\nIncludi emoji e call to action chiare.`;
    } else if (tipo === 'canva') {
        specifico = `Genera un prompt testuale dettagliato da inserire in un'Intelligenza Artificiale Generativa (come Midjourney o il generatore immagini di Canva) per creare l'immagine di copertina perfetta per questo argomento.\nDescrivi lo stile visivo (es. vettoriale, flat design, epico, illustrato), i colori dominanti, i soggetti principali e l'atmosfera.`;
    }
    
    document.getElementById('ai-risultato').value = base + "\n\n" + specifico;
}

function copiaPrompt() {
    const text = document.getElementById('ai-risultato');
    text.select();
    document.execCommand("copy");
    alert("Prompt copiato! Ora apri ChatGPT o Canva e incollalo.");
}

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
    if (!window.fbAuth) {
        alert("Errore critico: Firebase non è inizializzato. Controlla la console.");
        return;
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // Per risolvere i blocchi su Safari (specialmente iOS) e in modalità PWA,
    // usiamo direttamente signInWithRedirect in modo sincrono rispetto al click.
    window.fbAuth.signInWithRedirect(provider).catch(e => {
        console.error("Errore avvio redirect:", e);
        alert("Si è verificato un errore durante l'avvio del login: " + e.message);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    HubApp.init();
});

window.HubApp = HubApp;

window.eseguiLoginGoogle = eseguiLoginGoogle;
