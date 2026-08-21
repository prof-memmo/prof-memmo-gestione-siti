// --- Legal & Branding Admin UI Module ---
const LegalAdminUI = {
    init: async function() {
        await this.loadAllLegalData();
    },

    getDb: function() {
        if (window.fbDb && window.fbDb.hub) return window.fbDb.hub;
        if (window.db) return window.db;
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) return firebase.firestore();
        return null;
    },

    loadAllLegalData: async function() {
        const db = this.getDb();
        if (!db) return;
        try {
            let snap = await db.collection('ecosistema_settings').doc('legal').get();
            if (!snap.exists) {
                snap = await db.collection('hub_settings').doc('legal').get();
            }
            let data = snap.exists ? snap.data() : {};

            // Set default Copyright text if empty
            const defaultCopyright = "© 2026 Guglielmo Piersanti. Tutti i contenuti presenti su questo sito sono di proprietà dell'autore e sono protetti tramite deposito e marcatura temporale presso Patamu. I contenuti sono inoltre distribuiti con licenza Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0).";
            
            const defaultPrivacy = "1. Titolare del trattamento\nIl titolare del trattamento è Guglielmo Piersanti, contattabile all'indirizzo email: prof.memmo@gmail.com\n\n2. Finalità dell'ecosistema\nL'Ecosistema Didattico Prof. Memmo è una piattaforma educativa composta da più giochi e strumenti didattici (FantaLetteratura, La Rotta degli Eroi, La Corte della Commedia, La Palestra di Riflessione e altri), utilizzata a scopo educativo e ludico. La piattaforma può prevedere piani di accesso a pagamento per i docenti.\n\n3. Dati raccolti\n- Indirizzo e-mail e nome utente (tramite accesso Google o registrazione diretta)\n- Informazioni di utilizzo dei giochi (punteggi, attività didattiche, progressi)\n- Messaggi inviati tramite modulo di contatto o posta interna\n- Dati tecnici forniti automaticamente dalla piattaforma (tipo di dispositivo, dati di log)\n- Dati di sottoscrizione (piano scelto, data di registrazione)\n\n4. Finalità del trattamento\n- Consentire l'accesso all'ecosistema e alle sue funzionalità\n- Gestire l'esperienza didattica, le classi, le classifiche e i tornei interni\n- Migliorare il funzionamento del servizio\n- Rispondere alle richieste inviate tramite modulo di contatto o posta interna\n- Gestire gli abbonamenti e i piani di accesso\nNon vengono utilizzati per scopi commerciali o pubblicitari.\n\n5. Base giuridica\nIl trattamento si basa sull'utilizzo dell'ecosistema e sul consenso esplicito dell'utente fornito in fase di registrazione.\n\n6. Conservazione dei dati\nI dati sono trattati in modo lecito e sicuro. Non vengono venduti né ceduti a terzi. Sono mantenuti solo per il tempo necessario al funzionamento didattico o su richiesta, salvo obblighi di legge. Vengono utilizzati servizi terzi per l'archiviazione (Firebase / Google LLC).\n\n7. Servizi di terze parti\nL'ecosistema utilizza: Firebase (autenticazione e database, Google LLC), Google Sign-In. Questi servizi possono raccogliere dati secondo le proprie privacy policy.\n\n8. Diritti dell'utente\n- Accesso ai propri dati\n- Rettifica o cancellazione\n- Limitazione del trattamento\n- Revoca del consenso\nPer esercitare questi diritti inviare un'email a: prof.memmo@gmail.com\n\n9. Cookie\nIl sito non utilizza cookie di profilazione. Potrebbero essere presenti cookie tecnici necessari al funzionamento del servizio.\n\n10. Utenti minori\nL'ecosistema è destinato a uso didattico e può essere utilizzato da minori nell'ambito scolastico, sotto la supervisione del docente. Per uso al di fuori del contesto scolastico è responsabilità di un adulto assicurare le autorizzazioni necessarie. I genitori o tutori possono richiedere la cancellazione dei dati contattando il titolare.\n\n11. Modifiche alla Policy\nLa presente informativa può essere aggiornata. Gli utenti saranno informati in caso di modifiche rilevanti tramite avviso sulla piattaforma.\n\n12. Riferimenti normativi\nRedatta in conformità al GDPR (Regolamento UE 2016/679) e alla normativa italiana in materia di protezione dei dati personali.";
            
            const defaultTerms = "1. Titolare del sito e Denominazione Sociale\nL'Ecosistema Prof. Memmo è gestito da Prof. Memmo - Games&Co. di Guglielmo Piersanti. Email di contatto: prof.memmo@gmail.com\n\n2. Accettazione dei Termini\nL'accesso e l'utilizzo dell'Ecosistema Prof. Memmo e delle relative piattaforme didattiche implicano l'accettazione integrale dei presenti Termini e Condizioni. Se l'utente non intende accettare tali condizioni, è invitato a non utilizzare i servizi.\n\n3. Descrizione dell'attività: Prof. Memmo\nProf. Memmo è un progetto educativo digitale dedicato alla scuola secondaria di primo grado. Il progetto offre risorse, attività didattiche, giochi educativi e ambienti digitali interattivi destinati principalmente a docenti e studenti. Attraverso l'Ecosistema Prof. Memmo è possibile accedere, in base al piano scelto, a piattaforme e strumenti didattici quali giochi educativi, attività interattive, simulazioni, missioni e materiali per l'apprendimento. I servizi a pagamento sono forniti attraverso abbonamenti annuali e consentono l'accesso alle funzionalità e ai contenuti previsti dal relativo piano.\n\n4. Piani e prezzi\nGli abbonamenti a pagamento hanno durata annuale e si rinnovano automaticamente alla scadenza, salvo disdetta. Il rinnovo viene effettuato tramite il metodo di pagamento associato all'abbonamento. È possibile disdire l'abbonamento prima della successiva data di rinnovo. In caso di disdetta, l'accesso alle funzionalità del piano rimane attivo fino alla conclusione del periodo già pagato, salvo quanto previsto dai Termini e condizioni. I prezzi e le caratteristiche dei singoli piani sono indicati nella pagina dedicata \"Prezzi e Piani\". Gli studenti inseriti in una classe didattica creata da un docente non sono soggetti a costi aggiuntivi.\n\n5. Pagamenti\nI pagamenti degli abbonamenti sono gestiti tramite Stripe, piattaforma di pagamento sicura e indipendente. Prof. Memmo non gestisce né memorizza direttamente i dati completi delle carte di pagamento. Al momento del pagamento l'utente viene reindirizzato alla pagina di pagamento sicura e protetta di Stripe.\n\n6. Rinnovo e disdetta dell'abbonamento\nGli abbonamenti annuali si rinnovano automaticamente per un ulteriore periodo di un anno alla relativa data di scadenza. L'utente può disdire il rinnovo del proprio abbonamento prima della successiva scadenza. La disdetta impedisce il rinnovo successivo, mentre l'accesso ai contenuti e alle funzionalità del piano rimane disponibile fino al termine del periodo già pagato, secondo quanto previsto dai Termini e condizioni. Le modalità di gestione dell'abbonamento e dei pagamenti sono indicate nell'area personale e nei servizi messi a disposizione da Stripe.\n\n7. Assistenza\nPer informazioni sui servizi, sui piani di abbonamento, sugli acquisti o per ricevere assistenza tecnica e didattica è possibile contattare il supporto ufficiale:\nEmail: prof.memmo@gmail.com\n\n8. Utilizzo del servizio e regole di condotta\nL'utente si impegna a utilizzare la piattaforma in modo corretto e conforme alle finalità educative, evitando di:\n- Inviare messaggi offensivi, illeciti, diffamatori o spam;\n- Tentare di compromettere o eludere la sicurezza e l'integrità delle piattaforme;\n- Utilizzare il servizio per scopi fraudolenti o commerciali non autorizzati;\n- Condividere le credenziali del proprio account con terzi;\n- Eludere i sistemi di abbonamento o accedere a funzionalità non previste dal proprio piano.\n\n9. Modulo di contatto e posta interna\nL'utente è l'unico responsabile dei contenuti, dei messaggi e dei testi inviati tramite i moduli di contatto, le bacheche o la posta interna dei giochi. È severamente vietato inserire dati falsi o contenuti non pertinenti.\n\n10. Proprietà intellettuale e Licenza Didattica\nTutti i contenuti presenti nell'ecosistema (testi, narrazioni, schede didattiche, grafiche, marchi, meccaniche di gioco e software) sono di proprietà esclusiva dell'autore e sono protetti tramite deposito e marcatura temporale presso Patamu. I contenuti sono inoltre distribuiti con licenza Creative Commons Attribuzione - Non commerciale - Non opere derivate 4.0 Internazionale (CC BY-NC-ND 4.0). È vietata qualsiasi riproduzione, distribuzione, modifica o utilizzo commerciale non preventivamente autorizzato per iscritto.\n\n11. Limitazione di responsabilità\nI servizi sono forniti \"così come sono\". Il titolare adotta le migliori pratiche per garantire la continuità e la sicurezza della piattaforma, ma non risponde per eventuali temporanee interruzioni di rete, cause di forza maggiore o anomalie indipendenti dalla propria infrastruttura.\n\n12. Link esterni\nL'ecosistema può contenere collegamenti a siti o servizi esterni di terze parti. Il titolare non esercita alcun controllo e non assume responsabilità per contenuti, privacy policy o pratiche di siti terzi.\n\n13. Modifiche ai Termini\nIl titolare si riserva il diritto di aggiornare o modificare i presenti Termini e Condizioni a seguito di evoluzioni normative o tecniche, dandone tempestiva comunicazione agli utenti sulla piattaforma.\n\n14. Legge applicabile e Foro competente\nI presenti Termini sono regolati dalla legge italiana e dal Regolamento UE 2016/679 (GDPR). Per qualsiasi controversia civile derivante dall'interpretazione o esecuzione del servizio, il foro competente è quello previsto dalla legge applicabile.";

            // Populate fields
            document.getElementById('legal-fiscal-name').value = data.fiscalName || 'Guglielmo Piersanti';
            const elCompany = document.getElementById('legal-fiscal-company');
            if (elCompany) elCompany.value = data.fiscalCompany || 'Prof. Memmo - Games&Co.';
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
        const db = this.getDb();
        if (!db) return;
        this.fiscalEnabled = !this.fiscalEnabled;
        this.updateFiscalSwitchUI();

        try {
            await Promise.all([
                db.collection('ecosistema_settings').doc('legal').set({ showFiscalInFooter: this.fiscalEnabled }, { merge: true }),
                db.collection('hub_settings').doc('legal').set({ showFiscalInFooter: this.fiscalEnabled }, { merge: true })
            ]);
            console.log("Visibilità dati fiscali salvata:", this.fiscalEnabled);
        } catch(e) {
            console.error("Errore salvataggio visibilità dati fiscali:", e);
        }
    },

    saveFiscalInfo: async function() {
        const db = this.getDb();
        if (!db) {
            alert("Database Firebase non pronto. Ricarica la pagina.");
            return;
        }
        const name = document.getElementById('legal-fiscal-name').value.trim();
        const companyEl = document.getElementById('legal-fiscal-company');
        const company = companyEl ? companyEl.value.trim() : 'Prof. Memmo - Games&Co.';
        const code = document.getElementById('legal-fiscal-code').value.trim();
        const email = document.getElementById('legal-fiscal-email').value.trim();
        try {
            await Promise.all([
                db.collection('ecosistema_settings').doc('legal').set({
                    fiscalName: name,
                    fiscalCompany: company,
                    fiscalCode: code,
                    fiscalEmail: email
                }, { merge: true }),
                db.collection('hub_settings').doc('legal').set({
                    fiscalName: name,
                    fiscalCompany: company,
                    fiscalCode: code,
                    fiscalEmail: email
                }, { merge: true })
            ]);
            alert("Dati Fiscali salvati con successo!");
        } catch(e) {
            console.error("Errore salvataggio dati fiscali:", e);
            alert("Errore durante il salvataggio: " + (e.message || e));
        }
    },

    saveCopyrightText: async function() {
        const db = this.getDb();
        if (!db) {
            alert("Database Firebase non pronto. Ricarica la pagina.");
            return;
        }
        const text = document.getElementById('legal-copyright-text').value.trim();
        try {
            await Promise.all([
                db.collection('ecosistema_settings').doc('legal').set({ copyrightText: text }, { merge: true }),
                db.collection('hub_settings').doc('legal').set({ copyrightText: text }, { merge: true })
            ]);
            alert("Testo Copyright salvato con successo!");
        } catch(e) {
            console.error("Errore salvataggio copyright:", e);
            alert("Errore durante il salvataggio: " + (e.message || e));
        }
    },

    savePrivacyText: async function() {
        const db = this.getDb();
        if (!db) {
            alert("Database Firebase non pronto. Ricarica la pagina.");
            return;
        }
        const text = document.getElementById('legal-privacy-text').value.trim();
        try {
            await Promise.all([
                db.collection('ecosistema_settings').doc('legal').set({ privacyText: text }, { merge: true }),
                db.collection('hub_settings').doc('legal').set({ privacyText: text }, { merge: true })
            ]);
            alert("Privacy Policy salvata con successo! I nuovi contenuti saranno visibili su tutti i siti.");
        } catch(e) {
            console.error("Errore salvataggio privacy:", e);
            alert("Errore durante il salvataggio: " + (e.message || e));
        }
    },

    saveTermsText: async function() {
        const db = this.getDb();
        if (!db) {
            alert("Database Firebase non pronto. Ricarica la pagina.");
            return;
        }
        const text = document.getElementById('legal-terms-text').value.trim();
        try {
            await Promise.all([
                db.collection('ecosistema_settings').doc('legal').set({ termsText: text }, { merge: true }),
                db.collection('hub_settings').doc('legal').set({ termsText: text }, { merge: true })
            ]);
            alert("Termini e Condizioni salvati con successo!");
        } catch(e) {
            console.error("Errore salvataggio termini:", e);
            alert("Errore durante il salvataggio: " + (e.message || e));
        }
    }
};

window.LegalAdminUI = LegalAdminUI;



