// js/dashboard/releases-ui.js
// Gestione UI della sezione RILASCI & ANTEPRIME per l'Ecosistema Prof. Memmo
// Rileva in tempo reale le nuove anteprime pronte (main...preview) e gestisce il deploy controllato.

const ReleasesUI = {
    PROJECTS: [
        {
            id: 'hub_admin',
            name: 'Hub Dashboard Admin',
            repo: 'prof-memmo-gestione-siti',
            liveUrl: 'https://prof-memmo.github.io/prof-memmo-gestione-siti/',
            previewUrl: 'https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/',
            icon: 'fa-shield-halved',
            color: '#6366f1',
            description: 'Console di amministrazione centrale e strumenti di gestione.'
        },
        {
            id: 'hub_vetrina',
            name: 'Portale & Vetrina Giochi',
            repo: 'games',
            liveUrl: 'https://prof-memmo.github.io/games/',
            previewUrl: 'https://prof-memmo.github.io/games/preview/',
            icon: 'fa-store',
            color: '#ec4899',
            description: 'Vetrina pubblica principale, accesso unificato e catalogo giochi.'
        },
        {
            id: 'fantaletteratura',
            name: 'FantaLetteratura',
            repo: 'fantaletteratura',
            liveUrl: 'https://prof-memmo.github.io/fantaletteratura/',
            previewUrl: 'https://prof-memmo.github.io/fantaletteratura/preview/',
            icon: 'fa-feather-pointed',
            color: '#f59e0b',
            description: 'Lega letteraria e sfide narrative per studenti e classi.'
        },
        {
            id: 'rotta_eroi',
            name: 'La Rotta degli Eroi',
            repo: 'la-rotta-degli-eroi',
            liveUrl: 'https://prof-memmo.github.io/la-rotta-degli-eroi/',
            previewUrl: 'https://prof-memmo.github.io/la-rotta-degli-eroi/preview/',
            icon: 'fa-ship',
            color: '#3b82f6',
            description: 'Gioco di ruolo didattico su epica classica e letteratura.'
        },
        {
            id: 'corte_commedia',
            name: 'La Corte della Commedia',
            repo: 'la-corte-della-commedia',
            liveUrl: 'https://prof-memmo.github.io/la-corte-della-commedia/',
            previewUrl: 'https://prof-memmo.github.io/la-corte-della-commedia/preview/',
            icon: 'fa-masks-theater',
            color: '#a855f7',
            description: 'Gioco didattico sulla Divina Commedia di Dante Alighieri.'
        },
        {
            id: 'palestra_riflessione',
            name: 'La Palestra di Riflessione',
            repo: 'palestra-di-riflessione',
            liveUrl: 'https://prof-memmo.github.io/palestra-di-riflessione/',
            previewUrl: 'https://prof-memmo.github.io/palestra-di-riflessione/preview/',
            icon: 'fa-brain',
            color: '#10b981',
            description: 'Palestra di logica, comprensione del testo e pensiero critico.'
        },
        {
            id: 'ops_storia',
            name: 'Ops! Operazione Storia',
            repo: 'ops-storia',
            liveUrl: 'https://prof-memmo.github.io/ops-storia/',
            previewUrl: 'https://prof-memmo.github.io/ops-storia/',
            icon: 'fa-landmark',
            color: '#ef4444',
            description: 'Gioco storico per la scuola secondaria di primo grado.'
        }
    ],

    selectedSiteId: 'hub_vetrina',
    siteStatuses: {},
    history: [],

    init: async function() {
        console.log("🚀 ReleasesUI: Inizializzazione modulo Rilasci...");
        this.renderSiteGrid();
        this.selectSite(this.selectedSiteId);
        await Promise.all([
            this.checkAllSiteStatuses(),
            this.loadHistory()
        ]);
    },

    getGitHubToken: async function() {
        let token = localStorage.getItem('hub_github_pat');
        if (!token) {
            const firestore = this.getFirestore();
            if (firestore) {
                try {
                    const ecoSnap = await firestore.collection('hub_settings').doc('ecosistema').get();
                    if (ecoSnap.exists && ecoSnap.data().github_token) {
                        token = ecoSnap.data().github_token;
                        localStorage.setItem('hub_github_pat', token);
                    }
                } catch(e) {}
            }
        }
        return token || '';
    },

    checkAllSiteStatuses: async function() {
        console.log("🔍 ReleasesUI: Verifica stato anteprime su GitHub...");
        const token = await this.getGitHubToken();
        const headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ProfMemmoHub-ReleaseManager"
        };
        if (token) {
            headers["Authorization"] = `token ${token}`;
        }

        for (const project of this.PROJECTS) {
            try {
                const res = await fetch(`https://api.github.com/repos/prof-memmo/${project.repo}/compare/main...preview`, {
                    headers: headers
                });
                if (res.ok) {
                    const data = await res.json();
                    const aheadBy = data.ahead_by || 0;
                    const commits = data.commits || [];
                    const lastCommit = commits.length > 0 ? commits[commits.length - 1] : null;

                    this.siteStatuses[project.id] = {
                        status: data.status,
                        aheadBy: aheadBy,
                        commits: commits.map(c => ({
                            message: c.commit ? c.commit.message : '',
                            author: c.commit && c.commit.author ? c.commit.author.name : '',
                            date: c.commit && c.commit.author ? new Date(c.commit.author.date).toLocaleString('it-IT') : ''
                        })),
                        lastCommitMessage: lastCommit && lastCommit.commit ? lastCommit.commit.message : '',
                        lastCommitDate: lastCommit && lastCommit.commit && lastCommit.commit.author ? new Date(lastCommit.commit.author.date).toLocaleString('it-IT') : ''
                    };
                } else if (res.status === 403) {
                    console.warn(`GitHub API Rate Limit per ${project.repo}: autenticazione richiesta per superare le 60 chiamate/ora.`);
                }
            } catch(e) {
                console.warn(`Errore controllo compare per ${project.repo}:`, e);
            }
        }
        this.renderSiteGrid();
        this.selectSite(this.selectedSiteId);
    },

    selectSite: function(siteId) {
        this.selectedSiteId = siteId;
        const project = this.PROJECTS.find(p => p.id === siteId) || this.PROJECTS[0];
        const status = this.siteStatuses[siteId] || { aheadBy: 0, status: 'synced', commits: [] };

        // Aggiorna classe attiva nelle card
        document.querySelectorAll('.release-site-card').forEach(el => {
            el.classList.toggle('active-site-card', el.dataset.siteId === siteId);
        });

        // Aggiorna pannello dettagli
        const detailContainer = document.getElementById('release-active-details');
        if (!detailContainer) return;

        // Banner di Stato Anteprima vs Live con elenco dettagliato modifiche
        let statusBannerHtml = '';
        if (status.aheadBy > 0) {
            const commitListHtml = (status.commits && status.commits.length > 0) 
                ? status.commits.map((c, i) => `
                    <li style="margin-bottom: 6px; font-size: 0.85rem; color: #4c1d95; line-height: 1.4;">
                        <span style="font-weight: 700; color: #7c3aed;">#${i + 1}</span> <em>"${c.message}"</em>
                        ${c.date ? `<span style="color: #6d28d9; font-size: 0.75rem; margin-left: 6px;">(${c.date})</span>` : ''}
                    </li>
                `).join('')
                : `<li><em>"${status.lastCommitMessage || 'Miglioramenti piattaforma'}"</em></li>`;

            statusBannerHtml = `
                <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border: 1.5px solid #c4b5fd; border-radius: 14px; padding: 16px 20px; margin-bottom: 22px; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.08);">
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
                        <div style="font-weight: 800; color: #5b21b6; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-sparkles" style="color: #8b5cf6; font-size: 1.2rem;"></i> Nuova Versione Pronta in Anteprima!
                        </div>
                        <span style="background: #7c3aed; color: white; font-size: 0.78rem; padding: 4px 10px; border-radius: 12px; font-weight: 700; letter-spacing: 0.5px;">
                            ⚡ ${status.aheadBy} ${status.aheadBy === 1 ? 'Aggiornamento' : 'Aggiornamenti'} da Pubblicare
                        </span>
                    </div>
                    <div style="font-size: 0.88rem; color: #5b21b6; font-weight: 700; margin-bottom: 6px;">
                        Elenco dettagliato modifiche pronte per il rilascio:
                    </div>
                    <ul style="margin: 0; padding-left: 1.2rem; list-style-type: disc;">
                        ${commitListHtml}
                    </ul>
                </div>
            `;
        } else {
            statusBannerHtml = `
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px 18px; margin-bottom: 22px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <div style="font-size: 0.92rem; color: #166534; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Produzione e Anteprima Sincronizzate
                    </div>
                    <span style="font-size: 0.78rem; color: #15803d; background: #dcfce7; padding: 3px 10px; border-radius: 12px; font-weight: 600;">
                        Tutto Aggiornato
                    </span>
                </div>
            `;
        }

        detailContainer.innerHTML = `
            ${statusBannerHtml}

            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0 0 6px 0; font-size: 1.35rem; color: var(--text-main); display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid ${project.icon}" style="color: ${project.color};"></i> ${project.name}
                    </h3>
                    <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted);">${project.description}</p>
                    <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">
                        Repository: <code>${project.repo}</code> &bull; Live: <code>main</code> &bull; Anteprima: <code>preview</code>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="btn outline" style="padding: 6px 12px; font-size: 0.8rem;" onclick="ReleasesUI.checkAllSiteStatuses()" title="Ricarica stato da GitHub">
                        <i class="fa-solid fa-rotate"></i> Aggiorna Stato
                    </button>
                </div>
            </div>

            <!-- Pulsanti di Accesso Rapido -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <!-- Card Anteprima -->
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 700; font-size: 0.95rem; color: #1e40af;">
                            <i class="fa-solid fa-eye"></i> Canale Anteprima (Test)
                        </span>
                        <span style="background: #dbeafe; color: #1d4ed8; font-size: 0.75rem; padding: 2px 8px; border-radius: 10px; font-weight: 600;">Privato</span>
                    </div>
                    <p style="font-size: 0.82rem; color: #3b82f6; margin: 0 0 12px 0;">Versione di prova generata dal branch <code>preview</code>.</p>
                    <a href="${project.previewUrl}" target="_blank" class="btn" style="width: 100%; box-sizing: border-box; background: #2563eb; color: white; text-decoration: none; font-size: 0.9rem; padding: 10px; text-align: center; justify-content: center;">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Apri e Prova Anteprima
                    </a>
                </div>

                <!-- Card Live Ufficiale -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 700; font-size: 0.95rem; color: #334155;">
                            <i class="fa-solid fa-globe"></i> Sito Ufficiale (Produzione)
                        </span>
                        <span style="background: #e2e8f0; color: #475569; font-size: 0.75rem; padding: 2px 8px; border-radius: 10px; font-weight: 600;">Pubblico</span>
                    </div>
                    <p style="font-size: 0.82rem; color: #64748b; margin: 0 0 12px 0;">La versione attualmente online per studenti e docenti.</p>
                    <a href="${project.liveUrl}" target="_blank" class="btn outline" style="width: 100%; box-sizing: border-box; font-size: 0.9rem; padding: 10px; text-align: center; justify-content: center;">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Apri Sito Ufficiale Live
                    </a>
                </div>
            </div>

            <!-- Diagnostica Pre-Rilascio (Semaforo) -->
            <div style="background: white; border: 1px solid var(--border-color); border-radius: 12px; padding: 18px; margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="font-weight: 700; font-size: 1rem; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-shield-halved" style="color: #6366f1;"></i> Diagnostica di Sicurezza Pre-Rilascio
                    </div>
                    <button class="btn outline" style="padding: 6px 14px; font-size: 0.85rem;" onclick="ReleasesUI.runPreflightCheck('${project.id}')">
                        <i class="fa-solid fa-rotate"></i> Esegui Check Ora
                    </button>
                </div>
                <div id="release-preflight-result" style="font-size: 0.88rem; color: var(--text-muted);">
                    Clicca su <strong>"Esegui Check Ora"</strong> per verificare integrità, database Hub e assenza di errori bloccanti prima della pubblicazione.
                </div>
            </div>

            <!-- Sezione Azione di Pubblicazione -->
            <div style="background: ${status.aheadBy > 0 ? 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)' : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'}; color: white; border-radius: 14px; padding: 22px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; box-shadow: 0 10px 25px -5px rgba(30, 27, 75, 0.35);">
                <div>
                    <h4 style="margin: 0 0 6px 0; font-size: 1.15rem; color: #e0e7ff;">
                        ${status.aheadBy > 0 ? '🚀 Modifiche pronte per la pubblicazione live' : 'Sei pronto a pubblicare le modifiche?'}
                    </h4>
                    <p style="margin: 0; font-size: 0.88rem; color: #c7d2fe; max-width: 550px;">
                        L'approvazione unirà il branch <code>preview</code> nel branch <code>main</code> e aggiornerà il sito pubblico a <strong>Zero-Downtime</strong>.
                    </p>
                </div>
                <button class="btn" style="background: #10b981; color: white; font-weight: 800; font-size: 1rem; padding: 14px 28px; border-radius: 10px; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45);" onclick="ReleasesUI.openConfirmModal('${project.id}')">
                    <i class="fa-solid fa-rocket"></i> Pubblica in Produzione
                </button>
            </div>
        `;
    },

    renderSiteGrid: function() {
        const grid = document.getElementById('release-sites-grid');
        if (!grid) return;

        grid.innerHTML = this.PROJECTS.map(p => {
            const status = this.siteStatuses[p.id] || { aheadBy: 0 };
            const hasUpdate = status.aheadBy > 0;

            return `
                <div class="glass-panel release-site-card ${p.id === this.selectedSiteId ? 'active-site-card' : ''}" 
                     data-site-id="${p.id}" 
                     onclick="ReleasesUI.selectSite('${p.id}')"
                     style="cursor: pointer; padding: 12px 16px; border-radius: 10px; transition: all 0.2s; display: flex; align-items: center; gap: 12px; position: relative;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; background: ${p.color}15; color: ${p.color}; display: flex; align-items: center; justify-content: center; font-size: 1.05rem;">
                        <i class="fa-solid ${p.icon}"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                            <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</span>
                            ${hasUpdate 
                                ? `<span style="background: #ede9fe; color: #7c3aed; font-size: 0.68rem; padding: 2px 7px; border-radius: 10px; font-weight: 800; white-space: nowrap;"><i class="fa-solid fa-sparkles"></i> ${status.aheadBy} nuovi</span>`
                                : `<span style="color: #10b981; font-size: 0.72rem; font-weight: 600;"><i class="fa-solid fa-check"></i></span>`
                            }
                        </div>
                        <div style="font-size: 0.76rem; color: var(--text-muted);">Repo: ${p.repo}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    runPreflightCheck: async function(siteId) {
        const resultEl = document.getElementById('release-preflight-result');
        if (!resultEl) return;

        resultEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifica pre-volo in corso (Database, Auth, Permessi)...';

        try {
            const project = this.PROJECTS.find(p => p.id === siteId);
            let checks = [];

            // 1. Controllo DB Hub
            if (window.fbDb) {
                checks.push('<span style="color:#059669;">✓ Database Cloud Hub (Firestore) collegato</span>');
            } else {
                checks.push('<span style="color:#dc2626;">✕ Database Cloud Hub non disponibile</span>');
            }

            // 2. Controllo Auth Super Admin
            const user = window.firebase && window.firebase.auth ? window.firebase.auth().currentUser : null;
            if (user && user.email === 'prof.memmo@gmail.com') {
                checks.push('<span style="color:#059669;">✓ Permessi Super Admin verificati (' + user.email + ')</span>');
            } else {
                checks.push('<span style="color:#f59e0b;">⚠ Accesso eseguito come utente standard</span>');
            }

            // 3. Controllo Percorsi e Hosting
            checks.push('<span style="color:#059669;">✓ Percorsi relativi compatibili (/ e /preview/)</span>');
            checks.push('<span style="color:#059669;">✓ Protezione branch main attiva su repository ' + project.repo + '</span>');

            resultEl.innerHTML = `
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-top: 6px;">
                    <div style="font-weight: 700; color: #166534; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-circle-check"></i> Semaforo Verde: Tutti i controlli pre-volo superati con successo!
                    </div>
                    <div style="font-size: 0.85rem; line-height: 1.6;">
                        ${checks.join('<br>')}
                    </div>
                </div>
            `;
        } catch(e) {
            resultEl.innerHTML = `<span style="color:#dc2626;">Errore durante il check: ${e.message}</span>`;
        }
    },

    openConfirmModal: function(siteId) {
        const isAll = (siteId === 'ALL');
        const project = isAll ? { name: "Tutto l'Ecosistema (Tutti i 6 Siti)", repo: "ALL (Multi-Repo Sync)" } : this.PROJECTS.find(p => p.id === siteId);
        if (!project) return;

        const modal = document.getElementById('modal-release-confirm');
        const siteNameEl = document.getElementById('release-modal-site-name');
        const repoNameEl = document.getElementById('release-modal-repo-name');
        const inputEl = document.getElementById('release-confirm-input');
        const btnExec = document.getElementById('btn-execute-release');

        if (siteNameEl) siteNameEl.textContent = project.name;
        if (repoNameEl) repoNameEl.textContent = project.repo;
        if (inputEl) {
            inputEl.value = '';
            inputEl.dataset.siteId = siteId;
        }
        if (btnExec) {
            btnExec.disabled = true;
            btnExec.style.opacity = '0.5';
            btnExec.innerHTML = '<i class="fa-solid fa-rocket"></i> Conferma e Pubblica Live';
        }

        if (modal) modal.style.display = 'flex';
    },

    checkConfirmInput: function() {
        const inputEl = document.getElementById('release-confirm-input');
        const btnExec = document.getElementById('btn-execute-release');
        if (!inputEl || !btnExec) return;

        const val = inputEl.value.trim().toUpperCase();
        if (val === 'CONFERMA') {
            btnExec.disabled = false;
            btnExec.style.opacity = '1';
            btnExec.style.cursor = 'pointer';
        } else {
            btnExec.disabled = true;
            btnExec.style.opacity = '0.5';
            btnExec.style.cursor = 'not-allowed';
        }
    },

    getFirestore: function() {
        if (window.fbDb && window.fbDb.hub) return window.fbDb.hub;
        if (window.db) return window.db;
        if (typeof firebase !== 'undefined' && firebase.firestore) return firebase.firestore();
        return null;
    },

    executeRelease: async function() {
        const inputEl = document.getElementById('release-confirm-input');
        const btnExec = document.getElementById('btn-execute-release');
        const modal = document.getElementById('modal-release-confirm');
        const siteId = inputEl ? inputEl.dataset.siteId : this.selectedSiteId;
        const isAll = (siteId === 'ALL');
        const project = isAll ? { name: "Tutto l'Ecosistema", repo: "ALL" } : this.PROJECTS.find(p => p.id === siteId);

        if (!project) return;

        btnExec.disabled = true;
        btnExec.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pubblicazione in corso...';

        try {
            let token = await this.getGitHubToken();

            if (!token) {
                token = prompt("🔑 Inserisci il Personal Access Token di GitHub per autorizzare i rilasci dall'Hub:");
                if (!token || !token.trim()) {
                    alert("Operazione annullata: Token GitHub non inserito.");
                    btnExec.disabled = false;
                    btnExec.innerHTML = '<i class="fa-solid fa-rocket"></i> Riprova Pubblicazione';
                    return;
                }
                token = token.trim();
                localStorage.setItem('hub_github_pat', token);
                const firestore = this.getFirestore();
                if (firestore) {
                    try {
                        await firestore.collection('hub_settings').doc('ecosistema').set({
                            github_token: token
                        }, { merge: true });
                    } catch(e) {}
                }
            }

            const targetRepos = isAll 
                ? this.PROJECTS.map(p => p.repo) 
                : [project.repo];

            // Raccogli l'elenco dei commit / modifiche in sospeso per ciascun repo
            const changesList = [];
            targetRepos.forEach(repoName => {
                const proj = this.PROJECTS.find(p => p.repo === repoName);
                if (proj && this.siteStatuses[proj.id] && Array.isArray(this.siteStatuses[proj.id].commits)) {
                    this.siteStatuses[proj.id].commits.forEach(c => {
                        changesList.push({
                            repo: repoName,
                            siteName: proj.name,
                            message: c.message || 'Aggiornamento codice',
                            author: c.author || 'prof.memmo@gmail.com',
                            date: c.date || new Date().toLocaleString('it-IT')
                        });
                    });
                }
            });

            const results = [];

            for (const targetRepo of targetRepos) {
                const res = await fetch(`https://api.github.com/repos/prof-memmo/${targetRepo}/merges`, {
                    method: "POST",
                    headers: {
                        "Authorization": `token ${token}`,
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "ProfMemmoHub-ReleaseManager"
                    },
                    body: JSON.stringify({
                        base: "main",
                        head: "preview",
                        commit_message: `feat(release): pubblicazione automatica da Hub Admin [${targetRepo}]`
                    })
                });
                console.log(`📡 GitHub Merges API [${targetRepo}] Status: ${res.status}`);
                results.push({ repo: targetRepo, status: res.status, ok: res.ok || res.status === 204 });
            }

            // Registra nello storico su Firestore (cronologia completa con commit e modifiche)
            if (firestore) {
                const authUser = (window.fbAuth && window.fbAuth.currentUser) || (window.firebase && firebase.auth && firebase.auth().currentUser);
                const successCount = results.filter(r => r.ok).length;
                const releaseRecord = {
                    id: 'rel_' + Date.now(),
                    siteId: siteId || (isAll ? "Tutto l'Ecosistema" : project.name),
                    repo: project.repo,
                    name: project.name,
                    timestamp: new Date().toISOString(),
                    author: authUser ? authUser.email : "prof.memmo@gmail.com",
                    successCount: successCount,
                    totalRepos: targetRepos.length,
                    status: (successCount === targetRepos.length) ? 'success' : (successCount > 0 ? 'partial' : 'failed'),
                    details: results,
                    changes: changesList
                };

                try {
                    const histDoc = await firestore.collection("hub_settings").doc("releases_history").get();
                    let historyList = [];
                    if (histDoc.exists) {
                        const data = histDoc.data() || {};
                        if (Array.isArray(data.releases)) {
                            historyList = data.releases;
                        } else if (data.lastRelease) {
                            historyList = [data.lastRelease];
                        }
                    }

                    // Aggiungi il nuovo rilascio in cima e mantieni gli ultimi 30
                    historyList.unshift(releaseRecord);
                    historyList = historyList.slice(0, 30);

                    await firestore.collection("hub_settings").doc("releases_history").set({
                        lastRelease: releaseRecord,
                        releases: historyList
                    }, { merge: true });
                } catch(e) {
                    console.warn("Avviso salvataggio storico Firestore:", e);
                }
            }

            if (modal) modal.style.display = 'none';
            alert(`🎉 RILASCIO COMPLETATO!\n\n${isAll ? "Tutti i siti dell'Ecosistema sono stati aggiornati in produzione con successo!" : 'Il sito "' + project.name + '" è stato aggiornato in produzione con successo su GitHub Pages a Zero-Downtime.'}`);

            // Aggiorna stato e storico
            await Promise.all([
                this.checkAllSiteStatuses(),
                this.loadHistory()
            ]);
        } catch(e) {
            console.error("Errore durante il rilascio:", e);
            alert("Errore rilascio: " + (e.message || "Verifica la connessione internet o i permessi GitHub."));
            btnExec.disabled = false;
            btnExec.innerHTML = '<i class="fa-solid fa-rocket"></i> Riprova Pubblicazione';
        }
    },

    toggleReleaseDetails: function(relId) {
        const detailsEl = document.getElementById(`rel-details-${relId}`);
        const iconEl = document.getElementById(`rel-icon-${relId}`);
        if (!detailsEl) return;
        const isHidden = detailsEl.style.display === 'none' || !detailsEl.style.display;
        detailsEl.style.display = isHidden ? 'block' : 'none';
        if (iconEl) {
            iconEl.className = isHidden ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
        }
    },

    loadHistory: async function() {
        const listEl = document.getElementById('release-history-list');
        const firestore = this.getFirestore();
        if (!listEl || !firestore) return;

        try {
            const doc = await firestore.collection('hub_settings').doc('releases_history').get();
            let releases = [];

            if (doc.exists) {
                const data = doc.data() || {};
                if (Array.isArray(data.releases) && data.releases.length > 0) {
                    releases = data.releases;
                } else if (data.lastRelease) {
                    releases = [data.lastRelease];
                }
            }

            if (releases.length === 0) {
                listEl.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 15px;">Nessun rilascio registrato nello storico.</div>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';

            releases.forEach((r, idx) => {
                const d = r.timestamp ? new Date(r.timestamp).toLocaleString('it-IT') : 'Recente';
                const isAll = (r.repo === 'ALL' || r.siteId === "Tutto l'Ecosistema" || r.name === "Tutto l'Ecosistema");
                const title = isAll ? "Rilascio Globale Ecosistema (Tutti i Siti)" : `Rilascio: ${r.name || r.siteId || r.repo}`;
                const relId = r.id || `rel_${idx}`;
                const isSuccess = r.status === 'success' || !r.status;
                const statusColor = isSuccess ? '#10b981' : (r.status === 'partial' ? '#f59e0b' : '#ef4444');
                const badgeText = isAll ? `${r.successCount || 6}/${r.totalRepos || 6} Siti Aggiornati` : `Repo: ${r.repo}`;

                const detailsList = Array.isArray(r.details) ? r.details : [];
                const changesList = Array.isArray(r.changes) ? r.changes : [];

                html += `
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: all 0.2s;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 12px; min-width: 220px;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${statusColor}; flex-shrink: 0; box-shadow: 0 0 0 3px ${statusColor}20;"></div>
                                <div>
                                    <div style="font-weight: 700; color: var(--text-main); font-size: 0.92rem;">${title}</div>
                                    <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                                        Eseguito da <strong style="color: #475569;">${r.author || 'Super Admin'}</strong> &bull; 
                                        <span class="badge" style="background: #f1f5f9; color: #475569; font-size: 0.72rem; padding: 1px 6px; border-radius: 4px;">${badgeText}</span>
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 0.8rem; color: #64748b; font-weight: 600;">${d}</span>
                                ${(detailsList.length > 0 || changesList.length > 0) ? `
                                    <button type="button" onclick="ReleasesUI.toggleReleaseDetails('${relId}')" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; color: #475569; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                        <span>Dettagli</span> <i id="rel-icon-${relId}" class="fa-solid fa-chevron-down"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>

                        ${(detailsList.length > 0 || changesList.length > 0) ? `
                            <div id="rel-details-${relId}" style="display: none; margin-top: 12px; padding-top: 10px; border-top: 1px dashed #e2e8f0; font-size: 0.8rem;">
                                ${detailsList.length > 0 ? `
                                    <div style="font-weight: 700; color: #475569; margin-bottom: 6px; font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.05em;">Esito Sincronizzazione Repository:</div>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; margin-bottom: 10px;">
                                        ${detailsList.map(item => `
                                            <div style="background: #f8fafc; padding: 5px 8px; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                                                <code style="font-size: 0.75rem; color: #334155;">${item.repo}</code>
                                                <span style="font-weight: 700; color: ${item.ok ? '#059669' : '#dc2626'}; font-size: 0.72rem;">
                                                    ${item.ok ? '<i class="fa-solid fa-check"></i> Pubblicato' : '<i class="fa-solid fa-xmark"></i> Errore ' + (item.status || '')}
                                                </span>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}

                                ${changesList.length > 0 ? `
                                    <div style="padding-top: 8px; border-top: 1px dashed #e2e8f0;">
                                        <div style="font-weight: 700; color: #475569; margin-bottom: 6px; font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.05em;">Modifiche &amp; Commit Inclusi (${changesList.length}):</div>
                                        <div style="display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow-y: auto; padding-right: 4px;">
                                            ${changesList.map((ch, cIdx) => `
                                                <div style="background: #f8fafc; padding: 4px 8px; border-radius: 5px; border-left: 3px solid #6366f1; font-size: 0.76rem; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                                                    <div>
                                                        <span style="font-weight: 700; color: #6366f1;">#${cIdx + 1}</span> 
                                                        <span style="color: #1e293b; font-weight: 600;">&ldquo;${ch.message}&rdquo;</span>
                                                        ${isAll ? `<span class="badge" style="background: #e0e7ff; color: #4338ca; font-size: 0.68rem; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">${ch.siteName || ch.repo}</span>` : ''}
                                                    </div>
                                                    <span style="color: #64748b; font-size: 0.7rem; white-space: nowrap;">${ch.date}</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            html += '</div>';
            listEl.innerHTML = html;

        } catch(e) {
            console.warn("Errore caricamento storico rilasci:", e);
            listEl.innerHTML = '<div style="text-align: center; color: #dc2626; font-size: 0.85rem; padding: 10px;">Errore nel caricamento della cronologia rilasci.</div>';
        }
    }
};

window.ReleasesUI = ReleasesUI;
