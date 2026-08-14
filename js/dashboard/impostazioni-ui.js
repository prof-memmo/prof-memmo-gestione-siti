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
    }
};

window.ImpostazioniUI = ImpostazioniUI;
