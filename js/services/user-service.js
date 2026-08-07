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
     * Inizializzazione futura
     */
    init: function() {
        console.log("UserService predisposto per futura implementazione.");
    },

    /**
     * Recupera il profilo completo dell'utente (Identità, Piattaforme, Piano)
     */
    getUserProfile: async function(uid) {
        // TODO (Fase 3): Fetch dal database centrale
        return null;
    },

    /**
     * Aggiorna ruolo e permessi base dell'utente
     */
    updateUserRole: async function(uid, role) {
        // TODO (Fase 3)
    },

    /**
     * Gestisce il processo di verifica e approvazione per gli account 'docente'
     */
    approveTeacherStatus: async function(uid, isApproved) {
        // TODO (Fase 3)
    },

    /**
     * Recupera i permessi specifici (es. accesso a funzioni Premium o Admin)
     */
    getUserPermissions: async function(uid) {
        // TODO (Fase 3)
        return {};
    },

    /**
     * Verifica e aggiorna il piano abbonamento (Base/Completo)
     */
    getUserPlan: async function(uid) {
        // TODO (Fase 3)
        return 'Base';
    },

    /**
     * Gestisce il collegamento dell'utente alle varie piattaforme (es. Fanta, Eroi, ecc.)
     */
    getConnectedPlatforms: async function(uid) {
        // TODO (Fase 3)
        return [];
    },

    /**
     * Gestisce l'override da parte dell'amministratore (es. sblocchi manuali)
     */
    adminOverrideUser: async function(adminUid, targetUid, overrides) {
        // TODO (Fase 3)
    }
};

window.UserService = UserService;
