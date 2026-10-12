# REGOLE OPERATIVE DI SICUREZZA PER L'ECOSISTEMA PROF. MEMMO
# Versione 2.2 - Consolidata con Protocollo di Collaudo a 3 Livelli (Rete, Console JS & E2E) (Ottobre 2026)

Tutti gli agenti AI e i programmatori che operano sui repository dell'Ecosistema Prof. Memmo DEVONO rispettare rigorosamente le seguenti regole inderogabili.

---

### ART. 1 - NESSUNA INIZIATIVA NON RICHIESTA (ZERO UNSOLICITED INITIATIVES)
- E' fatto divieto assoluto di introdurre nuovi componenti UI, campi input, selettori, form, modali o stili che non siano stati espressamente richiesti e concordati con l'utente.
- Le implementazioni devono attenersi scrupolosamente all'obiettivo pattuito, senza estensioni arbitrarie.

---

### ART. 2 - DIVIETO ASSOLUTO DI CANCELLAZIONE SILENZIOSA (ZERO DELETIONS GUARD)
- E' severamente vietato cancellare, rinominare, commentare o svuotare:
  1. Blocchi di markup HTML preesistenti (viste, card, pulsanti, riepiloghi, elenchi).
  2. Metodi e funzioni JavaScript dei motori core (GameEngine, Board, AudioEngine, LiveEditor, App, Auth, DiagnosticsService).
  3. Classi o regole CSS preesistenti.
  4. Strutture dati e record nei file JSON.
- Qualsiasi modifica deve essere puramente additiva o di correzione mirata, preservando la retrocompatibilita totale con il markup storico approvato.

---

### ART. 3 - SALVAGUARDIA TOTALE DI UTENTE, AUTENTICAZIONE (SSO), LOGIN E ABBONAMENTI
- E' fatto divieto di alterare o rimuovere i componenti di autenticazione Firebase, i file di sessione (js/auth/session.js), la guardia abbonamenti (hub-subscription-guard.js) e il menu profilo utente (user-dropdown, avatar, nome, ruolo, scuola).
- I flussi di Single Sign-On (SSO) cross-progetto e i reindirizzamenti via query param (?redirect=...) devono essere sempre garantiti e funzionanti sia in ambiente standard che in ambiente /preview/.
- Le collezioni Cloud Firestore (hub_users, eroi_users, corte_users, fanta_users, palestra_users, ops_users, hub_settings, hub_didactic_overrides) non devono mai essere corrotte, svuotate o private di permessi di sicurezza.

---

### ART. 4 - INTEGRITA STRUTTURALE DEI COMPONENTI PROTETTI
- **Footer di Copyright Patamu**: Deve essere presente in tutte le viste principali, con altezza badge esattamente a 52px (object-fit: contain; flex-shrink: 0;), testo legale giustificato e opacita controllata.
- **Barra di Navigazione Inferiore (Dock Bar)**: Posizionamento fisso in basso a 64px di altezza, centrata, con icone, etichette e transizioni fluide.
- **Isolamento Modali**: Tutti i modali secondari (legale, profilo, salvataggi, live editor) devono avere la regola CSS `.hidden, [hidden] { display: none !important; }` per non influenzare mai il flusso e lo scroll delle pagine.

---

### ART. 5 - AUDIT AUTOMATICO ANTI-REGRESSIONE E VERIFICA VISIVA OBBLIGATORIA (PRE-COMMIT)
Prima di considerare conclusa qualsiasi modifica e prima di effettuare il push su Git, l'agente DEVE eseguire una verifica programmatica e visiva rigorosa:
1. **Audit Sintassi CSS Totale (File esterni e tag `<style>` inline)**:
   - Conteggio e bilanciamento matematico perfetto delle parentesi graffe `{` e `}` su tutti i file `.css` e su tutti i tag `<style>` embedded nelle pagine HTML (scarto zero tollerato).
   - Verifica di chiusura esplicita di ogni selettore e proprietà con `;` e `}`.
2. **Audit Visivo Obbligatorio (Browser Subagent / Visual Testing)**:
   - Per qualsiasi modifica che tocca HTML, CSS o flussi di navigazione/onboarding/login, l'agente ha il divieto assoluto di concludere il task senza aver prima eseguito una verifica con il browser reale/subagent.
   - L'agente deve catturare gli screenshot di collaudo per ogni sotto-vista (es. Scelta Ruolo, Accesso Docente, Codice Classe Studente, Roster Claiming, Onboarding Profilo) e confermare visivamente proporzioni, griglie e allineamenti.
3. **Defensive UI Pattern (Contenimento Forzato Asset & Immagini)**:
   - Nessuna immagine, avatar, badge o icona può essere inserita senza stili o classi di contenimento protetto (`max-width: 100%; max-height: 100%; object-fit: cover; aspect-ratio: 1/1;` e dimensioni fisse sul container) per impedire il rendering sformato anche in caso di anomalie di stile.
4. **Audit Database JSON**: Validazione di tutti i file JSON tramite parser automatico per certificare l'assenza di errori di sintassi, virgole mancanti o codifica.
5. **Audit Coerenza DOM / JS**: Verifica che nessun metodo JS referenzi ID o classi cancellati o inesistenti.
6. **Audit Working Tree**: Controllo di git diff e git status per verificare che non ci siano file sporchi o modifiche collaterali non intenzionali.

---

### ART. 6 - MODALITA CONSULTIVA (READ-ONLY) SU DOMANDE ESPLORATIVE
- Quando l'utente formula domande di parere, riflessione o strategia ("che ne pensi?", "come la vedi?", "cosa faresti?"), l'agente opera in modalita rigorosamente **READ-ONLY**.
- In questa modalita e vietato modificare file, eseguire comandi distruttivi o avviare refactoring: l'agente deve limitarsi a fornire analisi obiettive, confronti tecnici e proposte dettagliate in attesa dell'approvazione esplicita.

---

### ART. 7 - GESTIONE BRANCH E PUSH GIT
- Tutti i test, le verifiche e le nuove implementazioni DEVONO essere committati e spinti esclusivamente sul branch **preview** (git push origin preview).
- E' fatto divieto assoluto di eseguire il push diretto sul branch main a meno di esplicito comando di rilascio in produzione da parte dell'utente.

---

### ART. 8 - PROTOCOLLO DI COLLAUDO OBBLIGATORIO A 3 LIVELLI DELL'ECOSISTEMA (RETE, RUNTIME CONSOLE & FUNCTIONAL E2E)
Prima di considerare conclusa qualsiasi sessione di lavoro o rilascio, è fatto obbligo inderogabile di eseguire la scansione automatica di integrità su TUTTI i siti e sottodomini dell'Ecosistema Prof. Memmo secondo il protocollo di collaudo a 3 livelli, senza richiedere collaudi manuali preliminari all'utente:

1. **LIVELLO 1: AUDIT DI RETE & ASSET (ZERO-404 / 500)**:
   - **Zero 404 / 500 / 503**: Ogni singolo foglio di stile CSS, script JS, font web, immagine, logo, video e manifest collegato alle pagine deve rispondere con HTTP 200 OK.
   - **Coerenza di radice (No 404 da basePath)**: Divieto assoluto di prefissi di sottocartella su progetti ospitati su domini o sottodomini autonomi (es. Next.js `basePath: ''` per domini root).
   - **Encoding rigoroso degli URI**: Nessun percorso di immagine o video può contenere spazi grezzi o apici conflittuali negli attributi HTML (devono essere codificati con `%20` o normalizzati a livello di filesystem).
   - **Esecuzione Automatica Obbligatoria**: L'agente DEVE eseguire lo script `tools/audit_ecosistema.py` (o comando programmatico equivalente su tutti i 9 siti) e allegare l'esito 100% verde nel resoconto finale.

2. **LIVELLO 2: AUDIT BROWSER REALE & RUNTIME CONSOLE (ZERO-ERRORI JS RUNTIME)**:
   - **Rendering e Booting Completo**: Apertura automatizzata delle pagine tramite motore browser reale (Browser Subagent / Headless Browser).
   - **Ispezione Console Obbligatoria**: Nessuna eccezione JavaScript non gestita ammessa in console (`console.error`, `Uncaught TypeError`, `app-compat/no-app`, ecc.).
   - **Certificazione Firebase/Auth**: Monitoraggio del completamento del bootstrap dei servizi cloud (es. emissione evento `firebaseHubReady` o log di successo `🔥 Firebase Hub Centrale Unico inizializzato`).

3. **LIVELLO 3: TEST FUNZIONALE E2E (SIMULAZIONE INTERAZIONI & CLIC UTENTE)**:
   - **Simulazione Clic Reale**: Il browser automatizzato deve simulare i clic e le interazioni chiave dell'utente (es. pulsante `#btn-google-login`, navigazione tra sezioni, apertura modali).
   - **Verifica Flusso Auth/OAuth**: Accertamento che il clic apra correttamente il popup o flusso di autenticazione e che il pulsante mostri transizioni di stato coerenti (es. spinner di caricamento e ripristino) senza lanciare alert o bloccare l'interfaccia.
   - **Garanzia Zero-Test Manuali**: Nessuna modifica può essere dichiarata funzionante all'utente prima che i 3 livelli di collaudo automatico abbiano dato esito pienamente positivo.
