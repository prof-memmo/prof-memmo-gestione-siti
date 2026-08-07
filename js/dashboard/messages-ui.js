// --- MESSAGES UI (Dashboard Rendering) ---
const MessagesUI = {
    init: function() {
        if(window.HubDbService) {
            window.HubDbService.listenToEsperienze(this.renderEsperienzeTable.bind(this));
            window.HubDbService.listenToPostaArrivo(this.renderPostaTable.bind(this));
            window.HubDbService.listenToPostaInviata(this.renderPostaInviataTable.bind(this));
        }
        this.setupBridges();
    },

    setupBridges: function() {
        // Bridge per mantenere compatibilità con bottoni HTML "HubApp.deleteEsperienza"
        window.HubApp = window.HubApp || {};
        
        window.HubApp.approveEsperienza = async function(docId) {
            try {
                await window.HubDbService.approveEsperienza(docId);
            } catch(e) {
                console.error(e);
                alert("Errore durante l'approvazione");
            }
        };

        window.HubApp.deleteEsperienza = async function(docId) {
            if (confirm("Sei sicuro di voler eliminare questa esperienza? L'azione è irreversibile.")) {
                try {
                    await window.HubDbService.deleteEsperienza(docId);
                } catch(e) {
                    console.error(e);
                    alert("Errore eliminazione");
                }
            }
        };

        window.HubApp.deletePosta = async function(docId, inArrivo = true) {
            if (confirm("Sicuro di voler eliminare questo messaggio?")) {
                try {
                    await window.HubDbService.deletePosta(docId, inArrivo);
                } catch(e) {
                    console.error(e);
                    alert("Errore eliminazione");
                }
            }
        };
    },

    renderEsperienzeTable: function(data) {
        const tbody = document.querySelector('#hub-esperienze-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Nessuna esperienza registrata.</td></tr>';
            return;
        }

        data.forEach(d => {
            const tr = document.createElement('tr');
            const dateStr = d.timestamp ? (d.timestamp.toDate ? d.timestamp.toDate().toLocaleDateString('it-IT') : new Date(d.timestamp).toLocaleDateString('it-IT')) : 'N/D';
            
            let actionHtml = '';
            if (!d.approvata) {
                actionHtml = `
                    <button onclick="HubApp.approveEsperienza('${d.id}')" style="background:#2ecc71; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; margin-right:5px;"><i class="fa-solid fa-check"></i> Approva</button>
                    <button onclick="HubApp.deleteEsperienza('${d.id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                `;
            } else {
                actionHtml = `
                    <span style="color:#2ecc71; font-weight:bold; margin-right:10px;"><i class="fa-solid fa-check-double"></i> Approvata</span>
                    <button onclick="HubApp.deleteEsperienza('${d.id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i> Rimuovi</button>
                `;
            }

            tr.innerHTML = `
                <td style="padding: 10px;"><strong>${d.nome || 'Anonimo'}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${d.gioco || 'N/D'}</span></td>
                <td style="padding: 10px; font-style:italic;">"${d.esperienza || ''}"</td>
                <td style="padding: 10px; font-size:0.85rem;">${dateStr}</td>
                <td style="padding: 10px; text-align:center;">${actionHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderPostaTable: function(data) {
        const tbody = document.querySelector('#hub-posta-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nessun messaggio.</td></tr>';
            return;
        }

        data.forEach(d => {
            const tr = document.createElement('tr');
            const dateStr = d.timestamp ? (d.timestamp.toDate ? d.timestamp.toDate().toLocaleDateString('it-IT') : new Date(d.timestamp).toLocaleDateString('it-IT')) : 'N/D';
            
            tr.innerHTML = `
                <td style="padding: 10px;"><strong>${d.mittente || 'Sconosciuto'}</strong><br><a href="mailto:${d.email || ''}" style="font-size:0.8rem; color:var(--primary-color); text-decoration:none;">${d.email || ''}</a></td>
                <td style="padding: 10px;"><span style="color:var(--text-muted); font-size:0.85rem;">Da: ${d.piattaforma || 'N/D'}</span></td>
                <td style="padding: 10px;">${d.messaggio || ''}</td>
                <td style="padding: 10px; font-size:0.85rem;">${dateStr}</td>
                <td style="padding: 10px; text-align:center;">
                    <a href="mailto:${d.email || ''}" class="btn" style="padding:5px 10px; font-size:0.8rem; margin-right:5px;"><i class="fa-solid fa-reply"></i> Rispondi</a>
                    <button onclick="HubApp.deletePosta('${d.id}', true)" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderPostaInviataTable: function(data) {
        const tbody = document.querySelector('#hub-posta-inviata-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Nessun messaggio inviato.</td></tr>';
            return;
        }

        data.forEach(d => {
            const tr = document.createElement('tr');
            const dateStr = d.timestamp ? (d.timestamp.toDate ? d.timestamp.toDate().toLocaleDateString('it-IT') : new Date(d.timestamp).toLocaleDateString('it-IT')) : 'N/D';
            tr.innerHTML = `
                <td style="padding: 10px;">A: <strong>${d.destinatario_nome || 'Utente'}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${d.destinatario_email || ''}</span></td>
                <td style="padding: 10px;">${d.oggetto || ''}</td>
                <td style="padding: 10px; font-size:0.85rem;">${dateStr}</td>
                <td style="padding: 10px; text-align:center;">
                    <button onclick="HubApp.deletePosta('${d.id}', false)" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
};
window.MessagesUI = MessagesUI;
