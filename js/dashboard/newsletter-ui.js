// --- Newsletter UI Service ---
// Gestisce l'interfaccia della newsletter (destinatari, filtri, bozze, invio)

const NewsletterUI = {
    users: [],
    newsSortCol: 'data',
    newsSortAsc: false,

    init: function() {
        this.loadNewsletters();
    },

    setUsers: function(usersArray) {
        this.users = usersArray || [];
        this.initNewsUsers();
        this.filterNews();
    },

    initNewsUsers: function() {
        if (!this.users) return;
        this.users.forEach(u => {
            if (u.newsSelected === undefined) u.newsSelected = true;
        });
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

    renderNewsTable: function(usersArray) {
        const tbody = document.querySelector('#newsletter-iscritti-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!usersArray || usersArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 25px; color:var(--text-muted);">Nessun utente trovato con i filtri selezionati.</td></tr>';
            this.updateNewsCount();
            return;
        }

        usersArray.forEach(user => {
            if (!user.email) return;
            const tr = document.createElement('tr');
            const dataStr = user.dataValue > 0 ? new Date(user.dataValue).toLocaleDateString('it-IT') : 'N/D';
            const planInfo = this.getPlanLabelAndBadge(user);
            
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

            tr.innerHTML = `
                <td style="padding: 10px; text-align:center;">
                    <input type="checkbox" style="cursor:pointer; width:16px; height:16px;" class="news-dest-checkbox" value="${user.email}" ${user.newsSelected ? 'checked' : ''} onchange="window.NewsletterUI.toggleUserSelection('${user.email}', this.checked)">
                </td>
                <td style="padding: 10px;">
                    <strong style="color:var(--text-main); font-size:0.95rem;">${user.nome || ''} ${user.cognome || ''}</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${user.email}</span>
                </td>
                <td style="padding: 10px;">${roleBadge}</td>
                <td style="padding: 10px;">${planBadge}</td>
                <td style="padding: 10px; font-size:0.85rem; color:var(--text-muted);">${dataStr}</td>
                <td style="padding: 10px; font-size:0.88rem; color:${user.giocoColor || '#334155'};"><i class="fa-solid ${user.giocoIcon || 'fa-gamepad'}"></i> ${user.gioco || 'Ecosistema'}</td>
                <td style="padding: 10px; text-align:center;">
                    <a href="mailto:${user.email}" title="Scrivi a ${user.nome || user.email}" style="color:var(--accent); font-size:1.1rem; text-decoration:none;">
                        <i class="fa-solid fa-envelope"></i>
                    </a>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        this.updateNewsCount();
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
        const filterRuolo = document.getElementById('filter-news-ruolo') ? document.getElementById('filter-news-ruolo').value : 'all';
        const filterPiano = document.getElementById('filter-news-piano') ? document.getElementById('filter-news-piano').value : 'all';
        const filterGioco = document.getElementById('filter-news-gioco') ? document.getElementById('filter-news-gioco').value : 'all';

        return this.users.filter(user => {
            // Ricerca testo
            const userFull = `${user.nome || ''} ${user.cognome || ''} ${user.email || ''}`.toLowerCase();
            const matchesSearch = !searchInput || userFull.includes(searchInput);

            // Filtro ruolo
            const rRaw = (user.ruolo || user.role || 'viandante').toLowerCase();
            let matchesRuolo = true;
            if (filterRuolo === 'docente') matchesRuolo = rRaw.includes('docente') || rRaw.includes('prof');
            else if (filterRuolo === 'studente') matchesRuolo = rRaw.includes('student');
            else if (filterRuolo === 'viandante') matchesRuolo = (!rRaw.includes('docente') && !rRaw.includes('student') && !rRaw.includes('prof'));

            // Filtro piano
            const planInfo = this.getPlanLabelAndBadge(user);
            let matchesPiano = true;
            if (filterPiano === 'paid_only') matchesPiano = planInfo.isPaid;
            else if (filterPiano === 'base') matchesPiano = planInfo.key === 'base';
            else if (filterPiano === 'viandante') matchesPiano = planInfo.key === 'viandante';
            else if (filterPiano === 'docente_didattico') matchesPiano = planInfo.key === 'docente_didattico';
            else if (filterPiano === 'docente_ecosistema') matchesPiano = planInfo.key === 'docente_ecosistema';

            // Filtro gioco
            const matchesGioco = filterGioco === 'all' || (user.gioco && user.gioco.toLowerCase().includes(filterGioco.toLowerCase()));

            return matchesSearch && matchesRuolo && matchesPiano && matchesGioco;
        });
    },

    filterNews: function() {
        if (!this.users || this.users.length === 0) {
            // Se users è vuoto ma window.HubApp.iscrittiAggregati è disponibile, sincronizza!
            if (window.HubApp && window.HubApp.iscrittiAggregati && window.HubApp.iscrittiAggregati.length > 0) {
                this.setUsers(window.HubApp.iscrittiAggregati);
                return;
            }
        }
        const filtered = this.getFilteredUsers();
        this.renderNewsTable(filtered);
    },

    toggleFiltered: function(selectAll) {
        const filtered = this.getFilteredUsers();
        filtered.forEach(user => {
            if (user.email) user.newsSelected = selectAll;
        });
        this.renderNewsTable(filtered);
    },

    toggleAllNews: function(selectAll) {
        if (!this.users) return;
        this.users.forEach(user => {
            if (user.email) user.newsSelected = selectAll;
        });
        this.filterNews();
    },

    selectByRole: function(targetRole) {
        const elRuolo = document.getElementById('filter-news-ruolo');
        if (elRuolo) elRuolo.value = targetRole;
        if (this.users) {
            this.users.forEach(u => {
                const r = (u.ruolo || u.role || '').toLowerCase();
                const isMatch = targetRole === 'docente' ? (r.includes('docente') || r.includes('prof')) : r.includes(targetRole);
                u.newsSelected = isMatch;
            });
        }
        this.filterNews();
    },

    selectSubscribersOnly: function() {
        const elPiano = document.getElementById('filter-news-piano');
        if (elPiano) elPiano.value = 'paid_only';
        if (this.users) {
            this.users.forEach(u => {
                const p = this.getPlanLabelAndBadge(u);
                u.newsSelected = p.isPaid;
            });
        }
        this.filterNews();
    },
    
    toggleUserSelection: function(email, isChecked) {
        if (!this.users) return;
        const user = this.users.find(u => u.email === email);
        if (user) user.newsSelected = isChecked;
        this.updateNewsCount();
    },
    
    updateNewsCount: function() {
        const countSpan = document.getElementById('news-dest-count');
        const badge = document.getElementById('news-dest-badge');
        if (this.users) {
            const selected = this.users.filter(u => u.newsSelected && u.email).length;
            const total = this.users.length;
            if (countSpan) countSpan.textContent = selected > 0 ? `(${selected})` : '';
            if (badge) badge.textContent = `${selected} selezionati su ${total}`;
        }
    },

    loadNewsletters: function() {
        if (!window.NewsletterService) return;
        window.NewsletterService.listenToNewsletters(dataArray => {
            const list = document.getElementById('newsletter-lista-bozze');
            if(!list) return;
            
            list.innerHTML = '';
            if(dataArray.length === 0) {
                list.innerHTML = '<p style="color:#888; text-align:center;">Nessuna bozza salvata.</p>';
                return;
            }
            
            dataArray.forEach(data => {
                const dateStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('it-IT') : 'N/A';
                const div = document.createElement('div');
                div.style.padding = "10px";
                div.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
                div.style.cursor = "pointer";
                div.innerHTML = `
                    <div style="font-weight:bold; color:var(--gold);">${data.oggetto || 'Senza Oggetto'}</div>
                    <div style="font-size:0.8rem; color:#aaa;">Modificato: ${dateStr}</div>
                `;
                div.onclick = () => {
                    document.getElementById('news-oggetto').value = data.oggetto;
                    document.getElementById('news-corpo').value = data.corpo;
                };
                
                // Bottone elimina
                const delBtn = document.createElement('button');
                delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                delBtn.style = "float:right; background:transparent; border:none; color:#e74c3c; cursor:pointer;";
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    if(confirm("Eliminare questa bozza?")) window.NewsletterService.deleteNewsletterDraft(data.id);
                };
                div.prepend(delBtn);
                
                list.appendChild(div);
            });
        });
    },

    salvaBozzaNewsletter: async function() {
        if (!window.NewsletterService) return;
        const oggetto = document.getElementById('news-oggetto').value;
        const corpo = document.getElementById('news-corpo').value;
        
        if(!oggetto && !corpo) return alert("Inserisci qualcosa da salvare!");
        
        try {
            await window.NewsletterService.saveNewsletterDraft(oggetto, corpo);
            alert("Bozza salvata con successo!");
            document.getElementById('news-oggetto').value = '';
            document.getElementById('news-corpo').value = '';
        } catch(e) {
            alert("Errore salvataggio: " + e.message);
        }
    },

    preparaInvioGmail: function() {
        const oggetto = encodeURIComponent(document.getElementById('news-oggetto').value);
        const corpo = encodeURIComponent(document.getElementById('news-corpo').value);
        
        let emails = [];
        if (this.users) {
            emails = this.users.filter(u => u.newsSelected && u.email && u.email.includes('@')).map(u => u.email);
        }
        
        if(emails.length === 0 && (document.getElementById('news-oggetto').value || document.getElementById('news-corpo').value)) {
            if(!confirm("Non hai selezionato nessun destinatario valido. Vuoi preparare l'email vuota su Gmail?")) return;
        }
        
        const bccString = encodeURIComponent(emails.join(', '));
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${oggetto}&body=${corpo}&bcc=${bccString}`, '_blank');
    }
};

window.NewsletterUI = NewsletterUI;
