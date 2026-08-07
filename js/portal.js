const PortalApp = {
    user: null,
    profile: null,

    init: function() {
        // Initialize Auth Service
        if (window.fbAuth && window.AuthService) {
            window.AuthService.init(window.fbAuth);
        } else {
            this.showError("Errore di inizializzazione Firebase.");
            return;
        }

        // Listen for Auth changes
        window.AuthService.onAuthStateChanged((user, error) => {
            if (error) {
                console.error("Auth error:", error);
                this.showError("Errore di autenticazione: " + error.message);
                return;
            }
            if (user) {
                this.user = user;
                this.loadUserProfile();
            } else {
                this.user = null;
                this.profile = null;
                document.getElementById('portal-login-overlay').style.display = 'block';
                document.getElementById('portal-dashboard').style.display = 'none';
            }
        });
    },

    // --- UI Controls ---

    switchTab: function(tabName) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        // Deactivate all tabs
        document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
        
        // Activate target view
        document.getElementById(`view-${tabName}`).classList.add('active');
        
        // Activate target tab if exists
        if (tabName === 'login' || tabName === 'register') {
            const tabs = document.querySelectorAll('.tab');
            if (tabName === 'login') tabs[0].classList.add('active');
            if (tabName === 'register') tabs[1].classList.add('active');
        }
        
        this.hideError();
    },

    checkTerms: function() {
        const isChecked = document.getElementById('reg-terms').checked;
        document.getElementById('btn-reg-email').disabled = !isChecked;
        document.getElementById('btn-reg-google').disabled = !isChecked;
    },

    showError: function(msg) {
        const errDiv = document.getElementById('error-message');
        errDiv.textContent = msg;
        errDiv.style.display = 'block';
    },

    hideError: function() {
        document.getElementById('error-message').style.display = 'none';
    },

    // --- Auth Actions ---

    loginGoogle: async function() {
        this.hideError();
        try {
            await window.AuthService.login();
        } catch(e) {
            this.showError(this.translateError(e));
        }
    },

    loginEmail: async function() {
        this.hideError();
        const btn = document.getElementById('btn-login-submit');
        const email = document.getElementById('login-email').value;
        const pwd = document.getElementById('login-password').value;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Accesso...';
        
        try {
            await window.AuthService.loginWithEmail(email, pwd);
        } catch(e) {
            this.showError(this.translateError(e));
            btn.disabled = false;
            btn.innerHTML = 'Accedi';
        }
    },

    registerGoogle: async function() {
        this.hideError();
        try {
            // Se si registra con Google, Firebase Auth crea automaticamente l'account se non esiste
            // ma dobbiamo prima far scegliere il ruolo!
            // AuthService.login() gestisce il popup di google
            await window.AuthService.login();
            
            // Appena Firebase Auth ha successo, l'onAuthStateChanged intercetterà l'utente.
            // La creazione del profilo (ruolo) la faremo lì se non esiste ancora.
        } catch(e) {
            this.showError(this.translateError(e));
        }
    },

    registerEmail: async function() {
        this.hideError();
        const btn = document.getElementById('btn-reg-email');
        const nome = document.getElementById('reg-nome').value;
        const email = document.getElementById('reg-email').value;
        const pwd = document.getElementById('reg-password').value;
        const ruolo = document.getElementById('reg-ruolo').value;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrazione...';
        
        try {
            // 1. Crea account su Firebase Auth
            const newUser = await window.AuthService.registerWithEmail(email, pwd);
            
            // 2. Forza l'aggiornamento del displayName sul profilo Firebase Auth
            await newUser.updateProfile({ displayName: nome });
            
            // 3. Crea il Profilo Centrale in Firestore
            await window.UserService.createUserProfile(newUser.uid, nome, email, ruolo);
            
            // La callback onAuthStateChanged gestirà il passaggio alla dashboard
        } catch(e) {
            this.showError(this.translateError(e));
            btn.disabled = false;
            btn.innerHTML = 'Registrati con Email';
        }
    },

    resetPassword: async function() {
        this.hideError();
        const btn = document.getElementById('btn-reset-submit');
        const email = document.getElementById('reset-email').value;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Invio...';
        
        try {
            await window.AuthService.resetPassword(email);
            alert("Ti abbiamo inviato un'email con il link per ripristinare la password.");
            this.switchTab('login');
        } catch(e) {
            this.showError(this.translateError(e));
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Invia Link di Ripristino';
        }
    },

    logout: async function() {
        try {
            await window.AuthService.logout();
        } catch(e) {
            console.error("Errore logout:", e);
        }
    },

    // --- Data Loading ---

    loadUserProfile: async function() {
        try {
            // Mostra UI base in attesa del caricamento
            document.getElementById('portal-login-overlay').style.display = 'none';
            document.getElementById('portal-dashboard').style.display = 'flex';
            
            // Controlla se il profilo esiste già (nel caso di Google Register che lancia onAuthStateChanged)
            let snap = await window.fbDb.hub.collection("users").doc(this.user.uid).get();
            
            if (!snap.exists) {
                // L'utente è entrato con Google (prima volta), creiamo il profilo on-the-fly.
                // Siccome non siamo passati per il form registrazione, lo consideriamo "studente" o "esterno"
                // OPPURE possiamo bloccarlo e fargli compilare un form.
                // Per semplificare ora, recuperiamo i dati dal DOM se veniamo dal tasto "Registrati Google"
                
                let ruoloDesiderato = 'studente'; // default
                const regRuoloSelect = document.getElementById('reg-ruolo');
                if (regRuoloSelect && document.getElementById('view-register').classList.contains('active')) {
                    ruoloDesiderato = regRuoloSelect.value;
                }
                
                const nome = this.user.displayName || "Nuovo Utente";
                const email = this.user.email || "";
                
                await window.UserService.createUserProfile(this.user.uid, nome, email, ruoloDesiderato);
                snap = await window.fbDb.hub.collection("users").doc(this.user.uid).get();
            }

            this.profile = snap.data();
            
            // Update Dashboard UI
            document.getElementById('user-greeting').textContent = `Ciao, ${this.profile.nome.split(' ')[0]}!`;
            
            // Handle Teacher Pending state
            if (this.profile.ruolo === 'docente' && this.profile.statoAccount === 'pending') {
                document.getElementById('teacher-pending-banner').style.display = 'block';
            } else {
                document.getElementById('teacher-pending-banner').style.display = 'none';
            }
            
        } catch(e) {
            console.error("Errore recupero profilo:", e);
            this.showError("Impossibile caricare il profilo centrale.");
        }
    },

    // --- App Bridge ---
    openPlatform: function(gameId) {
        if (gameId === 'fantaletteratura') {
            // Esempio fittizio di redirect alla piattaforma passando il token silente
            // Nella realtà FantaLetteratura sarà su un altro dominio e leggerà l'Auth di sistema se condiviso
            // o useremo un redirect con custom token / session cookie.
            alert("Apertura di FantaLetteratura in modalità compatibilità bridge... (Simulazione)");
            window.location.href = "https://prof-memmo.github.io/fantaletteratura/?bridge=true";
        }
    },

    // --- Utility ---
    translateError: function(err) {
        const code = err.code || "";
        if (code === 'auth/user-not-found') return "Utente non trovato. Controlla l'email o registrati.";
        if (code === 'auth/wrong-password') return "Password errata. Riprova.";
        if (code === 'auth/email-already-in-use') return "Esiste già un account con questa email.";
        if (code === 'auth/weak-password') return "La password deve contenere almeno 6 caratteri.";
        if (code === 'auth/invalid-email') return "L'indirizzo email non è valido.";
        return err.message;
    }
};

document.addEventListener("DOMContentLoaded", () => {
    PortalApp.init();
});
