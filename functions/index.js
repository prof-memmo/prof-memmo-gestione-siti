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
                const refundId = (charge.refunds && charge.refunds.data && charge.refunds.data[0]) ? charge.refunds.data[0].id : charge.id + "_refund";

                // Se rimborso totale, revoca abbonamento in hub_users
                if (userId && isFullRefund) {
                    await db.collection("hub_users").doc(userId).set({
                        abbonamento: "base",
                        "subscription.status": "refunded",
                        "subscription.refundedAt": new Date().toISOString(),
                        "subscription.lastEvent": event.type,
                        "subscription.lastEventAt": new Date().toISOString()
                    }, { merge: true });
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
                    refundAmount: amountRefunded,
                    refundDate: new Date().toISOString(),
                    stripeChargeId: charge.id,
                    stripePaymentIntentId: charge.payment_intent || null,
                    stripeCustomerId: customerId || null,
                    receiptUrl: charge.receipt_url || null,
                    createdAt: new Date().toISOString()
                }, { merge: true });

                console.log(`↩️ Rimborso ${refundStatus} registrato (€${amountRefunded}) per cliente ${customerEmail || customerId}`);
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
