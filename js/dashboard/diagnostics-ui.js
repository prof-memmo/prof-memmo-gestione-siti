// js/dashboard/diagnostics-ui.js
// Gestione UI della sezione CONTROLLO E DIAGNOSTICA + VISUALIZZA COME (Modalità Anteprima)
// Stile coerente con l'Hub, isolamento completo, nessuna modifica automatica a dati o database.

const DiagnosticsUI = {
    isRunning: false,
    activePreviewRole: null,

    init: function() {
        this.renderInitialState();
    },

    // Carica lo stato iniziale dal localStorage o mostra placeholder fino al primo test
    renderInitialState: function() {
        const lastReport = window.DiagnosticsService ? window.DiagnosticsService.getLastReport() : null;
        if (lastReport) {
            this.renderReport(lastReport);
        } else {
            this.renderEmptyState();
        }
    },

    renderEmptyState: function() {
        const timestampEl = document.getElementById('diag-timestamp-text');
        const statusSummaryEl = document.getElementById('diag-status-summary');
        const gridEl = document.getElementById('diag-results-grid');

        if (timestampEl) timestampEl.textContent = 'Nessun controllo recente eseguito';
        if (statusSummaryEl) {
            statusSummaryEl.className = 'diag-status-badge diag-status-neutral';
            statusSummaryEl.innerHTML = '<i class="fa-solid fa-circle-info"></i> In attesa del primo controllo';
        }
        if (gridEl) {
            gridEl.innerHTML = `
                <div style="text-align: center; padding: 30px 20px; color: var(--text-muted);">
                    <i class="fa-solid fa-shield-heart" style="font-size: 2.5rem; color: #94a3b8; margin-bottom: 12px; display: block;"></i>
                    <p style="margin: 0 0 12px 0; font-size: 0.95rem; font-weight: 500;">Il sistema di diagnostica verificherà l'integrità di tutti i 6 repository, database, auth e servizi collegati.</p>
                    <button onclick="DiagnosticsUI.runFullCheck()" class="btn" style="background: #6366f1; color: white; font-weight: 700; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(99,102,241,0.25);">
                        <i class="fa-solid fa-play"></i> Esegui Controllo Completo
                    </button>
                </div>
            `;
        }
    },

    // Esecuzione controllo completo asincrono
    runFullCheck: async function() {
        if (this.isRunning) return;
        this.isRunning = true;

        const btn = document.getElementById('btn-run-full-diagnostics');
        const gridEl = document.getElementById('diag-results-grid');
        const statusSummaryEl = document.getElementById('diag-status-summary');
        const timestampEl = document.getElementById('diag-timestamp-text');

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Controllo in corso...';
        }

        if (statusSummaryEl) {
            statusSummaryEl.className = 'diag-status-badge diag-status-running';
            statusSummaryEl.innerHTML = '<i class="fa-solid fa-satellite-dish fa-beat"></i> Scansione ecosistema in corso...';
        }

        if (gridEl) {
            gridEl.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: #6366f1; margin-bottom: 12px; display: block;"></i>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">Verifica in tempo reale di tutti i componenti dell'ecosistema...</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Controllo raggiungibilità 6 repository, Firebase Auth, Firestore, Stripe e Brevo</div>
                </div>
            `;
        }

        try {
            const report = await window.DiagnosticsService.runFullCheck();
            this.renderReport(report);
        } catch (e) {
            console.error('Errore durante la diagnostica:', e);
            alert('Errore durante l\'esecuzione del controllo: ' + e.message);
            this.renderEmptyState();
        } finally {
            this.isRunning = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Esegui Controllo Completo';
            }
        }
    },

    // Rendering del report diagnostico
    renderReport: function(report) {
        if (!report) return;

        const timestampEl = document.getElementById('diag-timestamp-text');
        const statusSummaryEl = document.getElementById('diag-status-summary');
        const gridEl = document.getElementById('diag-results-grid');
        const kpiOkEl = document.getElementById('diag-kpi-ok');
        const kpiWarnEl = document.getElementById('diag-kpi-warn');
        const kpiErrEl = document.getElementById('diag-kpi-err');

        // Aggiorna data e ora dinamiche
        if (timestampEl && report.timestamp) {
            timestampEl.innerHTML = `
                <strong>Data:</strong> ${report.timestamp.date} &nbsp;|&nbsp; <strong>Ora:</strong> ${report.timestamp.time}
            `;
        }

        // Aggiorna KPI
        if (kpiOkEl) kpiOkEl.textContent = report.summary.working;
        if (kpiWarnEl) kpiWarnEl.textContent = report.summary.warnings;
        if (kpiErrEl) kpiErrEl.textContent = report.summary.errors;

        // Aggiorna Badge Stato Complessivo
        if (statusSummaryEl) {
            if (report.overallStatus === 'ok') {
                statusSummaryEl.className = 'diag-status-badge diag-status-ok';
                statusSummaryEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> ✓ Sistema operativo';
            } else if (report.overallStatus === 'warning') {
                statusSummaryEl.className = 'diag-status-badge diag-status-warn';
                statusSummaryEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ⚠ ${report.summary.warnings} componente/i da verificare`;
            } else {
                statusSummaryEl.className = 'diag-status-badge diag-status-err';
                statusSummaryEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ✕ ${report.summary.errors} errore/i rilevato/i`;
            }
        }

        // Render Griglia Risultati
        if (gridEl && report.items) {
            let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';

            // Separa eventuali errori / warning in cima per massima visibilità
            const sortedItems = [...report.items].sort((a, b) => {
                const weight = { 'error': 0, 'warning': 1, 'ok': 2 };
                return (weight[a.status] || 99) - (weight[b.status] || 99);
            });

            for (const item of sortedItems) {
                let badgeClass = 'diag-badge-ok';
                let badgeIcon = '✓';
                let borderStyle = 'border-left: 4px solid #10b981;';
                let cardBg = '#ffffff';

                if (item.status === 'warning') {
                    badgeClass = 'diag-badge-warn';
                    badgeIcon = '⚠';
                    borderStyle = 'border-left: 4px solid #f59e0b;';
                    cardBg = '#fffbeb';
                } else if (item.status === 'error') {
                    badgeClass = 'diag-badge-err';
                    badgeIcon = '✕';
                    borderStyle = 'border-left: 4px solid #ef4444;';
                    cardBg = '#fef2f2';
                }

                html += `
                    <div class="diag-item-card" style="${borderStyle} background: ${cardBg}; padding: 14px 18px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.03); border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 6px;">
                            <div>
                                <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: var(--text-muted); margin-bottom: 2px;">
                                    ${item.category}
                                </div>
                                <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">
                                    ${item.name}
                                </div>
                            </div>
                            <div class="diag-status-pill ${badgeClass}">
                                ${item.badge}
                            </div>
                        </div>

                        <div style="font-size: 0.85rem; color: #475569; margin-top: 6px; line-height: 1.45;">
                            ${item.details}
                        </div>

                        ${item.actionNeeded ? `
                            <div style="margin-top: 10px; padding: 10px 14px; background: rgba(255,255,255,0.85); border: 1px dashed ${item.status === 'error' ? '#fca5a5' : '#fcd34d'}; border-radius: 8px;">
                                <div style="font-size: 0.78rem; font-weight: 800; color: ${item.status === 'error' ? '#b91c1c' : '#b45309'}; text-transform: uppercase; margin-bottom: 3px;">
                                    <i class="fa-solid fa-hand-point-right"></i> Azione suggerita per l'amministratore:
                                </div>
                                <div style="font-size: 0.83rem; color: #334155; font-weight: 500;">
                                    ${item.actionNeeded}
                                </div>
                            </div>
                        ` : ''}

                        <div style="margin-top: 8px; font-size: 0.72rem; color: #94a3b8; display: flex; justify-content: flex-end;">
                            Rilevato: ${item.timestamp}
                        </div>
                    </div>
                `;
            }

            html += '</div>';
            gridEl.innerHTML = html;
        }
    },

    // =========================================================================
    // MODALITÀ ANTEPRIMA ("VISUALIZZA COME")
    // =========================================================================

    openPreviewModal: function() {
        const modal = document.getElementById('modal-preview-role');
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    closePreviewModal: function() {
        const modal = document.getElementById('modal-preview-role');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Avvia la simulazione anteprima senza alterare ruoli o permessi nel DB
    launchRolePreview: function() {
        const roleSelect = document.getElementById('preview-role-select');
        const targetSelect = document.getElementById('preview-target-select');
        const selectedRole = roleSelect ? roleSelect.value : 'visitatore';
        const selectedTarget = targetSelect ? targetSelect.value : 'vetrina';

        const roleLabels = {
            'visitatore': 'Visitatore (Non Autenticato)',
            'viandante': 'Viandante (Utente Base)',
            'docente': 'Docente (Insegnante con Classi)',
            'studente': 'Studente (Associato a Classe)',
            'amministratore': 'Amministratore (Super Admin)'
        };

        const targetUrls = {
            'vetrina': 'https://prof-memmo.github.io/prof-memmo-gestione-siti/index.html',
            'profilo': 'https://prof-memmo.github.io/prof-memmo-gestione-siti/profilo.html',
            'giochi_hub': 'https://prof-memmo.github.io/prof-memmo-gestione-siti/giochi.html',
            'rotta_eroi': 'https://prof-memmo.github.io/la-rotta-degli-eroi/index.html',
            'corte_commedia': 'https://prof-memmo.github.io/la-corte-della-commedia/index.html',
            'fantaletteratura': 'https://prof-memmo.github.io/fantaletteratura/index.html',
            'palestra_riflessione': 'https://prof-memmo.github.io/palestra-di-riflessione/index.html',
            'ops_storia': 'https://prof-memmo.github.io/ops-storia/index.html'
        };

        let baseUrl = targetUrls[selectedTarget] || targetUrls['vetrina'];
        const previewParam = `previewRole=${encodeURIComponent(selectedRole)}&previewMode=true&timestamp=${Date.now()}`;
        const finalUrl = baseUrl.includes('?') ? `${baseUrl}&${previewParam}` : `${baseUrl}?${previewParam}`;

        // Salva stato anteprima non invasivo in sessionStorage
        sessionStorage.setItem('hub_active_preview_role', selectedRole);
        sessionStorage.setItem('hub_preview_active', 'true');

        this.closePreviewModal();

        // Mostra banner anteprima in cima all'Hub Admin
        this.showActivePreviewBanner(selectedRole, roleLabels[selectedRole] || selectedRole, finalUrl);

        // Apri l'anteprima in una nuova scheda sicura
        window.open(finalUrl, '_blank');
    },

    showActivePreviewBanner: function(roleKey, roleLabel, targetUrl) {
        let banner = document.getElementById('hub-global-preview-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'hub-global-preview-banner';
            banner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 99999;
                background: linear-gradient(135deg, #1e1b4b, #312e81);
                color: #ffffff;
                padding: 10px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                font-family: 'Inter', sans-serif;
                font-size: 0.88rem;
                animation: slideDown 0.3s ease-out;
            `;
            document.body.appendChild(banner);
        }

        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="background: #fbbf24; color: #78350f; font-weight: 800; font-size: 0.72rem; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">
                    <i class="fa-solid fa-eye"></i> Modalità Anteprima Attiva
                </span>
                <span>Stai visualizzando l'esperienza come: <strong style="color: #67e8f9;">${roleLabel}</strong> (Simulazione sola lettura — Nessun dato reale o permesso viene modificato).</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button onclick="window.open('${targetUrl}', '_blank')" class="btn" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); font-size: 0.8rem; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Riapri Scheda
                </button>
                <button onclick="DiagnosticsUI.exitPreviewMode()" class="btn" style="background: #ef4444; color: white; border: none; font-size: 0.8rem; font-weight: 700; padding: 6px 14px; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(239,68,68,0.4);">
                    <i class="fa-solid fa-right-from-bracket"></i> Esci dall'Anteprima
                </button>
            </div>
        `;
        banner.style.display = 'flex';
    },

    exitPreviewMode: function() {
        sessionStorage.removeItem('hub_active_preview_role');
        sessionStorage.removeItem('hub_preview_active');
        const banner = document.getElementById('hub-global-preview-banner');
        if (banner) banner.style.display = 'none';
        alert('✅ Uscita dalla modalità anteprima completata. Sei tornato alla visualizzazione Amministratore standard.');
    }
};

window.DiagnosticsUI = DiagnosticsUI;
