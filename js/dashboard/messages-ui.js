// --- MESSAGES UI (Dashboard Rendering) ---
const MessagesUI = {
    init: function() {
        if(window.MessagesService) {
            window.MessagesService.listenToEsperienze(this.renderEsperienzeTable.bind(this));
            window.MessagesService.listenToPostaArrivo(this.renderPostaTable.bind(this));
            window.MessagesService.listenToPostaInviata(this.renderPostaInviataTable.bind(this));
        }
        this.setupBridges();
        this.populateContacts();
    },

    populateContacts: function() {
        const select = document.getElementById('posta-select-contact');
        if (!select) return;

        const users = (window.HubApp && window.HubApp.iscrittiAggregati) ? window.HubApp.iscrittiAggregati : [];
        if (users.length === 0) return;

        // Ordina per nome
        const sorted = [...users].filter(u => u.email).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

        let html = '<option value="">-- Seleziona un utente registrato --</option>';
        sorted.forEach(u => {
            const role = (u.ruolo || u.role || 'viandante');
            const plan = (u.abbonamento || u.piano || 'Base');
            html += `<option value="${u.email}" data-nome="${u.nome || ''}">${u.nome || ''} ${u.cognome || ''} (${u.email}) - ${role} [${plan}]</option>`;
        });
        select.innerHTML = html;
    },

    onContactSelected: function(email) {
        const destInput = document.getElementById('posta-dest-email');
        if (destInput) destInput.value = email || '';
    },

    onTemplateSelected: async function(templateKey) {
        if (!templateKey) return;
        
        const subjInput = document.getElementById('posta-oggetto');
        const bodyTextarea = document.getElementById('posta-corpo');
        const contactSelect = document.getElementById('posta-select-contact');
        
        let userName = '';
        if (contactSelect && contactSelect.selectedIndex > 0) {
            const opt = contactSelect.options[contactSelect.selectedIndex];
            userName = opt.dataset.nome || '';
        }

        let rawText = '';
        try {
            if (window.fbDb && window.fbDb.hub) {
                const doc = await window.fbDb.hub.collection('hub_settings').doc('email_templates').get();
                if (doc.exists && doc.data()[templateKey]) {
                    rawText = doc.data()[templateKey];
                }
            }
        } catch(e) {}

        if (!rawText && window.HubApp && window.HubApp._defaultTemplates) {
            rawText = window.HubApp._defaultTemplates[templateKey] || '';
        }

        if (rawText) {
            // Estrai Oggetto se presente
            let subject = '';
            let body = rawText;
            if (rawText.startsWith('Oggetto:')) {
                const parts = rawText.split('\n\n');
                subject = parts[0].replace('Oggetto:', '').trim();
                body = parts.slice(1).join('\n\n');
            }
            if (userName) {
                body = body.replace(/\[NOME\]/g, userName);
            }
            if (subjInput && subject) subjInput.value = subject;
            if (bodyTextarea) bodyTextarea.value = body;
        }
    },

    sendViaGmail: async function() {
        const email = (document.getElementById('posta-dest-email') ? document.getElementById('posta-dest-email').value : '').trim();
        const subject = (document.getElementById('posta-oggetto') ? document.getElementById('posta-oggetto').value : '').trim();
        const body = (document.getElementById('posta-corpo') ? document.getElementById('posta-corpo').value : '').trim();

        if (!email) { alert("Inserisci l'email del destinatario."); return; }
        
        const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, '_blank');

        // Registra invio su Firestore se servizio disponibile
        try {
            if (window.fbDb && window.fbDb.hub) {
                await window.fbDb.hub.collection('hub_posta_inviata').add({
                    destinatario: email,
                    oggetto: subject || 'Messaggio Diretto',
                    sito: 'Hub Centrale',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch(e) { console.warn("Errore log posta inviata:", e); }
    },

    sendViaMailto: async function() {
        const email = (document.getElementById('posta-dest-email') ? document.getElementById('posta-dest-email').value : '').trim();
        const subject = (document.getElementById('posta-oggetto') ? document.getElementById('posta-oggetto').value : '').trim();
        const body = (document.getElementById('posta-corpo') ? document.getElementById('posta-corpo').value : '').trim();

        if (!email) { alert("Inserisci l'email del destinatario."); return; }
        
        window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        try {
            if (window.fbDb && window.fbDb.hub) {
                await window.fbDb.hub.collection('hub_posta_inviata').add({
                    destinatario: email,
                    oggetto: subject || 'Messaggio Diretto',
                    sito: 'Hub Centrale',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch(e) { console.warn("Errore log posta inviata:", e); }
    },

    setupBridges: function() {
        // Bridge per mantenere compatibilità con bottoni HTML "HubApp.deleteEsperienza"
        window.HubApp = window.HubApp || {};
        
        window.HubApp.approveEsperienza = async function(docId) {
            try {
                await window.MessagesService.approveEsperienza(docId);
            } catch(e) {
                console.error(e);
                alert("Errore durante l'approvazione");
            }
        };

        window.HubApp.deleteEsperienza = async function(docId) {
            if (confirm("Sei sicuro di voler eliminare questa esperienza? L'azione è irreversibile.")) {
                try {
                    await window.MessagesService.deleteEsperienza(docId);
                } catch(e) {
                    console.error(e);
                    alert("Errore eliminazione");
                }
            }
        };

        window.HubApp.deletePosta = async function(docId, inArrivo = true) {
            if (confirm("Sicuro di voler eliminare questo messaggio?")) {
                try {
                    await window.MessagesService.deletePosta(docId, inArrivo);
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
