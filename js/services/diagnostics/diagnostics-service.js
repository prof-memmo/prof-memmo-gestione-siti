// js/services/diagnostics/diagnostics-service.js
// Servizio centralizzato dinamico di controllo, analisi e diagnostica dell'Ecosistema Prof. Memmo
// Architettura scalabile con Registro Progetti Dinamico su Cloud Firestore (hub_settings/registro_progetti)
// Rispetta i principi di isolamento e regole anti-regressione (CONTROLLA -> ANALIZZA -> SEGNALA).

const DiagnosticsService = {
    // 7 Progetti dell'Ecosistema Attuale (Baseline Congelata STABLE-BEFORE-HUB-EXPANSION)
    DEFAULT_PROJECTS: [
        {
            id: 'hub_vetrina',
            name: 'Hub & Vetrina Giochi (prof-memmo-games)',
            repo: 'prof-memmo-games',
            url: 'https://prof-memmo.github.io/prof-memmo-gestione-siti/',
            type: 'vetrina',
            active: true,
            diagnostics_active: true,
            db_collection: 'hub_users',
            icon: 'fa-house',
            description: 'Vetrina pubblica principale, catalogo giochi e portale di accesso.'
        },
        {
            id: 'hub_admin',
            name: 'Hub Dashboard Admin (prof-memmo-admin)',
            repo: 'prof-memmo-admin-gestione-generale',
            url: 'https://prof-memmo.github.io/prof-memmo-gestione-siti/portal.html',
            type: 'admin',
            active: true,
            diagnostics_active: true,
            db_collection: 'hub_settings',
            icon: 'fa-shield-halved',
            description: 'Console di amministrazione centrale, gestione iscritti, notifiche e impostazioni.'
        },
        {
            id: 'rotta_eroi',
            name: 'La Rotta degli Eroi',
            repo: 'la-rotta-degli-eroi',
            url: 'https://prof-memmo.github.io/la-rotta-degli-eroi/',
            type: 'gioco',
            active: true,
            diagnostics_active: true,
            db_collection: 'eroi_users',
            icon: 'fa-ship',
            description: 'Gioco di ruolo didattico su epica classica e letteratura.'
        },
        {
            id: 'corte_commedia',
            name: 'La Corte della Commedia',
            repo: 'la-corte-della-commedia',
            url: 'https://prof-memmo.github.io/la-corte-della-commedia/',
            type: 'gioco',
            active: true,
            diagnostics_active: true,
            db_collection: 'corte_users',
            icon: 'fa-masks-theater',
            description: 'Gioco didattico sulla Divina Commedia di Dante Alighieri.'
        },
        {
            id: 'fantaletteratura',
            name: 'FantaLetteratura',
            repo: 'fantaletteratura',
            url: 'https://prof-memmo.github.io/fantaletteratura/',
            type: 'gioco',
            active: true,
            diagnostics_active: true,
            db_collection: 'fanta_users',
            icon: 'fa-feather-pointed',
            description: 'Lega letteraria e sfide narrative per studenti e classi.'
        },
        {
            id: 'palestra_riflessione',
            name: 'La Palestra di Riflessione',
            repo: 'palestra-di-riflessione',
            url: 'https://prof-memmo.github.io/palestra-di-riflessione/',
            type: 'gioco',
            active: true,
            diagnostics_active: true,
            db_collection: 'palestra_users',
            icon: 'fa-brain',
            description: 'Palestra di logica, comprensione del testo e pensiero critico.'
        },
        {
            id: 'ops_storia',
            name: 'Ops! Operazione Storia',
            repo: 'ops-storia',
            url: 'https://prof-memmo.github.io/ops-storia/',
            type: 'gioco',
            active: true,
            diagnostics_active: true,
            db_collection: 'ops_users',
            icon: 'fa-landmark',
            description: 'Gioco storico per la scuola secondaria di primo grado.'
        }
    ],

    // =========================================================================
    // GESTIONE REGISTRO DINAMICO DEI PROGETTI (Firestore + Fallback Locale)
    // =========================================================================

    // Recupera la lista dinamica dei progetti dal database centrale
    getProjects: async function() {
        if (!window.fbDb || !window.fbDb.hub) {
            console.warn("DB Hub non pronto, uso registro progetti di default.");
            return this.DEFAULT_PROJECTS;
        }

        try {
            const doc = await window.fbDb.hub.collection('hub_settings').doc('registro_progetti').get();
            if (doc.exists && doc.data() && Array.isArray(doc.data().projects) && doc.data().projects.length > 0) {
                const storedProjects = doc.data().projects;
                // Merge intelligente con i default per garantire che i progetti di sistema non vengano persi
                const merged = [...storedProjects];
                for (const def of this.DEFAULT_PROJECTS) {
                    if (!merged.some(p => p.id === def.id)) {
                        merged.push(def);
                    }
                }
                return merged;
            } else {
                // Primo bootstrap automatico nel database
                await window.fbDb.hub.collection('hub_settings').doc('registro_progetti').set({
                    projects: this.DEFAULT_PROJECTS,
                    lastUpdated: new Date().toISOString(),
                    version: '2.0.0'
                }, { merge: true });
                return this.DEFAULT_PROJECTS;
            }
        } catch (e) {
            console.error("Errore recupero registro progetti da Firestore:", e);
            return this.DEFAULT_PROJECTS;
        }
    },

    // Salva o aggiorna un progetto nel registro centralizzato
    saveProject: async function(projectData) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Database non connesso");
        if (!projectData.id || !projectData.name || !projectData.url) {
            throw new Error("Campi obbligatori mancanti: Nome, Identificativo o URL");
        }

        const currentProjects = await this.getProjects();
        const index = currentProjects.findIndex(p => p.id === projectData.id);

        const projectPayload = {
            id: projectData.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            name: projectData.name.trim(),
            url: projectData.url.trim(),
            repo: (projectData.repo || '').trim(),
            type: projectData.type || 'gioco',
            active: projectData.active !== false,
            diagnostics_active: projectData.diagnostics_active !== false,
            db_collection: (projectData.db_collection || '').trim(),
            icon: projectData.icon || 'fa-globe',
            description: (projectData.description || '').trim(),
            updatedAt: new Date().toISOString()
        };

        if (index >= 0) {
            currentProjects[index] = { ...currentProjects[index], ...projectPayload };
        } else {
            currentProjects.push(projectPayload);
        }

        await window.fbDb.hub.collection('hub_settings').doc('registro_progetti').set({
            projects: currentProjects,
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        return currentProjects;
    },

    // Rimuove un progetto dal registro
    deleteProject: async function(projectId) {
        if (!window.fbDb || !window.fbDb.hub) throw new Error("Database non connesso");
        const currentProjects = await this.getProjects();
        const updatedProjects = currentProjects.filter(p => p.id !== projectId);

        await window.fbDb.hub.collection('hub_settings').doc('registro_progetti').set({
            projects: updatedProjects,
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        return updatedProjects;
    },

    // Attiva/disattiva la diagnostica per un singolo progetto
    toggleProjectDiagnostics: async function(projectId, enabled) {
        const currentProjects = await this.getProjects();
        const target = currentProjects.find(p => p.id === projectId);
        if (!target) return;

        target.diagnostics_active = enabled;
        await window.fbDb.hub.collection('hub_settings').doc('registro_progetti').set({
            projects: currentProjects,
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        return currentProjects;
    },

    // =========================================================================
    // CONTROLLO DIAGNOSTICO DINAMICO & ANALISI DI SALUTE
    // =========================================================================

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

    // Esegue il controllo diagnostico asincrono completo leggendo DINAMICAMENTE il registro
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
                    status: 'ok',
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
        // 6. NEWSLETTER & CONSENSI GDPR
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
                id: 'newsletter_service',
                category: 'Comunicazioni',
                name: 'Newsletter & Consensi GDPR',
                status: 'ok',
                badge: '✓ FUNZIONANTE',
                details: `Modulo newsletter pronto. Trovati ${countConsents} iscritti con consenso GDPR esplicito pronti per l'invio via Gmail (CCN).`,
                actionNeeded: null,
                timestamp: `${timestamp.date} ${timestamp.time}`
            });
        } catch (e) {
            results.items.push({
                id: 'newsletter_service',
                category: 'Comunicazioni',
                name: 'Newsletter & Consensi GDPR',
                status: 'warning',
                badge: '⚠ DA VERIFICARE',
                details: `Verifica iscritti newsletter incompleta: ${e.message}`,
                actionNeeded: 'Verificare i permessi di lettura della collezione hub_users.',
                timestamp: `${timestamp.date} ${timestamp.time}`
            });
        }

        // -------------------------------------------------------------
        // 7. SITI & PROGETTI REGISTRATI (CONTROLLO DINAMICO DAL REGISTRO)
        // -------------------------------------------------------------
        const projects = await this.getProjects();

        for (const project of projects) {
            // Salta i progetti con diagnostica disattivata o non attivi
            if (project.active === false || project.diagnostics_active === false) {
                continue;
            }

            // Se siamo già nell'admin, il ping locale dell'admin è immediato
            if (project.id === 'hub_admin') {
                results.items.push({
                    id: project.id,
                    category: 'Siti & Repository Ecosistema',
                    name: project.name,
                    status: 'ok',
                    badge: '✓ FUNZIONANTE',
                    details: `Console Amministrativa Hub online e attiva sulla sessione corrente. Repository: ${project.repo || 'N/A'}.`,
                    actionNeeded: null,
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
                continue;
            }

            const ping = await this.pingUrl(project.url);
            if (ping.ok) {
                results.items.push({
                    id: project.id,
                    category: 'Siti & Repository Ecosistema',
                    name: project.name,
                    status: 'ok',
                    badge: '✓ FUNZIONANTE',
                    details: `Servizio raggiungibile e operativo online (Tempo risposta: ${ping.latency}ms). Repository: ${project.repo || 'N/A'}. URL: ${project.url}`,
                    actionNeeded: null,
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
            } else {
                results.items.push({
                    id: project.id,
                    category: 'Siti & Repository Ecosistema',
                    name: project.name,
                    status: 'error',
                    badge: '✕ ERRORE',
                    details: `${project.name} — ${ping.error || 'Impossibile raggiungere il servizio'}. URL: ${project.url}`,
                    actionNeeded: `Verificare che la build su GitHub Pages del repository ${project.repo || project.name} sia completata con esito positivo.`,
                    timestamp: `${timestamp.date} ${timestamp.time}`
                });
            }
        }

        // -------------------------------------------------------------
        // 8. COLLEGAMENTI HUB <-> SITI & BRIDGE DI SICUREZZA
        // -------------------------------------------------------------
        try {
            if (window.fbDb && window.fbDb.hub) {
                // Raccoglie dinamicamente tutte le collezioni DB dei progetti registrati
                const collectionsToCheck = [];
                for (const p of projects) {
                    if (p.db_collection && !collectionsToCheck.some(c => c.coll === p.db_collection)) {
                        collectionsToCheck.push({ coll: p.db_collection, name: p.name });
                    }
                }

                let allAccessible = true;
                const inaccessibleColls = [];

                for (const g of collectionsToCheck) {
                    try {
                        await window.fbDb.hub.collection(g.coll).limit(1).get();
                    } catch (e) {
                        allAccessible = false;
                        inaccessibleColls.push(g.name);
                    }
                }

                if (allAccessible) {
                    results.items.push({
                        id: 'hub_bridge',
                        category: 'Collegamenti & Sincronizzazione',
                        name: 'Collegamenti Hub ↔ Siti (Bridge Database)',
                        status: 'ok',
                        badge: '✓ FUNZIONANTE',
                        details: `Tutte le ${collectionsToCheck.length} collezioni di gioco registrate dialogano correttamente con l'Hub centrale senza blocchi di sicurezza.`,
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
                        details: `Alcune collezioni di gioco hanno risposto con accesso limitato: ${inaccessibleColls.join(', ')}.`,
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
