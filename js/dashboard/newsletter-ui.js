// --- Newsletter UI Service (Brevo Segmentation & Consent Center) ---
// Gestisce l'interfaccia della newsletter (iscritti, consensi GDPR, segmenti e collegamento a Brevo)

const NewsletterUI = {
    users: [],
    newsSortCol: 'data',
    newsSortAsc: false,

    init: function() {
        this.updateStats();
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

    renderNewsTable: function(usersArray) {
        const tbody = document.querySelector('#newsletter-iscritti-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!usersArray || usersArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 25px; color:var(--text-muted);">Nessun utente trovato con i filtri selezionati.</td></tr>';
            return;
        }

        usersArray.forEach(user => {
            if (!user.email) return;
            const tr = document.createElement('tr');
            const dataStr = user.dataValue > 0 ? new Date(user.dataValue).toLocaleDateString('it-IT') : 'N/D';
            const planInfo = this.getPlanLabelAndBadge(user);
            const isConsented = this.hasConsent(user);
            
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

            tr.innerHTML = `
                <td style="padding: 12px 10px;">
                    <strong style="color:var(--text-main); font-size:0.95rem;">${user.nome || ''} ${user.cognome || ''}</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${user.email}</span>
                </td>
                <td style="padding: 12px 10px;">${roleBadge}</td>
                <td style="padding: 12px 10px;">${planBadge}</td>
                <td style="padding: 12px 10px;">${consentBadge}</td>
                <td style="padding: 12px 10px; font-size:0.85rem; color:var(--text-muted);">${dataStr}</td>
                <td style="padding: 12px 10px; font-size:0.88rem; color:${user.giocoColor || '#334155'};"><i class="fa-solid ${user.giocoIcon || 'fa-gamepad'}"></i> ${user.gioco || 'Ecosistema'}</td>
            `;
            tbody.appendChild(tr);
        });
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
        
        const badge = document.getElementById('news-dest-badge');
        if (badge) {
            badge.textContent = `${filtered.length} visualizzati`;
        }
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
