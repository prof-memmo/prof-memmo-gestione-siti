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
        // Le altre sezioni (Fantaletteratura, Riflessione, Esperienze, Posta) 
        // andranno caricate via via che configureremo gli altri database o collezioni
    }

};

document.addEventListener("DOMContentLoaded", () => {
    HubApp.init();
});
