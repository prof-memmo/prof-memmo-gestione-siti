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
                    <td style="padding:15px 10px;">
                        <span style="padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:bold; 
                            background: ${data.isActive ? '#dcfce7' : '#fee2e2'}; 
                            color: ${data.isActive ? '#166534' : '#991b1b'};">
                            ${data.isActive ? 'ATTIVO' : 'DISATTIVATO'}
                        </span>
                    </td>
                    <td style="padding:15px 10px;">
                        <button class="btn btn-sm" onclick="HubApp.toggleGameStatus('${game.id}', ${!data.isActive})" 
                            style="background:${data.isActive ? '#ef4444' : '#10b981'}; color:white; padding:5px 10px; border:none; border-radius:4px; cursor:pointer; margin-right: 5px;">
                            ${data.isActive ? 'Disattiva' : 'Attiva'}
                        </button>
                        <button class="btn btn-sm" onclick="HubApp.editGame('${game.id}', '${game.name}')" 
                            style="background:#3b82f6; color:white; padding:5px 10px; border:none; border-radius:4px; cursor:pointer;">
                            Modifica Card
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
            
            const isFreeToggle = document.getElementById('edit-game-is-free-base');
            if(isFreeToggle) {
                // If not set in DB, default to true for existing games (optional) or false. Let's just use data.isFreeBaseVersion
                isFreeToggle.checked = data.isFreeBaseVersion === true;
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
        
        const dataToSave = {
            shortDescription: document.getElementById('edit-game-shortdesc').value,
            longDescription: document.getElementById('edit-game-longdesc').value,
            materia: document.getElementById('edit-game-materia').value,
            giocatori: document.getElementById('edit-game-giocatori').value,
            durata: document.getElementById('edit-game-durata').value,
            obiettivi: document.getElementById('edit-game-obiettivi').value,
            classe: document.getElementById('edit-game-classe').value,
            uso: document.getElementById('edit-game-uso').value,
            isFreeBaseVersion: document.getElementById('edit-game-is-free-base') ? document.getElementById('edit-game-is-free-base').checked : false
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
