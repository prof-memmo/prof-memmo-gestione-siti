# BLUEPRINT E REGOLE D'USO PER I SITI DELL'ECOSISTEMA PROF. MEMMO
# Versione 2.0 - Consolidata, Armonizzata e Blindata (30 Ottobre 2026)

Questo documento costituisce il promemoria e la specifica tecnica ufficiale per la creazione, lo sviluppo e l'integrazione di **tutti i nuovi siti, giochi e applicazioni web** dell'Ecosistema Didattico Prof. Memmo.
Ogni nuovo progetto deve rispettare scrupolosamente i parametri comuni, le convenzioni stilistiche e la checklist di innesto nell'Hub centrale.

---

## PARTE 1 - PRINCIPI ARCHITETTURALI E FILOSOFIA DI DESIGN

### 1. Semplicità Radicale e Zero Ridondanza (Vanilla Stack)
* **Tecnologie ammesse**: Solo **HTML5 semantico, CSS3 moderno e JavaScript nativo (Vanilla)**.
* **Divieto di boilerplate e framework pesanti**: È vietato introdurre framework JS complessi (React, Next, Vue, Angular) o build system invasivi per semplici app o giochi didattici. L'avvio deve essere immediato nel browser, con zero dipendenze fragili da compilare o aggiornare.
* **Evitare componenti superflui (Art. 1 Regole Operative)**: Nessun elemento UI o campo di input deve essere aggiunto senza una specifica finalità didattica concordata. L'interfaccia deve rimanere pulita, intuitiva e focalizzata sul contenuto.

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
* **Single Page Application (SPA) a Viste**: Le diverse schermate (Benvenuto, Gioco, Classifica, Regolamento) si alternano all'interno dello stesso container tramite sezioni dedicate (`<section class="app-view active">` e `<section class="app-view hidden">`), gestite dalla funzione standard `App.showView(viewId)` o `navigateTo(viewId)`.
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

### 3. Tipografia Ufficiale (Carattere Comune Julius Sans One + Inter)
Tutti i siti e giochi dell'ecosistema condividono l'identità tipografica distintiva collaudata su *L'Oratore*, *HistoryGram* e *La Ruota Geografica*:
* **Titoli, Headings e Branding Display**: `Julius Sans One` (o `Cinzel` per contesti storici classici) – garantisce un'estetica solenne, elegante e immediatamente riconoscibile come gioco dell'Ecosistema Prof. Memmo.
* **Testo di Lettura e Controlli UI**: `Inter` (pesi 400, 500, 600, 700) – per garantire la massima leggibilità su monitor scolastici, LIM e tablet.
* **Nota di Accessibilità per LIM (Pilastro 3 Regole Operative)**: Nei componenti grafici rotanti o canvas (es. spicchi di ruote, tessere dinamiche da leggere a 3 metri di distanza), evitare font sottili: utilizzare font solidi ad alta densità (`Inter` o `system-ui` peso `bold` / `900`).
* *(Eccezione Didattica DSA)*: È consentito l'uso di `Lexend` per gli eserciziari o strumenti dove sia richiesta un'agevolazione specifica per la dislessia (es. Palestra di Riflessione).
* **Snippet `<head>` obbligatorio**:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;500;600;700;800&family=Julius+Sans+One&display=swap" rel="stylesheet">
  ```

### 4. Palette Colori e Variabili CSS di Base (`:root`)
Ogni sito mantiene una coerenza visiva globale personalizzando unicamente il colore di accento tematico del gioco:
```css
:root {
    --color-primary: #d4af37;        /* Accento tematico del gioco (es. Oro, Turchese, Verde, Rubino) */
    --color-primary-hover: #b89628;  /* Tonalità hover dell'accento */
    --color-bg-dark: #0f172a;        /* Sfondo scuro principale (Slate 900) */
    --color-bg-card: rgba(30, 41, 59, 0.75); /* Card in glassmorphism (Slate 800 semi-trasparente) */
    --color-text-main: #f8fafc;      /* Testo chiaro ad alto contrasto */
    --color-text-muted: #94a3b8;     /* Testo secondario/didascalie */
    --border-card: 1px solid rgba(255, 255, 255, 0.1);
    --border-subtle: rgba(255, 255, 255, 0.08);
    --radius-card: 16px;
    --radius-pill: 50px;
    --font-heading: 'Julius Sans One', sans-serif;
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

## PARTE 2 - COMPONENTI STANDARD DI INTERFACCIA E REGOLE DI CONGELAMENTO

### 1. Header Comune a 3 Sezioni
L'header è posizionato fisso in alto a `height: 64px`, `z-index: 1000`, e suddiviso in tre blocchi visivi:
1. **Sinistra**: Logo ufficiale del gioco specifico (cliccabile per tornare alla schermata home della SPA).
2. **Centro**: Avatar rotondo del Prof. Memmo con logo centrale, collegato alla home dei giochi:
   ```html
   <img src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/branding/prof-memmo/avatar.png" class="header-prof-logo" alt="Prof. Memmo">
   ```
3. **Destra**: Pillola Profilo Utente che aziona il Menù a Tendina (Dropdown).

### 2. Menù a Tendina Standard (User Dropdown) – Componente Congelato e Additivo (Art. 14)
* **Regola di Non-Distruttività**: Il menù a tendina dell'ecosistema è un **componente formalmente congelato**. È fatto divieto assoluto di riscriverlo da zero, rimuovere classi o alterare gli identificatori standard (`#user-menu-trigger`, `#user-dropdown`, `#header-user-avatar`, `#btn-logout-dropdown`). Qualsiasi personalizzazione specifica del gioco deve essere **puramente additiva**.
* **Pre-Hydration SSO Istantanea (Zero-Flicker)**:
  Per evitare che un utente già autenticato nell'Hub o in un altro gioco dell'ecosistema veda comparire "OSPITE" durante il caricamento, è obbligatorio inserire il micro-script inline dentro la pillola:
  ```html
  <script>
    (function() {
      try {
        var candidateKeys = ['corte_user', 'hub_user', 'currentUser', 'user', 'teacherUser', 'eroi_user_profile', 'fanta_user', 'pm_oratore_user'];
        var cached = null;
        for (var i = 0; i < candidateKeys.length; i++) {
          var raw = localStorage.getItem(candidateKeys[i]);
          if (raw) {
            try { var p = JSON.parse(raw); if (p && (p.name || p.email || p.displayName)) { cached = p; break; } } catch(e) {}
          }
        }
        var ssoName = cached ? (cached.name || cached.displayName || (cached.anagrafica && cached.anagrafica.nome) || (cached.email && cached.email.split('@')[0])) : localStorage.getItem('hub_user_name');
        var ssoRole = (cached && (cached.role || cached.ruolo)) || localStorage.getItem('hub_user_role') || 'docente';
        var isSuper = (cached && cached.email && cached.email.toLowerCase() === 'prof.memmo@gmail.com') || ssoRole === 'admin' || (ssoName && ssoName.toUpperCase().includes('MEMMO'));
        if (ssoName) {
          var rLbl = isSuper ? 'AMMINISTRATORE' : (ssoRole === 'studente' ? 'STUDENTE' : 'DOCENTE');
          var elN = document.getElementById('header-user-name'); if (elN) elN.textContent = ssoName.toUpperCase();
          var elR = document.getElementById('header-user-role'); if (elR) elR.textContent = rLbl;
        }
      } catch(e) {}
    })();
  </script>
  ```
* **Contenuti standard del Dropdown**:
  1. *Header Dropdown*: Nome visualizzato e Ruolo (Docente, Studente, Viandante, Ospite).
  2. *Box Musica di Sottofondo (`.dropdown-music-box`)*: Player audio integrato con titolo traccia, comandi Precedente/Play-Pausa/Successiva, credit esplicito a `FREETOUSE.COM/MUSIC` e tasto Mute.
  3. *Pulsante Login Hub (se Ospite)*: Pillola ad alta visibilità "Accedi tramite Hub" con redirect a `portal.html?redirect={HUB_GAME_ID}`.
  4. *Pulsanti Condivisi*: "Modifica Profilo Hub", "Invita un Collega" (`openSharedModal('invita')`), "Notifiche" (`openSharedModal('notifiche')`).
  5. *Pulsante Esci (Logout)*: Disconnessione e rimozione chiavi di sessione.

### 3. Appartenenza Obbligatoria al Piano "Ecosistema Completo" & Guardia SSO
* **Inclusione d'Ufficio**: Ogni nuovo gioco didattico dell'ecosistema appartiene di diritto al piano apicale **Ecosistema Completo** (`docente_ecosistema`). L'accesso deve essere garantito automaticamente a tutti gli utenti con piano completo oltre che all'eventuale piano per singola materia.
* **Configurazione Iniziale `<head>`**:
  ```html
  <script>window.HUB_GAME_ID = "nome_gioco";</script>
  <script>
    (function() {
      var isPrev = window.location.pathname.indexOf('/preview') !== -1;
      var cdnBase = isPrev ? 'https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/shared/' : 'https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/';
      document.write('<script src="' + cdnBase + 'hub-subscription-guard.js?v=20261029_guard"><\/script>');
      document.write('<script src="' + cdnBase + 'legal-modal.js?v=20261020_legal"><\/script>');
    })();
  </script>
  ```
* **Firebase SDK Centralizzati**: Per consentire salvataggi delle partite e sincronizzazione cloud con l'Hub centrale (`prof-memmo-hub`):
  ```html
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>
  <script src="js/firebase-init.js"></script>
  ```

### 4. Footer Globale "Edge-to-Edge" (Da Margine a Margine)
* **Requisito di Layout a Tutta Larghezza (`100%`)**:
  Il footer deve estendersi da margine a margine dello schermo, senza margini laterali o gabbie galleggianti che lo interrompano visivamente:
  ```css
  .app-footer, .view-footer-copyright {
      width: 100%;
      margin: 0;
      padding: 20px 24px 16px;
      border-top: 1px solid var(--border-subtle);
      background: rgba(15, 23, 42, 0.95);
      box-sizing: border-box;
      flex-shrink: 0;
  }
  ```
* **Requisiti Inderogabili di Copyright & GDPR (Art. 4 Regole Operative)**:
  - **Badge Patamu**: Altezza fissa esatta **52px** (`object-fit: contain; flex-shrink: 0;`).
  - **Testo di Copyright**: Licenza CC BY-NC-ND 4.0 con marcatura temporale Patamu.
  - **Link Privacy Policy & Termini**: Invocano direttamente le funzioni native condivise `openSharedModal('privacy')` e `openSharedModal('termini')`.

### 5. Miniguida Interattiva a Passaggi & Riprendi Partita
* **Miniguida Didattica**: In sostituzione dei regolamenti statici prolissi, i giochi adottano un modale step-by-step (`#miniguida-modal`) con passaggi progressivi (icona, titolo chiaro, spiegazione per la classe e tasti "Indietro" / "Avanti ➔").
* **Modale "Riprendi Partita"**: Presenza obbligatoria del salvataggio sessione in `localStorage` per consentire ai docenti di interrompere e riprendere la partita didattica in una lezione successiva.

### 6. Pausa Didattica Obbligatoria (45 Minuti)
Tutti i giochi dedicati agli studenti integrano la vista di protezione digitale `#view-pausa-obbligatoria`:
- Dopo 45 minuti continui di attività, la schermata si sospende automaticamente.
- Mostra il video del gatto che dorme (`https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/video/gatto-che-dorme.mp4`) e un timer conto alla rovescia di 15 minuti prima di sbloccare nuovamente l'interfaccia.

### 7. Standard PWA & Compatibilità Tablet/LIM
Tutti i giochi includono nel `<head>` i parametri per l'esperienza standalone a pieno schermo su Safari iPad e browser per LIM:
```html
<link rel="icon" type="image/png" sizes="32x32" href="favicon.png?v=4">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png?v=4">
<link rel="manifest" href="manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
```

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
| **8** | `hub.firestore.rules` & Firestore DB | Security Rules e `games_status` | Configurare le regole per il namespace `nome_gioco_*` e creare il documento `games_status/{nome_gioco}` con `allowedPlans: ['docente_ecosistema', 'docente_didattico', 'viandante', 'base']` |
| **9** | `shared/legal-modal.js` & `portal.html` | Informativa Privacy / Termini | Aggiungere il nome del nuovo gioco tra le piattaforme ufficiali dell'ecosistema citate nei testi legali |

---

## PARTE 4 - CHECKLIST DI INSERIMENTO NEL PORTALE VETRINA (`prof-memmo-games`)

Per completare la visibilità pubblica verso docenti e scuole:
1. **`giochi.html` & `archivio-giochi.html`**: Aggiungere la card illustrata del gioco con badge, categoria materia, tag didattici e pulsante "Vedi dettagli".
2. **`{nome-gioco}-dettagli.html`**: Creare la pagina di presentazione completa con teaser video, regolamento, benefici didattici e pulsante diretto "Gioca Ora".
3. **`prezzi.html`**: Inserire il nuovo gioco nella tabella comparativa con la spunta di inclusione totale sotto la colonna **Ecosistema Completo**.
4. **`condividi-esperienza.html`**: Inserire il gioco nel menu a tendina delle recensioni/feedback dei docenti.

---

## PARTE 5 - SCHELETRO HTML COMPLETO (STARTER BOILERPLATE UFFICIALE)

Questo è lo scheletro pulito, armonizzato e pronto all'uso da cui far partire ogni nuovo gioco:

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Nome Gioco – Sottotitolo Didattico | Prof. Memmo</title>
  
  <meta name="description" content="Descrizione didattica del gioco dell'Ecosistema Prof. Memmo.">
  <meta name="theme-color" content="#d4af37">

  <!-- Apple iOS Safari & PWA Icons -->
  <link rel="icon" type="image/png" sizes="32x32" href="favicon.png?v=4">
  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png?v=4">
  <link rel="manifest" href="manifest.json">
  <meta name="apple-mobile-web-app-title" content="Nome Gioco">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">

  <!-- Tipografia Comune dell'Ecosistema: Julius Sans One + Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;500;600;700;800&family=Julius+Sans+One&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

  <!-- Foglio di Stile del Gioco -->
  <link rel="stylesheet" href="css/style.css">

  <!-- Identità Gioco & Guardie Ecosistema Prof. Memmo -->
  <script>window.HUB_GAME_ID = "nome_gioco";</script>
  <script>
    (function() {
      var isPrev = window.location.pathname.indexOf('/preview') !== -1;
      var cdnBase = isPrev ? 'https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/shared/' : 'https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/';
      document.write('<script src="' + cdnBase + 'hub-subscription-guard.js?v=20261029_guard"><\/script>');
      document.write('<script src="' + cdnBase + 'legal-modal.js?v=20261020_legal"><\/script>');
    })();
  </script>

  <!-- Firebase SDKs Centralizzati (prof-memmo-hub) -->
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>
  <script src="js/firebase-init.js"></script>
</head>
<body>

  <!-- HEADER DELL'ECOSISTEMA (BRAND UNIFORME CONGELATO) -->
  <header class="app-header" id="main-app-header">
    <!-- Sinistra: Logo Gioco -->
    <div class="header-left">
      <img src="assets/branding/logo-header.png" alt="Logo Gioco" class="header-game-logo" id="btnLogoHome" onclick="App.showView('view-welcome')">
    </div>

    <!-- Centro: Logo Avatar Prof. Memmo Centrato -->
    <div class="header-center-logo">
      <div class="header-prof-logo-wrapper" onclick="App.showView('view-welcome')" title="Torna alla Home">
        <img src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/branding/prof-memmo/avatar.png" class="header-prof-logo" alt="Prof. Memmo Avatar">
      </div>
    </div>

    <!-- Destra: Pillola Profilo Utente & Accesso SSO -->
    <div class="header-right">
      <div class="user-menu-container">
        <!-- Trigger Pill -->
        <div class="user-menu-trigger" id="user-menu-trigger" onclick="App.toggleUserDropdown(event)">
          <div class="user-avatar-circle">
            <img id="header-user-avatar" src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/branding/prof-memmo/prof-memmo-avatar.png" alt="Avatar">
          </div>
          <div class="user-trigger-text">
            <span class="user-trigger-name" id="header-user-name">ACCEDI</span>
            <span class="user-trigger-role" id="header-user-role">OSPITE</span>
          </div>

          <!-- Micro-Script Pre-Hydration Istantanea (Zero-Flicker) -->
          <script>
            (function() {
              try {
                var candidateKeys = ['corte_user', 'hub_user', 'currentUser', 'user', 'teacherUser', 'eroi_user_profile', 'fanta_user', 'pm_oratore_user'];
                var cached = null;
                for (var i = 0; i < candidateKeys.length; i++) {
                  var raw = localStorage.getItem(candidateKeys[i]);
                  if (raw) {
                    try { var p = JSON.parse(raw); if (p && (p.name || p.email || p.displayName)) { cached = p; break; } } catch(e) {}
                  }
                }
                var ssoName = cached ? (cached.name || cached.displayName || (cached.anagrafica && cached.anagrafica.nome) || (cached.email && cached.email.split('@')[0])) : localStorage.getItem('hub_user_name');
                var ssoRole = (cached && (cached.role || cached.ruolo)) || localStorage.getItem('hub_user_role') || 'docente';
                var isSuper = (cached && cached.email && cached.email.toLowerCase() === 'prof.memmo@gmail.com') || ssoRole === 'admin' || (ssoName && ssoName.toUpperCase().includes('MEMMO'));
                if (ssoName) {
                  var rLbl = isSuper ? 'AMMINISTRATORE' : (ssoRole === 'studente' ? 'STUDENTE' : 'DOCENTE');
                  var elN = document.getElementById('header-user-name'); if (elN) elN.textContent = ssoName.toUpperCase();
                  var elR = document.getElementById('header-user-role'); if (elR) elR.textContent = rLbl;
                  var elDN = document.getElementById('dropdown-user-name'); if (elDN) elDN.textContent = ssoName.toUpperCase();
                  var elDR = document.getElementById('dropdown-user-role-sub'); if (elDR) elDR.textContent = rLbl;
                }
              } catch(e) {}
            })();
          </script>
          <span class="user-trigger-chevron"><i class="fa-solid fa-chevron-down"></i></span>
        </div>

        <!-- Dropdown Card Integrata (Con Scrollbar Interna) -->
        <div class="user-dropdown hidden" id="user-dropdown">
          <div class="dropdown-user-header">
            <div class="dropdown-user-title" id="dropdown-user-name">ACCESSO DOCENTE</div>
            <div class="dropdown-user-subtitle" id="dropdown-user-role-sub">ECOSISTEMA PROF. MEMMO</div>
          </div>

          <!-- Sottofondo Music Player Widget -->
          <div class="dropdown-music-box">
            <div class="music-header">
              <span class="music-label"><i class="fa-solid fa-music"></i> SOTTOFONDO</span>
              <a href="https://freetouse.com/music" target="_blank" class="music-link">FREETOUSE.COM/MUSIC</a>
            </div>
            <div class="music-capsule">
              <span class="music-track-title" id="music-track-title">Traccia Didattica</span>
              <div class="music-btns">
                <button class="music-btn-icon" onclick="AudioEngine.prevTrack()" title="Precedente"><i class="fa-solid fa-backward-step"></i></button>
                <button class="music-play-btn" id="music-play-btn" onclick="AudioEngine.togglePlay()" title="Play/Pausa"><i class="fa-solid fa-play"></i></button>
                <button class="music-btn-icon" onclick="AudioEngine.nextTrack()" title="Successiva"><i class="fa-solid fa-forward-step"></i></button>
              </div>
            </div>
          </div>

          <!-- Pulsante Login Hub (se non autenticato) -->
          <button class="dropdown-pill-btn btn-login-green" id="btn-login-hub-dropdown" onclick="App.goToUnifiedLogin()">
            <i class="fa-solid fa-right-to-bracket"></i> Accedi tramite Hub
          </button>

          <!-- Pulsante Profilo Hub (se autenticato) -->
          <button class="dropdown-pill-btn hidden" id="btn-profile-dropdown" onclick="window.open('https://prof-memmo.github.io/games/profilo.html', '_blank')">
            <i class="fa-solid fa-user-gear"></i> Gestisci Profilo Hub
          </button>

          <button class="dropdown-pill-btn" onclick="if(window.openSharedModal) window.openSharedModal('invita');">
            <i class="fa-solid fa-paper-plane"></i> Invita un Collega
          </button>

          <button class="dropdown-pill-btn" id="btn-notifiche-dropdown" onclick="if(window.openSharedModal) window.openSharedModal('notifiche');">
            <i class="fa-solid fa-bell"></i> Notifiche <span id="dropdown-notif-badge" class="badge-notif-pill" style="display:none;">0</span>
          </button>

          <div class="dropdown-bottom-row">
            <button class="dropdown-pill-btn btn-disattiva-musica" id="music-mute-toggle-btn" onclick="AudioEngine.toggleMute()">
              <i class="fa-solid fa-volume-high"></i> Disattiva Audio
            </button>
            <button class="dropdown-pill-btn btn-esci-red" id="btn-logout-dropdown" onclick="App.confirmLogout()">
              <i class="fa-solid fa-power-off"></i> Esci
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- CONTENITORE PRINCIPALE VISTE SPA (NO-SCROLL DIRETTO) -->
  <main class="main-wrapper" id="main-content">
    <!-- VISTA 1: Welcome Home -->
    <section id="view-welcome" class="app-view active">
      <div class="welcome-hero">
        <h1 class="welcome-title">NOME GIOCO</h1>
        <p class="welcome-subtitle">Descrizione didattica chiara, semplice ed essenziale per la classe.</p>
        <div class="welcome-actions-wrap">
          <button class="btn-welcome-primary" onclick="App.showView('view-game')">
            <i class="fa-solid fa-play"></i> Inizia Nuova Partita
          </button>
          <button class="btn-welcome-secondary" onclick="App.openSavedGamesModal()">
            <i class="fa-solid fa-folder-open"></i> Riprendi Partita
          </button>
          <button class="btn-welcome-secondary" onclick="App.openMiniguida()">
            <i class="fa-solid fa-book-open"></i> Miniguida
          </button>
        </div>
      </div>
    </section>

    <!-- VISTA 2: Tavolo di Gioco -->
    <section id="view-game" class="app-view hidden">
      <div class="game-board-container scrollable-content">
        <!-- Contenuto interattivo di gioco -->
      </div>
    </section>
  </main>

  <!-- FOOTER GLOBALE EDGE-TO-EDGE (PATAMU & MODALI LEGALI) -->
  <footer class="app-footer">
    <div class="footer-legal-links">
      <a href="javascript:void(0)" onclick="openSharedModal('privacy')">Privacy Policy</a>
      <span>•</span>
      <a href="javascript:void(0)" onclick="openSharedModal('termini')">Termini e Condizioni</a>
    </div>
    <div class="footer-badge-text-row">
      <img src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/legal/patamu-badge.png" alt="Patamu" class="patamu-footer-badge" style="height: 52px; object-fit: contain; flex-shrink: 0;">
      <p class="footer-copy">© 2026 Guglielmo Piersanti. Tutti i diritti riservati. Opera protetta da marcatura temporale Patamu e licenza CC BY-NC-ND 4.0.</p>
    </div>
  </footer>

  <!-- Scripts dell'Applicazione -->
  <script src="js/music.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```
