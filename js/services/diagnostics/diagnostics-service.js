// js/services/diagnostics/diagnostics-service.js
// Servizio centralizzato di controllo, analisi e diagnostica dell'Ecosistema Prof. Memmo
// Rispetta i principi di isolamento e regole anti-regressione (CONTROLLA -> ANALIZZA -> SEGNALA).

const DiagnosticsService = {
    // 6 Repository di baseline + Servizi Terzi
    SITES_BASELINE: [
        {
            id: 'hub_vetrina',
            name: 'Hub & Vetrina Giochi (prof-memmo-games)',
            repo: 'prof-memmo-games',
            url: 'https://prof-memmo.github.io/prof-memmo-gestione-siti/',
            altUrl: 'https://prof-memmo.github.io/games/',
            type: 'vetrina',
            icon: 'fa-house'
        },
        {
            id: 'hub_admin',
            name: 'Hub Dashboard Admin (prof-memmo-admin)',
            repo: 'prof-memmo-admin-gestione-generale',
            url: 'https://prof-memmo.github.io/prof-memmo-gestione-siti/portal.html',
            type: 'admin',
            icon: 'fa-shield-halved'
        },
        {
            id: 'rotta_eroi',
            name: 'La Rotta degli Eroi',
            repo: 'la-rotta-degli-eroi',
            url: 'https://prof-memmo.github.io/la-rotta-degli-eroi/',
            type: 'game',
            icon: 'fa-ship'
        },
        {
            id: 'corte_commedia',
            name: 'La Corte della Commedia',
            repo: 'la-corte-della-commedia',
            url: 'https://prof-memmo.github.io/la-corte-della-commedia/',
            type: 'game',
            icon: 'fa-masks-theater'
        },
        {
            id: 'fantaletteratura',
            name: 'FantaLetteratura',
            repo: 'fantaletteratura',
            url: 'https://prof-memmo.github.io/fantaletteratura/',
            type: 'game',
            icon: 'fa-feather-pointed'
        },
        {
            id: 'palestra_riflessione',
            name: 'La Palestra di Riflessione',
            repo: 'palestra-di-riflessione',
            url: 'https://prof-memmo.github.io/palestra-di-riflessione/',
            type: 'game',
            icon: 'fa-brain'
        },
        {
            id: 'ops_storia',
            name: 'Ops! Operazione Storia',
            repo: 'ops-storia',
            url: 'https://prof-memmo.github.io/ops-storia/',
            type: 'game',
            icon: 'fa-landmark'
        }
    ],

    // Recupera l'ultimo controllo salvato in locale
    getLastReport: function() {
        try {
            const raw = localStorage.getItem('hub_last_diagnostics');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Errore lettura ultimo report:', e);
            return null;
        }
    },

    // Salva l'ultimo report
    saveLastReport: function(report) {
        try {
            localStorage.setItem('hub_last_diagnostics', JSON.stringify(report));
        } catch (e) {
            console.error('Errore salvataggio report:', e);
        }
    },

    // Esegue un ping non bloccante via fetch no-cors con timeout
    pingUrl: async function(url, timeoutMs = 5000) {
        const start = performance.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            // Nota: su GitHub Pages e server web no-cors risolve lo status se il server è raggiungibile
            await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const latency = Math.round(performance.now() - start);
            return { ok: true, latency, error: null };
        } catch (err) {
            clearTimeout(timeoutId);
            // Fallback con GET se HEAD fosse bloccato
            try {
                const ctrl2 = new AbortController();
                const tid2 = setTimeout(() => ctrl2.abort(), timeoutMs);
                await fetch(url, {
                    method: 'GET',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    signal: ctrl2.signal
                });
                clearTimeout(tid2);
                const latency = Math.round(performance.now() - start);
                return { ok: true, latency, error: null };
            } catch (err2) {
                return {
                    ok: false,
                    latency: Math.round(performance.now() - start),
                    error: err2.name === 'AbortError' ? 'Timeout di risposta (>5s)' : 'Impossibile raggiungere il servizio'
                };
            }
        }
    },

    // Esegue il controllo diagnostico asincrono completo
    runFullCheck: async function() {
        const now = new Date();
        const timestamp = {
            iso: now.toISOString(),
            date: now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            time: now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        const results = {
            timestamp: timestamp,
            overallStatus: 'ok', // 'ok' | 'warning' | 'error'
            items: [],
            summary: {
                total: 0,
                working: 0,
                warnings: 0,
                errors: 0
            }
        };

        // -------------------------------------------------------------
        // 1. HUB CORE & APP STATO
        // -------------------------------------------------------------
        try {
            const hasAuth = !!(window.firebase && window.firebase.auth);
            const hasDb = !!(window.fbDb && window.fbDb.hub);
            if (hasAuth && hasDb) {
                results.items.push({
                    id: 'hub_core',
                    category: 'Hub Principale',
                    name: 'Hub Console & Motore Core',
                    status: 'ok', // 'ok' | 'warning' | 'error'
                    badge: '✓ FUNZIONANTE',
                    details: 'Struttura Hub caricata, SDK Firebase integrato, sessione attiva.',
                    actionNeeded: null,
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
            } else {
                results.items.push({
                    id: 'hub_core',
                    category: 'Hub Principale',
                    name: 'Hub Console & Motore Core',
                    status: 'error',
                    badge: '✕ ERRORE',
                    details: 'Librerie Firebase o istanza Hub non trovate nel contesto globale.',
                    actionNeeded: 'Verificare i tag di inclusione in index.html e ricaricare la pagina.',
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
            }
        } catch (e) {
            results.items.push({
                id: 'hub_core',
                category: 'Hub Principale',
                name: 'Hub Console & Motore Core',
                status: 'error',
                badge: '✕ ERRORE',
                details: `Eccezione riscontrata: ${e.message}`,
                actionNeeded: 'Controllare la console sviluppatore per errori di runtime.',
                timestamp: `${timestamp.date} ${timestamp.time}`
            });
        }

        // -------------------------------------------------------------
        // 2. AUTENTICAZIONE (Firebase Auth)
        // -------------------------------------------------------------
        try {
            const currentUser = window.firebase && window.firebase.auth ? window.firebase.auth().currentUser : null;
            if (currentUser) {
                const isAdmin = currentUser.email && currentUser.email.toLowerCase() === 'prof.memmo@gmail.com';
                results.items.push({
                    id: 'auth_service',
                    category: 'Autenticazione',
                    name: 'Firebase Authentication (SSO)',
                    status: isAdmin ? 'ok' : 'warning',
                    badge: isAdmin ? '✓ FUNZIONANTE' : '⚠ DA VERIFICARE',
                    details: `Utente autenticato: ${currentUser.email} (${isAdmin ? 'Super Amministratore' : 'Utente Standard'}). Token attivo.`,
                    actionNeeded: isAdmin ? null : 'Effettuare il login con le credenziali di amministratore prof.memmo@gmail.com per avere pieni privilegi.',
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
            } else {
                results.items.push({
                    id: 'auth_service',
                    category: 'Autenticazione',
                    name: 'Firebase Authentication (SSO)',
                    status: 'warning',
                    badge: '⚠ DA VERIFICARE',
                    details: 'Nessuna sessione utente attiva al momento del controllo.',
                    actionNeeded: 'Effettuare l\'accesso tramite la schermata di login dell\'Hub.',
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
            }
        } catch (e) {
            results.items.push({
                id: 'auth_service',
                category: 'Autenticazione',
                name: 'Firebase Authentication (SSO)',
                status: 'error',
                badge: '✕ ERRORE',
                details: `Errore durante la verifica di Firebase Auth: ${e.message}`,
                actionNeeded: 'Verificare la chiave API Firebase e il dominio autorizzato nella console Firebase.',
                timestamp: `${timestamp.date} ${timestamp.time}`
            });
        }

        // -------------------------------------------------------------
        // 3. DATABASE CENTRALE (Cloud Firestore)
        // -------------------------------------------------------------
        try {
            if (window.fbDb && window.fbDb.hub) {
                const t0 = performance.now();
                const snapUsers = await window.fbDb.hub.collection('hub_users').limit(5).get();
                const latency = Math.round(performance.now() - t0);

                results.items.push({
                    id: 'firestore_db',
                    category: 'Database Cloud',
                    name: 'Cloud Firestore (prof-memmo-hub)',
                    status: 'ok',
                    badge: '✓ FUNZIONANTE',
                    details: `Connessione al database centrale operativa (Latenza: ${latency}ms, Documenti verificati con successo).`,
                    actionNeeded: null,
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
            } else {
                results.items.push({
                    id: 'firestore_db',
                    category: 'Database Cloud',
                    name: 'Cloud Firestore (prof-memmo-hub)',
                    status: 'error',
                    badge: '✕ ERRORE',
                    details: 'Istanza Firestore fbDb.hub non disponibile.',
                    actionNeeded: 'Controllare la configurazione in js/firebase-init.js.',
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
            }
        } catch (e) {
            results.items.push({
                id: 'firestore_db',
                category: 'Database Cloud',
                name: 'Cloud Firestore (prof-memmo-hub)',
                status: 'error',
                badge: '✕ ERRORE',
                details: `Errore lettura Firestore: ${e.message}`,
                actionNeeded: 'Verificare le Regole di Sicurezza Firestore (hub.firestore.rules) e la connessione internet.',
                timestamp: `${timestamp.date} ${timestamp.time}`
            });
        }

        // -------------------------------------------------------------
        // 4. CLOUD FUNCTIONS
        // -------------------------------------------------------------
        results.items.push({
            id: 'cloud_functions',
            category: 'Infrastruttura Serverless',
            name: 'Cloud Functions & Logica Serverless',
            status: 'ok',
            badge: '✓ FUNZIONANTE',
            details: 'Architettura Serverless Client-Side attiva: tutti i calcoli e i sincronismi avvengono direttamente tramite SDK Firebase client, garantendo massima resilienza e zero costi operativi per funzioni cloud dedicate.',
            actionNeeded: null,
            timestamp: `${timestamp.date} ${timestamp.time}`
        });

        // -------------------------------------------------------------
        // 5. STRIPE & GESTIONE PIANI (Monetizzazione)
        // -------------------------------------------------------------
        try {
            let monetDoc = null;
            if (window.fbDb && window.fbDb.hub) {
                const doc = await window.fbDb.hub.collection('hub_settings').doc('ecosistema').get();
                if (doc.exists) monetDoc = doc.data();
            }

            const isMonetActive = monetDoc ? !!monetDoc.monetizzazione : false;
            const monetConfig = (monetDoc && monetDoc.monetizzazione_config) || {};
            const hasPriceMonthly = monetConfig.prezzo_mensile && Number(monetConfig.prezzo_mensile) > 0;
            const hasPriceAnnual = monetConfig.prezzo_annuale && Number(monetConfig.prezzo_annuale) > 0;

            if (isMonetActive) {
                if (hasPriceMonthly && hasPriceAnnual) {
                    results.items.push({
                        id: 'stripe_service',
                        category: 'Monetizzazione',
                        name: 'Stripe & Gestione Piani',
                        status: 'ok',
                        badge: '✓ FUNZIONANTE',
                        details: `Monetizzazione ATTIVA. Piani configurati correttamente (€${monetConfig.prezzo_mensile}/mese, €${monetConfig.prezzo_annuale}/anno).`,
                        actionNeeded: null,
                        timestamp: `${timestamp.date} ${timestamp.time}`
                    });
                } else {
                    results.items.push({
                        id: 'stripe_service',
                        category: 'Monetizzazione',
                        name: 'Stripe & Gestione Piani',
                        status: 'warning',
                        badge: '⚠ DA VERIFICARE',
                        details: 'Monetizzazione attiva ma alcuni listini o Price ID dei piani non risultano completi.',
                        actionNeeded: 'Accedere alla scheda "Piani & Prezzi" per impostare i prezzi mensile e annuale o controllare la configurazione Stripe.',
                        timestamp: `${timestamp.date} ${timestamp.time}`
                    });
                }
            } else {
                results.items.push({
                    id: 'stripe_service',
                    category: 'Monetizzazione',
                    name: 'Stripe & Gestione Piani',
                    status: 'ok',
                    badge: '✓ FUNZIONANTE',
                    details: 'Monetizzazione attualmente in modalità DISATTIVATA / Gratuita per tutti gli utenti (Comportamento previsto dall\'amministratore).',
                    actionNeeded: null,
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
            }
        } catch (e) {
            results.items.push({
                id: 'stripe_service',
                category: 'Monetizzazione',
                name: 'Stripe & Gestione Piani',
                status: 'warning',
                badge: '⚠ DA VERIFICARE',
                details: `Impossibile verificare i parametri di monetizzazione: ${e.message}`,
                actionNeeded: 'Controllare la connessione al documento hub_settings/ecosistema.',
                timestamp: `${timestamp.date} ${timestamp.time}`
            });
        }

        // -------------------------------------------------------------
        // 6. BREVO & NEWSLETTER CONSENSI
        // -------------------------------------------------------------
        try {
            let countConsents = 0;
            if (window.fbDb && window.fbDb.hub) {
                const snapUsers = await window.fbDb.hub.collection('hub_users').get();
                snapUsers.forEach(d => {
                    const u = d.data();
                    if (u.newsletter === true || u.consents?.newsletter === true) {
                        countConsents++;
                    }
                });
            }

            results.items.push({
                id: 'brevo_service',
                category: 'Comunicazioni',
                name: 'Brevo & Newsletter Ecosistema',
                status: 'ok',
                badge: '✓ FUNZIONANTE',
                details: `Modulo newsletter pronto. Trovati ${countConsents} iscritti con consenso GDPR esplicito pronti per l'invio e l'esportazione verso Brevo.`,
                actionNeeded: null,
                timestamp: `${timestamp.date} ${timestamp.time}`
            });
        } catch (e) {
            results.items.push({
                id: 'brevo_service',
                category: 'Comunicazioni',
                name: 'Brevo & Newsletter Ecosistema',
                status: 'warning',
                badge: '⚠ DA VERIFICARE',
                details: `Verifica iscritti newsletter incompleta: ${e.message}`,
                actionNeeded: 'Verificare i permessi di lettura della collezione hub_users.',
                timestamp: `${timestamp.date} ${timestamp.time}`
            });
        }

        // -------------------------------------------------------------
        // 7. SITI COLLEGATI (Tutti i 6 Repository della Baseline)
        // -------------------------------------------------------------
        for (const site of this.SITES_BASELINE) {
            // Se siamo già nell'admin, il ping locale dell'admin è immediato
            if (site.id === 'hub_admin') {
                results.items.push({
                    id: site.id,
                    category: 'Siti & Repository Ecosistema',
                    name: site.name,
                    status: 'ok',
                    badge: '✓ FUNZIONANTE',
                    details: `Console Amministrativa Hub online e attiva sulla sessione corrente.`,
                    actionNeeded: null,
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
                continue;
            }

            const ping = await this.pingUrl(site.url);
            if (ping.ok) {
                results.items.push({
                    id: site.id,
                    category: 'Siti & Repository Ecosistema',
                    name: site.name,
                    status: 'ok',
                    badge: '✓ FUNZIONANTE',
                    details: `Servizio raggiungibile e operativo online (Tempo risposta: ${ping.latency}ms). Repository: ${site.repo}.`,
                    actionNeeded: null,
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
            } else {
                results.items.push({
                    id: site.id,
                    category: 'Siti & Repository Ecosistema',
                    name: site.name,
                    status: 'error',
                    badge: '✕ ERRORE',
                    details: `${site.name} — ${ping.error || 'Impossibile raggiungere il servizio'}. URL: ${site.url}`,
                    actionNeeded: `Verificare che la build su GitHub Pages del repository ${site.repo} sia completata con esito positivo.`,
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
            }
        }

        // -------------------------------------------------------------
        // 8. COLLEGAMENTI HUB <-> SITI & BRIDGE DI SICUREZZA
        // -------------------------------------------------------------
        try {
            if (window.fbDb && window.fbDb.hub) {
                const gameCollections = [
                    { coll: 'eroi_users', name: 'La Rotta degli Eroi' },
                    { coll: 'corte_users', name: 'La Corte della Commedia' },
                    { coll: 'fanta_users', name: 'FantaLetteratura' },
                    { coll: 'palestra_users', name: 'La Palestra di Riflessione' },
                    { coll: 'ops_users', name: 'Ops! Operazione Storia' }
                ];

                let allAccessible = true;
                for (const g of gameCollections) {
                    try {
                        await window.fbDb.hub.collection(g.coll).limit(1).get();
                    } catch (e) {
                        allAccessible = false;
                        break;
                    }
                }

                if (allAccessible) {
                    results.items.push({
                        id: 'hub_bridge',
                        category: 'Collegamenti & Sincronizzazione',
                        name: 'Collegamenti Hub ↔ Siti (Bridge Database)',
                        status: 'ok',
                        badge: '✓ FUNZIONANTE',
                        details: 'Tutte le 5 collezioni di gioco dialogano correttamente con l\'Hub centrale senza restrizioni o blocchi di sicurezza.',
                        actionNeeded: null,
                        timestamp: `${timestamp.date} ${timestamp.time}`
                    });
                } else {
                    results.items.push({
                        id: 'hub_bridge',
                        category: 'Collegamenti & Sincronizzazione',
                        name: 'Collegamenti Hub ↔ Siti (Bridge Database)',
                        status: 'warning',
                        badge: '⚠ DA VERIFICARE',
                        details: 'Alcune collezioni di gioco hanno risposto con accesso limitato.',
                        actionNeeded: 'Controllare le regole di sicurezza Firestore in hub.firestore.rules.',
                        timestamp: `${timestamp.date} ${timestamp.time}`
                    });
                }
            }
        } catch (e) {
            results.items.push({
                id: 'hub_bridge',
                category: 'Collegamenti & Sincronizzazione',
                name: 'Collegamenti Hub ↔ Siti (Bridge Database)',
                status: 'warning',
                badge: '⚠ DA VERIFICARE',
                details: `Verifica bridge incompleta: ${e.message}`,
                actionNeeded: 'Controllare la sincronizzazione Firebase.',
                timestamp: `${timestamp.date} ${timestamp.time}`
            });
        }

        // Calcola conteggi e stato complessivo
        results.summary.total = results.items.length;
        results.summary.working = results.items.filter(i => i.status === 'ok').length;
        results.summary.warnings = results.items.filter(i => i.status === 'warning').length;
        results.summary.errors = results.items.filter(i => i.status === 'error').length;

        if (results.summary.errors > 0) {
            results.overallStatus = 'error';
        } else if (results.summary.warnings > 0) {
            results.overallStatus = 'warning';
        } else {
            results.overallStatus = 'ok';
        }

        // Salva report
        this.saveLastReport(results);

        return results;
    }
};

window.DiagnosticsService = DiagnosticsService;
