// --- Games UI Service ---
// Gestisce l'interfaccia e i dati della Vetrina Giochi (Stato e Card)

const GamesUI = {
    init: function() {
        this.loadGamesStatus();
    },

    loadGamesStatus: function() {
        if (!window.GamesService) return;
        
        const defaultGames = [
            { id: 'fantaletteratura', name: 'Fantaletteratura' },
            { id: 'la-rotta-degli-eroi', name: 'La Rotta degli Eroi' },
            { id: 'palestra-di-riflessione', name: 'Palestra di Riflessione' },
            { id: 'ops', name: 'Ops!' },
            { id: 'la-corte-della-commedia', name: 'La Corte della Commedia' },
            { id: 'travel-agency', name: 'Travel Agency' },
            { id: 'il-mio-quaderno-alternativo', name: 'Il mio quaderno alternativo' },
            { id: 'la-roulette', name: 'La Roulette' }
        ];

        window.GamesService.listenToGamesStatus(statusMap => {

            const tbody = document.getElementById('games-list-body');
            if(!tbody) return;
            tbody.innerHTML = '';

            defaultGames.forEach(game => {
                let defaultActive = true;
                if (['ops', 'la-corte-della-commedia', 'la-roulette'].includes(game.id)) {
                    defaultActive = false;
                }
                const data = statusMap[game.id] || { isActive: defaultActive, popupType: 'wip_text' };
                
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #e5e7eb';
                
                tr.innerHTML = `
                    <td style="padding:15px 10px; font-weight: 500;">${game.name}</td>
                    <td style="padding:15px 10px; text-align: center;">
                        <button class="btn btn-sm" onclick="HubApp.toggleGameStatus('${game.id}', ${!data.isActive})" 
                            style="background:${data.isActive ? '#10b981' : '#ef4444'}; color:white; padding:6px 12px; border:none; border-radius:20px; cursor:pointer; font-weight:600; width: 120px;">
                            ${data.isActive ? '<i class="fa-solid fa-check"></i> Attivo' : '<i class="fa-solid fa-xmark"></i> Nascosto'}
                        </button>
                    </td>
                    <td style="padding:15px 10px; text-align: right;">
                        <button class="btn btn-sm" onclick="HubApp.editGame('${game.id}', '${game.name}')" 
                            style="background:#3b82f6; color:white; padding:6px 12px; border:none; border-radius:6px; cursor:pointer; font-weight:500;">
                            <i class="fa-solid fa-pen-to-square"></i> Modifica Card
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
    },

    toggleGameStatus: function(gameId, targetStatus) {
        if (!window.GamesService) return;
        
        window.GamesService.updateGameStatus(gameId, targetStatus).then(() => {
            console.log("Game status updated");
            alert("Stato aggiornato con successo!");
        }).catch((err) => {
            console.error("Firebase write error:", err);
            alert("Errore di salvataggio su Firebase! Probabilmente mancano i permessi nel database (Regole di sicurezza). Dettagli: " + err.message);
        });
    },

    editGame: function(gameId, gameName) {
        if (!window.GamesService) return;
        
        document.getElementById('edit-game-name').innerText = gameName;
        document.getElementById('edit-game-id').value = gameId;
        
        window.GamesService.getGameDetails(gameId).then(data => {
            
            const defaultGamesData = {
                'fantaletteratura': { shortDesc: "Costruisci la tua squadra di autori e generi letterari sfidandoti in un fanta-campionato culturale.", longDesc: "Costruisci la tua squadra di autori e generi letterari sfidandoti in un fanta-campionato culturale.", materia: "Letteratura", giocatori: "Squadre / Singoli", durata: "Intero anno scolastico", obiettivi: "Gamification, conoscenza autori", classe: "Sec. di 1° grado", uso: "Classe, Casa" },
                'la-rotta-degli-eroi': { shortDesc: "Affronta le missioni, accumula dracme e costruisci la tua base nel mondo epico e mitologico.", longDesc: "Affronta le missioni, accumula dracme e costruisci la tua base nel mondo epico e mitologico.", materia: "Epica e Mito", giocatori: "Singolo / Squadre", durata: "Intero anno scolastico", obiettivi: "Gamification, conoscenza miti", classe: "Classi prime (11-12 anni)", uso: "Classe, Casa" },
                'palestra-di-riflessione': { shortDesc: "Un allenamento completo per la lingua: percorsi personalizzati per studenti, docenti e amici della palestra.", longDesc: "Un allenamento completo per la lingua: percorsi personalizzati per studenti, docenti e amici della palestra.", materia: "Grammatica / Italiano", giocatori: "Singolo", durata: "Flessibile", obiettivi: "Analisi logica e grammaticale", classe: "Sec. di 1° grado", uso: "Recupero, Laboratorio, Casa" },
                'travel-agency': { shortDesc: "I giocatori diventano agenzie di viaggio e creano pacchetti turistici per clienti esigenti gestendo un budget.", longDesc: "I giocatori diventano agenzie di viaggio e creano pacchetti turistici per clienti esigenti gestendo un budget.", materia: "Geografia", giocatori: "2-4 (a squadre)", durata: "60-120 min", obiettivi: "Ricerca, gestione budget", classe: "Sec. di 1° grado", uso: "Classe, Laboratorio" },
                'il-mio-quaderno-alternativo': { shortDesc: "Percorsi alternativi all'IRC per esplorare temi etici, filosofici e civici in modo attivo e creativo, classe per classe.", longDesc: "Percorsi alternativi all'IRC per esplorare temi etici, filosofici e civici in modo attivo e creativo, classe per classe.", materia: "Alternativa alla Religione", giocatori: "Singolo", durata: "Intero anno scolastico", obiettivi: "Etica, cittadinanza, valori", classe: "Sec. di 1° grado", uso: "Classe" },
                'la-corte-della-commedia': { shortDesc: "Trasforma la classe in un Tribunale Dantesco, dove gli studenti analizzano fascicoli processuali e dibattono per giudicare i personaggi della Divina Commedia.", longDesc: "Trasforma la classe in un Tribunale Dantesco, dove gli studenti analizzano fascicoli processuali e dibattono per giudicare i personaggi della Divina Commedia.", materia: "Letteratura", giocatori: "Squadre / Singoli", durata: "Intero anno scolastico", obiettivi: "Gamification, analisi testo", classe: "Sec. di 1° grado", uso: "Classe" },
                'ops': { shortDesc: "Riscopri gli imprevisti storici e gli \"errori\" che hanno cambiato i destini del nostro passato.", longDesc: "Riscopri gli imprevisti storici e gli \"errori\" che hanno cambiato i destini del nostro passato.", materia: "Storia", giocatori: "2-4", durata: "45 min", obiettivi: "Causa-effetto, eventi storici", classe: "Sec. di 1° grado", uso: "Classe" },
                'la-roulette': { shortDesc: "Sfida a squadre per esplorare in modo casuale e interattivo diverse destinazioni del mondo.", longDesc: "Sfida a squadre per esplorare in modo casuale e interattivo diverse destinazioni del mondo.", materia: "Geografia", giocatori: "Classe intera (squadre)", durata: "30-45 min", obiettivi: "Ripasso, esplorazione rapida", classe: "Sec. di 1° grado", uso: "Classe, Ripasso" }
            };
            const defs = defaultGamesData[gameId] || {};

            document.getElementById('edit-game-shortdesc').value = data.shortDescription || defs.shortDesc || '';
            document.getElementById('edit-game-longdesc').value = data.longDescription || defs.longDesc || '';
            document.getElementById('edit-game-materia').value = data.materia || defs.materia || '';
            document.getElementById('edit-game-giocatori').value = data.giocatori || defs.giocatori || '';
            document.getElementById('edit-game-durata').value = data.durata || defs.durata || '';
            document.getElementById('edit-game-obiettivi').value = data.obiettivi || defs.obiettivi || '';
            document.getElementById('edit-game-classe').value = data.classe || defs.classe || '';
            document.getElementById('edit-game-uso').value = data.uso || defs.uso || '';
            
            // Controllo se il gioco adotta limitazioni interne avanzate (Fantaletteratura / Palestra)
            const isInternalRulesGame = (gameId === 'fantaletteratura' || gameId === 'palestra-di-riflessione');
            const elInternalRules = document.getElementById('edit-game-plans-internal-rules');
            const elInternalContent = document.getElementById('edit-game-internal-rules-content');
            const elPlansSelector = document.getElementById('edit-game-plans-selector');

            if (isInternalRulesGame) {
                if (elInternalRules) elInternalRules.style.display = 'block';
                if (elPlansSelector) elPlansSelector.style.display = 'none';

                if (elInternalContent) {
                    if (gameId === 'fantaletteratura') {
                        elInternalContent.innerHTML = `
                          <div style="background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #dcfce7; display: flex; align-items: flex-start; gap: 8px;">
                            <strong style="color: #16a34a; min-width: 130px;">🟢 Piano Base:</strong>
                            <span style="color: #334155;">Max 4 squadre, una sola classe didattica, sfide base tra autori.</span>
                          </div>
                          <div style="background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #dcfce7; display: flex; align-items: flex-start; gap: 8px;">
                            <strong style="color: #6366f1; min-width: 130px;">🟣 Viandante:</strong>
                            <span style="color: #334155;">Accesso individuale per appassionati, creazione della propria fanta-squadra personale.</span>
                          </div>
                          <div style="background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #dcfce7; display: flex; align-items: flex-start; gap: 8px;">
                            <strong style="color: #d97706; min-width: 130px;">🟡 Docente Didattico:</strong>
                            <span style="color: #334155;">Squadre e classi illimitate, campionati interni, codici classe privati e monitoraggio voti.</span>
                          </div>
                          <div style="background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #dcfce7; display: flex; align-items: flex-start; gap: 8px;">
                            <strong style="color: #db2777; min-width: 130px;">🌸 Docente Ecosistema:</strong>
                            <span style="color: #334155;">Tutte le funzionalità didattiche complete senza alcuna limitazione + supporto prioritario.</span>
                          </div>
                        `;
                    } else {
                        // Palestra di Riflessione
                        elInternalContent.innerHTML = `
                          <div style="background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #dcfce7; display: flex; align-items: flex-start; gap: 8px;">
                            <strong style="color: #16a34a; min-width: 130px;">🟢 Piano Base:</strong>
                            <span style="color: #334155;">Percorsi ed esercizi fondamentali di analisi e riflessione sulla lingua.</span>
                          </div>
                          <div style="background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #dcfce7; display: flex; align-items: flex-start; gap: 8px;">
                            <strong style="color: #6366f1; min-width: 130px;">🟣 Viandante:</strong>
                            <span style="color: #334155;">Accesso personale completo a tutti gli allenamenti e sfide di riflessione.</span>
                          </div>
                          <div style="background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #dcfce7; display: flex; align-items: flex-start; gap: 8px;">
                            <strong style="color: #d97706; min-width: 130px;">🟡 Docente Didattico:</strong>
                            <span style="color: #334155;">Assegnazione schede e compiti, analisi logica e del periodo, testi B1/B2 e verifiche di classe.</span>
                          </div>
                          <div style="background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #dcfce7; display: flex; align-items: flex-start; gap: 8px;">
                            <strong style="color: #db2777; min-width: 130px;">🌸 Docente Ecosistema:</strong>
                            <span style="color: #334155;">Tutte le funzioni didattiche complete e anteprime dei nuovi moduli.</span>
                          </div>
                        `;
                    }
                }
            } else {
                // Altri giochi e materiali: mostra il selettore con lo stato attuale
                if (elInternalRules) elInternalRules.style.display = 'none';
                if (elPlansSelector) elPlansSelector.style.display = 'flex';

                let allowed = data.allowedPlans || {};
                // Default per retrocompatibilità o prima inizializzazione basata sui piani dell'ecosistema
                if (!data.allowedPlans) {
                    if (data.isFreeBaseVersion !== undefined) {
                        allowed.base = data.isFreeBaseVersion === true;
                    }
                    // Di default La Rotta, Corte, Ops etc. sono inclusi in Viandante ed Ecosistema
                    if (allowed.viandante === undefined) allowed.viandante = true;
                    if (allowed.docente_ecosistema === undefined) allowed.docente_ecosistema = true;
                }

                document.getElementById('edit-game-plan-base').checked = allowed.base === true;
                document.getElementById('edit-game-plan-viandante').checked = allowed.viandante === true;
                document.getElementById('edit-game-plan-docente').checked = allowed.docente_didattico === true;
                document.getElementById('edit-game-plan-ecosistema').checked = allowed.docente_ecosistema === true;
            }
            
            document.getElementById('modal-edit-game').style.display = 'flex';
        }).catch(err => {
            console.error("Error fetching game details", err);
            alert("Errore nel recupero dei dettagli: " + err.message);
        });
    },
    
    saveGameInfo: function() {
        if (!window.GamesService) return;
        const gameId = document.getElementById('edit-game-id').value;
        const isInternalRulesGame = (gameId === 'fantaletteratura' || gameId === 'palestra-di-riflessione');

        let allowedPlansToSave = {};
        if (isInternalRulesGame) {
            // Per i giochi con regole interne tutti i piani possono entrare (e vengono regolati internamente)
            allowedPlansToSave = {
                base: true,
                viandante: true,
                docente_didattico: true,
                docente_ecosistema: true
            };
        } else {
            // Per gli altri giochi salviamo la selezione decisa
            allowedPlansToSave = {
                base: document.getElementById('edit-game-plan-base').checked,
                viandante: document.getElementById('edit-game-plan-viandante').checked,
                docente_didattico: document.getElementById('edit-game-plan-docente').checked,
                docente_ecosistema: document.getElementById('edit-game-plan-ecosistema').checked
            };
        }
        
        const dataToSave = {
            shortDescription: document.getElementById('edit-game-shortdesc').value,
            longDescription: document.getElementById('edit-game-longdesc').value,
            materia: document.getElementById('edit-game-materia').value,
            giocatori: document.getElementById('edit-game-giocatori').value,
            durata: document.getElementById('edit-game-durata').value,
            obiettivi: document.getElementById('edit-game-obiettivi').value,
            classe: document.getElementById('edit-game-classe').value,
            uso: document.getElementById('edit-game-uso').value,
            allowedPlans: allowedPlansToSave
        };
        
        window.GamesService.saveGameDetails(gameId, dataToSave).then(() => {
            document.getElementById('modal-edit-game').style.display = 'none';
            alert("Card gioco aggiornata con successo!");
        }).catch(err => {
            console.error("Firebase write error:", err);
            alert("Errore di salvataggio. Controlla le regole Firebase. Dettagli: " + err.message);
        });
    }
};

window.GamesUI = GamesUI;
