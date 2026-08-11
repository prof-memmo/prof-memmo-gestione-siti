const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

// ============================================================================
// CONFIGURAZIONE CREDENZIALI
// ============================================================================
const oldKeyPath = path.join(require('os').homedir(), 'Downloads', 'fantaletteratura-a7ff1-firebase-adminsdk-fbsvc-ed49d51356.json');
const newKeyPath = path.join(require('os').homedir(), 'Downloads', 'prof-memmo-hub-firebase-adminsdk-fbsvc-cc91dd6fdf.json');

const oldApp = initializeApp({ credential: cert(require(oldKeyPath)) }, 'oldApp');
const newApp = initializeApp({ credential: cert(require(newKeyPath)) }, 'newApp');

const oldAuth = getAuth(oldApp);
const newAuth = getAuth(newApp);

// ============================================================================
// INSERIRE QUI I PARAMETRI HASH DA FIREBASE CONSOLE
// ============================================================================
// Per importarli, Firebase richiede le "Password Hash Parameters" del vecchio progetto.
// Vai su console.firebase.google.com -> Progetto Fantaletteratura -> Authentication -> Users.
// In alto a destra (sui 3 puntini verticali) clicca "Password hash parameters".
const hashConfig = {
    algorithm: 'STANDARD_SCRYPT',
    memoryCost: 14,
    rounds: 8,
    saltSeparator: Buffer.from('Bw==', 'base64'),
    signerKey: Buffer.from('L+NVn+ibFxstQJkAYyuc4GAdvVvMFcPLr/Z+DjkIvFZqqkcTURKgu9QC1tpl+c817Xjde6UHsS34YE3AzKfGdQ==', 'base64')
};

async function migrateAuth() {
    console.log("🚀 Estrazione utenti dal vecchio progetto (Fantaletteratura)...");
    
    let users = [];
    let pageToken;
    do {
        const result = await oldAuth.listUsers(1000, pageToken);
        users = users.concat(result.users);
        pageToken = result.pageToken;
    } while (pageToken);

    console.log(`✅ Trovati ${users.length} utenti.`);

    if (!hashConfig.signerKey) {
        console.log("⚠️  ATTENZIONE: Manca la 'signerKey' e gli altri parametri Hash.");
        console.log("Senza questi parametri, non posso importare le password degli utenti.");
        console.log("Per favore, incollami in chat i parametri che trovi nella Firebase Console di Fantaletteratura.");
        return;
    }

    // Prepara l'array per l'importazione
    const usersToImport = users.map(u => {
        const userObj = {
            uid: u.uid,
            email: u.email,
            emailVerified: u.emailVerified,
            displayName: u.displayName,
            disabled: u.disabled,
            metadata: {
                creationTime: u.metadata.creationTime,
                lastSignInTime: u.metadata.lastSignInTime,
            }
        };
        // Se c'è una password, aggiungiamo hash e salt
        if (u.passwordHash && u.passwordSalt) {
            userObj.passwordHash = Buffer.from(u.passwordHash, 'base64');
            userObj.passwordSalt = Buffer.from(u.passwordSalt, 'base64');
        }
        return userObj;
    });

    console.log("🔄 Importazione utenti nel nuovo progetto (Hub)...");
    try {
        const result = await newAuth.importUsers(usersToImport, { hash: hashConfig });
        console.log(`✅ Importazione completata!`);
        console.log(`   - Successi: ${result.successCount}`);
        console.log(`   - Errori: ${result.failureCount}`);
        
        if (result.failureCount > 0) {
            result.errors.forEach(err => console.error(err));
        }
    } catch (e) {
        console.error("❌ Errore durante l'importazione:", e);
    }
}

migrateAuth();
