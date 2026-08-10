// --- Analytics UI Service ---
// Gestisce i grafici della dashboard Analytics utilizzando Chart.js

const AnalyticsUI = {
    chartRuoli: null,
    chartPiani: null,
    chartGiochi: null,

    render: function(iscrittiAggregati) {
        if (!iscrittiAggregati || iscrittiAggregati.length === 0) {
            console.log("Nessun dato iscritto per gli analytics.");
            return;
        }

        // Elaborazione dati
        const stats = this.processData(iscrittiAggregati);

        // Rendering grafici
        this.renderRuoliChart(stats.ruoli);
        this.renderPianiChart(stats.piani);
        this.renderGiochiChart(stats.giochi);
    },

    processData: function(iscritti) {
        const stats = {
            ruoli: {},
            piani: {},
            giochi: {}
        };

        iscritti.forEach(user => {
            // Conta Ruoli
            const ruolo = user.ruolo || 'sconosciuto';
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
        });

        return stats;
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
                    backgroundColor: [
                        '#4f46e5', // Indigo
                        '#10b981', // Emerald
                        '#f59e0b', // Amber
                        '#6366f1',
                        '#ec4899',
                        '#8b5cf6'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
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
                    backgroundColor: [
                        '#94a3b8', // Slate (Base)
                        '#3b82f6', // Blue (Pro)
                        '#8b5cf6', // Violet
                        '#ec4899', // Pink
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    },

    renderGiochiChart: function(data) {
        const ctx = document.getElementById('chart-giochi');
        if (!ctx) return;

        if (this.chartGiochi) this.chartGiochi.destroy();

        // Sort data by descending order
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
                    backgroundColor: '#4f46e5',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
};

window.AnalyticsUI = AnalyticsUI;
