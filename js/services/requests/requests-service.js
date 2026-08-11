// --- REQUESTS Service ---
const RequestsService = {
    fetchAllRequests: async function() {
        let richiesteDati = [];
        
        // 1. Fantaletteratura
        if (window.fbDb && window.fbDb.fanta) {
            try {
                const snapFanta = await window.fbDb.fanta.collection("pending_requests").get();
                snapFanta.forEach(doc => {
                    const d = doc.data();
                    richiesteDati.push({
                        id: doc.id, gioco: 'Fantaletteratura',
                        nome: d.nome + ' ' + d.cognome, email: d.email, ruolo: d.ruolo,
                        dataValue: d.timestamp ? (d.timestamp.toMillis ? d.timestamp.toMillis() : new Date(d.timestamp).getTime()) : 0
                    });
                });
            } catch(e) { console.warn("Errore fetch richieste fanta", e); }
        }

        // 2. La Rotta degli Eroi
        if (window.fbDb && window.fbDb.eroi) {
            try {
                const snapEroi = await window.fbDb.eroi.collection("pending_requests").get();
                snapEroi.forEach(doc => {
                    const d = doc.data();
                    richiesteDati.push({
                        id: doc.id, gioco: 'La Rotta degli Eroi',
                        nome: d.nome || 'Sconosciuto', email: d.email || doc.id, ruolo: 'Docente',
                        dataValue: d.timestamp ? (d.timestamp.toMillis ? d.timestamp.toMillis() : new Date(d.timestamp).getTime()) : 0
                    });
                });
            } catch(e) { console.warn("Errore fetch richieste eroi", e); }
        }

        // 3. La Corte della Commedia (Cerca in users dove role == 'pending_teacher')
        if (window.fbDb && window.fbDb.commedia) {
            try {
                const snapCommedia = await window.fbDb.commedia.collection("users").where("role", "==", "pending_teacher").get();
                snapCommedia.forEach(doc => {
                    const d = doc.data();
                    richiesteDati.push({
                        id: doc.id, gioco: 'La Corte della Commedia',
                        nome: d.nome || d.name || 'Sconosciuto', email: d.email || '', ruolo: 'Docente',
                        dataValue: d.createdAt ? (d.createdAt.toMillis ? d.createdAt.toMillis() : new Date(d.createdAt).getTime()) : 0
                    });
                });
            } catch(e) { console.warn("Errore fetch richieste commedia", e); }
        }

        // 4. Palestra di Riflessione (Cerca in users dove role == 'pending_docente')
        if (window.fbDb && window.fbDb.palestra) {
            try {
                const snapPalestra = await window.fbDb.palestra.collection("users").where("role", "==", "pending_docente").get();
                snapPalestra.forEach(doc => {
                    const d = doc.data();
                    richiesteDati.push({
                        id: doc.id, gioco: 'Palestra di Riflessione',
                        nome: d.nome || d.name || 'Sconosciuto', email: d.email || '', ruolo: 'Docente',
                        dataValue: d.createdAt ? (d.createdAt.toMillis ? d.createdAt.toMillis() : new Date(d.createdAt).getTime()) : 0
                    });
                });
            } catch(e) { console.warn("Errore fetch richieste palestra", e); }
        }

        // 5. Hub Centrale (Utenti con statusAccount == 'pending')
        if (window.fbDb && window.fbDb.hub) {
            try {
                const snapHub = await window.fbDb.hub.collection("hub_users").where("statusAccount", "==", "pending").get();
                snapHub.forEach(doc => {
                    const d = doc.data();
                    const nomeStr = d.anagrafica ? (d.anagrafica.nome + " " + (d.anagrafica.cognome || "")) : (d.nome || 'Sconosciuto');
                    richiesteDati.push({
                        id: doc.id, gioco: 'Hub (Identità Centrale)',
                        nome: nomeStr.trim(), email: d.email || '', ruolo: d.role || 'Docente',
                        dataValue: d.createdAt ? (d.createdAt.toMillis ? d.createdAt.toMillis() : new Date(d.createdAt).getTime()) : 0
                    });
                });
            } catch(e) { console.warn("Errore fetch richieste hub", e); }
        }
        
        // Ordina per default per data decrescente
        richiesteDati.sort((a, b) => b.dataValue - a.dataValue);
        return richiesteDati;
    },

    approvaRichiesta: async function(gioco, docId, email, nome) {
        if (gioco === 'Fantaletteratura') {
            const dbFanta = window.fbDb.fanta;
            const docSnap = await dbFanta.collection('pending_requests').doc(docId).get();
            if(docSnap.exists) {
                const data = docSnap.data();
                await dbFanta.collection('users').doc(docId).set({
                    email: data.email,
                    nome: data.nome,
                    cognome: data.cognome,
                    role: data.ruolo === 'Docente' ? 'teacher' : 'student',
                    teamName: data.nomeSquadra || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await dbFanta.collection('pending_requests').doc(docId).delete();
            }
        } else if (gioco === 'La Rotta degli Eroi') {
            const dbEroi = window.fbDb.eroi;
            await dbEroi.collection('users').doc(docId).update({
                role: 'teacher',
                approved: true
            });
            await dbEroi.collection('pending_requests').doc(docId).delete();
        } else if (gioco === 'La Corte della Commedia') {
            const dbCommedia = window.fbDb.commedia;
            await dbCommedia.collection('users').doc(docId).update({
                role: 'teacher'
            });
        } else if (gioco === 'Palestra di Riflessione') {
            const dbPalestra = window.fbDb.palestra;
            await dbPalestra.collection('users').doc(docId).update({
                role: 'docente'
            });
        } else if (gioco === 'Hub (Identità Centrale)') {
            const dbHub = window.fbDb.hub;
            await dbHub.collection('hub_users').doc(docId).update({
                statusAccount: 'active',
                role: 'docente'
            });
            // Step 6: Invio email automatica usando il sistema esistente (hub_posta_inviata)
            await this.salvaPostaInviata(
                email, 
                nome, 
                'Ecosistema Prof. Memmo', 
                'Account Docente Approvato'
            );
        }
    },

    rifiutaRichiesta: async function(gioco, docId) {
        if (gioco === 'Fantaletteratura') {
            await window.fbDb.fanta.collection('pending_requests').doc(docId).delete();
        } else if (gioco === 'La Rotta degli Eroi') {
            await window.fbDb.eroi.collection('pending_requests').doc(docId).delete();
        } else if (gioco === 'La Corte della Commedia') {
            await window.fbDb.commedia.collection('users').doc(docId).delete();
        } else if (gioco === 'Palestra di Riflessione') {
            await window.fbDb.palestra.collection('users').doc(docId).delete();
        } else if (gioco === 'Hub (Identità Centrale)') {
            await window.fbDb.hub.collection('hub_users').doc(docId).update({
                statusAccount: 'rejected'
            });
        }
    },

    getTemplatesFromDb: async function() {
        if (window.fbDb && window.fbDb.hub) {
            const docRef = window.fbDb.hub.collection("hub_settings").doc("email_templates");
            const docSnap = await docRef.get();
            if (docSnap.exists) return docSnap.data();
        }
        return null;
    },

    saveTemplatesToDb: async function(templates) {
        if (window.fbDb && window.fbDb.hub) {
            const docRef = window.fbDb.hub.collection("hub_settings").doc("email_templates");
            await docRef.set(templates, {merge: true});
        }
    },

    salvaPostaInviata: async function(email, nome, gioco, subject) {
        if (window.fbDb && window.fbDb.hub) {
            await window.fbDb.hub.collection("hub_posta_inviata").add({
                destinatarioEmail: email,
                destinatarioNome: nome,
                gioco: gioco,
                oggetto: subject,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }
};
window.RequestsService = RequestsService;
