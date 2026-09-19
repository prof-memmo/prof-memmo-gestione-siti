// --- Cross Projects Service ---
// Gestisce il recupero dati da tutti i database collegati tramite REST API

const CrossProjectsService = {
    getAuthTokenFromDB: async function(apiKey, appName = "[DEFAULT]") {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 800);
            try {
                const req = indexedDB.open('firebaseLocalStorageDb');
                req.onsuccess = (e) => {
                    clearTimeout(timeout);
                    const db = e.target.result;
                    if (!db || !db.objectStoreNames.contains('firebaseLocalStorage')) return resolve(null);
                    const tx = db.transaction('firebaseLocalStorage', 'readonly');
                    const store = tx.objectStore('firebaseLocalStorage');
                    const getAllReq = store.getAll();
                    getAllReq.onsuccess = (e2) => {
                        const items = e2.target.result || [];
                        for (const it of items) {
                            if (it && it.value && it.value.stsTokenManager) {
                                return resolve(it.value.stsTokenManager);
                            }
                        }
                        resolve(null);
                    };
                    getAllReq.onerror = () => resolve(null);
                };
                req.onerror = () => { clearTimeout(timeout); resolve(null); };
            } catch(err) {
                clearTimeout(timeout);
                resolve(null);
            }
        });
    },

    fetchUsersREST: async function(projectId, apiKey, appName = "[DEFAULT]") {
        try {
            const tokenManager = await CrossProjectsService.getAuthTokenFromDB(apiKey, appName);
            if (!tokenManager || !tokenManager.refreshToken) return [];
            
            // Timeout per evitare chiamate di rete appese
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500));
            
            const networkTask = async () => {
                const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `grant_type=refresh_token&refresh_token=${tokenManager.refreshToken}`
                });
                const refreshData = await refreshRes.json();
                const validToken = refreshData.id_token || tokenManager.accessToken;

                const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?pageSize=1000`, {
                    headers: { Authorization: `Bearer ${validToken}` }
                });
                const data = await res.json();
                if (!data.documents) return [];
                return data.documents.map(doc => {
                    const fields = doc.fields || {};
                    let dataVal = 0;
                    if (fields.createdAt && fields.createdAt.integerValue) dataVal = parseInt(fields.createdAt.integerValue);
                    else if (fields.joinedAt && fields.joinedAt.integerValue) dataVal = parseInt(fields.joinedAt.integerValue);
                    else if (fields.createdAt && fields.createdAt.timestampValue) dataVal = new Date(fields.createdAt.timestampValue).getTime();
                    else if (fields.joinedAt && fields.joinedAt.timestampValue) dataVal = new Date(fields.joinedAt.timestampValue).getTime();
                    else if (fields.createdAt && fields.createdAt.stringValue) dataVal = new Date(fields.createdAt.stringValue).getTime();
                    else if (fields.joinedAt && fields.joinedAt.stringValue) dataVal = new Date(fields.joinedAt.stringValue).getTime();
                    
                    const rawRole = (fields.role && fields.role.stringValue) || (fields.ruolo && fields.ruolo.stringValue) || 'studente';
                    const rawPlan = (fields.plan && fields.plan.stringValue) || 
                                    (fields.piano && fields.piano.stringValue) || 
                                    (fields.subscription && fields.subscription.stringValue) || 
                                    (fields.abbonamento && fields.abbonamento.stringValue) || 
                                    (rawRole === 'studente' ? 'studente' : 'base');

                    const rawOverride = (fields.admin_override && fields.admin_override.booleanValue !== undefined ? fields.admin_override.booleanValue : (fields.adminOverride && fields.adminOverride.booleanValue !== undefined ? fields.adminOverride.booleanValue : (fields.isAdminOverride && fields.isAdminOverride.booleanValue !== undefined ? fields.isAdminOverride.booleanValue : false)));

                    const rawScadenza = (fields.abbonamento_scadenza && fields.abbonamento_scadenza.stringValue) || 
                                         (fields.scadenza && fields.scadenza.stringValue) || '';

                    return {
                        id: doc.name.split('/').pop(),
                        nome: ((fields.nome && fields.nome.stringValue) || (fields.name && fields.name.stringValue) || (fields.displayName && fields.displayName.stringValue) || (fields.username && fields.username.stringValue) || (((fields.firstName && fields.firstName.stringValue) || (fields.lastName && fields.lastName.stringValue)) ? (((fields.firstName && fields.firstName.stringValue) || '') + ' ' + ((fields.lastName && fields.lastName.stringValue) || '')).trim() : 'Utente')).trim() || 'Utente',
                        email: (fields.email && fields.email.stringValue) || '',
                        avatar: (fields.avatar && fields.avatar.stringValue) || (fields.photoURL && fields.photoURL.stringValue) || (fields.foto && fields.foto.stringValue) || '',
                        ruolo: rawRole,
                        classe: (fields.classId && fields.classId.stringValue) || (fields.class && fields.class.stringValue) || 'N/A',
                        dataValue: dataVal,
                        plan: rawPlan,
                        admin_override: rawOverride,
                        abbonamento_scadenza: rawScadenza
                    };
                });
            };

            return await Promise.race([networkTask(), timeoutPromise]);
        } catch(e) {
            return [];
        }
    },

    fetchAllUsers: async function() {
        let result = {
            users: [],
            stats: { eroi: 0, commedia: 0, fanta: 0, palestra: 0, ops: 0, oratore: 0, studenti: 0, docenti: 0, viandanti: 0, scuoleSetSize: 0, total: 0 }
        };

        if (!window.fbDb || !window.fbDb.hub) {
            console.warn("Hub Centrale non disponibile.");
            return result;
        }

        let hubUsers = [];
        const scuoleSet = new Set();
        let totalRosterStudents = 0;

        // 1. Fetch Classi Centrali per calcolo scuole e studenti roster
        try {
            const snapClasses = await window.fbDb.hub.collection("hub_classes").get();
            snapClasses.forEach(doc => {
                const cData = doc.data() || {};
                if (cData.school && cData.school.trim() && cData.school.toUpperCase() !== 'N/A') {
                    scuoleSet.add(cData.school.trim().toLowerCase());
                }
                if (Array.isArray(cData.students)) {
                    totalRosterStudents += cData.students.length;
                }
            });
        } catch(e) {
            console.warn("Hub classes fetch error:", e);
        }

        // 2. Fetch Utenti Centrali Unificati (hub_users) con deduplicazione rigorosa per email/account
        const usersMap = new Map();

        try {
            const snapHub = await window.fbDb.hub.collection("hub_users").get();
            snapHub.forEach(doc => {
                const data = doc.data() || {};
                const rawRole = String(data.role || data.ruolo || '').toLowerCase();
                
                // ESCLUDI account studente legacy: gli studenti vivono solo nei roster interni delle classi (Zero Email)
                if (rawRole === 'studente' || rawRole === 'student') {
                    return;
                }

                const emailKey = (data.email || '').trim().toLowerCase();
                const isMemmo = emailKey === 'prof.memmo@gmail.com' || (data.nome && data.nome.toLowerCase().includes('profmemmo'));
                const nomeStr = data.anagrafica ? ((data.anagrafica.nome || '') + " " + (data.anagrafica.cognome || '')) : (data.nome || data.name || data.displayName || 'Utente');
                
                let userGiochi = [];
                if (data.platforms && typeof data.platforms === 'object') {
                    if (data.platforms.eroi_users?.enabled || data.platforms.rotta_degli_eroi?.enabled) userGiochi.push('La Rotta degli Eroi');
                    if (data.platforms.corte_users?.enabled || data.platforms.corte_della_commedia?.enabled) userGiochi.push('La Corte della Commedia');
                    if (data.platforms.fanta_users?.enabled || data.platforms.fantaletteratura?.enabled) userGiochi.push('FantaLetteratura');
                    if (data.platforms.palestra_users?.enabled || data.platforms.palestra_riflessione?.enabled) userGiochi.push('Palestra di Riflessione');
                    if (data.platforms.ops_users?.enabled || data.platforms.ops_storia?.enabled) userGiochi.push('Ops! Operazione Storia');
                    if (data.platforms.oratore_users?.enabled || data.platforms.l_oratore?.enabled || data.platforms.oratore?.enabled) userGiochi.push("L'Oratore");
                }

                const userPlan = isMemmo ? 'docente_ecosistema' : (data.abbonamento || data.plan || data.subscription || 'base');
                const userRole = isMemmo ? 'admin' : (rawRole.includes('docente') || rawRole.includes('teacher') || rawRole.includes('prof') ? 'docente' : (rawRole === 'admin' ? 'admin' : 'viandante'));

                if (userRole === 'admin' || String(userPlan).toLowerCase().includes('ecosistema')) {
                    ['La Rotta degli Eroi', 'La Corte della Commedia', 'FantaLetteratura', 'Palestra di Riflessione', 'Ops! Operazione Storia', "L'Oratore"].forEach(g => {
                        if (!userGiochi.includes(g)) userGiochi.push(g);
                    });
                }

                const finalScuola = (data.scuola || data.school || (data.anagrafica && data.anagrafica.scuola) || '').trim();
                if (finalScuola && finalScuola.toUpperCase() !== 'N/A') {
                    scuoleSet.add(finalScuola.toLowerCase());
                }

                const dedupeKey = isMemmo ? 'prof.memmo@gmail.com' : (emailKey || doc.id);

                if (usersMap.has(dedupeKey)) {
                    // Aggiorna o unifica se già presente
                    const existing = usersMap.get(dedupeKey);
                    if (isMemmo) {
                        existing.avatar = 'assets/avatars/6.png'; // Avatar del Mago garantito
                        existing.nome = 'Prof. Memmo';
                        existing.ruolo = 'admin';
                        existing.plan = 'docente_ecosistema';
                    }
                } else {
                    usersMap.set(dedupeKey, {
                        id: isMemmo ? 'prof_memmo_admin' : doc.id,
                        nome: isMemmo ? 'Prof. Memmo' : (nomeStr.trim() || 'Utente'),
                        email: isMemmo ? 'prof.memmo@gmail.com' : (data.email || ''),
                        ruolo: userRole,
                        statusAccount: data.statusAccount || data.statoAccount || 'active',
                        classe: data.classId || data.classe || data.class || 'N/A',
                        citta: data.citta || data.city || (data.anagrafica && data.anagrafica.citta) || '',
                        scuola: finalScuola,
                        anagrafica: data.anagrafica || {},
                        avatar: isMemmo ? 'assets/avatars/6.png' : (data.avatar || data.photoURL || data.foto || 'assets/avatars/6.png'),
                        dataValue: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : new Date(data.createdAt).getTime()) : (data.joinedAt ? (data.joinedAt.toMillis ? data.joinedAt.toMillis() : new Date(data.joinedAt).getTime()) : 0),
                        gioco: userGiochi.length > 0 ? userGiochi.join(' / ') : 'Ecosistema',
                        giocoColor: '#6366f1',
                        giocoIcon: 'fa-globe',
                        plan: userPlan,
                        admin_override: data.admin_override === true || data.adminOverride === true,
                        abbonamento_scadenza: data.abbonamento_scadenza || data.scadenza || '',
                        isHubMaster: true,
                        newsletter: data.newsletter === true || (data.consents && data.consents.newsletter === true),
                        consents: data.consents || (data.newsletter ? { newsletter: true } : {})
                    });
                }
            });
        } catch(e) {
            console.warn("Hub users fetch error:", e);
        }

        hubUsers = Array.from(usersMap.values());

        hubUsers.sort((a, b) => (b.dataValue || 0) - (a.dataValue || 0));

        let cDocenti = 0, cViandanti = 0;
        let cEroi = 0, cCommedia = 0, cFanta = 0, cPalestra = 0, cOps = 0, cOratore = 0;

        hubUsers.forEach(u => {
            if (u.ruolo === 'docente' || u.ruolo === 'admin') {
                cDocenti++;
            } else {
                cViandanti++;
            }

            const gStr = (u.gioco || '').toLowerCase();
            if (gStr.includes('eroi')) cEroi++;
            if (gStr.includes('commedia')) cCommedia++;
            if (gStr.includes('fanta')) cFanta++;
            if (gStr.includes('palestra')) cPalestra++;
            if (gStr.includes('ops')) cOps++;
            if (gStr.includes('oratore')) cOratore++;
        });

        result.users = hubUsers;
        result.stats = {
            eroi: cEroi,
            commedia: cCommedia,
            fanta: cFanta,
            palestra: cPalestra,
            ops: cOps,
            oratore: cOratore,
            studenti: totalRosterStudents,
            docenti: cDocenti,
            viandanti: cViandanti,
            scuoleSetSize: scuoleSet.size,
            total: hubUsers.length
        };

        return result;
    },

    parseRestFields: function(fields) {
        const result = {};
        if (!fields) return result;
        for (const [key, valObj] of Object.entries(fields)) {
            if (valObj.stringValue !== undefined) result[key] = valObj.stringValue;
            else if (valObj.integerValue !== undefined) result[key] = parseInt(valObj.integerValue);
            else if (valObj.doubleValue !== undefined) result[key] = parseFloat(valObj.doubleValue);
            else if (valObj.booleanValue !== undefined) result[key] = valObj.booleanValue;
            else if (valObj.timestampValue !== undefined) result[key] = valObj.timestampValue;
            else if (valObj.nullValue !== undefined) result[key] = null;
            else if (valObj.arrayValue !== undefined) {
                result[key] = (valObj.arrayValue.values || []).map(v => {
                    if (v.stringValue !== undefined) return v.stringValue;
                    if (v.integerValue !== undefined) return parseInt(v.integerValue);
                    if (v.booleanValue !== undefined) return v.booleanValue;
                    if (v.mapValue !== undefined) return CrossProjectsService.parseRestFields(v.mapValue.fields);
                    return v;
                });
            } else if (valObj.mapValue !== undefined) {
                result[key] = CrossProjectsService.parseRestFields(valObj.mapValue.fields);
            }
        }
        return result;
    },

    fetchCollectionREST: async function(projectId, apiKey, collectionName, appName = "[DEFAULT]") {
        try {
            let validToken = null;
            const tokenManager = await CrossProjectsService.getAuthTokenFromDB(apiKey, appName);
            if (tokenManager && tokenManager.refreshToken) {
                try {
                    const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `grant_type=refresh_token&refresh_token=${tokenManager.refreshToken}`
                    });
                    const refreshData = await refreshRes.json();
                    validToken = refreshData.id_token || tokenManager.accessToken;
                } catch(err) {
                    validToken = tokenManager.accessToken;
                }
            }
            if (!validToken && window.fbAuth && window.fbAuth.currentUser) {
                validToken = await window.fbAuth.currentUser.getIdToken(true).catch(() => null);
            }

            const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?pageSize=1000`, {
                headers: validToken ? { Authorization: `Bearer ${validToken}` } : {}
            });
            if (!res.ok) {
                // Secondo tentativo senza header o con token default se fallito
                if (validToken) {
                    const res2 = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?pageSize=1000`);
                    if (res2.ok) {
                        const data2 = await res2.json();
                        if (data2.documents && Array.isArray(data2.documents)) {
                            return data2.documents.map(doc => ({
                                id: doc.name.split('/').pop(),
                                data: CrossProjectsService.parseRestFields(doc.fields)
                            }));
                        }
                    }
                }
                return [];
            }
            const data = await res.json();
            if (!data.documents || !Array.isArray(data.documents)) return [];
            return data.documents.map(doc => ({
                id: doc.name.split('/').pop(),
                data: CrossProjectsService.parseRestFields(doc.fields)
            }));
        } catch(e) {
            console.warn(`Errore lettura REST per ${projectId}/${collectionName}:`, e);
            return [];
        }
    },

    migrateAllDataToHub: async function(onLog, onProgress) {
        const log = (msg) => {
            console.log(msg);
            if (typeof onLog === 'function') onLog(msg);
        };

        if (!window.fbDb || !window.fbDb.hub) {
            log("❌ Errore: Connessione al database Hub non disponibile.");
            return { success: false, error: "Database Hub non connesso" };
        }

        const targetDb = window.fbDb.hub;

        const games = [
            {
                name: "La Rotta degli Eroi",
                key: "eroi",
                appName: "Eroi",
                projectId: "la-rotta-degli-eroi",
                apiKey: "AIzaSyCVCg9G6RbDDYMoQ0oWCs2Z9-1iFBSZZ5A",
                prefix: "eroi_",
                collections: ['users', 'classes', 'progress', 'pending_requests', 'archives', 'settings', 'games_status']
            },
            {
                name: "Palestra di Riflessione",
                key: "palestra",
                appName: "Palestra",
                projectId: "palestra-riflessione",
                apiKey: "AIzaSyC9WhGYaWyaJtqDHhKhii5yhnP363SczJo",
                prefix: "palestra_",
                collections: ['users', 'classes', 'progress', 'history', 'test_assignments', 'archives', 'settings', 'games_status']
            },
            {
                name: "La Corte della Commedia",
                key: "corte",
                appName: "Commedia",
                projectId: "la-corte-della-commedia",
                apiKey: "AIzaSyCgz52XehTx0qQQ1MkKtTnIM5LmjJKcPls",
                prefix: "corte_",
                collections: ['users', 'classes', 'courts', 'cases', 'sentences', 'verdicts', 'xpLogs', 'progress', 'campaigns', 'missions_completed', 'activities', 'badges', 'levels', 'questions', 'characters', 'cantos', 'missions', 'settings', 'games_status', 'corte_cases', 'corte_verdicts', 'corte_archives']
            },
            {
                name: "FantaLetteratura",
                key: "fanta",
                appName: "Fanta",
                projectId: "fantaletteratura-a7ff1",
                apiKey: "AIzaSyB3wKx8ssbZVMtbiH5vbDDvAEgwzZcfRVQ",
                prefix: "fanta_",
                collections: ['users', 'teams', 'missions', 'tournaments', 'invites', 'pending_requests', 'archives', 'minigame_logs', 'games_status', 'calendar', 'settings']
            },
            {
                name: "Ops! Operazione Storia",
                key: "ops",
                appName: "Ops",
                projectId: "ops-storia",
                apiKey: "AIzaSyD_8P554hXaLhzQC8cTpIggkQtUrmK4xVY",
                prefix: "ops_",
                collections: ['users', 'classes', 'progress', 'archives', 'settings', 'game_sessions']
            },
            {
                name: "L'Oratore",
                key: "oratore",
                appName: "Oratore",
                projectId: "l-oratore",
                prefix: "oratore_",
                collections: ['users', 'settings', 'hub_didactic_overrides']
            }
        ];

        let grandTotal = 0;
        const resultsByGame = {};

        log("🚀 AVVIO MIGRAZIONE TOTALE DATABASE NELL'HUB CENTRALE (prof-memmo-hub)...");

        for (let gIdx = 0; gIdx < games.length; gIdx++) {
            const g = games[gIdx];
            log(`\n=======================================================`);
            log(`📦 [${gIdx + 1}/${games.length}] Elaborazione: ${g.name} (${g.projectId})`);
            log(`=======================================================`);

            let gameTotal = 0;

            for (const coll of g.collections) {
                const targetColl = `${g.prefix}${coll}`;
                log(`🔍 Lettura '${coll}' da ${g.projectId}...`);

                const docs = await CrossProjectsService.fetchCollectionREST(g.projectId, g.apiKey, coll, g.appName);

                if (docs.length === 0) {
                    log(`   - Nessun documento trovato in '${coll}' (vuota o assente).`);
                    continue;
                }

                log(`   - Trovati ${docs.length} documenti. Scrittura in '${targetColl}'...`);
                let batch = targetDb.batch();
                let count = 0;
                const batchSize = 100;

                for (let i = 0; i < docs.length; i++) {
                    const item = docs[i];
                    const docRef = targetDb.collection(targetColl).doc(item.id);
                    batch.set(docRef, item.data, { merge: true });
                    count++;
                    gameTotal++;
                    grandTotal++;

                    if (count % batchSize === 0) {
                        await batch.commit();
                        log(`   - Salvati ${count}/${docs.length} doc in '${targetColl}'...`);
                        batch = targetDb.batch();
                    }
                }

                if (count % batchSize !== 0) {
                    await batch.commit();
                }

                log(`   ✅ '${targetColl}' completata (${count} doc migrati).`);
            }

            resultsByGame[g.key] = gameTotal;
            log(`🏁 Completato ${g.name}: ${gameTotal} documenti migrati.`);

            if (typeof onProgress === 'function') {
                onProgress(Math.round(((gIdx + 1) / games.length) * 100));
            }
        }

        log(`\n🎉🎉 MIGRAZIONE GENERALE COMPLETATA CON SUCCESSO! 🎉🎉`);
        log(`📊 Totale documenti migrati in prof-memmo-hub: ${grandTotal}`);

        return {
            success: true,
            totalDocs: grandTotal,
            byGame: resultsByGame
        };
    }
};

window.CrossProjectsService = CrossProjectsService;
