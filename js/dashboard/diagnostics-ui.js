// js/dashboard/diagnostics-ui.js
// Gestione UI della sezione CONTROLLO E DIAGNOSTICA + REGISTRO DINAMICO PROGETTI + VISUALIZZA COME
// Stile coerente con l'Hub, isolamento completo, nessuna modifica automatica a dati o database.

const DiagnosticsUI = {
    isRunning: false,
    activePreviewRole: null,
    currentProjects: [],

    init: async function() {
        await this.loadProjectsRegistry();
        this.renderInitialState();
        this.populatePreviewTargets();
    },

    // =========================================================================
    // REGISTRO DINAMICO DEI PROGETTI (UI & GESTIONE)
    // =========================================================================

    loadProjectsRegistry: async function() {
        if (!window.DiagnosticsService) return;
        try {
            this.currentProjects = await window.DiagnosticsService.getProjects();
            this.renderProjectsRegistryList();
        } catch (e) {
            console.error("Errore caricamento registro progetti:", e);
        }
    },

    renderProjectsRegistryList: function() {
        const container = document.getElementById('diag-projects-registry-list');
        if (!container) return;

        if (!this.currentProjects || this.currentProjects.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px;">Nessun progetto registrato.</div>';
            return;
        }

        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;">';

        for (const p of this.currentProjects) {
            const isDiagActive = p.diagnostics_active !== false;
            const isSiteActive = p.active !== false;
            const typeBadges = {
                'vetrina': '<span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">VETRINA</span>',
                'admin': '<span style="background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">ADMIN</span>',
                'gioco': '<span style="background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">GIOCO</span>',
                'servizio': '<span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">SERVIZIO</span>'
            };

            html += `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid ${p.icon || 'fa-globe'}" style="color: #6366f1; font-size: 1.1rem;"></i>
                                <strong style="font-size: 0.9rem; color: var(--text-main);">${p.name}</strong>
                            </div>
                            ${typeBadges[p.type] || typeBadges['servizio']}
                        </div>

                        <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 8px; word-break: break-all;">
                            <i class="fa-solid fa-link"></i> <a href="${p.url}" target="_blank" style="color: #6366f1; text-decoration: none;">${p.url}</a>
                        </div>

                        ${p.description ? `<div style="font-size: 0.8rem; color: #475569; margin-bottom: 8px; line-height: 1.35;">${p.description}</div>` : ''}

                        <div style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.73rem; color: #64748b; margin-bottom: 10px;">
                            <span><b>ID:</b> <code>${p.id}</code></span>
                            ${p.repo ? `<span>&bull; <b>Repo:</b> <code>${p.repo}</code></span>` : ''}
                            ${p.db_collection ? `<span>&bull; <b>DB:</b> <code>${p.db_collection}</code></span>` : ''}
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid #f1f5f9;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.78rem; font-weight: 600; color: ${isDiagActive ? '#15803d' : '#94a3b8'};">
                            <input type="checkbox" ${isDiagActive ? 'checked' : ''} onchange="DiagnosticsUI.toggleProjectDiagnostics('${p.id}', this.checked)" style="cursor: pointer;">
                            Diagnostica ${isDiagActive ? 'Attiva' : 'Disattivata'}
                        </label>

                        <div style="display: flex; gap: 6px;">
                            <button onclick="DiagnosticsUI.openEditProjectModal('${p.id}')" class="btn btn-sm" style="background: #f8fafc; border: 1px solid #cbd5e1; color: #334155; padding: 3px 8px; font-size: 0.75rem; border-radius: 6px; cursor: pointer;" title="Modifica Progetto">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            ${!window.DiagnosticsService.DEFAULT_PROJECTS.some(dp => dp.id === p.id) ? `
                                <button onclick="DiagnosticsUI.deleteProject('${p.id}')" class="btn btn-sm" style="background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 3px 8px; font-size: 0.75rem; border-radius: 6px; cursor: pointer;" title="Rimuovi dal Registro">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    },

    toggleProjectDiagnostics: async function(projectId, enabled) {
        try {
            await window.DiagnosticsService.toggleProjectDiagnostics(projectId, enabled);
            await this.loadProjectsRegistry();
        } catch (e) {
            console.error("Errore toggle diagnostica:", e);
            alert("Errore salvataggio: " + e.message);
        }
    },

    openAddProjectModal: function() {
        document.getElementById('form-project-id').value = '';
        document.getElementById('form-project-id').readOnly = false;
        document.getElementById('form-project-name').value = '';
        document.getElementById('form-project-url').value = '';
        document.getElementById('form-project-repo').value = '';
        document.getElementById('form-project-type').value = 'gioco';
        document.getElementById('form-project-collection').value = '';
        document.getElementById('form-project-icon').value = 'fa-globe';
        document.getElementById('form-project-desc').value = '';
        document.getElementById('form-project-active').checked = true;
        document.getElementById('form-project-diag-active').checked = true;

        document.getElementById('modal-project-title').innerHTML = '<i class="fa-solid fa-plus-circle" style="color: #6366f1;"></i> Aggiungi Nuovo Progetto al Registro';
        document.getElementById('modal-manage-project').style.display = 'flex';
    },

    openEditProjectModal: function(projectId) {
        const p = this.currentProjects.find(item => item.id === projectId);
        if (!p) return;

        document.getElementById('form-project-id').value = p.id;
        document.getElementById('form-project-id').readOnly = true;
        document.getElementById('form-project-name').value = p.name;
        document.getElementById('form-project-url').value = p.url;
        document.getElementById('form-project-repo').value = p.repo || '';
        document.getElementById('form-project-type').value = p.type || 'gioco';
        document.getElementById('form-project-collection').value = p.db_collection || '';
        document.getElementById('form-project-icon').value = p.icon || 'fa-globe';
        document.getElementById('form-project-desc').value = p.description || '';
        document.getElementById('form-project-active').checked = p.active !== false;
        document.getElementById('form-project-diag-active').checked = p.diagnostics_active !== false;

        document.getElementById('modal-project-title').innerHTML = `<i class="fa-solid fa-pen-to-square" style="color: #6366f1;"></i> Modifica: ${p.name}`;
        document.getElementById('modal-manage-project').style.display = 'flex';
    },

    closeProjectModal: function() {
        document.getElementById('modal-manage-project').style.display = 'none';
    },

    saveProjectFromModal: async function() {
        const id = document.getElementById('form-project-id').value.trim();
        const name = document.getElementById('form-project-name').value.trim();
        const url = document.getElementById('form-project-url').value.trim();
        const repo = document.getElementById('form-project-repo').value.trim();
        const type = document.getElementById('form-project-type').value;
        const db_collection = document.getElementById('form-project-collection').value.trim();
        const icon = document.getElementById('form-project-icon').value.trim();
        const description = document.getElementById('form-project-desc').value.trim();
        const active = document.getElementById('form-project-active').checked;
        const diagnostics_active = document.getElementById('form-project-diag-active').checked;

        if (!id || !name || !url) {
            alert("Compila i campi obbligatori: Identificativo ID, Nome e URL del progetto.");
            return;
        }

        try {
            await window.DiagnosticsService.saveProject({
                id,
                name,
                url,
                repo,
                type,
                db_collection,
                icon,
                description,
                active,
                diagnostics_active
            });

            this.closeProjectModal();
            await this.loadProjectsRegistry();
            this.populatePreviewTargets();
            alert(`✅ Progetto "${name}" registrato con successo nell'Ecosistema!`);
        } catch (e) {
            console.error("Errore salvataggio progetto:", e);
            alert("Errore salvataggio progetto: " + e.message);
        }
    },

    deleteProject: async function(projectId) {
        if (!confirm(`Sei sicuro di voler rimuovere il progetto "${projectId}" dal registro centrale?`)) return;
        try {
            await window.DiagnosticsService.deleteProject(projectId);
            await this.loadProjectsRegistry();
            this.populatePreviewTargets();
            alert("✅ Progetto rimosso dal registro con successo.");
        } catch (e) {
            console.error("Errore eliminazione progetto:", e);
            alert("Errore eliminazione: " + e.message);
        }
    },

    // Popola dinamicamente il menu a tendina "Destinazione" in Modalità Anteprima
    populatePreviewTargets: function() {
        const select = document.getElementById('preview-target-select');
        if (!select) return;

        let optionsHtml = '';
        for (const p of this.currentProjects) {
            if (p.active === false) continue;
            optionsHtml += `<option value="${p.id}">${p.name} (${p.type})</option>`;
        }
        // Aggiungi destinazioni secondarie note se non già presenti
        if (!this.currentProjects.some(p => p.id === 'profilo')) {
            optionsHtml += `<option value="profilo">👤 Profilo Utente / Area Riservata (profilo.html)</option>`;
        }
        if (!this.currentProjects.some(p => p.id === 'giochi_hub')) {
            optionsHtml += `<option value="giochi_hub">🎮 Catalogo Completo Giochi (giochi.html)</option>`;
        }

        select.innerHTML = optionsHtml;
    },

    // =========================================================================
    // CONTROLLO COMPLETO E RENDERING RISULTATI
    // =========================================================================

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
                    <p style="margin: 0 0 12px 0; font-size: 0.95rem; font-weight: 500;">Il sistema di diagnostica verificherà dinamicamente tutti i progetti registrati, database, auth e servizi collegati.</p>
                    <button onclick="DiagnosticsUI.runFullCheck()" class="btn" style="background: #6366f1; color: white; font-weight: 700; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(99,102,241,0.25);">
                        <i class="fa-solid fa-play"></i> Esegui Controllo Completo
                    </button>
                </div>
            `;
        }
    },

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
                    <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">Verifica dinamica di tutti i componenti registrati nell'ecosistema...</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Controllo raggiungibilità progetti, Firebase Auth, Firestore, Stripe e Brevo</div>
                </div>
            `;
        }

        try {
            const report = await window.DiagnosticsService.runFullCheck();
            this.renderReport(report);
            await this.loadProjectsRegistry();
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

    renderReport: function(report) {
        if (!report) return;

        const timestampEl = document.getElementById('diag-timestamp-text');
        const statusSummaryEl = document.getElementById('diag-status-summary');
        const gridEl = document.getElementById('diag-results-grid');
        const kpiOkEl = document.getElementById('diag-kpi-ok');
        const kpiWarnEl = document.getElementById('diag-kpi-warn');
        const kpiErrEl = document.getElementById('diag-kpi-err');

        if (timestampEl && report.timestamp) {
            timestampEl.innerHTML = `
                <strong>Data:</strong> ${report.timestamp.date} &nbsp;|&nbsp; <strong>Ora:</strong> ${report.timestamp.time}
            `;
        }

        if (kpiOkEl) kpiOkEl.textContent = report.summary.working;
        if (kpiWarnEl) kpiWarnEl.textContent = report.summary.warnings;
        if (kpiErrEl) kpiErrEl.textContent = report.summary.errors;

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

        if (gridEl && report.items) {
            let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';

            const sortedItems = [...report.items].sort((a, b) => {
                const weight = { 'error': 0, 'warning': 1, 'ok': 2 };
                return (weight[a.status] || 99) - (weight[b.status] || 99);
            });

            for (const item of sortedItems) {
                let badgeClass = 'diag-badge-ok';
                let borderStyle = 'border-left: 4px solid #10b981;';
                let cardBg = '#ffffff';

                if (item.status === 'warning') {
                    badgeClass = 'diag-badge-warn';
                    borderStyle = 'border-left: 4px solid #f59e0b;';
                    cardBg = '#fffbeb';
                } else if (item.status === 'error') {
                    badgeClass = 'diag-badge-err';
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
        this.populatePreviewTargets();
        const modal = document.getElementById('modal-preview-role');
        if (modal) modal.style.display = 'flex';
    },

    closePreviewModal: function() {
        const modal = document.getElementById('modal-preview-role');
        if (modal) modal.style.display = 'none';
    },

    launchRolePreview: function() {
        const roleSelect = document.getElementById('preview-role-select');
        const targetSelect = document.getElementById('preview-target-select');
        const selectedRole = roleSelect ? roleSelect.value : 'visitatore';
        const selectedTargetId = targetSelect ? targetSelect.value : 'hub_vetrina';

        const roleLabels = {
            'visitatore': 'Visitatore (Non Autenticato)',
            'viandante': 'Viandante (Utente Base)',
            'docente': 'Docente (Insegnante con Classi)',
            'studente': 'Studente (Associato a Classe)',
            'amministratore': 'Amministratore (Super Admin)'
        };

        // Trova l'URL corrispondente dal registro dinamico
        let baseUrl = 'https://prof-memmo.github.io/prof-memmo-gestione-siti/index.html';
        const found = this.currentProjects.find(p => p.id === selectedTargetId);
        if (found) {
            baseUrl = found.url;
        } else if (selectedTargetId === 'profilo') {
            baseUrl = 'https://prof-memmo.github.io/prof-memmo-gestione-siti/profilo.html';
        } else if (selectedTargetId === 'giochi_hub') {
            baseUrl = 'https://prof-memmo.github.io/prof-memmo-gestione-siti/giochi.html';
        }

        const previewParam = `previewRole=${encodeURIComponent(selectedRole)}&previewMode=true&timestamp=${Date.now()}`;
        const finalUrl = baseUrl.includes('?') ? `${baseUrl}&${previewParam}` : `${baseUrl}?${previewParam}`;

        sessionStorage.setItem('hub_active_preview_role', selectedRole);
        sessionStorage.setItem('hub_preview_active', 'true');

        this.closePreviewModal();
        this.showActivePreviewBanner(selectedRole, roleLabels[selectedRole] || selectedRole, finalUrl);
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
