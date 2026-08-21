// --- EMAIL TEMPLATES & COMMUNICATIONS Service ---
const RequestsService = {
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
