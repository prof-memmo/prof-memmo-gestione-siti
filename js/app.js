const HubApp = {
    user: null,
    allUsers: [], // Array globale per i filtri di ricerca

    init: function() {
        this.bindEvents();
        this.checkAuth();
    },

    bindEvents: function() {
        document.getElementById('btn-google-login').addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/calendar.events');
            
            window.fbAuth.signInWithPopup(provider).then((result) => {
                const credential = firebase.auth.GoogleAuthProvider.credentialFromResult(result);
                if (credential && credential.accessToken) {
                    sessionStorage.setItem('gcalToken', credential.accessToken);
                    console.log("Token Google Calendar acquisito con successo.");
                }
            }).catch(err => {
                console.error("Login failed:", err);
                alert("Errore durante l'accesso: " + err.message);
            });
        });
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
                if (user.email === 'prof.memmo@gmail.com') {
                    document.getElementById('login-overlay').style.display = 'none';
                    this.loadData();
                } else {
                    alert("Accesso negato. Solo l'amministratore può accedere al cruscotto.");
                    this.logout();
                }
            } else {
                this.user = null;
                document.getElementById('login-overlay').style.display = 'flex';
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
        
        // Nuove sezioni
        initCalendar();
        loadNewsletters();
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
                        resolve(e2.target.result.value.stsTokenManager.accessToken);
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
            const token = await this.getAuthTokenFromDB(apiKey);
            if (!token) return [];
            const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?pageSize=1000`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!data.documents) return [];
            return data.documents.map(doc => {
                const fields = doc.fields || {};
                return {
                    id: doc.name.split('/').pop(),
                    nome: (fields.nome && fields.nome.stringValue) || (fields.displayName && fields.displayName.stringValue) || 'Anonimo',
                    email: (fields.email && fields.email.stringValue) || '',
                    ruolo: (fields.role && fields.role.stringValue) || 'studente',
                    classe: (fields.classId && fields.classId.stringValue) || (fields.class && fields.class.stringValue) || 'N/A'
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

            // Fetch da La Rotta degli Eroi
            if (window.fbDb.eroi) {
                try {
                    const snapEroi = await window.fbDb.eroi.collection("users").get();
                    snapEroi.forEach(doc => {
                        const data = doc.data();
                        eroiUsers.push({
                            id: doc.id, nome: data.nome || data.displayName || 'Anonimo', email: data.email || '',
                            ruolo: data.role || 'studente', classe: data.classId || data.class || 'N/A',
                            gioco: 'La Rotta degli Eroi', giocoColor: '#3b82f6', giocoIcon: 'fa-ship'
                        });
                    });
                } catch(e) { console.warn("Eroi auth error:", e); }
            }

            // Fetch da La Corte della Commedia (via REST per bypassare mismatch SDK v8/v10)
            try {
                const commediaRestUsers = await this.fetchUsersREST("la-corte-della-commedia", "AIzaSyCgz52XehTx0qQQ1MkKtTnIM5LmjJKcPls");
                commediaRestUsers.forEach(u => {
                    commediaUsers.push({
                        ...u, gioco: 'La Corte della Commedia', giocoColor: '#ef4444', giocoIcon: 'fa-book-open'
                    });
                });
            } catch(e) { console.warn("Commedia REST error:", e); }

            // Fetch da Fantaletteratura
            if (window.fbDb.fanta) {
                try {
                    const snapFanta = await window.fbDb.fanta.collection("users").get();
                    snapFanta.forEach(doc => {
                        const data = doc.data();
                        fantaUsers.push({
                            id: doc.id, nome: data.nome || data.displayName || 'Anonimo', email: data.email || '',
                            ruolo: data.role || 'studente', classe: data.classId || data.class || 'N/A',
                            gioco: 'Fantaletteratura', giocoColor: '#a855f7', giocoIcon: 'fa-dragon'
                        });
                    });
                } catch(e) { console.warn("Fanta auth error:", e); }
            }

            // Fetch da Palestra di Riflessione (via REST per bypassare mismatch SDK v8/v10)
            try {
                const palestraRestUsers = await this.fetchUsersREST("palestra-riflessione", "AIzaSyC9WhGYaWyaJtqDHhKhii5yhnP363SczJo");
                palestraRestUsers.forEach(u => {
                    palestraUsers.push({
                        ...u, gioco: 'Palestra di Riflessione', giocoColor: '#22c55e', giocoIcon: 'fa-brain'
                    });
                });
            } catch(e) { console.warn("Palestra REST error:", e); }

            const allUsers = [...eroiUsers, ...commediaUsers, ...fantaUsers, ...palestraUsers];
            allUsers.sort((a, b) => a.nome.localeCompare(b.nome));
            this.allUsers = allUsers; // Salva per i filtri

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
            tr.innerHTML = `
                <td style="padding: 10px;"><strong>${user.nome}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${user.email}</span></td>
                <td style="padding: 10px; text-transform:capitalize;">${user.ruolo}</td>
                <td style="padding: 10px; color:${user.giocoColor};"><i class="fa-solid ${user.giocoIcon}"></i> ${user.gioco}</td>
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
            let valA = (a[column] || '').toString().toLowerCase();
            let valB = (b[column] || '').toString().toLowerCase();
            
            if (valA < valB) return this.currentSortAsc ? -1 : 1;
            if (valA > valB) return this.currentSortAsc ? 1 : -1;
            return 0;
        });        this.filterIscritti(); // Ridisegna con i filtri attivi
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
    newsSortCol: 'nome',
    newsSortAsc: true,

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
            tr.innerHTML = `
                <td style="padding: 10px; text-align:center;">
                    <input type="checkbox" style="cursor:pointer;" class="news-dest-checkbox" value="${user.email}" ${user.newsSelected ? 'checked' : ''} onchange="window.HubApp.toggleUserSelection('${user.email}', this.checked)">
                </td>
                <td style="padding: 10px;"><strong>${user.nome}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${user.email}</span></td>
                <td style="padding: 10px; text-transform:capitalize;">${user.ruolo}</td>
                <td style="padding: 10px; color:${user.giocoColor};"><i class="fa-solid ${user.giocoIcon}"></i> ${user.gioco}</td>
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
    }
};

window.HubApp = HubApp; },

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

// --- LOGICA CALENDARIO SOCIAL ---
let currentDate = new Date();
let currentEvents = {}; // { 'YYYY-MM-DD': [{id, title, platform}] }

function initCalendar() {
    renderCalendar();
    fetchCalendarEvents();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const title = document.getElementById('calendar-month-title');
    if (!grid || !title) return;
    
    grid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    title.innerText = monthNames[month] + " " + year;
    
    // Intestazioni giorni
    const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
    days.forEach(d => {
        const div = document.createElement('div');
        div.className = 'cal-header-day';
        div.innerText = d;
        grid.appendChild(div);
    });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let startingDayOfWeek = firstDay.getDay() - 1; // Lunedì = 0
    if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Domenica = 6
    
    // Giorni vuoti
    for (let i = 0; i < startingDayOfWeek; i++) {
        const div = document.createElement('div');
        div.className = 'cal-day empty';
        grid.appendChild(div);
    }
    
    // Giorni del mese
    const today = new Date();
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const div = document.createElement('div');
        div.className = 'cal-day';
        if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
            div.classList.add('today');
        }
        
        div.onclick = () => openCalendarModal(dateStr);
        
        let html = `<span class="date-num">${d}</span>`;
        if (currentEvents[dateStr]) {
            currentEvents[dateStr].forEach(ev => {
                let color = "var(--gold)";
                let iconClass = `fa-brands fa-${ev.platform}`;
                
                if(ev.platform === 'instagram') color = "#E1306C";
                if(ev.platform === 'facebook') color = "#1877F2";
                if(ev.platform === 'tiktok') color = "#00f2fe";
                if(ev.platform === 'youtube') color = "#FF0000";
                if(ev.platform === 'linkedin') color = "#0A66C2";
                if(ev.platform === 'x-twitter') color = "#000000";
                
                if(ev.platform === 'altro') {
                    color = "#9ca3af";
                    iconClass = "fa-solid fa-bullhorn";
                }
                
                html += `<div class="cal-event" style="color:white; background:${color}; border-color:${color};" onclick="event.stopPropagation(); editCalendarEvent('${dateStr}', '${ev.id}', '${ev.title.replace(/'/g, "\\'")}', '${ev.platform}')">
                    <i class="${iconClass}"></i> ${ev.title}
                </div>`;
            });
        }
        
        div.innerHTML = html;
        grid.appendChild(div);
    }
}

function changeMonth(dir) {
    currentDate.setMonth(currentDate.getMonth() + dir);
    renderCalendar();
    fetchCalendarEvents();
}

function fetchCalendarEvents() {
    if (!window.fbDb.hub) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startStr = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const endStr = `${year}-${String(month+1).padStart(2,'0')}-31`;
    
    window.fbDb.hub.collection("hub_social_calendar")
        .where("date", ">=", startStr)
        .where("date", "<=", endStr)
        .onSnapshot(snap => {
            currentEvents = {};
            snap.forEach(doc => {
                const data = doc.data();
                if(!currentEvents[data.date]) currentEvents[data.date] = [];
                currentEvents[data.date].push({ id: doc.id, ...data });
            });
            renderCalendar();
        });
}

function openCalendarModal(dateStr = "") {
    document.getElementById('cal-id').value = "";
    document.getElementById('cal-date').value = dateStr || new Date().toISOString().split('T')[0];
    document.getElementById('cal-title').value = "";
    document.getElementById('cal-platform').value = "instagram";
    document.getElementById('btn-delete-cal').style.display = 'none';
    
    document.getElementById('calendar-modal').style.display = 'flex';
}

function editCalendarEvent(dateStr, id, title, platform) {
    document.getElementById('cal-id').value = id;
    document.getElementById('cal-date').value = dateStr;
    document.getElementById('cal-title').value = title;
    document.getElementById('cal-platform').value = platform;
    document.getElementById('btn-delete-cal').style.display = 'block';
    
    document.getElementById('calendar-modal').style.display = 'flex';
}

function closeCalendarModal() {
    document.getElementById('calendar-modal').style.display = 'none';
}

async function saveCalendarEvent() {
    if (!window.fbDb.hub) return;
    const id = document.getElementById('cal-id').value;
    const date = document.getElementById('cal-date').value;
    const title = document.getElementById('cal-title').value;
    const platform = document.getElementById('cal-platform').value;
    
    if(!date || !title) return alert("Inserisci data e titolo");
    
    // Recupera l'ID Google Calendar se esiste
    let gcalEventId = null;
    if (id && currentEvents[date]) {
        const ev = currentEvents[date].find(e => e.id === id);
        if (ev && ev.gcalEventId) gcalEventId = ev.gcalEventId;
    }
    
    const data = { date, title, platform, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
    
    try {
        let docRefId = id;
        if(id) {
            await window.fbDb.hub.collection("hub_social_calendar").doc(id).update(data);
        } else {
            const docRef = await window.fbDb.hub.collection("hub_social_calendar").add(data);
            docRefId = docRef.id;
        }
        
        // --- GOOGLE CALENDAR SYNC ---
        const token = sessionStorage.getItem('gcalToken');
        if (token) {
            const gcalData = {
                summary: `[${platform.toUpperCase()}] ${title}`,
                start: { date: date },
                end: { date: date }
            };
            
            let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
            let method = 'POST';
            if (id && gcalEventId) {
                url += '/' + gcalEventId;
                method = 'PUT';
            }
            
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gcalData)
            });
            
            if (res.ok) {
                const result = await res.json();
                if (!id || !gcalEventId) {
                    await window.fbDb.hub.collection("hub_social_calendar").doc(docRefId).update({ gcalEventId: result.id });
                }
            } else {
                console.warn("Sincronizzazione Google Calendar fallita. Token scaduto o permessi non validi.");
            }
        }
        
        closeCalendarModal();
    } catch(e) {
        alert("Errore salvataggio: " + e.message);
    }
}

async function deleteCalendarEvent() {
    if (!window.fbDb.hub) return;
    const id = document.getElementById('cal-id').value;
    const date = document.getElementById('cal-date').value;
    if(!id) return;
    
    if(confirm("Eliminare questo post?")) {
        try {
            // Recupera l'ID Google Calendar se esiste
            let gcalEventId = null;
            if (currentEvents[date]) {
                const ev = currentEvents[date].find(e => e.id === id);
                if (ev && ev.gcalEventId) gcalEventId = ev.gcalEventId;
            }

            await window.fbDb.hub.collection("hub_social_calendar").doc(id).delete();
            
            // --- GOOGLE CALENDAR SYNC ---
            const token = sessionStorage.getItem('gcalToken');
            if (token && gcalEventId) {
                await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalEventId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
            }
            
            closeCalendarModal();
        } catch(e) {
            alert("Errore: " + e.message);
        }
    }
}

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

document.addEventListener("DOMContentLoaded", () => {
    HubApp.init();
});
