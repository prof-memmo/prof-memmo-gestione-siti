// --- Analytics UI Service ---
// Gestisce i grafici e i KPI della dashboard Analytics utilizzando Chart.js

const AnalyticsUI = {
    chartRuoli: null,
    chartPiani: null,
    chartGiochi: null,
    chartAndamento: null,

    render: function(iscrittiAggregati) {
        if (!iscrittiAggregati || iscrittiAggregati.length === 0) {
            console.log("Nessun dato iscritto per gli analytics.");
            return;
        }
        
        this.iscrittiAggregati = iscrittiAggregati; // Salva per l'esportazione CSV

        // 1. Elaborazione dati
        const stats = this.processData(iscrittiAggregati);

        // 2. Aggiornamento KPI numerici
        this.updateKPIs(stats, iscrittiAggregati.length);

        // 3. Rendering grafici
        this.renderRuoliChart(stats.ruoli);
        this.renderPianiChart(stats.piani);
        this.renderGiochiChart(stats.giochi);
        this.renderAndamentoChart(stats.timeline);
    },

    processData: function(iscritti) {
        const stats = {
            ruoli: {},
            piani: {},
            giochi: {},
            timeline: {}, // Per andamento nel tempo (es. "2026-08")
            topGiocoName: 'N/A'
        };

        iscritti.forEach(user => {
            // Conta Ruoli
            const ruolo = user.ruolo ? user.ruolo.toLowerCase() : 'sconosciuto';
            stats.ruoli[ruolo] = (stats.ruoli[ruolo] || 0) + 1;

            // Conta Piani (Versione Base vs Viandante vs Docente, ecc.)
            let piano = 'Base/Gratuito';
            if (user.abbonamento && user.abbonamento.toLowerCase() !== 'base') {
                piano = user.abbonamento;
            } else if (user.piano) {
                piano = user.piano;
            }
            stats.piani[piano] = (stats.piani[piano] || 0) + 1;

            // Conta Giochi
            const gioco = user.gioco || 'Sconosciuto';
            stats.giochi[gioco] = (stats.giochi[gioco] || 0) + 1;

            // Elabora andamento temporale (mese-anno)
            if (user.dataValue && user.dataValue > 0) {
                const d = new Date(user.dataValue);
                // Formato YYYY-MM per raggruppamento (es. 2026-08)
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const key = `${d.getFullYear()}-${month}`;
                stats.timeline[key] = (stats.timeline[key] || 0) + 1;
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

        // Guadagni Totali
        const earnings = this.calculateEarnings(this.iscrittiAggregati, null, null);
        const elGuadagni = document.getElementById('kpi-guadagni');
        if (elGuadagni) {
            elGuadagni.textContent = "€ " + earnings.total.toFixed(2);
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
        
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Intestazione aggregata
        csvContent += "REPORT GUADAGNI STIMATI\n";
        csvContent += `Periodo:,${dateFrom || 'Inizio'} - ${dateTo || 'Oggi'}\n`;
        csvContent += `Totale Incassato:,€ ${data.total.toFixed(2)}\n`;
        csvContent += "\n";
        
        // Riepilogo per piano
        const countViandante = data.detailedList.filter(u => u.piano.includes('viandante')).length;
        const countDidattico = data.detailedList.filter(u => u.piano.includes('docente_didattico')).length;
        const countEcosistema = data.detailedList.filter(u => u.piano.includes('docente_ecosistema')).length;
        
        csvContent += "RIEPILOGO PIANI\n";
        csvContent += `Viandante (Totale):,${countViandante},Valore: € ${(countViandante * data.prices.viandante).toFixed(2)}\n`;
        csvContent += `Docente Didattico (Totale):,${countDidattico},Valore: € ${(countDidattico * data.prices.docente_didattico).toFixed(2)}\n`;
        csvContent += `Docente Ecosistema (Totale):,${countEcosistema},Valore: € ${(countEcosistema * data.prices.docente_ecosistema).toFixed(2)}\n`;
        csvContent += "\n\n";
        
        // Dettaglio utenti
        csvContent += "ELENCO DETTAGLIATO UTENTI\n";
        csvContent += "Nome,Cognome,Email,Data Iscrizione,Piano,Importo (€)\n";
        
        data.detailedList.forEach(u => {
            csvContent += `"${u.nome}","${u.cognome}","${u.email}","${u.dataIscrizione}","${u.piano}","${u.importo.toFixed(2)}"\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `report_guadagni_${dateFrom || 'all'}_${dateTo || 'all'}.csv`);
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
    }
};

window.AnalyticsUI = AnalyticsUI;
