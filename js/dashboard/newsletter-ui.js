// --- Newsletter UI Service (Hub -> Gmail CCN with Automated Grouping, Checkboxes & Instant Admin Toggle) ---
// Gestisce l'interfaccia della newsletter (iscritti, consensi GDPR, selezione a caselle, gestione rapida senza popup e composizione Gmail CCN)

const NewsletterUI = {
    // Configurazione del limite massimo di destinatari per ciascun gruppo Gmail CCN
    MAX_RECIPIENTS_PER_GROUP: 100,

    users: [],
    selectedUids: new Set(),
    newsSortCol: 'data',
    newsSortAsc: false,
    currentGroups: [],

    init: function() {
        this.updateStats();
        this.filterNews();
    },

    setUsers: function(usersArray) {
        this.users = usersArray || [];
        this.updateStats();
        this.filterNews();
    },

    getPlanLabelAndBadge: function(user) {
        const pRaw = (user.abbonamento || user.subscription || user.piano || user.plan || 'base').toLowerCase().trim();
        if (pRaw.includes('ecosistema')) {
            return { key: 'docente_ecosistema', label: 'Ecosistema Completo', isPaid: true, color: '#059669', bg: '#ecfdf5', icon: 'fa-crown' };
        } else if (pRaw.includes('didattico')) {
            return { key: 'docente_didattico', label: 'Docente Didattico', isPaid: true, color: '#2563eb', bg: '#eff6ff', icon: 'fa-book-open' };
        } else if (pRaw.includes('viandante')) {
            return { key: 'viandante', label: 'Piano Viandante', isPaid: true, color: '#d97706', bg: '#fffbeb', icon: 'fa-compass' };
        } else {
            return { key: 'base', label: 'Piano Base', isPaid: false, color: '#64748b', bg: '#f8fafc', icon: 'fa-circle-check' };
        }
    },

    hasConsent: function(user) {
        return user.newsletter === true || (user.consents && user.consents.newsletter === true);
    },

    updateStats: function() {
        if (!this.users) return;
        const total = this.users.length;
        const withConsent = this.users.filter(u => this.hasConsent(u)).length;
        const docenti = this.users.filter(u => {
            const r = (u.ruolo || u.role || '').toLowerCase();
            return r.includes('docente') || r.includes('prof');
        }).length;
        const abbonati = this.users.filter(u => this.getPlanLabelAndBadge(u).isPaid).length;

        const elTot = document.getElementById('news-stat-totale');
        const elCons = document.getElementById('news-stat-consensi');
        const elDoc = document.getElementById('news-stat-docenti');
        const elAbb = document.getElementById('news-stat-abbonati');

        if (elTot) elTot.textContent = total;
        if (elCons) elCons.textContent = withConsent;
        if (elDoc) elDoc.textContent = docenti;
        if (elAbb) elAbb.textContent = abbonati;
    },

    /**
     * Gestione Selezione Checkbox (Singola e Tutti)
     */
    toggleUserSelection: function(uid, isChecked) {
        if (!uid) return;
        if (isChecked) {
            this.selectedUids.add(uid);
        } else {
            this.selectedUids.delete(uid);
        }
        this.updateSelectionToolbar();
    },

    toggleAllSelected: function(isChecked) {
        const filtered = this.getFilteredUsers();
        if (isChecked) {
            filtered.forEach(u => {
                const uId = u.id || u.uid;
                if (uId) this.selectedUids.add(uId);
            });
        } else {
            this.selectedUids.clear();
        }

        // Aggiorna tutte le checkbox visualizzate
        const checkboxes = document.querySelectorAll('.news-user-cb');
        checkboxes.forEach(cb => cb.checked = isChecked);
        this.updateSelectionToolbar();
    },

    updateSelectionToolbar: function() {
        const count = this.selectedUids.size;
        const tb = document.getElementById('news-select-all');
        if (tb) {
            const filtered = this.getFilteredUsers();
            tb.checked = filtered.length > 0 && filtered.every(u => this.selectedUids.has(u.id || u.uid));
        }

        const badge = document.getElementById('news-dest-badge');
        if (badge) {
            const filteredCount = this.getFilteredUsers().length;
            if (count > 0) {
                badge.textContent = `${filteredCount} visualizzati (${count} selezionati)`;
                badge.style.background = '#dbeafe';
                badge.style.color = '#1d4ed8';
            } else {
                badge.textContent = `${filteredCount} visualizzati`;
                badge.style.background = '#e0e7ff';
                badge.style.color = '#4338ca';
            }
        }
    },

    /**
     * Iscrizione o Disiscrizione Massiva per gli utenti selezionati con le checkbox
     */
    bulkSetConsent: async function(newConsentState) {
        if (this.selectedUids.size === 0) {
            alert("Seleziona almeno un utente tramite le caselle di controllo.");
            return;
        }

        const uidsArray = Array.from(this.selectedUids);
        try {
            if (window.fbDb && window.fbDb.hub) {
                const batch = window.fbDb.hub.batch();
                uidsArray.forEach(uid => {
                    const ref = window.fbDb.hub.collection('hub_users').doc(uid);
                    batch.set(ref, {
                        newsletter: !!newConsentState,
                        "consents.newsletter": !!newConsentState,
                        "consents.lastAdminActionAt": new Date().toISOString(),
                        "consents.adminActionSource": "hub_admin_bulk"
                    }, { merge: true });

                    // Aggiorna localmente
                    const user = this.users.find(u => (u.id === uid || u.uid === uid));
                    if (user) {
                        user.newsletter = !!newConsentState;
                        if (!user.consents) user.consents = {};
                        user.consents.newsletter = !!newConsentState;
                    }
                });

                await batch.commit();
                this.updateStats();
                this.filterNews();
            }
        } catch (e) {
            console.error("Errore modifica massiva consensi:", e);
            alert("Errore durante l'operazione: " + e.message);
        }
    },

    /**
     * Gestione manuale del consenso Newsletter (Iscrizione / Disiscrizione istantanea a 1 clic, senza popup)
     */
    toggleConsent: async function(userId, newConsentState) {
        if (!userId) return;

        try {
            if (window.fbDb && window.fbDb.hub) {
                // Aggiornamento Firestore
                await window.fbDb.hub.collection('hub_users').doc(userId).set({
                    newsletter: !!newConsentState,
                    "consents.newsletter": !!newConsentState,
                    "consents.lastAdminActionAt": new Date().toISOString(),
                    "consents.adminActionSource": "hub_admin_manual"
                }, { merge: true });

                // Aggiorna localmente l'utente nella memoria per feedback istantaneo
                const user = this.users.find(u => (u.id === userId || u.uid === userId));
                if (user) {
                    user.newsletter = !!newConsentState;
                    if (!user.consents) user.consents = {};
                    user.consents.newsletter = !!newConsentState;
                }
                this.updateStats();
                this.filterNews();
            }
        } catch(err) {
            console.error("Errore aggiornamento consenso newsletter:", err);
            alert("Errore durante l'aggiornamento: " + err.message);
        }
    },

    /**
     * Suddivide gli iscritti filtrati in gruppi da massimo MAX_RECIPIENTS_PER_GROUP
     * Garantisce che nessun destinatario sia duplicato o escluso.
     */
    computeGroups: function(filteredUsers) {
        if (!filteredUsers) return [];

        // Preleva solo le email uniche e valide con consenso attivo
        const consentedEmails = [];
        const seen = new Set();

        filteredUsers.forEach(u => {
            if (this.hasConsent(u) && u.email && u.email.includes('@')) {
                const emailClean = u.email.toLowerCase().trim();
                if (!seen.has(emailClean)) {
                    seen.add(emailClean);
                    consentedEmails.push(emailClean);
                }
            }
        });

        const groups = [];
        const limit = this.MAX_RECIPIENTS_PER_GROUP || 100;

        for (let i = 0; i < consentedEmails.length; i += limit) {
            groups.push(consentedEmails.slice(i, i + limit));
        }

        this.currentGroups = groups;
        return groups;
    },

    /**
     * Apre Gmail per comporre una newsletter verso un gruppo specifico con destinatari in CCN
     */
    openGmailGroup: function(groupIndex) {
        if (!this.currentGroups || !this.currentGroups[groupIndex]) {
            alert("Nessun destinatario valido trovato in questo gruppo.");
            return;
        }

        const emails = this.currentGroups[groupIndex];
        if (emails.length === 0) {
            alert("Nessun destinatario in questo gruppo.");
            return;
        }

        const bccParam = encodeURIComponent(emails.join(','));
        const subjectParam = encodeURIComponent("Newsletter Prof. Memmo");
        const gmailUrl = `https://mail.google.com/mail/?view=cm&bcc=${bccParam}&su=${subjectParam}`;

        // Apre Gmail in una finestra separata dedicata per non sovrascrivere l'Hub
        const width = 1050;
        const height = 750;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        window.open(
            gmailUrl, 
            `GmailCompose_${groupIndex}`, 
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
        );
    },

    /**
     * Renderizza i pulsanti e le informazioni dei gruppi nell'interfaccia Admin
     */
    renderGroupsUI: function(filteredUsers) {
        const container = document.getElementById('newsletter-groups-container');
        if (!container) return;

        const groups = this.computeGroups(filteredUsers);
        const totalConsented = groups.reduce((acc, g) => acc + g.length, 0);

        if (totalConsented === 0) {
            container.innerHTML = `
                <div style="background: linear-gradient(135deg, #f0fdf4, #f8fafc); border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                            <span style="background: #64748b; color: white; font-weight: 800; font-size: 0.8rem; padding: 3px 10px; border-radius: 20px;">GMAIL CCN</span>
                            <h4 style="margin: 0; color: var(--text-main); font-size: 1.1rem; font-weight: 800;">Componi Newsletter con Gmail</h4>
                        </div>
                        <p style="margin: 0; font-size: 0.88rem; color: #475569;">Al momento ci sono <strong>0 iscritti con consenso</strong> nei filtri attuali. Puoi iscrivere gli utenti dalla tabella in basso cliccando sul pulsante <strong>[+ Iscrivi]</strong> o selezionando le caselle.</p>
                    </div>
                    <button class="btn" style="background: #ea4335; color: white; font-weight: 700; padding: 12px 22px; font-size: 0.95rem; border-radius: 10px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(234, 67, 53, 0.25); cursor: pointer;" onclick="alert('Nessun iscritto con consenso attivo trovato nei filtri correnti. Per inviare una newsletter è necessario almeno 1 iscritto.')">
                        <i class="fa-brands fa-google"></i> ✉️ Componi Newsletter con Gmail (CCN)
                    </button>
                </div>
            `;
            return;
        }

        if (groups.length === 1) {
            // Caso 1 gruppo (fino a 100 iscritti)
            container.innerHTML = `
                <div style="background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                            <span style="background: #059669; color: white; font-weight: 800; font-size: 0.8rem; padding: 3px 10px; border-radius: 20px;">1 GRUPPO</span>
                            <h4 style="margin: 0; color: #065f46; font-size: 1.1rem; font-weight: 800;">${totalConsented} ${totalConsented === 1 ? 'destinatario pronto' : 'destinatari pronti'} in CCN</h4>
                        </div>
                        <p style="margin: 0; font-size: 0.88rem; color: #047857;">Gli indirizzi verranno inseriti automaticamente nel campo <strong>CCN (Copia Nascosta)</strong> di Gmail per proteggere la privacy.</p>
                    </div>
                    <button class="btn" style="background: #ea4335; color: white; font-weight: 700; padding: 12px 22px; font-size: 0.95rem; border-radius: 10px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(234, 67, 53, 0.25); cursor: pointer;" onclick="window.NewsletterUI.openGmailGroup(0)">
                        <i class="fa-brands fa-google"></i> ✉️ Componi Newsletter con Gmail (CCN)
                    </button>
                </div>
            `;
            return;
        }

        // Caso con più di 1 gruppo (> 100 iscritti)
        let groupsHtml = `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                        <span style="background: #6366f1; color: white; font-weight: 800; font-size: 0.8rem; padding: 3px 10px; border-radius: 20px;">${groups.length} GRUPPI</span>
                        <h4 style="margin: 0; color: var(--text-main); font-size: 1.1rem; font-weight: 800;">${totalConsented} iscritti con consenso</h4>
                    </div>
                    <p style="margin: 0; font-size: 0.88rem; color: var(--text-muted);">
                        La newsletter è suddivisa automaticamente in <strong>${groups.length} gruppi</strong> da massimo ${this.MAX_RECIPIENTS_PER_GROUP} destinatari ciascuno per garantire l'affidabilità di invio in Gmail. Clicca su ciascun gruppo per aprire Gmail con i relativi destinatari in CCN.
                    </p>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
        `;

        groups.forEach((group, idx) => {
            groupsHtml += `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                    <div>
                        <strong style="color: var(--text-main); font-size: 0.95rem;">Gruppo ${idx + 1}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${group.length} destinatari CCN</div>
                    </div>
                    <button class="btn" style="background: #ea4335; color: white; font-size: 0.85rem; font-weight: 700; padding: 8px 14px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;" onclick="window.NewsletterUI.openGmailGroup(${idx})">
                        <i class="fa-brands fa-google"></i> ✉️ Apri in Gmail
                    </button>
                </div>
            `;
        });

        groupsHtml += `
                </div>
            </div>
        `;

        container.innerHTML = groupsHtml;
    },

    renderNewsTable: function(usersArray) {
        const tbody = document.querySelector('#newsletter-iscritti-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!usersArray || usersArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 25px; color:var(--text-muted);">Nessun utente trovato con i filtri selezionati.</td></tr>';
            return;
        }

        usersArray.forEach(user => {
            if (!user.email) return;
            const tr = document.createElement('tr');
            const dataStr = user.dataValue > 0 ? new Date(user.dataValue).toLocaleDateString('it-IT') : 'N/D';
            const planInfo = this.getPlanLabelAndBadge(user);
            const isConsented = this.hasConsent(user);
            const uId = user.id || user.uid || '';
            const isChecked = this.selectedUids.has(uId);
            
            // Badge Ruolo
            const rRaw = (user.ruolo || user.role || 'viandante').toLowerCase();
            let roleBadge = `<span style="background:#f1f5f9; color:#475569; padding:3px 8px; border-radius:6px; font-size:0.8rem; font-weight:600;">Viandante</span>`;
            if (rRaw.includes('docente') || rRaw.includes('prof')) {
                roleBadge = `<span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:6px; font-size:0.8rem; font-weight:600;">Docente</span>`;
            } else if (rRaw.includes('student')) {
                roleBadge = `<span style="background:#fef3c7; color:#b45309; padding:3px 8px; border-radius:6px; font-size:0.8rem; font-weight:600;">Studente</span>`;
            }

            // Badge Piano
            const planBadge = `<span style="background:${planInfo.bg}; color:${planInfo.color}; padding:3px 8px; border-radius:6px; font-size:0.8rem; font-weight:700; border:1px solid ${planInfo.color}30;"><i class="fa-solid ${planInfo.icon}" style="margin-right:4px;"></i>${planInfo.label}</span>`;

            // Badge Consenso Newsletter
            const consentBadge = isConsented
                ? `<span style="background:#ecfdf5; color:#059669; padding:4px 10px; border-radius:20px; font-size:0.78rem; font-weight:700; border:1px solid #a7f3d0; display:inline-flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-check"></i> Iscritto (GDPR)</span>`
                : `<span style="background:#f1f5f9; color:#64748b; padding:4px 10px; border-radius:20px; font-size:0.78rem; font-weight:600; display:inline-flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-xmark"></i> Non Iscritto</span>`;

            // Pulsante di Azione Manuale per l'Amministratore (senza popup di conferma)
            const actionBtn = isConsented
                ? `<button class="btn outline" style="border-color:#f43f5e; color:#e11d48; padding:5px 10px; font-size:0.78rem; font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:5px; cursor:pointer;" onclick="window.NewsletterUI.toggleConsent('${uId}', false)" title="Disiscrivi all'istante dalla Newsletter"><i class="fa-solid fa-user-minus"></i> Disiscrivi</button>`
                : `<button class="btn outline" style="border-color:#10b981; color:#059669; padding:5px 10px; font-size:0.78rem; font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:5px; cursor:pointer;" onclick="window.NewsletterUI.toggleConsent('${uId}', true)" title="Iscrivi all'istante alla Newsletter"><i class="fa-solid fa-user-plus"></i> Iscrivi</button>`;

            tr.innerHTML = `
                <td style="padding: 12px 10px; text-align:center;">
                    <input type="checkbox" class="news-user-cb" ${isChecked ? 'checked' : ''} onchange="window.NewsletterUI.toggleUserSelection('${uId}', this.checked)" style="cursor:pointer; width:16px; height:16px;">
                </td>
                <td style="padding: 12px 10px;">
                    <strong style="color:var(--text-main); font-size:0.95rem;">${user.nome || ''} ${user.cognome || ''}</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${user.email}</span>
                </td>
                <td style="padding: 12px 10px;">${roleBadge}</td>
                <td style="padding: 12px 10px;">${planBadge}</td>
                <td style="padding: 12px 10px;">${consentBadge}</td>
                <td style="padding: 12px 10px; font-size:0.85rem; color:var(--text-muted);">${dataStr}</td>
                <td style="padding: 12px 10px; font-size:0.88rem; color:${user.giocoColor || '#334155'};"><i class="fa-solid ${user.giocoIcon || 'fa-gamepad'}"></i> ${user.gioco || 'Ecosistema'}</td>
                <td style="padding: 12px 10px; text-align:center;">${actionBtn}</td>
            `;
            tbody.appendChild(tr);
        });

        this.updateSelectionToolbar();
    },

    sortNews: function(column) {
        if (!this.users || this.users.length === 0) return;

        if (this.newsSortCol === column) {
            this.newsSortAsc = !this.newsSortAsc;
        } else {
            this.newsSortCol = column;
            this.newsSortAsc = true;
        }

        this.users.sort((a, b) => {
            if (column === 'data') {
                let valA = a.dataValue || 0;
                let valB = b.dataValue || 0;
                if (valA < valB) return this.newsSortAsc ? -1 : 1;
                if (valA > valB) return this.newsSortAsc ? 1 : -1;
                return 0;
            }
            if (column === 'consenso') {
                let valA = this.hasConsent(a) ? 1 : 0;
                let valB = this.hasConsent(b) ? 1 : 0;
                if (valA < valB) return this.newsSortAsc ? -1 : 1;
                if (valA > valB) return this.newsSortAsc ? 1 : -1;
                return 0;
            }

            let valA = (a[column] || '').toString().toLowerCase();
            let valB = (b[column] || '').toString().toLowerCase();
            
            if (valA < valB) return this.newsSortAsc ? -1 : 1;
            if (valA > valB) return this.newsSortAsc ? 1 : -1;
            return 0;
        });

        this.filterNews();
    },

    getFilteredUsers: function() {
        if (!this.users) return [];
        const searchInput = (document.getElementById('search-news-iscritti') ? document.getElementById('search-news-iscritti').value : '').toLowerCase().trim();
        const filterConsenso = document.getElementById('filter-news-consenso') ? document.getElementById('filter-news-consenso').value : 'all';
        const filterRuolo = document.getElementById('filter-news-ruolo') ? document.getElementById('filter-news-ruolo').value : 'all';
        const filterPiano = document.getElementById('filter-news-piano') ? document.getElementById('filter-news-piano').value : 'all';
        const filterGioco = document.getElementById('filter-news-gioco') ? document.getElementById('filter-news-gioco').value : 'all';

        return this.users.filter(user => {
            // Ricerca testo
            const userFull = `${user.nome || ''} ${user.cognome || ''} ${user.email || ''}`.toLowerCase();
            const matchesSearch = !searchInput || userFull.includes(searchInput);

            // Filtro consenso
            const isConsented = this.hasConsent(user);
            let matchesConsenso = true;
            if (filterConsenso === 'consent_only') matchesConsenso = isConsented;
            else if (filterConsenso === 'no_consent') matchesConsenso = !isConsented;

            // Filtro ruolo
            const rRaw = (user.ruolo || user.role || 'viandante').toLowerCase();
            let matchesRuolo = true;
            if (filterRuolo === 'docente') matchesRuolo = rRaw.includes('docente') || rRaw.includes('prof');
            else if (filterRuolo === 'studente') matchesRuolo = rRaw.includes('student');
            else if (filterRuolo === 'viandante') matchesRuolo = (!rRaw.includes('docente') && !rRaw.includes('studente') && !rRaw.includes('prof'));

            // Filtro piano
            const pInfo = this.getPlanLabelAndBadge(user);
            let matchesPiano = true;
            if (filterPiano === 'paid_only') matchesPiano = pInfo.isPaid;
            else if (filterPiano !== 'all') matchesPiano = (pInfo.key === filterPiano);

            // Filtro gioco
            let matchesGioco = true;
            if (filterGioco !== 'all') matchesGioco = (user.gioco || '').toLowerCase().includes(filterGioco.toLowerCase());

            return matchesSearch && matchesConsenso && matchesRuolo && matchesPiano && matchesGioco;
        });
    },

    filterNews: function() {
        const filtered = this.getFilteredUsers();
        this.renderNewsTable(filtered);
        this.renderGroupsUI(filtered);
        this.updateSelectionToolbar();
    },

    selectFilterByTag: function(tagType) {
        const elCons = document.getElementById('filter-news-consenso');
        const elRuolo = document.getElementById('filter-news-ruolo');
        const elPiano = document.getElementById('filter-news-piano');
        
        if (tagType === 'consenso') {
            if (elCons) elCons.value = 'consent_only';
            if (elRuolo) elRuolo.value = 'all';
            if (elPiano) elPiano.value = 'all';
        } else if (tagType === 'docenti') {
            if (elCons) elCons.value = 'all';
            if (elRuolo) elRuolo.value = 'docente';
            if (elPiano) elPiano.value = 'all';
        } else if (tagType === 'abbonati') {
            if (elCons) elCons.value = 'all';
            if (elRuolo) elRuolo.value = 'all';
            if (elPiano) elPiano.value = 'paid_only';
        } else {
            if (elCons) elCons.value = 'all';
            if (elRuolo) elRuolo.value = 'all';
            if (elPiano) elPiano.value = 'all';
        }
        this.filterNews();
    }
};

window.NewsletterUI = NewsletterUI;
