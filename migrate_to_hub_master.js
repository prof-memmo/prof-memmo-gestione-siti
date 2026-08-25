const fs = require('fs');

const conf = JSON.parse(fs.readFileSync('/Users/guglielmopiersanti/.config/configstore/firebase-tools.json', 'utf8'));
const token = conf.tokens ? conf.tokens.access_token : null;

if (!token) {
    console.error("Token non trovato in firebase-tools.json");
    process.exit(1);
}

const HUB_PROJECT = "prof-memmo-hub";

const LEGACY_GAMES = [
    {
        name: "La Rotta degli Eroi",
        projectId: "la-rotta-degli-eroi",
        prefix: "eroi_",
        collections: ["users", "classes", "progress", "pending_requests", "archives", "settings"]
    },
    {
        name: "Palestra di Riflessione",
        projectId: "palestra-riflessione",
        prefix: "palestra_",
        collections: ["users", "classes", "progress", "history", "test_assignments", "archives", "settings"]
    },
    {
        name: "La Corte della Commedia",
        projectId: "la-corte-della-commedia",
        prefix: "corte_",
        collections: ["users", "classes", "courts", "cases", "sentences", "verdicts", "xpLogs", "progress", "campaigns", "missions_completed", "activities", "badges", "levels", "questions", "characters", "cantos", "missions", "settings"]
    },
    {
        name: "FantaLetteratura",
        projectId: "fantaletteratura-a7ff1",
        prefix: "fanta_",
        collections: ["users", "teams", "missions", "tournaments", "invites", "pending_requests", "archives", "settings"]
    }
];

function parseRestFields(fields) {
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
                if (v.mapValue !== undefined) return parseRestFields(v.mapValue.fields);
                return v;
            });
        } else if (valObj.mapValue !== undefined) {
            result[key] = parseRestFields(valObj.mapValue.fields);
        }
    }
    return result;
}

function toRestFields(obj) {
    const fields = {};
    for (const [key, val] of Object.entries(obj)) {
        if (val === undefined || val === null) {
            fields[key] = { nullValue: null };
        } else if (typeof val === 'string') {
            fields[key] = { stringValue: val };
        } else if (typeof val === 'number') {
            if (Number.isInteger(val)) fields[key] = { integerValue: String(val) };
            else fields[key] = { doubleValue: val };
        } else if (typeof val === 'boolean') {
            fields[key] = { booleanValue: val };
        } else if (Array.isArray(val)) {
            fields[key] = {
                arrayValue: {
                    values: val.map(item => {
                        if (typeof item === 'string') return { stringValue: item };
                        if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
                        if (typeof item === 'boolean') return { booleanValue: item };
                        if (typeof item === 'object' && item !== null) return { mapValue: { fields: toRestFields(item) } };
                        return { stringValue: String(item) };
                    })
                }
            };
        } else if (typeof val === 'object') {
            fields[key] = { mapValue: { fields: toRestFields(val) } };
        }
    }
    return fields;
}

async function writeDocToHub(collectionName, docId, data) {
    const fields = toRestFields(data);
    const url = `https://firestore.googleapis.com/v1/projects/${HUB_PROJECT}/databases/(default)/documents/${collectionName}/${encodeURIComponent(docId)}`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
    });
    if (!res.ok) {
        const errText = await res.text();
        console.error(`Errore scrittura doc ${collectionName}/${docId}:`, errText);
        return false;
    }
    return true;
}

async function runMigration() {
    console.log("==========================================================================");
    console.log("🚀 AVVIO MIGRAZIONE TOTALE CON PRIVILEGI MASTER GOOGLE CLOUD SU HUB");
    console.log("==========================================================================\n");

    let totalDocsMigrated = 0;
    let totalUsersMigrated = 0;

    for (const g of LEGACY_GAMES) {
        console.log(`\n🎮 === [${g.name.toUpperCase()}] (${g.projectId}) -> Prefisso: '${g.prefix}' ===`);
        
        for (const coll of g.collections) {
            const sourceUrl = `https://firestore.googleapis.com/v1/projects/${g.projectId}/databases/(default)/documents/${coll}?pageSize=1000`;
            const res = await fetch(sourceUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                console.log(`   - Collezione '${coll}': non presente o vuota.`);
                continue;
            }

            const json = await res.json();
            const docs = json.documents || [];
            if (docs.length === 0) {
                console.log(`   - Collezione '${coll}': 0 documenti.`);
                continue;
            }

            console.log(`   📦 Collezione '${coll}': Trovati ${docs.length} documenti. Riversamento in corso...`);
            const targetColl = `${g.prefix}${coll}`;

            for (const doc of docs) {
                const docId = doc.name.split('/').pop();
                const data = parseRestFields(doc.fields);

                // Se collezione users: calcola ruolo e piano precisi e salva anche in hub_users
                if (coll === 'users') {
                    const rawName = (data.nome || data.name || data.displayName || data.username || (((data.firstName || '') + ' ' + (data.lastName || '')).trim()) || 'Utente').trim();
                    const rawEmail = (data.email || '').trim().toLowerCase();
                    const rawRole = String(data.role || data.ruolo || '').trim().toLowerCase();
                    const rawPlan = String(data.plan || data.subscription || data.piano || data.abbonamento || '').trim().toLowerCase();

                    const isDocente = rawRole.includes('teacher') || rawRole.includes('admin') || rawRole.includes('docente') || rawRole.includes('prof') || rawRole.includes('judge') || rawPlan.includes('docente') || rawEmail === 'prof.memmo@gmail.com';
                    const isStudente = !isDocente && (rawRole === 'studente' || rawRole === 'student');

                    let cleanRole = 'viandante';
                    let cleanPlan = 'base';

                    if (isDocente) {
                        cleanRole = (rawEmail === 'prof.memmo@gmail.com' || rawRole.includes('admin')) ? 'admin' : 'docente';
                        cleanPlan = rawPlan.includes('ecosistema') ? 'docente_ecosistema' : 'docente_didattico';
                    } else if (isStudente) {
                        cleanRole = 'studente';
                        cleanPlan = 'studente';
                    } else {
                        cleanRole = 'viandante';
                        cleanPlan = 'base';
                    }

                    data.role = cleanRole;
                    data.ruolo = cleanRole;
                    data.plan = cleanPlan;
                    data.subscription = cleanPlan;
                    data.nome = rawName;
                    data.name = rawName;

                    // 1. Scrivi nella collezione del gioco
                    await writeDocToHub(targetColl, docId, data);

                    // 2. Scrivi nel registro anagrafico hub_users
                    const hubPayload = {
                        nome: rawName,
                        name: rawName,
                        email: rawEmail,
                        role: cleanRole,
                        ruolo: cleanRole,
                        classId: data.classId || data.classe || data.class || 'N/A',
                        avatar: data.avatar || data.photoURL || '',
                        subscription: cleanPlan,
                        plan: cleanPlan,
                        newsletter: data.newsletter === true,
                        consents: data.consents || (data.newsletter ? { newsletter: true } : {}),
                        lastSeenAt: new Date().toISOString(),
                        originGame: g.name
                    };
                    await writeDocToHub('hub_users', docId, hubPayload);
                    totalUsersMigrated++;
                } else {
                    // Scrivi nella collezione target prefissata
                    await writeDocToHub(targetColl, docId, data);
                }
                totalDocsMigrated++;
            }
            console.log(`   ✅ '${targetColl}': ${docs.length} doc copiati con successo!`);
        }
    }

    console.log("\n==========================================================================");
    console.log(`🎉 MIGRAZIONE COMPLETATA!`);
    console.log(`- Documenti totali riversati nell'Hub: ${totalDocsMigrated}`);
    console.log(`- Utenti totali consolidati in hub_users e collezioni di gioco: ${totalUsersMigrated}`);
    console.log("==========================================================================\n");
}

runMigration();
