// functions/index.js
// Cloud Function: Webhook Stripe Server-Side per Hub Centrale Prof. Memmo
// Gestisce il ciclo di vita completo degli abbonamenti ricorrenti annuali.
// Fonte Unica di Verità: Stripe. Nessuna mutazione autorizzata dal client-side.

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();
const db = admin.firestore();

// Inizializzazione Stripe tramite variabile d'ambiente o config Firebase
const stripeSecret = process.env.STRIPE_SECRET_KEY || (functions.config().stripe && functions.config().stripe.secret);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || (functions.config().stripe && functions.config().stripe.webhook_secret);

const stripe = Stripe(stripeSecret || "dummy_secret_key");

/**
 * Risolve l'identificativo del piano Hub a partire dal Price ID Stripe o dai metadata
 */
async function resolvePlanIdFromStripe(priceId, metadata) {
    if (metadata && metadata.planId) {
        return metadata.planId.toLowerCase();
    }
    
    // Controlla la mappatura presente in Firestore (hub_settings/ecosistema)
    try {
        const doc = await db.collection("hub_settings").doc("ecosistema").get();
        if (doc.exists) {
            const data = doc.data() || {};
            const stripePiani = data.stripe_piani_config || {};
            for (const [planKey, pId] of Object.entries(stripePiani)) {
                if (pId === priceId) return planKey;
            }
        }
    } catch (e) {
        console.error("Errore lettura mappatura piani da Firestore:", e);
    }

    return "completo"; // Fallback generico
}

/**
 * Trova l'UID dell'utente Hub associato al customer Stripe o all'email
 */
async function findUserIdByCustomer(customerId, customerEmail) {
    if (!customerId && !customerEmail) return null;

    try {
        if (customerId) {
            const snap = await db.collection("hub_users")
                .where("subscription.stripeCustomerId", "==", customerId)
                .limit(1)
                .get();
            if (!snap.empty) {
                return snap.docs[0].id;
            }
        }

        if (customerEmail) {
            const snapEmail = await db.collection("hub_users")
                .where("email", "==", customerEmail.toLowerCase().trim())
                .limit(1)
                .get();
            if (!snapEmail.empty) {
                return snapEmail.docs[0].id;
            }
        }
    } catch (e) {
        console.error("Errore ricerca utente per customer Stripe:", e);
    }

    return null;
}

/**
 * Webhook Principale Stripe
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const sig = req.headers["stripe-signature"];
    let event;

    try {
        if (webhookSecret && webhookSecret !== "dummy_webhook_secret") {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        } else {
            // Modalità sviluppo o test locale
            event = req.body;
        }
    } catch (err) {
        console.error(`⚠️ Errore verifica firma webhook Stripe: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`🔔 Evento Stripe ricevuto: ${event.type} (ID: ${event.id})`);

    try {
        switch (event.type) {
            // =========================================================================
            // 1. PRIMO ACQUISTO E ATTIVAZIONE ABBONAMENTO
            // =========================================================================
            case "checkout.session.completed": {
                const session = event.data.object;
                const userId = session.client_reference_id || (session.metadata && session.metadata.userId);
                const customerEmail = session.customer_details ? session.customer_details.email : null;
                const finalUserId = userId || (await findUserIdByCustomer(session.customer, customerEmail));

                if (!finalUserId) {
                    console.warn("⚠️ Nessun UID utente Hub associato alla sessione Checkout:", session.id);
                    break;
                }

                let planId = "completo";
                let expiresAt = null;

                // Recupera dettagli abbonamento se ricorrente
                if (session.subscription) {
                    try {
                        const sub = await stripe.subscriptions.retrieve(session.subscription);
                        const priceId = sub.items && sub.items.data[0] ? sub.items.data[0].price.id : null;
                        planId = await resolvePlanIdFromStripe(priceId, session.metadata);
                        if (sub.current_period_end) {
                            expiresAt = new Date(sub.current_period_end * 1000).toISOString();
                        }
                    } catch (e) {
                        console.error("Errore recupero dettagli subscription da Stripe:", e);
                    }
                } else {
                    planId = await resolvePlanIdFromStripe(null, session.metadata);
                    // 1 anno standard
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + 1);
                    expiresAt = d.toISOString();
                }

                const pricePaid = session.amount_total ? session.amount_total / 100 : 0;
                const currency = (session.currency || "eur").toUpperCase();
                const promoApplied = session.total_details && session.total_details.amount_discount > 0 ? "Coupon/Promo applicato" : null;

                // Aggiornamento atomico e autoritativo su Firestore
                const userRef = db.collection("hub_users").doc(finalUserId);
                await userRef.set({
                    abbonamento: planId,
                    ruolo: planId.includes("docente") ? "docente" : "viandante",
                    subscription: {
                        plan: planId,
                        status: "active",
                        pricePaid: pricePaid,
                        currency: currency,
                        promoApplied: promoApplied,
                        stripeCustomerId: session.customer || null,
                        stripeSubscriptionId: session.subscription || null,
                        stripeSessionId: session.id,
                        purchasedAt: new Date().toISOString(),
                        expiresAt: expiresAt,
                        lastEvent: event.type,
                        lastEventAt: new Date().toISOString()
                    }
                }, { merge: true });

                // Registra la transazione
                await db.collection("hub_transactions").doc(session.id).set({
                    userId: finalUserId,
                    planId: planId,
                    amount: pricePaid,
                    currency: currency,
                    stripeSessionId: session.id,
                    stripeCustomerId: session.customer || null,
                    stripeSubscriptionId: session.subscription || null,
                    createdAt: new Date().toISOString(),
                    type: "initial_purchase"
                }, { merge: true });

                console.log(`✅ Utente ${finalUserId} attivato con piano ${planId} (€${pricePaid} ${currency})`);
                break;
            }

            // =========================================================================
            // 2. RINNOVO ANNUALE RIUSCITO (INVOICE.PAID)
            // =========================================================================
            case "invoice.paid": {
                const invoice = event.data.object;
                // Ignora la prima fattura del checkout poiché gestita da checkout.session.completed
                if (invoice.billing_reason === "subscription_create") {
                    break;
                }

                const customerId = invoice.customer;
                const customerEmail = invoice.customer_email;
                const userId = await findUserIdByCustomer(customerId, customerEmail);

                if (!userId) {
                    console.warn("⚠️ invoice.paid: Nessun utente Hub trovato per customer:", customerId);
                    break;
                }

                let newExpiresAt = null;
                if (invoice.lines && invoice.lines.data && invoice.lines.data[0] && invoice.lines.data[0].period) {
                    newExpiresAt = new Date(invoice.lines.data[0].period.end * 1000).toISOString();
                } else {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + 1);
                    newExpiresAt = d.toISOString();
                }

                const pricePaid = invoice.amount_paid ? invoice.amount_paid / 100 : 0;

                await db.collection("hub_users").doc(userId).set({
                    "subscription.status": "active",
                    "subscription.pricePaid": pricePaid,
                    "subscription.expiresAt": newExpiresAt,
                    "subscription.lastRenewalAt": new Date().toISOString(),
                    "subscription.lastEvent": event.type,
                    "subscription.lastEventAt": new Date().toISOString()
                }, { merge: true });

                // Registra transazione di rinnovo
                await db.collection("hub_transactions").doc(invoice.id).set({
                    userId: userId,
                    amount: pricePaid,
                    currency: (invoice.currency || "eur").toUpperCase(),
                    stripeInvoiceId: invoice.id,
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: invoice.subscription || null,
                    createdAt: new Date().toISOString(),
                    type: "annual_renewal"
                }, { merge: true });

                console.log(`🎉 Rinnovo annuale riuscito per utente ${userId}. Nuova scadenza: ${newExpiresAt}`);
                break;
            }

            // =========================================================================
            // 3. MANCATO PAGAMENTO / RINNOVO FALLITO (INVOICE.PAYMENT_FAILED)
            // =========================================================================
            case "invoice.payment_failed": {
                const invoice = event.data.object;
                const customerId = invoice.customer;
                const userId = await findUserIdByCustomer(customerId, invoice.customer_email);

                if (userId) {
                    await db.collection("hub_users").doc(userId).set({
                        "subscription.status": "past_due",
                        "subscription.lastEvent": event.type,
                        "subscription.lastEventAt": new Date().toISOString()
                    }, { merge: true });

                    console.warn(`⚠️ Pagamento fallito per utente ${userId}. Stato abbonamento impostato su 'past_due'`);
                }
                break;
            }

            // =========================================================================
            // 4. VARIAZIONE STATO ABBONAMENTO (CUSTOMER.SUBSCRIPTION.UPDATED)
            // =========================================================================
            case "customer.subscription.updated": {
                const sub = event.data.object;
                const customerId = sub.customer;
                const userId = await findUserIdByCustomer(customerId, null);

                if (userId) {
                    const priceId = sub.items && sub.items.data[0] ? sub.items.data[0].price.id : null;
                    const planId = await resolvePlanIdFromStripe(priceId, sub.metadata);
                    const expiresAt = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

                    const statusMapping = {
                        "active": "active",
                        "past_due": "past_due",
                        "unpaid": "unpaid",
                        "canceled": "canceled",
                        "incomplete": "incomplete"
                    };

                    const finalStatus = statusMapping[sub.status] || sub.status;

                    await db.collection("hub_users").doc(userId).set({
                        abbonamento: finalStatus === "active" ? planId : "base",
                        "subscription.status": finalStatus,
                        "subscription.plan": planId,
                        "subscription.expiresAt": expiresAt,
                        "subscription.cancelAtPeriodEnd": !!sub.cancel_at_period_end,
                        "subscription.lastEvent": event.type,
                        "subscription.lastEventAt": new Date().toISOString()
                    }, { merge: true });

                    console.log(`🔄 Subscription aggiornata per utente ${userId}: status ${finalStatus}, plan ${planId}`);
                }
                break;
            }

            // =========================================================================
            // 5. CESSAZIONE DEFINITIVA ABBONAMENTO (CUSTOMER.SUBSCRIPTION.DELETED)
            // =========================================================================
            case "customer.subscription.deleted": {
                const sub = event.data.object;
                const customerId = sub.customer;
                const userId = await findUserIdByCustomer(customerId, null);

                if (userId) {
                    await db.collection("hub_users").doc(userId).set({
                        abbonamento: "base",
                        "subscription.status": "canceled",
                        "subscription.canceledAt": new Date().toISOString(),
                        "subscription.lastEvent": event.type,
                        "subscription.lastEventAt": new Date().toISOString()
                    }, { merge: true });

                    console.log(`🛑 Abbonamento revocato per utente ${userId}. Riportato al Piano Base.`);
                }
                break;
            }

            default:
                console.log(`ℹ️ Evento ${event.type} non richiede azioni specifiche.`);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error("❌ Errore elaborazione evento webhook Stripe:", error);
        return res.status(500).json({ error: "Errore interno elaborazione webhook" });
    }
});

// ============================================================================
// BREVO INTEGRATION — SINCRONIZZAZIONE AUTOMATICA, WEBHOOK & EMAIL TRANSAZIONALI
// ============================================================================

const brevoApiKey = process.env.BREVO_API_KEY || (functions.config().brevo && functions.config().brevo.api_key);

/**
 * Funzione helper per effettuare chiamate sicure alle API REST di Brevo (v3)
 */
async function callBrevoApi(endpoint, method, payload) {
    if (!brevoApiKey || brevoApiKey === "dummy_brevo_key") {
        console.warn(`[Brevo API Mock] Chiamata a ${endpoint} non eseguita: API Key Brevo non configurata.`);
        return { success: false, reason: "BREVO_API_KEY_NOT_SET" };
    }

    try {
        const response = await fetch(`https://api.brevo.com/v3${endpoint}`, {
            method: method,
            headers: {
                "api-key": brevoApiKey,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: payload ? JSON.stringify(payload) : undefined
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.error(`❌ Errore risposta Brevo API (${response.status}) su ${endpoint}:`, data);
            return { success: false, status: response.status, error: data };
        }
        return { success: true, data: data };
    } catch (err) {
        console.error(`❌ Errore chiamata Brevo API su ${endpoint}:`, err);
        return { success: false, error: err.message };
    }
}

/**
 * 1. Cloud Function Trigger: Sincronizzazione automatica Hub -> Brevo su modifica hub_users
 * Quando cambia un utente (o il suo consenso newsletter / piano / ruolo), aggiorna il contatto su Brevo
 */
exports.syncHubUserToBrevo = functions.firestore
    .document("hub_users/{userId}")
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        const afterData = change.after.exists ? change.after.data() : null;
        const beforeData = change.before.exists ? change.before.data() : null;

        // Se l'utente è stato eliminato dall'Hub
        if (!afterData) {
            if (beforeData && beforeData.email) {
                console.log(`🗑️ Utente eliminato dall'Hub: ${beforeData.email}. Disiscrizione da Brevo...`);
                await callBrevoApi(`/contacts/${encodeURIComponent(beforeData.email.toLowerCase().trim())}`, "DELETE", null);
            }
            return null;
        }

        const email = (afterData.email || "").toLowerCase().trim();
        if (!email || !email.includes("@")) {
            return null;
        }

        // Verifica se ci sono state modifiche rilevanti
        const nome = (afterData.anagrafica && afterData.anagrafica.nome) || afterData.nome || "";
        const cognome = (afterData.anagrafica && afterData.anagrafica.cognome) || afterData.cognome || "";
        const ruolo = afterData.role || afterData.ruolo || "studente";
        const piano = afterData.abbonamento || afterData.subscription || "base";
        const hasNewsletterConsent = afterData.newsletter === true || (afterData.consents && afterData.consents.newsletter === true);
        const scadenza = afterData.abbonamento_scadenza || (afterData.subscription && afterData.subscription.expiresAt) || "";

        // Piattaforme attive come stringa per segmentazione
        const activePlatforms = [];
        if (afterData.platforms) {
            for (const [pKey, pVal] of Object.entries(afterData.platforms)) {
                if (pVal && pVal.enabled) activePlatforms.push(pKey);
            }
        }

        const attributes = {
            FIRSTNAME: nome,
            LASTNAME: cognome,
            RUOLO: ruolo,
            PIANO: typeof piano === "string" ? piano : (piano.planId || "base"),
            GIOCHI: activePlatforms.join(", "),
            CONSENSO_NEWSLETTER: hasNewsletterConsent,
            SCADENZA: scadenza
        };

        const brevoListId = process.env.BREVO_LIST_ID || (functions.config().brevo && functions.config().brevo.list_id);

        const contactPayload = {
            email: email,
            attributes: attributes,
            updateEnabled: true
        };

        if (brevoListId) {
            const listIdNum = parseInt(brevoListId, 10);
            if (hasNewsletterConsent) {
                contactPayload.listIds = [listIdNum];
            } else {
                contactPayload.unlinkListIds = [listIdNum];
            }
        }

        console.log(`🔄 Sincronizzazione automatica contatto con Brevo per ${email}:`, attributes);

        // Chiamata POST per creare o aggiornare (updateEnabled: true fa upsert automatico su Brevo)
        const result = await callBrevoApi("/contacts", "POST", contactPayload);

        // Se il contatto esiste già con status 400 (duplicate), aggiorna con PUT
        if (!result.success && result.status === 400) {
            const putPayload = { attributes: attributes };
            if (brevoListId) {
                const listIdNum = parseInt(brevoListId, 10);
                if (hasNewsletterConsent) putPayload.listIds = [listIdNum];
                else putPayload.unlinkListIds = [listIdNum];
            }
            await callBrevoApi(`/contacts/${encodeURIComponent(email)}`, "PUT", putPayload);
        }

        return null;
    });

/**
 * 2. Webhook Brevo -> Hub: Riceve notifiche di disiscrizione da Brevo
 * Endpoint: POST /brevoWebhook
 * Quando un utente clicca 'Disiscriviti' in calce a una newsletter Brevo,
 * aggiorna ESCLUSIVAMENTE newsletter = false su hub_users (senza toccare account, piano o accessi).
 */
exports.brevoWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    try {
        const payload = req.body || {};
        console.log("📬 Evento Webhook Brevo ricevuto:", JSON.stringify(payload));

        const eventType = (payload.event || "").toLowerCase();
        const targetEmail = (payload.email || "").toLowerCase().trim();

        // Eventi di disiscrizione: unsubscribe, unsubscribed, list_unsubscription, spam, complaint
        if (targetEmail && (eventType.includes("unsub") || eventType.includes("spam") || eventType.includes("complaint"))) {
            console.log(`⚠️ Disiscrizione Newsletter richiesta da Brevo per email: ${targetEmail}`);

            const snap = await db.collection("hub_users")
                .where("email", "==", targetEmail)
                .limit(1)
                .get();

            if (!snap.empty) {
                const userDoc = snap.docs[0];
                await userDoc.ref.set({
                    newsletter: false,
                    "consents.newsletter": false,
                    "consents.unsubscribedAt": new Date().toISOString(),
                    "consents.unsubscribeSource": "brevo_webhook"
                }, { merge: true });

                console.log(`✅ Consenso newsletter rimosso con successo per utente ${userDoc.id} (${targetEmail}). Account e Piano rimangono intatti.`);
            } else {
                console.warn(`Utente ${targetEmail} non trovato in hub_users.`);
            }
        }

        return res.status(200).json({ received: true });
    } catch (err) {
        console.error("❌ Errore elaborazione webhook Brevo:", err);
        return res.status(500).json({ error: err.message });
    }
});

/**
 * 3. Helper / Endpoint per invio Email Transazionali tramite Brevo API (v3)
 */
exports.sendBrevoTransactional = functions.https.onCall(async (data, context) => {
    // Verifica autenticazione
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Richiesta non autorizzata.");
    }

    const { toEmail, toName, templateId, params, subject, htmlContent } = data;

    if (!toEmail || !toEmail.includes("@")) {
        throw new functions.https.HttpsError("invalid-argument", "Indirizzo email destinatario non valido.");
    }

    const emailPayload = {
        to: [{ email: toEmail.toLowerCase().trim(), name: toName || "" }]
    };

    if (templateId) {
        emailPayload.templateId = parseInt(templateId, 10);
    }
    if (params) {
        emailPayload.params = params;
    }
    if (subject) {
        emailPayload.subject = subject;
    }
    if (htmlContent) {
        emailPayload.htmlContent = htmlContent;
    }

    console.log(`📤 Invio email transazionale Brevo a ${toEmail} (Template: ${templateId || 'custom'})`);
    const result = await callBrevoApi("/smtp/email", "POST", emailPayload);

    if (!result.success) {
        throw new functions.https.HttpsError("internal", "Errore invio tramite Brevo: " + JSON.stringify(result.error));
    }

    return { success: true, messageId: result.data ? result.data.messageId : null };
});

