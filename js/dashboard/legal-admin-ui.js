// --- Legal & Branding Admin UI Module ---
const LegalAdminUI = {
    init: async function() {
        await this.loadAllLegalData();
    },

    loadAllLegalData: async function() {
        if (!window.fbDb || !window.fbDb.hub) return;
        try {
            const docRef = window.fbDb.hub.collection('ecosistema_settings').doc('legal');
            const snap = await docRef.get();
            let data = {};
            if (snap.exists) data = snap.data();

            // Set default Copyright text if empty
            const defaultCopyright = "© 2026 Guglielmo Piersanti. Tutti i contenuti presenti su questo sito sono di proprietà dell'autore e sono protetti tramite deposito e marcatura temporale presso Patamu. I contenuti sono inoltre distribuiti con licenza Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0).";
                       // Set Privacy & Terms defaults (Plain Text)
            const defaultPrivacy = "1. Titolare del trattamento\nIl titolare del trattamento è Guglielmo Piersanti, contattabile all'indirizzo email: prof.memmo@gmail.com\n\n2. Finalità dell'ecosistema\nL'Ecosistema Didattico Prof. Memmo è una piattaforma educativa composta da più giochi e strumenti didattici (FantaLetteratura, La Rotta degli Eroi, La Corte della Commedia, La Palestra di Riflessione e altri), utilizzata a scopo educativo e ludico. La piattaforma può prevedere piani di accesso a pagamento per i docenti.\n\n3. Dati raccolti\n- Indirizzo e-mail e nome utente (tramite accesso Google o registrazione diretta)\n- Informazioni di utilizzo dei giochi (punteggi, attività didattiche, progressi)\n- Messaggi inviati tramite modulo di contatto o posta interna\n- Dati tecnici forniti automaticamente dalla piattaforma (tipo di dispositivo, dati di log)\n- Dati di sottoscrizione (piano scelto, data di registrazione)\n\n4. Finalità del trattamento\n- Consentire l'accesso all'ecosistema e alle sue funzionalità\n- Gestire l'esperienza didattica, le classi, le classifiche e i tornei interni\n- Migliorare il funzionamento del servizio\n- Rispondere alle richieste inviate tramite modulo di contatto o posta interna\n- Gestire gli abbonamenti e i piani di accesso\nNon vengono utilizzati per scopi commerciali o pubblicitari.\n\n5. Base giuridica\nIl trattamento si basa sull'utilizzo dell'ecosistema e sul consenso esplicito dell'utente fornito in fase di registrazione.\n\n6. Conservazione dei dati\nI dati sono trattati in modo lecito e sicuro. Non vengono venduti né ceduti a terzi. Sono mantenuti solo per il tempo necessario al funzionamento didattico o su richiesta, salvo obblighi di legge. Vengono utilizzati servizi terzi per l'archiviazione (Firebase / Google LLC).\n\n7. Servizi di terze parti\nL'ecosistema utilizza: Firebase (autenticazione e database, Google LLC), Google Sign-In. Questi servizi possono raccogliere dati secondo le proprie privacy policy.\n\n8. Diritti dell'utente\n- Accesso ai propri dati\n- Rettifica o cancellazione\n- Limitazione del trattamento\n- Revoca del consenso\nPer esercitare questi diritti inviare un'email a: prof.memmo@gmail.com\n\n9. Cookie\nIl sito non utilizza cookie di profilazione. Potrebbero essere presenti cookie tecnici necessari al funzionamento del servizio.\n\n10. Utenti minori\nL'ecosistema è destinato a uso didattico e può essere utilizzato da minori nell'ambito scolastico, sotto la supervisione del docente. Per uso al di fuori del contesto scolastico è responsabilità di un adulto assicurare le autorizzazioni necessarie. I genitori o tutori possono richiedere la cancellazione dei dati contattando il titolare.\n\n11. Modifiche alla Policy\nLa presente informativa può essere aggiornata. Gli utenti saranno informati in caso di modifiche rilevanti tramite avviso sulla piattaforma.\n\n12. Riferimenti normativi\nRedatta in conformità al GDPR (Regolamento UE 2016/679) e alla normativa italiana in materia di protezione dei dati personali.";
            
            const defaultTerms = "Ultimo aggiornamento: 11/08/2026\n\n1. Titolare del sito\nEcosistema gestito da Guglielmo Piersanti — prof.memmo@gmail.com\n\n2. Accettazione dei termini\nL'accesso e l'utilizzo dell'ecosistema Prof. Memmo implicano l'accettazione dei presenti Termini. Se non si accettano, si invita a non utilizzare i servizi.\n\n3. Descrizione del servizio\nL'Ecosistema Prof. Memmo è un insieme di piattaforme didattiche e ludiche (FantaLetteratura, La Rotta degli Eroi, La Palestra di Riflessione, La Corte della Commedia e altri) accessibili tramite un unico account Hub. Il servizio ha finalità educative.\n\n4. Utilizzo del servizio\nL'utente si impegna a evitare di:\n- Inviare messaggi offensivi, illeciti o spam\n- Tentare di compromettere la sicurezza delle piattaforme\n- Utilizzare il servizio per scopi fraudolenti\n- Condividere credenziali di accesso con terzi\n- Eludere i sistemi di pagamento o accedere a funzionalità non incluse nel proprio piano\n\n5. Modulo di contatto e posta interna\nL'utente è responsabile dei contenuti inviati. È vietato inserire dati falsi o inviare contenuti illeciti o non pertinenti.\n\n6. Proprietà intellettuale\nTutti i contenuti (testi, materiali didattici, grafica, giochi, meccaniche) sono di proprietà del titolare e protetti da diritto d'autore. Distribuiti con licenza CC BY-NC-ND 4.0. Vietata la copia, distribuzione, modifica o utilizzo commerciale senza autorizzazione scritta.\n\n7. Abbonamenti e pagamenti\nAlcune funzionalità sono disponibili solo con piani a pagamento (Piano Viandante, Piano Docente, Ecosistema Completo). I prezzi sono indicati nella pagina dedicata. Gli studenti inseriti in una classe da un docente non sono soggetti a costi aggiuntivi.\n\n8. Limitazione di responsabilità\nIl servizio è fornito \"così com'è\". Il titolare non garantisce l'assenza di errori o interruzioni e non è responsabile per danni derivanti dall'utilizzo.\n\n9. Link esterni\nL'ecosistema può contenere link a siti esterni. Il titolare non è responsabile del loro contenuto.\n\n10. Modifiche ai termini\nIl titolare si riserva il diritto di modificare i presenti Termini in qualsiasi momento, con avviso sulla piattaforma.\n\n11. Legge applicabile\nRegolati dalla normativa italiana e dal GDPR (Regolamento UE 2016/679). Foro competente: quello del luogo di residenza del titolare.";

            // Populate fields
            document.getElementById('legal-fiscal-name').value = data.fiscalName || 'Guglielmo Piersanti';
            document.getElementById('legal-fiscal-code').value = data.fiscalCode || '';
            document.getElementById('legal-fiscal-email').value = data.fiscalEmail || 'prof.memmo@gmail.com';
            
            this.fiscalEnabled = !!data.showFiscalInFooter;
            this.updateFiscalSwitchUI();

            document.getElementById('legal-copyright-text').value = data.copyrightText || defaultCopyright;
            document.getElementById('legal-privacy-text').value = data.privacyText || defaultPrivacy;
            document.getElementById('legal-terms-text').value = data.termsText || defaultTerms;

        } catch (e) {
            console.error("Errore caricamento dati legali Hub:", e);
        }
    },

    updateFiscalSwitchUI: function() {
        const btn = document.getElementById('btn-toggle-fiscal');
        const txt = document.getElementById('status-text-fiscal');
        if (!btn || !txt) return;

        if (this.fiscalEnabled) {
            btn.classList.add('active');
            txt.textContent = 'ON';
        } else {
            btn.classList.remove('active');
            txt.textContent = 'OFF';
        }
    },

    toggleFiscalSwitchBtn: async function() {
        this.fiscalEnabled = !this.fiscalEnabled;
        this.updateFiscalSwitchUI();

        try {
            await window.fbDb.hub.collection('ecosistema_settings').doc('legal').set({
                showFiscalInFooter: this.fiscalEnabled
            }, { merge: true });
            console.log("Visibilità dati fiscali salvata:", this.fiscalEnabled);
        } catch(e) {
            console.error("Errore salvataggio visibilità dati fiscali:", e);
        }
    },

    saveFiscalInfo: async function() {
        const name = document.getElementById('legal-fiscal-name').value.trim();
        const code = document.getElementById('legal-fiscal-code').value.trim();
        const email = document.getElementById('legal-fiscal-email').value.trim();
        try {
            await window.fbDb.hub.collection('ecosistema_settings').doc('legal').set({
                fiscalName: name,
                fiscalCode: code,
                fiscalEmail: email
            }, { merge: true });
            alert("Dati Fiscali salvati con successo!");
        } catch(e) {
            console.error("Errore salvataggio dati fiscali:", e);
            alert("Errore durante il salvataggio.");
        }
    },

    saveCopyrightText: async function() {
        const text = document.getElementById('legal-copyright-text').value.trim();
        try {
            await window.fbDb.hub.collection('ecosistema_settings').doc('legal').set({
                copyrightText: text
            }, { merge: true });
            alert("Testo Copyright salvato con successo!");
        } catch(e) {
            console.error("Errore salvataggio copyright:", e);
            alert("Errore durante il salvataggio.");
        }
    },

    savePrivacyText: async function() {
        const text = document.getElementById('legal-privacy-text').value.trim();
        try {
            await window.fbDb.hub.collection('ecosistema_settings').doc('legal').set({
                privacyText: text
            }, { merge: true });
            alert("Privacy Policy salvata con successo! I nuovi contenuti saranno visibili su tutti i siti.");
        } catch(e) {
            console.error("Errore salvataggio privacy:", e);
            alert("Errore durante il salvataggio.");
        }
    },

    saveTermsText: async function() {
        const text = document.getElementById('legal-terms-text').value.trim();
        try {
            await window.fbDb.hub.collection('ecosistema_settings').doc('legal').set({
                termsText: text
            }, { merge: true });
            alert("Termini e Condizioni salvati con successo!");
        } catch(e) {
            console.error("Errore salvataggio termini:", e);
            alert("Errore durante il salvataggio.");
        }
    }
};

window.LegalAdminUI = LegalAdminUI;
