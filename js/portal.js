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
                document.getElementById('portal-onboarding').style.display = 'none';
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
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrazione...';
        
        try {
            // 1. Crea account su Firebase Auth
            const newUser = await window.AuthService.registerWithEmail(email, pwd);
            
            // 2. Forza l'aggiornamento del displayName sul profilo Firebase Auth
            await newUser.updateProfile({ displayName: nome });
            
            // La callback onAuthStateChanged gestirà il passaggio all'onboarding
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
            // Controlla se il profilo esiste già
            let snap = await window.fbDb.hub.collection("hub_users").doc(this.user.uid).get();
            
            if (!snap.exists) {
                // Mostra la UI di onboarding a Card
                document.getElementById('portal-login-overlay').style.display = 'none';
                document.getElementById('portal-dashboard').style.display = 'none';
                document.getElementById('portal-onboarding').style.display = 'flex';
                return; // Fermiamo qui l'esecuzione.
            }

            this.profile = snap.data();
            
            // Mostra Dashboard UI
            document.getElementById('portal-login-overlay').style.display = 'none';
            document.getElementById('portal-onboarding').style.display = 'none';
            document.getElementById('portal-dashboard').style.display = 'flex';
            
            document.getElementById('user-greeting').textContent = `Ciao, ${this.profile.anagrafica.nome.split(' ')[0]}!`;
            
            // Gestione blocchi account
            const isRejected = (this.profile.statusAccount === 'rejected' || this.profile.statusAccount === 'suspended');
            
            if (isRejected) {
                document.getElementById('account-blocked-banner').style.display = 'block';
                document.getElementById('teacher-pending-banner').style.display = 'none';
                document.getElementById('platforms-container').style.display = 'none';
                return; // Non renderizza le piattaforme
            } else {
                document.getElementById('account-blocked-banner').style.display = 'none';
                document.getElementById('platforms-container').style.display = 'grid';
            }

            // Handle Teacher Pending state
            if (this.profile.role === 'docente' && this.profile.statusAccount === 'pending') {
                document.getElementById('teacher-pending-banner').style.display = 'block';
            } else {
                document.getElementById('teacher-pending-banner').style.display = 'none';
            }
            
            this.renderPlatforms();

        } catch(e) {
            console.error("Errore recupero profilo:", e);
            this.showError("Impossibile caricare il profilo centrale.");
        }
    },

    selectRole: async function(ruolo) {
        try {
            // Recupera o usa un nome di default
            const nome = this.user.displayName || "Nuovo Utente";
            const email = this.user.email || "";
            
            // Mostra indicatore caricamento bloccando l'interfaccia se necessario
            // ... (potremmo aggiungere un overlay di loading)
            
            await window.UserService.createUserProfile(this.user.uid, nome, email, ruolo);
            
            // Ricarica il profilo adesso che esiste
            await this.loadUserProfile();
        } catch(e) {
            console.error(e);
            alert("Errore durante la creazione del profilo.");
        }
    },

    // --- App Bridge & Render ---
    
    renderPlatforms: function() {
        const container = document.getElementById('platforms-container');
        container.innerHTML = '';
        
        const userPlatforms = this.profile.platforms || {};
        
        // Elenco delle piattaforme previste
        const allPlatforms = [
            { id: 'fantaletteratura', title: 'FantaLetteratura', icon: 'fa-dragon', color: '#a855f7', desc: 'Costruisci la tua squadra di autori e generi letterari sfidandoti in un fanta-campionato culturale.' },
            { id: 'palestra_riflessione', title: 'Palestra di Riflessione', icon: 'fa-brain', color: '#22c55e', desc: 'Esercita il pensiero logico e critico.' },
            { id: 'rotta_degli_eroi', title: 'La Rotta degli Eroi', icon: 'fa-ship', color: '#3b82f6', desc: 'Scegli la tua avventura e il tuo eroe.' },
            { id: 'corte_della_commedia', title: 'Corte della Commedia', icon: 'fa-gavel', color: '#ef4444', desc: 'Processa i personaggi storici.' },
            { id: 'ops_storia', title: 'OPS Storia', icon: 'fa-hourglass', color: '#eab308', desc: 'Missioni storiche a tempo.' }
        ];

        allPlatforms.forEach(p => {
            const platformData = userPlatforms[p.id] || { enabled: false };
            const isEnabled = platformData.enabled;
            
            let cardClass = "platform-card";
            let onClickAttr = "";
            let statusBadge = "";

            if (isEnabled) {
                onClickAttr = `onclick="PortalApp.openPlatform('${p.id}')"`;
                statusBadge = `<div style="font-size:0.75rem; color:var(--accent); margin-bottom:10px; font-weight:700;">ACCESSO CONSENTITO</div>`;
            } else {
                cardClass += " disabled";
                statusBadge = `<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:10px; font-weight:700;">NON ABILITATA</div>`;
            }

            const html = `
              <div class="${cardClass}" ${onClickAttr}>
                ${statusBadge}
                <div class="platform-icon" style="color:${p.color};"><i class="fa-solid ${p.icon}"></i></div>
                <h3 class="platform-title">${p.title}</h3>
                <p class="platform-desc">${p.desc}</p>
              </div>
            `;
            container.innerHTML += html;
        });
    },
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
