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
            { id: 'l-oratore', name: "L'Oratore" },
            { id: 'travel-agency', name: 'Travel Agency' },
            { id: 'il-mio-quaderno-alternativo', name: 'Il mio quaderno alternativo' },
            { id: 'la-ruota-geografica', name: 'La Ruota Geografica' },
            { id: 'fuori-registro', name: 'Fuori Registro' },
            { id: 'historygram', name: 'HistoryGram' }
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
                const data = statusMap[game.id] || { isActive: defaultActive, visibleInVetrina: true, popupType: 'wip_text' };
                const isVetrinaVisible = data.visibleInVetrina !== false;
                const isAccessOpen = !!data.isActive;
                
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #e5e7eb';
                
                tr.innerHTML = `
                    <td style="padding:15px 10px; font-weight: 600; color: var(--text-main); font-size: 0.95rem;">
                        <i class="fa-solid fa-gamepad" style="color: #6366f1; margin-right: 6px;"></i> ${game.name}
                    </td>
                    <td style="padding:15px 10px; text-align: center;">
                        <button class="btn btn-sm" onclick="window.GamesUI.toggleGameVetrina('${game.id}', ${!isVetrinaVisible})" 
                            title="${isVetrinaVisible ? 'Visibile nel catalogo del sito vetrina' : 'Nascosto dal catalogo del sito vetrina'}"
                            style="background:${isVetrinaVisible ? '#10b981' : '#64748b'}; color:white; padding:6px 14px; border:none; border-radius:20px; cursor:pointer; font-weight:600; font-size: 0.8rem; width: 130px; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                            ${isVetrinaVisible ? '<i class="fa-solid fa-eye"></i> In Vetrina' : '<i class="fa-solid fa-eye-slash"></i> Nascosto'}
                        </button>
                    </td>
                    <td style="padding:15px 10px; text-align: center;">
                        <button class="btn btn-sm" onclick="window.GamesUI.toggleGameStatus('${game.id}', ${!isAccessOpen})" 
                            title="${isAccessOpen ? 'Accessibile e operativo' : 'Bloccato con pop-up Lavori in corso'}"
                            style="background:${isAccessOpen ? '#059669' : '#d97706'}; color:white; padding:6px 14px; border:none; border-radius:20px; cursor:pointer; font-weight:600; font-size: 0.8rem; width: 155px; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                            ${isAccessOpen ? '<i class="fa-solid fa-circle-check"></i> Aperto' : '<i class="fa-solid fa-person-digging"></i> Lavori in corso'}
                        </button>
                    </td>
                    <td style="padding:15px 10px; text-align: right; white-space: nowrap;">
                        ${(game.id === 'il-mio-quaderno-alternativo' || game.id === 'travel-agency') ? `
                            <button class="btn btn-sm" onclick="window.GamesUI.openEditionsModal('${game.id}', '${game.name}')" 
                                title="Gestisci lo stato delle singole classi ed edizioni"
                                style="background:${game.id === 'il-mio-quaderno-alternativo' ? '#7c3aed' : '#0284c7'}; color:white; padding:6px 14px; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size: 0.82rem; margin-right: 8px; transition: transform 0.15s; display: inline-flex; align-items: center; gap: 6px;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                <i class="fa-solid fa-layer-group"></i> Edizioni
                            </button>
                        ` : ''}
                        <button class="btn btn-sm" onclick="HubApp.editGame('${game.id}', '${game.name}')" 
                            style="background:#4f46e5; color:white; padding:6px 14px; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size: 0.82rem; transition: transform 0.15s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="fa-solid fa-pen-to-square"></i> Modifica Card
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
    },

    toggleGameVetrina: function(gameId, targetVetrina) {
        if (!window.GamesService) return;
        
        window.GamesService.updateGameVetrina(gameId, targetVetrina).then(() => {
            console.log("Game vetrina visibility updated");
        }).catch((err) => {
            console.error("Firebase write error:", err);
            alert("Errore salvataggio visibilità vetrina: " + err.message);
        });
    },

    toggleGameStatus: function(gameId, targetStatus) {
        if (!window.GamesService) return;
        
        window.GamesService.updateGameStatus(gameId, targetStatus).then(() => {
            console.log("Game status updated");
        }).catch((err) => {
            console.error("Firebase write error:", err);
            alert("Errore salvataggio stato gioco: " + err.message);
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
                'l-oratore': { shortDesc: "192 carte, mazzi tematici e sfide di retorica, oratoria e debate per LIM e classe (QCER A1-C2).", longDesc: "Sfide di oratoria, retorica viva e pensiero critico. 192 incipit persuasivi suddivisi su 8 mazzi tematici per la scuola secondaria.", materia: "Retorica / Debate / Italiano", giocatori: "Classe / LIM / Squadre", durata: "15-45 min", obiettivi: "Argomentazione, public speaking, pensiero critico", classe: "Sec. 1° e 2° grado", uso: "Classe, LIM" },
                'la-ruota-geografica': { shortDesc: "Sfida a squadre per imparare la geografia generale in modo attivo tra ruote, sfide e creatività.", longDesc: "Sfida a squadre per imparare la geografia generale in modo attivo e coinvolgente. Due ruote (Modalità e Categorie), 192 prove e timer per spiegare, mimare, disegnare e sfidarsi in classe o alla LIM.", materia: "Geografia", giocatori: "Classe / Squadre", durata: "30-45 min", obiettivi: "Geografia generale, competenze comunicative, debate, creatività", classe: "Scuola secondaria di 1° grado", uso: "Classe, LIM" },
                'la-roulette': { shortDesc: "Sfida a squadre per esplorare in modo casuale e interattivo diverse destinazioni del mondo.", longDesc: "Sfida a squadre per esplorare in modo casuale e interattivo diverse destinazioni del mondo.", materia: "Geografia", giocatori: "Classe intera (squadre)", durata: "30-45 min", obiettivi: "Ripasso, esplorazione rapida", classe: "Sec. di 1° grado", uso: "Classe, Ripasso" },
                'historygram': { shortDesc: "Il social network didattico della storia tra moti dell'800 e sfide del XVI secolo.", longDesc: "Il social network della storia: Revolution Influencer ('800) e Riforma vs Controriforma ('500). Post, like-follower e flame storici con supervisione del docente.", materia: "Storia", giocatori: "Squadre / Classe", durata: "1-2 ore", obiettivi: "Pensiero critico, fonti, debate", classe: "2ª e 3ª Sec. di 1° grado", uso: "LIM, Classe, Smartphone" }
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
                    if (gameId === 'l-oratore' || gameId === 'la-ruota-geografica') {
                        // L'Oratore e La Ruota Geografica sono rigorosamente esclusivi di Piano Ecosistema Completo
                        allowed.base = false;
                        allowed.viandante = false;
                        allowed.docente_didattico = false;
                        allowed.docente_ecosistema = true;
                    } else {
                        // Di default La Rotta, Corte, Ops etc. sono inclusi in Viandante ed Ecosistema
                        if (allowed.viandante === undefined) allowed.viandante = true;
                        if (allowed.docente_ecosistema === undefined) allowed.docente_ecosistema = true;
                    }
                }

                document.getElementById('edit-game-plan-base').checked = allowed.base === true;
                document.getElementById('edit-game-plan-viandante').checked = allowed.viandante === true;
                document.getElementById('edit-game-plan-docente').checked = allowed.docente_didattico === true;
                document.getElementById('edit-game-plan-ecosistema').checked = allowed.docente_ecosistema === true;
            }

            // Gestione Sotto-Edizioni / Volumi (ESCLUSIVO per Il mio quaderno alternativo e Travel Agency)
            const elEditionsContainer = document.getElementById('edit-game-editions-container');
            const elEditionsList = document.getElementById('edit-game-editions-list');

            if (gameId === 'il-mio-quaderno-alternativo' || gameId === 'travel-agency') {
                if (elEditionsContainer) elEditionsContainer.style.display = 'block';
                const editionsData = data.editions || {};

                if (gameId === 'il-mio-quaderno-alternativo') {
                    const c1Active = editionsData['classe-1'] ? editionsData['classe-1'].isActive !== false : true;
                    const c2Active = editionsData['classe-2'] ? editionsData['classe-2'].isActive === true : false;
                    const c3Active = editionsData['classe-3'] ? editionsData['classe-3'].isActive === true : false;

                    if (elEditionsList) {
                        elEditionsList.innerHTML = `
                            <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; background: white; border: 1px solid #bfdbfe; cursor: pointer;">
                                <div>
                                    <strong style="color: #7c3aed; font-size: 0.9rem;">Classe Prima</strong>
                                    <div style="font-size: 0.78rem; color: #64748b;">Percorso introduttivo identità e valori</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span id="label-edition-quaderno-1" style="font-size: 0.8rem; font-weight: 600; color: ${c1Active ? '#16a34a' : '#ea580c'};">${c1Active ? 'Disponibile' : 'In lavorazione'}</span>
                                    <input type="checkbox" id="edit-edition-quaderno-1" ${c1Active ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" onchange="document.getElementById('label-edition-quaderno-1').innerText = this.checked ? 'Disponibile' : 'In lavorazione'; document.getElementById('label-edition-quaderno-1').style.color = this.checked ? '#16a34a' : '#ea580c';">
                                </div>
                            </label>
                            <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; background: white; border: 1px solid #bfdbfe; cursor: pointer;">
                                <div>
                                    <strong style="color: #0891b2; font-size: 0.9rem;">Classe Seconda</strong>
                                    <div style="font-size: 0.78rem; color: #64748b;">Etica delle relazioni e cittadinanza</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span id="label-edition-quaderno-2" style="font-size: 0.8rem; font-weight: 600; color: ${c2Active ? '#16a34a' : '#ea580c'};">${c2Active ? 'Disponibile' : 'In lavorazione'}</span>
                                    <input type="checkbox" id="edit-edition-quaderno-2" ${c2Active ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" onchange="document.getElementById('label-edition-quaderno-2').innerText = this.checked ? 'Disponibile' : 'In lavorazione'; document.getElementById('label-edition-quaderno-2').style.color = this.checked ? '#16a34a' : '#ea580c';">
                                </div>
                            </label>
                            <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; background: white; border: 1px solid #bfdbfe; cursor: pointer;">
                                <div>
                                    <strong style="color: #b45309; font-size: 0.9rem;">Classe Terza</strong>
                                    <div style="font-size: 0.78rem; color: #64748b;">Libertà, giustizia, ambiente e futuro</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span id="label-edition-quaderno-3" style="font-size: 0.8rem; font-weight: 600; color: ${c3Active ? '#16a34a' : '#ea580c'};">${c3Active ? 'Disponibile' : 'In lavorazione'}</span>
                                    <input type="checkbox" id="edit-edition-quaderno-3" ${c3Active ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" onchange="document.getElementById('label-edition-quaderno-3').innerText = this.checked ? 'Disponibile' : 'In lavorazione'; document.getElementById('label-edition-quaderno-3').style.color = this.checked ? '#16a34a' : '#ea580c';">
                                </div>
                            </label>
                        `;
                    }
                } else if (gameId === 'travel-agency') {
                    const eurActive = editionsData['europe'] ? editionsData['europe'].isActive !== false : true;
                    const wrlActive = editionsData['world'] ? editionsData['world'].isActive !== false : true;
                    const frnActive = editionsData['friends'] ? editionsData['friends'].isActive !== false : true;

                    if (elEditionsList) {
                        elEditionsList.innerHTML = `
                            <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; background: white; border: 1px solid #bfdbfe; cursor: pointer;">
                                <div>
                                    <strong style="color: #3b82f6; font-size: 0.9rem;">🇪🇺 Explore Europe</strong>
                                    <div style="font-size: 0.78rem; color: #64748b;">Seconda di Primo Grado</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span id="label-edition-travel-eur" style="font-size: 0.8rem; font-weight: 600; color: ${eurActive ? '#16a34a' : '#ea580c'};">${eurActive ? 'Disponibile' : 'In lavorazione'}</span>
                                    <input type="checkbox" id="edit-edition-travel-europe" ${eurActive ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" onchange="document.getElementById('label-edition-travel-eur').innerText = this.checked ? 'Disponibile' : 'In lavorazione'; document.getElementById('label-edition-travel-eur').style.color = this.checked ? '#16a34a' : '#ea580c';">
                                </div>
                            </label>
                            <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; background: white; border: 1px solid #bfdbfe; cursor: pointer;">
                                <div>
                                    <strong style="color: #0284c7; font-size: 0.9rem;">🌍 Around the World</strong>
                                    <div style="font-size: 0.78rem; color: #64748b;">Terza di Primo Grado</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span id="label-edition-travel-wrl" style="font-size: 0.8rem; font-weight: 600; color: ${wrlActive ? '#16a34a' : '#ea580c'};">${wrlActive ? 'Disponibile' : 'In lavorazione'}</span>
                                    <input type="checkbox" id="edit-edition-travel-world" ${wrlActive ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" onchange="document.getElementById('label-edition-travel-wrl').innerText = this.checked ? 'Disponibile' : 'In lavorazione'; document.getElementById('label-edition-travel-wrl').style.color = this.checked ? '#16a34a' : '#ea580c';">
                                </div>
                            </label>
                            <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; background: white; border: 1px solid #bfdbfe; cursor: pointer;">
                                <div>
                                    <strong style="color: #f59e0b; font-size: 0.9rem;">💼 For Friends</strong>
                                    <div style="font-size: 0.78rem; color: #64748b;">Adulti e Party</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span id="label-edition-travel-frn" style="font-size: 0.8rem; font-weight: 600; color: ${frnActive ? '#16a34a' : '#ea580c'};">${frnActive ? 'Disponibile' : 'In lavorazione'}</span>
                                    <input type="checkbox" id="edit-edition-travel-friends" ${frnActive ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" onchange="document.getElementById('label-edition-travel-frn').innerText = this.checked ? 'Disponibile' : 'In lavorazione'; document.getElementById('label-edition-travel-frn').style.color = this.checked ? '#16a34a' : '#ea580c';">
                                </div>
                            </label>
                        `;
                    }
                }
            } else {
                if (elEditionsContainer) elEditionsContainer.style.display = 'none';
                if (elEditionsList) elEditionsList.innerHTML = '';
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

        // Salvataggio Edizioni / Volumi (ESCLUSIVO per Il mio quaderno alternativo e Travel Agency)
        if (gameId === 'il-mio-quaderno-alternativo') {
            const chk1 = document.getElementById('edit-edition-quaderno-1');
            const chk2 = document.getElementById('edit-edition-quaderno-2');
            const chk3 = document.getElementById('edit-edition-quaderno-3');
            dataToSave.editions = {
                'classe-1': { isActive: chk1 ? chk1.checked : true, label: 'Classe Prima' },
                'classe-2': { isActive: chk2 ? chk2.checked : false, label: 'Classe Seconda' },
                'classe-3': { isActive: chk3 ? chk3.checked : false, label: 'Classe Terza' }
            };
        } else if (gameId === 'travel-agency') {
            const chkEur = document.getElementById('edit-edition-travel-europe');
            const chkWrl = document.getElementById('edit-edition-travel-world');
            const chkFrn = document.getElementById('edit-edition-travel-friends');
            dataToSave.editions = {
                'europe': { isActive: chkEur ? chkEur.checked : true, label: 'Explore Europe' },
                'world': { isActive: chkWrl ? chkWrl.checked : true, label: 'Around the World' },
                'friends': { isActive: chkFrn ? chkFrn.checked : true, label: 'For Friends' }
            };
        }
        
        window.GamesService.saveGameDetails(gameId, dataToSave).then(() => {
            document.getElementById('modal-edit-game').style.display = 'none';
            alert("Card gioco aggiornata con successo!");
        }).catch(err => {
            console.error("Firebase write error:", err);
            alert("Errore di salvataggio. Controlla le regole Firebase. Dettagli: " + err.message);
        });
    },

    openEditionsModal: function(gameId, gameName) {
        if (!window.GamesService) return;
        document.getElementById('editions-modal-game-name').innerText = gameName;
        document.getElementById('editions-modal-game-id').value = gameId;
        const elList = document.getElementById('editions-modal-list');
        if (!elList) return;

        window.GamesService.getGameDetails(gameId).then(data => {
            const editionsData = data.editions || {};

            if (gameId === 'il-mio-quaderno-alternativo') {
                const c1Active = editionsData['classe-1'] ? editionsData['classe-1'].isActive !== false : true;
                const c2Active = editionsData['classe-2'] ? editionsData['classe-2'].isActive === true : false;
                const c3Active = editionsData['classe-3'] ? editionsData['classe-3'].isActive === true : false;

                elList.innerHTML = `
                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer;">
                        <div>
                            <strong style="color: #7c3aed; font-size: 0.95rem;">Classe Prima</strong>
                            <div style="font-size: 0.78rem; color: #64748b;">Percorso identità, valori e convivenza</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span id="label-pop-quad-1" style="font-size: 0.82rem; font-weight: 700; color: ${c1Active ? '#16a34a' : '#ea580c'};">${c1Active ? 'Disponibile' : 'In lavorazione'}</span>
                            <input type="checkbox" id="pop-edition-quad-1" ${c1Active ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;" onchange="document.getElementById('label-pop-quad-1').innerText = this.checked ? 'Disponibile' : 'In lavorazione'; document.getElementById('label-pop-quad-1').style.color = this.checked ? '#16a34a' : '#ea580c';">
                        </div>
                    </label>
                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer;">
                        <div>
                            <strong style="color: #0891b2; font-size: 0.95rem;">Classe Seconda</strong>
                            <div style="font-size: 0.78rem; color: #64748b;">Etica delle relazioni e dialogo interculturale</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span id="label-pop-quad-2" style="font-size: 0.82rem; font-weight: 700; color: ${c2Active ? '#16a34a' : '#ea580c'};">${c2Active ? 'Disponibile' : 'In lavorazione'}</span>
                            <input type="checkbox" id="pop-edition-quad-2" ${c2Active ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;" onchange="document.getElementById('label-pop-quad-2').innerText = this.checked ? 'Disponibile' : 'In lavorazione'; document.getElementById('label-pop-quad-2').style.color = this.checked ? '#16a34a' : '#ea580c';">
                        </div>
                    </label>
                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer;">
                        <div>
                            <strong style="color: #b45309; font-size: 0.95rem;">Classe Terza</strong>
                            <div style="font-size: 0.78rem; color: #64748b;">Libertà, giustizia, ambiente e futuro</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span id="label-pop-quad-3" style="font-size: 0.82rem; font-weight: 700; color: ${c3Active ? '#16a34a' : '#ea580c'};">${c3Active ? 'Disponibile' : 'In lavorazione'}</span>
                            <input type="checkbox" id="pop-edition-quad-3" ${c3Active ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;" onchange="document.getElementById('label-pop-quad-3').innerText = this.checked ? 'Disponibile' : 'In lavorazione'; document.getElementById('label-pop-quad-3').style.color = this.checked ? '#16a34a' : '#ea580c';">
                        </div>
                    </label>
                `;
            } else if (gameId === 'travel-agency') {
                const eurActive = editionsData['europe'] ? editionsData['europe'].isActive !== false : true;
                const wrlActive = editionsData['world'] ? editionsData['world'].isActive !== false : true;
                const frnActive = editionsData['friends'] ? editionsData['friends'].isActive !== false : true;

                elList.innerHTML = `
                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer;">
                        <div>
                            <strong style="color: #3b82f6; font-size: 0.95rem;">🇪🇺 Explore Europe</strong>
                            <div style="font-size: 0.78rem; color: #64748b;">Seconda di Primo Grado</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span id="label-pop-trv-eur" style="font-size: 0.82rem; font-weight: 700; color: ${eurActive ? '#16a34a' : '#ea580c'};">${eurActive ? 'Disponibile' : 'In lavorazione'}</span>
                            <input type="checkbox" id="pop-edition-trv-eur" ${eurActive ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;" onchange="document.getElementById('label-pop-trv-eur').innerText = this.checked ? 'Disponibile' : 'In lavorazione'; document.getElementById('label-pop-trv-eur').style.color = this.checked ? '#16a34a' : '#ea580c';">
                        </div>
                    </label>
                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer;">
                        <div>
                            <strong style="color: #0284c7; font-size: 0.95rem;">🌍 Around the World</strong>
                            <div style="font-size: 0.78rem; color: #64748b;">Terza di Primo Grado</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span id="label-pop-trv-wrl" style="font-size: 0.82rem; font-weight: 700; color: ${wrlActive ? '#16a34a' : '#ea580c'};">${wrlActive ? 'Disponibile' : 'In lavorazione'}</span>
                            <input type="checkbox" id="pop-edition-trv-wrl" ${wrlActive ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;" onchange="document.getElementById('label-pop-trv-wrl').innerText = this.checked ? 'Disponibile' : 'In lavorazione'; document.getElementById('label-pop-trv-wrl').style.color = this.checked ? '#16a34a' : '#ea580c';">
                        </div>
                    </label>
                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer;">
                        <div>
                            <strong style="color: #f59e0b; font-size: 0.95rem;">💼 For Friends</strong>
                            <div style="font-size: 0.78rem; color: #64748b;">Adulti e Party Game</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span id="label-pop-trv-frn" style="font-size: 0.82rem; font-weight: 700; color: ${frnActive ? '#16a34a' : '#ea580c'};">${frnActive ? 'Disponibile' : 'In lavorazione'}</span>
                            <input type="checkbox" id="pop-edition-trv-frn" ${frnActive ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;" onchange="document.getElementById('label-pop-trv-frn').innerText = this.checked ? 'Disponibile' : 'In lavorazione'; document.getElementById('label-pop-trv-frn').style.color = this.checked ? '#16a34a' : '#ea580c';">
                        </div>
                    </label>
                `;
            }

            document.getElementById('modal-edit-editions').style.display = 'flex';
        }).catch(err => {
            console.error("Error fetching game editions details", err);
            alert("Errore nel recupero delle edizioni: " + err.message);
        });
    },

    saveEditionsOnly: function() {
        if (!window.GamesService) return;
        const gameId = document.getElementById('editions-modal-game-id').value;
        let editionsToSave = {};

        if (gameId === 'il-mio-quaderno-alternativo') {
            const chk1 = document.getElementById('pop-edition-quad-1');
            const chk2 = document.getElementById('pop-edition-quad-2');
            const chk3 = document.getElementById('pop-edition-quad-3');
            editionsToSave = {
                'classe-1': { isActive: chk1 ? chk1.checked : true, label: 'Classe Prima' },
                'classe-2': { isActive: chk2 ? chk2.checked : false, label: 'Classe Seconda' },
                'classe-3': { isActive: chk3 ? chk3.checked : false, label: 'Classe Terza' }
            };
        } else if (gameId === 'travel-agency') {
            const chkEur = document.getElementById('pop-edition-trv-eur');
            const chkWrl = document.getElementById('pop-edition-trv-wrl');
            const chkFrn = document.getElementById('pop-edition-trv-frn');
            editionsToSave = {
                'europe': { isActive: chkEur ? chkEur.checked : true, label: 'Explore Europe' },
                'world': { isActive: chkWrl ? chkWrl.checked : true, label: 'Around the World' },
                'friends': { isActive: chkFrn ? chkFrn.checked : true, label: 'For Friends' }
            };
        }

        window.GamesService.saveGameDetails(gameId, { editions: editionsToSave }).then(() => {
            document.getElementById('modal-edit-editions').style.display = 'none';
            alert("Stato edizioni aggiornato con successo!");
        }).catch(err => {
            console.error("Firebase write error:", err);
            alert("Errore di salvataggio: " + err.message);
        });
    }
};

window.GamesUI = GamesUI;
