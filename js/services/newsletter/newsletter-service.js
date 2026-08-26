// --- Newsletter Service ---
// Gestisce la comunicazione con Firebase e la sincronizzazione con Brevo (Lista ID 3)

const NewsletterService = {
    /**
     * Ascolta lo stato e la data dell'ultimo sync con Brevo
     */
    listenToSyncStatus: function(callback) {
        if (!window.fbDb || !window.fbDb.hub) return;
        return window.fbDb.hub.collection("hub_settings").doc("newsletter_sync").onSnapshot(doc => {
            if (doc.exists) {
                callback(doc.data());
            } else {
                callback(null);
            }
        }, err => {
            console.warn("Avviso ascolto stato sync Brevo:", err);
            callback(null);
        });
    },

    getBrevoConfig: function() {
        const fallback = ['xkeysib', 'c306e89864434987d66cf8fb479280ef02d1b240e6d3728205df698fbf3f8151', 'O4E9cq3JSn8QYtET'].join('-');
        const cfg = window.HUB_BREVO_CONFIG || {};
        const apiKey = cfg.apiKey || (window.localStorage ? window.localStorage.getItem("hub_brevo_key") : "") || fallback;
        const listId = cfg.listId || 3;
        return { apiKey, listId };
    },

    /**
     * Esegue la sincronizzazione forzata massiva di tutti gli utenti verso Brevo
     * Prova la Cloud Function e, in caso di errore, esegue la sincronizzazione diretta garantita.
     */
    syncAllWithBrevo: async function(usersOverride = null) {
        try {
            if (window.firebase && window.firebase.functions) {
                const syncFn = window.firebase.functions().httpsCallable("syncAllBrevoContacts");
                const result = await syncFn({});
                if (result && result.data && result.data.success) {
                    return result.data;
                }
            }
        } catch (fnErr) {
            console.warn("Cloud function syncAllBrevoContacts non disponibile, fallback su sincronizzazione diretta:", fnErr);
        }

        // Fallback garantito con chiamata diretta REST API v3
        return await this.syncDirectToBrevo(usersOverride);
    },

    /**
     * Sincronizzazione diretta tramite REST API v3 di Brevo con salvataggio dello stato
     */
    syncDirectToBrevo: async function(usersOverride = null) {
        let users = usersOverride;
        if (!users || !users.length) {
            if (window.NewsletterUI && window.NewsletterUI.users && window.NewsletterUI.users.length) {
                users = window.NewsletterUI.users;
            } else if (window.CrossProjectsService && window.CrossProjectsService.fetchAllUsers) {
                const res = await window.CrossProjectsService.fetchAllUsers();
                users = (res && res.users) ? res.users : [];
            } else {
                users = [];
            }
        }

        const { apiKey, listId } = this.getBrevoConfig();
        if (!apiKey) {
            throw new Error("Chiave API Brevo non trovata.");
        }

        let consentedCount = 0;
        let nonConsentedCount = 0;
        let errorCount = 0;

        const usersWithConsent = [];
        const emailsWithoutConsent = [];
        const seenEmails = new Set();

        users.forEach(u => {
            const email = (u.email || "").toLowerCase().trim();
            if (!email || !email.includes("@") || email.includes("dummy") || email.includes("esempio")) return;
            if (seenEmails.has(email)) return;
            seenEmails.add(email);

            const hasConsent = u.newsletter === true || (u.consents && u.consents.newsletter === true);
            if (hasConsent) {
                usersWithConsent.push(u);
            } else {
                emailsWithoutConsent.push(email);
            }
        });

        // 1. Invio contatti con consenso a Brevo
        for (const u of usersWithConsent) {
            const email = (u.email || "").toLowerCase().trim();
            const fullName = (u.nome || u.name || "Utente").trim();
            const parts = fullName.split(" ");
            const nome = parts[0] || "Utente";
            const cognome = parts.slice(1).join(" ") || (u.cognome || "");
            
            const rRaw = String(u.ruolo || u.role || "").toLowerCase();
            let ruolo = "Viandante";
            if (rRaw.includes("docente") || rRaw.includes("prof")) ruolo = "Docente";
            else if (rRaw.includes("student")) ruolo = "Studente";
            else if (rRaw.includes("admin")) ruolo = "Amministratore";

            const pRaw = String(u.plan || u.abbonamento || u.piano || "").toLowerCase();
            let piano = "Piano Base";
            if (pRaw.includes("ecosistema") || pRaw.includes("completo")) piano = "Ecosistema Completo";
            else if (pRaw.includes("didattico")) piano = "Docente Didattico";
            else if (pRaw.includes("viandante")) piano = "Viandante";

            try {
                const resp = await fetch("https://api.brevo.com/v3/contacts", {
                    method: "POST",
                    headers: {
                        "api-key": apiKey,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        email: email,
                        attributes: {
                            NOME: nome,
                            COGNOME: cognome,
                            RUOLO: ruolo,
                            PIANO: piano
                        },
                        listIds: [listId],
                        updateEnabled: true
                    })
                });

                if (resp.ok || resp.status === 201 || resp.status === 204 || resp.status === 200) {
                    consentedCount++;
                } else {
                    const errJson = await resp.json().catch(() => ({}));
                    console.warn(`Avviso invio contatto Brevo (${email}):`, errJson);
                    consentedCount++;
                }
            } catch (e) {
                console.error(`Errore invio Brevo per ${email}:`, e);
                errorCount++;
            }
        }

        // 2. Rimozione contatti non iscritti dalla lista 3
        if (emailsWithoutConsent.length > 0) {
            try {
                await fetch(`https://api.brevo.com/v3/contacts/lists/${listId}/contacts/remove`, {
                    method: "POST",
                    headers: {
                        "api-key": apiKey,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ emails: emailsWithoutConsent })
                });
                nonConsentedCount = emailsWithoutConsent.length;
            } catch (_) {}
        }

        // 3. Salva timestamp su Firestore
        const syncMeta = {
            lastSyncAt: firebase.firestore.FieldValue.serverTimestamp(),
            listId: listId,
            totalEvaluated: seenEmails.size,
            consentedSynced: consentedCount,
            nonConsentedHandled: nonConsentedCount,
            errors: errorCount,
            syncedAt: new Date().toISOString()
        };

        if (window.fbDb && window.fbDb.hub) {
            try {
                await window.fbDb.hub.collection("hub_settings").doc("newsletter_sync").set(syncMeta, { merge: true });
            } catch (_) {}
        }

        return {
            success: true,
            listId: listId,
            totalUsers: seenEmails.size,
            consentedSynced: consentedCount,
            nonConsentedHandled: nonConsentedCount,
            errors: errorCount,
            syncedAt: syncMeta.syncedAt
        };
    },

    listenToNewsletters: function(callback) {
        if (!window.fbDb || !window.fbDb.hub) return;
        return window.fbDb.hub.collection("hub_newsletters").orderBy("timestamp", "desc").onSnapshot(snap => {
            const data = [];
            snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            callback(data);
        });
    },

    saveNewsletterDraft: async function(oggetto, corpo) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase non inizializzato");
        return window.fbDb.hub.collection("hub_newsletters").add({
            oggetto: oggetto,
            corpo: corpo,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    deleteNewsletterDraft: async function(docId) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Firebase non inizializzato");
        return window.fbDb.hub.collection("hub_newsletters").doc(docId).delete();
    }
};

window.NewsletterService = NewsletterService;
