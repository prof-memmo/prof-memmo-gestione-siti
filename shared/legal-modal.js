/**
 * Prof. Memmo — Shared Ecosystem Modals
 * =====================================================
 * Unico file condiviso per tutto l'ecosistema Prof. Memmo.
 * Include:
 *  - Privacy Policy (openSharedModal('privacy'))
 *  - Termini e Condizioni (openSharedModal('termini'))
 *  - Contatti con form (openSharedModal('contatti'))
 *
 * Come usarlo in qualsiasi sito:
 *  <script src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/legal-modal.js"></script>
 *  <a onclick="openSharedModal('privacy')">Privacy Policy</a>
 *  <a onclick="openSharedModal('termini')">Termini e Condizioni</a>
 *  <a onclick="openSharedModal('contatti')">Contattaci</a>
 */

(function () {
  'use strict';

  const CSS = `
    #pmSharedOverlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(5, 10, 20, 0.82);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 999999;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      box-sizing: border-box;
    }
    #pmSharedOverlay.pm-open { display: flex; }
    
    @media (max-width: 1024px) {
      .menu-toggle {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        font-size: 1.8rem !important;
        z-index: 10005 !important;
        color: #1e293b !important;
      }
      .nav-links {
        display: none !important;
        position: absolute !important;
        top: 100% !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        background: #ffffff !important;
        flex-direction: column !important;
        gap: 0 !important;
        padding: 1rem 0 !important;
        box-shadow: 0 15px 35px rgba(0,0,0,0.15) !important;
        border-top: 1px solid #e2e8f0 !important;
        border-bottom: 3px solid #2563eb !important;
        z-index: 10000 !important;
      }
      .nav-links.active {
        display: flex !important;
      }
      .nav-links li {
        width: 100% !important;
        text-align: center !important;
        border-bottom: 1px solid #f1f5f9 !important;
      }
      .nav-links a {
        display: block !important;
        padding: 0.9rem 1.5rem !important;
        font-size: 1.05rem !important;
        font-weight: 600 !important;
        color: #1e293b !important;
      }
    }
    #pmSharedBox {
      background: #ffffff;
      border-radius: 20px;
      max-width: 680px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 80px rgba(0,0,0,0.45);
      font-family: 'Inter', 'Segoe UI', sans-serif;
      color: #1e293b;
      overflow: hidden;
    }
    #pmSharedHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.4rem 2rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 20px 20px 0 0;
      flex-shrink: 0;
    }
    #pmSharedHeader h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
    #pmCloseBtn {
      background: none; border: none; font-size: 1.6rem; line-height: 1;
      cursor: pointer; color: #64748b; padding: 0 4px; transition: color 0.2s;
    }
    #pmCloseBtn:hover { color: #0f172a; }
    #pmSharedBody {
      overflow-y: auto; padding: 1.8rem 2rem; flex: 1;
      line-height: 1.7; font-size: 0.95rem; color: #334155;
    }
    #pmSharedBody h3 {
      color: #2563eb; font-size: 1rem; font-weight: 700;
      margin: 1.4rem 0 0.4rem; padding-bottom: 4px;
      border-bottom: 2px solid #eff6ff;
    }
    #pmSharedBody h3:first-child { margin-top: 0; }
    #pmSharedBody ul { padding-left: 1.4rem; margin: 0.4rem 0; }
    #pmSharedBody ul li { margin-bottom: 0.3rem; }
    #pmSharedBody a { color: #2563eb; }
    #pmSharedBody p { margin: 0.3rem 0 0.6rem; }
    .pm-form-group { margin-bottom: 1rem; }
    .pm-form-group label { display: block; font-weight: 600; font-size: 0.88rem; color: #475569; margin-bottom: 5px; }
    .pm-form-group input, .pm-form-group select, .pm-form-group textarea {
      width: 100%; padding: 0.7rem 0.9rem; border: 1px solid #cbd5e1;
      border-radius: 10px; font-size: 0.95rem; font-family: inherit;
      color: #1e293b; background: #f8fafc; box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s; outline: none;
    }
    .pm-form-group input:focus, .pm-form-group select:focus, .pm-form-group textarea:focus {
      border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); background: #fff;
    }
    .pm-form-group textarea { resize: vertical; min-height: 100px; }
    .pm-checkbox-row { display: flex; align-items: flex-start; gap: 10px; font-size: 0.85rem; color: #475569; }
    .pm-checkbox-row input { margin-top: 3px; flex-shrink: 0; }
    .pm-checkbox-row a { color: #2563eb; cursor: pointer; }
    #pmSubmitBtn {
      width: 100%; padding: 0.85rem;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #fff; border: none; border-radius: 12px;
      font-size: 1rem; font-weight: 700; cursor: pointer; margin-top: 1rem;
      transition: opacity 0.2s, transform 0.2s;
    }
    #pmSubmitBtn:hover { opacity: 0.92; transform: translateY(-1px); }
    #pmSubmitBtn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    #pmSostieniBtn {
      display: none; width: 100%; padding: 0.85rem;
      background: linear-gradient(135deg, #ef4444, #f43f5e);
      color: #fff; border: none; border-radius: 12px;
      font-size: 1rem; font-weight: 700; cursor: pointer; margin-top: 0.6rem;
      text-align: center; text-decoration: none;
      transition: opacity 0.2s, transform 0.2s;
    }
    #pmSostieniBtn:hover { opacity: 0.92; transform: translateY(-1px); }
    #pmFormMsg { margin-top: 0.8rem; font-size: 0.9rem; text-align: center; min-height: 1.4em; }
    .pm-discover-box {
      background: linear-gradient(135deg, #eff6ff, #f0fdf4);
      border: 1px solid #bfdbfe; border-radius: 12px;
      padding: 1rem 1.2rem; margin-bottom: 1.4rem;
      font-size: 0.9rem; color: #1e3a5f; line-height: 1.6;
    }
    .pm-discover-box strong { color: #1d4ed8; }
  `;

  function injectCSS() {
    if (document.getElementById('pmSharedCSS')) return;
    const style = document.createElement('style');
    style.id = 'pmSharedCSS';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function buildOverlay() {
    if (document.getElementById('pmSharedOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'pmSharedOverlay';
    overlay.innerHTML =
      '<div id="pmSharedBox">' +
        '<div id="pmSharedHeader">' +
          '<h2 id="pmSharedTitle">Titolo</h2>' +
          '<button id="pmCloseBtn" aria-label="Chiudi">&times;</button>' +
        '</div>' +
        '<div id="pmSharedBody"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.getElementById('pmCloseBtn').addEventListener('click', closeSharedModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSharedModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSharedModal(); });
  }

  function closeSharedModal() {
    var overlay = document.getElementById('pmSharedOverlay');
    if (overlay) { overlay.classList.remove('pm-open'); document.body.style.overflow = ''; }
  }

  var PRIVACY_HTML = '<h3>1. Titolare del trattamento</h3><p>Il titolare del trattamento è <strong>Guglielmo Piersanti</strong>, contattabile all\'indirizzo email: <a href="mailto:prof.memmo@gmail.com">prof.memmo@gmail.com</a></p><h3>2. Finalità dell\'ecosistema</h3><p>L\'"Ecosistema Didattico Prof. Memmo" è una piattaforma educativa composta da più giochi e strumenti didattici (FantaLetteratura, La Rotta degli Eroi, La Corte della Commedia, La Palestra di Riflessione e altri), utilizzata a scopo educativo e ludico. La piattaforma può prevedere piani di accesso a pagamento per i docenti.</p><h3>3. Dati raccolti</h3><ul><li>Indirizzo e-mail e nome utente (tramite accesso Google o registrazione diretta)</li><li>Informazioni di utilizzo dei giochi (punteggi, attività didattiche, progressi)</li><li>Messaggi inviati tramite modulo di contatto o posta interna</li><li>Dati tecnici forniti automaticamente dalla piattaforma (tipo di dispositivo, dati di log)</li><li>Dati di sottoscrizione (piano scelto, data di registrazione)</li></ul><h3>4. Finalità del trattamento</h3><ul><li>Consentire l\'accesso all\'ecosistema e alle sue funzionalità</li><li>Gestire l\'esperienza didattica, le classi, le classifiche e i tornei interni</li><li>Migliorare il funzionamento del servizio</li><li>Rispondere alle richieste inviate tramite modulo di contatto o posta interna</li><li>Gestire gli abbonamenti e i piani di accesso</li></ul><p>Non vengono utilizzati per scopi commerciali o pubblicitari.</p><h3>5. Base giuridica</h3><p>Il trattamento si basa sull\'utilizzo dell\'ecosistema e sul consenso esplicito dell\'utente fornito in fase di registrazione.</p><h3>6. Conservazione dei dati</h3><p>I dati sono trattati in modo lecito e sicuro. Non vengono venduti né ceduti a terzi. Sono mantenuti solo per il tempo necessario al funzionamento didattico o su richiesta, salvo obblighi di legge. Vengono utilizzati servizi terzi per l\'archiviazione (<strong>Firebase / Google LLC</strong>).</p><h3>7. Servizi di terze parti</h3><p>L\'ecosistema utilizza: Firebase (autenticazione e database, Google LLC), Google Sign-In. Questi servizi possono raccogliere dati secondo le proprie privacy policy.</p><h3>8. Diritti dell\'utente</h3><ul><li>Accesso ai propri dati</li><li>Rettifica o cancellazione</li><li>Limitazione del trattamento</li><li>Revoca del consenso</li></ul><p>Per esercitare questi diritti: <a href="mailto:prof.memmo@gmail.com">prof.memmo@gmail.com</a></p><h3>9. Cookie</h3><p>Il sito non utilizza cookie di profilazione. Potrebbero essere presenti cookie tecnici necessari al funzionamento del servizio.</p><h3>10. Utenti minori</h3><p>L\'ecosistema è destinato a uso didattico e può essere utilizzato da minori nell\'ambito scolastico, sotto la supervisione del docente. Per uso al di fuori del contesto scolastico è responsabilità di un adulto assicurare le autorizzazioni necessarie. I genitori o tutori possono richiedere la cancellazione dei dati contattando il titolare.</p><h3>11. Modifiche alla Policy</h3><p>La presente informativa può essere aggiornata. Gli utenti saranno informati in caso di modifiche rilevanti tramite avviso sulla piattaforma.</p><h3>12. Riferimenti normativi</h3><p>Redatta in conformità al <strong>GDPR (Regolamento UE 2016/679)</strong> e alla normativa italiana in materia di protezione dei dati personali.</p>';

  var TERMINI_HTML = '<h3>1. Titolare del sito e Denominazione Sociale</h3><p>L\'Ecosistema Prof. Memmo è gestito da <strong>Prof. Memmo - Games&Co.</strong> di Guglielmo Piersanti. Email di contatto: <a href="mailto:prof.memmo@gmail.com">prof.memmo@gmail.com</a></p><h3>2. Accettazione dei Termini</h3><p>L\'accesso e l\'utilizzo dell\'Ecosistema Prof. Memmo e delle relative piattaforme didattiche implicano l\'accettazione integrale dei presenti Termini e Condizioni. Se l\'utente non intende accettare tali condizioni, è invitato a non utilizzare i servizi.</p><h3>3. Descrizione dell\'attività: Prof. Memmo</h3><p>Prof. Memmo è un progetto educativo digitale dedicato alla scuola secondaria di primo grado. Il progetto offre risorse, attività didattiche, giochi educativi e ambienti digitali interattivi destinati principalmente a docenti e studenti. Attraverso l\'Ecosistema Prof. Memmo è possibile accedere, in base al piano scelto, a piattaforme e strumenti didattici quali giochi educativi, attività interattive, simulazioni, missioni e materiali per l\'apprendimento. I servizi a pagamento sono forniti attraverso abbonamenti annuali e consentono l\'accesso alle funzionalità e ai contenuti previsti dal relativo piano.</p><h3>4. Piani e prezzi</h3><p>Gli abbonamenti a pagamento hanno durata annuale e si rinnovano automaticamente alla scadenza, salvo disdetta. Il rinnovo viene effettuato tramite il metodo di pagamento associato all\'abbonamento. È possibile disdire l\'abbonamento prima della successiva data di rinnovo. In caso di disdetta, l\'accesso alle funzionalità del piano rimane attivo fino alla conclusione del periodo già pagato, salvo quanto previsto dai Termini e condizioni. I prezzi e le caratteristiche dei singoli piani sono indicati nella pagina dedicata "Prezzi e Piani". Gli studenti inseriti in una classe didattica creata da un docente non sono soggetti a costi aggiuntivi.</p><h3>5. Pagamenti</h3><p>I pagamenti degli abbonamenti sono gestiti tramite Stripe, piattaforma di pagamento sicura e indipendente. Prof. Memmo non gestisce né memorizza direttamente i dati completi delle carte di pagamento. Al momento del pagamento l\'utente viene reindirizzato alla pagina di pagamento sicura e protetta di Stripe.</p><h3>6. Rinnovo e disdetta dell\'abbonamento</h3><p>Gli abbonamenti annuali si rinnovano automaticamente per un ulteriore periodo di un anno alla relativa data di scadenza. L\'utente può disdire il rinnovo del proprio abbonamento prima della successiva scadenza. La disdetta impedisce il rinnovo successivo, mentre l\'accesso ai contenuti e alle funzionalità del piano rimane disponibile fino al termine del periodo già pagato, secondo quanto previsto dai Termini e condizioni. Le modalità di gestione dell\'abbonamento e dei pagamenti sono indicate nell\'area personale e nei servizi messi a disposizione da Stripe.</p><h3>7. Assistenza</h3><p>Per informazioni sui servizi, sui piani di abbonamento, sugli acquisti o per ricevere assistenza tecnica e didattica è possibile contattare il supporto ufficiale: Email: <a href="mailto:prof.memmo@gmail.com">prof.memmo@gmail.com</a></p><h3>8. Utilizzo del servizio e regole di condotta</h3><p>L\'utente si impegna a utilizzare la piattaforma in modo corretto e conforme alle finalità educative, evitando di:</p><ul><li>Inviare messaggi offensivi, illeciti, diffamatori o spam;</li><li>Tentare di compromettere o eludere la sicurezza e l\'integrità delle piattaforme;</li><li>Utilizzare il servizio per scopi fraudolenti o commerciali non autorizzati;</li><li>Condividere le credenziali del proprio account con terzi;</li><li>Eludere i sistemi di abbonamento o accedere a funzionalità non previste dal proprio piano.</li></ul><h3>9. Modulo di contatto e posta interna</h3><p>L\'utente è l\'unico responsabile dei contenuti, dei messaggi e dei testi inviati tramite i moduli di contatto, le bacheche o la posta interna dei giochi. È severamente vietato inserire dati falsi o contenuti non pertinenti.</p><h3>10. Proprietà intellettuale e Licenza Didattica</h3><p>Tutti i contenuti presenti nell\'ecosistema (testi, narrazioni, schede didattiche, grafiche, marchi, meccaniche di gioco e software) sono di proprietà esclusiva dell\'autore e sono protetti tramite deposito e marcatura temporale presso Patamu. I contenuti sono inoltre distribuiti con licenza <strong>Creative Commons Attribuzione - Non commerciale - Non opere derivate 4.0 Internazionale (CC BY-NC-ND 4.0)</strong>. È vietata qualsiasi riproduzione, distribuzione, modifica o utilizzo commerciale non preventivamente autorizzato per iscritto.</p><h3>11. Limitazione di responsabilità</h3><p>I servizi sono forniti "così come sono". Il titolare adotta le migliori pratiche per garantire la continuità e la sicurezza della piattaforma, ma non risponde per eventuali temporanee interruzioni di rete, cause di forza maggiore o anomalie indipendenti dalla propria infrastruttura.</p><h3>12. Link esterni</h3><p>L\'ecosistema può contenere collegamenti a siti o servizi esterni di terze parti. Il titolare non esercita alcun controllo e non assume responsabilità per contenuti, privacy policy o pratiche di siti terzi.</p><h3>13. Modifiche ai Termini</h3><p>Il titolare si riserva il diritto di aggiornare o modificare i presenti Termini e Condizioni a seguito di evoluzioni normative o tecniche, dandone tempestiva comunicazione agli utenti sulla piattaforma.</p><h3>14. Legge applicabile e Foro competente</h3><p>I presenti Termini sono regolati dalla legge italiana e dal <strong>GDPR (Regolamento UE 2016/679)</strong>. Per qualsiasi controversia civile derivante dall\'interpretazione o esecuzione del servizio, il foro competente è quello previsto dalla legge applicabile.</p>';

  function buildContattiHTML(sostieniUrl) {
    return '<div class="pm-discover-box" style="display:flex; align-items:flex-start; gap:14px; background:linear-gradient(135deg, #eff6ff, #f0fdf4); border:1px solid #bfdbfe; border-radius:14px; padding:1.2rem 1.4rem; margin-bottom:1.4rem;"><i class="fa-solid fa-box-open" style="font-size:1.8rem; color:#2563eb; flex-shrink:0; margin-top:2px;"></i><div><h4 style="margin:0 0 0.3rem 0; color:#1e3a8a; font-size:1rem; font-weight:700;">Risorse & Community</h4><p style="margin:0; font-size:0.92rem; color:#1e293b; line-height:1.5;">Esplora i <a href="https://prof-memmo.github.io/games/giochi.html" target="_blank" style="color:#2563eb; font-weight:700; text-decoration:underline;">giochi</a>, i <a href="https://prof-memmo.github.io/games/giochi.html#strumenti-didattici" target="_blank" style="color:#2563eb; font-weight:700; text-decoration:underline;">materiali</a> e la <a href="https://prof-memmo.github.io/games/metodo-filosofia.html" target="_blank" style="color:#2563eb; font-weight:700; text-decoration:underline;">filosofia</a>, oppure <a href="https://prof-memmo.github.io/games/condividi-esperienza.html" target="_blank" style="color:#059669; font-weight:700; text-decoration:underline;">condividi la tua esperienza!</a></p></div></div>' +
      '<form id="pmContactForm">' +
        '<div class="pm-form-group"><label for="pmNome">Nome</label><input type="text" id="pmNome" required placeholder="Il tuo nome"></div>' +
        '<div class="pm-form-group"><label for="pmEmail">Email</label><input type="email" id="pmEmail" required placeholder="La tua email"></div>' +
        '<div class="pm-form-group"><label for="pmTopic">Tipologia della comunicazione</label><select id="pmTopic" required><option value="" disabled selected>Seleziona un\'opzione...</option><option>Richiesta di informazioni generali</option><option>Informazioni su Piani e Abbonamenti (Docenti / Scuole)</option><option>Assistenza Pagamenti e Fatturazione</option><option>Supporto Didattico e Attività per le Classi</option><option>Segnalazione tecnica o malfunzionamento</option><option>Opinioni e suggerimenti</option><option>Proposta di collaborazione</option><option>Altro</option></select></div>' +
        '<div class="pm-form-group"><label for="pmMessaggio">Messaggio</label><textarea id="pmMessaggio" required placeholder="Come posso aiutarti?"></textarea></div>' +
        '<div class="pm-form-group"><div class="pm-checkbox-row"><input type="checkbox" id="pmTermsCheck" required><label for="pmTermsCheck">Ho almeno 16 anni o sono sotto la supervisione di un adulto. Accetto la <a onclick="openSharedModal(\'privacy\')">Privacy Policy</a> e i <a onclick="openSharedModal(\'termini\')">Termini e Condizioni</a>.</label></div></div>' +
        '<button type="submit" id="pmSubmitBtn">Invia Messaggio</button>' +
        (sostieniUrl ? '<a id="pmSostieniBtn" href="' + sostieniUrl + '" target="_blank" style="display:block; margin-top:0.6rem; padding:0.85rem; background:linear-gradient(135deg,#ef4444,#f43f5e); color:#fff; border-radius:12px; font-size:1rem; font-weight:700; text-align:center; text-decoration:none;">❤️ Sostieni Prof. Memmo</a>' : '') +
        '<div id="pmFormMsg"></div>' +
      '</form>';
  }

  function attachFormLogic() {
    var form = document.getElementById('pmContactForm');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = document.getElementById('pmSubmitBtn');
      var msg = document.getElementById('pmFormMsg');
      btn.disabled = true;
      btn.textContent = 'Invio in corso...';
      msg.textContent = '';
      var nome = document.getElementById('pmNome').value.trim();
      var email = document.getElementById('pmEmail').value.trim();
      var topic = document.getElementById('pmTopic').value;
      var messaggio = document.getElementById('pmMessaggio').value.trim();
      try {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
          var db = firebase.app().firestore();
          await db.collection('hub_posta').add({
            nome: nome, email: email, topic: topic, messaggio: messaggio,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            fonte: window.location.hostname
          });
          msg.innerHTML = '<span style="color:#16a34a;">Messaggio inviato con successo! Ti risponderò presto.</span>';
          form.reset();
        } else { throw new Error('firebase not ready'); }
      } catch (err) {
        var subject = encodeURIComponent('[Prof. Memmo] ' + topic);
        var body = encodeURIComponent('Nome: ' + nome + '\nEmail: ' + email + '\n\n' + messaggio);
        window.location.href = 'mailto:prof.memmo@gmail.com?subject=' + subject + '&body=' + body;
      }
      btn.disabled = false;
      btn.textContent = 'Invia Messaggio';
    });
  }

  async function openSharedModal(type) {
    injectCSS();
    buildOverlay();
    var overlay = document.getElementById('pmSharedOverlay');
    var title = document.getElementById('pmSharedTitle');
    var body = document.getElementById('pmSharedBody');

    var dynamicPrivacy = PRIVACY_HTML;
    var dynamicTerms = TERMINI_HTML;

    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
        var db = firebase.app().firestore();
        var legalSnap = await db.collection('hub_settings').doc('legal').get();
        if (!legalSnap.exists) {
          try { legalSnap = await db.collection('ecosistema_settings').doc('legal').get(); } catch(_) {}
        }
        if (legalSnap && legalSnap.exists) {
          var legData = legalSnap.data();
          if (legData.privacyText) dynamicPrivacy = legData.privacyText;
          if (legData.termsText) dynamicTerms = legData.termsText;
        }
      }
    } catch (e) { /* fallback default */ }

    function formatPlainTextToHTML(txt) {
      if (!txt) return '';
      // Se contiene già tag HTML principali, lo usa direttamente
      if (txt.includes('<h3>') || txt.includes('<p>')) return txt;

      var lines = txt.split('\n');
      var html = '';
      var inList = false;

      lines.forEach(function(line) {
        var trimmed = line.trim();
        if (!trimmed) {
          if (inList) { html += '</ul>'; inList = false; }
          return;
        }

        // Titolo numerato (es. "1. Titolare...")
        if (/^\d+\.\s+/.test(trimmed)) {
          if (inList) { html += '</ul>'; inList = false; }
          html += '<h3>' + trimmed + '</h3>';
        } 
        // Elemento di lista (es. "- Indirizzo...")
        else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          if (!inList) { html += '<ul>'; inList = true; }
          html += '<li>' + trimmed.substring(1).trim() + '</li>';
        } 
        // Paragrafo normale
        else {
          if (inList) { html += '</ul>'; inList = false; }
          html += '<p>' + trimmed + '</p>';
        }
      });

      if (inList) html += '</ul>';
      return html;
    }

    if (type === 'contatti') {
      window.open('https://prof-memmo.github.io/games/contatti.html', '_blank');
      return;
    } else if (type === 'invita' || type === 'share') {
      title.textContent = 'Invita un Collega';
      var showcaseUrl = 'https://prof-memmo.github.io/games/';
      var shareText = "Ti consiglio di dare un'occhiata all'Ecosistema Didattico del Prof. Memmo: giochi didattici interattivi, sfide e materiali per la scuola!";
      var fullShareText = shareText + '\n\n🔗 Scopri di più qui: ' + showcaseUrl;
      var encodedFullText = encodeURIComponent(fullShareText);
      var encodedUrl = encodeURIComponent(showcaseUrl);

      body.innerHTML = 
        '<p style="font-size:0.95rem; color:#475569; margin:0 0 1.5rem 0; text-align:center; line-height:1.5;">' +
          'Fai conoscere l\'Ecosistema Didattico e i giochi interattivi del Prof. Memmo ai tuoi colleghi docenti!' +
        '</p>' +
        '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; max-width:540px; margin:0 auto 0.5rem auto;">' +
          '<a href="https://wa.me/?text=' + encodedFullText + '" target="_blank" style="padding:16px 12px; border-radius:14px; text-decoration:none; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; background:#f8fafc; border:1.5px solid #e2e8f0; color:#0f172a; font-weight:700; font-size:0.85rem; letter-spacing:0.5px; transition:all 0.2s; box-shadow:0 2px 6px rgba(0,0,0,0.03);">' +
            '<i class="fa-brands fa-whatsapp" style="font-size:1.6rem; color:#25D366;"></i>' +
            '<span>WHATSAPP</span>' +
          '</a>' +
          '<a href="https://classroom.google.com/u/0/share?url=' + encodedUrl + '" target="_blank" style="padding:16px 12px; border-radius:14px; text-decoration:none; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; background:#f8fafc; border:1.5px solid #e2e8f0; color:#0f172a; font-weight:700; font-size:0.85rem; letter-spacing:0.5px; transition:all 0.2s; box-shadow:0 2px 6px rgba(0,0,0,0.03);">' +
            '<i class="fa-solid fa-graduation-cap" style="font-size:1.6rem; color:#F59E0B;"></i>' +
            '<span>CLASSROOM</span>' +
          '</a>' +
          '<a href="https://teams.microsoft.com/share?href=' + encodedUrl + '&msgText=' + encodedFullText + '" target="_blank" style="padding:16px 12px; border-radius:14px; text-decoration:none; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; background:#f8fafc; border:1.5px solid #e2e8f0; color:#0f172a; font-weight:700; font-size:0.85rem; letter-spacing:0.5px; transition:all 0.2s; box-shadow:0 2px 6px rgba(0,0,0,0.03);">' +
            '<i class="fa-solid fa-users-rectangle" style="font-size:1.6rem; color:#6366F1;"></i>' +
            '<span>MS TEAMS</span>' +
          '</a>' +
          '<button type="button" id="pmCopyShareBtn" onclick="navigator.clipboard.writeText(\'' + fullShareText.replace(/'/g, "\\'") + '\').then(function(){ alert(\'Link e messaggio copiati negli appunti!\'); });" style="padding:16px 12px; border-radius:14px; text-decoration:none; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; background:#f8fafc; border:1.5px solid #e2e8f0; color:#0f172a; font-weight:700; font-size:0.85rem; letter-spacing:0.5px; cursor:pointer; transition:all 0.2s; box-shadow:0 2px 6px rgba(0,0,0,0.03);">' +
            '<i class="fa-solid fa-copy" style="font-size:1.6rem; color:#64748b;"></i>' +
            '<span>COPIA LINK</span>' +
          '</button>' +
        '</div>';
    } else if (type === 'privacy') {
      title.textContent = 'Privacy Policy';
      body.innerHTML = formatPlainTextToHTML(dynamicPrivacy);
    } else if (type === 'termini') {
      title.textContent = 'Termini e Condizioni';
      body.innerHTML = formatPlainTextToHTML(dynamicTerms);
    }

    overlay.classList.add('pm-open');
    document.body.style.overflow = 'hidden';
    body.scrollTop = 0;
  }

  window.openSharedModal = openSharedModal;
  window.openSharedInviteModal = function() { openSharedModal('invita'); };
  window.closeSharedModal = closeSharedModal;

  // Controlla scadenze abbonamento al 31 Dicembre e notifiche dell'Ecosistema
  async function checkEcosystemNotificationsAndExpiration() {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
    try {
      var auth = firebase.auth();
      var db = firebase.app().firestore();
      var user = auth.currentUser;
      if (!user) return;

      // 1. Controllo Scadenza al 31 Dicembre dell'Anno Corrente
      var hubRef = db.collection('hub_users').doc(user.uid);
      var hubSnap = await hubRef.get();
      if (hubSnap.exists) {
        var uData = hubSnap.data();
        var currentYear = new Date().getFullYear();
        var sub = uData.subscription || 'base';
        var role = uData.role || 'studente';

        // Solo per ruoli a pagamento non-studenti se l'anno corrente supera l'anno di sottoscrizione/scadenza
        if (role !== 'studente' && sub !== 'base') {
          var subYear = uData.subscriptionYear || currentYear;
          // Se la data odierna ha superato il 31/12 dell'anno di abbonamento
          if (currentYear > subYear) {
            await hubRef.update({
              subscription: 'base',
              previousSubscription: sub,
              subscriptionExpiredAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Mostra avviso di scadenza
            setTimeout(function() {
              alert("⚠️ ATTENZIONE: Il tuo abbonamento per l'anno scolastico precedente è scaduto il 31 Dicembre.\n\nIl tuo profilo è stato impostato sulla Versione Base gratuita. Se utilizzi Fantaletteratura e hai più di 4 classi/squadre attive, potrai farne partecipare al massimo 4 quest'anno, oppure puoi rinnovare l'abbonamento nell'Hub per mantenerle tutte!");
            }, 1200);
          }
        }
      }
      // 2. Controllo Notifiche Personalizzate dell'Admin
      try {
        var notifSnap = await db.collection('hub_notifications').orderBy('createdAt', 'desc').limit(10).get();
        if (!notifSnap.empty) {
          var userRole = (hubSnap.exists ? (hubSnap.data().role || 'studente') : 'studente').toLowerCase();
          var userEmail = (user.email || '').toLowerCase();
          var currentPlatformTitle = document.title || '';

          notifSnap.forEach(function(nDoc) {
            var n = nDoc.data();
            var nId = nDoc.id;

            // Controlla se la notifica è già stata letta localmente
            if (localStorage.getItem('pm_notif_read_' + nId)) return;

            // Filtro Gruppo Destinatari
            var matchesTarget = false;
            if (n.targetGroup === 'all') matchesTarget = true;
            else if (n.targetGroup === 'docenti' && (userRole.includes('docente') || userRole.includes('teacher'))) matchesTarget = true;
            else if (n.targetGroup === 'studenti' && (userRole.includes('student') || userRole.includes('studente'))) matchesTarget = true;
            else if (n.targetGroup === 'viandanti' && (!userRole.includes('student') && !userRole.includes('teacher') && !userRole.includes('docente'))) matchesTarget = true;
            else if (n.targetGroup === 'single' && n.targetEmail === userEmail) matchesTarget = true;

            if (!matchesTarget) return;

            // Filtro Piattaforme / Giochi Destinatari
            var matchesGame = false;
            if (!n.targetGames || n.targetGames.includes('all')) {
              matchesGame = true;
            } else {
              // Verifica se una delle piattaforme selezionate corrisponde all'URL o al Titolo della pagina
              var pageUrl = window.location.href.toLowerCase();
              n.targetGames.forEach(function(g) {
                var gLow = g.toLowerCase();
                if (pageUrl.includes(gLow) || currentPlatformTitle.toLowerCase().includes(gLow)) {
                  matchesGame = true;
                }
              });
            }

            if (matchesTarget && matchesGame) {
              setTimeout(function() {
                alert("📣 " + n.title.toUpperCase() + "\n\n" + n.body);
                localStorage.setItem('pm_notif_read_' + nId, 'true');
              }, 1500);
            }
          });
        }
      } catch (errNotif) {
        console.warn("PM Ecosystem notifications fetch error:", errNotif);
      }
    } catch (e) {
      console.warn("PM Ecosystem check warning:", e);
    }
  }

  function getFirestoreInstance() {
    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length && typeof firebase.app === 'function') {
        return firebase.app().firestore();
      }
    } catch(e) {}
    return null;
  }

  // Sincronizzazione dinamica di Copyright e Dati Fiscali nel Footer di qualsiasi sito
  async function syncEcosystemFooterLegalData() {
    var db = getFirestoreInstance();
    if (!db) return;
    try {
      var snap = await db.collection('hub_settings').doc('legal').get();
      if (!snap.exists) {
        try { snap = await db.collection('ecosistema_settings').doc('legal').get(); } catch(_) {}
      }
      if (!snap || !snap.exists) return;
      var data = snap.data();

      // Trova o crea il contenitore dedicato nel footer
      var footers = document.querySelectorAll('footer');
      if (!footers.length) return;

      footers.forEach(function(footer) {
        var copyrightEl = footer.querySelector('.copyright, #copyright-text, p.copyright-text, [data-copyright]');
        var copyrightContent = data.copyrightText || "© 2026 Guglielmo Piersanti. Tutti i contenuti presenti su questo sito sono di proprietà dell'autore e sono protetti tramite deposito e marcatura temporale presso Patamu. I contenuti sono inoltre distribuiti con licenza Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0).";

        var fiscalStr = '';
        if (data.showFiscalInFooter) {
          fiscalStr = '<div class="pm-fiscal-info-footer" style="margin-top: 6px; font-size: 0.85rem; color: rgba(255,255,255,0.7);">' +
            '<span>' + (data.fiscalName || 'Guglielmo Piersanti') + '</span>' +
            (data.fiscalCode ? ' | C.F./P.IVA: ' + data.fiscalCode : '') +
            ' | Email: <a href="mailto:' + (data.fiscalEmail || 'prof.memmo@gmail.com') + '" style="color: inherit; text-decoration: underline;">' + (data.fiscalEmail || 'prof.memmo@gmail.com') + '</a>' +
          '</div>';
        }

        if (copyrightEl) {
          copyrightEl.innerHTML = copyrightContent + fiscalStr;
        } else {
          // Se non trova una classe copyright specifica, cerca il primo paragrafo del footer o lo aggiunge
          var p = footer.querySelector('p');
          if (p) {
            p.innerHTML = copyrightContent + fiscalStr;
          } else {
            var newP = document.createElement('p');
            newP.style.fontSize = '0.85rem';
            newP.style.margin = '10px 0 0 0';
            newP.innerHTML = copyrightContent + fiscalStr;
            footer.appendChild(newP);
          }
        }
      });
    } catch(e) {
      console.warn("PM Ecosystem footer sync warning:", e);
    }
  }

  // Esponi le funzioni in window per gli onclick inline
  window.openSharedModal = openSharedModal;
  window.closeSharedModal = closeSharedModal;

  // Delega globale degli eventi click per catturare data-legal e link dinamici (compresi footer e modali)
  document.addEventListener('click', function(e) {
    var target = e.target.closest('[data-legal], [onclick*="openSharedModal"]');
    if (!target) return;

    var dataLegal = target.getAttribute('data-legal');
    if (dataLegal) {
      e.preventDefault();
      var mapped = dataLegal === 'terms' ? 'termini' : dataLegal;
      openSharedModal(mapped);
    }
  });

  // Controllo Modalità Manutenzione Globale
  async function checkEcosystemMaintenanceMode() {
    var db = getFirestoreInstance();
    if (!db) return;
    try {
      var snap = await db.collection('hub_settings').doc('impostazioni').get();
      if (!snap.exists) return;
      var data = snap.data();
      if (!data || !data.manutenzione) {
        var existingOverlay = document.getElementById('pmMaintenanceOverlay');
        if (existingOverlay) existingOverlay.remove();
        document.body.style.overflow = 'auto';
        return;
      }

      function applyMaintenance(user) {
        var isAdmin = user && user.email && user.email.toLowerCase() === 'prof.memmo@gmail.com';
        var overlayId = 'pmMaintenanceOverlay';
        var existing = document.getElementById(overlayId);

        if (isAdmin) {
          // L'admin non viene bloccato e vede un badge discreto
          if (existing) {
            existing.remove();
            document.body.style.overflow = 'auto';
          }
          if (!document.getElementById('pm-admin-maintenance-badge')) {
            var badge = document.createElement('div');
            badge.id = 'pm-admin-maintenance-badge';
            badge.title = 'Clicca per nascondere';
            badge.style.cssText = 'position:fixed;top:75px;right:10px;background:#f59e0b;color:#000;padding:5px 12px;border-radius:20px;font-size:0.72rem;font-weight:800;z-index:500;box-shadow:0 3px 10px rgba(0,0,0,0.2);display:flex;align-items:center;gap:5px;cursor:pointer;opacity:0.88;transition:opacity 0.2s;user-select:none;';
            badge.innerHTML = '<span>🔧</span> Manutenzione Attiva';
            badge.addEventListener('click', function() { badge.remove(); });
            badge.addEventListener('mouseenter', function() { badge.style.opacity = '1'; });
            badge.addEventListener('mouseleave', function() { badge.style.opacity = '0.88'; });
            document.body.appendChild(badge);
          }
          return;
        }

        // Blocco totale per visitatori e studenti: NESSUNA X per chiudere
        if (!existing) {
          if (!document.getElementById('pm-julius-font')) {
            var fLink = document.createElement('link');
            fLink.id = 'pm-julius-font';
            fLink.rel = 'stylesheet';
            fLink.href = 'https://fonts.googleapis.com/css2?family=Julius+Sans+One&display=swap';
            document.head.appendChild(fLink);
          }

          var mOverlay = document.createElement('div');
          mOverlay.id = overlayId;
          mOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font-family:\'Julius Sans One\', sans-serif;';
          
          var msg = (data.manutenzione_testo || "🔧 Sito temporaneamente in manutenzione.\n\nStiamo migliorando l'ecosistema. Torna tra poco!").replace(/\n/g, '<br>');
          
          mOverlay.innerHTML = '<div style="background:#ffffff;border-radius:28px;max-width:540px;width:100%;padding:40px 30px;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.4);position:relative;animation:pmFadeIn 0.3s ease;font-family:\'Julius Sans One\', sans-serif !important;">' +
            '<div style="margin-bottom:20px;display:flex;justify-content:center;">' +
              '<img src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/avatars/16.png" alt="Capibara in manutenzione" style="width:140px;height:140px;object-fit:cover;border-radius:50%;box-shadow:0 10px 25px rgba(0,0,0,0.15);background:#fef3c7;padding:6px;border:3px solid #f59e0b;">' +
            '</div>' +
            '<h2 style="font-family:\'Julius Sans One\', sans-serif !important;font-size:1.7rem;color:#0f172a;margin:0 0 16px;font-weight:800;letter-spacing:2px;text-transform:uppercase;text-align:center !important;">Lavori in Corso 🔧</h2>' +
            '<div style="font-family:\'Julius Sans One\', sans-serif !important;font-size:1.05rem;line-height:1.8;color:#334155;margin:0 0 20px;text-transform:uppercase;letter-spacing:1px;text-align:center !important;">' + msg + '</div>' +
            '<div style="display:flex;justify-content:center;align-items:center;margin-top:15px;">' +
              '<img src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/branding/prof-memmo/avatar.png" alt="Prof. Memmo" style="height:60px;width:60px;object-fit:contain;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.1);">' +
            '</div>' +
          '</div>';
          
          document.body.appendChild(mOverlay);
          document.body.style.overflow = 'hidden';
        }
      }

      if (typeof firebase.auth === 'function') {
        var initialUser = firebase.auth().currentUser;
        applyMaintenance(initialUser);
        firebase.auth().onAuthStateChanged(function(user) {
          applyMaintenance(user);
        });
      } else {
        applyMaintenance(null);
      }
    } catch(e) {
      console.warn("[Ecosystem] Errore verifica manutenzione:", e);
    }
  }

  // Gestione Universale Menu Mobile per tutti i siti dell'Ecosistema (UNICO PUNTO DI VERITÀ)
  var _lastToggleTime = 0;
  window.toggleMobileMenu = function(btn) {
    var now = Date.now();
    if (now - _lastToggleTime < 300) return; // Ignora chiamate duplicate entro 300ms
    _lastToggleTime = now;

    var nav = document.querySelector('.nav-links');
    if (!nav) return;
    var isActive = nav.classList.toggle('active');
    var icon = document.querySelector('.menu-toggle i');
    if (icon) {
      icon.className = isActive ? 'ph ph-x' : 'ph ph-list';
    }
  };

  document.addEventListener('click', function(e) {
    var toggle = e.target.closest('.menu-toggle');
    if (toggle) {
      e.preventDefault();
      e.stopPropagation();
      window.toggleMobileMenu(toggle);
      return;
    }
    
    var navLink = e.target.closest('.nav-links a');
    if (navLink) {
      var nav = document.querySelector('.nav-links');
      if (nav) nav.classList.remove('active');
      var icon = document.querySelector('.menu-toggle i');
      if (icon) icon.className = 'ph ph-list';
      return;
    }

    if (!e.target.closest('.navbar')) {
      var activeNav = document.querySelector('.nav-links.active');
      if (activeNav) {
        activeNav.classList.remove('active');
        var mainIcon = document.querySelector('.menu-toggle i');
        if (mainIcon) mainIcon.className = 'ph ph-list';
      }
    }
  }, true);

  function syncAuthProfileLink(user) {
    var links = document.querySelectorAll('a[href="accedi.html"], a[href="profilo.html"], #nav-accedi-link');
    links.forEach(function(a) {
      if (user) {
        a.id = 'nav-accedi-link';
        a.href = 'profilo.html';
        a.innerHTML = '<i class="ph ph-user-circle"></i> Il mio Profilo';
        a.style.color = '';
        a.style.fontWeight = '';
      } else {
        a.id = 'nav-accedi-link';
        a.href = 'accedi.html';
        a.innerHTML = 'Accedi';
        a.style.color = '';
        a.style.fontWeight = '';
      }
    });
  }

  function syncEcosystemMenuLinks() {
    if (typeof firebase === 'undefined' || !firebase.firestore) return;
    try {
      var db = firebase.firestore();
      db.collection('hub_settings').doc('ecosistema').onSnapshot(function(doc) {
        if (!doc.exists) return;
        var data = doc.data() || {};
        var isMonetization = !!data.monetizzazione;

        // Gestione univoca di Scegli il tuo Piano (senza duplicazioni o cancellazioni errate)
        var navUl = document.querySelector('.nav-links');
        if (navUl) {
          var listItems = Array.from(navUl.querySelectorAll('li')).filter(function(li) {
            return li.id === 'nav-prezzi' || li.id === 'nav-prezzi-piani' || li.querySelector('a[href="prezzi.html"]');
          });

          if (listItems.length > 0) {
            var mainLi = listItems[0];
            mainLi.id = 'nav-prezzi';
            mainLi.style.display = isMonetization ? 'list-item' : 'none';
            for (var i = 1; i < listItems.length; i++) {
              listItems[i].remove();
            }
          } else if (isMonetization) {
            var targetLi = navUl.querySelector('a[href="accedi.html"], a[href="profilo.html"]');
            var parentLi = targetLi ? targetLi.closest('li') : null;
            var newLi = document.createElement('li');
            newLi.id = 'nav-prezzi';
            newLi.innerHTML = '<a href="prezzi.html">Scegli il tuo Piano</a>';
            if (parentLi && parentLi.nextSibling) {
              navUl.insertBefore(newLi, parentLi.nextSibling);
            } else if (navUl.lastElementChild) {
              navUl.insertBefore(newLi, navUl.lastElementChild);
            } else {
              navUl.appendChild(newLi);
            }
          }
        }

        // Gestione Sostieni il Progetto
        var sostieniLi = document.getElementById('nav-sostieni');
        if (data.sostieni_il_progetto) {
          if (!sostieniLi) {
            var nav = document.querySelector('.nav-links');
            if (nav) {
              sostieniLi = document.createElement('li');
              sostieniLi.id = 'nav-sostieni';
              if (nav.lastElementChild) {
                nav.insertBefore(sostieniLi, nav.lastElementChild);
              } else {
                nav.appendChild(sostieniLi);
              }
            }
          }
          if (sostieniLi) {
            sostieniLi.innerHTML = '<a href="sostieni.html" style="color: #ef4444; font-weight: bold;"><i class="ph-fill ph-heart"></i> Sostieni il Progetto</a>';
          }
        } else if (sostieniLi) {
          sostieniLi.remove();
        }
      });
    } catch(e) {}
  }

  // Auto-intercept data-legal attributes, avvia controlli al login e sincronizza il footer
  document.addEventListener('DOMContentLoaded', function () {
    syncEcosystemFooterLegalData();
    checkEcosystemMaintenanceMode();
    syncEcosystemMenuLinks();

    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length && typeof firebase.auth === 'function') {
        firebase.auth().onAuthStateChanged(function(user) {
          checkEcosystemMaintenanceMode();
          syncEcosystemMenuLinks();
          syncAuthProfileLink(user);
          if (user) {
            checkEcosystemNotificationsAndExpiration();
          }
        });
      }
    } catch(e) {}
  });

})();
