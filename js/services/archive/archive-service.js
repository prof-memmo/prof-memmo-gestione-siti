// --- Archive Service ---
// Gestisce l'estrazione degli archivi storici dai vari database

const ArchiveService = {
    fetchArchives: async function() {
        let allArchives = [];

        // Fetch da La Rotta degli Eroi
        if (window.fbDb && window.fbDb.eroi) {
            const snapEroi = await window.fbDb.eroi.collection("archives").orderBy("timestamp", "desc").get();
            snapEroi.forEach(doc => {
                const data = doc.data();
                allArchives.push({
                    id: doc.id,
                    nomeAnno: data.yearName || 'N/A',
                    timestamp: data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('it-IT') : 'N/A',
                    gioco: 'La Rotta degli Eroi',
                    giocoColor: '#3498db',
                    giocoIcon: 'fa-ship'
                });
            });
        }

        // Fetch da Fantaletteratura
        if (window.fbDb && window.fbDb.fanta) {
            const snapFanta = await window.fbDb.fanta.collection("archives").orderBy("timestamp", "desc").get();
            snapFanta.forEach(doc => {
                const data = doc.data();
                allArchives.push({
                    id: doc.id,
                    nomeAnno: data.yearName || 'N/A',
                    timestamp: data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('it-IT') : 'N/A',
                    gioco: 'Fantaletteratura',
                    giocoColor: '#e74c3c',
                    giocoIcon: 'fa-book-open'
                });
            });
        }

        return allArchives;
    }
};

window.ArchiveService = ArchiveService;
