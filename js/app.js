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
        this.loadEsperienze();
        this.loadPosta();
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
