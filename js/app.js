const HubApp = {
    user: null,

    init: function() {
        this.bindEvents();
        this.checkAuth();
    },

    bindEvents: function() {
        document.getElementById('btn-google-login').addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            window.fbAuth.signInWithPopup(provider).catch(err => {
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
        this.loadIscrittiAggregati();
        this.loadArchivi();
        this.loadEsperienze();
        this.loadPosta();
    },

    loadIscrittiAggregati: async function() {
        try {
            const tbody = document.querySelector('#hub-iscritti-table tbody');
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</td></tr>';
            
            let eroiUsers = [];
            let commediaUsers = [];

            // Fetch da La Rotta degli Eroi
            if (window.fbDb.eroi) {
                const snapEroi = await window.fbDb.eroi.collection("users").get();
                snapEroi.forEach(doc => {
                    const data = doc.data();
                    eroiUsers.push({
                        id: doc.id,
                        nome: data.nome || data.displayName || 'Anonimo',
                        email: data.email || '',
                        ruolo: data.role || 'studente',
                        classe: data.classId || data.class || 'N/A',
                        gioco: 'La Rotta degli Eroi',
                        giocoColor: '#3498db',
                        giocoIcon: 'fa-ship'
                    });
                });
            }

            // Fetch da La Corte della Commedia
            if (window.fbDb.commedia) {
                const snapCommedia = await window.fbDb.commedia.collection("users").get();
                snapCommedia.forEach(doc => {
                    const data = doc.data();
                    commediaUsers.push({
                        id: doc.id,
                        nome: data.nome || data.displayName || 'Anonimo',
                        email: data.email || '',
                        ruolo: data.role || 'studente',
                        classe: data.classId || data.class || 'N/A',
                        gioco: 'La Corte della Commedia',
                        giocoColor: '#e74c3c',
                        giocoIcon: 'fa-book-open'
                    });
                });
            }

            const allUsers = [...eroiUsers, ...commediaUsers];
            
            // Ordina alfabeticamente per nome
            allUsers.sort((a, b) => a.nome.localeCompare(b.nome));

            // Aggiorna Contatori
            document.getElementById('counter-total').innerText = allUsers.length;
            document.getElementById('counter-eroi').innerText = eroiUsers.length;
            document.getElementById('counter-commedia').innerText = commediaUsers.length;

            // Render Tabella
            tbody.innerHTML = '';
            if (allUsers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Nessun iscritto trovato.</td></tr>';
                return;
            }

            allUsers.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 10px;"><strong>${user.nome}</strong><br><span style="font-size:0.8rem; color:#aaa;">${user.email}</span></td>
                    <td style="padding: 10px; text-transform:capitalize;">${user.ruolo}</td>
                    <td style="padding: 10px; color:${user.giocoColor};"><i class="fa-solid ${user.giocoIcon}"></i> ${user.gioco}</td>
                    <td style="padding: 10px;">${user.classe}</td>
                `;
                tbody.appendChild(tr);
            });

        } catch(e) {
            console.error("Errore aggregazione iscritti:", e);
            document.querySelector('#hub-iscritti-table tbody').innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color:red;">Errore caricamento iscritti</td></tr>';
        }
    },

    loadArchivi: async function() {
        try {
            const tbody = document.querySelector('#hub-archivi-table tbody');
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</td></tr>';
            
            let allArchives = [];

            // Per ora solo da La Rotta degli Eroi
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

document.addEventListener("DOMContentLoaded", () => {
    HubApp.init();
});
