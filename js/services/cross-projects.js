// --- Cross Projects Service ---
// Gestisce il recupero dati da tutti i database collegati tramite REST API

const CrossProjectsService = {
    getAuthTokenFromDB: async function(apiKey, appName = "[DEFAULT]") {
        return new Promise((resolve) => {
            const req = indexedDB.open('firebaseLocalStorageDb');
            req.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('firebaseLocalStorage')) return resolve(null);
                const tx = db.transaction('firebaseLocalStorage', 'readonly');
                const store = tx.objectStore('firebaseLocalStorage');
                const getReq = store.get(`firebase:authUser:${apiKey}:${appName}`);
                getReq.onsuccess = (e2) => {
                    if (e2.target.result && e2.target.result.value.stsTokenManager) {
                        resolve(e2.target.result.value.stsTokenManager);
                    } else {
                        // Fallback: try [DEFAULT] if the appName wasn't found
                        if (appName !== "[DEFAULT]") {
                            const fallbackReq = store.get(`firebase:authUser:${apiKey}:[DEFAULT]`);
                            fallbackReq.onsuccess = (e3) => {
                                if (e3.target.result && e3.target.result.value.stsTokenManager) {
                                    resolve(e3.target.result.value.stsTokenManager);
                                } else {
                                    resolve(null);
                                }
                            };
                            fallbackReq.onerror = () => resolve(null);
                        } else {
                            resolve(null);
                        }
                    }
                };
                getReq.onerror = () => resolve(null);
            };
            req.onerror = () => resolve(null);
        });
    },

    fetchUsersREST: async function(projectId, apiKey, appName = "[DEFAULT]") {
        try {
            const tokenManager = await CrossProjectsService.getAuthTokenFromDB(apiKey, appName);
            if (!tokenManager || !tokenManager.refreshToken) return [];
            
            // Forza il refresh del token per evitare errori 401/403 (token scaduto dopo 1h)
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
        } catch(e) {
            console.error("REST Fetch error for " + projectId, e);
            return [];
        }
    },

    fetchAllUsers: async function() {
        let result = {
            users: [],
            stats: { eroi: 0, commedia: 0, fanta: 0, palestra: 0, ops: 0, studenti: 0, docenti: 0, viandanti: 0, scuoleSetSize: 0, total: 0 }
        };
        
        let eroiUsers = [];
        let commediaUsers = [];
        let fantaUsers = [];
        let palestraUsers = [];
        let opsUsers = [];
        let hubUsers = [];

        // 1. Fetch diretto dalle collezioni già presenti in Hub Centrale
        if (window.fbDb && window.fbDb.hub) {
            // FantaLetteratura
            try {
                const snapFanta = await window.fbDb.hub.collection("fanta_users").get();
                snapFanta.forEach(doc => {
                    const data = doc.data();
                    fantaUsers.push({
                        id: doc.id,
                        nome: (data.name || data.nome || data.displayName || data.username || 'Utente Fanta'),
                        email: data.email || (doc.id.includes('@') ? doc.id : ''),
                        ruolo: data.role || data.ruolo || 'studente',
                        classe: data.teamId || data.classe || data.class || 'N/A',
                        avatar: data.avatar || data.photoURL || data.foto || '',
                        dataValue: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : new Date(data.createdAt).getTime()) : 0,
                        gioco: 'Fantaletteratura', giocoColor: '#a855f7', giocoIcon: 'fa-dragon',
                        plan: data.subscription || data.abbonamento || data.plan || (data.role === 'studente' ? 'studente' : 'base')
                    });
                });
            } catch(e) { console.warn("Fanta Hub fetch error:", e); }

            // La Rotta degli Eroi
            try {
                const snapEroi = await window.fbDb.hub.collection("eroi_users").get();
                snapEroi.forEach(doc => {
                    const data = doc.data();
                    eroiUsers.push({
                        id: doc.id,
                        nome: (data.name || data.nome || data.displayName || 'Utente Eroi'),
                        email: data.email || (doc.id.includes('@') ? doc.id : ''),
                        ruolo: data.role || data.ruolo || 'studente',
                        classe: data.classId || data.classe || data.class || 'N/A',
                        avatar: data.avatar || data.photoURL || data.foto || '',
                        dataValue: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : new Date(data.createdAt).getTime()) : 0,
                        gioco: 'La Rotta degli Eroi', giocoColor: '#3b82f6', giocoIcon: 'fa-ship',
                        plan: data.subscription || data.abbonamento || data.plan || (data.role === 'studente' ? 'studente' : 'base')
                    });
                });
            } catch(e) { console.warn("Eroi Hub fetch error:", e); }

            // Palestra di Riflessione
            try {
                const snapPal = await window.fbDb.hub.collection("palestra_users").get();
                snapPal.forEach(doc => {
                    const data = doc.data();
                    palestraUsers.push({
                        id: doc.id,
                        nome: (data.name || data.nome || data.displayName || 'Utente Palestra'),
                        email: data.email || (doc.id.includes('@') ? doc.id : ''),
                        ruolo: data.role || data.ruolo || 'studente',
                        classe: data.classId || data.classe || data.class || 'N/A',
                        avatar: data.avatar || data.photoURL || data.foto || '',
                        dataValue: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : new Date(data.createdAt).getTime()) : 0,
                        gioco: 'Palestra di Riflessione', giocoColor: '#22c55e', giocoIcon: 'fa-brain',
                        plan: data.subscription || data.abbonamento || data.plan || (data.role === 'studente' ? 'studente' : 'base')
                    });
                });
            } catch(e) { console.warn("Palestra Hub fetch error:", e); }

            // La Corte della Commedia
            try {
                const snapCommedia = await window.fbDb.hub.collection("corte_users").get();
                snapCommedia.forEach(doc => {
                    const data = doc.data();
                    commediaUsers.push({
                        id: doc.id,
                        nome: (data.name || data.nome || data.displayName || 'Utente Commedia'),
                        email: data.email || (doc.id.includes('@') ? doc.id : ''),
                        ruolo: data.role || data.ruolo || 'studente',
                        classe: data.classId || data.classe || data.class || 'N/A',
                        avatar: data.avatar || data.photoURL || data.foto || '',
                        dataValue: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : new Date(data.createdAt).getTime()) : 0,
                        gioco: 'La Corte della Commedia', giocoColor: '#ef4444', giocoIcon: 'fa-book-open',
                        plan: data.subscription || data.abbonamento || data.plan || (data.role === 'studente' ? 'studente' : 'base')
                    });
                });
            } catch(e) { console.warn("Commedia Hub fetch error:", e); }

            // Ops! Operazione Storia
            try {
                const snapOps = await window.fbDb.hub.collection("ops_users").get();
                snapOps.forEach(doc => {
                    const data = doc.data();
                    opsUsers.push({
                        id: doc.id,
                        nome: (data.name || data.nome || data.displayName || 'Utente Ops'),
                        email: data.email || (doc.id.includes('@') ? doc.id : ''),
                        ruolo: data.role || data.ruolo || 'studente',
                        classe: data.classId || data.classe || data.class || 'N/A',
                        avatar: data.avatar || data.photoURL || data.foto || '',
                        dataValue: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : new Date(data.createdAt).getTime()) : 0,
                        gioco: 'Ops! Operazione Storia', giocoColor: '#eab308', giocoIcon: 'fa-clock-rotate-left',
                        plan: data.subscription || data.abbonamento || data.plan || (data.role === 'studente' ? 'studente' : 'base')
                    });
                });
            } catch(e) { console.warn("Ops Hub fetch error:", e); }

            // Hub Users
            try {
                const snapHub = await window.fbDb.hub.collection("hub_users").get();
                snapHub.forEach(doc => {
                    const data = doc.data();
                    const nomeStr = data.anagrafica ? (data.anagrafica.nome + " " + (data.anagrafica.cognome || "")) : (data.nome || data.name || data.displayName || 'Utente');
                    hubUsers.push({
                        id: doc.id,
                        nome: nomeStr.trim() || 'Utente',
                        email: data.email || '',
                        ruolo: data.role || data.ruolo || 'studente',
                        statusAccount: data.statusAccount || data.statoAccount || 'active',
                        classe: data.classId || data.class || 'N/A',
                        avatar: data.avatar || data.photoURL || data.foto || '',
                        dataValue: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : new Date(data.createdAt).getTime()) : (data.joinedAt ? (data.joinedAt.toMillis ? data.joinedAt.toMillis() : new Date(data.joinedAt).getTime()) : 0),
                        gioco: 'Hub', giocoColor: '#6366f1', giocoIcon: 'fa-globe',
                        plan: data.subscription || data.abbonamento || (data.role === 'studente' ? 'studente' : 'base')
                    });
                });
            } catch(e) { console.warn("Hub users fetch error:", e); }
        }

        // 2. Fallback REST dai vecchi server solo se il conteggio è 0
        if (eroiUsers.length === 0) {
            try {
                const eroiRestUsers = await this.fetchUsersREST("la-rotta-degli-eroi", "AIzaSyCVCg9G6RbDDYMoQ0oWCs2Z9-1iFBSZZ5A", "Eroi");
                eroiRestUsers.forEach(u => { eroiUsers.push({ ...u, gioco: 'La Rotta degli Eroi', giocoColor: '#3b82f6', giocoIcon: 'fa-ship' }); });
            } catch(e) {}
        }
        if (commediaUsers.length === 0) {
            try {
                const commediaRestUsers = await this.fetchUsersREST("la-corte-della-commedia", "AIzaSyCgz52XehTx0qQQ1MkKtTnIM5LmjJKcPls", "Commedia");
                commediaRestUsers.forEach(u => { commediaUsers.push({ ...u, gioco: 'La Corte della Commedia', giocoColor: '#ef4444', giocoIcon: 'fa-book-open' }); });
            } catch(e) {}
        }
        if (fantaUsers.length === 0) {
            try {
                const fantaRestUsers = await this.fetchUsersREST("fantaletteratura-a7ff1", "AIzaSyB3wKx8ssbZVMtbiH5vbDDvAEgwzZcfRVQ", "Fanta");
                fantaRestUsers.forEach(u => { fantaUsers.push({ ...u, gioco: 'Fantaletteratura', giocoColor: '#a855f7', giocoIcon: 'fa-dragon' }); });
            } catch(e) {}
        }
        if (palestraUsers.length === 0) {
            try {
                const palestraRestUsers = await this.fetchUsersREST("palestra-riflessione", "AIzaSyC9WhGYaWyaJtqDHhKhii5yhnP363SczJo", "Palestra");
                palestraRestUsers.forEach(u => { palestraUsers.push({ ...u, gioco: 'Palestra di Riflessione', giocoColor: '#22c55e', giocoIcon: 'fa-brain' }); });
            } catch(e) {}
        }
        if (opsUsers.length === 0) {
            try {
                const opsRestUsers = await this.fetchUsersREST("ops-storia", "AIzaSyD_8P554hXaLhzQC8cTpIggkQtUrmK4xVY", "Ops");
                opsRestUsers.forEach(u => { opsUsers.push({ ...u, gioco: 'Ops! Operazione Storia', giocoColor: '#eab308', giocoIcon: 'fa-clock-rotate-left' }); });
            } catch(e) {}
        }

        const allUsers = [...eroiUsers, ...commediaUsers, ...fantaUsers, ...palestraUsers, ...opsUsers, ...hubUsers];
        
        // Deduplicazione
        const uniqueUsersMap = new Map();
        allUsers.forEach(u => {
            if (u.email && String(u.email).trim() !== '') {
                const emailKey = String(u.email).trim().toLowerCase();
                if (uniqueUsersMap.has(emailKey)) {
                    let existing = uniqueUsersMap.get(emailKey);
                    const curGioco = String(existing.gioco || '');
                    const newGioco = String(u.gioco || '');
                    if (!curGioco.includes(newGioco)) {
                        existing.gioco = curGioco ? (curGioco + " / " + newGioco) : newGioco;
                    }
                    const exNome = String(existing.nome || '');
                    const uNome = String(u.nome || '');
                    if ((exNome === 'Anonimo' || exNome === '' || exNome.startsWith('Utente')) && uNome && uNome !== 'Anonimo' && !uNome.startsWith('Utente')) {
                        existing.nome = uNome;
                    }
                    if (!existing.avatar && u.avatar) {
                        existing.avatar = u.avatar;
                    }
                    if (u.plan && u.plan !== 'base') {
                        existing.plan = u.plan;
                    }
                    // Se l'utente è docente in uno dei giochi o ha piano docente, impostalo come docente
                    const uRole = String(u.ruolo || '').toLowerCase();
                    const uPlan = String(u.plan || '').toLowerCase();
                    if (uRole.includes('teacher') || uRole.includes('admin') || uRole.includes('docente') || uRole.includes('prof') || uRole.includes('judge') || uPlan.includes('docente')) {
                        existing.ruolo = 'docente';
                    }
                } else {
                    uniqueUsersMap.set(emailKey, {...u});
                }
            } else {
                uniqueUsersMap.set(u.id, {...u});
            }
        });
        
        const deduplicatedUsers = Array.from(uniqueUsersMap.values());
        deduplicatedUsers.sort((a, b) => (b.dataValue || 0) - (a.dataValue || 0));

        let cStudenti = 0, cDocenti = 0, cViandanti = 0;
        const scuoleSet = new Set();
        deduplicatedUsers.forEach(u => {
            const r = String(u.ruolo || '').toLowerCase();
            const p = String(u.plan || '').toLowerCase();
            const e = String(u.email || '').toLowerCase();

            const isDoc = r.includes('teacher') || r.includes('admin') || r.includes('docente') || r.includes('prof') || r.includes('judge') || p.includes('docente') || p.includes('didattic') || p.includes('ecosistema') || e === 'prof.memmo@gmail.com';
            const isViand = !isDoc && (r.includes('viandante') || r.includes('forestiero') || r.includes('amico') || r.includes('guest') || r.includes('pellegrino') || p.includes('viandante'));

            if (isDoc) cDocenti++;
            else if (isViand) cViandanti++;
            else cStudenti++;

            let c = String(u.classe || '').toUpperCase().trim();
            let s = String(u.scuola || u.school || '').trim();
            if (s && s.toUpperCase() !== 'N/A' && s.toUpperCase() !== 'N/D') {
                scuoleSet.add(s.toLowerCase());
            } else if (c && c !== 'N/A' && c !== '' && c !== 'TEST' && c !== 'N/D') {
                scuoleSet.add(c.toLowerCase());
            }
        });

        result.users = deduplicatedUsers;
        result.stats = {
            eroi: eroiUsers.length,
            commedia: commediaUsers.length,
            fanta: fantaUsers.length,
            palestra: palestraUsers.length,
            ops: opsUsers.length,
            studenti: cStudenti,
            docenti: cDocenti,
            viandanti: cViandanti,
            scuoleSetSize: scuoleSet.size,
            total: deduplicatedUsers.length
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
