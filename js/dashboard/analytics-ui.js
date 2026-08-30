// --- Analytics UI Service ---
// Gestisce i grafici e i KPI della dashboard Analytics utilizzando Chart.js

const AnalyticsUI = {
    chartRuoli: null,
    chartPiani: null,
    chartGiochi: null,
    chartAndamento: null,
    chartCanali: null,
    chartFasceEta: null,
    chartMaterie: null,
    chartGeografia: null,

    activeGameFilter: 'all',
    expensesList: [],
    expensesListenerAttached: false,

    GAME_META: {
        'Fantaletteratura': { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', icon: 'fa-dragon' },
        'La Rotta degli Eroi': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: 'fa-ship' },
        'Palestra di Riflessione': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', icon: 'fa-brain' },
        'La Corte della Commedia': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: 'fa-book-open' },
        'Ops! Operazione Storia': { color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', icon: 'fa-clock-rotate-left' },
        'Hub': { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)', icon: 'fa-globe' }
    },

    render: function(iscrittiAggregati) {
        if (!iscrittiAggregati || iscrittiAggregati.length === 0) {
            console.log("Nessun dato iscritto per gli analytics.");
            return;
        }
        
        this.iscrittiAggregati = iscrittiAggregati; // Salva per l'esportazione CSV

        // Inizializza listener spese (se non ancora agganciato)
        this.initExpenses();

        // 1. Elaborazione dati
        const stats = this.processData(iscrittiAggregati);

        // 2. Aggiornamento KPI numerici
        this.updateKPIs(stats, iscrittiAggregati.length);

        // 3. Rendering grafici
        this.renderRuoliChart(stats.ruoli);
        this.renderPianiChart(stats.piani);
        this.renderGiochiChart(stats.giochi);
        this.renderAndamentoChart(stats.timelineByGame, stats.timeline);
        this.renderCanaliChart(stats.canali);
        this.renderFasceEtaChart(stats.fasceEta);
        this.renderMaterieChart(stats.materie);
        this.renderGeografiaChart(stats.geografia);
    },

    filterByGame: function(gameName) {
        this.activeGameFilter = gameName;
        if (!this.iscrittiAggregati) return;

        let filtered = this.iscrittiAggregati;
        if (gameName && gameName !== 'all') {
            filtered = this.iscrittiAggregati.filter(u => {
                const g = (u.gioco || '').toLowerCase();
                const target = gameName.toLowerCase();
                return g.includes(target);
            });
        }

        const stats = this.processData(filtered);
        this.updateKPIs(stats, filtered.length);
        this.renderRuoliChart(stats.ruoli);
        this.renderPianiChart(stats.piani);
        this.renderGiochiChart(stats.giochi);
        this.renderAndamentoChart(stats.timelineByGame, stats.timeline);
        this.renderCanaliChart(stats.canali);
        this.renderFasceEtaChart(stats.fasceEta);
        this.renderMaterieChart(stats.materie);
        this.renderGeografiaChart(stats.geografia);
    },

    initExpenses: function() {
        if (this.expensesListenerAttached) return;
        if (window.EcosystemService && typeof window.EcosystemService.listenToExpenses === 'function') {
            this.expensesListenerAttached = true;
            window.EcosystemService.listenToExpenses(items => {
                this.expensesList = Array.isArray(items) ? items : [];
                this.updateExpensesKPIs();
            });
        }
    },

    updateDateFilter: function() {
        if (!this.iscrittiAggregati) return;

        const dateFrom = document.getElementById('analytics-date-from') ? document.getElementById('analytics-date-from').value : '';
        const dateTo = document.getElementById('analytics-date-to') ? document.getElementById('analytics-date-to').value : '';

        let startTs = dateFrom ? new Date(dateFrom).getTime() : 0;
        let endTs = dateTo ? (new Date(dateTo).getTime() + 86400000) : Infinity;

        const filteredUsers = this.iscrittiAggregati.filter(user => {
            const t = user.dataValue || 0;
            if (startTs && t < startTs) return false;
            if (endTs && t > endTs) return false;
            return true;
        });

        const stats = this.processData(filteredUsers);
        this.updateKPIs(stats, filteredUsers.length);

        // Aggiorna il valore Incassato nel pannello superiore (filtrato per date)
        const earnings = this.calculateEarnings(this.iscrittiAggregati, dateFrom, dateTo);
        const elIncassato = document.getElementById('analytics-incassato-display');
        if (elIncassato) {
            elIncassato.textContent = earnings.total.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
        }

        // Aggiorna Spese e Guadagno con il nuovo filtro date
        this.updateExpensesKPIs();

        // Ridisegna grafici filtrati
        this.renderRuoliChart(stats.ruoli);
        this.renderPianiChart(stats.piani);
        this.renderGiochiChart(stats.giochi);
        this.renderAndamentoChart(stats.timelineByGame, stats.timeline);
        this.renderCanaliChart(stats.canali);
        this.renderFasceEtaChart(stats.fasceEta);
        this.renderMaterieChart(stats.materie);
        this.renderGeografiaChart(stats.geografia);
    },

    resolveMacroArea: function(cityOrSchool) {
        if (!cityOrSchool) return 'Non specificato';
        const s = String(cityOrSchool).toLowerCase();

        // Isole
        if (s.includes('sicil') || s.includes('palermo') || s.includes('catania') || s.includes('messina') || s.includes('siracusa') || s.includes('trapani') || s.includes('agrigento') || s.includes('ragusa') || s.includes('caltanissetta') || s.includes('enna') || s.includes('sardegn') || s.includes('cagliari') || s.includes('sassari') || s.includes('nuoro') || s.includes('oristano') || s.includes('olbia') || s.includes('alghero')) {
            return 'Isole';
        }

        // Sud
        if (s.includes('campani') || s.includes('napoli') || s.includes('salerno') || s.includes('caserta') || s.includes('avellino') || s.includes('benevento') || s.includes('pugli') || s.includes('bari') || s.includes('foggia') || s.includes('taranto') || s.includes('brindisi') || s.includes('lecce') || s.includes('barletta') || s.includes('andria') || s.includes('trani') || s.includes('calabri') || s.includes('reggio cal') || s.includes('catanzaro') || s.includes('cosenza') || s.includes('crotone') || s.includes('vibo') || s.includes('basilicata') || s.includes('potenza') || s.includes('matera') || s.includes('abruzzo') || s.includes('l\'aquila') || s.includes('pescara') || s.includes('chieti') || s.includes('teramo') || s.includes('molise') || s.includes('campobasso') || s.includes('isernia')) {
            return 'Sud';
        }

        // Centro
        if (s.includes('lazio') || s.includes('roma') || s.includes('viterbo') || s.includes('rieti') || s.includes('latina') || s.includes('frosinone') || s.includes('toscana') || s.includes('firenze') || s.includes('pisa') || s.includes('livorno') || s.includes('siena') || s.includes('lucca') || s.includes('arezzo') || s.includes('pistoia') || s.includes('prato') || s.includes('grosseto') || s.includes('massa') || s.includes('carrara') || s.includes('umbria') || s.includes('perugia') || s.includes('terni') || s.includes('marche') || s.includes('ancona') || s.includes('pesaro') || s.includes('urbino') || s.includes('macerata') || s.includes('fermo') || s.includes('ascoli')) {
            return 'Centro';
        }

        // Nord
        if (s.includes('lombard') || s.includes('milano') || s.includes('brescia') || s.includes('bergamo') || s.includes('monza') || s.includes('como') || s.includes('varese') || s.includes('lecco') || s.includes('pavia') || s.includes('cremona') || s.includes('mantova') || s.includes('lodi') || s.includes('sondrio') || s.includes('piemonte') || s.includes('torino') || s.includes('novara') || s.includes('alessandria') || s.includes('asti') || s.includes('cuneo') || s.includes('vercelli') || s.includes('biella') || s.includes('verbania') || s.includes('veneto') || s.includes('venezia') || s.includes('verona') || s.includes('padova') || s.includes('vicenza') || s.includes('treviso') || s.includes('belluno') || s.includes('rovigo') || s.includes('emilia') || s.includes('bologna') || s.includes('parma') || s.includes('modena') || s.includes('reggio em') || s.includes('piacenza') || s.includes('ferrara') || s.includes('ravenna') || s.includes('forl') || s.includes('cesena') || s.includes('rimini') || s.includes('liguria') || s.includes('genova') || s.includes('savona') || s.includes('imperia') || s.includes('la spezia') || s.includes('trentino') || s.includes('trento') || s.includes('bolzano') || s.includes('friuli') || s.includes('trieste') || s.includes('udine') || s.includes('pordenone') || s.includes('gorizia') || s.includes('aosta')) {
            return 'Nord';
        }

        return 'Non specificato';
    },

    processData: function(iscritti) {
        const stats = {
            ruoli: {},
            piani: {},
            pianiCounts: {
                base: 0,
                viandante: 0,
                docente_didattico: 0,
                docente_ecosistema: 0,
                totaleAbbonati: 0
            },
            giochi: {},
            timelineByGame: {
                'Fantaletteratura': {},
                'La Rotta degli Eroi': {},
                'Palestra di Riflessione': {},
                'La Corte della Commedia': {},
                'Ops! Operazione Storia': {},
                'Hub': {}
            },
            timeline: {},
            canali: {},
            fasceEta: {},
            materie: {},
            geografia: {
                'Nord': 0,
                'Centro': 0,
                'Sud': 0,
                'Isole': 0,
                'Non specificato': 0
            },
            topGiocoName: 'N/A'
        };

        iscritti.forEach(user => {
            // Normalizzazione Ruolo Unificato
            const rRaw = String(user.ruolo || user.role || '').toLowerCase().trim();
            let ruoloUnificato = 'viandante';
            if (rRaw.includes('student') || rRaw === 'studente') {
                ruoloUnificato = 'studente';
            } else if (rRaw.includes('teacher') || rRaw.includes('docente') || rRaw === 'prof') {
                ruoloUnificato = 'docente';
            } else if (rRaw.includes('admin') || (user.email && String(user.email).toLowerCase() === 'prof.memmo@gmail.com')) {
                ruoloUnificato = 'admin';
            } else {
                ruoloUnificato = 'viandante';
            }
            stats.ruoli[ruoloUnificato] = (stats.ruoli[ruoloUnificato] || 0) + 1;

            // Normalizzazione e Conteggio Piani
            const pRaw = String(user.abbonamento || user.subscription || user.piano || user.plan || 'base').toLowerCase().trim();
            let pianoLabel = 'Piano Base';
            
            if (pRaw.includes('ecosistema') || pRaw === 'docente_ecosistema') {
                pianoLabel = 'Docente Ecosistema';
                stats.pianiCounts.docente_ecosistema++;
                stats.pianiCounts.totaleAbbonati++;
            } else if (pRaw.includes('didattico') || pRaw === 'docente_didattico') {
                pianoLabel = 'Docente Didattico';
                stats.pianiCounts.docente_didattico++;
                stats.pianiCounts.totaleAbbonati++;
            } else if (pRaw.includes('viandante')) {
                pianoLabel = 'Piano Viandante';
                stats.pianiCounts.viandante++;
                stats.pianiCounts.totaleAbbonati++;
            } else {
                pianoLabel = 'Piano Base (Gratuito)';
                stats.pianiCounts.base++;
            }

            stats.piani[pianoLabel] = (stats.piani[pianoLabel] || 0) + 1;

            // Conta Giochi separatamente (senza fonderli in un'unica stringa)
            const rawGames = user.gioco || 'Hub';
            const userGames = rawGames.split(' / ').map(g => g.trim()).filter(Boolean);
            userGames.forEach(g => {
                stats.giochi[g] = (stats.giochi[g] || 0) + 1;
            });

            // Elabora andamento temporale per singolo gioco e complessivo
            if (user.dataValue && user.dataValue > 0) {
                const d = new Date(user.dataValue);
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const key = `${d.getFullYear()}-${month}`;
                stats.timeline[key] = (stats.timeline[key] || 0) + 1;

                userGames.forEach(g => {
                    if (!stats.timelineByGame[g]) stats.timelineByGame[g] = {};
                    stats.timelineByGame[g][key] = (stats.timelineByGame[g][key] || 0) + 1;
                });
            }

            // Elabora provenienza geografica (Città / Scuola / Anagrafica)
            const cityOrSchool = user.citta || user.city || user.scuola || user.school || (user.anagrafica && (user.anagrafica.citta || user.anagrafica.scuola)) || '';
            const macroArea = this.resolveMacroArea(cityOrSchool);
            stats.geografia[macroArea] = (stats.geografia[macroArea] || 0) + 1;

            // Elabora dati Questionario (Survey)
            if (user.survey) {
                if (user.survey.canale) {
                    stats.canali[user.survey.canale] = (stats.canali[user.survey.canale] || 0) + 1;
                }
                if (user.survey.fasciaEta) {
                    stats.fasceEta[user.survey.fasciaEta] = (stats.fasceEta[user.survey.fasciaEta] || 0) + 1;
                }
                if (Array.isArray(user.survey.materie)) {
                    user.survey.materie.forEach(m => {
                        stats.materie[m] = (stats.materie[m] || 0) + 1;
                    });
                }
            }
        });

        // Trova il gioco più utilizzato
        let maxCount = 0;
        let topG = 'N/A';
        for (let g in stats.giochi) {
            if (stats.giochi[g] > maxCount) {
                maxCount = stats.giochi[g];
                topG = g;
            }
        }
        stats.topGiocoName = topG;

        return stats;
    },

    updateKPIs: function(stats, totalUsers) {
        // Totali
        const elTot = document.getElementById('kpi-totali');
        if (elTot) elTot.textContent = totalUsers;

        // Docenti
        const docentiCount = stats.ruoli['docente'] || 0;
        const elDoc = document.getElementById('kpi-docenti');
        if (elDoc) elDoc.textContent = docentiCount;

        // Studenti
        const studentiCount = stats.ruoli['studente'] || 0;
        const elStud = document.getElementById('kpi-studenti');
        if (elStud) elStud.textContent = studentiCount;

        // Piattaforme (quanti giochi distinti)
        const piattaformeCount = Object.keys(stats.giochi).length;
        const elPiat = document.getElementById('kpi-piattaforme');
        if (elPiat) elPiat.textContent = piattaformeCount;

        // Top Gioco
        const elTop = document.getElementById('kpi-top-gioco');
        if (elTop) elTop.textContent = stats.topGiocoName;

        // --- KPI Conteggio per Piano di Abbonamento ---
        const calcPct = (count) => totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
        const pc = stats.pianiCounts || { base: 0, viandante: 0, docente_didattico: 0, docente_ecosistema: 0, totaleAbbonati: 0 };

        const setP = (idCount, idPct, val) => {
            const elC = document.getElementById(idCount);
            const elP = document.getElementById(idPct);
            if (elC) elC.textContent = val;
            if (elP) elP.textContent = `${calcPct(val)}% del totale`;
        };

        setP('kpi-piano-base', 'kpi-piano-base-pct', pc.base);
        setP('kpi-piano-viandante', 'kpi-piano-viandante-pct', pc.viandante);
        setP('kpi-piano-docente-didattico', 'kpi-piano-docente-didattico-pct', pc.docente_didattico);
        setP('kpi-piano-docente-ecosistema', 'kpi-piano-docente-ecosistema-pct', pc.docente_ecosistema);

        const elTotAbb = document.getElementById('kpi-abbonati-totali');
        const elTotAbbPct = document.getElementById('kpi-abbonati-totali-pct');
        if (elTotAbb) elTotAbb.textContent = pc.totaleAbbonati;
        if (elTotAbbPct) elTotAbbPct.textContent = `${calcPct(pc.totaleAbbonati)}% a pagamento`;

        // Aggiorna il pannello Incassato Anno Corrente (rispettando il filtro date attivo)
        const dateFrom = document.getElementById('analytics-date-from') ? document.getElementById('analytics-date-from').value : '';
        const dateTo = document.getElementById('analytics-date-to') ? document.getElementById('analytics-date-to').value : '';
        const earnings = this.calculateEarnings(this.iscrittiAggregati, dateFrom || null, dateTo || null);
        const elIncassato = document.getElementById('analytics-incassato-display');
        if (elIncassato) {
            elIncassato.textContent = earnings.total.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
        }
        // Aggiorna Disponibilità Residua
        const elMassimale = document.getElementById('analytics-massimale-display');
        const elResiduo = document.getElementById('analytics-residuo-display');
        if (elMassimale && elResiduo) {
            const massimaleText = elMassimale.textContent.replace(/[^0-9.,]/g, '').replace(',', '.');
            const massimale = parseFloat(massimaleText) || 4500;
            const residuo = Math.max(0, massimale - earnings.total);
            elResiduo.textContent = residuo.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
        }
    },

    calculateEarnings: function(iscritti, dateFrom, dateTo) {
        let total = 0;
        const detailedList = [];
        let startTs = dateFrom ? new Date(dateFrom).getTime() : 0;
        let endTs = dateTo ? (new Date(dateTo).getTime() + 86400000) : Infinity;

        const prices = {
            viandante: 14.99,
            docente_didattico: 24.99,
            docente_ecosistema: 34.99
        };

        iscritti.forEach(user => {
            const t = user.dataValue || 0;
            if (startTs && t < startTs) return;
            if (endTs && t > endTs) return;

            const p = String(user.abbonamento || user.subscription || user.piano || user.plan || 'base').toLowerCase();
            let amount = 0;
            if (p.includes('viandante')) amount = prices.viandante;
            else if (p.includes('didattic') || p === 'docente_didattico') amount = prices.docente_didattico;
            else if (p.includes('ecosistema') || p === 'docente_ecosistema') amount = prices.docente_ecosistema;

            if (amount > 0) {
                total += amount;
                detailedList.push({
                    nome: user.nome || 'Utente',
                    cognome: user.cognome || '',
                    email: user.email || 'N/D',
                    dataIscrizione: user.dataValue ? new Date(user.dataValue).toLocaleDateString('it-IT') : 'N/D',
                    piano: p,
                    importo: amount
                });
            }
        });

        return { total, detailedList, prices };
    },

    downloadEarningsCSV: function() {
        if (!this.iscrittiAggregati || this.iscrittiAggregati.length === 0) {
            alert("Nessun dato da esportare.");
            return;
        }

        const dateFrom = document.getElementById('analytics-date-from') ? document.getElementById('analytics-date-from').value : '';
        const dateTo = document.getElementById('analytics-date-to') ? document.getElementById('analytics-date-to').value : '';
        
        const data = this.calculateEarnings(this.iscrittiAggregati, dateFrom, dateTo);
        const expensesData = this.calculateExpenses(dateFrom, dateTo);
        const incassato = data.total || 0;
        const speseTot = expensesData.total || 0;
        const guadagnoNetto = incassato - speseTot;
        
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        
        // Intestazione aggregata
        csvContent += "REPORT ECONOMICO ECOSISTEMA PROF. MEMMO\n";
        csvContent += `Periodo:,${dateFrom || 'Inizio'} - ${dateTo || 'Oggi'}\n`;
        csvContent += `Totale Incassato (Entrate):,€ ${incassato.toFixed(2)}\n`;
        csvContent += `Totale Spese:,€ ${speseTot.toFixed(2)}\n`;
        csvContent += `Guadagno Effettivo (Incasso - Spese):,€ ${guadagnoNetto.toFixed(2)}\n`;
        csvContent += "\n";
        
        // Riepilogo per piano
        const countViandante = data.detailedList.filter(u => u.piano.includes('viandante')).length;
        const countDidattico = data.detailedList.filter(u => u.piano.includes('docente_didattico')).length;
        const countEcosistema = data.detailedList.filter(u => u.piano.includes('docente_ecosistema')).length;
        
        csvContent += "RIEPILOGO ENTRATE PER PIANO\n";
        csvContent += `Viandante (Totale):,${countViandante},Valore: € ${(countViandante * data.prices.viandante).toFixed(2)}\n`;
        csvContent += `Docente Didattico (Totale):,${countDidattico},Valore: € ${(countDidattico * data.prices.docente_didattico).toFixed(2)}\n`;
        csvContent += `Docente Ecosistema (Totale):,${countEcosistema},Valore: € ${(countEcosistema * data.prices.docente_ecosistema).toFixed(2)}\n`;
        csvContent += "\n\n";

        // Elenco Spese
        csvContent += "ELENCO SPESE NEL PERIODO\n";
        csvContent += "Data Inizio,Nome Spesa,Tipo,Note,Costo nel Periodo (€)\n";
        if (expensesData.items && expensesData.items.length > 0) {
            expensesData.items.forEach(exp => {
                const tipoStr = exp.tipo === 'mensile' ? `Fissa Mensile (${exp.monthsCalculated} mesi)` : 'Singola';
                csvContent += `"${exp.data || ''}","${exp.nome || ''}","${tipoStr}","${exp.note || ''}","${(exp.effectiveCost || 0).toFixed(2)}"\n`;
            });
        } else {
            csvContent += "Nessuna spesa registrata nel periodo selezionato.\n";
        }
        csvContent += "\n\n";
        
        // Dettaglio utenti
        csvContent += "ELENCO DETTAGLIATO ISCRITTI\n";
        csvContent += "Nome,Cognome,Email,Data Iscrizione,Piano,Importo (€)\n";
        
        data.detailedList.forEach(u => {
            csvContent += `"${u.nome}","${u.cognome}","${u.email}","${u.dataIscrizione}","${u.piano}","${u.importo.toFixed(2)}"\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `report_economico_${dateFrom || 'all'}_${dateTo || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    getTooltipWithPercentage: function() {
        return {
            callbacks: {
                label: function(context) {
                    const label = context.label || '';
                    const value = context.parsed || context.raw || 0;
                    let total = 0;
                    context.chart.data.datasets.forEach(dataset => {
                        dataset.data.forEach(dataVal => {
                            total += dataVal;
                        });
                    });
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                    return `${label}: ${value} (${percentage}%)`;
                }
            }
        };
    },

    renderRuoliChart: function(data) {
        const ctx = document.getElementById('chart-ruoli');
        if (!ctx) return;
        if (this.chartRuoli) this.chartRuoli.destroy();

        this.chartRuoli = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(data).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: ['#10b981', '#f59e0b', '#4f46e5', '#ec4899'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: this.getTooltipWithPercentage()
                }
            }
        });
    },

    renderPianiChart: function(data) {
        const ctx = document.getElementById('chart-piani');
        if (!ctx) return;
        if (this.chartPiani) this.chartPiani.destroy();

        this.chartPiani = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: ['#94a3b8', '#3b82f6', '#8b5cf6', '#ec4899'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: this.getTooltipWithPercentage()
                }
            }
        });
    },

    renderGiochiChart: function(data) {
        const ctx = document.getElementById('chart-giochi');
        if (!ctx) return;
        if (this.chartGiochi) this.chartGiochi.destroy();

        const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);
        const labels = sortedEntries.map(e => e[0]);
        const values = sortedEntries.map(e => e[1]);
        const colors = labels.map(g => (this.GAME_META[g] ? this.GAME_META[g].color : '#6366f1'));

        this.chartGiochi = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Utenti per Piattaforma',
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.parsed.y;
                                let total = 0;
                                context.chart.data.datasets[0].data.forEach(v => total += v);
                                const percentage = total > 0 ? Math.round((val / total) * 100) : 0;
                                return `Utenti: ${val} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    renderAndamentoChart: function(timelineByGame, timelineTotal) {
        const ctx = document.getElementById('chart-andamento');
        if (!ctx) return;
        if (this.chartAndamento) this.chartAndamento.destroy();

        // Raccoglie tutte le date presenti
        const allDatesSet = new Set();
        if (timelineTotal) Object.keys(timelineTotal).forEach(k => allDatesSet.add(k));
        if (timelineByGame) {
            Object.values(timelineByGame).forEach(tGame => {
                Object.keys(tGame).forEach(k => allDatesSet.add(k));
            });
        }

        const sortedDates = Array.from(allDatesSet).sort();
        if (sortedDates.length === 0) return;

        // Se l'utente ha selezionato un solo gioco specifico
        if (this.activeGameFilter && this.activeGameFilter !== 'all') {
            const g = this.activeGameFilter;
            const meta = this.GAME_META[g] || { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' };
            const dataVals = sortedDates.map(d => (timelineByGame && timelineByGame[g] && timelineByGame[g][d]) ? timelineByGame[g][d] : 0);

            this.chartAndamento = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [{
                        label: `${g} (Nuove Iscrizioni)`,
                        data: dataVals,
                        borderColor: meta.color,
                        backgroundColor: meta.bg,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.35
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } },
                        x: { grid: { display: false } }
                    },
                    plugins: {
                        legend: { position: 'top' }
                    }
                }
            });
            return;
        }

        // Vista multi-gioco con linee separate distinte (NON mescolate insieme)
        const datasets = [];
        const knownGames = ['Fantaletteratura', 'La Rotta degli Eroi', 'Palestra di Riflessione', 'La Corte della Commedia', 'Ops! Operazione Storia', 'Hub'];

        knownGames.forEach(gName => {
            const gTimeline = (timelineByGame && timelineByGame[gName]) || {};
            const dataVals = sortedDates.map(d => gTimeline[d] || 0);
            const totalForGame = dataVals.reduce((a, b) => a + b, 0);

            if (totalForGame > 0 || (timelineByGame && timelineByGame[gName])) {
                const meta = this.GAME_META[gName] || { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' };
                datasets.push({
                    label: gName,
                    data: dataVals,
                    borderColor: meta.color,
                    backgroundColor: meta.bg,
                    borderWidth: 2.5,
                    fill: false,
                    tension: 0.35
                });
            }
        });

        // Se non abbiamo dataset specifici, usa timelineTotal
        if (datasets.length === 0) {
            const dataVals = sortedDates.map(d => timelineTotal[d] || 0);
            datasets.push({
                label: 'Iscrizioni Totali',
                data: dataVals,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderWidth: 3,
                fill: true,
                tension: 0.35
            });
        }

        this.chartAndamento = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 14, font: { weight: 600 } }
                    }
                }
            }
        });
    },

    renderCanaliChart: function(data) {
        const ctx = document.getElementById('chart-canali');
        if (!ctx) return;
        if (this.chartCanali) this.chartCanali.destroy();

        const labels = Object.keys(data);
        const values = Object.values(data);

        // Se vuoto mostra placeholder
        if (labels.length === 0) {
            labels.push('Nessuna risposta');
            values.push(1);
        }

        this.chartCanali = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: ['#e11d48', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#64748b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: this.getTooltipWithPercentage()
                }
            }
        });
    },

    renderFasceEtaChart: function(data) {
        const ctx = document.getElementById('chart-fasce-eta');
        if (!ctx) return;
        if (this.chartFasceEta) this.chartFasceEta.destroy();

        const order = ['Under 14', '14-18 anni', '19-25 anni', '26-40 anni', '41-60 anni', 'Over 60'];
        const labels = [];
        const values = [];

        order.forEach(k => {
            labels.push(k);
            values.push(data[k] || 0);
        });

        // Aggiunge eventuali chiavi non standard
        Object.keys(data).forEach(k => {
            if (!order.includes(k)) {
                labels.push(k);
                values.push(data[k]);
            }
        });

        this.chartFasceEta = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Iscritti per Età',
                    data: values,
                    backgroundColor: '#6366f1',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    renderMaterieChart: function(data) {
        const ctx = document.getElementById('chart-materie');
        if (!ctx) return;
        if (this.chartMaterie) this.chartMaterie.destroy();

        const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);
        let labels = sortedEntries.map(e => e[0]);
        let values = sortedEntries.map(e => e[1]);

        if (labels.length === 0) {
            labels = ['In attesa di risposte'];
            values = [0];
        }

        this.chartMaterie = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Preferenze',
                    data: values,
                    backgroundColor: '#06b6d4',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y', // Barre orizzontali
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { beginAtZero: true, ticks: { precision: 0 } },
                    y: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    renderGeografiaChart: function(data) {
        const ctx = document.getElementById('chart-geografia');
        if (!ctx) return;
        if (this.chartGeografia) this.chartGeografia.destroy();

        const labels = ['Nord', 'Centro', 'Sud', 'Isole', 'Non specificato'];
        const values = labels.map(k => (data && data[k]) || 0);

        this.chartGeografia = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#3b82f6', // Nord: Blu
                        '#10b981', // Centro: Verde
                        '#f59e0b', // Sud: Arancione/Oro
                        '#8b5cf6', // Isole: Viola
                        '#cbd5e1'  // Non specificato: Grigio chiaro
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: this.getTooltipWithPercentage()
                }
            }
        });
    },

    // --- GESTIONE SPESE & GUADAGNO ---
    calculateExpenses: function(fromDate, toDate) {
        if (!this.expensesList || this.expensesList.length === 0) {
            return { total: 0, count: 0, items: [] };
        }

        let startTs = fromDate ? new Date(fromDate).getTime() : 0;
        let endTs = toDate ? (new Date(toDate).getTime() + 86400000) : (Date.now() + 86400000);

        let total = 0;
        let countedItems = [];

        this.expensesList.forEach(spesa => {
            const amount = parseFloat(spesa.importo) || 0;
            const spesaTs = spesa.data ? new Date(spesa.data).getTime() : 0;

            if (spesa.tipo === 'mensile') {
                const startDate = spesa.data ? new Date(spesa.data) : new Date(startTs || Date.now());
                const effectiveStart = startTs ? new Date(Math.max(startDate.getTime(), startTs)) : startDate;
                const effectiveEnd = new Date(endTs);

                if (effectiveStart <= effectiveEnd) {
                    let months = (effectiveEnd.getFullYear() - effectiveStart.getFullYear()) * 12 + (effectiveEnd.getMonth() - effectiveStart.getMonth()) + 1;
                    if (months > 0) {
                        const cost = months * amount;
                        total += cost;
                        countedItems.push({ ...spesa, monthsCalculated: months, effectiveCost: cost });
                    }
                }
            } else {
                if (spesaTs >= startTs && spesaTs <= endTs) {
                    total += amount;
                    countedItems.push({ ...spesa, monthsCalculated: 1, effectiveCost: amount });
                }
            }
        });

        return { total, count: countedItems.length, items: countedItems };
    },

    updateExpensesKPIs: function() {
        const dateFrom = document.getElementById('analytics-date-from') ? document.getElementById('analytics-date-from').value : '';
        const dateTo = document.getElementById('analytics-date-to') ? document.getElementById('analytics-date-to').value : '';

        const expensesData = this.calculateExpenses(dateFrom, dateTo);
        const earnings = this.calculateEarnings(this.iscrittiAggregati || [], dateFrom || null, dateTo || null);
        const incassato = earnings.total || 0;
        const spese = expensesData.total || 0;
        const guadagno = incassato - spese;

        const elSpese = document.getElementById('analytics-spese-display');
        if (elSpese) {
            elSpese.textContent = (spese > 0 ? '- ' : '') + spese.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        }

        const elGuadagno = document.getElementById('analytics-guadagno-display');
        if (elGuadagno) {
            elGuadagno.textContent = guadagno.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
            elGuadagno.style.color = (guadagno >= 0) ? '#059669' : '#dc2626';
        }

        const elCount = document.getElementById('analytics-spese-count');
        if (elCount) {
            elCount.textContent = this.expensesList.length;
        }
    },

    openAddExpenseModal: function() {
        const modal = document.getElementById('modal-add-expense');
        if (modal) {
            modal.style.display = 'flex';
            const dateInput = document.getElementById('expense-date');
            if (dateInput && !dateInput.value) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    },

    closeAddExpenseModal: function() {
        const modal = document.getElementById('modal-add-expense');
        if (modal) modal.style.display = 'none';
        const form = document.getElementById('form-new-expense');
        if (form) form.reset();
    },

    saveNewExpense: async function() {
        const name = document.getElementById('expense-name').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const date = document.getElementById('expense-date').value;
        const type = document.getElementById('expense-type').value;
        const notes = document.getElementById('expense-notes').value.trim();

        if (!name || isNaN(amount) || amount <= 0 || !date) {
            alert("Compila tutti i campi obbligatori correttamente.");
            return;
        }

        const newExpense = {
            id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            nome: name,
            importo: amount,
            data: date,
            tipo: type,
            note: notes,
            createdAt: new Date().toISOString()
        };

        const updatedList = [newExpense, ...this.expensesList];
        try {
            if (window.EcosystemService && typeof window.EcosystemService.saveExpenses === 'function') {
                await window.EcosystemService.saveExpenses(updatedList);
            }
            this.expensesList = updatedList;
            this.closeAddExpenseModal();
            this.updateExpensesKPIs();
            alert("✅ Spesa registrata con successo!");
        } catch (e) {
            console.error("Errore salvataggio spesa:", e);
            alert("Errore durante il salvataggio della spesa: " + e.message);
        }
    },

    openExpensesListModal: function() {
        const modal = document.getElementById('modal-expenses-list');
        if (modal) {
            modal.style.display = 'flex';
            this.renderExpensesTable();
        }
    },

    closeExpensesListModal: function() {
        const modal = document.getElementById('modal-expenses-list');
        if (modal) modal.style.display = 'none';
    },

    renderExpensesTable: function() {
        const tbody = document.getElementById('expenses-table-body');
        if (!tbody) return;

        if (!this.expensesList || this.expensesList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 25px; color: var(--text-muted);">Nessuna spesa registrata. Clicca su "+ Aggiungi Nuova" per iniziare.</td></tr>';
            return;
        }

        const escapeStr = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        let html = '';
        this.expensesList.forEach(exp => {
            const dataFormatted = exp.data ? new Date(exp.data).toLocaleDateString('it-IT') : '-';
            const badgeTipo = (exp.tipo === 'mensile') 
                ? '<span style="background: #e0e7ff; color: #4338ca; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">Fissa Mensile</span>'
                : '<span style="background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">Singola</span>';

            html += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 14px; font-weight: 500;">${dataFormatted}</td>
                  <td style="padding: 12px 14px;">
                    <div style="font-weight: 600; color: var(--text-main);">${escapeStr(exp.nome)}</div>
                    ${exp.note ? `<div style="font-size: 0.78rem; color: var(--text-muted);">${escapeStr(exp.note)}</div>` : ''}
                  </td>
                  <td style="padding: 12px 14px;">${badgeTipo}</td>
                  <td style="padding: 12px 14px; text-align: right; font-weight: 700; color: #d97706;">${(parseFloat(exp.importo) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                  <td style="padding: 12px 14px; text-align: center;">
                    <button class="btn btn-sm" style="background: #fee2e2; color: #dc2626; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer;" onclick="AnalyticsUI.deleteExpense('${exp.id}')" title="Elimina spesa">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    deleteExpense: async function(id) {
        if (!confirm("Sei sicuro di voler eliminare questa spesa?")) return;

        const updatedList = this.expensesList.filter(e => e.id !== id);
        try {
            if (window.EcosystemService && typeof window.EcosystemService.saveExpenses === 'function') {
                await window.EcosystemService.saveExpenses(updatedList);
            }
            this.expensesList = updatedList;
            this.renderExpensesTable();
            this.updateExpensesKPIs();
        } catch (e) {
            console.error("Errore cancellazione spesa:", e);
            alert("Errore durante l'eliminazione: " + e.message);
        }
    }
};

window.AnalyticsUI = AnalyticsUI;

