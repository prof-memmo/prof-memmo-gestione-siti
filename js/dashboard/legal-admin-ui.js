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
            
            // Set Privacy & Terms defaults
            const defaultPrivacy = "<h3>1. Titolare del trattamento</h3><p>Il titolare del trattamento è <strong>Guglielmo Piersanti</strong>, contattabile all'indirizzo email: <a href=\"mailto:prof.memmo@gmail.com\">prof.memmo@gmail.com</a></p><h3>2. Finalità dell'ecosistema</h3><p>L'Ecosistema Didattico Prof. Memmo è una piattaforma educativa composta da più giochi e strumenti didattici (FantaLetteratura, La Rotta degli Eroi, La Corte della Commedia, La Palestra di Riflessione e altri), utilizzata a scopo educativo e ludico. La piattaforma può prevedere piani di accesso a pagamento per i docenti.</p><h3>3. Dati raccolti</h3><ul><li>Indirizzo e-mail e nome utente (tramite accesso Google o registrazione diretta)</li><li>Informazioni di utilizzo dei giochi (punteggi, attività didattiche, progressi)</li><li>Messaggi inviati tramite modulo di contatto o posta interna</li><li>Dati tecnici forniti automaticamente dalla piattaforma (tipo di dispositivo, dati di log)</li><li>Dati di sottoscrizione (piano scelto, data di registrazione)</li></ul><h3>4. Finalità del trattamento</h3><ul><li>Consentire l'accesso all'ecosistema e alle sue funzionalità</li><li>Gestire l'esperienza didattica, le classi, le classifiche e i tornei interni</li><li>Migliorare il funzionamento del servizio</li><li>Rispondere alle richieste inviate tramite modulo di contatto o posta interna</li><li>Gestire gli abbonamenti e i piani di accesso</li></ul><p>Non vengono utilizzati per scopi commerciali o pubblicitari.</p><h3>5. Base giuridica</h3><p>Il trattamento si basa sull'utilizzo dell'ecosistema e sul consenso esplicito dell'utente fornito in fase di registrazione.</p><h3>6. Conservazione dei dati</h3><p>I dati sono trattati in modo lecito e sicuro. Non vengono venduti né ceduti a terzi. Sono mantenuti solo per il tempo necessario al funzionamento didattico o su richiesta, salvo obblighi di legge. Vengono utilizzati servizi terzi per l'archiviazione (<strong>Firebase / Google LLC</strong>).</p><h3>7. Servizi di terze parti</h3><p>L'ecosistema utilizza: Firebase (autenticazione e database, Google LLC), Google Sign-In. Questi servizi possono raccogliere dati secondo le proprie privacy policy.</p><h3>8. Diritti dell'utente</h3><ul><li>Accesso ai propri dati</li><li>Rettifica o cancellazione</li><li>Limitazione del trattamento</li><li>Revoca del consenso</li></ul><p>Per esercitare questi diritti: <a href=\"mailto:prof.memmo@gmail.com\">prof.memmo@gmail.com</a></p><h3>9. Cookie</h3><p>Il sito non utilizza cookie di profilazione. Potrebbero essere presenti cookie tecnici necessari al funzionamento del servizio.</p><h3>10. Utenti minori</h3><p>L'ecosistema è destinato a uso didattico e può essere utilizzato da minori nell'ambito scolastico, sotto la supervisione del docente. Per uso al di fuori del contesto scolastico è responsabilità di un adulto assicurare le autorizzazioni necessarie. I genitori o tutori possono richiedere la cancellazione dei dati contattando il titolare.</p><h3>11. Modifiche alla Policy</h3><p>La presente informativa può essere aggiornata. Gli utenti saranno informati in caso di modifiche rilevanti tramite avviso sulla piattaforma.</p><h3>12. Riferimenti normativi</h3><p>Redatta in conformità al <strong>GDPR (Regolamento UE 2016/679)</strong> e alla normativa italiana in materia di protezione dei dati personali.</p>";
            
            const defaultTerms = "<p><strong>Ultimo aggiornamento: 11/08/2026</strong></p><h3>1. Titolare del sito</h3><p>Ecosistema gestito da <strong>Guglielmo Piersanti</strong> — <a href=\"mailto:prof.memmo@gmail.com\">prof.memmo@gmail.com</a></p><h3>2. Accettazione dei termini</h3><p>L'accesso e l'utilizzo dell'ecosistema Prof. Memmo implicano l'accettazione dei presenti Termini. Se non si accettano, si invita a non utilizzare i servizi.</p><h3>3. Descrizione del servizio</h3><p>L'Ecosistema Prof. Memmo è un insieme di piattaforme didattiche e ludiche (FantaLetteratura, La Rotta degli Eroi, La Palestra di Riflessione, La Corte della Commedia e altri) accessibili tramite un unico account Hub. Il servizio ha finalità educative.</p><h3>4. Utilizzo del servizio</h3><p>L'utente si impegna a evitare di:</p><ul><li>Inviare messaggi offensivi, illeciti o spam</li><li>Tentare di compromettere la sicurezza delle piattaforme</li><li>Utilizzare il servizio per scopi fraudolenti</li><li>Condividere credenziali di accesso con terzi</li><li>Eludere i sistemi di pagamento o accedere a funzionalità non incluse nel proprio piano</li></ul><h3>5. Modulo di contatto e posta interna</h3><p>L'utente è responsabile dei contenuti inviati. È vietato inserire dati falsi o inviare contenuti illeciti o non pertinenti.</p><h3>6. Proprietà intellettuale</h3><p>Tutti i contenuti (testi, materiali didattici, grafica, giochi, meccaniche) sono di proprietà del titolare e protetti da diritto d'autore. Distribuiti con licenza <strong>CC BY-NC-ND 4.0</strong>. Vietata la copia, distribuzione, modifica o utilizzo commerciale senza autorizzazione scritta.</p><h3>7. Abbonamenti e pagamenti</h3><p>Alcune funzionalità sono disponibili solo con piani a pagamento (Piano Viandante, Piano Docente, Ecosistema Completo). I prezzi sono indicati nella pagina dedicata. Gli studenti inseriti in una classe da un docente non sono soggetti a costi aggiuntivi.</p><h3>8. Limitazione di responsabilità</h3><p>Il servizio è fornito \"così com'è\". Il titolare non garantisce l'assenza di errori o interruzioni e non è responsabile per danni derivanti dall'utilizzo.</p><h3>9. Link esterni</h3><p>L'ecosistema può contenere link a siti esterni. Il titolare non è responsabile del loro contenuto.</p><h3>10. Modifiche ai termini</h3><p>Il titolare si riserva il diritto di modificare i presenti Termini in qualsiasi momento, con avviso sulla piattaforma.</p><h3>11. Legge applicabile</h3><p>Regolati dalla normativa italiana e dal <strong>GDPR (Regolamento UE 2016/679)</strong>. Foro competente: quello del luogo di residenza del titolare.</p>";

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
