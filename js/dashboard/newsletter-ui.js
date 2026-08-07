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
        this.users = usersArray;
        this.initNewsUsers();
        this.renderNewsTable(this.users);
    },

    initNewsUsers: function() {
        if (!this.users) return;
        this.users.forEach(u => {
            if (u.newsSelected === undefined) u.newsSelected = true;
        });
    },

    renderNewsTable: function(usersArray) {
        const tbody = document.querySelector('#newsletter-iscritti-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!usersArray || usersArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color:var(--text-muted);">Nessun utente trovato con i filtri attuali.</td></tr>';
            return;
        }

        usersArray.forEach(user => {
            if (!user.email) return;
            const tr = document.createElement('tr');
            const dataStr = user.dataValue > 0 ? new Date(user.dataValue).toLocaleDateString('it-IT') : 'N/D';
            tr.innerHTML = `
                <td style="padding: 10px; text-align:center;">
                    <input type="checkbox" style="cursor:pointer;" class="news-dest-checkbox" value="${user.email}" ${user.newsSelected ? 'checked' : ''} onchange="window.HubApp.toggleUserSelection('${user.email}', this.checked)">
                </td>
                <td style="padding: 10px;"><strong>${user.nome}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${user.email}</span></td>
                <td style="padding: 10px; text-transform:capitalize;">${user.ruolo}</td>
                <td style="padding: 10px; font-size:0.85rem; color:var(--text-muted);">${dataStr}</td>
                <td style="padding: 10px; color:${user.giocoColor};"><i class="fa-solid ${user.giocoIcon}"></i> ${user.gioco}</td>
                <td style="padding: 10px; text-align:center;"><a href="mailto:${user.email}" title="Scrivi a ${user.nome}" style="color:var(--primary-color); font-size:1.1rem; text-decoration:none;"><i class="fa-solid fa-envelope"></i></a></td>
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

    filterNews: function() {
        const searchInput = document.getElementById('search-news-iscritti').value.toLowerCase();
        const filterGioco = document.getElementById('filter-news-gioco-col').value;

        if (!this.users) return;

        const filtered = this.users.filter(user => {
            const matchesSearch = user.nome.toLowerCase().includes(searchInput) || (user.email && user.email.toLowerCase().includes(searchInput));
            const matchesGioco = filterGioco === 'all' || user.gioco === filterGioco;
            return matchesSearch && matchesGioco;
        });

        this.renderNewsTable(filtered);
    },

    toggleAllNews: function(selectAll) {
        if (!this.users) return;
        const searchInput = document.getElementById('search-news-iscritti').value.toLowerCase();
        const filterGioco = document.getElementById('filter-news-gioco-col').value;

        this.users.forEach(user => {
            if (!user.email) return;
            const matchesSearch = user.nome.toLowerCase().includes(searchInput) || user.email.toLowerCase().includes(searchInput);
            const matchesGioco = filterGioco === 'all' || user.gioco === filterGioco;
            if (matchesSearch && matchesGioco) {
                user.newsSelected = selectAll;
            }
        });
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
        if (countSpan && this.users) {
            const selected = this.users.filter(u => u.newsSelected && u.email).length;
            countSpan.textContent = selected > 0 ? `(${selected})` : '';
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
