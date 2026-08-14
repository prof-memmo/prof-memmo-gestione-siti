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

    expensesList: [],
    expensesListenerAttached: false,

    render: function(iscrittiAggregati) {
        if (!iscrittiAggregati || iscrittiAggregati.length === 0) {
            console.log("Nessun dato iscritto per gli analytics.");
            return;
        }
        
        this.iscrittiAggregati = iscrittiAggregati; // Salva per l'esportazione CSV

        // Inizializza listener spese (se non ancora agganciato)
        this.initExpenses();

        // Imposta le date di default all'anno solare corrente (se non già impostate dall'utente)
        const elFrom = document.getElementById('analytics-date-from');
        const elTo = document.getElementById('analytics-date-to');
        if (elFrom && !elFrom.value) {
            const currentYear = new Date().getFullYear();
            elFrom.value = `${currentYear}-01-01`;
        }
        if (elTo && !elTo.value) {
            const currentYear = new Date().getFullYear();
            elTo.value = `${currentYear}-12-31`;
        }

        // 1. Elaborazione dati
        const stats = this.processData(iscrittiAggregati);

        // 2. Aggiornamento KPI numerici
        this.updateKPIs(stats, iscrittiAggregati.length);

        // 3. Rendering grafici
        this.renderRuoliChart(stats.ruoli);
        this.renderPianiChart(stats.piani);
        this.renderGiochiChart(stats.giochi);
        this.renderAndamentoChart(stats.timeline);
        this.renderCanaliChart(stats.canali);
        this.renderFasceEtaChart(stats.fasceEta);
        this.renderMaterieChart(stats.materie);
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
        this.renderAndamentoChart(stats.timeline);
        this.renderCanaliChart(stats.canali);
        this.renderFasceEtaChart(stats.fasceEta);
        this.renderMaterieChart(stats.materie);
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
            timeline: {},
            canali: {},
            fasceEta: {},
            materie: {},
            topGiocoName: 'N/A'
        };

        iscritti.forEach(user => {
            // Normalizzazione Ruolo Unificato
            const rRaw = (user.ruolo || user.role || '').toLowerCase().trim();
            let ruoloUnificato = 'viandante';
            if (rRaw.includes('student') || rRaw === 'studente') {
                ruoloUnificato = 'studente';
            } else if (rRaw.includes('teacher') || rRaw.includes('docente') || rRaw === 'prof') {
                ruoloUnificato = 'docente';
            } else if (rRaw.includes('admin') || (user.email && user.email.toLowerCase() === 'prof.memmo@gmail.com')) {
                ruoloUnificato = 'admin';
            } else {
                ruoloUnificato = 'viandante';
            }
            stats.ruoli[ruoloUnificato] = (stats.ruoli[ruoloUnificato] || 0) + 1;

            // Normalizzazione e Conteggio Piani
            const pRaw = (user.abbonamento || user.subscription || user.piano || user.plan || 'base').toLowerCase().trim();
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

            // Conta Giochi
            const gioco = user.gioco || 'Sconosciuto';
            stats.giochi[gioco] = (stats.giochi[gioco] || 0) + 1;

            // Elabora andamento temporale (mese-anno)
            if (user.dataValue && user.dataValue > 0) {
                const d = new Date(user.dataValue);
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const key = `${d.getFullYear()}-${month}`;
                stats.timeline[key] = (stats.timeline[key] || 0) + 1;
            }

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

        const elBase = document.getElementById('kpi-piano-base');
        const elBasePct = document.getElementById('kpi-piano-base-pct');
        if (elBase) elBase.textContent = pc.base;
        if (elBasePct) elBasePct.textContent = `${calcPct(pc.base)}% del totale`;

        const elVian = document.getElementById('kpi-piano-viandante');
        const elVianPct = document.getElementById('kpi-piano-viandante-pct');
        if (elVian) elVian.textContent = pc.viandante;
        if (elVianPct) elVianPct.textContent = `${calcPct(pc.viandante)}% del totale`;

        const elDid = document.getElementById('kpi-piano-docente-didattico');
        const elDidPct = document.getElementById('kpi-piano-docente-didattico-pct');
        if (elDid) elDid.textContent = pc.docente_didattico;
        if (elDidPct) elDidPct.textContent = `${calcPct(pc.docente_didattico)}% del totale`;

        const elEco = document.getElementById('kpi-piano-docente-ecosistema');
        const elEcoPct = document.getElementById('kpi-piano-docente-ecosistema-pct');
        if (elEco) elEco.textContent = pc.docente_ecosistema;
        if (elEcoPct) elEcoPct.textContent = `${calcPct(pc.docente_ecosistema)}% del totale`;

        const elAbbTot = document.getElementById('kpi-abbonati-totali');
        const elAbbTotPct = document.getElementById('kpi-abbonati-totali-pct');
        if (elAbbTot) elAbbTot.textContent = pc.totaleAbbonati;
        if (elAbbTotPct) elAbbTotPct.textContent = `${calcPct(pc.totaleAbbonati)}% a pagamento`;

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

    getPrices: function() {
        let prices = { viandante: 9.99, docente_didattico: 19.99, docente_ecosistema: 24.99 };
        if (window.EcosistemaUI && window.EcosistemaUI.settingsData && window.EcosistemaUI.settingsData.monetizzazione_config) {
            const c = window.EcosistemaUI.settingsData.monetizzazione_config;
            prices.viandante = parseFloat(c.price_viandante) || prices.viandante;
            prices.docente_didattico = parseFloat(c.price_docente_didattico) || prices.docente_didattico;
            prices.docente_ecosistema = parseFloat(c.price_docente_ecosistema) || prices.docente_ecosistema;
        }
        return prices;
    },

    calculateEarnings: function(users, fromDate, toDate) {
        const prices = this.getPrices();
        let total = 0;
        let detailedList = [];
        
        let startTimestamp = fromDate ? new Date(fromDate).getTime() : 0;
        let endTimestamp = toDate ? new Date(toDate).getTime() : Date.now();
        // Sposta endTimestamp alla fine del giorno selezionato (23:59:59)
        if (toDate) endTimestamp += 86400000;

        users.forEach(user => {
            if (user.dataValue && user.dataValue >= startTimestamp && user.dataValue <= endTimestamp) {
                let piano = user.abbonamento ? user.abbonamento.toLowerCase() : (user.piano ? user.piano.toLowerCase() : 'base');
                let userPrice = 0;
                
                if (piano.includes('viandante')) userPrice = prices.viandante;
                else if (piano.includes('docente_didattico')) userPrice = prices.docente_didattico;
                else if (piano.includes('docente_ecosistema')) userPrice = prices.docente_ecosistema;
                
                if (userPrice > 0) {
                    total += userPrice;
                    detailedList.push({
                        nome: user.nome || 'N/A',
                        cognome: user.cognome || '',
                        email: user.email || 'N/A',
                        dataIscrizione: new Date(user.dataValue).toLocaleDateString('it-IT'),
                        piano: piano,
                        importo: userPrice
                    });
                }
            }
        });
        
        return { total, detailedList, prices };
    },

    downloadEarningsCSV: function() {
        if (!this.iscrittiAggregati) {
            alert("Dati non ancora caricati.");
            return;
        }

        const dateFrom = document.getElementById('analytics-date-from').value;
        const dateTo = document.getElementById('analytics-date-to').value;
        
        const data = this.calculateEarnings(this.iscrittiAggregati, dateFrom, dateTo);
        const expensesData = this.calculateExpenses(dateFrom, dateTo);
        const incassato = data.total || 0;
        const speseTot = expensesData.total || 0;
        const guadagnoNetto = incassato - speseTot;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        
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

        this.chartGiochi = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Utenti per Piattaforma',
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
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.parsed.y;
                                // Calcola totale percentuale su tutti i giochi (può superare gli iscritti se un utente è in 2 giochi,
                                // ma questa è la percentuale "di utilizzo").
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

    renderAndamentoChart: function(data) {
        const ctx = document.getElementById('chart-andamento');
        if (!ctx) return;
        if (this.chartAndamento) this.chartAndamento.destroy();

        // Sort keys (dates YYYY-MM)
        const sortedKeys = Object.keys(data).sort();
        
        // Se non ci sono date valide o ce n'è solo una, possiamo aggiungere una riga fittizia prima per fare linea
        if (sortedKeys.length === 0) {
            // Nessun dato temporale
            return;
        }

        const labels = [];
        const values = [];
        
        // Accumuliamo le iscrizioni per fare un grafico cumulativo? 
        // O grafico delle nuove iscrizioni per mese? Facciamo le nuove iscrizioni per semplicità.
        sortedKeys.forEach(k => {
            labels.push(k);
            values.push(data[k]);
        });

        this.chartAndamento = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Nuove Iscrizioni',
                    data: values,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4 // Curva morbida
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

