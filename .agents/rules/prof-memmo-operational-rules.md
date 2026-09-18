# REGOLE OPERATIVE DI SICUREZZA PER L'ECOSISTEMA PROF. MEMMO
# Versione 2.0 - Consolidata e Blindata (16 Settembre 2026)

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

### ART. 5 - AUDIT AUTOMATICO ANTI-REGRESSIONE OBBLIGATORIO (PRE-COMMIT)
Prima di considerare conclusa qualsiasi modifica e prima di effettuare il push su Git, l'agente DEVE eseguire una verifica programmatica automatica:
1. **Audit Sintassi CSS**: Conteggio e bilanciamento matematico perfetto delle parentesi graffe { e } su tutti i fogli di stile (scarto zero).
2. **Audit Database JSON**: Validazione di tutti i file JSON tramite parser automatico per certificare l'assenza di errori di sintassi, virgole mancanti o codifica.
3. **Audit Coerenza DOM / JS**: Verifica che nessun metodo JS referenzi ID o classi cancellati o inesistenti.
4. **Audit Working Tree**: Controllo di git diff e git status per verificare che non ci siano file sporchi o modifiche collaterali non intenzionali.

---

### ART. 6 - MODALITA CONSULTIVA (READ-ONLY) SU DOMANDE ESPLORATIVE
- Quando l'utente formula domande di parere, riflessione o strategia ("che ne pensi?", "come la vedi?", "cosa faresti?"), l'agente opera in modalita rigorosamente **READ-ONLY**.
- In questa modalita e vietato modificare file, eseguire comandi distruttivi o avviare refactoring: l'agente deve limitarsi a fornire analisi obiettive, confronti tecnici e proposte dettagliate in attesa dell'approvazione esplicita.

---

### ART. 7 - GESTIONE BRANCH E PUSH GIT
- Tutti i test, le verifiche e le nuove implementazioni DEVONO essere committati e spinti esclusivamente sul branch **preview** (git push origin preview).
- E' fatto divieto assoluto di eseguire il push diretto sul branch main a meno di esplicito comando di rilascio in produzione da parte dell'utente.
