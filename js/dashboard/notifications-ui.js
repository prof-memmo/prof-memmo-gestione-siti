// --- Notifications UI Module ---
const NotificationsUI = {
    init: function() {
        this.loadHistory();
    },

    sendNotification: async function() {
        const group = document.getElementById('notif-target-group').value;
        const singleEmail = document.getElementById('notif-single-email').value.trim();
        const title = document.getElementById('notif-title').value.trim();
        const body = document.getElementById('notif-body').value.trim();
        const btn = document.getElementById('btn-send-notif');

        if (!title || !body) { alert("Inserisci sia il titolo che il testo della notifica."); return; }
        if (group === 'single' && !singleEmail) { alert("Inserisci l'email del destinatario."); return; }

        btn.disabled = true;
        btn.textContent = "Invio in corso...";

        try {
            if (window.fbDb && window.fbDb.hub) {
                await window.fbDb.hub.collection('hub_notifications').add({
                    targetGroup: group,
                    targetEmail: group === 'single' ? singleEmail.toLowerCase() : null,
                    title: title,
                    body: body,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert("Notifica inviata con successo!");
                document.getElementById('notif-title').value = '';
                document.getElementById('notif-body').value = '';
                this.loadHistory();
            }
        } catch (e) {
            console.error("Errore invio notifica:", e);
            alert("Errore durante l'invio della notifica.");
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Invia Notifica';
    },

    loadHistory: async function() {
        const container = document.getElementById('notifications-history-list');
        if (!container) return;

        try {
            if (window.fbDb && window.fbDb.hub) {
                const snap = await window.fbDb.hub.collection('hub_notifications').orderBy('createdAt', 'desc').limit(20).get();
                if (snap.empty) {
                    container.innerHTML = '<p style="color: var(--text-muted);">Nessuna notifica inviata finora.</p>';
                    return;
                }
                let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
                snap.forEach(doc => {
                    const d = doc.data();
                    const dateStr = d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toLocaleString('it-IT') : new Date(d.createdAt).toLocaleString('it-IT')) : 'N/D';
                    const targetStr = d.targetGroup === 'all' ? 'Tutti gli utenti' : d.targetGroup === 'docenti' ? 'Solo Docenti' : d.targetGroup === 'studenti' ? 'Solo Studenti' : d.targetGroup === 'viandanti' ? 'Solo Viandanti' : `Singolo (${d.targetEmail})`;
                    html += `
                        <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 15px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.85rem;">
                                <strong style="color: var(--accent);">${d.title}</strong>
                                <span style="color: #64748b;">${dateStr}</span>
                            </div>
                            <p style="margin: 0 0 5px 0; font-size: 0.9rem; color: #334155;">${d.body}</p>
                            <span style="font-size: 0.75rem; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 12px;">Destinatari: ${targetStr}</span>
                        </div>
                    `;
                });
                html += '</div>';
                container.innerHTML = html;
            }
        } catch (e) {
            console.error("Errore caricamento storico notifiche:", e);
            container.innerHTML = '<p style="color: var(--danger-color);">Errore nel caricamento dello storico.</p>';
        }
    }
};

window.NotificationsUI = NotificationsUI;
