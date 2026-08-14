const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// ============================================================================
// SCRIPT DI MIGRAZIONE UNIVERSALE PER I GIOCHI DELL'ECOSISTEMA PROF. MEMMO
// ============================================================================
// Uso:
// node migrate_game.js --game=eroi --oldKey=/path/to/old-service-account.json --hubKey=/path/to/hub-service-account.json [--dry-run | --migrate]
//
// Prefissi supportati:
//   - eroi -> collezioni prefixed with 'eroi_'
//   - palestra -> collezioni prefixed with 'palestra_'
//   - corte -> collezioni prefixed with 'corte_'
//   - fanta -> collezioni prefixed with 'fanta_'
//   - ops -> collezioni prefixed with 'ops_'

const args = process.argv.slice(2);
const gameArg = args.find(a => a.startsWith('--game='));
const oldKeyArg = args.find(a => a.startsWith('--oldKey='));
const hubKeyArg = args.find(a => a.startsWith('--hubKey='));

const game = gameArg ? gameArg.split('=')[1] : process.env.GAME_NAME;
const oldKeyPath = oldKeyArg ? oldKeyArg.split('=')[1] : process.env.OLD_KEY_PATH;
const newKeyPath = hubKeyArg ? hubKeyArg.split('=')[1] : process.env.HUB_KEY_PATH;

if (!game || !oldKeyPath || !newKeyPath) {
    console.log(`
Uso:
  node migrate_game.js --game=<eroi|palestra|corte|fanta|ops> --oldKey=<path_vecchia_chiave.json> --hubKey=<path_hub_chiave.json> [--dry-run | --migrate]

Oppure imposta le variabili d'ambiente:
  export GAME_NAME=eroi
  export OLD_KEY_PATH=/path/to/old.json
  export HUB_KEY_PATH=/path/to/hub.json
`);
    process.exit(1);
}

const prefix = `${game}_`;

const oldServiceAccount = require(path.resolve(oldKeyPath));
const newServiceAccount = require(path.resolve(newKeyPath));

// Inizializza l'app vecchia (Sola Lettura)
const oldApp = initializeApp({
    credential: cert(oldServiceAccount)
}, `oldApp_${game}`);

// Inizializza l'app Hub (Destinazione)
const newApp = initializeApp({
    credential: cert(newServiceAccount)
}, `hubApp_${game}`);

const oldDb = getFirestore(oldApp);
const newDb = getFirestore(newApp);

async function runDryRun() {
    console.log("\n=======================================================");
    console.log(`🔍 AVVIO DRY-RUN PER [${game.toUpperCase()}] -> Prefisso destinazione: '${prefix}'`);
    console.log("=======================================================\n");

    console.log("1. Analisi delle collezioni nel vecchio Firebase...");
    const oldCollections = await oldDb.listCollections();
    const oldCollectionNames = oldCollections.map(c => c.id);
    
    console.log(`\nCollezioni trovate nel vecchio DB (${oldCollectionNames.length}):`);
    oldCollectionNames.forEach(c => console.log(` - ${c}  --->  ${prefix}${c}`));

    console.log("\n2. Conteggio documenti...");
    let totalDocs = 0;
    
    for (const collName of oldCollectionNames) {
        const snap = await oldDb.collection(collName).get();
        const targetCollName = `${prefix}${collName}`;
        console.log(`\n📦 Collezione: '${collName}' -> Verrà migrata in: '${targetCollName}'`);
        console.log(`   - Documenti da migrare: ${snap.size}`);
        totalDocs += snap.size;
        
        let sampleId = snap.size > 0 ? snap.docs[0].id : 'N/A';
        console.log(`   - Esempio ID documento: ${sampleId}`);
    }
    
    console.log("\n=======================================================");
    console.log(`🏁 DRY-RUN COMPLETATO. Totale documenti da copiare per ${game}: ${totalDocs}`);
    console.log(`I dati verranno copiati su prof-memmo-hub con il prefisso '${prefix}' senza toccare altre collezioni.`);
    console.log("Per avviare la migrazione reale, aggiungi --migrate");
    console.log("=======================================================\n");
}

async function runMigrate() {
    console.log("\n=======================================================");
    console.log(`🚀 AVVIO MIGRAZIONE REALE PER [${game.toUpperCase()}]`);
    console.log("=======================================================\n");

    const oldCollections = await oldDb.listCollections();
    let totalMigrated = 0;

    for (const coll of oldCollections) {
        const collName = coll.id;
        const targetCollName = `${prefix}${collName}`;
        console.log(`\n🔄 Migrazione di '${collName}' -> '${targetCollName}' in corso...`);
        
        const snap = await coll.get();
        if (snap.empty) {
            console.log(`   - Collezione vuota, skippata.`);
            continue;
        }

        let batch = newDb.batch();
        let count = 0;
        let batchCount = 0;

        for (const doc of snap.docs) {
            const targetRef = newDb.collection(targetCollName).doc(doc.id);
            // Upsert dei dati originali
            batch.set(targetRef, doc.data(), { merge: false });
            count++;
            
            if (count % 400 === 0) {
                await batch.commit();
                batchCount++;
                console.log(`   - Commit batch #${batchCount} (${count} documenti)...`);
                batch = newDb.batch();
            }
        }
        
        if (count % 400 !== 0) {
            await batch.commit();
            console.log(`   - Commit batch finale (${count} documenti totali).`);
        }
        
        totalMigrated += count;
        console.log(`✅ Completata migrazione di ${collName}: ${count} doc.`);
    }

    console.log("\n=======================================================");
    console.log(`🏁 MIGRAZIONE REALE COMPLETATA PER [${game.toUpperCase()}]. Documenti totali migrati: ${totalMigrated}`);
    console.log("=======================================================\n");
}

async function main() {
    if (args.includes('--dry-run')) {
        await runDryRun();
    } else if (args.includes('--migrate')) {
        await runMigrate();
    } else {
        await runDryRun();
    }
    process.exit(0);
}

main().catch(err => {
    console.error("❌ ERRORE:", err);
    process.exit(1);
});
