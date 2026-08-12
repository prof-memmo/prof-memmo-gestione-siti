// --- Notifications UI Module ---
const NotificationsUI = {
    init: function() {
        this.loadGamesList();
        this.loadHistory();
    },

    loadGamesList: async function() {
        const container = document.getElementById('notif-games-list-dynamic');
        if (!container) return;

        try {
            let games = [];
            if (window.GamesService && window.GamesService.getGames) {
                games = await window.GamesService.getGames();
            } else if (window.fbDb && window.fbDb.hub) {
                const snap = await window.fbDb.hub.collection('ecosistema_settings').doc('games').get();
                if (snap.exists) games = Object.values(snap.data());
            }

            if (!games || games.length === 0) {
                // Fallback default games se DB vuoto
                games = [
                    { name: 'Fantaletteratura' },
                    { name: 'La Rotta degli Eroi' },
                    { name: 'La Corte della Commedia' },
                    { name: 'Palestra di Riflessione' },
                    { name: 'Ops! Operazione Storia' }
                ];
            }

            let html = '';
            games.forEach(g => {
                const gName = g.name || g.titolo || g.id;
                html += `
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; color: #334155;">
                        <input type="checkbox" class="notif-game-cb" value="${gName}" checked onchange="window.NotificationsUI.onGameCbChange()">
                        <span>${gName}</span>
                    </label>
                `;
            });
            container.innerHTML = html;
        } catch(e) {
            console.warn("Errore caricamento dinamico giochi notifiche:", e);
        }
    },

    toggleAllGames: function(isChecked) {
        document.querySelectorAll('.notif-game-cb').forEach(cb => {
            cb.checked = isChecked;
        });
    },

    onGameCbChange: function() {
        const allCb = document.getElementById('notif-game-all');
        const cbs = document.querySelectorAll('.notif-game-cb');
        const total = cbs.length;
        const checkedCount = Array.from(cbs).filter(cb => cb.checked).length;
        if (allCb) {
            allCb.checked = (total > 0 && checkedCount === total);
        }
    },

    getSelectedGames: function() {
        const allCb = document.getElementById('notif-game-all');
        if (allCb && allCb.checked) return ['all'];

        const selected = [];
        document.querySelectorAll('.notif-game-cb').forEach(cb => {
            if (cb.checked) selected.push(cb.value);
        });
        return selected.length > 0 ? selected : ['all'];
    },

    sendNotification: async function() {
        const group = document.getElementById('notif-target-group').value;
        const singleEmail = document.getElementById('notif-single-email').value.trim();
        const selectedGames = this.getSelectedGames();
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
                    targetGames: selectedGames,
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
                let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
                snap.forEach(doc => {
                    const d = doc.data();
                    const dateStr = d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toLocaleString('it-IT') : new Date(d.createdAt).toLocaleString('it-IT')) : 'N/D';
                    const targetStr = d.targetGroup === 'all' ? 'Tutti gli utenti' : d.targetGroup === 'docenti' ? 'Solo Docenti' : d.targetGroup === 'studenti' ? 'Solo Studenti' : d.targetGroup === 'viandanti' ? 'Solo Viandanti' : `Singolo (${d.targetEmail})`;
                    
                    let gamesStr = 'Tutte le Piattaforme';
                    if (d.targetGames && Array.isArray(d.targetGames) && !d.targetGames.includes('all')) {
                        gamesStr = d.targetGames.join(', ');
                    }

                    html += `
                        <div style="background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px 18px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <strong style="color: var(--accent); font-size: 1rem;">${d.title}</strong>
                                <span style="color: #64748b; font-size: 0.8rem;">${dateStr}</span>
                            </div>
                            <p style="margin: 0 0 10px 0; font-size: 0.92rem; color: #334155; line-height: 1.5;">${d.body}</p>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <span style="font-size: 0.75rem; background: #e2e8f0; color: #475569; padding: 3px 10px; border-radius: 12px;">👥 ${targetStr}</span>
                                <span style="font-size: 0.75rem; background: #eff6ff; color: #1d4ed8; padding: 3px 10px; border-radius: 12px;">🎮 Piattaforme: ${gamesStr}</span>
                            </div>
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
