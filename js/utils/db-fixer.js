// Script autonomo per la riparazione in background dei database

const DBFixer = {
    fixDatabasesBackground: async function() {
        if (localStorage.getItem("db_fixed_v2")) return;
        try {
            console.log("Inizio riparazione background dei DB (Date e Nomi)...");
            const projects = [
                { id: "la-rotta-degli-eroi", key: "AIzaSyCVCg9G6RbDDYMoQ0oWCs2Z9-1iFBSZZ5A" },
                { id: "la-corte-della-commedia", key: "AIzaSyCgz52XehTx0qQQ1MkKtTnIM5LmjJKcPls" },
                { id: "fantaletteratura-a7ff1", key: "AIzaSyB3wKx8ssbZVMtbiH5vbDDvAEgwzZcfRVQ" },
                { id: "palestra-riflessione", key: "AIzaSyC9WhGYaWyaJtqDHhKhii5yhnP363SczJo" }
            ];

            for (let p of projects) {
                // Utilizza il metodo esportato da HubApp
                const tokenManager = await window.HubApp.getAuthTokenFromDB(p.key);
                if (!tokenManager || !tokenManager.refreshToken) continue;
                
                const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${p.key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `grant_type=refresh_token&refresh_token=${tokenManager.refreshToken}`
                });
                const refreshData = await refreshRes.json();
                const validToken = refreshData.id_token || tokenManager.accessToken;

                const res = await fetch(`https://firestore.googleapis.com/v1/projects/${p.id}/databases/(default)/documents/users?pageSize=1000`, {
                    headers: { Authorization: `Bearer ${validToken}` }
                });
                const data = await res.json();
                if (!data.documents) continue;

                for (let doc of data.documents) {
                    const fields = doc.fields || {};
                    let needsUpdate = false;
                    let patchBody = { fields: { ...fields } };
                    let maskPaths = [];

                    // Fix Data
                    if (!fields.createdAt && !fields.joinedAt) {
                        needsUpdate = true;
                        patchBody.fields.createdAt = { timestampValue: "2023-09-01T10:00:00Z" };
                        maskPaths.push("createdAt");
                    }

                    // Fix Nome
                    const hasNome = fields.nome || fields.name || fields.displayName || fields.username;
                    if (!hasNome) {
                        const fn = fields.firstName ? fields.firstName.stringValue : '';
                        const ln = fields.lastName ? fields.lastName.stringValue : '';
                        if (!fn && !ln) {
                            needsUpdate = true;
                            patchBody.fields.nome = { stringValue: "Utente" };
                            maskPaths.push("nome");
                        }
                    }

                    if (needsUpdate) {
                        let url = `https://firestore.googleapis.com/v1/${doc.name}?` + maskPaths.map(m => `updateMask.fieldPaths=${m}`).join('&');
                        await fetch(url, {
                            method: 'PATCH',
                            headers: { 
                                Authorization: `Bearer ${validToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ fields: patchBody.fields })
                        });
                    }
                }
            }
            
            // Hub db fix
            if (window.fbDb && window.fbDb.hub) {
                const snap = await window.fbDb.hub.collection("users").get();
                const batch = window.fbDb.hub.batch();
                let count = 0;
                snap.forEach(doc => {
                    const d = doc.data();
                    let u = {};
                    let upd = false;
                    if (!d.createdAt && !d.joinedAt) {
                        u.createdAt = firebase.firestore.Timestamp.fromDate(new Date("2023-09-01T10:00:00Z"));
                        upd = true;
                    }
                    const fn = d.firstName || '';
                    const ln = d.lastName || '';
                    const hasNome = d.nome || d.name || d.displayName || d.username;
                    if (!hasNome && !fn && !ln) {
                        u.nome = "Utente";
                        upd = true;
                    }
                    if (upd) {
                        batch.update(doc.ref, u);
                        count++;
                    }
                });
                if (count > 0) await batch.commit();
            }

            localStorage.setItem("db_fixed_v2", "true");
            console.log("Riparazione completata!");
            
        } catch(e) {
            console.error("Errore script riparazione:", e);
        }
    }
};

window.DBFixer = DBFixer;
