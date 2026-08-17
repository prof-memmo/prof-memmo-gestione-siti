// --- Users UI Service ---
// Gestisce esclusivamente l'interfaccia della pagina Utenti.
// Si occupa di: rendering tabelle, ordinamenti, filtri, ricerca.
// NON contiene logiche di business o query al DB (delegate a UserService).

const UsersUI = {
    allUsers: [],
    currentSortCol: 'nome',
    currentSortAsc: true,
    activeRoleFilter: 'tutti',
    selectedUsers: new Set(),

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
        setHtml('counter-total-games', stats.total);
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

        const SUPER_ADMIN_EMAIL = 'prof.memmo@gmail.com';
        const currentYear = new Date().getFullYear();
        const scadenzaStr = `31/12/${currentYear}`;

        function normalizePlanKey(rawPlan) {
            if (!rawPlan) return 'base';
            const p = String(rawPlan).toLowerCase().trim();
            if (p.includes('ecosistema') || p === 'docente_ecosistema') return 'docente_ecosistema';
            if (p.includes('didattic') || p === 'docente_didattico' || p === 'docente_didattica') return 'docente_didattico';
            if (p.includes('viandante') || p.includes('pellegrino') || p.includes('external')) return 'viandante';
            if (p === 'base' || p === 'free' || p === 'gratuito' || p === 'studente' || p === 'studente_classe') return 'base';
            return p;
        }

        usersArray.forEach(user => {
            const tr = document.createElement('tr');
            const dataStr = user.dataValue > 0 ? new Date(user.dataValue).toLocaleDateString('it-IT') : 'N/D';
            
            const rLow = (user.ruolo || '').toLowerCase();
            const isSuperAdmin = (user.email || '').toLowerCase() === SUPER_ADMIN_EMAIL;
            const isAdminRole = isSuperAdmin || rLow.includes('admin');

            let displayRole = 'Viandante';
            if (isAdminRole) displayRole = 'Amministratore';
            else if (rLow.includes('student') || rLow === 'studente') displayRole = 'Studente';
            else if (rLow.includes('teacher') || rLow.includes('docente') || rLow === 'prof') displayRole = 'Docente';
            else displayRole = 'Viandante';

            const userPlan = isAdminRole ? 'docente_ecosistema' : normalizePlanKey(user.plan);
            const isAdminOverride = !!user.admin_override;
            const isChecked = window.UsersUI.selectedUsers.has(user.id) ? 'checked' : '';

            // Scadenza
            let scadenzaCell = '';
            if (isAdminRole) {
                scadenzaCell = '<span title="Super Admin / Accesso Completo" style="color:#f59e0b; font-weight:700;">👑 Mai</span>';
            } else if (isAdminOverride) {
                scadenzaCell = '<span title="Piano assegnato da Admin" style="color:#6366f1; font-weight:700;">⚙️ Mai</span>';
            } else if (userPlan !== 'base') {
                scadenzaCell = `<span style="color:#10b981; font-size:0.85rem;">${user.abbonamento_scadenza ? user.abbonamento_scadenza.replace(/-/g, '/').split('/').reverse().join('/') : scadenzaStr}</span>`;
            } else {
                scadenzaCell = '<span style="color:var(--text-muted);">-</span>';
            }

            // Badge piano
            const overrideBadge = isAdminOverride ? ' <span title="Piano assegnato da Admin" style="font-size:0.75rem; background:#ede9fe; color:#6366f1; border-radius:4px; padding:1px 5px;">⚙️ Admin</span>' : '';
            const superBadge = isAdminRole ? ' <span style="font-size:0.75rem; background:#fef3c7; color:#92400e; border-radius:4px; padding:1px 5px;">👑</span>' : '';

            const safeAvatar = (user.avatar && (user.avatar.includes('/') || user.avatar.includes('.png'))) 
                ? (user.avatar.startsWith('http') ? user.avatar : `https://prof-memmo.github.io/prof-memmo-gestione-siti/${user.avatar}`) 
                : 'https://prof-memmo.github.io/prof-memmo-gestione-siti/assets/avatars/6.png';

            tr.innerHTML = `
                <td style="text-align: center;"><input type="checkbox" class="user-select-cb" value="${user.id}" onchange="window.UsersUI.toggleUserSelection('${user.id}', this.checked)" ${isChecked}></td>
                <td style="padding: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${safeAvatar}" alt="Avatar" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1.5px solid #cbd5e1; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div>
                            <strong>${user.nome}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${user.email}</span>
                        </div>
                    </div>
                </td>
                <td style="padding: 10px;"><span class="badge" style="background:#f1f5f9; color:#475569; padding:4px 8px; border-radius:6px; font-weight:600; font-size:0.8rem;">${displayRole}</span></td>
                <td style="padding: 10px; font-size:0.85rem; color:var(--text-muted);">${dataStr}</td>
                <td style="padding: 10px; color:${user.giocoColor};"><i class="fa-solid ${user.giocoIcon}"></i> ${user.gioco}</td>
                <td style="padding: 10px;">
                    <select onchange="window.UsersUI.updateUserPlan('${user.id}', this.value, '${(user.email||'').replace(/'/g,"\\'")  }', '${(user.nome||'').replace(/'/g,"\\'")  }')" style="padding: 5px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem; outline: none; cursor: pointer; background: white; font-weight: 600;">
                        <option value="base" ${userPlan === 'base' ? 'selected' : ''}>⚪ Base / Gratuito</option>
                        <option value="viandante" ${userPlan === 'viandante' ? 'selected' : ''}>🧭 Viandante</option>
                        <option value="docente_didattico" ${userPlan === 'docente_didattico' ? 'selected' : ''}>🟡 Docente Didattico</option>
                        <option value="docente_ecosistema" ${userPlan === 'docente_ecosistema' ? 'selected' : ''}>🟣 Docente Ecosistema</option>
                    </select>${overrideBadge}${superBadge}
                </td>
                <td style="padding: 10px;">${scadenzaCell}</td>
                <td style="padding: 10px; text-align:center;">
                    <div style="display: inline-flex; align-items: center; justify-content: center; gap: 10px;">
                        <a href="https://prof-memmo.github.io/games/profilo.html?preview=${user.id}" target="_blank" title="Anteprima Profilo Utente" style="color: #6366f1; font-size: 1.15rem; text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="fa-solid fa-eye"></i>
                        </a>
                        <a href="mailto:${user.email}" title="Scrivi a ${user.nome}" style="color: var(--primary-color); font-size: 1.15rem; text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="fa-solid fa-envelope"></i>
                        </a>
                        <button type="button" style="background: none; border: none; padding: 0; color: #ef4444; font-size: 1.15rem; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" onclick="window.UsersUI.openDeleteUserModal('${user.id}', '${user.email}', '${user.nome.replace(/'/g, "\\'") }', '${user.gioco}')" title="Elimina Utente">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
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
        alert("La modifica massiva del piano non è più supportata dal menu a tendina.");
    },
    
    updateUserPlan: async function(userId, newPlan, userEmail, userName) {
        if (!userId) return;
        const currentYear = new Date().getFullYear();
        const scadenza = `${currentYear}-12-31`;
        try {
            if (window.fbDb && window.fbDb.hub) {
                await window.fbDb.hub.collection('hub_users').doc(userId).set({
                    abbonamento: newPlan,
                    admin_override: true,
                    abbonamento_scadenza: newPlan === 'base' ? null : scadenza,
                    lastUpdated: new Date().toISOString()
                }, { merge: true });
                
                if (this.allUsers) {
                    const usr = this.allUsers.find(u => u.id === userId);
                    if (usr) {
                        usr.plan = newPlan;
                        usr.admin_override = true;
                        usr.abbonamento_scadenza = newPlan === 'base' ? null : scadenza;
                    }
                }

                // Ricarica tabella con badge aggiornato
                this.filterIscritti();

                // Invia email di notifica all'utente
                if (userEmail && newPlan !== 'base') {
                    this.sendAbbonamentoEmail(userEmail, userName, newPlan);
                }
            } else {
                alert("Impossibile connettersi al database Hub.");
            }
        } catch (e) {
            console.error("Errore salvataggio piano:", e);
            alert("Errore durante l'aggiornamento del piano: " + e.message);
        }
    },

    sendAbbonamentoEmail: async function(userEmail, userName, newPlan) {
        const planNames = {
            'viandante': 'Piano Viandante',
            'docente_didattico': 'Docente Didattico',
            'docente_ecosistema': 'Ecosistema Completo'
        };
        const planName = planNames[newPlan] || newPlan;

        // Carica template da Firestore se disponibile
        let templateText = null;
        try {
            if (window.fbDb && window.fbDb.hub) {
                const doc = await window.fbDb.hub.collection('hub_settings').doc('email_templates').get();
                if (doc.exists) {
                    templateText = doc.data()['abbonamento_attivo'] || null;
                }
            }
        } catch(e) { /* usa default */ }

        if (!templateText) {
            templateText = `Ciao [NOME],\n\nIl tuo abbonamento all'Ecosistema Prof. Memmo è attivo!\n\nPiano: [PIANO]\n\nAccedi ora: https://prof-memmo.github.io/games/\n\nA presto,\nProf. Memmo`;
        }

        const body = templateText
            .replace(/\[NOME\]/g, userName || '')
            .replace(/\[PIANO\]/g, planName);

        const subject = encodeURIComponent('Il tuo abbonamento Prof. Memmo è attivo 🎉');
        const bodyEncoded = encodeURIComponent(body);
        window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(userEmail)}&su=${subject}&body=${bodyEncoded}`, '_blank');
    },
    
    openDeleteUserModal: function(userId, userEmail, userName, gamesString) {
        document.getElementById('delete-user-id').value = userId;
        document.getElementById('delete-user-email').value = userEmail;
        document.getElementById('delete-user-name').textContent = userName;
        
        document.getElementById('delete-everywhere').checked = false;
        
        const container = document.getElementById('delete-sites-container');
        container.innerHTML = '';
        
        const games = gamesString ? gamesString.split(',').map(s => s.trim()).filter(s => s) : [];
        
        if (games.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Questo utente non è iscritto ad alcun gioco specifico.</p>';
        } else {
            games.forEach(game => {
                const gameId = this.mapGameNameToId(game);
                if (gameId) {
                    container.innerHTML += `
                        <label style="display:flex; align-items:center; gap:10px;">
                            <input type="checkbox" class="delete-site-cb" value="${gameId}">
                            Rimuovi da <strong>${game}</strong>
                        </label>
                    `;
                }
            });
        }
        
        const modal = document.getElementById('modal-delete-user');
        modal.style.display = 'flex';
    },
    
    mapGameNameToId: function(name) {
        const lower = name.toLowerCase();
        if (lower.includes('rotta degli eroi')) return 'eroi';
        if (lower.includes('fantaletteratura')) return 'fanta';
        if (lower.includes('palestra')) return 'palestra';
        if (lower.includes('commedia')) return 'commedia';
        if (lower.includes('ops')) return 'ops';
        return null;
    },
    
    toggleDeleteEverywhere: function(isChecked) {
        const cbs = document.querySelectorAll('.delete-site-cb');
        cbs.forEach(cb => {
            cb.checked = isChecked;
            cb.disabled = isChecked;
        });
    },
    
    executeDeleteUser: async function() {
        const userId = document.getElementById('delete-user-id').value;
        const deleteEverywhere = document.getElementById('delete-everywhere').checked;
        
        if (!userId) return;
        
        const btn = document.querySelector('#modal-delete-user .btn-primary');
        const origText = btn.textContent;
        btn.textContent = 'Eliminazione in corso...';
        btn.disabled = true;
        
        try {
            const dbMap = {
                'eroi': { db: window.fbDb.eroi, col: 'users' },
                'fanta': { db: window.fbDb.fanta, col: 'users' },
                'palestra': { db: window.fbDb.palestra, col: 'users' },
                'commedia': { db: window.fbDb.commedia, col: 'users' },
                'ops': { db: window.fbDb.ops, col: 'users' }
            };
            
            let promises = [];
            
            if (deleteEverywhere) {
                Object.values(dbMap).forEach(info => {
                    if (info.db) promises.push(info.db.collection(info.col).doc(userId).delete());
                });
                if (window.fbDb.hub) {
                    promises.push(window.fbDb.hub.collection('hub_users').doc(userId).delete());
                }
            } else {
                const cbs = document.querySelectorAll('.delete-site-cb:checked');
                if (cbs.length === 0) {
                    alert("Seleziona almeno una piattaforma da cui eliminare l'utente.");
                    btn.textContent = origText;
                    btn.disabled = false;
                    return;
                }
                cbs.forEach(cb => {
                    const info = dbMap[cb.value];
                    if (info && info.db) promises.push(info.db.collection(info.col).doc(userId).delete());
                });
            }
            
            await Promise.allSettled(promises);
            alert("Utente eliminato correttamente dalle piattaforme selezionate.");
            
            if (deleteEverywhere) {
                this.allUsers = this.allUsers.filter(u => u.id !== userId);
            }
            
            document.getElementById('modal-delete-user').style.display = 'none';
            this.filterIscritti();
            
        } catch (e) {
            console.error("Errore eliminazione utente:", e);
            alert("Errore durante l'eliminazione: " + e.message);
        } finally {
            btn.textContent = origText;
            btn.disabled = false;
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
     * Filtro rapido tramite le "card" superiori (Studenti, Docenti, Scuole, ecc.)
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
     * Renderizza la vista dedicata a Scuole & Istituti
     */
    renderSchoolsTable: function() {
        const thead = document.querySelector('#hub-iscritti-table thead');
        const tbody = document.querySelector('#hub-iscritti-table tbody');
        const bulkContainer = document.getElementById('bulk-actions-container');
        if (bulkContainer) bulkContainer.classList.add('hidden');

        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th style="padding: 12px 15px;">🏫 Istituto / Scuola</th>
                    <th style="padding: 12px 15px;">📍 Città / Sede</th>
                    <th style="padding: 12px 15px;">👨‍🏫 Docente Referente</th>
                    <th style="padding: 12px 15px; text-align: center;">📁 Classi Attive</th>
                    <th style="padding: 12px 15px; text-align: center;">🎒 Studenti Iscritti</th>
                    <th style="padding: 12px 15px;">🎮 Piattaforme</th>
                    <th style="padding: 12px 15px; text-align: center;">✉️ Contatta</th>
                </tr>
            `;
        }

        if (!tbody) return;
        tbody.innerHTML = '';

        const searchInput = document.getElementById('search-iscritti') ? document.getElementById('search-iscritti').value.toLowerCase() : '';

        // Estrai e raggruppa le scuole da tutti gli utenti registrati
        const schoolsMap = new Map();

        (this.allUsers || []).forEach(u => {
            let schoolName = (u.scuola || u.school || (u.anagrafica && u.anagrafica.scuola) || '').trim();
            let className = (u.classe || u.className || '').trim();
            
            if (!schoolName && className.includes(' - ')) {
                const parts = className.split(' - ');
                if (parts.length > 1) schoolName = parts[1].trim();
            }

            if (!schoolName || schoolName.toUpperCase() === 'N/A' || schoolName.toUpperCase() === 'N/D') return;

            const key = schoolName.toLowerCase();
            if (!schoolsMap.has(key)) {
                schoolsMap.set(key, {
                    name: schoolName,
                    city: (u.citta || u.city || (u.anagrafica && u.anagrafica.citta) || 'Sede Principale').trim(),
                    teachers: new Map(),
                    classes: new Set(),
                    studentCount: 0,
                    games: new Set()
                });
            }

            const item = schoolsMap.get(key);
            if (u.citta || u.city) item.city = (u.citta || u.city).trim();
            if (u.gioco) item.games.add(u.gioco);
            if (className && className !== 'N/A' && className !== 'N/D') item.classes.add(className);

            const role = (u.ruolo || '').toLowerCase();
            const isDoc = role.includes('docente') || role.includes('teacher') || role.includes('prof') || role.includes('admin');
            if (isDoc) {
                const docEmail = u.email || u.id;
                const docName = u.nome || u.displayName || 'Docente Referente';
                item.teachers.set(docEmail, docName);
            } else {
                item.studentCount++;
            }
        });

        const schoolsList = Array.from(schoolsMap.values()).filter(s => {
            return s.name.toLowerCase().includes(searchInput) || s.city.toLowerCase().includes(searchInput);
        });

        if (schoolsList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding: 40px; color: var(--text-muted);">
                        <i class="fa-solid fa-school" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
                        Nessun istituto scolastico trovato ${searchInput ? 'con questo criterio di ricerca.' : 'registrato.'}
                    </td>
                </tr>
            `;
            return;
        }

        schoolsList.sort((a, b) => a.name.localeCompare(b.name)).forEach(s => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #edf2f7';

            // Docenti referenti
            let teachersHtml = '';
            if (s.teachers.size > 0) {
                teachersHtml = Array.from(s.teachers.entries()).map(([email, name]) => {
                    return `<div style="font-size: 0.85rem; font-weight: 600; color: #1e293b;">
                        👨‍🏫 ${name} <span style="font-size: 0.75rem; color: #64748b;">(${email})</span>
                    </div>`;
                }).join('');
            } else {
                teachersHtml = `<span style="font-size: 0.8rem; color: #94a3b8; font-style: italic;">Nessun docente registrato</span>`;
            }

            // Badge classi
            let classesHtml = '';
            if (s.classes.size > 0) {
                classesHtml = Array.from(s.classes).map(c => {
                    return `<span style="display: inline-block; background: #e0e7ff; color: #4338ca; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; margin: 2px;">${c}</span>`;
                }).join(' ');
            } else {
                classesHtml = `<span style="font-size: 0.8rem; color: #94a3b8;">--</span>`;
            }

            // Piattaforme badge
            let gamesHtml = Array.from(s.games).map(g => {
                let color = '#6366f1';
                if (g.includes('Palestra')) color = '#8b5cf6';
                if (g.includes('Rotta')) color = '#d97706';
                if (g.includes('Fanta')) color = '#dc2626';
                if (g.includes('Commedia')) color = '#b45309';
                if (g.includes('Ops')) color = '#0284c7';
                return `<span style="display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; color: ${color}; padding: 2px 7px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; margin: 2px;">${g}</span>`;
            }).join(' ');

            // Email primo docente referente
            const firstEmail = s.teachers.size > 0 ? Array.from(s.teachers.keys())[0] : '';
            const emailBtn = firstEmail ? `
                <a href="mailto:${firstEmail}" title="Scrivi al referente" style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #e0f2fe; color: #0284c7; text-decoration: none; font-size: 0.9rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                    <i class="fa-solid fa-envelope"></i>
                </a>
            ` : `<span style="color: #cbd5e1;">-</span>`;

            tr.innerHTML = `
                <td style="padding: 14px 15px; font-weight: 800; color: #1e293b;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.2rem;">🏫</span>
                        <span>${s.name}</span>
                    </div>
                </td>
                <td style="padding: 14px 15px; color: #475569; font-size: 0.9rem;">
                    📍 ${s.city}
                </td>
                <td style="padding: 14px 15px;">
                    ${teachersHtml}
                </td>
                <td style="padding: 14px 15px; text-align: center;">
                    ${classesHtml}
                </td>
                <td style="padding: 14px 15px; text-align: center;">
                    <span style="display: inline-block; background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.85rem;">
                        ${s.studentCount} studenti
                    </span>
                </td>
                <td style="padding: 14px 15px;">
                    ${gamesHtml || '--'}
                </td>
                <td style="padding: 14px 15px; text-align: center;">
                    ${emailBtn}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    /**
     * Applica tutti i filtri (Testuale, Gioco, Ruolo, e futuri filtri Piano/Piattaforma)
     */
    filterIscritti: function() {
        if (this.activeRoleFilter === 'scuole') {
            this.renderSchoolsTable();
            return;
        }

        // Ripristina l'intestazione standard degli utenti se si era su scuole
        const thead = document.querySelector('#hub-iscritti-table thead');
        if (thead && !thead.querySelector('#select-all-users')) {
            thead.innerHTML = `
                <tr>
                    <th style="width: 40px; text-align: center;">
                        <input type="checkbox" id="select-all-users" onclick="window.UsersUI.toggleSelectAll(this.checked)">
                    </th>
                    <th onclick="window.UsersUI.sortTable('nome')" class="sortable-th">Nome e Cognome</th>
                    <th onclick="window.UsersUI.sortTable('ruolo')" class="sortable-th">Ruolo</th>
                    <th onclick="window.UsersUI.sortTable('data')" class="sortable-th">Iscritto il</th>
                    <th>Piattaforma</th>
                    <th>Piano Abbonamento</th>
                    <th>Scadenza</th>
                    <th style="text-align: right;">Azioni</th>
                </tr>
            `;
        }

        const searchInput = document.getElementById('search-iscritti') ? document.getElementById('search-iscritti').value.toLowerCase().trim() : '';
        const filterGioco = document.getElementById('filter-gioco') ? document.getElementById('filter-gioco').value : 'all';
        const filterOverride = document.getElementById('filter-admin-override') ? document.getElementById('filter-admin-override').value : 'all';

        if (!this.allUsers) return;

        const filtered = this.allUsers.filter(user => {
            const matchesSearch = !searchInput || 
                (user.nome || '').toLowerCase().includes(searchInput) || 
                (user.email || '').toLowerCase().includes(searchInput) ||
                (user.scuola || '').toLowerCase().includes(searchInput) ||
                (user.classe || '').toLowerCase().includes(searchInput);

            // Corretto controllo gioco (supporta multi-gioco es. "Palestra / Rotta")
            let matchesGioco = true;
            if (filterGioco && filterGioco !== 'all') {
                const g = (user.gioco || '').toLowerCase();
                const fg = filterGioco.toLowerCase();
                if (fg.includes('eroi')) matchesGioco = g.includes('eroi');
                else if (fg.includes('commedia')) matchesGioco = g.includes('commedia');
                else if (fg.includes('fanta')) matchesGioco = g.includes('fanta');
                else if (fg.includes('palestra')) matchesGioco = g.includes('palestra');
                else if (fg.includes('ops')) matchesGioco = g.includes('ops');
                else matchesGioco = g.includes(fg);
            }

            const matchesOverride = filterOverride === 'all' || (filterOverride === 'override' && !!user.admin_override);

            // Riconoscimento accurato e universale dei ruoli
            const r = (user.ruolo || '').toLowerCase();
            const p = (user.plan || '').toLowerCase();
            const e = (user.email || '').toLowerCase();

            const isDoc = r.includes('teacher') || r.includes('admin') || r.includes('docente') || r.includes('prof') || r.includes('judge') || p.includes('docente') || p.includes('didattic') || p.includes('ecosistema') || e === 'prof.memmo@gmail.com';
            const isViand = !isDoc && (r.includes('viandante') || r.includes('forestiero') || r.includes('amico') || r.includes('guest') || r.includes('pellegrino') || p.includes('viandante'));
            const isStud = !isDoc && !isViand;

            let matchesRole = true;
            if (this.activeRoleFilter === 'studenti') {
                matchesRole = isStud;
            } else if (this.activeRoleFilter === 'docenti') {
                matchesRole = isDoc;
            } else if (this.activeRoleFilter === 'viandanti') {
                matchesRole = isViand;
            }

            return matchesSearch && matchesGioco && matchesRole && matchesOverride;
        });

        this.renderIscrittiTable(filtered);
    }
};

window.UsersUI = UsersUI;
