const VetrinaApp = {
    settings: {
        isActive: true,
        titolo: 'Prima Edizione 2026.',
        descrizione: 'Il progetto prende ufficialmente il via! Esplora le prime app didattiche disponibili e preparati a vivere l\'apprendimento come una grande avventura in classe.',
        imageUrl: '' // Lasciato vuoto all'inizio
    },
    selectedFile: null,

    init: function() {
        if (!window.fbDb || !window.fbDb.hub) {
            console.error("VetrinaApp: Database non pronto");
            return;
        }
        
        // Listen per le modifiche in tempo reale sulla collezione vetrina, documento settings
        window.fbDb.hub.collection('vetrina').doc('settings').onSnapshot((doc) => {
            if (doc.exists) {
                this.settings = { ...this.settings, ...doc.data() };
                this.updateUI();
            } else {
                // Se non esiste, crea il documento di default
                this.saveVetrinaSettings(true);
            }
        }, (error) => {
            console.error("Errore caricamento impostazioni vetrina:", error);
            document.getElementById('vetrina-status-label').textContent = "Errore di connessione";
            document.getElementById('vetrina-status-label').style.color = "var(--danger-color)";
        });
    },

    updateUI: function() {
        document.getElementById('vetrina-toggle').checked = this.settings.isActive;
        document.getElementById('vetrina-titolo').value = this.settings.titolo;
        document.getElementById('vetrina-descrizione').value = this.settings.descrizione;
        
        const preview = document.getElementById('vetrina-immagine-preview');
        if (this.settings.imageUrl) {
            preview.src = this.settings.imageUrl;
            preview.style.display = 'block';
        }
        
        const statusLabel = document.getElementById('vetrina-status-label');
        if (this.settings.isActive) {
            statusLabel.textContent = "ATTIVO SUL SITO";
            statusLabel.style.color = "#10b981"; // Verde
        } else {
            statusLabel.textContent = "NASCOSTO SUL SITO";
            statusLabel.style.color = "var(--text-muted)";
        }
    },

    toggleVetrina: function(checked) {
        this.settings.isActive = checked;
        // Salva direttamente quando si usa lo switch
        window.fbDb.hub.collection('vetrina').doc('settings').update({
            isActive: checked
        }).then(() => {
            console.log("Stato vetrina aggiornato");
        }).catch(err => console.error("Errore salvataggio toggle:", err));
    },

    previewImage: function(input) {
        if (input.files && input.files[0]) {
            this.selectedFile = input.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const preview = document.getElementById('vetrina-immagine-preview');
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            
            reader.readAsDataURL(input.files[0]);
        }
    },

    saveVetrinaSettings: async function(isInitial = false) {
        if (!isInitial) {
            const btn = document.getElementById('btn-save-vetrina');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvataggio...';
        }

        try {
            // Aggiorna valori dal form
            if (!isInitial) {
                this.settings.titolo = document.getElementById('vetrina-titolo').value;
                this.settings.descrizione = document.getElementById('vetrina-descrizione').value;
            }

            // Se c'è un'immagine da caricare, proviamo a caricarla su Storage
            if (this.selectedFile) {
                try {
                    // Controlla se firebase.storage è disponibile
                    if (firebase.storage) {
                        const storageRef = firebase.storage().ref();
                        const imageRef = storageRef.child(`vetrina/${Date.now()}_${this.selectedFile.name}`);
                        
                        const snapshot = await imageRef.put(this.selectedFile);
                        const downloadUrl = await snapshot.ref.getDownloadURL();
                        this.settings.imageUrl = downloadUrl;
                        this.selectedFile = null; // Resettiamo la selezione
                    } else {
                        // Fallback se Storage non è inizializzato: salviamo in base64 (sconsigliato per file grandi)
                        console.warn("Firebase Storage non disponibile, uso Base64 fallback (limitato in dimensioni)");
                        const base64String = document.getElementById('vetrina-immagine-preview').src;
                        this.settings.imageUrl = base64String;
                        this.selectedFile = null;
                    }
                } catch (imgErr) {
                    console.error("Errore upload immagine:", imgErr);
                    alert("Impossibile caricare l'immagine. Assicurati che Firebase Storage sia configurato e accessibile.");
                }
            }

            await window.fbDb.hub.collection('vetrina').doc('settings').set(this.settings, { merge: true });
            
            if (!isInitial) {
                const btn = document.getElementById('btn-save-vetrina');
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvato!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fa-solid fa-save"></i> Salva Modifiche';
                }, 2000);
            }
        } catch(e) {
            console.error("Errore salvataggio impostazioni vetrina:", e);
            if (!isInitial) {
                const btn = document.getElementById('btn-save-vetrina');
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Riprova';
                alert("Errore durante il salvataggio: " + e.message);
            }
        }
    }
};

// Inizializziamo al caricamento se Auth è pronto, altrimenti lo agganciamo in ui.js o aspettiamo
document.addEventListener('DOMContentLoaded', () => {
    // Attendiamo che il DB Firebase Hub sia inizializzato (generalmente in firebase-init.js)
    const checkDb = setInterval(() => {
        if (window.fbDb && window.fbDb.hub) {
            clearInterval(checkDb);
            VetrinaApp.init();
        }
    }, 500);
});
