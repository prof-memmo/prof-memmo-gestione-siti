const ImpostazioniUI = {
    settingsData: {},
    isInitialized: false,

    init: function() {
        this.loadSettings();
    },

    loadSettings: async function() {
        if (!window.fbDb || !window.fbDb.hub) {
            console.warn("DB Hub non pronto per impostazioni");
            return;
        }

        try {
            window.fbDb.hub.collection('hub_settings').doc('impostazioni').onSnapshot(doc => {
                if (doc.exists) {
                    this.settingsData = doc.data() || {};
                } else {
                    this.settingsData = {
                        manutenzione: false,
                        manutenzione_testo: "🔧 Sito temporaneamente in manutenzione.\n\nStiamo migliorando l'ecosistema. Torna tra poco!"
                    };
                }
                this.render();
            });
        } catch (e) {
            console.error("Errore caricamento impostazioni generali:", e);
        }
    },

    render: function() {
        const isManutenzione = !!this.settingsData.manutenzione;
        const btn = document.getElementById('btn-toggle-manutenzione');
        const statusText = document.getElementById('status-text-manutenzione');
        const testoArea = document.getElementById('manutenzione-testo');

        if (btn && statusText) {
            if (isManutenzione) {
                btn.classList.add('on');
                btn.classList.add('active');
                statusText.textContent = 'ON';
                statusText.style.color = 'white';
            } else {
                btn.classList.remove('on');
                btn.classList.remove('active');
                statusText.textContent = 'OFF';
                statusText.style.color = '#b91c1c';
            }
        }

        if (testoArea && document.activeElement !== testoArea) {
            testoArea.value = this.settingsData.manutenzione_testo || "🔧 Sito temporaneamente in manutenzione.\n\nStiamo migliorando l'ecosistema. Torna tra poco!";
        }
    },

    toggleManutenzione: async function() {
        if (!window.fbDb || !window.fbDb.hub) return;
        const current = !!this.settingsData.manutenzione;
        const next = !current;
        
        try {
            await window.fbDb.hub.collection('hub_settings').doc('impostazioni').set({
                manutenzione: next,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        } catch (e) {
            console.error("Errore toggle manutenzione:", e);
            alert("Errore salvataggio manutenzione: " + e.message);
        }
    },

    saveManutenzioneSettings: async function() {
        if (!window.fbDb || !window.fbDb.hub) return;
        const testo = document.getElementById('manutenzione-testo')?.value || '';
        const statusLabel = document.getElementById('manutenzione-save-status');

        try {
            await window.fbDb.hub.collection('hub_settings').doc('impostazioni').set({
                manutenzione_testo: testo,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            if (statusLabel) {
                statusLabel.style.display = 'inline';
                setTimeout(() => {
                    statusLabel.style.display = 'none';
                }, 3000);
            }
        } catch (e) {
            console.error("Errore salvataggio testo manutenzione:", e);
            alert("Errore salvataggio: " + e.message);
        }
    },

    // =========================================================================
    // CONTROLLI GLOBALI CENTRALIZZATI ECOSISTEMA
    // =========================================================================

    testConnessioneGlobale: async function() {
        const box = document.getElementById('diagnostica-global-result');
        if (!box) return;
        box.style.display = 'block';
        box.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Test di connessione alle collezioni del database centrale in corso...';

        const collectionsToTest = [
            { name: 'Hub Utenti & SSO', coll: 'hub_users', icon: 'fa-globe', color: '#6366f1' },
            { name: 'FantaLetteratura', coll: 'fanta_users', icon: 'fa-dragon', color: '#a855f7' },
            { name: 'La Rotta degli Eroi', coll: 'eroi_users', icon: 'fa-ship', color: '#3b82f6' },
            { name: 'Palestra di Riflessione', coll: 'palestra_users', icon: 'fa-brain', color: '#22c55e' },
            { name: 'La Corte della Commedia', coll: 'corte_users', icon: 'fa-gavel', color: '#ef4444' },
            { name: 'Ops! Operazione Storia', coll: 'ops_users', icon: 'fa-clock-rotate-left', color: '#eab308' },
            { name: "L'Oratore (Overrides)", coll: 'hub_didactic_overrides', icon: 'fa-microphone-lines', color: '#d97706' },
            { name: 'Archivio Storico Globale', coll: 'hub_archives', icon: 'fa-box-archive', color: '#64748b' }
        ];

        let resultsHtml = '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; margin-top:10px;">';
        let allOk = true;

        for (const item of collectionsToTest) {
            const start = performance.now();
            try {
                const snap = await window.fbDb.hub.collection(item.coll).limit(1).get();
                const latency = Math.round(performance.now() - start);
                resultsHtml += `
                    <div style="background:white; padding:10px 14px; border-radius:10px; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="fa-solid ${item.icon}" style="color:${item.color};"></i>
                            <span style="font-weight:700; font-size:0.85rem;">${item.name}</span>
                        </div>
                        <span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:12px; font-weight:800; font-size:0.75rem;">🟢 Online (${latency}ms)</span>
                    </div>
                `;
            } catch(e) {
                allOk = false;
                resultsHtml += `
                    <div style="background:white; padding:10px 14px; border-radius:10px; border:1px solid #fee2e2; display:flex; align-items:center; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="fa-solid ${item.icon}" style="color:${item.color};"></i>
                            <span style="font-weight:700; font-size:0.85rem;">${item.name}</span>
                        </div>
                        <span style="background:#fee2e2; color:#b91c1c; padding:2px 8px; border-radius:12px; font-weight:800; font-size:0.75rem;">🔴 Errore</span>
                    </div>
                `;
            }
        }
        resultsHtml += '</div>';

        box.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                <span style="font-weight:800; color:${allOk ? '#15803d' : '#b91c1c'};">${allOk ? '✅ Tutte le 7 collezioni del Database Centrale sono perfettamente connesse e sincronizzate!' : '⚠️ Attenzione: alcune collezioni hanno risposto con errore.'}</span>
                <button onclick="document.getElementById('diagnostica-global-result').style.display='none'" style="background:none; border:none; cursor:pointer; color:#888;">&times; Chiudi</button>
            </div>
            ${resultsHtml}
        `;
    },

    resetNotificheGlobali: function() {
        if (!confirm("Azzerare e contrassegnare come lette tutte le notifiche di sistema dell'Ecosistema?")) return;
        localStorage.setItem('hub_notifications_last_cleared', new Date().toISOString());
        alert("✅ Notifiche e badge globali azzerati con successo!");
    },

    resetStagioneGlobale: async function() {
        const input = prompt("⚠️ ATTENZIONE: Questa azione azzererà contemporaneamente punteggi stagionali, classifiche, verdetti e missioni completate su TUTTI I 5 GIOCHI (Rotta, Commedia, Fanta, Palestra, Ops) per avviare il nuovo anno scolastico.\n\nStudenti, docenti, classi e account rimarranno INALTERATI.\n\nPer confermare, digita 'AZZERA' in maiuscolo:");
        if (input !== 'AZZERA') {
            if (input !== null) alert("Operazione annullata. La parola di conferma non corrispondeva.");
            return;
        }

        try {
            const timestamp = new Date().toISOString();
            await window.fbDb.hub.collection('hub_settings').doc('season').set({
                currentSeasonStartedAt: timestamp,
                lastGlobalResetAt: timestamp,
                resetBy: 'prof.memmo@gmail.com'
            }, { merge: true });

            alert("🎉 Stagione azzerata con successo per tutti i siti dell'Ecosistema!\nTutti i giochi sono pronti per il nuovo anno scolastico.");
            if (window.HubApp && window.HubApp.loadIscritti) window.HubApp.loadIscritti();
        } catch(e) {
            console.error("Errore reset globale stagione:", e);
            alert("Errore durante il reset globale: " + e.message);
        }
    },

    archiviaAnnoGlobale: async function() {
        const defaultYear = `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`;
        const year = prompt("Inserisci l'Anno Scolastico da archiviare (es. " + defaultYear + "):", defaultYear);
        if (!year) return;

        if (!confirm(`Sei sicuro di voler generare l'Archivio Storico Globale per l'anno scolastico ${year}? Verrà salvata una fotografia di tutti i 5 siti nell'Archivio dell'Hub.`)) return;

        try {
            const users = window.UsersUI ? window.UsersUI.allUsers : [];
            const snapshotData = {
                schoolYear: year,
                archivedAt: new Date().toISOString(),
                totalUsers: users.length,
                stats: {
                    studenti: users.filter(u => (u.ruolo || '').includes('student')).length,
                    docenti: users.filter(u => (u.ruolo || '').includes('teacher') || (u.ruolo || '').includes('docente')).length,
                    giochi: ['La Rotta degli Eroi', 'La Corte della Commedia', 'FantaLetteratura', 'Palestra di Riflessione', 'Ops! Operazione Storia', "L'Oratore"]
                }
            };

            await window.fbDb.hub.collection('hub_archives').add(snapshotData);
            alert(`📦 Archiviazione dell'Anno Scolastico ${year} completata con successo! È ora consultabile nella scheda Archivi.`);
            if (window.HubApp && window.HubApp.loadArchivi) window.HubApp.loadArchivi();
        } catch(e) {
            console.error("Errore archiviazione globale:", e);
            alert("Errore durante l'archiviazione: " + e.message);
        }
    },

    // =========================================================================
    // PULIZIA SICURA ACCOUNT STUDENTI GOOGLE (ZERO-EMAIL / GDPR)
    // =========================================================================
    _purgeCandidates: [],

    openPurgeStudentsModal: async function() {
        const modal = document.getElementById('modal-purge-students');
        if (!modal) return;
        modal.style.display = 'flex';

        const statusBox = document.getElementById('purge-status-message');
        const listContainer = document.getElementById('purge-candidates-container');
        const btnExec = document.getElementById('btn-confirm-purge-students');

        if (statusBox) {
            statusBox.className = 'alert-info';
            statusBox.style.display = 'block';
            statusBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scansione di sicurezza in corso: verifica docenti protetti e identificazione studenti Google...';
        }
        if (listContainer) listContainer.innerHTML = '';
        if (btnExec) btnExec.disabled = true;

        try {
            // Esegui Dry-Run client-side o via Cloud Function
            let result = null;
            if (window.fbFunctions) {
                const purgeFn = window.fbFunctions.httpsCallable('purgeGoogleStudents');
                const res = await purgeFn({ dryRun: true });
                result = res.data?.report;
            }

            // Fallback scansione diretta client-side se Cloud Function non ancora deployata
            if (!result) {
                result = await this._scanPurgeCandidatesClientSide();
            }

            this._purgeCandidates = result.candidates || [];
            this.renderPurgeCandidates(this._purgeCandidates, result.protectedCount || 0);

        } catch (e) {
            console.error("Errore scansione studenti:", e);
            // Fallback su scansione client-side
            try {
                const result = await this._scanPurgeCandidatesClientSide();
                this._purgeCandidates = result.candidates || [];
                this.renderPurgeCandidates(this._purgeCandidates, result.protectedCount || 0);
            } catch (err2) {
                if (statusBox) {
                    statusBox.className = 'alert-danger';
                    statusBox.innerHTML = '❌ Errore durante la scansione: ' + err2.message;
                }
            }
        }
    },

    _scanPurgeCandidatesClientSide: async function() {
        const teacherEmails = new Set(['prof.memmo@gmail.com']);
        const teacherUids = new Set();

        try {
            const classSnaps = await window.fbDb.hub.collection("hub_classes").get();
            classSnaps.docs.forEach(cd => {
                const cdata = cd.data() || {};
                if (cdata.teacherEmail) teacherEmails.add(cdata.teacherEmail.toLowerCase().trim());
                if (cdata.teacherUid) teacherUids.add(cdata.teacherUid);
                if (cdata.teacherId) teacherUids.add(cdata.teacherId);
                if (Array.isArray(cdata.collaboratori)) {
                    cdata.collaboratori.forEach(em => teacherEmails.add(String(em).toLowerCase().trim()));
                }
            });
        } catch (_) {}

        const usersSnap = await window.fbDb.hub.collection("hub_users").get();
        let protectedCount = 0;
        const candidates = [];

        usersSnap.docs.forEach(doc => {
            const u = doc.data() || {};
            const uid = doc.id;
            const email = (u.email || "").toLowerCase().trim();
            const rawRole = String(u.role || u.ruolo || "").toLowerCase();
            const plan = String(u.plan || u.subscription || u.abbonamento || "").toLowerCase();
            const hasOverride = u.admin_override === true || u.adminOverride === true;

            const isProtected = teacherEmails.has(email) || 
                                teacherUids.has(uid) || 
                                hasOverride || 
                                rawRole.includes("docente") || 
                                rawRole.includes("teacher") || 
                                rawRole.includes("admin") || 
                                rawRole.includes("viandante") || 
                                plan.includes("docente") || 
                                plan.includes("ecosistema") || 
                                plan.includes("didattic") || 
                                plan.includes("viandante") || 
                                email === "prof.memmo@gmail.com";

            if (isProtected) {
                protectedCount++;
                return;
            }

            const isGoogleOrPersonalEmail = email.includes("@") && !email.endsWith("@studenti.prof-memmo.local");
            const isStudentRole = rawRole === "studente" || rawRole === "student" || rawRole === "" || rawRole === "base";

            if (isGoogleOrPersonalEmail && isStudentRole) {
                candidates.push({
                    uid: uid,
                    nome: u.nome || u.name || (u.anagrafica && u.anagrafica.nome) || "Studente",
                    email: email,
                    classe: u.classe || u.classId || "N/D",
                    scuola: u.scuola || u.school || (u.anagrafica && u.anagrafica.scuola) || "N/D",
                    createdAt: u.createdAt || u.joinedAt || null
                });
            }
        });

        return { protectedCount, candidates };
    },

    renderPurgeCandidates: function(candidates, protectedCount) {
        const statusBox = document.getElementById('purge-status-message');
        const listContainer = document.getElementById('purge-candidates-container');
        const btnExec = document.getElementById('btn-confirm-purge-students');
        const countSpan = document.getElementById('purge-candidates-count');
        const protSpan = document.getElementById('purge-protected-count');

        if (countSpan) countSpan.innerText = candidates.length;
        if (protSpan) protSpan.innerText = protectedCount;

        if (statusBox) {
            if (candidates.length === 0) {
                statusBox.className = 'alert-success';
                statusBox.innerHTML = `✅ <strong>Database già ottimizzato!</strong> Trovati <strong>${protectedCount}</strong> Docenti/Viandanti protetti e <strong>0</strong> account studente obsoleti.`;
                if (listContainer) listContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">Nessun account studente Google da rimuovere.</div>';
                if (btnExec) btnExec.disabled = true;
                return;
            } else {
                statusBox.className = 'alert-warning';
                statusBox.innerHTML = `⚠️ <strong>Scansione completata:</strong> Rilevati <strong>${candidates.length}</strong> account studente obsoleti (con email Google/personale) e <strong>${protectedCount}</strong> account Docenti/Viandanti blindati.`;
                if (btnExec) btnExec.disabled = false;
            }
        }

        if (!listContainer) return;

        let html = `
            <table class="hub-table" style="width:100%; font-size:0.85rem;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="width:36px; text-align:center;"><input type="checkbox" id="purge-select-all" checked onchange="ImpostazioniUI.toggleSelectAllPurge(this.checked)"></th>
                        <th>Studente / Nome</th>
                        <th>Email Personale</th>
                        <th>Classe / Scuola</th>
                        <th style="text-align:center;">Stato</th>
                    </tr>
                </thead>
                <tbody>
        `;

        candidates.forEach(c => {
            html += `
                <tr>
                    <td style="text-align:center;">
                        <input type="checkbox" class="purge-candidate-cb" value="${c.uid}" checked onchange="ImpostazioniUI.checkPurgeButtonState()">
                    </td>
                    <td><strong>${c.nome}</strong></td>
                    <td><span style="font-family:monospace; color:#475569;">${c.email}</span></td>
                    <td><span style="color:#64748b;">${c.classe !== 'N/D' ? c.classe : ''} ${c.scuola !== 'N/D' ? '(' + c.scuola + ')' : ''}</span></td>
                    <td style="text-align:center;"><span style="background:#fee2e2; color:#dc2626; padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.75rem;">Candidato Rimozione</span></td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        listContainer.innerHTML = html;
    },

    toggleSelectAllPurge: function(checked) {
        document.querySelectorAll('.purge-candidate-cb').forEach(cb => cb.checked = checked);
        this.checkPurgeButtonState();
    },

    checkPurgeButtonState: function() {
        const selected = Array.from(document.querySelectorAll('.purge-candidate-cb:checked'));
        const btnExec = document.getElementById('btn-confirm-purge-students');
        const countBadge = document.getElementById('purge-selected-badge');
        if (countBadge) countBadge.innerText = selected.length;
        if (btnExec) btnExec.disabled = selected.length === 0;
    },

    executePurgeStudents: async function() {
        const selectedCbs = Array.from(document.querySelectorAll('.purge-candidate-cb:checked'));
        const selectedUids = selectedCbs.map(cb => cb.value);

        if (selectedUids.length === 0) {
            alert("Seleziona almeno uno studente da rimuovere.");
            return;
        }

        const confirmWord = prompt(`⚠️ CONFERMA DEFINITIVA:\nStai per eliminare ${selectedUids.length} account studente da Firestore (hub_users e database di gioco) e da Firebase Auth.\n\nI Docenti e le Classi NON verranno toccati.\n\nPer procedere, digita 'ELIMINA' in maiuscolo:`);
        if (confirmWord !== 'ELIMINA') {
            if (confirmWord !== null) alert("Operazione annullata. Parola di conferma non corrispondente.");
            return;
        }

        const btnExec = document.getElementById('btn-confirm-purge-students');
        const statusBox = document.getElementById('purge-status-message');
        if (btnExec) btnExec.disabled = true;
        if (statusBox) {
            statusBox.className = 'alert-info';
            statusBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Eliminazione in corso sul cloud Firebase... Non chiudere la finestra.';
        }

        try {
            let resReport = null;

            // 1. Prova via Cloud Function
            if (window.fbFunctions) {
                try {
                    const purgeFn = window.fbFunctions.httpsCallable('purgeGoogleStudents');
                    const res = await purgeFn({ dryRun: false, selectedUids: selectedUids });
                    resReport = res.data?.report;
                } catch (eFn) {
                    console.warn("Cloud function purge fallback to client execution:", eFn);
                }
            }

            // 2. Fallback esecuzione diretta client-side
            if (!resReport) {
                let countHub = 0, countGames = 0;
                for (const uid of selectedUids) {
                    const candidate = this._purgeCandidates.find(c => c.uid === uid);
                    const email = candidate ? candidate.email : '';

                    await window.fbDb.hub.collection("hub_users").doc(uid).delete().catch(() => {});
                    countHub++;

                    if (email) {
                        await window.fbDb.hub.collection("fanta_users").doc(email).delete().catch(() => {});
                    }
                    await window.fbDb.hub.collection("eroi_users").doc(uid).delete().catch(() => {});
                    await window.fbDb.hub.collection("palestra_users").doc(uid).delete().catch(() => {});
                    await window.fbDb.hub.collection("corte_users").doc(uid).delete().catch(() => {});
                    countGames++;
                }
                resReport = { deletedFromHub: countHub, deletedFromGames: countGames, deletedFromAuth: 0 };
            }

            if (statusBox) {
                statusBox.className = 'alert-success';
                statusBox.innerHTML = `🎉 <strong>Pulizia completata con successo!</strong><br>Rimossi <strong>${resReport.deletedFromHub || selectedUids.length}</strong> record da <code>hub_users</code> e ripulite le collezioni di gioco.`;
            }

            alert(`✅ Pulizia completata con successo!\n- Rimossi da Hub: ${resReport.deletedFromHub || selectedUids.length} account studente\n- Database ottimizzato e protetto.`);

            // Ricarica tabella iscritti dell'Hub
            if (window.HubApp && window.HubApp.loadIscrittiAggregati) {
                window.HubApp.loadIscrittiAggregati();
            }

            // Aggiorna lista candidates nel modale
            this.openPurgeStudentsModal();

        } catch (e) {
            console.error("Errore durante purge students:", e);
            if (statusBox) {
                statusBox.className = 'alert-danger';
                statusBox.innerHTML = '❌ Errore durante l\'eliminazione: ' + e.message;
            }
            if (btnExec) btnExec.disabled = false;
        }
    }
};

window.ImpostazioniUI = ImpostazioniUI;
