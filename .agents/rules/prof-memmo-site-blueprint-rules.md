# BLUEPRINT E REGOLE D'USO PER I SITI DELL'ECOSISTEMA PROF. MEMMO
# Versione 1.0 - Consolidata e Armonizzata (20 Ottobre 2026)

Questo documento costituisce il promemoria e la specifica tecnica ufficiale per la creazione, lo sviluppo e l'integrazione di **tutti i nuovi siti, giochi e applicazioni web** dell'Ecosistema Didattico Prof. Memmo.
Ogni nuovo progetto deve rispettare scrupolosamente i parametri comuni, le convenzioni stilistiche e la checklist di innesto nell'Hub centrale.

---

## PARTE 1 - PRINCIPI ARCHITETTURALI E FILOSOFIA DI DESIGN

### 1. Semplicità Radicale e Zero Ridondanza (Vanilla Stack)
* **Tecnologie ammesse**: Solo **HTML5 semantico, CSS3 moderno e JavaScript nativo (Vanilla)**.
* **Divieto di boilerplate e framework pesanti**: È vietato introdurre framework JS complessi (React, Next, Vue, Angular) o build system invasivi per semplici app o giochi didattici. L'avvio deve essere immediato nel browser, con zero dipendenze fragili da compilare o aggiornare.
* **Evitare componenti superflui (Art. 1 Regole Operative)**: Nessun elemento UI o campo di input deve essere aggiunto senza una specifica finalità didattica o concordata. L'interfaccia deve rimanere pulita, intuitiva e focalizzata sul contenuto.

### 2. Architettura "No-Scroll" (Fit-to-Screen / Vista Unica)
* **Principio guida**: L'applicazione deve presentarsi come una schermata compatta e immersiva (dashboard o tavolo da gioco), evitando lo scroll verticale dell'intera pagina.
* **Unità Viewport sicure**: Usare sempre `height: 100dvh` (Dynamic Viewport Height) per evitare che su Safari iOS/iPadOS la barra degli indirizzi o la dock mobile coprano i comandi inferiori:
  ```css
  html, body {
      margin: 0;
      padding: 0;
      height: 100dvh;
      min-height: 100dvh;
      max-height: 100dvh;
      overflow: hidden; /* Blocco totale dello scroll del body */
      box-sizing: border-box;
  }
  ```
* **Single Page Application (SPA) a Viste**: Le diverse schermate (Benvenuto, Gioco, Classifica, Regolamento) si alternano all'interno dello stesso container tramite sezioni dedicate (`<section class="view active">` e `<section class="view hidden">`), gestite dalla funzione standard `navigateTo(viewId)`.
* **Scroll Contenuto ed Esclusivo**: Se una tabella, classifica o elenco di carte eccede lo spazio disponibile, lo scroll è consentito **esclusivamente all'interno di quello specifico sotto-container**, con scrollbar sottile e discreta:
  ```css
  .scrollable-content {
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }
  .scrollable-content::-webkit-scrollbar {
      width: 6px;
  }
  .scrollable-content::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.25);
      border-radius: 4px;
  }
  ```

### 3. Tipografia Ufficiale (Font System)
Tutti i siti dell'ecosistema condividono la stessa coppia di font Google:
* **Titoli e Display**: `Outfit` (pesi 600, 700, 800) – per un'identità forte, pulita, moderna e geometrica.
* **Testo di lettura e Controlli UI**: `Inter` (pesi 400, 500, 600) – per garantire la massima leggibilità su monitor scolastici, LIM e tablet.
* *(Eccezione Didattica DSA)*: È consentito l'uso di `Lexend` per gli eserciziari o strumenti dove sia richiesta un'agevolazione specifica per la dislessia (es. Palestra di Riflessione).
* **Snippet `<head>` obbligatorio**:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
  ```

### 4. Palette Colori e Variabili CSS di Base (`:root`)
Ogni sito mantiene una coerenza visiva globale personalizzando unicamente il colore di accento primario:
```css
:root {
    --color-primary: #d4af37;        /* Accento tematico del gioco (es. Oro, Blu, Verde, Rubino) */
    --color-primary-hover: #b89628;  /* Tonalità hover dell'accento */
    --color-bg-dark: #0f172a;        /* Sfondo scuro principale (Slate 900) */
    --color-bg-card: rgba(30, 41, 59, 0.75); /* Card in glassmorphism (Slate 800 semi-trasparente) */
    --color-text-main: #f8fafc;      /* Testo chiaro ad alto contrasto */
    --color-text-muted: #94a3b8;     /* Testo secondario/didascalie */
    --border-card: 1px solid rgba(255, 255, 255, 0.1);
    --radius-card: 16px;
    --radius-pill: 50px;
    --font-heading: 'Outfit', sans-serif;
    --font-ui: 'Inter', sans-serif;
    --shadow-soft: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}
```

### 5. Defensive UI (Asset e Immagini Protetti - Art. 5)
Per evitare che anomalie di caricamento o immagini esterne deformino le schede:
```css
img, avatar, badge {
    max-width: 100%;
    height: auto;
    object-fit: contain;
}
.header-prof-logo, .user-avatar-circle img {
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 50%;
}
```

---

## PARTE 2 - COMPONENTI STANDARD DI INTERFACCIA

### 1. Header Comune a 3 Sezioni
L'header è posizionato fisso in alto a `height: 64px`, `z-index: 1000`, e suddiviso in tre blocchi visivi:
1. **Sinistra**: Logo ufficiale del gioco specifico (cliccabile per tornare alla schermata home della SPA).
2. **Centro**: Avatar rotondo del Prof. Memmo con anello di luce (glow), collegato all'Hub centrale:
   ```html
   <img src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/branding/prof-memmo/prof-memmo-avatar.png" alt="Prof. Memmo" class="header-prof-logo">
   ```
3. **Destra**: Pillola Profilo Utente che aziona il Menù a Tendina (Dropdown).

### 2. Menù a Tendina Standard (User Dropdown)
* **Trigger**: Capsula interattiva contenente avatar rotondo (36px), Nome Utente (es. "Ospite" o nome docente), Ruolo didattico e freccia chevron (`ph-caret-down` o `fa-chevron-down`).
* **Comportamento**:
  - Al click si apre la card `#header-user-dropdown` posizionata in `position: absolute; right: 0; top: calc(100% + 8px); z-index: 1100;`.
  - Si chiude automaticamente cliccando all'esterno, cliccando su una voce o premendo il tasto `Escape`.
* **Contenuti standard del Dropdown**:
  1. *Header Dropdown*: Nome visualizzato e Ruolo (Docente, Studente, Viandante, Ospite).
  2. *Box Musica di Sottofondo (Opzionale per giochi immersivi)*: Player compatto con traccia, play/pausa e credits a FreeToUse.
  3. *Pulsante Login Hub (se Ospite)*: Pillola dorata ad alta visibilità "Accedi tramite Hub" collegata a `portal.html?redirect={HUB_GAME_ID}`.
  4. *Azioni Profilo (se Autenticato)*:
     - "Modifica Profilo" (link a `https://prof-memmo.github.io/games/profilo.html`).
     - "Invita un Collega" (apertura modale referral).
     - "Notifiche" (badge contatore).
     - "Esci" (disconnessione e pulizia sessione locale).

### 3. Guardia Abbonamenti e Accesso Unificato (SSO)
* **Dichiarazione Game ID**: Nel `<head>` prima di qualsiasi script:
  ```html
  <script>window.HUB_GAME_ID = "nome_gioco";</script>
  ```
* **Caricamento Script Guard con Rilevamento Preview**:
  ```html
  <script>
    (function() {
      var isPrev = window.location.pathname.indexOf('/preview') !== -1;
      var cdnBase = isPrev ? 'https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/shared/' : 'https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/';
      document.write('<script src="' + cdnBase + 'hub-subscription-guard.js?v=20261020_guard"><\/script>');
    })();
  </script>
  ```
* **Pulsante di Accesso Diretto**:
  ```html
  <button type="button" class="btn btn-login-hub" onclick="window.location.href='https://prof-memmo.github.io/prof-memmo-gestione-siti/portal.html?redirect=' + window.HUB_GAME_ID">
      Accedi tramite Hub
  </button>
  ```

### 4. Footer Globale e Modali Legali (GDPR & Copyright)
* **Script Legal Modal**: Da includere prima della chiusura del `</body>`:
  ```html
  <script>
    (function() {
      var isPrev = window.location.pathname.indexOf('/preview') !== -1;
      var cdnBase = isPrev ? 'https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/shared/' : 'https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/';
      document.write('<script src="' + cdnBase + 'legal-modal.js?v=20261020_legal"><\/script>');
    })();
  </script>
  ```
* **Requisiti Footer Inderogabili (Art. 4 Regole Operative)**:
  - **Badge Patamu**: Altezza fissa esatta **52px** (`object-fit: contain; flex-shrink: 0;`).
  - **Link Privacy & Termini**: Devono invocare le funzioni native condivise `openSharedModal('privacy')` e `openSharedModal('termini')`.
  - Non inserire loghi o avatar duplicati nel footer (vengono automaticamente rimossi da `legal-modal.js`).

### 5. Pausa Didattica Obbligatoria (45 Minuti)
Tutti i giochi dedicati a studenti integrano la vista di protezione digitale `#view-pausa-obbligatoria`:
- Dopo 45 minuti continui di attività, la schermata di gioco si sospende.
- Mostra il video del gatto che dorme (`https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/video/gatto-che-dorme.mp4`) e un timer conto alla rovescia di 15 minuti prima di sbloccare nuovamente l'interfaccia.

---

## PARTE 3 - CHECKLIST DI INNESTO NELL'HUB CENTRALE (`prof-memmo-admin-gestione-generale`)

Ogni volta che viene creato un nuovo sito/gioco, è **OBBLIGATORIO** inserire i riferimenti nei seguenti punti dell'Hub per garantire l'armonizzazione totale:

| # | File nell'Hub Admin | Posizione / Sezione | Cosa Inserire |
| :-: | :--- | :--- | :--- |
| **1** | `js/portal.js` | Oggetto `gameMap` (~riga 608) | Aggiungere la mappatura redirect per `/preview/` e `/main/`: `'nome_gioco': isPreview ? 'https://prof-memmo.github.io/nome_gioco/preview/' : 'https://prof-memmo.github.io/nome_gioco/'` |
| **2** | `js/dashboard/games-ui.js` | Array `gamesList` e mappa didattica | Registrare `{ id: 'nome_gioco', name: 'Nome Visualizzato' }` e definire `shortDesc`, `longDesc`, `materia`, `giocatori`, `durata`, `obiettivi`, `classe`, `uso` |
| **3** | `js/services/diagnostics/diagnostics-service.js` | Array diagnostica (~riga 62) | Registrare `{ id: 'nome_gioco', name: 'Nome Gioco', repo: 'nome_gioco', url: 'https://prof-memmo.github.io/nome_gioco/' }` per i test di uptime e audit 404 |
| **4** | `js/services/users/user-service.js` & `cross-projects.js` | Schema utente e abilitazioni | Inserire `nome_gioco: { enabled: true, permissions: [] }` tra le piattaforme di default del profilo e nella matrice delle materie docenti |
| **5** | `index.html` (Hub Admin) | Filtri iscritti e rilasci | Aggiungere `<option value="Nome Gioco">` nei selettori di filtro utenti e nella sezione di gestione versioni/rilasci |
| **6** | `js/app_v2.js` | Mappa email approvazione | Aggiungere il testo predefinito dell'email di conferma iscrizione docente per il gioco specifico |
| **7** | `functions/index.js` | Array repository autorizzati | Aggiungere il nome del repo nella lista dei progetti sincronizzati dalle Cloud Functions |
| **8** | `hub.firestore.rules` & Firestore DB | Security Rules e `games_status` | Configurare le regole per il namespace `nome_gioco_*` e creare il documento `games_status/{nome_gioco}` con `allowedPlans: ['base', 'viandante', 'docente_didattico', 'docente_ecosistema']` |
| **9** | `shared/legal-modal.js` & `portal.html` | Informativa Privacy / Termini | Aggiungere il nome del nuovo gioco tra le piattaforme ufficiali dell'ecosistema citate nei testi legali |

---

## PARTE 4 - CHECKLIST DI INSERIMENTO NEL PORTALE VETRINA (`prof-memmo-games`)

Per completare la visibilità pubblica verso docenti e scuole:
1. **`giochi.html` & `archivio-giochi.html`**: Aggiungere la card illustrata del gioco con badge, categoria materia, tag didattici e pulsante "Vedi dettagli".
2. **`{nome-gioco}-dettagli.html`**: Creare la pagina di presentazione completa con teaser video, regolamento, benefici didattici e pulsante diretto "Gioca Ora".
3. **`prezzi.html`**: Inserire il nuovo gioco nella tabella comparativa dei piani di abbonamento (Base vs Viandante vs Docente Materia Singola vs Ecosistema Completo).
4. **`condividi-esperienza.html`**: Inserire il gioco nel menu a tendina delle recensioni/feedback dei docenti.

---

## PARTE 5 - SCHELETRO HTML MINIMALE (STARTER BOILERPLATE)

Questo è lo scheletro pulito e pronto all'uso da cui far partire ogni nuova schermata:

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Nome Gioco - Prof. Memmo</title>
    <meta name="description" content="Descrizione didattica del gioco dell'Ecosistema Prof. Memmo.">
    
    <!-- Favicon & Touch Icons -->
    <link rel="icon" type="image/png" sizes="32x32" href="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/branding/prof-memmo/favicon.png">
    <link rel="apple-touch-icon" sizes="180x180" href="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/branding/prof-memmo/apple-touch-icon.png">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">

    <!-- Icone (Phosphor o FontAwesome) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- CSS Locale del Gioco -->
    <link rel="stylesheet" href="css/style.css">

    <!-- ID Gioco e Guardia Abbonamenti Condivisa -->
    <script>window.HUB_GAME_ID = "nome_gioco";</script>
    <script>
      (function() {
        var isPrev = window.location.pathname.indexOf('/preview') !== -1;
        var cdnBase = isPrev ? 'https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/shared/' : 'https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/';
        document.write('<script src="' + cdnBase + 'hub-subscription-guard.js?v=20261020_guard"><\/script>');
      })();
    </script>
</head>
<body>
    <div id="app-container">
        <!-- HEADER DELL'ECOSISTEMA -->
        <header class="app-header" id="main-app-header">
            <!-- Sinistra: Logo Gioco -->
            <div class="header-left">
                <img src="assets/branding/logo-header.png" alt="Logo Gioco" class="header-game-logo" onclick="navigateTo('view-home')">
            </div>

            <!-- Centro: Avatar Prof. Memmo -->
            <div class="header-center-logo">
                <div class="header-prof-logo-wrapper" onclick="window.location.href='https://prof-memmo.github.io/games/'" title="Torna all'Ecosistema Prof. Memmo">
                    <img src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/branding/prof-memmo/prof-memmo-avatar.png" class="header-prof-logo" alt="Prof. Memmo">
                </div>
            </div>

            <!-- Destra: Pillola Profilo & Dropdown -->
            <div class="header-right">
                <div class="user-menu-container">
                    <div class="user-menu-trigger" id="header-user-menu-trigger" onclick="event.stopPropagation(); window.toggleUserDropdown(event);">
                        <div class="user-avatar-circle">
                            <img id="header-user-avatar-img" src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/branding/prof-memmo/prof-memmo-avatar.png" alt="Avatar">
                        </div>
                        <div class="user-trigger-text">
                            <span class="user-trigger-name" id="header-user-name">OSPITE</span>
                            <span class="user-trigger-role" id="header-user-role">NON REGISTRATO</span>
                        </div>
                        <span class="user-trigger-chevron"><i class="fa-solid fa-chevron-down"></i></span>
                    </div>

                    <!-- Dropdown Card -->
                    <div class="user-dropdown hidden" id="header-user-dropdown" onclick="event.stopPropagation()">
                        <div class="dropdown-user-header">
                            <div class="dropdown-user-title" id="dropdown-user-title">OSPITE</div>
                            <div class="dropdown-user-subtitle" id="dropdown-user-subtitle">NON AUTENTICATO</div>
                        </div>

                        <button class="dropdown-pill-btn btn-login-gold" id="btn-login-hub-dropdown" onclick="window.location.href='https://prof-memmo.github.io/prof-memmo-gestione-siti/portal.html?redirect=' + window.HUB_GAME_ID">
                            <i class="fa-solid fa-right-to-bracket"></i> Accedi tramite Hub
                        </button>

                        <button class="dropdown-pill-btn" id="btn-profile-dropdown" style="display: none;" onclick="window.open('https://prof-memmo.github.io/games/profilo.html', '_blank');">
                            <i class="fa-solid fa-user-gear"></i> Modifica Profilo
                        </button>

                        <button class="dropdown-pill-btn btn-logout-danger" id="btn-logout-dropdown" style="display: none;" onclick="window.logoutUser();">
                            <i class="fa-solid fa-power-off"></i> Esci
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- CONTAINER VISTE SPA (NO-SCROLL DIRETTO) -->
        <main id="main-content">
            <!-- VISTA 1: Home/Benvenuto -->
            <section id="view-home" class="view active">
                <div class="view-inner-card">
                    <h1>Titolo Principale del Gioco</h1>
                    <p class="subtitle">Descrizione didattica chiara, semplice ed essenziale.</p>
                    <button class="btn btn-primary" onclick="navigateTo('view-gioco')">Inizia Attività</button>
                </div>
            </section>

            <!-- VISTA 2: Gioco/Attività -->
            <section id="view-gioco" class="view hidden">
                <div class="view-inner-card">
                    <h2>Tavolo di Gioco</h2>
                    <div id="game-board" class="scrollable-content">
                        <!-- Contenuto interattivo -->
                    </div>
                    <button class="btn btn-secondary" onclick="navigateTo('view-home')">Torna alla Home</button>
                </div>
            </section>
        </main>

        <!-- FOOTER PROTETTO (PATAMU & MODALI LEGALI) -->
        <footer class="app-footer">
            <div class="footer-legal-container">
                <img src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/legal/patamu-badge.png" alt="Patamu" class="patamu-badge" style="height: 52px; object-fit: contain; flex-shrink: 0;">
                <p class="copyright-text">© 2026 Guglielmo Piersanti. Tutti i diritti riservati. Opera protetta da marcatura temporale Patamu e licenza CC BY-NC-ND 4.0.</p>
                <div class="footer-links">
                    <a href="javascript:void(0)" onclick="openSharedModal('privacy')">Privacy Policy</a>
                    <span>•</span>
                    <a href="javascript:void(0)" onclick="openSharedModal('termini')">Termini e Condizioni</a>
                </div>
            </div>
        </footer>
    </div>

    <!-- Script di Sistema Condiviso per Modali Legali e Normalizzazione Footer -->
    <script>
      (function() {
        var isPrev = window.location.pathname.indexOf('/preview') !== -1;
        var cdnBase = isPrev ? 'https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/shared/' : 'https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/';
        document.write('<script src="' + cdnBase + 'legal-modal.js?v=20261020_legal"><\/script>');
      })();
    </script>
    <script src="js/app.js"></script>
</body>
</html>
```
