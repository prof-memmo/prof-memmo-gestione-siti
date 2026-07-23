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

        window.fbDb.hub.collection("hub_posta").orderBy("timestamp", "desc").onSnapshot(snap => {
            const tbody = document.querySelector('#hub-posta-table tbody');
            tbody.innerHTML = '';
            
            if (snap.empty) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Nessun messaggio in arrivo.</td></tr>';
                return;
            }

            snap.forEach(doc => {
                const data = doc.data();
                const tr = document.createElement('tr');
                const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('it-IT') : 'N/A';

                tr.innerHTML = `
                    <td style="padding: 10px; font-size:0.9rem; color:#aaa;">${date}</td>
                    <td style="padding: 10px;"><strong>${data.nome || 'Anonimo'}</strong><br><span style="font-size:0.8rem; color:#aaa;">${data.email || ''}</span></td>
                    <td style="padding: 10px;">${data.site_origin || 'Sconosciuto'}</td>
                    <td style="padding: 10px;">${data.topic || 'N/A'}</td>
                    <td style="padding: 10px; font-size:0.9rem;">${data.messaggio || ''}</td>
                    <td style="padding: 10px;">
                        <button onclick="HubApp.deletePosta('${doc.id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i> Elimina</button>
                    </td>
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


const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

// --- LOGICA DI LOGIN GLOBALE ---
async function eseguiLoginGoogle() {
    if (!window.fbAuth) {
        alert("Errore critico: Firebase non è inizializzato. Controlla la console.");
        return;
    }
    
    // IMPORTANTE: Nessuna modifica del DOM (es. cambiare il testo del bottone) 
    // prima di aprire il popup, altrimenti Safari blocca la finestra!
    
    try {
        await window.fbAuth.signInWithPopup(googleProvider);
    } catch (err) {
        console.error("Popup login failed, trying redirect:", err);
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
            window.fbAuth.signInWithRedirect(googleProvider).catch(e => {
                alert("Errore durante il reindirizzamento per l'accesso: " + e.message);
            });
        } else {
            alert("Errore di accesso: " + err.message);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    HubApp.init();
});

window.HubApp = HubApp;
