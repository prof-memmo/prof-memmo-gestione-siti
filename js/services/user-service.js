// --- User Service ---
// Servizio centrale indipendente per la gestione degli utenti dell'Hub.
// Attualmente predisposto, sarà implementato nella Fase 3 (Login Unico).
// Si occuperà di:
// - Identità utente globale
// - Ruoli e permessi
// - Approvazione docenti
// - Piani abbonamento e configurazioni
// - Override amministratore

const UserService = {
    /**
     * Inizializzazione futura
     */
    init: function() {
        console.log("UserService predisposto per futura implementazione.");
    },

    /**
     * Funzione placeholder per recuperare un utente completo
     */
    getUserProfile: async function(uid) {
        // Da implementare
        return null;
    },

    /**
     * Funzione placeholder per aggiornare ruoli e permessi
     */
    updateUserRole: async function(uid, role) {
        // Da implementare
    }
};

window.UserService = UserService;
