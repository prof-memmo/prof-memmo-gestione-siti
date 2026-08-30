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
            if (p === 'docente_ecosistema' || p.includes('ecosistema') || p.includes('completo')) return 'docente_ecosistema';
            if (p === 'docente_didattico' || p.includes('didattic')) return 'docente_didattico';
            if (p.includes('viandante') || p.includes('pellegrino') || p.includes('external')) return 'viandante';
            return 'base';
        }

        usersArray.forEach(user => {
            const tr = document.createElement('tr');
            const dataStr = user.dataValue > 0 ? new Date(user.dataValue).toLocaleDateString('it-IT') : 'N/D';
            
            const rLow = (user.ruolo || '').toLowerCase();
            const nClean = (user.nome || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const isSuperAdmin = (user.email || '').toLowerCase() === SUPER_ADMIN_EMAIL || nClean.includes('profmemmo');
            const isAdminRole = isSuperAdmin || rLow.includes('admin');

            let displayRole = 'Viandante';
            if (isAdminRole) displayRole = 'Amministratore';
            else if (rLow.includes('student') || rLow === 'studente') displayRole = 'Studente';
            else if (rLow.includes('teacher') || rLow.includes('docente') || rLow === 'prof') displayRole = 'Docente';
            else displayRole = 'Viandante';

            const userPlan = isAdminRole ? 'docente_ecosistema' : normalizePlanKey(user.plan);
            const isAdminOverride = !!user.admin_override;
            const isChecked = window.UsersUI.selectedUsers.has(user.id) ? 'checked' : '';

            // Calcolo esatto scadenza: esattamente 1 anno dopo la data di iscrizione (per TUTTI gli utenti)
            const currentYear = new Date().getFullYear();
            let finalScadenza = `31/12/${currentYear + 1}`;
            let isExpired = false;

            if (user.dataValue > 0) {
                const dIscrizione = new Date(user.dataValue);
                const dScadenza = new Date(dIscrizione);
                dScadenza.setFullYear(dScadenza.getFullYear() + 1);
                finalScadenza = dScadenza.toLocaleDateString('it-IT');
                if (dScadenza < new Date()) isExpired = true;
            } else {
                finalScadenza = `31/12/${currentYear}`;
            }

            if (user.abbonamento_scadenza) {
                finalScadenza = user.abbonamento_scadenza.replace(/-/g, '/').split('/').reverse().join('/');
                if (new Date(user.abbonamento_scadenza) < new Date()) isExpired = true;
            }

            // Scadenza Cell: Super Admin ha "Mai", tutti gli altri utenti mostrano sempre la data reale
            let scadenzaCell = '';
            if (isAdminRole) {
                scadenzaCell = '<span title="Super Admin / Accesso Permanente" style="color:#f59e0b; font-weight:700; font-size:0.82rem;">👑 Mai</span>';
            } else {
                if (isExpired) {
                    scadenzaCell = `<span title="Abbonamento Scaduto" style="color:#ef4444; font-weight:700; font-size:0.82rem;"><i class="fa-solid fa-triangle-exclamation"></i> ${finalScadenza}</span>`;
                } else {
                    scadenzaCell = `<span style="color:#10b981; font-weight:600; font-size:0.82rem;">${finalScadenza}</span>`;
                }
            }

            // Badge piano
            const overrideBadge = (isAdminOverride && !isAdminRole) ? ' <span title="Piano modificato dall\'Amministratore" style="font-size:0.75rem; background:#ede9fe; color:#6366f1; border-radius:4px; padding:1px 5px; font-weight:600;">⚙️ Admin</span>' : '';
            const superBadge = isAdminRole ? ' <span style="font-size:0.75rem; background:#fef3c7; color:#92400e; border-radius:4px; padding:1px 5px;">👑</span>' : '';

            function getSafeAvatarUrl(avatar) {
                if (!avatar) return 'https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/avatars/6.png';
                const aStr = String(avatar).trim();
                if (aStr.startsWith('http://') || aStr.startsWith('https://') || aStr.startsWith('data:')) return aStr;
                if (/^\d+$/.test(aStr)) return `https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/avatars/${aStr}.png`;
                if (aStr.startsWith('assets/avatars/')) return `https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/${aStr}`;
                if (aStr.startsWith('shared/')) return `https://prof-memmo.github.io/prof-memmo-gestione-siti/${aStr}`;
                if (aStr.includes('.png') || aStr.includes('.jpg') || aStr.includes('.jpeg')) {
                    const cleanName = aStr.split('/').pop();
                    return `https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/avatars/${cleanName}`;
                }
                return 'https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/avatars/6.png';
            }

            const safeAvatar = getSafeAvatarUrl(user.avatar);

            // Semplifica e compatta la colonna gioco (badge compatto se multiscritto)
            let rawGioco = (user.gioco || 'Hub')
                .replace(' / Hub', '')
                .replace('La Rotta degli Eroi', 'Eroi')
                .replace('La Corte della Commedia', 'Commedia')
                .replace('Palestra di Riflessione', 'Palestra');

            const gameParts = rawGioco.split(' / ').map(s => s.trim()).filter(Boolean);
            let cleanGiocoHtml = '';
            if (gameParts.length >= 3) {
                cleanGiocoHtml = `<span title="${gameParts.join(' • ')}" style="background:rgba(99,102,241,0.1); color:#6366f1; border:1px solid rgba(99,102,241,0.25); padding:2px 7px; border-radius:6px; font-weight:700; font-size:0.75rem; white-space:nowrap; cursor:help;"><i class="fa-solid fa-layer-group"></i> Multiscritto (${gameParts.length})</span>`;
            } else if (gameParts.length === 2) {
                cleanGiocoHtml = `<span style="font-size:0.8rem; font-weight:600; color:${user.giocoColor || '#6366f1'}; white-space:nowrap;"><i class="fa-solid ${user.giocoIcon || 'fa-gamepad'}"></i> ${gameParts.join(' / ')}</span>`;
            } else {
                cleanGiocoHtml = `<span style="font-size:0.8rem; font-weight:600; color:${user.giocoColor || '#64748b'}; white-space:nowrap;"><i class="fa-solid ${user.giocoIcon || 'fa-gamepad'}"></i> ${gameParts[0] || 'Hub'}</span>`;
            }

            tr.innerHTML = `
                <td style="text-align: center; padding: 6px 4px;"><input type="checkbox" class="user-select-cb" value="${user.id}" onchange="window.UsersUI.toggleUserSelection('${user.id}', this.checked)" ${isChecked}></td>
                <td style="padding: 6px 8px 6px 4px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${safeAvatar}" alt="Avatar" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 1.5px solid #cbd5e1; background: #ffffff; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="min-width: 0; max-width: 240px;">
                            <strong style="font-size:0.88rem; color:var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${user.nome}</strong>
                            <span style="font-size:0.78rem; color:var(--text-muted); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${user.email}">${user.email}</span>
                        </div>
                    </div>
                </td>
                <td style="padding: 6px 4px;"><span class="badge" style="background:#f1f5f9; color:#475569; padding:2px 6px; border-radius:5px; font-weight:600; font-size:0.75rem; white-space: nowrap;">${displayRole}</span></td>
                <td style="padding: 6px; font-size:0.82rem; color:var(--text-muted); white-space: nowrap;">${dataStr}</td>
                <td style="padding: 6px; white-space: nowrap;">
                    <div style="display: inline-flex; align-items: center; gap: 5px;">
                        ${scadenzaCell}
                        ${!isAdminRole ? `<button type="button" onclick="window.UsersUI.openEditExpiryModal('${user.id}', '${finalScadenza}')" title="Modifica data scadenza" style="background:none; border:none; padding:2px; cursor:pointer; color:#64748b; font-size:0.78rem; transition:color 0.2s;" onmouseover="this.style.color='#4f46e5'" onmouseout="this.style.color='#64748b'"><i class="fa-solid fa-pen-to-square"></i></button>` : ''}
                    </div>
                </td>
                <td style="padding: 6px; white-space: nowrap;">${cleanGiocoHtml}</td>
                <td style="padding: 6px;">
                    <select onchange="window.UsersUI.updateUserPlan('${user.id}', this.value)" style="padding: 3px 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.8rem; outline: none; cursor: pointer; background: white; font-weight: 600; max-width: 125px;">
                        <option value="base" ${userPlan === 'base' ? 'selected' : ''}>⚪ Base</option>
                        <option value="viandante" ${userPlan === 'viandante' ? 'selected' : ''}>🧭 Viandante</option>
                        <option value="docente_didattico" ${userPlan === 'docente_didattico' ? 'selected' : ''}>🟡 Docente Didattico</option>
                        <option value="docente_ecosistema" ${userPlan === 'docente_ecosistema' ? 'selected' : ''}>🟣 Docente Ecosistema</option>
                    </select>${superBadge}
                </td>
                <td style="padding: 6px; text-align:center;">
                    <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                        <a href="https://prof-memmo.github.io/games/profilo.html?preview=${user.id}" target="_blank" title="Anteprima Profilo Utente" style="color: #6366f1; font-size: 1rem; text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="fa-solid fa-eye"></i>
                        </a>
                        <a href="mailto:${user.email || ''}" title="Invia Email" style="color: var(--primary-color); font-size: 1rem; text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="fa-solid fa-envelope"></i>
                        </a>
                        <button type="button" style="background: none; border: none; padding: 0; color: #ef4444; font-size: 1rem; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" onclick="window.UsersUI.openDeleteUserModal('${user.id}')" title="Elimina Utente">
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
            if (isChecked) {
                this.selectedUsers.add(cb.value);
            } else {
                this.selectedUsers.delete(cb.value);
            }
        });
        this.updateBulkUI();
    },

    toggleUserSelection: function(userId, isChecked) {
        if (!this.selectedUsers) this.selectedUsers = new Set();
        if (isChecked) {
            this.selectedUsers.add(userId);
        } else {
            this.selectedUsers.delete(userId);
            const selectAllCb = document.getElementById('select-all-users');
            if (selectAllCb) selectAllCb.checked = false;
        }
        this.updateBulkUI();
    },

    clearSelection: function() {
        if (!this.selectedUsers) this.selectedUsers = new Set();
        this.selectedUsers.clear();
        
        const checkboxes = document.querySelectorAll('.user-select-cb');
        checkboxes.forEach(cb => cb.checked = false);
        
        const selectAllCb = document.getElementById('select-all-users');
        if (selectAllCb) selectAllCb.checked = false;
        
        this.updateBulkUI();
    },

    updateBulkUI: function() {
        const bulkContainer = document.getElementById('bulk-actions-container');
        const countSpan = document.getElementById('bulk-selected-count');
        const count = this.selectedUsers ? this.selectedUsers.size : 0;
        
        if (countSpan) countSpan.textContent = count;
        
        if (bulkContainer) {
            if (count > 0) {
                bulkContainer.style.display = 'inline-flex';
            } else {
                bulkContainer.style.display = 'none';
            }
        }
    },

    // 1. Invia Email a tutti i selezionati (in CCN per rispetto della privacy)
    sendBulkEmail: function() {
        if (!this.selectedUsers || this.selectedUsers.size === 0) {
            alert("Seleziona almeno un utente dalla tabella con la casella di spunta.");
            return;
        }
        
        const selectedEmails = [];
        this.selectedUsers.forEach(id => {
            const u = (this.allUsers || []).find(user => String(user.id) === String(id));
            if (u && u.email && u.email.includes('@')) {
                selectedEmails.push(u.email.trim());
            }
        });
        
        if (selectedEmails.length === 0) {
            alert("Nessun indirizzo email valido trovato tra i profili selezionati.");
            return;
        }
        
        const bccList = selectedEmails.join(',');
        const subject = encodeURIComponent('Comunicazione dall\'Ecosistema Prof. Memmo');
        window.open(`https://mail.google.com/mail/?view=cm&bcc=${encodeURIComponent(bccList)}&su=${subject}`, '_blank');
    },

    // 2. Eliminazione Massiva da tutti i database
    openBulkDeleteModal: function() {
        if (!this.selectedUsers || this.selectedUsers.size === 0) {
            alert("Seleziona almeno un utente dalla tabella con la casella di spunta.");
            return;
        }
        
        const count = this.selectedUsers.size;
        const confirmMsg = `ATTENZIONE: Sei sicuro di voler eliminare definitivamente i ${count} utenti selezionati?\n\nI profili verranno rimossi da tutti i giochi e dal database centrale Hub in modo irreversibile.`;
        if (confirm(confirmMsg)) {
            this.executeBulkDelete();
        }
    },

    executeBulkDelete: async function() {
        const hubDb = (window.fbDb && window.fbDb.hub) || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
        if (!hubDb) {
            alert("Database Hub non connesso.");
            return;
        }

        const allColls = ['hub_users', 'eroi_users', 'fanta_users', 'palestra_users', 'corte_users', 'ops_users'];
        const selectedIds = Array.from(this.selectedUsers);
        let promises = [];
        
        selectedIds.forEach(id => {
            allColls.forEach(colName => {
                promises.push(hubDb.collection(colName).doc(id).delete());
            });
        });

        try {
            await Promise.allSettled(promises);
            
            // Rimuovi localmente gli utenti eliminati
            const idSet = new Set(selectedIds.map(String));
            this.allUsers = (this.allUsers || []).filter(u => !idSet.has(String(u.id)));
            
            this.clearSelection();
            this.filterIscritti();
            
            alert(`Eliminazione completata con successo: ${selectedIds.length} utenti rimossi.`);
        } catch (e) {
            console.error("Errore cancellazione massiva:", e);
            alert("Errore durante la cancellazione: " + e.message);
        }
    },

    // 3. Assegnazione Massiva Piano
    openBulkEditPlanModal: function() {
        if (!this.selectedUsers || this.selectedUsers.size === 0) {
            alert("Seleziona almeno un utente dalla tabella con la casella di spunta.");
            return;
        }
        const modal = document.getElementById('modal-bulk-plan');
        if (modal) {
            const countEl = document.getElementById('bulk-plan-count');
            if (countEl) countEl.textContent = this.selectedUsers.size;
            modal.style.display = 'flex';
        }
    },

    executeBulkPlan: async function() {
        const select = document.getElementById('bulk-plan-select');
        const newPlan = select ? select.value : 'base';
        const hubDb = (window.fbDb && window.fbDb.hub) || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
        if (!hubDb) {
            alert("Database Hub non connesso.");
            return;
        }

        const currentYear = new Date().getFullYear();
        const scadenza = `${currentYear}-12-31`;
        const selectedIds = Array.from(this.selectedUsers);
        let promises = [];

        selectedIds.forEach(id => {
            promises.push(hubDb.collection('hub_users').doc(id).set({
                abbonamento: newPlan,
                plan: newPlan,
                subscription: newPlan,
                admin_override: true,
                abbonamento_scadenza: newPlan === 'base' ? null : scadenza,
                lastUpdated: new Date().toISOString()
            }, { merge: true }));

            const usr = (this.allUsers || []).find(u => String(u.id) === String(id));
            if (usr) {
                usr.plan = newPlan;
                usr.admin_override = true;
                usr.abbonamento_scadenza = newPlan === 'base' ? null : scadenza;
            }
        });

        try {
            await Promise.allSettled(promises);
            const modal = document.getElementById('modal-bulk-plan');
            if (modal) modal.style.display = 'none';
            
            this.clearSelection();
            this.filterIscritti();
            alert(`Piano aggiornato con successo a "${newPlan}" per ${selectedIds.length} utenti.`);
        } catch (e) {
            console.error("Errore aggiornamento piani massivo:", e);
            alert("Errore durante l'assegnazione del piano: " + e.message);
        }
    },
    
    updateUserPlan: async function(userId, newPlan, userEmail, userName) {
        if (!userId) return;
        const currentYear = new Date().getFullYear();
        const scadenza = `${currentYear}-12-31`;
        try {
            if (window.fbDb && window.fbDb.hub) {
                await window.fbDb.hub.collection('hub_users').doc(userId).set({
                    abbonamento: newPlan,
                    plan: newPlan,
                    subscription: newPlan,
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
        const user = (this.allUsers || []).find(u => String(u.id) === String(userId)) || {};
        const finalEmail = userEmail || user.email || '';
        const finalName = userName || user.nome || 'Utente';
        const finalGames = gamesString || user.gioco || 'Hub';

        const idInput = document.getElementById('delete-user-id');
        const emailInput = document.getElementById('delete-user-email');
        const nameEl = document.getElementById('delete-user-name');
        const deleteEverywhereCb = document.getElementById('delete-everywhere');
        const container = document.getElementById('delete-sites-container');

        if (idInput) idInput.value = userId;
        if (emailInput) emailInput.value = finalEmail;
        if (nameEl) nameEl.textContent = finalName;
        
        const games = finalGames ? finalGames.split(/[,/]/).map(s => s.trim()).filter(s => s) : [];
        const isOnlyHub = games.length === 0 || (games.length === 1 && games[0].toLowerCase() === 'hub');

        if (deleteEverywhereCb) {
            deleteEverywhereCb.checked = isOnlyHub;
        }
        
        if (container) {
            container.innerHTML = '';
            if (isOnlyHub) {
                container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;"><i class="fa-solid fa-globe"></i> Utente registrato nell\'<strong>Hub Centrale</strong>.</p>';
            } else {
                games.forEach(game => {
                    const gameId = this.mapGameNameToId(game);
                    if (gameId && gameId !== 'hub') {
                        container.innerHTML += `
                            <label style="display:flex; align-items:center; gap:10px;">
                                <input type="checkbox" class="delete-site-cb" value="${gameId}" checked>
                                Rimuovi da <strong>${game}</strong>
                            </label>
                        `;
                    }
                });
            }
        }
        
        const modal = document.getElementById('modal-delete-user');
        if (modal) modal.style.display = 'flex';
    },
    
    mapGameNameToId: function(name) {
        const lower = (name || '').toLowerCase();
        if (lower.includes('rotta degli eroi') || lower.includes('eroi')) return 'eroi';
        if (lower.includes('fantaletteratura') || lower.includes('fanta')) return 'fanta';
        if (lower.includes('palestra')) return 'palestra';
        if (lower.includes('commedia') || lower.includes('corte')) return 'commedia';
        if (lower.includes('ops')) return 'ops';
        if (lower.includes('hub')) return 'hub';
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
        const origText = btn ? btn.textContent : 'Conferma Eliminazione';
        if (btn) {
            btn.textContent = 'Eliminazione in corso...';
            btn.disabled = true;
        }
        
        try {
            const hubDb = (window.fbDb && window.fbDb.hub) || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
            if (!hubDb) throw new Error("Database Hub non connesso");

            const collMap = {
                'eroi': 'eroi_users',
                'fanta': 'fanta_users',
                'palestra': 'palestra_users',
                'commedia': 'corte_users',
                'ops': 'ops_users',
                'hub': 'hub_users'
            };
            
            let promises = [];
            
            if (deleteEverywhere) {
                // Elimina ovunque: rimuovi da tutte le collezioni del database unico Hub
                const allColls = ['hub_users', 'eroi_users', 'fanta_users', 'palestra_users', 'corte_users', 'ops_users'];
                allColls.forEach(colName => {
                    promises.push(hubDb.collection(colName).doc(userId).delete());
                });
            } else {
                const cbs = document.querySelectorAll('.delete-site-cb:checked');
                if (cbs.length === 0) {
                    // Fallback: se nessuna spunta specifica, elimina da hub_users
                    promises.push(hubDb.collection('hub_users').doc(userId).delete());
                } else {
                    cbs.forEach(cb => {
                        const colName = collMap[cb.value];
                        if (colName) promises.push(hubDb.collection(colName).doc(userId).delete());
                    });
                }
            }
            
            await Promise.allSettled(promises);
            
            // Rimuovi localmente l'utente dalla lista
            this.allUsers = (this.allUsers || []).filter(u => String(u.id) !== String(userId));
            
            const modal = document.getElementById('modal-delete-user');
            if (modal) modal.style.display = 'none';
            
            this.filterIscritti();
            alert("Utente eliminato con successo.");
            
        } catch (e) {
            console.error("Errore eliminazione utente:", e);
            alert("Errore durante l'eliminazione: " + e.message);
        } finally {
            if (btn) {
                btn.textContent = origText;
                btn.disabled = false;
            }
        }
    },

    openEditExpiryModal: async function(userId, currentExpiry) {
        const newDate = prompt(`📅 Modifica data di scadenza abbonamento (formato AAAA-MM-GG o GG/MM/AAAA):\n\nValore attuale: ${currentExpiry}`, currentExpiry);
        if (!newDate || !newDate.trim()) return;

        let cleanDate = newDate.trim();
        // Normalizza formato GG/MM/AAAA in AAAA-MM-GG se necessario
        if (cleanDate.includes('/')) {
            const parts = cleanDate.split('/');
            if (parts.length === 3) {
                cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }

        try {
            const firestore = (window.fbDb && window.fbDb.hub) ? window.fbDb.hub : (window.db || (typeof firebase !== 'undefined' ? firebase.firestore() : null));
            if (firestore) {
                await firestore.collection('hub_users').doc(userId).set({
                    abbonamento_scadenza: cleanDate
                }, { merge: true });
                alert("✅ Data di scadenza aggiornata con successo.");
                // Aggiorna l'utente in locale e ridisegna
                const u = (this.allUsers || []).find(usr => usr.id === userId);
                if (u) {
                    u.abbonamento_scadenza = cleanDate;
                    this.renderIscrittiTable(this.allUsers);
                }
            }
        } catch(e) {
            alert("Errore durante l'aggiornamento della scadenza: " + e.message);
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
            this.currentSortAsc = (column === 'data' || column === 'scadenza') ? false : true;
        }

        this.allUsers.sort((a, b) => {
            if (column === 'data') {
                let valA = a.dataValue || 0;
                let valB = b.dataValue || 0;
                if (valA < valB) return this.currentSortAsc ? -1 : 1;
                if (valA > valB) return this.currentSortAsc ? 1 : -1;
                return 0;
            }

            if (column === 'scadenza') {
                const getExp = (u) => {
                    if (u.abbonamento_scadenza) return new Date(u.abbonamento_scadenza).getTime();
                    if (u.dataValue > 0) {
                        const d = new Date(u.dataValue);
                        d.setFullYear(d.getFullYear() + 1);
                        return d.getTime();
                    }
                    return 0;
                };
                let valA = getExp(a);
                let valB = getExp(b);
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
            const r = String(user.ruolo || '').toLowerCase();
            const p = String(user.plan || '').toLowerCase();
            const e = String(user.email || '').toLowerCase();
            const c = String(user.classe || '').toUpperCase().trim();

            const isDoc = r.includes('teacher') || r.includes('admin') || r.includes('docente') || r.includes('prof') || r.includes('judge') || p.includes('docente') || p.includes('didattic') || p.includes('ecosistema') || e === 'prof.memmo@gmail.com';
            const isStud = !isDoc && (r === 'studente' || r === 'student') && c !== 'N/A' && c !== 'N/D' && c !== '' && c !== 'TEST';
            const isViand = !isDoc && !isStud;

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
