const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURAZIONE CREDENZIALI
// Leggiamo i path alle chiavi JSON dalle variabili d'ambiente (sicurezza)
// ============================================================================
const oldKeyPath = process.env.FANTA_KEY_PATH;
const newKeyPath = process.env.HUB_KEY_PATH;

if (!oldKeyPath || !newKeyPath) {
    console.error("❌ ERRORE: Le variabili d'ambiente FANTA_KEY_PATH e HUB_KEY_PATH non sono impostate.");
    process.exit(1);
}

const oldServiceAccount = require(path.resolve(oldKeyPath));
const newServiceAccount = require(path.resolve(newKeyPath));

// Inizializza l'app vecchia (Sola Lettura)
const oldApp = initializeApp({
    credential: cert(oldServiceAccount)
}, 'oldApp');

// Inizializza l'app nuova (Hub)
const newApp = initializeApp({
    credential: cert(newServiceAccount)
}, 'newApp');

const oldDb = getFirestore(oldApp);
const newDb = getFirestore(newApp);

// Collezioni previste
const expectedCollections = [
    'users', 'teams', 'missions', 'tournaments', 'invites',
    'pending_requests', 'archives', 'minigame_logs', 'games_status', 'settings'
];

async function runDryRun() {
    console.log("\n=======================================================");
    console.log("🔍 AVVIO DRY-RUN (Nessuna modifica verrà effettuata)");
    console.log("=======================================================\n");

    console.log("1. Analisi delle collezioni nel vecchio Firebase...");
    const oldCollections = await oldDb.listCollections();
    const oldCollectionNames = oldCollections.map(c => c.id);
    
    const unknownCollections = oldCollectionNames.filter(c => !expectedCollections.includes(c));
    const missingCollections = expectedCollections.filter(c => !oldCollectionNames.includes(c));
    
    console.log(`\nCollezioni trovate: ${oldCollectionNames.length}`);
    oldCollectionNames.forEach(c => console.log(` - ${c}`));
    
    if (unknownCollections.length > 0) {
        console.log(`\n⚠️ ATTENZIONE: Trovate ${unknownCollections.length} collezioni NON previste:`);
        unknownCollections.forEach(c => console.log(` - ${c}`));
    }
    if (missingCollections.length > 0) {
        console.log(`\nℹ️ INFO: Le seguenti collezioni previste sono vuote o assenti:`);
        missingCollections.forEach(c => console.log(` - ${c}`));
    }

    console.log("\n2. Conteggio documenti e analisi ID...");
    let totalDocs = 0;
    
    for (const collName of oldCollectionNames) {
        const snap = await oldDb.collection(collName).get();
        console.log(`\n📦 Collezione: '${collName}' -> Verrà migrata in: 'fanta_${collName}'`);
        console.log(`   - Documenti da migrare: ${snap.size}`);
        totalDocs += snap.size;
        
        let sampleId = snap.size > 0 ? snap.docs[0].id : 'N/A';
        console.log(`   - Formato ID (campione): ${sampleId}`);
        
        // Controllo se è users (per segnalare relazioni all'Hub)
        if (collName === 'users') {
            console.log(`   - Verifica identità centrali (hub_users)...`);
            let missingInHub = 0;
            for (let doc of snap.docs) {
                const hubUserSnap = await newDb.collection('hub_users').doc(doc.id).get();
                if (!hubUserSnap.exists) {
                    missingInHub++;
                }
            }
            if (missingInHub > 0) {
                console.log(`   ⚠️ ATTENZIONE: ${missingInHub} utenti di Fanta non hanno ancora un profilo in hub_users.`);
                console.log(`      (La migrazione copierà i dati in fanta_users, ma l'utente dovrà loggarsi per creare il profilo centrale).`);
            } else {
                console.log(`   ✅ Tutti gli utenti Fanta esistono già in hub_users.`);
            }
        }
    }
    
    console.log("\n=======================================================");
    console.log(`🏁 DRY-RUN COMPLETATO. Totale documenti da copiare: ${totalDocs}`);
    console.log("I dati e gli ID originali (incluse le email usate come chiavi primarie) verranno preservati intatti.");
    console.log("I profili centrali hub_users non verranno sovrascritti o creati in automatico.");
    console.log("Per avviare la migrazione reale, usa --migrate");
    console.log("=======================================================\n");
}

async function runMigrate() {
    console.log("\n=======================================================");
    console.log("🚀 AVVIO MIGRAZIONE REALE...");
    console.log("=======================================================\n");

    const oldCollections = await oldDb.listCollections();
    let totalMigrated = 0;

    for (const coll of oldCollections) {
        const collName = coll.id;
        const targetCollName = `fanta_${collName}`;
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
            // Upsert dei dati esatti (idempotente)
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
    console.log(`🏁 MIGRAZIONE REALE COMPLETATA. Documenti totali migrati: ${totalMigrated}`);
    console.log("Per il rollback: basta ignorare o cancellare manualmente le collezioni fanta_* dal nuovo Hub.");
    console.log("=======================================================\n");
}

async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--dry-run')) {
        await runDryRun();
    } else if (args.includes('--migrate')) {
        await runMigrate();
    } else {
        console.log("Uso: node migrate_fanta.js [--dry-run | --migrate]");
    }
    process.exit(0);
}

main().catch(console.error);
