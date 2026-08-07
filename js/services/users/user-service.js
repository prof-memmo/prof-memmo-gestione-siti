// --- User Service ---
// Servizio centrale indipendente per la gestione degli utenti dell'Hub.
// Attualmente predisposto, sarà implementato nella Fase 3 (Login Unico).
// Si occuperà di:
// - Identità utente globale
// - Ruoli e permessi
// - Approvazione docenti
// - Piani abbonamento e configurazioni
// - Override amministratore
// - Piattaforme collegate

const UserService = {
    /**
     * Struttura base per un nuovo utente centrale dell'Hub
     */
    getDefaultProfile: function(nome, email, ruoloIniziale = 'studente', fotoProfilo = '') {
        return {
            nome: nome,
            email: email,
            fotoProfilo: fotoProfilo,
            ruolo: ruoloIniziale, // studente, docente, amico_del_prof
            statoAccount: ruoloIniziale === 'docente' ? 'pending' : 'active',
            piattaformeAbilitate: [],
            dataCreazione: firebase.firestore.FieldValue.serverTimestamp(),
            ultimaAttivita: firebase.firestore.FieldValue.serverTimestamp(),
            // Struttura predisposta per Step 5 (Override Amministratore)
            adminOverrides: {
                piano: 'Versione Base', // in futuro 'Versione Completa'
                permessiSpeciali: [],
                override: false,
                noteAmministratore: ''
            }
        };
    },

    /**
     * Crea un nuovo profilo utente centrale nell'Hub
     */
    createUserProfile: async function(uid, nome, email, ruolo) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase Hub non inizializzato");
        
        // I ruoli ammessi sono: studente, docente, amico_del_prof
        const validRoles = ['studente', 'docente', 'amico_del_prof', 'admin'];
        if (!validRoles.includes(ruolo)) {
            ruolo = 'studente'; // fallback
        }

        const newUser = this.getDefaultProfile(nome, email, ruolo);
        await window.fbDb.hub.collection("users").doc(uid).set(newUser);
        return newUser;
    },

    /**
     * Recupera il profilo completo dell'utente (Identità, Piattaforme, Piano)
     */
    getUserProfile: async function(uid) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase Hub non inizializzato");
        const doc = await window.fbDb.hub.collection("users").doc(uid).get();
        return doc.exists ? doc.data() : null;
    },

    /**
     * Aggiorna ruolo e stato dell'utente
     */
    updateUserRoleAndStatus: async function(uid, ruolo, statoAccount) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase Hub non inizializzato");
        const updates = { ultimaAttivita: firebase.firestore.FieldValue.serverTimestamp() };
        if (ruolo) updates.ruolo = ruolo;
        if (statoAccount) updates.statoAccount = statoAccount;
        
        await window.fbDb.hub.collection("users").doc(uid).update(updates);
    },

    /**
     * Gestisce l'override da parte dell'amministratore (es. sblocchi manuali)
     */
    adminOverrideUser: async function(targetUid, overridesObj) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase Hub non inizializzato");
        // overridesObj conterrà { piano: '...', permessiSpeciali: [...], noteAmministratore: '...' }
        const updates = {};
        for (const [key, value] of Object.entries(overridesObj)) {
            updates[`adminOverrides.${key}`] = value;
        }
        updates['adminOverrides.override'] = true;
        
        await window.fbDb.hub.collection("users").doc(targetUid).update(updates);
    }
};

window.UserService = UserService;
