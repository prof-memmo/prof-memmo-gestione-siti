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
            if (p.includes('ecosistema') || p === 'docente_ecosistema') return 'docente_ecosistema';
            if (p.includes('docente') || p === 'docente_didattico') return 'docente_didattico';
            if (p.includes('viandante')) return 'viandante';
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
                        <a href="https://prof-memmo.github.io/games/giochi.html" class="pm-guard-btn-back">
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
        }
    };

    window.HubSubscriptionGuard = HubSubscriptionGuard;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => HubSubscriptionGuard.init());
    } else {
        HubSubscriptionGuard.init();
    }
})();
