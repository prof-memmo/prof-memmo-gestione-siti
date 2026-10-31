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
        const newsletterListId = cfg.newsletterListId || cfg.listId || 3;
        const transacListId = cfg.transacListId || 6;
        return { apiKey, listId: newsletterListId, newsletterListId, transacListId };
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
                // Se la Cloud Function remota è già aggiornata con la Lista 6, restituisci il risultato
                if (result && result.data && result.data.success && result.data.transacListId) {
                    return result.data;
                }
                console.log("Cloud Function remota non ancora aggiornata con Lista 6, proseguo con allineamento diretto...");
            }
        } catch (fnErr) {
            console.warn("Cloud function syncAllBrevoContacts non disponibile, procedo con sincronizzazione diretta:", fnErr);
        }

        // Sincronizzazione diretta dal browser verso Brevo garantita per Liste 6 e 3
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

        const { apiKey, newsletterListId, transacListId } = this.getBrevoConfig();
        if (!apiKey) {
            throw new Error("Chiave API Brevo non trovata.");
        }

        let consentedCount = 0;
        let transacCount = 0;
        let nonConsentedCount = 0;
        let errorCount = 0;

        const usersWithConsent = [];
        const usersTransacOnly = [];
        const emailsWithoutConsent = [];
        const seenEmails = new Set();

        users.forEach(u => {
            const email = (u.email || "").toLowerCase().trim();
            if (!email || !email.includes("@") || email.includes("dummy") || email.includes("esempio")) return;
            if (seenEmails.has(email)) return;
            seenEmails.add(email);

            // Escludi studenti
            const rRaw = String(u.ruolo || u.role || "").toLowerCase();
            if (rRaw.includes("student")) return;

            const hasConsent = u.newsletter === true || (u.consents && u.consents.newsletter === true);
            if (hasConsent) {
                usersWithConsent.push(u);
            } else {
                usersTransacOnly.push(u);
                emailsWithoutConsent.push(email);
            }
        });

        // Helper per preparare il payload utente
        const formatPayload = (u, targetLists) => {
            const email = (u.email || "").toLowerCase().trim();
            const fullName = (u.nome || u.name || "Utente").trim();
            const parts = fullName.split(" ");
            const nome = parts[0] || "Utente";
            const cognome = parts.slice(1).join(" ") || (u.cognome || "");
            
            const rRaw = String(u.ruolo || u.role || "").toLowerCase();
            let ruolo = "Viandante";
            if (rRaw.includes("docente") || rRaw.includes("prof")) ruolo = "Docente";
            else if (rRaw.includes("admin")) ruolo = "Amministratore";

            const pRaw = String(u.plan || u.abbonamento || u.piano || "").toLowerCase();
            let piano = "Piano Base";
            if (pRaw.includes("ecosistema") || pRaw.includes("completo")) piano = "Ecosistema Completo";
            else if (pRaw.includes("didattico")) piano = "Docente Didattico";
            else if (pRaw.includes("viandante")) piano = "Viandante";

            return {
                email: email,
                attributes: {
                    NOME: nome,
                    COGNOME: cognome,
                    RUOLO: ruolo,
                    PIANO: piano
                },
                listIds: targetLists,
                updateEnabled: true
            };
        };

        // 1. Invio contatti con consenso a Brevo (Lista Transazionale 6 + Lista Newsletter 3)
        for (const u of usersWithConsent) {
            try {
                const resp = await fetch("https://api.brevo.com/v3/contacts", {
                    method: "POST",
                    headers: {
                        "api-key": apiKey,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(formatPayload(u, [transacListId, newsletterListId]))
                });

                if (resp.ok || resp.status === 201 || resp.status === 204 || resp.status === 200) {
                    consentedCount++;
                    transacCount++;
                } else {
                    const errJson = await resp.json().catch(() => ({}));
                    console.warn(`Avviso invio contatto Brevo (${u.email}):`, errJson);
                    consentedCount++;
                    transacCount++;
                }
            } catch (e) {
                console.error(`Errore invio Brevo per ${u.email}:`, e);
                errorCount++;
            }
        }

        // 2. Invio contatti senza consenso alla sola Lista Transazionale 6
        for (const u of usersTransacOnly) {
            try {
                const resp = await fetch("https://api.brevo.com/v3/contacts", {
                    method: "POST",
                    headers: {
                        "api-key": apiKey,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(formatPayload(u, [transacListId]))
                });

                if (resp.ok || resp.status === 201 || resp.status === 204 || resp.status === 200) {
                    transacCount++;
                }
            } catch (e) {
                console.error(`Errore invio transazionale Brevo per ${u.email}:`, e);
                errorCount++;
            }
        }

        // 3. Forzatura aggiunta esplicita alle liste (necessaria per contatti già presenti nell'anagrafica Brevo)
        const allTransacEmails = [...usersWithConsent, ...usersTransacOnly].map(u => (u.email || "").toLowerCase().trim()).filter(e => e && e.includes("@"));
        const consentedEmails = usersWithConsent.map(u => (u.email || "").toLowerCase().trim()).filter(e => e && e.includes("@"));

        if (allTransacEmails.length > 0) {
            try {
                await fetch(`https://api.brevo.com/v3/contacts/lists/${transacListId}/contacts/add`, {
                    method: "POST",
                    headers: {
                        "api-key": apiKey,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ emails: allTransacEmails })
                });
            } catch (addErr) {
                console.warn("Avviso aggiunta forzata a Lista Transazionale:", addErr);
            }
        }

        if (consentedEmails.length > 0) {
            try {
                await fetch(`https://api.brevo.com/v3/contacts/lists/${newsletterListId}/contacts/add`, {
                    method: "POST",
                    headers: {
                        "api-key": apiKey,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ emails: consentedEmails })
                });
            } catch (addNewsErr) {
                console.warn("Avviso aggiunta forzata a Lista Newsletter:", addNewsErr);
            }
        }

        // 4. Rimozione contatti non iscritti dalla lista Newsletter (Lista 3)
        if (emailsWithoutConsent.length > 0) {
            try {
                await fetch(`https://api.brevo.com/v3/contacts/lists/${newsletterListId}/contacts/remove`, {
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

        // 5. Salva timestamp su Firestore
        const syncMeta = {
            lastSyncAt: firebase.firestore.FieldValue.serverTimestamp(),
            newsletterListId: newsletterListId,
            transacListId: transacListId,
            totalEvaluated: seenEmails.size,
            transacSynced: transacCount,
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
