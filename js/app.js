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
        this.loadEroiData();
        this.loadCommediaData();
        // Le altre sezioni (Fantaletteratura, Riflessione, Esperienze, Posta) 
        // andranno caricate via via che configureremo gli altri database o collezioni
    },

    loadEroiData: function() {
        const statusEl = document.getElementById('eroi-status');
        if (!window.fbDb.eroi) return;

        window.fbDb.eroi.collection("users").get().then(snap => {
            const tbody = document.querySelector('#hub-eroi-students-table tbody');
            tbody.innerHTML = ''; // Svuota caricamento
            let studentiCount = 0;
            
            snap.forEach(doc => {
                const data = doc.data();
                if (data.role === "studente" || data.role === "student") {
                    studentiCount++;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="padding: 10px;">
                            <strong>${data.name || 'Sconosciuto'}</strong><br>
                            <span style="font-size:0.8rem; color:#aaa;">${data.avatarClass || ''}</span>
                        </td>
                        <td style="padding: 10px;">${data.class || 'N/A'}</td>
                        <td style="padding: 10px;">Liv. ${data.level || 1}</td>
                        <td style="padding: 10px; color: var(--gold);">${data.xp || 0} XP / ${data.dracme || 0} Dracme</td>
                        <td style="padding: 10px; font-size:0.8rem; color:#aaa;">${doc.id}</td>
                    `;
                    tbody.appendChild(tr);
                }
            });

            if (studentiCount === 0) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nessuno studente trovato.</td></tr>';

            statusEl.textContent = `Connesso (${studentiCount} studenti)`;
            statusEl.style.color = "#2ecc71";
        }).catch(err => {
            statusEl.textContent = "Errore di connessione";
            statusEl.style.color = "#e74c3c";
            console.error("Errore DB Eroi:", err);
        });
    },

    loadCommediaData: function() {
        const statusEl = document.getElementById('commedia-status');
        if (!window.fbDb.commedia) return;

        window.fbDb.commedia.collection("users").get().then(snap => {
            const tbody = document.querySelector('#hub-commedia-students-table tbody');
            tbody.innerHTML = '';
            let studentiCount = 0;

            snap.forEach(doc => {
                const data = doc.data();
                if (data.role === "studente" || data.role === "student") {
                    studentiCount++;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="padding: 10px;">
                            <strong>${data.name || 'Sconosciuto'}</strong><br>
                            <span style="font-size:0.8rem; color:#aaa;">${data.avatarClass || ''}</span>
                        </td>
                        <td style="padding: 10px;">${data.class || 'N/A'}</td>
                        <td style="padding: 10px;">Liv. ${data.level || 1}</td>
                        <td style="padding: 10px; color: var(--gold);">${data.xp || 0} XP / ${data.fiorini || data.dracme || 0} Fiorini</td>
                        <td style="padding: 10px; font-size:0.8rem; color:#aaa;">${doc.id}</td>
                    `;
                    tbody.appendChild(tr);
                }
            });

            if (studentiCount === 0) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nessuno studente trovato.</td></tr>';

            statusEl.textContent = `Connesso (${studentiCount} studenti)`;
            statusEl.style.color = "#2ecc71";
        }).catch(err => {
            statusEl.textContent = "Errore di connessione";
            statusEl.style.color = "#e74c3c";
            console.error("Errore DB Commedia:", err);
        });
    }
};

document.addEventListener("DOMContentLoaded", () => {
    HubApp.init();
});
