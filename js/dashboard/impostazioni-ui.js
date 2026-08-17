const ImpostazioniUI = {
    settingsData: {},
    isInitialized: false,

    init: function() {
        this.loadSettings();
    },

    loadSettings: async function() {
        if (!window.fbDb || !window.fbDb.hub) {
            console.warn("DB Hub non pronto per impostazioni");
            return;
        }

        try {
            window.fbDb.hub.collection('hub_settings').doc('impostazioni').onSnapshot(doc => {
                if (doc.exists) {
                    this.settingsData = doc.data() || {};
                } else {
                    this.settingsData = {
                        manutenzione: false,
                        manutenzione_testo: "🔧 Sito temporaneamente in manutenzione.\n\nStiamo migliorando l'ecosistema. Torna tra poco!"
                    };
                }
                this.render();
            });
        } catch (e) {
            console.error("Errore caricamento impostazioni generali:", e);
        }
    },

    render: function() {
        const isManutenzione = !!this.settingsData.manutenzione;
        const btn = document.getElementById('btn-toggle-manutenzione');
        const statusText = document.getElementById('status-text-manutenzione');
        const testoArea = document.getElementById('manutenzione-testo');

        if (btn && statusText) {
            if (isManutenzione) {
                btn.classList.add('active');
                statusText.textContent = 'ON';
                statusText.style.color = '#ef4444';
            } else {
                btn.classList.remove('active');
                statusText.textContent = 'OFF';
                statusText.style.color = 'var(--text-muted)';
            }
        }

        if (testoArea && document.activeElement !== testoArea) {
            testoArea.value = this.settingsData.manutenzione_testo || "🔧 Sito temporaneamente in manutenzione.\n\nStiamo migliorando l'ecosistema. Torna tra poco!";
        }
    },

    toggleManutenzione: async function() {
        if (!window.fbDb || !window.fbDb.hub) return;
        const current = !!this.settingsData.manutenzione;
        const next = !current;
        
        try {
            await window.fbDb.hub.collection('hub_settings').doc('impostazioni').set({
                manutenzione: next,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        } catch (e) {
            console.error("Errore toggle manutenzione:", e);
            alert("Errore salvataggio manutenzione: " + e.message);
        }
    },

    saveManutenzioneSettings: async function() {
        if (!window.fbDb || !window.fbDb.hub) return;
        const testo = document.getElementById('manutenzione-testo')?.value || '';
        const statusLabel = document.getElementById('manutenzione-save-status');

        try {
            await window.fbDb.hub.collection('hub_settings').doc('impostazioni').set({
                manutenzione_testo: testo,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            if (statusLabel) {
                statusLabel.style.display = 'inline';
                setTimeout(() => {
                    statusLabel.style.display = 'none';
                }, 3000);
            }
        } catch (e) {
            console.error("Errore salvataggio testo manutenzione:", e);
            alert("Errore salvataggio: " + e.message);
        }
    },

    // =========================================================================
    // CONTROLLI GLOBALI CENTRALIZZATI ECOSISTEMA
    // =========================================================================

    testConnessioneGlobale: async function() {
        const box = document.getElementById('diagnostica-global-result');
        if (!box) return;
        box.style.display = 'block';
        box.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Test di connessione alle collezioni del database centrale in corso...';

        const collectionsToTest = [
            { name: 'Hub Utenti & SSO', coll: 'hub_users', icon: 'fa-globe', color: '#6366f1' },
            { name: 'FantaLetteratura', coll: 'fanta_users', icon: 'fa-dragon', color: '#a855f7' },
            { name: 'La Rotta degli Eroi', coll: 'eroi_users', icon: 'fa-ship', color: '#3b82f6' },
            { name: 'Palestra di Riflessione', coll: 'palestra_users', icon: 'fa-brain', color: '#22c55e' },
            { name: 'La Corte della Commedia', coll: 'corte_users', icon: 'fa-gavel', color: '#ef4444' },
            { name: 'Ops! Operazione Storia', coll: 'ops_users', icon: 'fa-clock-rotate-left', color: '#eab308' },
            { name: 'Archivio Storico Globale', coll: 'hub_archives', icon: 'fa-box-archive', color: '#64748b' }
        ];

        let resultsHtml = '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; margin-top:10px;">';
        let allOk = true;

        for (const item of collectionsToTest) {
            const start = performance.now();
            try {
                const snap = await window.fbDb.hub.collection(item.coll).limit(1).get();
                const latency = Math.round(performance.now() - start);
                resultsHtml += `
                    <div style="background:white; padding:10px 14px; border-radius:10px; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="fa-solid ${item.icon}" style="color:${item.color};"></i>
                            <span style="font-weight:700; font-size:0.85rem;">${item.name}</span>
                        </div>
                        <span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:12px; font-weight:800; font-size:0.75rem;">🟢 Online (${latency}ms)</span>
                    </div>
                `;
            } catch(e) {
                allOk = false;
                resultsHtml += `
                    <div style="background:white; padding:10px 14px; border-radius:10px; border:1px solid #fee2e2; display:flex; align-items:center; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="fa-solid ${item.icon}" style="color:${item.color};"></i>
                            <span style="font-weight:700; font-size:0.85rem;">${item.name}</span>
                        </div>
                        <span style="background:#fee2e2; color:#b91c1c; padding:2px 8px; border-radius:12px; font-weight:800; font-size:0.75rem;">🔴 Errore</span>
                    </div>
                `;
            }
        }
        resultsHtml += '</div>';

        box.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                <span style="font-weight:800; color:${allOk ? '#15803d' : '#b91c1c'};">${allOk ? '✅ Tutte le 7 collezioni del Database Centrale sono perfettamente connesse e sincronizzate!' : '⚠️ Attenzione: alcune collezioni hanno risposto con errore.'}</span>
                <button onclick="document.getElementById('diagnostica-global-result').style.display='none'" style="background:none; border:none; cursor:pointer; color:#888;">&times; Chiudi</button>
            </div>
            ${resultsHtml}
        `;
    },

    resetNotificheGlobali: function() {
        if (!confirm("Azzerare e contrassegnare come lette tutte le notifiche di sistema dell'Ecosistema?")) return;
        localStorage.setItem('hub_notifications_last_cleared', new Date().toISOString());
        alert("✅ Notifiche e badge globali azzerati con successo!");
    },

    resetStagioneGlobale: async function() {
        const input = prompt("⚠️ ATTENZIONE: Questa azione azzererà contemporaneamente punteggi stagionali, classifiche, verdetti e missioni completate su TUTTI I 5 GIOCHI (Rotta, Commedia, Fanta, Palestra, Ops) per avviare il nuovo anno scolastico.\n\nStudenti, docenti, classi e account rimarranno INALTERATI.\n\nPer confermare, digita 'AZZERA' in maiuscolo:");
        if (input !== 'AZZERA') {
            if (input !== null) alert("Operazione annullata. La parola di conferma non corrispondeva.");
            return;
        }

        try {
            const timestamp = new Date().toISOString();
            await window.fbDb.hub.collection('hub_settings').doc('season').set({
                currentSeasonStartedAt: timestamp,
                lastGlobalResetAt: timestamp,
                resetBy: 'prof.memmo@gmail.com'
            }, { merge: true });

            alert("🎉 Stagione azzerata con successo per tutti i siti dell'Ecosistema!\nTutti i giochi sono pronti per il nuovo anno scolastico.");
            if (window.HubApp && window.HubApp.loadIscritti) window.HubApp.loadIscritti();
        } catch(e) {
            console.error("Errore reset globale stagione:", e);
            alert("Errore durante il reset globale: " + e.message);
        }
    },

    archiviaAnnoGlobale: async function() {
        const defaultYear = `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`;
        const year = prompt("Inserisci l'Anno Scolastico da archiviare (es. " + defaultYear + "):", defaultYear);
        if (!year) return;

        if (!confirm(`Sei sicuro di voler generare l'Archivio Storico Globale per l'anno scolastico ${year}? Verrà salvata una fotografia di tutti i 5 siti nell'Archivio dell'Hub.`)) return;

        try {
            const users = window.UsersUI ? window.UsersUI.allUsers : [];
            const snapshotData = {
                schoolYear: year,
                archivedAt: new Date().toISOString(),
                totalUsers: users.length,
                stats: {
                    studenti: users.filter(u => (u.ruolo || '').includes('student')).length,
                    docenti: users.filter(u => (u.ruolo || '').includes('teacher') || (u.ruolo || '').includes('docente')).length,
                    giochi: ['La Rotta degli Eroi', 'La Corte della Commedia', 'FantaLetteratura', 'Palestra di Riflessione', 'Ops! Operazione Storia']
                }
            };

            await window.fbDb.hub.collection('hub_archives').add(snapshotData);
            alert(`📦 Archiviazione dell'Anno Scolastico ${year} completata con successo! È ora consultabile nella scheda Archivi.`);
            if (window.HubApp && window.HubApp.loadArchivi) window.HubApp.loadArchivi();
        } catch(e) {
            console.error("Errore archiviazione globale:", e);
            alert("Errore durante l'archiviazione: " + e.message);
        }
    }
};

window.ImpostazioniUI = ImpostazioniUI;
