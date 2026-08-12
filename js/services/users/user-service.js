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
    getDefaultProfile: function(uid, nome, email, ruoloIniziale = 'studente', fotoProfilo = '') {
        return {
            uid: uid,
            email: email,
            anagrafica: {
                nome: nome,
                cognome: '',
                avatar: fotoProfilo || '👤'
            },
            role: ruoloIniziale,
            statusAccount: ruoloIniziale === 'docente' ? 'pending' : 'active',
            subscription: ruoloIniziale === 'studente' ? 'studente' : 'base',
            platforms: {
                fantaletteratura: { enabled: false, permissions: [] },
                palestra_riflessione: { enabled: false, permissions: [] },
                rotta_degli_eroi: { enabled: false, permissions: [] },
                corte_della_commedia: { enabled: false, permissions: [] },
                ops_storia: { enabled: false, permissions: [] },
                supplenze: { enabled: false, permissions: [] }
            },
            adminOverrides: {},
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
    },

    /**
     * Crea un nuovo profilo utente centrale nell'Hub
     */
    createUserProfile: async function(uid, nome, email, ruolo) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase Hub non inizializzato");
        
        // I ruoli ammessi sono: studente, docente, viandante, admin
        const validRoles = ['studente', 'docente', 'viandante', 'amico_del_prof', 'admin'];
        if (!validRoles.includes(ruolo)) {
            ruolo = 'studente'; // fallback
        }

        const newUser = this.getDefaultProfile(uid, nome, email, ruolo);
        await window.fbDb.hub.collection("hub_users").doc(uid).set(newUser);
        return newUser;
    },

    /**
     * Recupera il profilo completo dell'utente (Identità, Piattaforme, Piano)
     */
    getUserProfile: async function(uid) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase Hub non inizializzato");
        const doc = await window.fbDb.hub.collection("hub_users").doc(uid).get();
        return doc.exists ? doc.data() : null;
    },

    /**
     * Aggiorna ruolo e stato dell'utente
     */
    updateUserRoleAndStatus: async function(uid, ruolo, statoAccount) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase Hub non inizializzato");
        const updates = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        if (ruolo) updates.role = ruolo;
        if (statoAccount) updates.statusAccount = statoAccount;
        
        await window.fbDb.hub.collection("hub_users").doc(uid).update(updates);
    },

    /**
     * FASE 3B.0 - BRIDGE RICEZIONE
     * Collega un UID storico di una piattaforma all'Identità Centrale dell'Hub.
     * Viene chiamato quando l'utente accede a un gioco con il vecchio Auth per sincronizzare gli account.
     */
    linkLegacyPlatformUid: async function(hubUid, gameId, legacyUid, gameRole) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase Hub non inizializzato");
        
        // Verifica che l'utente esista prima di collegare
        const docRef = window.fbDb.hub.collection("hub_users").doc(hubUid);
        const snap = await docRef.get();
        if (!snap.exists) throw new Error("Profilo centrale Hub non trovato.");

        const updates = {};
        // 1. Salva l'UID storico per mantenere la corrispondenza
        updates[`legacyUids.${gameId}`] = legacyUid;
        
        // 2. Registra la piattaforma come collegata e attiva
        updates[`piattaforme.${gameId}`] = {
            stato: 'attiva',
            ruolo: gameRole || 'studente',
            dataAssociazione: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // 3. Aggiunge l'ID del gioco alla lista semplice delle piattaforme abilitate
        updates.piattaformeAbilitate = firebase.firestore.FieldValue.arrayUnion(gameId);
        
        // 4. Aggiorna l'attività
        updates.ultimaAttivita = firebase.firestore.FieldValue.serverTimestamp();

        await docRef.update(updates);
        console.log(`[Bridge Hub] Collegamento effettuato con successo: ${hubUid} <-> ${legacyUid} su ${gameId}`);
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
        
        await window.fbDb.hub.collection("hub_users").doc(targetUid).update(updates);
    }
};

window.UserService = UserService;
