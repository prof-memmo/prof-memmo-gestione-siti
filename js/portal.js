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
                const loginOverlay = document.getElementById('portal-login-overlay');
                const onboarding = document.getElementById('portal-onboarding');
                if (loginOverlay) loginOverlay.style.display = 'block';
                if (onboarding) onboarding.style.display = 'none';
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
        // La validazione avviene al momento del submit (solo per le registrazioni email)
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

    submitAuth: async function() {
        this.hideError();
        const btn = document.getElementById('btn-reg-email');
        const email = document.getElementById('reg-email').value;
        const pwd = document.getElementById('reg-password').value;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Attendere...';
        
        try {
            // Proviamo prima a loggare l'utente
            await window.AuthService.loginWithEmail(email, pwd);
            // Se funziona, l'utente esiste e la password è giusta. onAuthStateChanged farà il resto.
        } catch(e) {
            // Se l'errore è credenziali non valide / utente non trovato
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
                
                // Forse è un nuovo utente! Controlliamo se ha compilato i dati obbligatori per registrarsi.
                const terms = document.getElementById('reg-terms').checked;
                const age = document.getElementById('reg-age').checked;
                
                if (!terms || !age) {
                    this.showError("Credenziali errate oppure account inesistente. Se sei un nuovo utente, accetta i Termini e conferma l'Età per poterti registrare.");
                    btn.disabled = false;
                    btn.innerHTML = 'Entra / Registrati con Email';
                    return;
                }
                
                // Ha compilato tutto, proviamo a registrarlo!
                try {
                    await window.AuthService.registerWithEmail(email, pwd);
                    // Il nome non è più richiesto alla registrazione via email. Verrà richiesto o gestito altrove se necessario.
                } catch(regError) {
                    if (regError.code === 'auth/email-already-in-use') {
                        // L'utente esiste già, quindi aveva solo sbagliato la password!
                        this.showError("Password errata. Riprova o clicca su 'Hai dimenticato la password?'.");
                    } else {
                        this.showError(this.translateError(regError));
                    }
                    btn.disabled = false;
                    btn.innerHTML = 'Entra / Registrati con Email';
                }
            } else {
                // Altro errore di login
                this.showError(this.translateError(e));
                btn.disabled = false;
                btn.innerHTML = 'Entra / Registrati con Email';
            }
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
            // Auto-creazione profilo super-admin per il Prof
            if (this.user.email && this.user.email.toLowerCase() === 'prof.memmo@gmail.com') {
                try {
                    const adminProfile = {
                        anagrafica: { nome: 'Prof. Memmo' },
                        role: 'admin',
                        statusAccount: 'active',
                        email: 'prof.memmo@gmail.com',
                        platforms: {
                            fantaletteratura: { enabled: true },
                            palestra_riflessione: { enabled: true },
                            rotta_degli_eroi: { enabled: true },
                            corte_della_commedia: { enabled: true },
                            ops_storia: { enabled: true }
                        }
                    };
                    await window.fbDb.hub.collection("hub_users").doc(this.user.uid).set(adminProfile, {merge: true});
                } catch(e) {
                    console.warn("Auto-creazione profilo Admin fallita (probabilmente già esistente o regole restrittive):", e);
                }
            }

            // Controlla se il profilo esiste
            let snap = await window.fbDb.hub.collection("hub_users").doc(this.user.uid).get();
            
            if (!snap.exists) {
                // Mostra la UI di onboarding a Card
                const loginOverlay = document.getElementById('portal-login-overlay');
                const onboarding = document.getElementById('portal-onboarding');
                if (loginOverlay) loginOverlay.style.display = 'none';
                if (onboarding) onboarding.style.display = 'flex';
                return; // Fermiamo qui l'esecuzione.
            }

            this.profile = snap.data();
            
            // Reindirizzamento SSO immediato
            const urlParams = new URLSearchParams(window.location.search);
            const redirectTarget = urlParams.get('redirect');
            const isPreview = window.location.pathname.includes('/preview');

            if (redirectTarget) {
                const gameMap = {
                    'fantaletteratura': isPreview ? 'https://prof-memmo.github.io/fantaletteratura/preview/' : 'https://prof-memmo.github.io/fantaletteratura/',
                    'palestra_riflessione': isPreview ? 'https://prof-memmo.github.io/palestra-di-riflessione/preview/' : 'https://prof-memmo.github.io/palestra-di-riflessione/',
                    'rotta_degli_eroi': isPreview ? 'https://prof-memmo.github.io/la-rotta-degli-eroi/preview/' : 'https://prof-memmo.github.io/la-rotta-degli-eroi/',
                    'corte_della_commedia': isPreview ? 'https://prof-memmo.github.io/la-corte-della-commedia/preview/' : 'https://prof-memmo.github.io/la-corte-della-commedia/'
                };
                if (gameMap[redirectTarget]) {
                    window.location.replace(gameMap[redirectTarget]);
                    return;
                }
            }

            // Altrimenti va SEMPRE all'Area Profilo ufficiale
            const profileUrl = isPreview 
                ? 'https://prof-memmo.github.io/games/preview/profilo.html' 
                : 'https://prof-memmo.github.io/games/profilo.html';
            window.location.replace(profileUrl);
            return;

        } catch(e) {
            console.error("Errore recupero profilo:", e);
            this.showError("Impossibile caricare il profilo centrale. Dettaglio: " + e.message);
        }
    },

    pendingRole: 'studente',

    toggleSingleOption: function(containerId, el) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.querySelectorAll('.pill-option').forEach(p => p.classList.remove('selected'));
        el.classList.add('selected');
    },

    selectRole: function(ruolo) {
        this.pendingRole = ruolo || 'studente';
        // Passa allo Step 2: Questionario 3 Domande
        const onboardingEl = document.getElementById('portal-onboarding');
        const surveyEl = document.getElementById('portal-survey');
        if (onboardingEl) onboardingEl.style.display = 'none';
        if (surveyEl) surveyEl.style.display = 'flex';
    },

    submitSurvey: async function(skipped = false) {
        try {
            const nome = this.user.displayName || "Nuovo Utente";
            const email = this.user.email || "";
            let surveyData = null;

            if (!skipped) {
                const canaleEl = document.querySelector('#survey-canale-options .pill-option.selected');
                const etaEl = document.querySelector('#survey-eta-options .pill-option.selected');
                const materieEls = document.querySelectorAll('#survey-materie-options .pill-option.selected');

                const canale = canaleEl ? canaleEl.getAttribute('data-value') : 'Non specificato';
                const fasciaEta = etaEl ? etaEl.getAttribute('data-value') : 'Non specificato';
                const materie = Array.from(materieEls).map(el => el.getAttribute('data-value'));

                surveyData = {
                    canale: canale,
                    fasciaEta: fasciaEta,
                    materie: materie,
                    completedAt: new Date().toISOString()
                };
            }

            const surveyEl = document.getElementById('portal-survey');
            if (surveyEl) surveyEl.style.display = 'none';

            await window.UserService.createUserProfile(this.user.uid, nome, email, this.pendingRole || 'studente', surveyData);
            
            // Ricarica il profilo adesso che esiste
            await this.loadUserProfile();
        } catch(e) {
            console.error("Errore completamento onboarding:", e);
            alert("Errore durante la registrazione del profilo.");
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
        const urls = {
            'fantaletteratura': 'https://prof-memmo.github.io/fantaletteratura/index.html',
            'palestra_riflessione': 'https://prof-memmo.github.io/palestra-di-riflessione/index.html',
            'rotta_degli_eroi': 'https://prof-memmo.github.io/la-rotta-degli-eroi/index.html',
            'corte_della_commedia': 'https://prof-memmo.github.io/la-corte-della-commedia/index.html',
            'ops_storia': 'https://prof-memmo.github.io/ops-storia/index.html'
        };
        if (urls[gameId]) {
            window.location.href = urls[gameId];
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
