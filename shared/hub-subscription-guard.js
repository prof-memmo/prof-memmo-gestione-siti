/**
 * Prof. Memmo — Hub Subscription Guard
 * =========================================================================
 * Modulo centrale e condiviso per la protezione e il controllo accessi
 * basato sui Piani dell'Ecosistema Prof. Memmo.
 * 
 * Fonte di verità: Firestore `games_status/{gameId}.allowedPlans`
 *
 * Utilizzo:
 *   <script>window.HUB_GAME_ID = "fantaletteratura";</script>
 *   <script src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/hub-subscription-guard.js"></script>
 */

(function () {
    'use strict';

    const SUPER_ADMIN_EMAIL = 'prof.memmo@gmail.com';
    const HUB_PORTAL_URL = 'https://prof-memmo.github.io/games/prezzi.html';

    const HubSubscriptionGuard = {
        gameId: window.HUB_GAME_ID || 'fantaletteratura',
        currentAllowedPlans: null,
        isBlocked: false,
        statusListenerUnsubscribe: null,

        // Piani normalizzati supportati
        PLAN_LABELS: {
            'base': 'Base (Gratuito)',
            'viandante': 'Viandante (Giocatore Singolo)',
            'viandante_annuale': 'Viandante (Giocatore Singolo)',
            'docente_didattico': 'Docente (Materia Singola)',
            'docente_ecosistema': 'Docente Ecosistema Completo'
        },

        init: function () {
            this.injectStyles();
            this.injectOverlay();
            this.listenGameStatus();
        },

        normalizePlanKey: function (rawPlan) {
            if (!rawPlan) return 'base';
            const p = String(rawPlan).toLowerCase().trim();
            if (p === 'docente_ecosistema' || p.includes('ecosistema') || p.includes('completo')) return 'docente_ecosistema';
            if (p === 'docente_didattico' || p.includes('didattic')) return 'docente_didattico';
            if (p === 'viandante' || p.includes('viandante')) return 'viandante';
            if (p === 'studente' || p === 'student') return 'studente';
            return 'base';
        },

        injectStyles: function () {
            if (document.getElementById('pm-guard-styles')) return;
            const style = document.createElement('style');
            style.id = 'pm-guard-styles';
            style.innerHTML = `
                #pm-subscription-overlay {
                    display: none;
                    position: fixed;
                    inset: 0;
                    background: rgba(5, 10, 20, 0.94);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    z-index: 9999999;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                    box-sizing: border-box;
                    font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
                }
                #pm-subscription-overlay.pm-guard-active {
                    display: flex !important;
                }
                .pm-guard-card {
                    background: #ffffff;
                    color: #0f172a;
                    border-radius: 20px;
                    padding: 2.5rem 2rem;
                    max-width: 480px;
                    width: 100%;
                    text-align: center;
                    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
                    animation: pmGuardPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes pmGuardPop {
                    from { transform: scale(0.92); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .pm-guard-icon-wrap {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1rem;
                }
                .pm-guard-avatar {
                    width: 150px;
                    height: 115px;
                    object-fit: contain;
                    filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.12));
                }
                .pm-guard-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0 0 0.8rem 0;
                }
                .pm-guard-text {
                    font-size: 0.95rem;
                    color: #64748b;
                    line-height: 1.5;
                    margin: 0 0 1.5rem 0;
                }
                .pm-guard-plan-box {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 10px 14px;
                    font-size: 0.85rem;
                    color: #334155;
                    margin-bottom: 1.5rem;
                }
                .pm-guard-plan-box strong {
                    color: #0284c7;
                }
                .pm-guard-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .pm-guard-btn-upgrade {
                    background: linear-gradient(135deg, #0284c7, #0369a1);
                    color: #ffffff !important;
                    font-weight: 700;
                    text-decoration: none;
                    padding: 12px 20px;
                    border-radius: 10px;
                    display: inline-block;
                    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3);
                    transition: transform 0.2s;
                }
                .pm-guard-btn-upgrade:hover {
                    transform: translateY(-1px);
                }
                .pm-guard-btn-back {
                    background: #f1f5f9;
                    color: #475569 !important;
                    font-weight: 600;
                    text-decoration: none;
                    padding: 10px 18px;
                    border-radius: 10px;
                    border: 1px solid #cbd5e1;
                }
            `;
            document.head.appendChild(style);
        },

        injectOverlay: function () {
            if (document.getElementById('pm-subscription-overlay')) return;
            const overlay = document.createElement('div');
            overlay.id = 'pm-subscription-overlay';
            overlay.innerHTML = `
                <div class="pm-guard-card">
                    <div class="pm-guard-icon-wrap">
                        <img class="pm-guard-avatar" id="pm-guard-avatar" src="https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/avatars/capibara-lock.png" onerror="this.onerror=null;this.src='https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/avatars/16.png';" alt="Accesso Riservato">
                    </div>
                    <h2 class="pm-guard-title" id="pm-guard-title">Accesso Riservato</h2>
                    <p class="pm-guard-text" id="pm-guard-text">
                        Questo gioco fa parte dell'Ecosistema Prof. Memmo ed è riservato agli utenti abbonati.
                    </p>
                    <div class="pm-guard-plan-box" id="pm-guard-plan-box">
                        Piano rilevato: <strong id="pm-guard-user-plan">Base (Gratuito)</strong>
                    </div>
                    <div class="pm-guard-actions">
                        <a href="${HUB_PORTAL_URL}" class="pm-guard-btn-upgrade" id="pm-guard-cta-btn">
                            <i class="fa-solid fa-crown"></i> Scopri i Piani &amp; Abbonati
                        </a>
                        <a href="https://prof-memmo.github.io/games/giochi.html" class="pm-guard-btn-back" id="pm-guard-btn-back">
                            Torna al Catalogo Giochi
                        </a>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        },

        currentStatusData: null,
        isMaintenanceBlocked: false,

        showMaintenanceOverlay: function () {
            const isPrev = window.location.pathname.indexOf('/preview') !== -1;
            const cdnBase = isPrev ? 'https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/shared/' : 'https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/';
            this.showBlockOverlay({
                title: "Lavori in corso",
                text: "Questo gioco è temporaneamente in fase di manutenzione o aggiornamento. Riprova più tardi!",
                planLabel: "Manutenzione Straordinaria",
                avatarSrc: cdnBase + "assets/avatars/16.png",
                ctaText: "Torna alla Vetrina Giochi",
                ctaIcon: "fa-person-digging",
                ctaUrl: "https://prof-memmo.github.io/games/giochi.html",
                backText: "Hub Centrale",
                backUrl: "https://prof-memmo.github.io/prof-memmo-gestione-siti/portal.html"
            });
        },

        checkMaintenanceStatus: function () {
            if (!this.currentStatusData || this.currentStatusData.isActive !== false) {
                if (this.isMaintenanceBlocked) {
                    this.isMaintenanceBlocked = false;
                    this.hideBlockOverlay();
                }
                return false;
            }

            const currentUser = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
            const isSuperAdmin = currentUser && currentUser.email && currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL;

            if (isSuperAdmin) {
                if (this.isMaintenanceBlocked) {
                    this.isMaintenanceBlocked = false;
                    this.hideBlockOverlay();
                }
                return false;
            }

            this.isMaintenanceBlocked = true;
            this.showMaintenanceOverlay();
            return true;
        },

        listenGameStatus: function () {
            const getDb = () => window.db || (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore());
            
            const attach = () => {
                const db = getDb();
                if (!db) {
                    setTimeout(attach, 400);
                    return;
                }

                if (typeof firebase !== 'undefined' && firebase.auth) {
                    try {
                        firebase.auth().onAuthStateChanged(() => {
                            this.checkMaintenanceStatus();
                        });
                    } catch (e) {}
                }

                try {
                    this.statusListenerUnsubscribe = db.collection('games_status').doc(this.gameId).onSnapshot(doc => {
                        const isInternalGame = ['fantaletteratura', 'palestra-di-riflessione', 'fuori-registro'].includes(this.gameId);
                        if (doc.exists) {
                            const data = doc.data();
                            this.currentStatusData = data;
                            this.currentAllowedPlans = data.allowedPlans || {
                                base: isInternalGame,
                                viandante: true,
                                docente_didattico: isInternalGame,
                                docente_ecosistema: true
                            };
                            this.checkMaintenanceStatus();
                        } else {
                            this.currentStatusData = null;
                            this.currentAllowedPlans = {
                                base: isInternalGame,
                                viandante: true,
                                docente_didattico: isInternalGame,
                                docente_ecosistema: true
                            };
                            if (this.isMaintenanceBlocked) {
                                this.isMaintenanceBlocked = false;
                                this.hideBlockOverlay();
                            }
                        }
                    }, err => {
                        console.warn("HubSubscriptionGuard: Impossibile sincronizzare games_status:", err);
                    });
                } catch (e) {
                    console.warn("HubSubscriptionGuard listen error:", e);
                }
            };

            attach();
        },

        isPlanAllowed: function (planKey) {
            const normalized = this.normalizePlanKey(planKey);
            if (normalized === 'docente_ecosistema') return true;
            if (!this.currentAllowedPlans) return true;
            return this.currentAllowedPlans[normalized] === true;
        },

        validateStudentAccess: async function (teamCode, studentUser = null) {
            if (!teamCode && !studentUser) {
                return { allowed: false, reason: "Nessun codice squadra o classe fornito." };
            }

            const db = window.db || (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore());
            if (!db) {
                return { allowed: true };
            }

            try {
                const cleanCode = String(teamCode || '').trim();
                const upperCode = cleanCode.toUpperCase();
                const lowerCode = cleanCode.toLowerCase();

                let teacherEmail = '';
                let teacherId = '';

                // 1. Prova ricerca in 'teams' (Squadre FantaLetteratura / Tornei)
                if (upperCode) {
                    try {
                        const snapTeam = await db.collection('teams').where("joinCode", "==", upperCode).limit(1).get();
                        if (!snapTeam.empty) {
                            const teamData = snapTeam.docs[0].data() || {};
                            teacherEmail = (teamData.ownerEmail || '').toLowerCase();
                            teacherId = teamData.teacherId || teamData.ownerId || '';
                        }
                    } catch (e) {}
                }

                // 2. Se non trovato in 'teams', cerca nelle classi dell'Ecosistema ('hub_classes' e fallback 'classes')
                if (!teacherEmail && !teacherId && upperCode) {
                    const classCollections = ['hub_classes', 'classes'];
                    for (const colName of classCollections) {
                        try {
                            // Cerca per codice classe esatto (es. "3B")
                            let snapClass = await db.collection(colName).where("code", "==", upperCode).limit(1).get();
                            if (snapClass.empty && upperCode !== cleanCode) {
                                snapClass = await db.collection(colName).where("code", "==", cleanCode).limit(1).get();
                            }
                            // Cerca per ID documento diretto (es. "classe_3b" o "3b")
                            if (snapClass.empty && lowerCode) {
                                const directDoc = await db.collection(colName).doc(lowerCode).get();
                                if (directDoc.exists) {
                                    snapClass = { empty: false, docs: [directDoc] };
                                }
                            }
                            if (snapClass.empty && lowerCode && !lowerCode.startsWith('classe_')) {
                                const directDoc = await db.collection(colName).doc('classe_' + lowerCode).get();
                                if (directDoc.exists) {
                                    snapClass = { empty: false, docs: [directDoc] };
                                }
                            }

                            if (!snapClass.empty) {
                                const classData = snapClass.docs[0].data() || {};
                                teacherEmail = (classData.teacherEmail || '').toLowerCase();
                                teacherId = classData.teacherId || (Array.isArray(classData.teacherIds) ? classData.teacherIds[0] : '') || '';
                                break;
                            }
                        } catch (e) {}
                    }
                }

                // 3. Se abbiamo uno studente autenticato con teacherId nei claims o nel profilo
                if (!teacherEmail && !teacherId && studentUser) {
                    if (studentUser.teacherId) {
                        teacherId = studentUser.teacherId;
                    } else if (typeof studentUser.getIdTokenResult === 'function') {
                        try {
                            const tok = await studentUser.getIdTokenResult();
                            if (tok && tok.claims && tok.claims.teacherId) {
                                teacherId = tok.claims.teacherId;
                            }
                        } catch (e) {}
                    }
                }

                // 4. Se la squadra o classe appartiene al Super-Admin
                if (teacherEmail === SUPER_ADMIN_EMAIL) {
                    return { allowed: true, teacherPlan: 'docente_ecosistema' };
                }

                // Se non è stato trovato alcun riferimento al docente
                if (!teacherEmail && !teacherId) {
                    // Sessioni libere o dimostrative
                    if (upperCode === 'DEMO' || upperCode === 'LIBERA' || upperCode === 'TEST') {
                        return { allowed: true, teacherPlan: 'demo' };
                    }
                    return { allowed: false, reason: "Classe o squadra non trovata nel sistema. Verifica il codice con il tuo docente." };
                }

                // 5. Risolvi il piano del docente in 'hub_users'
                let teacherSub = 'base';
                if (teacherId) {
                    try {
                        const snapT = await db.collection('hub_users').doc(teacherId).get();
                        if (snapT.exists) {
                            const uData = snapT.data() || {};
                            teacherSub = uData.subscription || uData.abbonamento || 'base';
                        }
                    } catch (e) {}
                }

                if (teacherSub === 'base' && teacherEmail) {
                    try {
                        const snapTEmail = await db.collection('hub_users').where("email", "==", teacherEmail).limit(1).get();
                        if (!snapTEmail.empty) {
                            const uData = snapTEmail.docs[0].data() || {};
                            teacherSub = uData.subscription || uData.abbonamento || 'base';
                        }
                    } catch (e) {}
                }

                const isAllowed = this.isPlanAllowed(teacherSub);
                return {
                    allowed: isAllowed,
                    teacherPlan: teacherSub,
                    reason: isAllowed ? null : `La classe appartiene a un docente il cui piano attuale (${this.PLAN_LABELS[teacherSub] || teacherSub}) non include questo gioco.`
                };
            } catch (e) {
                console.error("HubSubscriptionGuard validateStudentAccess error:", e);
                // Fallback amichevole per non bloccare le sessioni di classe in corso in caso di timeout di rete
                return { allowed: true };
            }
        },

        verifyAccess: async function (options = {}) {
            let { user, role, teamCode, isPublicView } = options;

            if (this.checkMaintenanceStatus()) {
                return false;
            }

            if (isPublicView) {
                this.hideBlockOverlay();
                return true;
            }

            // Protezione Anti-Flicker: attende brevemente l'inizializzazione di Firebase Auth se non ancora presente
            if (!user && !teamCode && typeof firebase !== 'undefined' && firebase.auth) {
                user = firebase.auth().currentUser;
                if (!user) {
                    await new Promise(resolve => {
                        let unsub = null;
                        let timer = null;
                        const done = (u) => {
                            if (timer) clearTimeout(timer);
                            if (unsub) unsub();
                            if (u) user = u;
                            resolve();
                        };
                        try {
                            unsub = firebase.auth().onAuthStateChanged(u => done(u));
                            timer = setTimeout(() => done(null), 1200);
                        } catch (e) {
                            resolve();
                        }
                    });
                }
            }

            if (user && user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
                this.hideBlockOverlay();
                return true;
            }

            // Percorso Studente: sia con codice esplicito, sia per ruolo studente autenticato/SSO
            const isStudentRole = role === 'studente' || (user && user.email && user.email.includes('@studente.profmemmo.it'));
            const effectiveCode = teamCode || (typeof localStorage !== 'undefined' && (localStorage.getItem('hub_user_class') || localStorage.getItem('pm_student_class') || localStorage.getItem('fanta_active_team_code'))) || '';

            if (isStudentRole || (effectiveCode && !user)) {
                const studentCheck = await this.validateStudentAccess(effectiveCode, user);
                if (studentCheck.allowed) {
                    this.hideBlockOverlay();
                    return true;
                } else {
                    this.showBlockOverlay({
                        title: "Attività non inclusa nel piano della classe",
                        text: studentCheck.reason || "La classe appartiene a un docente il cui piano attuale non include questo gioco. Esplora i giochi disponibili per la tua classe come FantaLetteratura e Palestra di Riflessione!",
                        planLabel: `Classe (${this.PLAN_LABELS[studentCheck.teacherPlan] || studentCheck.teacherPlan || 'Base'})`,
                        ctaText: "Catalogo Giochi Base",
                        ctaIcon: "fa-compass",
                        ctaUrl: "https://prof-memmo.github.io/games/giochi.html",
                        backText: "Torna al Catalogo",
                        backUrl: "https://prof-memmo.github.io/games/giochi.html"
                    });
                    return false;
                }
            }

            if (user) {
                const db = window.db || (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore());
                let userSub = 'base';

                if (db) {
                    try {
                        const snap = await db.collection('hub_users').doc(user.uid).get();
                        if (snap.exists) {
                            const data = snap.data();
                            userSub = data.subscription || data.abbonamento || 'base';
                        }
                    } catch (e) {
                        console.warn("HubSubscriptionGuard: fallback lettura utente:", e);
                    }
                }

                const planAllowed = this.isPlanAllowed(userSub);
                if (planAllowed) {
                    this.hideBlockOverlay();
                    return true;
                } else {
                    this.showBlockOverlay({
                        title: "Piano Non Compatibile",
                        text: "Il tuo piano di abbonamento attuale non include l'accesso a questo gioco. Passa al Piano Ecosistema per sbloccare tutti i giochi e materiali.",
                        planLabel: this.PLAN_LABELS[userSub] || userSub,
                        ctaText: "Passa a Ecosistema Completo",
                        ctaUrl: HUB_PORTAL_URL
                    });
                    return false;
                }
            }

            // Utente non autenticato e nessun codice squadra su vista protetta
            const isPrev = window.location.pathname.indexOf('/preview') !== -1;
            const portalUrl = isPrev 
                ? `https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/portal.html?redirect=${this.gameId}`
                : `https://prof-memmo.github.io/prof-memmo-gestione-siti/portal.html?redirect=${this.gameId}`;

            this.showBlockOverlay({
                title: "Accesso Riservato",
                text: "Questo gioco fa parte dell'Ecosistema Didattico Prof. Memmo ed è riservato agli utenti registrati o agli studenti delle classi attive.",
                planLabel: "Ospite (Non autenticato)",
                ctaText: "Accedi tramite Hub",
                ctaIcon: "fa-right-to-bracket",
                ctaUrl: portalUrl,
                backText: "Torna Indietro",
                onBack: () => {
                    this.hideBlockOverlay();
                }
            });

            return false;
        },

        showBlockOverlay: function (details = {}) {
            this.isBlocked = true;
            const overlay = document.getElementById('pm-subscription-overlay');
            if (!overlay) return;

            if (details.title) document.getElementById('pm-guard-title').textContent = details.title;
            if (details.text) document.getElementById('pm-guard-text').textContent = details.text;
            if (details.planLabel) document.getElementById('pm-guard-user-plan').textContent = details.planLabel;
            
            const avatarImg = document.getElementById('pm-guard-avatar');
            if (avatarImg) {
                if (details.avatarSrc) {
                    avatarImg.src = details.avatarSrc;
                } else {
                    avatarImg.src = 'https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/avatars/capibara-lock.png';
                }
            }
            
            const ctaBtn = document.getElementById('pm-guard-cta-btn');
            if (ctaBtn) {
                const iconClass = details.ctaIcon || 'fa-crown';
                if (details.ctaText) ctaBtn.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${details.ctaText}`;
                if (details.ctaUrl) ctaBtn.href = details.ctaUrl;
            }

            const backBtn = document.getElementById('pm-guard-btn-back');
            if (backBtn) {
                if (details.backText) backBtn.textContent = details.backText;
                if (details.onBack) {
                    backBtn.onclick = (e) => {
                        e.preventDefault();
                        this.hideBlockOverlay();
                        details.onBack();
                    };
                } else if (details.backUrl) {
                    backBtn.href = details.backUrl;
                    backBtn.onclick = null;
                }
            }

            overlay.classList.add('pm-guard-active');
            document.body.style.overflow = 'hidden';
        },

        hideBlockOverlay: function () {
            this.isBlocked = false;
            const overlay = document.getElementById('pm-subscription-overlay');
            if (overlay) {
                overlay.classList.remove('pm-guard-active');
            }
            document.body.style.overflow = '';
        }
    };

    window.HubSubscriptionGuard = HubSubscriptionGuard;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => HubSubscriptionGuard.init());
    } else {
        HubSubscriptionGuard.init();
    }
})();
