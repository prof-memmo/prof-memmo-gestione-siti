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
    const HUB_PORTAL_URL = 'https://games.profmemmo.it/prezzi.html';

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
            this.checkSsoBridge();
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
                .pm-guard-icon {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    background: #fee2e2;
                    color: #ef4444;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.2rem;
                    margin-bottom: 1.2rem;
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
                    <div class="pm-guard-icon">🔒</div>
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
                        <a href="https://games.profmemmo.it/giochi.html" class="pm-guard-btn-back">
                            Torna al Catalogo Giochi
                        </a>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        },

        listenGameStatus: function () {
            const getDb = () => window.db || (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore());
            
            const attach = () => {
                const db = getDb();
                if (!db) {
                    setTimeout(attach, 400);
                    return;
                }

                try {
                    this.statusListenerUnsubscribe = db.collection('games_status').doc(this.gameId).onSnapshot(doc => {
                        if (doc.exists) {
                            const data = doc.data();
                            this.currentAllowedPlans = data.allowedPlans || {
                                base: false,
                                viandante: true,
                                docente_didattico: false,
                                docente_ecosistema: true
                            };
                        } else {
                            this.currentAllowedPlans = {
                                base: false,
                                viandante: true,
                                docente_didattico: false,
                                docente_ecosistema: true
                            };
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

        validateStudentAccess: async function (teamCode) {
            if (!teamCode) {
                return { allowed: false, reason: "Nessun codice squadra fornito." };
            }

            const db = window.db || (typeof firebase !== 'undefined' && firebase.firestore());
            if (!db) {
                return { allowed: true };
            }

            try {
                const snapTeam = await db.collection('teams').where("joinCode", "==", teamCode.toUpperCase()).limit(1).get();
                if (snapTeam.empty) {
                    return { allowed: false, reason: "Codice squadra non valido o non trovato." };
                }

                const teamData = snapTeam.docs[0].data();
                const ownerEmail = (teamData.ownerEmail || '').toLowerCase();

                if (ownerEmail === SUPER_ADMIN_EMAIL) {
                    return { allowed: true };
                }

                if (!ownerEmail) {
                    return { allowed: false, reason: "Squadra non associata a un docente valido." };
                }

                let teacherSub = 'base';
                const snapUsers = await db.collection('hub_users').where("email", "==", ownerEmail).limit(1).get();
                if (!snapUsers.empty) {
                    const uData = snapUsers.docs[0].data();
                    teacherSub = uData.subscription || uData.abbonamento || 'base';
                }

                const isAllowed = this.isPlanAllowed(teacherSub);
                return {
                    allowed: isAllowed,
                    teacherPlan: teacherSub,
                    reason: isAllowed ? null : "La classe appartiene a un docente il cui piano attuale non include questo gioco."
                };
            } catch (e) {
                console.error("HubSubscriptionGuard validateStudentAccess error:", e);
                return { allowed: true };
            }
        },

        verifyAccess: async function (options = {}) {
            const { user, role, teamCode, isPublicView } = options;

            if (isPublicView) {
                this.hideBlockOverlay();
                return true;
            }

            if (user && user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
                this.hideBlockOverlay();
                return true;
            }

            if (teamCode && (role === 'studente' || !user)) {
                const studentCheck = await this.validateStudentAccess(teamCode);
                if (studentCheck.allowed) {
                    this.hideBlockOverlay();
                    return true;
                } else {
                    this.showBlockOverlay({
                        title: "Accesso Classe Non Disponibile",
                        text: studentCheck.reason || "La tua classe non ha accesso a questo gioco.",
                        planLabel: `Docente (${this.PLAN_LABELS[studentCheck.teacherPlan] || studentCheck.teacherPlan || 'Base'})`,
                        ctaText: "Contatta il Docente",
                        ctaUrl: "mailto:prof.memmo@gmail.com?subject=Richiesta%20Info%20Piano"
                    });
                    return false;
                }
            }

            if (user) {
                const db = window.db || (typeof firebase !== 'undefined' && firebase.firestore());
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

            return false;
        },

        showBlockOverlay: function (details = {}) {
            this.isBlocked = true;
            const overlay = document.getElementById('pm-subscription-overlay');
            if (!overlay) return;

            if (details.title) document.getElementById('pm-guard-title').textContent = details.title;
            if (details.text) document.getElementById('pm-guard-text').textContent = details.text;
            if (details.planLabel) document.getElementById('pm-guard-user-plan').textContent = details.planLabel;
            
            const ctaBtn = document.getElementById('pm-guard-cta-btn');
            if (ctaBtn) {
                if (details.ctaText) ctaBtn.innerHTML = `<i class="fa-solid fa-crown"></i> ${details.ctaText}`;
                if (details.ctaUrl) ctaBtn.href = details.ctaUrl;
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
        },

        checkSsoBridge: function () {
            let session = null;

            // 1. Controlla prima l'hash URL (#pm_sso=...)
            if (window.location.hash && window.location.hash.includes('pm_sso=')) {
                try {
                    const rawHash = window.location.hash.substring(1);
                    const params = new URLSearchParams(rawHash);
                    const ssoRaw = params.get('pm_sso');
                    if (ssoRaw) {
                        session = JSON.parse(decodeURIComponent(ssoRaw));
                        params.delete('pm_sso');
                        const remaining = params.toString();
                        const newUrl = window.location.pathname + window.location.search + (remaining ? '#' + remaining : '');
                        window.history.replaceState(null, '', newUrl);
                    }
                } catch (e) {
                    console.warn("SSO hash bridge error:", e);
                }
            }

            // 2. Se non presente nell'hash, cerca nel cookie di dominio (.profmemmo.it)
            if (!session) {
                try {
                    const cookies = document.cookie.split(';');
                    for (let c of cookies) {
                        const parts = c.trim().split('=');
                        if (parts[0] === 'pm_sso_session' && parts[1]) {
                            session = JSON.parse(decodeURIComponent(parts.slice(1).join('=')));
                            break;
                        }
                    }
                } catch (e) {
                    console.warn("SSO cookie bridge error:", e);
                }
            }

            // 3. Se trovata una sessione SSO valida, applicala
            if (session && session.email) {
                this.applySessionToGame(session);
            }
        },

        applySessionToGame: function (session) {
            const isSuperAdmin = (session.email.toLowerCase() === SUPER_ADMIN_EMAIL);
            const userRole = isSuperAdmin ? 'admin' : (session.role || 'docente');
            const userPlan = isSuperAdmin ? 'docente_ecosistema' : (session.subscription || 'base');
            const userName = session.displayName || (isSuperAdmin ? 'Prof. Memmo' : 'Docente');
            const userAvatar = session.avatar || 'https://profmemmo.it/shared/assets/avatars/6.png';

            try {
                // Salva sessione unificata nello storage
                localStorage.setItem('hub_user_session', JSON.stringify(session));
                localStorage.setItem('hub_user_name', userName);
                localStorage.setItem('hub_user_avatar', userAvatar);
                localStorage.setItem('hub_user_role', userRole);
                localStorage.setItem('hub_user_plan', userPlan);

                // Fantaletteratura
                localStorage.setItem('fanta_user_name', userName);
                localStorage.setItem('fanta_user_avatar', userAvatar);
                localStorage.setItem('fanta_user_role', userRole);

                // Palestra di Riflessione
                const palestraUser = {
                    uid: session.uid || 'sso_' + Math.random().toString(36).substr(2, 9),
                    name: userName,
                    avatar: userAvatar,
                    role: userRole,
                    piano: userPlan,
                    points: 0,
                    isGuest: false,
                    email: session.email,
                    setupComplete: true
                };
                localStorage.setItem('palestra_user', JSON.stringify(palestraUser));
                localStorage.setItem('palestra_user_plan', userPlan);
                if (window.Auth) {
                    window.Auth._user = palestraUser;
                    if (typeof window.hideLoginOverlay === 'function') {
                        window.hideLoginOverlay();
                    }
                }

                // L'Oratore
                const oratoreUser = {
                    role: userRole,
                    plan: userPlan,
                    name: userName,
                    avatar: userAvatar,
                    xp: 150
                };
                localStorage.setItem('pm_oratore_user', JSON.stringify(oratoreUser));
                if (window.Auth && (!window.Auth.user || window.Auth.role === 'guest')) {
                    window.Auth.user = oratoreUser;
                    window.Auth.role = userRole;
                    window.Auth.plan = userPlan;
                    window.Auth.name = userName;
                    window.Auth.avatar = userAvatar;
                    if (typeof window.Auth.updateUI === 'function') window.Auth.updateUI();
                }

                // La Rotta degli Eroi
                const eroiUser = {
                    uid: session.uid || 'sso_' + Math.random().toString(36).substr(2, 9),
                    name: userName,
                    displayName: userName,
                    email: session.email,
                    role: userRole,
                    plan: userPlan,
                    avatar: userAvatar
                };
                localStorage.setItem('eroi_user', JSON.stringify(eroiUser));
                if (window.Auth) {
                    window.Auth._user = eroiUser;
                    if (typeof window.Auth._resolveReady === 'function') window.Auth._resolveReady();
                }

                // La Corte della Commedia
                const commediaUser = {
                    uid: session.uid || 'sso_' + Math.random().toString(36).substr(2, 9),
                    name: userName,
                    displayName: userName,
                    email: session.email,
                    role: userRole,
                    plan: userPlan,
                    avatar: userAvatar
                };
                localStorage.setItem('commedia_user', JSON.stringify(commediaUser));
                localStorage.setItem('user', JSON.stringify(commediaUser));

                // Sessione unificata per il portale e il profilo
                localStorage.setItem('pm_sso_session', JSON.stringify(session));
            } catch (e) {
                console.warn("SSO storage update warning:", e);
            }

            // Sincronizza UI header e nasconde eventuali blocchi
            this.syncHeaderUI(userName, userRole, userAvatar);

            if (isSuperAdmin || this.isPlanAllowed(userPlan)) {
                this.hideBlockOverlay();
            }
        },

        syncHeaderUI: function (name, role, avatar) {
            const update = () => {
                const nameEl = document.getElementById('header-user-name');
                const roleEl = document.getElementById('header-user-role');
                const avatarImg = document.getElementById('header-user-avatar-img') || document.getElementById('header-user-avatar');
                const dropdownTitle = document.getElementById('dropdown-user-title') || document.getElementById('dropdown-user-name');
                const dropdownSub = document.getElementById('dropdown-user-subtitle') || document.getElementById('dropdown-user-role-sub');
                const loginBtn = document.getElementById('btn-login-hub-dropdown');
                const profileBtn = document.getElementById('btn-profile-dropdown');
                const inviteBtn = document.getElementById('btn-invite-dropdown');
                const bottomRow = document.getElementById('dropdown-bottom-row');

                const roleLabel = (role === 'admin' ? 'AMMINISTRATORE' : (role === 'docente' ? 'DOCENTE' : (role === 'viandante' ? 'VIANDANTE' : role.toUpperCase())));

                if (nameEl) nameEl.textContent = name.toUpperCase();
                if (roleEl) roleEl.textContent = roleLabel;
                if (avatarImg && avatar) avatarImg.src = avatar;
                if (dropdownTitle) dropdownTitle.textContent = name.toUpperCase();
                if (dropdownSub) dropdownSub.textContent = roleLabel;
                if (loginBtn) loginBtn.style.display = 'none';
                if (profileBtn) profileBtn.style.display = 'flex';
                if (inviteBtn) inviteBtn.style.display = 'flex';
                if (bottomRow) bottomRow.style.display = 'flex';

                // Se presente modale login (es. Palestra), nascondila
                const loginOverlay = document.getElementById('login-overlay');
                if (loginOverlay) loginOverlay.classList.add('hidden');
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', update);
            } else {
                update();
            }
        }
    };

    window.HubSubscriptionGuard = HubSubscriptionGuard;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => HubSubscriptionGuard.init());
    } else {
        HubSubscriptionGuard.init();
    }
})();
