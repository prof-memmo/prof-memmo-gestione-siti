import os
import sys
import time
try:
    from http.server import ThreadingHTTPServer as HTTPServerBase
except ImportError:
    from http.server import HTTPServer as HTTPServerBase
from http.server import SimpleHTTPRequestHandler
import threading
from playwright.sync_api import sync_playwright

PORT = 8101
WORKSPACE_DIR = "/Users/guglielmopiersanti/.gemini/antigravity-ide/scratch/la-ruota-geografica"
SHARED_DIR = "/Users/guglielmopiersanti/.gemini/antigravity-ide/scratch/prof-memmo-admin-gestione-generale/shared"
ARTIFACTS_DIR = os.environ.get("ARTIFACTS_DIR", "/Users/guglielmopiersanti/.gemini/antigravity/brain/33706f47-51f8-4772-9423-8c984c6afda0")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

class CustomHTTPHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def translate_path(self, path):
        if path.startswith('/shared/'):
            rel_path = path[len('/shared/'):]
            return os.path.join(SHARED_DIR, rel_path.split('?')[0])
        return super().translate_path(path)

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError):
            pass

server = HTTPServerBase(('127.0.0.1', PORT), lambda *args, **kwargs: CustomHTTPHandler(*args, directory=WORKSPACE_DIR, **kwargs))
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()
print(f"[TEST] Server HTTP attivo su porta {PORT} per La Ruota Geografica")

with sync_playwright() as p:
    print("\n==========================================================================")
    print(" COLLAUDO TOTALE ESPERIENZA DI GIOCO: LA RUOTA GEOGRAFICA")
    print(" 1. PAYWALL CAPIBARA (PIANO BASE) | 2. DOCENTE LIM | 3. STUDENTE MOBILE | 4. VIANDANTE TABLET")
    print("==========================================================================\n")

    browser = p.chromium.launch(headless=True)

    def setup_route_intercept(page):
        page.route("**/hub-subscription-guard.js*", lambda r: r.fulfill(
            path=os.path.join(SHARED_DIR, "hub-subscription-guard.js"),
            content_type="application/javascript"
        ))
        page.route("**/legal-modal.js*", lambda r: r.fulfill(
            path=os.path.join(SHARED_DIR, "legal-modal.js"),
            content_type="application/javascript"
        ))

    # =========================================================================
    # FASE 1: TEST DI SICUREZZA PAYWALL (Utente Piano Base non autorizzato)
    # =========================================================================
    print("--- [FASE 1] Verifica Paywall Capibara (Piano Base) - Desktop 1280x800 ---")
    context_paywall = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_paywall = context_paywall.new_page()
    setup_route_intercept(page_paywall)

    paywall_script = """
    const mockUserBase = {
        uid: 'user_base_geo',
        email: 'docente.base@scuola.it',
        displayName: 'Prof. Base Non Abbonato',
        role: 'docente',
        subscription: 'base',
        plan: 'base'
    };

    localStorage.setItem('currentUser', JSON.stringify(mockUserBase));
    localStorage.setItem('hub_user', JSON.stringify(mockUserBase));
    localStorage.setItem('hub_user_name', 'PROF. BASE');
    localStorage.setItem('hub_user_role', 'docente');

    const mockDbBase = {
        collection: (colName) => {
            if (colName === 'games_status') {
                return {
                    doc: () => ({
                        onSnapshot: (cb) => {
                            cb({
                                exists: true,
                                data: () => ({
                                    isActive: true,
                                    allowedPlans: { base: false, docente_didattico: true, docente_ecosistema: true, viandante: true }
                                })
                            });
                            return () => {};
                        }
                    })
                };
            }
            if (colName === 'hub_users') {
                return {
                    doc: () => ({
                        get: async () => ({
                            exists: true,
                            data: () => mockUserBase
                        })
                    })
                };
            }
            return {
                doc: () => ({
                    get: async () => ({ exists: false, data: () => ({}) }),
                    set: async () => {},
                    update: async () => {}
                })
            };
        }
    };

    Object.defineProperty(window, 'db', { get: () => mockDbBase, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbBase, set: () => {}, configurable: true });

    window.addEventListener('DOMContentLoaded', () => {
        if (window.App) {
            window.App.currentUser = mockUserBase;
        }
    });
    """
    page_paywall.add_init_script(paywall_script)
    page_paywall.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_paywall.wait_for_timeout(1500)

    # Tentativo di avviare il setup della partita protetta
    page_paywall.evaluate("""async () => {
        if (window.App && typeof window.App.startSetupFlow === 'function') {
            await window.App.startSetupFlow();
        }
    }""")
    page_paywall.wait_for_timeout(1000)

    paywall_check = page_paywall.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const title = document.getElementById('pm-guard-title')?.innerText || '';
        const userPlan = document.getElementById('pm-guard-user-plan')?.innerText || '';
        const avatarImg = document.getElementById('pm-guard-avatar')?.src || '';
        return {
            isBlocked: !!isBlocked,
            title: title,
            userPlan: userPlan,
            hasCapibaraAvatar: avatarImg.includes('capibara') || avatarImg.includes('lock')
        };
    }""")
    print(f"1.1 Controllo Paywall Capibara Attivo: {paywall_check}")
    assert paywall_check['isBlocked'], "ERRORE: Il Capibara non si è attivato per l'utente con piano Base!"
    assert "Piano" in paywall_check['title'] or "Accesso" in paywall_check['title'], f"Titolo overlay inatteso: {paywall_check['title']}"

    shot_paywall = os.path.join(ARTIFACTS_DIR, "ruota_capibara_paywall_attivo.png")
    page_paywall.screenshot(path=shot_paywall, full_page=False)
    print(f"-> Screenshot Paywall salvato: {shot_paywall}")
    context_paywall.close()

    # =========================================================================
    # FASE 2: DOCENTE SU CATTEDRA LIM (1920x1080) - Sfida a 3 Squadre
    # =========================================================================
    print("\n--- [FASE 2] Docente su Cattedra LIM (1920x1080) - Sfida a 3 Squadre ---")
    context_docente = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page_docente = context_docente.new_page()
    setup_route_intercept(page_docente)

    docente_script = """
    const mockUserDocente = {
        uid: 'docente_geo_lim_01',
        email: 'aurora.docente@liceo.it',
        displayName: 'Prof.ssa Aurora B.',
        role: 'docente',
        subscription: 'docente_ecosistema',
        plan: 'docente_ecosistema'
    };

    localStorage.setItem('currentUser', JSON.stringify(mockUserDocente));
    localStorage.setItem('hub_user', JSON.stringify(mockUserDocente));
    localStorage.setItem('hub_user_name', 'PROF.SSA AURORA B.');
    localStorage.setItem('hub_user_role', 'docente');

    const mockDbDocente = {
        collection: (colName) => {
            if (colName === 'games_status') {
                return {
                    doc: () => ({
                        onSnapshot: (cb) => {
                            cb({
                                exists: true,
                                data: () => ({
                                    isActive: true,
                                    allowedPlans: { base: false, docente_didattico: true, docente_ecosistema: true, viandante: true }
                                })
                            });
                            return () => {};
                        }
                    })
                };
            }
            if (colName === 'hub_users') {
                return {
                    doc: () => ({
                        get: async () => ({
                            exists: true,
                            data: () => mockUserDocente
                        })
                    })
                };
            }
            return {
                doc: () => ({
                    get: async () => ({ exists: false, data: () => ({}) }),
                    set: async () => {},
                    update: async () => {}
                })
            };
        }
    };

    Object.defineProperty(window, 'db', { get: () => mockDbDocente, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbDocente, set: () => {}, configurable: true });

    window.addEventListener('DOMContentLoaded', () => {
        if (window.App) {
            window.App.currentUser = mockUserDocente;
        }
    });
    """
    page_docente.add_init_script(docente_script)
    page_docente.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_docente.wait_for_timeout(1500)

    # 2.1 Avvio Setup Partita a 3 Squadre
    page_docente.evaluate("""async () => {
        const mockUserDocente = {
            uid: 'docente_geo_lim_01',
            email: 'aurora.docente@liceo.it',
            displayName: 'Prof.ssa Aurora B.',
            role: 'docente',
            subscription: 'docente_ecosistema',
            plan: 'docente_ecosistema'
        };
        window.App.currentUser = mockUserDocente;
        await window.App.startSetupFlow();
        window.App.selectGameMode('teams', 3);
        await window.App.selectTopic('astronomia');
    }""")
    page_docente.wait_for_timeout(1000)

    # 2.2 Selezione Cattedra del Prof ("IL PROF.") con Categoria REEL e apertura Carta Sfida
    lim_game_state = page_docente.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && overlay.classList.contains('pm-guard-active');
        
        // Simula scelta Cattedra Docente
        window.App.currentMode = { id: 'il_prof', name: 'IL PROF.', icon: '👨‍🏫', desc: 'Assegnazione diretta del docente' };
        window.App.extractAndShowChallenge(window.WHEEL_CATEGORIES[0]); // REEL
        
        const cardTitle = document.getElementById('card-badge-cat')?.innerText || '';
        const cardMode = document.getElementById('card-badge-mode')?.innerText || '';
        const cardPrompt = document.getElementById('card-prompt-text')?.innerText || '';
        const modalVisible = !document.getElementById('challenge-card-modal')?.classList.contains('hidden');
        
        return {
            isBlocked: !!isBlocked,
            teamsCount: window.App.teams.length,
            activeTeam: window.App.teams[window.App.currentTeamIndex].name,
            cardTitle: cardTitle,
            cardMode: cardMode,
            hasPrompt: cardPrompt.length > 5,
            modalVisible: modalVisible
        };
    }""")
    print(f"2.1 Esito Partita LIM e Carta Sfida Cattedra: {lim_game_state}")
    assert not lim_game_state['isBlocked'], "ERRORE: Docente bloccato ingiustamente dal Paywall!"
    assert lim_game_state['teamsCount'] == 3, f"Numero squadre inatteso: {lim_game_state['teamsCount']}"
    assert lim_game_state['modalVisible'], "ERRORE: Modale della carta sfida non visibile!"

    # Salva screenshot cattedra e carta prova LIM
    shot_lim_cattedra = os.path.join(ARTIFACTS_DIR, "ruota_cattedra_docente_lim.png")
    page_docente.screenshot(path=shot_lim_cattedra, full_page=False)
    print(f"-> Screenshot Cattedra LIM salvato: {shot_lim_cattedra}")

    # 2.3 Avvio Timer, Superamento Prova (+1 pt) e passaggio a Tabellone
    scoreboard_state = page_docente.evaluate("""async () => {
        window.App.startTimer();
        window.App.awardPointAndNextTurn(); // Squadra 1 fa punto, passa a Squadra 2
        await window.App.showView('view-tabellone');
        
        const teams = window.App.teams;
        const s1Score = teams[0].score;
        const s2Score = teams[1].score;
        const currentTurnName = teams[window.App.currentTeamIndex].name;
        
        return {
            s1Score: s1Score,
            s2Score: s2Score,
            nextTurnTeam: currentTurnName,
            isTabelloneActive: !document.getElementById('view-tabellone')?.classList.contains('hidden')
        };
    }""")
    print(f"2.2 Esito Assegnazione Punti e Tabellone LIM: {scoreboard_state}")
    assert scoreboard_state['s1Score'] == 1, "Punteggio Squadra 1 non aggiornato a 1!"
    assert scoreboard_state['nextTurnTeam'] == "Squadra 2", "Turno non passato a Squadra 2!"
    assert scoreboard_state['isTabelloneActive'], "Vista Tabellone non attiva!"

    shot_lim_tabellone = os.path.join(ARTIFACTS_DIR, "ruota_tabellone_squadre_lim.png")
    page_docente.screenshot(path=shot_lim_tabellone, full_page=False)
    print(f"-> Screenshot Tabellone LIM salvato: {shot_lim_tabellone}")
    context_docente.close()

    # =========================================================================
    # FASE 3: STUDENTE MOBILE (390x844) - Partita Singola
    # =========================================================================
    print("\n--- [FASE 3] Studente Mobile (390x844) - Partita Singola ---")
    context_studente = browser.new_context(
        viewport={'width': 390, 'height': 844},
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
    )
    page_studente = context_studente.new_page()
    setup_route_intercept(page_studente)

    studente_script = """
    const mockUserStudente = {
        uid: 'studente_geo_007',
        email: 'mario.rossi@studenti.scuola.it',
        displayName: 'Mario Rossi',
        role: 'studente',
        classCode: 'GEO-ASTR1',
        subscription: 'free'
    };

    localStorage.setItem('currentUser', JSON.stringify(mockUserStudente));
    localStorage.setItem('hub_user', JSON.stringify(mockUserStudente));
    localStorage.setItem('hub_user_name', 'MARIO ROSSI');
    localStorage.setItem('hub_user_role', 'studente');
    localStorage.setItem('hub_user_class', 'GEO-ASTR1');

    const mockClassGeo = {
        id: 'geo_astr1',
        code: 'GEO-ASTR1',
        name: '1A - Geografia Astronomica',
        teacherEmail: 'aurora.docente@liceo.it',
        teacherId: 'docente_geo_lim_01'
    };

    const mockTeacherDocente = {
        uid: 'docente_geo_lim_01',
        email: 'aurora.docente@liceo.it',
        displayName: 'Prof.ssa Aurora B.',
        role: 'docente',
        subscription: 'docente_ecosistema',
        plan: 'docente_ecosistema'
    };

    const mockDbStudente = {
        collection: (colName) => {
            if (colName === 'games_status') {
                return {
                    doc: () => ({
                        onSnapshot: (cb) => {
                            cb({
                                exists: true,
                                data: () => ({
                                    isActive: true,
                                    allowedPlans: { base: false, docente_didattico: true, docente_ecosistema: true, viandante: true }
                                })
                            });
                            return () => {};
                        }
                    })
                };
            }
            if (colName === 'hub_users') {
                return {
                    doc: () => ({
                        get: async () => ({
                            exists: true,
                            data: () => mockTeacherDocente
                        })
                    }),
                    where: (field, op, val) => ({
                        limit: () => ({
                            get: async () => ({
                                empty: false,
                                docs: [{ data: () => mockTeacherDocente }]
                            })
                        })
                    })
                };
            }
            if (colName === 'hub_classes' || colName === 'classes') {
                return {
                    where: (field, op, val) => ({
                        limit: () => ({
                            get: async () => ({
                                empty: false,
                                docs: [{ data: () => mockClassGeo }]
                            })
                        })
                    }),
                    doc: () => ({
                        get: async () => ({
                            exists: true,
                            data: () => mockClassGeo
                        })
                    })
                };
            }
            return {
                doc: () => ({
                    get: async () => ({ exists: false, data: () => ({}) }),
                    set: async () => {},
                    update: async () => {}
                })
            };
        }
    };

    Object.defineProperty(window, 'db', { get: () => mockDbStudente, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbStudente, set: () => {}, configurable: true });
    """
    page_studente.add_init_script(studente_script)
    page_studente.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_studente.wait_for_timeout(1500)

    # 3.1 Avvio partita singolo giocatore percorso Climatologia
    studente_state = page_studente.evaluate("""async () => {
        const mockUserStudente = {
            uid: 'studente_geo_007',
            email: 'mario.rossi@studenti.scuola.it',
            displayName: 'Mario Rossi',
            role: 'studente',
            classCode: 'GEO-ASTR1',
            subscription: 'free'
        };
        window.App.currentUser = mockUserStudente;
        await window.App.startSetupFlow();
        window.App.selectGameMode('single');
        await window.App.selectTopic('climatologia');
        
        // Estrai carta in modalità FREE con categoria QUIZ
        window.App.startWithFreeMode();
        window.App.extractAndShowChallenge(window.WHEEL_CATEGORIES[1]); // QUIZ
        
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && overlay.classList.contains('pm-guard-active');
        const roleBadge = document.getElementById('header-user-role')?.innerText || '';
        const cardTitle = document.getElementById('card-badge-cat')?.innerText || '';
        const modalVisible = !document.getElementById('challenge-card-modal')?.classList.contains('hidden');
        
        return {
            isBlocked: !!isBlocked,
            roleBadge: roleBadge,
            gameMode: window.App.gameMode,
            cardTitle: cardTitle,
            modalVisible: modalVisible
        };
    }""")
    print(f"3.1 Esito Partita Singola Studente Mobile: {studente_state}")
    assert not studente_state['isBlocked'], "ERRORE: Lo studente con codice classe non deve essere bloccato!"
    assert studente_state['roleBadge'] == "STUDENTE", f"Ruolo header inatteso: {studente_state['roleBadge']}"
    assert studente_state['gameMode'] == "single", f"Modalità inattesa: {studente_state['gameMode']}"
    assert studente_state['modalVisible'], "ERRORE: Modale prova quiz non visibile!"

    shot_studente_mobile = os.path.join(ARTIFACTS_DIR, "ruota_studente_mobile_gioco.png")
    page_studente.screenshot(path=shot_studente_mobile, full_page=False)
    print(f"-> Screenshot Studente Mobile salvato: {shot_studente_mobile}")
    context_studente.close()

    # =========================================================================
    # FASE 4: VIANDANTE / GIOCATORE LIBERO SU TABLET (810x1080)
    # =========================================================================
    print("\n--- [FASE 4] Viandante / Giocatore Libero (Tablet 810x1080) ---")
    context_viandante = browser.new_context(
        viewport={'width': 810, 'height': 1080},
        user_agent="Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15"
    )
    page_viandante = context_viandante.new_page()
    setup_route_intercept(page_viandante)

    viandante_script = """
    const mockUserViandante = {
        uid: 'viandante_geo_108',
        email: 'viandante.libero@gmail.com',
        displayName: 'Marco Viandante',
        role: 'viandante',
        subscription: 'viandante',
        plan: 'viandante'
    };

    localStorage.setItem('currentUser', JSON.stringify(mockUserViandante));
    localStorage.setItem('hub_user', JSON.stringify(mockUserViandante));
    localStorage.setItem('hub_user_name', 'MARCO VIANDANTE');
    localStorage.setItem('hub_user_role', 'viandante');

    const mockDbViandante = {
        collection: (colName) => {
            if (colName === 'games_status') {
                return {
                    doc: () => ({
                        onSnapshot: (cb) => {
                            cb({
                                exists: true,
                                data: () => ({
                                    isActive: true,
                                    allowedPlans: { base: false, docente_didattico: true, docente_ecosistema: true, viandante: true }
                                })
                            });
                            return () => {};
                        }
                    })
                };
            }
            if (colName === 'hub_users') {
                return {
                    doc: () => ({
                        get: async () => ({
                            exists: true,
                            data: () => mockUserViandante
                        })
                    })
                };
            }
            return {
                doc: () => ({
                    get: async () => ({ exists: false, data: () => ({}) }),
                    set: async () => {},
                    update: async () => {}
                })
            };
        }
    };

    Object.defineProperty(window, 'db', { get: () => mockDbViandante, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbViandante, set: () => {}, configurable: true });

    window.addEventListener('DOMContentLoaded', () => {
        if (window.App) {
            window.App.currentUser = mockUserViandante;
        }
    });
    """
    page_viandante.add_init_script(viandante_script)
    page_viandante.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_viandante.wait_for_timeout(1500)

    # 4.1 Avvio partita percorso "La Globalizzazione"
    viandante_state = page_viandante.evaluate("""async () => {
        const mockUserViandante = {
            uid: 'viandante_geo_108',
            email: 'viandante.libero@gmail.com',
            displayName: 'Marco Viandante',
            role: 'viandante',
            subscription: 'viandante',
            plan: 'viandante'
        };
        window.App.currentUser = mockUserViandante;
        await window.App.startSetupFlow();
        window.App.selectGameMode('single');
        await window.App.selectTopic('globalizzazione');
        
        // Estrai categoria PODCAST
        window.App.startWithFreeMode();
        window.App.extractAndShowChallenge(window.WHEEL_CATEGORIES[4]); // PODCAST
        
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && overlay.classList.contains('pm-guard-active');
        const cardTitle = document.getElementById('card-badge-cat')?.innerText || '';
        const modalVisible = !document.getElementById('challenge-card-modal')?.classList.contains('hidden');
        
        return {
            isBlocked: !!isBlocked,
            currentTopic: window.App.currentTopic,
            cardTitle: cardTitle,
            modalVisible: modalVisible
        };
    }""")
    print(f"4.1 Esito Viandante Tablet Globalizzazione: {viandante_state}")
    assert not viandante_state['isBlocked'], "ERRORE: Il viandante abbonato non deve essere bloccato!"
    assert viandante_state['currentTopic'] == "globalizzazione", f"Topic inatteso: {viandante_state['currentTopic']}"
    assert viandante_state['modalVisible'], "ERRORE: Modale sfida podcast non visibile!"

    shot_viandante_tablet = os.path.join(ARTIFACTS_DIR, "ruota_viandante_tablet.png")
    page_viandante.screenshot(path=shot_viandante_tablet, full_page=False)
    print(f"-> Screenshot Viandante salvato: {shot_viandante_tablet}")
    context_viandante.close()

    browser.close()

print("\n==========================================================================")
print(" COLLAUDO TOTALE LA RUOTA GEOGRAFICA COMPLETATO CON SUCCESSO SENZA ERRORI!")
print("==========================================================================\n")
sys.exit(0)
