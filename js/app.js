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
            let studentiCount = 0;
            snap.forEach(doc => {
                if (doc.data().role === "studente" || doc.data().role === "student") studentiCount++;
            });
            document.getElementById('eroi-content').innerHTML = `
                <div class="panel-section">
                    <h3>Statistiche Generali (La Rotta degli Eroi)</h3>
                    <p>Studenti totali iscritti: <strong>${studentiCount}</strong></p>
                    <p><em>(Qui verranno integrate le tabelle di gestione di La Rotta degli Eroi)</em></p>
                </div>
            `;
            statusEl.textContent = "Connesso";
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
            let studentiCount = 0;
            snap.forEach(doc => {
                if (doc.data().role === "studente" || doc.data().role === "student") studentiCount++;
            });
            document.getElementById('commedia-content').innerHTML = `
                <div class="panel-section">
                    <h3>Statistiche Generali (La Corte della Commedia)</h3>
                    <p>Studenti totali iscritti: <strong>${studentiCount}</strong></p>
                    <p><em>(Qui verranno integrate le tabelle di gestione di La Corte della Commedia)</em></p>
                </div>
            `;
            statusEl.textContent = "Connesso";
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
