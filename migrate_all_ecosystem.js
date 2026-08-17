const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// Path alle chiavi di servizio nei Download
const HUB_KEY_PATH = '/Users/guglielmopiersanti/Downloads/prof-memmo-hub-firebase-adminsdk-fbsvc-cc91dd6fdf.json';

const GAMES = [
    {
        key: 'palestra',
        name: 'Palestra di Riflessione',
        projectId: 'palestra-riflessione',
        prefix: 'palestra_',
        keyPath: '/Users/guglielmopiersanti/Downloads/palestra-riflessione-firebase-adminsdk-fbsvc-663581a6a1.json'
    },
    {
        key: 'eroi',
        name: 'La Rotta degli Eroi',
        projectId: 'la-rotta-degli-eroi',
        prefix: 'eroi_',
        keyPath: '/Users/guglielmopiersanti/Downloads/la-rotta-degli-eroi-firebase-adminsdk-fbsvc-484ed8fd16.json'
    },
    {
        key: 'corte',
        name: 'La Corte della Commedia',
        projectId: 'la-corte-della-commedia',
        prefix: 'corte_',
        keyPath: '/Users/guglielmopiersanti/Downloads/la-corte-della-commedia-firebase-adminsdk-fbsvc-0d0010a1e1.json'
    },
    {
        key: 'ops',
        name: 'Ops! Operazione Storia',
        projectId: 'ops-storia',
        prefix: 'ops_',
        keyPath: '/Users/guglielmopiersanti/Downloads/ops-storia-firebase-adminsdk-fbsvc-b6d27b5ebc.json'
    }
];

// Inizializza App Hub Centrale
const hubApp = initializeApp({
    credential: cert(require(HUB_KEY_PATH))
}, 'hub_master_app');
const hubDb = getFirestore(hubApp);

async function runDryRun() {
    console.log("===============================================================================");
    console.log("🔍 AVVIO DRY-RUN GENERALE: ANALISI COLLEZIONI E DOCUMENTI DEI DATABASE LEGACY");
    console.log("===============================================================================\n");

    let totalEcosystemDocs = 0;

    for (const g of GAMES) {
        console.log(`\n-------------------------------------------------------------------------------`);
        console.log(`🎮 [${g.name.toUpperCase()}] (Project: ${g.projectId}) -> Target Prefisso: '${g.prefix}'`);
        console.log(`-------------------------------------------------------------------------------`);

        if (!fs.existsSync(g.keyPath)) {
            console.error(`❌ Chiave non trovata per ${g.name}: ${g.keyPath}`);
            continue;
        }

        const gameApp = initializeApp({
            credential: cert(require(g.keyPath))
        }, `dry_${g.key}_app`);
        const gameDb = getFirestore(gameApp);

        try {
            const collections = await gameDb.listCollections();
            console.log(`📁 Trovate ${collections.length} collezioni:`);

            let gameTotal = 0;
            for (const coll of collections) {
                const snap = await coll.get();
                const targetCollName = `${g.prefix}${coll.id}`;
                console.log(`   📦 Collezione '${coll.id}' -> Verrà migrata in '${targetCollName}' (${snap.size} documenti)`);
                gameTotal += snap.size;
            }
            console.log(`📊 Totale documenti per ${g.name}: ${gameTotal}`);
            totalEcosystemDocs += gameTotal;
        } catch (e) {
            console.error(`❌ Errore analisi ${g.name}:`, e.message);
        }
    }

    console.log("\n===============================================================================");
    console.log(`🏁 RIEPILOGO DRY-RUN: ${totalEcosystemDocs} DOCUMENTI TOTALI PRONTI ALLA MIGRAZIONE`);
    console.log("===============================================================================\n");
}

async function runMigrate() {
    console.log("===============================================================================");
    console.log("🚀 AVVIO MIGRAZIONE TOTALE NELL'HUB CENTRALE (prof-memmo-hub)");
    console.log("===============================================================================\n");

    let grandTotalMigrated = 0;
    const summary = {};

    for (const g of GAMES) {
        console.log(`\n===============================================================================`);
        console.log(`📦 MIGRAZIONE: ${g.name.toUpperCase()} (${g.projectId}) -> Prefisso '${g.prefix}'`);
        console.log(`===============================================================================`);

        try {
            const gameApp = initializeApp({
                credential: cert(require(g.keyPath))
            }, `mig_${g.key}_app`);
            const gameDb = getFirestore(gameApp);

            const collections = await gameDb.listCollections();
            let gameMigrated = 0;

            for (const coll of collections) {
                const sourceCollName = coll.id;
                const targetCollName = `${g.prefix}${sourceCollName}`;

                console.log(`\n🔄 Migrazione collezione '${sourceCollName}' -> '${targetCollName}'...`);
                const snap = await coll.get();

                if (snap.empty) {
                    console.log(`   - Collezione vuota, saltata.`);
                    continue;
                }

                let batch = hubDb.batch();
                let count = 0;
                let batchCount = 0;
                const batchSize = 300;

                for (const doc of snap.docs) {
                    const docData = doc.data();
                    const targetRef = hubDb.collection(targetCollName).doc(doc.id);
                    batch.set(targetRef, docData, { merge: true });
                    count++;

                    if (count % batchSize === 0) {
                        await batch.commit();
                        batchCount++;
                        console.log(`   - Commit batch #${batchCount} (${count}/${snap.size} documenti scritti)...`);
                        batch = hubDb.batch();
                    }
                }

                if (count % batchSize !== 0) {
                    await batch.commit();
                }

                gameMigrated += count;
                grandTotalMigrated += count;
                console.log(`   ✅ Completata '${targetCollName}': ${count} documenti riversati con successo.`);
            }

            summary[g.name] = gameMigrated;
            console.log(`\n🏁 Fine migrazione ${g.name}: ${gameMigrated} documenti totali.`);
        } catch (err) {
            console.error(`❌ Errore migrazione per ${g.name}:`, err.message);
            summary[g.name] = `Errore: ${err.message}`;
        }
    }

    console.log("\n===============================================================================");
    console.log("🎉🎉 MIGRAZIONE GENERALE ECOSISTEMA COMPLETATA CON SUCCESSO! 🎉🎉");
    console.log("===============================================================================");
    for (const [gName, count] of Object.entries(summary)) {
        console.log(` - ${gName}: ${count} documenti`);
    }
    console.log(`\n📊 TOTALE DOCUMENTI RIVERSATI NELL'HUB: ${grandTotalMigrated}`);
    console.log("===============================================================================\n");
}

const args = process.argv.slice(2);
if (args.includes('--migrate')) {
    runMigrate().then(() => process.exit(0)).catch(e => { console.error("❌ ERRORE FATALE:", e); process.exit(1); });
} else {
    runDryRun().then(() => process.exit(0)).catch(e => { console.error("❌ ERRORE FATALE:", e); process.exit(1); });
}
