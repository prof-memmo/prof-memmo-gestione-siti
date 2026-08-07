// --- Auth Service ---
// Servizio indipendente per la gestione dell'autenticazione.
// Fornisce i metodi per login, logout e l'ascolto dello stato dell'utente.
// Progettato per essere slegato da logiche di UI o piattaforme specifiche,
// pronto per la futura integrazione con lo UserService centrale.

const AuthService = {
    authInstance: null,
    
    /**
     * Inizializza il servizio passando l'istanza di autenticazione Firebase.
     * @param {Object} fbAuthInstance L'istanza di firebase.auth() 
     */
    init: function(fbAuthInstance) {
        this.authInstance = fbAuthInstance;
    },

    /**
     * Registra una callback per ascoltare i cambiamenti di stato dell'autenticazione.
     * @param {Function} callback Funzione richiamata con (user, error)
     */
    onAuthStateChanged: function(callback) {
        if (!this.authInstance) {
            console.error("AuthService: Istanza Firebase Auth non inizializzata.");
            callback(null, new Error("Firebase Auth non inizializzato"));
            return;
        }

        this.authInstance.onAuthStateChanged(user => {
            callback(user, null);
        });
    },

    /**
     * Esegue il login tramite Google Provider.
     * @param {Array} providerScope Array opzionale di permessi extra da richiedere (es. API Google Calendar)
     */
    login: async function(providerScope = []) {
        if (!this.authInstance) {
            throw new Error("Servizio di autenticazione non inizializzato.");
        }
        
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            providerScope.forEach(scope => provider.addScope(scope));
            provider.setCustomParameters({ prompt: 'select_account' });
            
            await this.authInstance.signInWithPopup(provider);
            // Il login è andato a buon fine, onAuthStateChanged notificherà i listener
        } catch (e) {
            console.error("AuthService: Errore Google Login:", e);
            if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
                console.warn("AuthService: Popup bloccato, tento fallback su redirect...");
                const provider = new firebase.auth.GoogleAuthProvider();
                this.authInstance.signInWithRedirect(provider);
            } else {
                throw e; // Propaga l'errore per la gestione UI
            }
        }
    },

    /**
     * Registra un nuovo utente tramite Email e Password.
     */
    registerWithEmail: async function(email, password) {
        if (!this.authInstance) throw new Error("Servizio di autenticazione non inizializzato.");
        const userCredential = await this.authInstance.createUserWithEmailAndPassword(email, password);
        return userCredential.user;
    },

    /**
     * Effettua il login tramite Email e Password.
     */
    loginWithEmail: async function(email, password) {
        if (!this.authInstance) throw new Error("Servizio di autenticazione non inizializzato.");
        const userCredential = await this.authInstance.signInWithEmailAndPassword(email, password);
        return userCredential.user;
    },

    /**
     * Invia l'email per il ripristino della password.
     */
    resetPassword: async function(email) {
        if (!this.authInstance) throw new Error("Servizio di autenticazione non inizializzato.");
        await this.authInstance.sendPasswordResetEmail(email);
    },

    /**
     * Esegue il logout.
     */
    logout: async function() {
        if (this.authInstance) {
            await this.authInstance.signOut();
        }
    }
};

window.AuthService = AuthService;
