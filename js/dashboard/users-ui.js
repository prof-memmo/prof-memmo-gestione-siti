// --- Users UI Service ---
// Gestisce esclusivamente l'interfaccia della pagina Utenti.
// Si occupa di: rendering tabelle, ordinamenti, filtri, ricerca.
// NON contiene logiche di business o query al DB (delegate a UserService).

const UsersUI = {
    allUsers: [],
    currentSortCol: 'nome',
    currentSortAsc: true,
    activeRoleFilter: 'tutti',

    init: function() {
        console.log("UsersUI inizializzato.");
        // Predisposto per l'aggancio di modali futuri (es. approvazione docenti, cambio piano)
    },

    /**
     * Riceve i dati utente dal servizio centrale e avvia il rendering
     */
    setUsers: function(usersArray) {
        this.allUsers = usersArray || [];
        this.currentSortCol = 'data';
        this.currentSortAsc = false;
        this.renderIscrittiTable(this.allUsers);
    },

    /**
     * Aggiorna i contatori in cima alla dashboard
     */
    updateCounters: function(stats) {
        if (!stats) return;
        const setHtml = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val || 0;
        };

        setHtml('counter-eroi', stats.eroi);
        setHtml('counter-commedia', stats.commedia);
        setHtml('counter-fanta', stats.fanta);
        setHtml('counter-palestra', stats.palestra);
        setHtml('counter-ops', stats.ops);
        setHtml('counter-studenti', stats.studenti);
        setHtml('counter-docenti', stats.docenti);
        setHtml('counter-viandanti', stats.viandanti);
        setHtml('counter-scuole', stats.scuoleSetSize);
        setHtml('counter-tutti', stats.total);
        setHtml('counter-total', stats.total);
    },

    /**
     * Renderizza la tabella iscritti
     */
    renderIscrittiTable: function(usersArray) {
        const tbody = document.querySelector('#hub-iscritti-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!usersArray || usersArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">Nessun iscritto trovato con questi criteri.</td></tr>';
            return;
        }

        const selectAllCb = document.getElementById('select-all-users');
        if (selectAllCb) selectAllCb.checked = false;

        usersArray.forEach(user => {
            const tr = document.createElement('tr');
            const dataStr = user.dataValue > 0 ? new Date(user.dataValue).toLocaleDateString('it-IT') : 'N/D';
            
            const userPlan = user.plan || 'base';
            let planDisplay = 'Base (Gratuito)';
            if (userPlan === 'viandante') planDisplay = 'Viandante (9,99€)';
            else if (userPlan === 'docente_didattico') planDisplay = 'Docente Did. (19,99€)';
            else if (userPlan === 'docente_ecosistema') planDisplay = 'Ecosistema (24,99€)';
            
            const isChecked = window.UsersUI.selectedUsers.has(user.id) ? 'checked' : '';
            
            tr.innerHTML = `
                <td style="text-align: center;"><input type="checkbox" class="user-select-cb" value="${user.id}" onchange="window.UsersUI.toggleUserSelection('${user.id}', this.checked)" ${isChecked}></td>
                <td style="padding: 10px;"><strong>${user.nome}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${user.email}</span></td>
                <td style="padding: 10px; text-transform:capitalize;">${user.ruolo}</td>
                <td style="padding: 10px; font-size:0.85rem; color:var(--text-muted);">${dataStr}</td>
                <td style="padding: 10px; color:${user.giocoColor};"><i class="fa-solid ${user.giocoIcon}"></i> ${user.gioco}</td>
                <td style="padding: 10px;"><span style="background: #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">${planDisplay}</span></td>
                <td style="padding: 10px; font-size:0.85rem; color:var(--text-muted);">-</td>
                <td style="padding: 10px; text-align:center;">
                    <a href="mailto:${user.email}" title="Scrivi a ${user.nome}" style="color:var(--primary-color); font-size:1.1rem; text-decoration:none; margin-right: 10px;"><i class="fa-solid fa-envelope"></i></a>
                    <button class="btn" style="padding: 5px 10px; font-size: 0.8rem;" onclick="window.UsersUI.openEditPlanModal('${user.id}', '${user.email}', '${user.nome.replace(/'/g, "\\'")}', '${userPlan}')" title="Modifica Piano"><i class="fa-solid fa-pen-to-square"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },
    
    toggleAllUsers: function(isChecked) {
        const checkboxes = document.querySelectorAll('.user-select-cb');
        checkboxes.forEach(cb => {
            cb.checked = isChecked;
            this.toggleUserSelection(cb.value, isChecked);
        });
    },

    toggleUserSelection: function(userId, isChecked) {
        if (!this.selectedUsers) this.selectedUsers = new Set();
        if (isChecked) {
            this.selectedUsers.add(userId);
        } else {
            this.selectedUsers.delete(userId);
            document.getElementById('select-all-users').checked = false;
        }
        
        const bulkContainer = document.getElementById('bulk-actions-container');
        if (this.selectedUsers.size > 0) {
            bulkContainer.style.display = 'flex';
        } else {
            bulkContainer.style.display = 'none';
        }
    },

    openBulkEditPlanModal: function() {
        if (!this.selectedUsers || this.selectedUsers.size === 0) return;
        
        // Use the same modal but configure it for bulk
        document.getElementById('edit-user-id').value = 'BULK_EDIT';
        document.getElementById('edit-user-name').textContent = `${this.selectedUsers.size} utenti selezionati`;
        document.getElementById('edit-user-email').value = '';
        document.getElementById('edit-user-plan-select').value = 'base';
        
        const modal = document.getElementById('modal-edit-user-plan');
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    },
    
    openEditPlanModal: function(userId, userEmail, userName, currentPlan) {
        document.getElementById('edit-user-id').value = userId;
        document.getElementById('edit-user-email').value = userEmail;
        document.getElementById('edit-user-name').textContent = userName;
        document.getElementById('edit-user-plan-select').value = currentPlan || 'base';
        
        const modal = document.getElementById('modal-edit-user-plan');
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    },
    
    saveUserPlan: async function() {
        const userId = document.getElementById('edit-user-id').value;
        const newPlan = document.getElementById('edit-user-plan-select').value;
        
        if (!userId) return;
        
        try {
            if (window.fbDb && window.fbDb.hub) {
                if (userId === 'BULK_EDIT') {
                    // Bulk update
                    const promises = [];
                    this.selectedUsers.forEach(uid => {
                        promises.push(window.fbDb.hub.collection('hub_users').doc(uid).set({
                            abbonamento: newPlan,
                            lastUpdated: new Date().toISOString()
                        }, { merge: true }));
                    });
                    
                    await Promise.all(promises);
                    alert(`${this.selectedUsers.size} utenti aggiornati con successo!`);
                    
                    // Update locally
                    if (this.allUsers) {
                        this.selectedUsers.forEach(uid => {
                            const usr = this.allUsers.find(u => u.id === uid);
                            if (usr) usr.plan = newPlan;
                        });
                    }
                    
                    this.selectedUsers.clear();
                    document.getElementById('select-all-users').checked = false;
                    document.getElementById('bulk-actions-container').style.display = 'none';
                    
                } else {
                    // Single update
                    await window.fbDb.hub.collection('hub_users').doc(userId).set({
                        abbonamento: newPlan,
                        lastUpdated: new Date().toISOString()
                    }, { merge: true });
                    
                    alert("Piano utente aggiornato con successo!");
                    
                    // Update locally
                    if (this.allUsers) {
                        const usr = this.allUsers.find(u => u.id === userId);
                        if (usr) usr.plan = newPlan;
                    }
                }
                
                document.getElementById('modal-edit-user-plan').style.display = 'none';
                this.filterIscritti();
            } else {
                alert("Impossibile connettersi al database Hub.");
            }
        } catch (e) {
            console.error("Errore salvataggio piano:", e);
            alert("Errore durante il salvataggio: " + e.message);
        }
    },

    /**
     * Ordinamento della tabella
     */
    sortIscritti: function(column) {
        if (!this.allUsers || this.allUsers.length === 0) return;

        if (this.currentSortCol === column) {
            this.currentSortAsc = !this.currentSortAsc; // Inverti
        } else {
            this.currentSortCol = column;
            this.currentSortAsc = true;
        }

        this.allUsers.sort((a, b) => {
            if (column === 'data') {
                let valA = a.dataValue || 0;
                let valB = b.dataValue || 0;
                if (valA < valB) return this.currentSortAsc ? -1 : 1;
                if (valA > valB) return this.currentSortAsc ? 1 : -1;
                return 0;
            }

            let valA = (a[column] || '').toString().toLowerCase();
            let valB = (b[column] || '').toString().toLowerCase();
            
            if (valA < valB) return this.currentSortAsc ? -1 : 1;
            if (valA > valB) return this.currentSortAsc ? 1 : -1;
            return 0;
        });
        
        this.filterIscritti(); // Ridisegna con i filtri attivi
    },

    /**
     * Filtro rapido tramite le "card" superiori (Studenti, Docenti, ecc.)
     */
    filterIscrittiByCard: function(roleType) {
        this.activeRoleFilter = roleType;
        
        // Update UI Cards
        document.querySelectorAll('.hub-card').forEach(card => card.classList.remove('active'));
        const activeCard = document.getElementById(`card-stats-${roleType}`);
        if (activeCard) activeCard.classList.add('active');

        this.filterIscritti();
    },

    /**
     * Applica tutti i filtri (Testuale, Gioco, Ruolo, e futuri filtri Piano/Piattaforma)
     */
    filterIscritti: function() {
        const searchInput = document.getElementById('search-iscritti') ? document.getElementById('search-iscritti').value.toLowerCase() : '';
        const filterGioco = document.getElementById('filter-gioco') ? document.getElementById('filter-gioco').value : 'all';
        // Predisposizione futuri filtri (es. Piano Abbonamento, Stato Sospensione)

        if (!this.allUsers) return;

        const filtered = this.allUsers.filter(user => {
            const matchesSearch = user.nome.toLowerCase().includes(searchInput) || (user.email && user.email.toLowerCase().includes(searchInput));
            const matchesGioco = filterGioco === 'all' || user.gioco === filterGioco;
            
            let matchesRole = true;
            if (this.activeRoleFilter !== 'tutti') {
                const r = (user.ruolo || '').toLowerCase();
                const c = (user.classe || '').toUpperCase().trim();
                
                if (this.activeRoleFilter === 'studenti') {
                    matchesRole = r.includes('student');
                } else if (this.activeRoleFilter === 'docenti') {
                    matchesRole = r.includes('teacher') || r.includes('admin') || r.includes('docente');
                } else if (this.activeRoleFilter === 'viandanti') {
                    matchesRole = !r.includes('student') && !r.includes('teacher') && !r.includes('admin') && !r.includes('docente');
                } else if (this.activeRoleFilter === 'scuole') {
                    matchesRole = (c && c !== 'N/A' && c !== '' && c !== 'TEST' && c !== 'N/D');
                }
            }

            return matchesSearch && matchesGioco && matchesRole;
        });

        this.renderIscrittiTable(filtered);
    }
};

window.UsersUI = UsersUI;
