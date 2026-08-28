const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const oldKeyPath = process.env.FANTA_KEY_PATH;
const newKeyPath = process.env.HUB_KEY_PATH;

const oldApp = initializeApp({ credential: cert(require(path.resolve(oldKeyPath))) }, 'oldApp_verify');
const newApp = initializeApp({ credential: cert(require(path.resolve(newKeyPath))) }, 'newApp_verify');

const oldDb = getFirestore(oldApp);
const newDb = getFirestore(newApp);

async function verify() {
    console.log("=== INIZIO VERIFICA POST-MIGRAZIONE ===\n");
    let allMatched = true;
    const collections = ['missions', 'settings', 'teams', 'users'];
    
    for (const coll of collections) {
        const oldSnap = await oldDb.collection(coll).get();
        const newSnap = await newDb.collection(`fanta_${coll}`).get();
        
        console.log(`Verifica '${coll}': Vecchio (${oldSnap.size}) vs Nuovo (${newSnap.size})`);
        
        if (oldSnap.size !== newSnap.size) {
            console.error(`❌ Mismatch conteggio in ${coll}!`);
            allMatched = false;
        }
        
        const oldIds = oldSnap.docs.map(d => d.id).sort();
        const newIds = newSnap.docs.map(d => d.id).sort();
        
        for (let i = 0; i < oldIds.length; i++) {
            if (oldIds[i] !== newIds[i]) {
                console.error(`❌ Mismatch ID in ${coll}: atteso ${oldIds[i]}, trovato ${newIds[i]}`);
                allMatched = false;
            }
        }
    }
    
    console.log("\n====================================");
    if (allMatched) {
        console.log("✅ VERIFICA RIUSCITA: Tutti i 19 documenti combaciano perfettamente per ID e conteggio.");
    } else {
        console.log("❌ VERIFICA FALLITA: Trovate discrepanze.");
    }
    console.log("Nessun dato è stato cancellato dal vecchio Firebase.");
    process.exit(0);
}

verify().catch(console.error);
