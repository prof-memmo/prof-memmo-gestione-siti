// functions/index.js
// Cloud Function: Webhook Stripe Server-Side per Hub Centrale Prof. Memmo
// Gestisce il ciclo di vita completo degli abbonamenti ricorrenti annuali.
// Fonte Unica di Verità: Stripe. Nessuna mutazione autorizzata dal client-side.

try { require("dotenv").config(); } catch (_) {}
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
exports.stripeWebhook = functions.runWith({
    maxInstances: 2,
    timeoutSeconds: 15,
    memory: "128MB",
    serviceAccount: "prof-memmo-hub@appspot.gserviceaccount.com"
}).https.onRequest(async (req, res) => {
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
                const discountAmount = session.total_details && session.total_details.amount_discount ? session.total_details.amount_discount / 100 : 0;
                const promoApplied = discountAmount > 0 ? "Coupon/Promo applicato" : null;
                const customerName = session.customer_details ? session.customer_details.name : null;

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

                // Registra la transazione nel Registro Pagamenti
                await db.collection("hub_transactions").doc(session.id).set({
                    userId: finalUserId,
                    customerEmail: customerEmail,
                    customerName: customerName,
                    planId: planId,
                    amount: pricePaid,
                    currency: currency,
                    status: "completato",
                    type: "primo_acquisto",
                    stripeSessionId: session.id,
                    stripeCustomerId: session.customer || null,
                    stripeSubscriptionId: session.subscription || null,
                    stripePaymentIntentId: session.payment_intent || null,
                    stripeInvoiceId: session.invoice || null,
                    discountCode: promoApplied,
                    discountAmount: discountAmount,
                    periodStart: new Date().toISOString(),
                    periodEnd: expiresAt,
                    createdAt: new Date().toISOString()
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
                const customerName = invoice.customer_name;
                const userId = await findUserIdByCustomer(customerId, customerEmail);

                if (!userId) {
                    console.warn("⚠️ invoice.paid: Nessun utente Hub trovato per customer:", customerId);
                    break;
                }

                let newExpiresAt = null;
                let periodStart = null;
                if (invoice.lines && invoice.lines.data && invoice.lines.data[0] && invoice.lines.data[0].period) {
                    periodStart = new Date(invoice.lines.data[0].period.start * 1000).toISOString();
                    newExpiresAt = new Date(invoice.lines.data[0].period.end * 1000).toISOString();
                } else {
                    const d = new Date();
                    periodStart = d.toISOString();
                    d.setFullYear(d.getFullYear() + 1);
                    newExpiresAt = d.toISOString();
                }

                const pricePaid = invoice.amount_paid ? invoice.amount_paid / 100 : 0;
                const linePriceId = invoice.lines && invoice.lines.data && invoice.lines.data[0] ? invoice.lines.data[0].price.id : null;
                const planId = await resolvePlanIdFromStripe(linePriceId, invoice.metadata);

                await db.collection("hub_users").doc(userId).set({
                    abbonamento: planId,
                    "subscription.status": "active",
                    "subscription.plan": planId,
                    "subscription.pricePaid": pricePaid,
                    "subscription.expiresAt": newExpiresAt,
                    "subscription.lastRenewalAt": new Date().toISOString(),
                    "subscription.lastEvent": event.type,
                    "subscription.lastEventAt": new Date().toISOString()
                }, { merge: true });

                // Registra transazione di rinnovo nel Registro Pagamenti
                await db.collection("hub_transactions").doc(invoice.id).set({
                    userId: userId,
                    customerEmail: customerEmail,
                    customerName: customerName,
                    planId: planId,
                    amount: pricePaid,
                    currency: (invoice.currency || "eur").toUpperCase(),
                    status: "completato",
                    type: "rinnovo_annuale",
                    stripeInvoiceId: invoice.id,
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: invoice.subscription || null,
                    stripePaymentIntentId: invoice.payment_intent || null,
                    invoicePdfUrl: invoice.invoice_pdf || null,
                    hostedInvoiceUrl: invoice.hosted_invoice_url || null,
                    periodStart: periodStart,
                    periodEnd: newExpiresAt,
                    createdAt: new Date().toISOString()
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
                const customerEmail = invoice.customer_email;
                const customerName = invoice.customer_name;
                const userId = await findUserIdByCustomer(customerId, customerEmail);

                if (userId) {
                    await db.collection("hub_users").doc(userId).set({
                        "subscription.status": "past_due",
                        "subscription.lastEvent": event.type,
                        "subscription.lastEventAt": new Date().toISOString()
                    }, { merge: true });

                    console.warn(`⚠️ Pagamento fallito per utente ${userId}. Stato abbonamento impostato su 'past_due'`);
                }

                // Registra il tentativo fallito in hub_transactions
                const amountFailed = invoice.amount_due ? invoice.amount_due / 100 : 0;
                await db.collection("hub_transactions").doc(invoice.id).set({
                    userId: userId || null,
                    customerEmail: customerEmail || null,
                    customerName: customerName || null,
                    amount: amountFailed,
                    currency: (invoice.currency || "eur").toUpperCase(),
                    status: "fallito",
                    type: "pagamento_fallito",
                    stripeInvoiceId: invoice.id,
                    stripeCustomerId: customerId || null,
                    stripeSubscriptionId: invoice.subscription || null,
                    stripePaymentIntentId: invoice.payment_intent || null,
                    failureReason: (invoice.last_payment_error && invoice.last_payment_error.message) ? invoice.last_payment_error.message : "Transazione non riuscita / fondi insufficienti",
                    createdAt: new Date().toISOString()
                }, { merge: true });

                break;
            }

            // =========================================================================
            // 3b. GESTIONE RIMBORSI TOTALI E PARZIALI (CHARGE.REFUNDED)
            // =========================================================================
            case "charge.refunded": {
                const charge = event.data.object;
                const customerId = charge.customer;
                const customerEmail = charge.billing_details ? charge.billing_details.email : null;
                const customerName = charge.billing_details ? charge.billing_details.name : null;
                const userId = await findUserIdByCustomer(customerId, customerEmail);

                const amountRefunded = charge.amount_refunded ? charge.amount_refunded / 100 : 0;
                const totalCharged = charge.amount ? charge.amount / 100 : 0;
                const isFullRefund = charge.refunded === true || amountRefunded >= totalCharged;
                const refundStatus = isFullRefund ? "rimborsato" : "rimborsato_parziale";
                const refundType = isFullRefund ? "totale" : "parziale";
                
                const latestRefund = (charge.refunds && charge.refunds.data && charge.refunds.data[0]) ? charge.refunds.data[0] : null;
                const refundId = latestRefund ? latestRefund.id : charge.id + "_refund";
                
                // Estrazione motivazione amministrativa del rimborso (se presente in Stripe metadata o reason, altrimenti fallback)
                let rawReason = (latestRefund && (latestRefund.metadata?.refundReason || latestRefund.reason)) || charge.metadata?.refundReason || null;
                let refundReason = "non_specificato";
                if (rawReason) {
                    const rLower = String(rawReason).toLowerCase();
                    if (rLower.includes("recesso")) refundReason = "recesso";
                    else if (rLower.includes("commerciale") || rLower.includes("customer")) refundReason = "commerciale";
                    else if (rLower.includes("errore") || rLower.includes("anomalia") || rLower.includes("duplicate")) refundReason = "errore_anomalia";
                    else refundReason = rawReason;
                }

                const refundDate = latestRefund && latestRefund.created ? new Date(latestRefund.created * 1000).toISOString() : new Date().toISOString();

                // Se rimborso totale, revoca abbonamento in hub_users e garantisce cancellazione subscription su Stripe
                if (isFullRefund) {
                    if (userId) {
                        await db.collection("hub_users").doc(userId).set({
                            abbonamento: "base",
                            "subscription.status": "refunded",
                            "subscription.refundedAt": refundDate,
                            "subscription.refundReason": refundReason,
                            "subscription.lastEvent": event.type,
                            "subscription.lastEventAt": new Date().toISOString()
                        }, { merge: true });
                    }

                    // Safeguard idempotente: garantisce cancellazione subscription su Stripe
                    let subToCancel = charge.subscription;
                    if (!subToCancel && charge.invoice) {
                        try {
                            const inv = await stripe.invoices.retrieve(charge.invoice);
                            subToCancel = inv.subscription;
                        } catch (e) {
                            // ignore
                        }
                    }
                    if (!subToCancel && userId) {
                        const userSnap = await db.collection("hub_users").doc(userId).get();
                        if (userSnap.exists) {
                            subToCancel = userSnap.data() && userSnap.data().subscription ? userSnap.data().subscription.stripeSubscriptionId : null;
                        }
                    }
                    if (subToCancel) {
                        try {
                            await stripe.subscriptions.cancel(subToCancel, { prorate: false });
                            console.log(`🛑 Subscription ${subToCancel} cancellata con successo a seguito di rimborso totale.`);
                        } catch (cancelErr) {
                            if (cancelErr.code !== 'resource_missing' && !String(cancelErr.message).includes('canceled')) {
                                console.warn(`Avviso cancellazione subscription ${subToCancel}:`, cancelErr.message);
                            }
                        }
                    }
                }

                // Registra evento di rimborso nel Registro Pagamenti
                await db.collection("hub_transactions").doc(refundId).set({
                    userId: userId || null,
                    customerEmail: customerEmail,
                    customerName: customerName,
                    amount: -amountRefunded,
                    currency: (charge.currency || "eur").toUpperCase(),
                    status: refundStatus,
                    type: "rimborso",
                    refundType: refundType,
                    refundReason: refundReason,
                    refundAmount: amountRefunded,
                    refundDate: refundDate,
                    stripeChargeId: charge.id,
                    stripePaymentIntentId: charge.payment_intent || null,
                    stripeCustomerId: customerId || null,
                    receiptUrl: charge.receipt_url || null,
                    createdAt: new Date().toISOString()
                }, { merge: true });

                console.log(`↩️ Rimborso ${refundType} (${refundReason}) registrato (€${amountRefunded}) per cliente ${customerEmail || customerId}`);
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

/**
 * Cloud Function Callable: Richiesta Rimborso Self-Service entro 14 giorni
 * Verifica server-side: autenticazione, eleggibilità temporale (14gg), status pagato,
 * idempotency key, rimborso su Stripe e cancellazione subscription.
 */
exports.requestSubscriptionRefund = functions.runWith({
    maxInstances: 2,
    timeoutSeconds: 15,
    memory: "128MB",
    serviceAccount: "prof-memmo-hub@appspot.gserviceaccount.com"
}).https.onCall(async (data, context) => {
    // 1. Verifica autenticazione utente
    if (!context.auth || !context.auth.uid) {
        throw new functions.https.HttpsError("unauthenticated", "Devi effettuare il login per richiedere un rimborso.");
    }

    const userId = context.auth.uid;

    // 2. Lettura profilo utente da Firestore
    const userDoc = await db.collection("hub_users").doc(userId).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Profilo utente non trovato.");
    }

    const userData = userDoc.data() || {};
    const subData = userData.subscription || {};

    const stripeSubscriptionId = subData.stripeSubscriptionId;
    if (!stripeSubscriptionId) {
        throw new functions.https.HttpsError("failed-precondition", "Nessun abbonamento Stripe attivo associato a questo account.");
    }

    if (subData.status === "refunded") {
        throw new functions.https.HttpsError("already-exists", "Questo abbonamento è già stato rimborsato.");
    }

    // 3. Recupero dell'ultima fattura effettivamente PAGATA per la subscription
    let paidInvoices;
    try {
        paidInvoices = await stripe.invoices.list({
            subscription: stripeSubscriptionId,
            status: "paid",
            limit: 1,
            expand: ["data.payment_intent"]
        });
    } catch (e) {
        console.error("Errore recupero fatture pagate da Stripe:", e);
        throw new functions.https.HttpsError("internal", "Impossibile verificare lo storico pagamenti con Stripe.");
    }

    if (!paidInvoices || !paidInvoices.data || paidInvoices.data.length === 0) {
        throw new functions.https.HttpsError("failed-precondition", "Nessuna fattura pagata trovata per questo abbonamento.");
    }

    const latestPaidInvoice = paidInvoices.data[0];
    const paymentIntent = latestPaidInvoice.payment_intent;
    if (!paymentIntent || paymentIntent.status !== "succeeded") {
        throw new functions.https.HttpsError("failed-precondition", "Nessun pagamento valido trovato per il rimborso.");
    }

    if (paymentIntent.amount_refunded > 0) {
        throw new functions.https.HttpsError("already-exists", "La transazione è già stata rimborsata.");
    }

    // 4. Verifica Server-Side finestra 14 giorni (calcolata rigorosamente sull'ultima fattura pagata)
    const paidTimestamp = (latestPaidInvoice.status_transitions && latestPaidInvoice.status_transitions.paid_at)
        ? (latestPaidInvoice.status_transitions.paid_at * 1000)
        : (latestPaidInvoice.created * 1000);
    const now = Date.now();
    const windowMs = 14 * 24 * 60 * 60 * 1000;

    if (now - paidTimestamp > windowMs) {
        throw new functions.https.HttpsError("deadline-exceeded", "Il termine di 14 giorni per richiedere il rimborso è scaduto.");
    }

    // 5. Creazione Rimborso su Stripe con Idempotency Key
    let refund;
    try {
        refund = await stripe.refunds.create({
            payment_intent: paymentIntent.id,
            reason: "requested_by_customer",
            metadata: {
                refundReason: "recesso",
                userId: userId,
                userEmail: context.auth.token.email || userData.email || ""
            }
        }, {
            idempotencyKey: `refund_self_service_${paymentIntent.id}`
        });
    } catch (e) {
        console.error("Errore creazione rimborso su Stripe:", e);
        throw new functions.https.HttpsError("internal", "Errore durante l'elaborazione del rimborso con Stripe.");
    }

    // 6. Cancellazione immediata della subscription su Stripe per impedire rinnovi futuri
    try {
        await stripe.subscriptions.cancel(stripeSubscriptionId, {
            prorate: false
        });
    } catch (e) {
        console.warn("Avviso cancellazione subscription su Stripe dopo rimborso:", e);
    }

    console.log(`✅ Rimborso self-service eseguito con successo per utente ${userId} (Refund ID: ${refund.id})`);

    return {
        success: true,
        refundId: refund.id,
        amountRefunded: refund.amount / 100,
        currency: (refund.currency || "eur").toUpperCase(),
        message: "Richiesta di rimborso completata con successo. L'importo verrà restituito sul metodo di pagamento originario entro i tempi tecnici bancari (5-10 giorni lavorativi)."
    };
});

// ============================================================================
// MODULO BREVO: Sincronizzazione Bidirezionale Newsletter (Lista ID 3)
// ============================================================================

/**
 * Recupera configurazione Brevo da variabili d'ambiente o firebase config
 */
function getBrevoConfig() {
    const apiKey = process.env.BREVO_API_KEY || (functions.config().brevo && functions.config().brevo.key) || "";
    const listIdRaw = process.env.BREVO_LIST_ID || (functions.config().brevo && functions.config().brevo.list_id) || "3";
    const listId = parseInt(listIdRaw, 10) || 3;
    return { apiKey, listId };
}

/**
 * Normalizza il nome del piano per gli attributi di Brevo
 */
function getNormalizedPlanLabel(userData) {
    if (!userData) return "Piano Base";
    const p = String(userData.abbonamento || userData.subscription?.status || userData.piano || userData.plan || "base").toLowerCase().trim();
    if (p.includes("ecosistema") || p.includes("completo")) return "Ecosistema Completo";
    if (p.includes("didattico")) return "Docente Didattico";
    if (p.includes("viandante")) return "Viandante";
    return "Piano Base";
}

/**
 * Normalizza il ruolo per gli attributi di Brevo
 */
function getNormalizedRole(userData) {
    if (!userData) return "Viandante";
    const r = String(userData.ruolo || userData.role || "").toLowerCase().trim();
    if (r.includes("docente") || r.includes("prof")) return "Docente";
    if (r.includes("student")) return "Studente";
    if (r.includes("admin")) return "Amministratore";
    return "Viandante";
}

/**
 * Esegue una chiamata REST autenticata alle API v3 di Brevo
 */
async function callBrevoApi(endpoint, method = "GET", body = null) {
    const { apiKey } = getBrevoConfig();
    if (!apiKey || apiKey.includes("dummy")) {
        console.warn("⚠️ Brevo API Key non configurata o fittizia.");
        return { ok: false, status: 400, data: { message: "Brevo API Key non configurata" } };
    }

    const url = `https://api.brevo.com/v3${endpoint}`;
    const headers = {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json"
    };

    const options = {
        method: method,
        headers: headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        let resData = null;
        try {
            resData = await response.json();
        } catch (jsonErr) {
            resData = null;
        }

        return {
            ok: response.ok,
            status: response.status,
            data: resData
        };
    } catch (err) {
        console.error(`Errore chiamata Brevo API [${method} ${endpoint}]:`, err);
        return { ok: false, status: 500, error: err.message };
    }
}

/**
 * Aggiunge o aggiorna un singolo contatto su Brevo (Lista ID 3) con i suoi attributi
 */
async function upsertBrevoContact(userData, listId) {
    const email = (userData.email || "").toLowerCase().trim();
    if (!email || !email.includes("@")) return { ok: false, reason: "Email non valida" };

    const payload = {
        email: email,
        attributes: {
            NOME: (userData.nome || "").trim(),
            COGNOME: (userData.cognome || "").trim(),
            RUOLO: getNormalizedRole(userData),
            PIANO: getNormalizedPlanLabel(userData)
        },
        listIds: [listId],
        updateEnabled: true
    };

    return await callBrevoApi("/contacts", "POST", payload);
}

/**
 * Rimuove un contatto dalla Lista di Brevo
 */
async function removeBrevoContactFromList(email, listId) {
    if (!email || !email.includes("@")) return { ok: false, reason: "Email non valida" };
    const cleanEmail = email.toLowerCase().trim();

    // Rimuove l'utente dalla lista specifica
    return await callBrevoApi(`/contacts/lists/${listId}/contacts/remove`, "POST", {
        emails: [cleanEmail]
    });
}

/**
 * 1. TRIGGER REALTIME FIRESTORE: onUserWriteSyncBrevo
 * Scatta in automatico ad ogni creazione o modifica di un utente in hub_users.
 * Sincronizza lo stato newsletter istantaneamente su Brevo a zero click.
 */
exports.onUserWriteSyncBrevo = functions.runWith({
    maxInstances: 5,
    timeoutSeconds: 15,
    memory: "128MB"
}).firestore.document("hub_users/{userId}").onWrite(async (change, context) => {
    const { apiKey, listId } = getBrevoConfig();
    if (!apiKey) {
        console.warn("⚠️ onUserWriteSyncBrevo: Brevo API Key non impostata.");
        return null;
    }

    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;

    // Se l'utente è stato cancellato da Firestore
    if (!afterData) {
        if (beforeData && beforeData.email) {
            console.log(`🗑️ Utente eliminato da Firestore, rimozione da Brevo Lista ${listId}: ${beforeData.email}`);
            await removeBrevoContactFromList(beforeData.email, listId);
        }
        return null;
    }

    const email = (afterData.email || "").toLowerCase().trim();
    if (!email || !email.includes("@")) return null;

    const hasConsentAfter = afterData.newsletter === true || (afterData.consents && afterData.consents.newsletter === true);
    const hasConsentBefore = beforeData ? (beforeData.newsletter === true || (beforeData.consents && beforeData.consents.newsletter === true)) : false;

    // Controllo idempotenza: evitiamo chiamate inutili se i dati newsletter e anagrafici sono identici
    if (beforeData) {
        const emailBefore = (beforeData.email || "").toLowerCase().trim();
        const roleBefore = getNormalizedRole(beforeData);
        const roleAfter = getNormalizedRole(afterData);
        const planBefore = getNormalizedPlanLabel(beforeData);
        const planAfter = getNormalizedPlanLabel(afterData);
        const nomeBefore = (beforeData.nome || "").trim();
        const nomeAfter = (afterData.nome || "").trim();
        const cognomeBefore = (beforeData.cognome || "").trim();
        const cognomeAfter = (afterData.cognome || "").trim();

        const isUnchanged = (hasConsentBefore === hasConsentAfter) &&
            (emailBefore === email) &&
            (roleBefore === roleAfter) &&
            (planBefore === planAfter) &&
            (nomeBefore === nomeAfter) &&
            (cognomeBefore === cognomeAfter);

        if (isUnchanged) {
            return null; // Nessuna variazione rilevante
        }
    }

    try {
        if (hasConsentAfter) {
            console.log(`✉️ Sincronizzazione automatica su Brevo (Iscritto): ${email}`);
            await upsertBrevoContact(afterData, listId);
        } else {
            console.log(`🚫 Sincronizzazione automatica su Brevo (Non iscritto o revocato): ${email}`);
            await removeBrevoContactFromList(email, listId);
        }
    } catch (e) {
        console.error(`Errore sincronizzazione automatica Brevo per ${email}:`, e);
    }

    return null;
});

/**
 * 2. CALLABLE FUNCTION: syncAllBrevoContacts
 * Esegue la sincronizzazione massiva di tutti gli utenti presenti in hub_users.
 * Utilizzabile dall'Hub Admin tramite il pulsante "Sincronizza Tutto".
 */
exports.syncAllBrevoContacts = functions.runWith({
    maxInstances: 2,
    timeoutSeconds: 120,
    memory: "256MB"
}).https.onCall(async (data, context) => {
    // 1. Verifica autenticazione
    if (!context.auth || !context.auth.uid) {
        throw new functions.https.HttpsError("unauthenticated", "È necessario essere autenticati.");
    }

    const callerEmail = (context.auth.token.email || "").toLowerCase().trim();
    const isSuperAdmin = (callerEmail === "prof.memmo@gmail.com");

    // Verifica ruolo Admin se non è la mail superadmin
    if (!isSuperAdmin) {
        const callerDoc = await db.collection("hub_users").doc(context.auth.uid).get();
        const callerData = callerDoc.exists ? callerDoc.data() : {};
        const callerRole = String(callerData.ruolo || callerData.role || "").toLowerCase();
        if (!callerRole.includes("admin")) {
            throw new functions.https.HttpsError("permission-denied", "Operazione riservata agli amministratori.");
        }
    }

    const { apiKey, listId } = getBrevoConfig();
    if (!apiKey) {
        throw new functions.https.HttpsError("failed-precondition", "Chiave API Brevo non configurata.");
    }

    console.log(`🔄 Avvio sincronizzazione massiva contatti con Brevo (Lista ID: ${listId}) da parte di ${callerEmail}`);

    const snap = await db.collection("hub_users").get();
    let totalUsers = 0;
    let consentedCount = 0;
    let nonConsentedCount = 0;
    let errorCount = 0;

    const usersToSync = [];
    const emailsToRemove = [];

    snap.forEach(doc => {
        const u = doc.data();
        const email = (u.email || "").toLowerCase().trim();
        if (email && email.includes("@")) {
            totalUsers++;
            const hasConsent = (u.newsletter === true || (u.consents && u.consents.newsletter === true));
            if (hasConsent) {
                consentedCount++;
                usersToSync.push(u);
            } else {
                nonConsentedCount++;
                emailsToRemove.push(email);
            }
        }
    });

    // 1. Upsert contatti con consenso (processati in blocchi concorrenti)
    const BATCH_SIZE = 10;
    for (let i = 0; i < usersToSync.length; i += BATCH_SIZE) {
        const chunk = usersToSync.slice(i, i + BATCH_SIZE);
        await Promise.all(chunk.map(async (userData) => {
            try {
                const res = await upsertBrevoContact(userData, listId);
                if (!res.ok && res.status !== 200 && res.status !== 201 && res.status !== 204) {
                    console.warn(`Avviso upsert Brevo per ${userData.email}:`, res);
                }
            } catch (e) {
                console.error(`Errore batch sync Brevo per ${userData.email}:`, e);
                errorCount++;
            }
        }));
    }

    // 2. Rimozione contatti senza consenso dalla lista 3
    for (let i = 0; i < emailsToRemove.length; i += 20) {
        const emailChunk = emailsToRemove.slice(i, i + 20);
        await Promise.all(emailChunk.map(async (em) => {
            try {
                await removeBrevoContactFromList(em, listId);
            } catch (e) {
                // Non bloccante
            }
        }));
    }

    const syncMetadata = {
        lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSyncBy: callerEmail,
        listId: listId,
        totalEvaluated: totalUsers,
        consentedSynced: consentedCount,
        nonConsentedHandled: nonConsentedCount,
        errors: errorCount
    };

    // Salva le informazioni sull'ultimo allineamento in Firestore
    await db.collection("hub_settings").doc("newsletter_sync").set(syncMetadata, { merge: true });

    console.log(`✅ Sincronizzazione Brevo completata con successo: ${consentedCount} iscritti attivi allineati.`);

    return {
        success: true,
        listId: listId,
        totalUsers: totalUsers,
        consentedSynced: consentedCount,
        nonConsentedHandled: nonConsentedCount,
        errors: errorCount,
        syncedAt: new Date().toISOString()
    };
});

/**
 * 3. WEBHOOK ENDPOINT: brevoWebhook
 * Riceve gli eventi da Brevo (disiscrizioni tramite link email, bounce, eliminazioni).
 * Aggiorna Firestore istantaneamente garantendo la piena conformità GDPR.
 */
exports.brevoWebhook = functions.runWith({
    maxInstances: 5,
    timeoutSeconds: 15,
    memory: "128MB"
}).https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const payload = req.body || {};
    const eventType = String(payload.event || "").toLowerCase().trim();
    const rawEmail = payload.email || (payload["email_address"]) || "";
    const email = String(rawEmail).toLowerCase().trim();

    console.log(`📥 Ricevuto Brevo Webhook Event: [${eventType}] per email: [${email}]`);

    if (!email || !email.includes("@")) {
        return res.status(200).send("OK - No email provided");
    }

    // Eventi di disiscrizione o revoca
    const isUnsubscribeEvent = [
        "unsubscribe",
        "unsubscribed",
        "hard_bounce",
        "contact_deleted",
        "spam",
        "complaint"
    ].includes(eventType);

    if (isUnsubscribeEvent) {
        try {
            const usersSnap = await db.collection("hub_users")
                .where("email", "==", email)
                .get();

            if (usersSnap.empty) {
                console.log(`ℹ️ Brevo Webhook: Nessun utente Firestore trovato con email ${email}`);
                return res.status(200).send("OK - User not in Hub");
            }

            const batch = db.batch();
            usersSnap.forEach(docSnap => {
                const userRef = docSnap.ref;
                batch.set(userRef, {
                    newsletter: false,
                    "consents.newsletter": false,
                    "consents.lastActionAt": new Date().toISOString(),
                    "consents.unsubscribedFrom": `brevo_webhook_${eventType}`,
                    "consents.unsubscribedAt": new Date().toISOString()
                }, { merge: true });
            });

            await batch.commit();
            console.log(`✅ Brevo Webhook: Disiscrizione GDPR registrata per ${email} (${usersSnap.size} record aggiornati)`);
        } catch (e) {
            console.error(`Errore elaborazione Brevo Webhook per ${email}:`, e);
        }
    }

    return res.status(200).json({ received: true, event: eventType, email: email });
});

/**
 * 4. CLOUD FUNCTION: triggerReleaseAction
 * Riceve le chiamate autenticate dall'Hub Admin per unire 'preview' in 'main'
 * e distribuire la versione in produzione su GitHub Pages in totale sicurezza.
 */
exports.triggerReleaseAction = functions.runWith({
    maxInstances: 5,
    timeoutSeconds: 60,
    memory: "256MB"
}).https.onCall(async (data, context) => {
    try {
        let callerEmail = context.auth && context.auth.token && context.auth.token.email ? context.auth.token.email.toLowerCase() : "";
        
        if (!callerEmail && context.auth && context.auth.uid) {
            try {
                const userDoc = await db.collection("hub_users").doc(context.auth.uid).get();
                if (userDoc.exists && userDoc.data().email) {
                    callerEmail = userDoc.data().email.toLowerCase();
                }
            } catch (e) {
                console.warn("Impossibile recuperare email da UID:", e);
            }
        }

        if (callerEmail !== "prof.memmo@gmail.com") {
            throw new functions.https.HttpsError("permission-denied", "Operazione consentita esclusivamente a prof.memmo@gmail.com.");
        }

        const repo = data && data.repo ? String(data.repo).trim() : "";
        const siteId = data && data.siteId ? String(data.siteId).trim() : "";

        if (!repo) {
            throw new functions.https.HttpsError("invalid-argument", "Parametro 'repo' mancante.");
        }

        console.log(`🚀 [RELEASE] Richiesta pubblicazione per repository: ${repo} (da ${callerEmail})`);

        let githubToken = process.env.GITHUB_RELEASE_TOKEN;
        if (!githubToken) {
            try {
                if (functions.config().github && functions.config().github.token) {
                    githubToken = functions.config().github.token;
                }
            } catch (_) {}
        }
        if (!githubToken) {
            try {
                const ecoDoc = await db.collection("hub_settings").doc("ecosistema").get();
                if (ecoDoc.exists && ecoDoc.data().github_token) {
                    githubToken = ecoDoc.data().github_token;
                }
            } catch (_) {}
        }

        const targetRepos = (repo === "ALL" || repo === "all") 
            ? ["prof-memmo-gestione-siti", "games", "fantaletteratura", "la-rotta-degli-eroi", "la-corte-della-commedia", "palestra-di-riflessione"]
            : [repo];

        const results = [];

        if (githubToken) {
            for (const targetRepo of targetRepos) {
                try {
                    const response = await fetch(`https://api.github.com/repos/prof-memmo/${targetRepo}/merges`, {
                        method: "POST",
                        headers: {
                            "Authorization": `token ${githubToken}`,
                            "Accept": "application/vnd.github.v3+json",
                            "User-Agent": "ProfMemmoHub-ReleaseManager"
                        },
                        body: JSON.stringify({
                            base: "main",
                            head: "preview",
                            commit_message: `feat(release): pubblicazione automatica da Hub Admin [${targetRepo}]`
                        })
                    });

                    const resText = await response.text();
                    console.log(`📡 GitHub API Merge [${targetRepo}] status: ${response.status}`, resText);
                    results.push({ repo: targetRepo, status: response.status, ok: response.ok || response.status === 204 });
                } catch (apiErr) {
                    console.error(`Errore merge GitHub API per ${targetRepo}:`, apiErr);
                    results.push({ repo: targetRepo, status: 'error', error: apiErr.message });
                }
            }
        } else {
            console.warn("⚠️ GITHUB_RELEASE_TOKEN non trovato nell'ambiente.");
        }

        // Registra nello storico su Firestore
        try {
            await db.collection("hub_settings").doc("releases_history").set({
                lastRelease: {
                    repo: repo,
                    siteId: siteId || (repo === 'ALL' ? 'Tutto l\'Ecosistema' : repo),
                    timestamp: new Date().toISOString(),
                    author: callerEmail,
                    details: results
                }
            }, { merge: true });
        } catch(dbErr) {
            console.warn("Errore aggiornamento Firestore releases_history:", dbErr);
        }

        return {
            success: true,
            message: repo === 'ALL' ? 'Pubblicazione di tutti i siti dell\'Ecosistema completata!' : `Rilascio completato per ${repo}.`,
            details: results,
            timestamp: new Date().toISOString()
        };
    } catch (outerErr) {
        console.error("Errore fatale triggerReleaseAction:", outerErr);
        if (outerErr instanceof functions.https.HttpsError) {
            throw outerErr;
        }
        throw new functions.https.HttpsError("internal", outerErr.message || "Errore sconosciuto durante il rilascio.");
    }
});

