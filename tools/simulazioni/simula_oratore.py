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

PORT = 8098
WORKSPACE_DIR = "/Users/guglielmopiersanti/.gemini/antigravity-ide/scratch/l-oratore"
SHARED_DIR = "/Users/guglielmopiersanti/.gemini/antigravity-ide/scratch/prof-memmo-admin-gestione-generale/shared"
ARTIFACTS_DIR = os.environ.get("ARTIFACTS_DIR", "/Users/guglielmopiersanti/.gemini/antigravity/brain/33706f47-51f8-4772-9423-8c984c6afda0")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

class CustomHTTPHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def translate_path(self, path):
        # Serve shared directory when requested
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
print(f"[TEST] Server HTTP attivo su porta {PORT} per L'Oratore")

with sync_playwright() as p:
    print("\n==========================================================================")
    print(" COLLAUDO TOTALE ESPERIENZA DI GIOCO: L'ORATORE v3.0")
    print(" 1. PAYWALL CAPIBARA (PIANO BASE) | 2. DOCENTE LIM | 3. MODALITA' USARE | 4. VIANDANTE PARTY")
    print("==========================================================================\n")

    browser = p.chromium.launch(headless=True)

    # =========================================================================
    # FASE 1: TEST DI SICUREZZA PAYWALL (Utente non abbonato con Piano Base)
    # Verifica che il Capibara SI ATTIVI immediatamente all'avvio della sfida
    # =========================================================================
    print("--- [FASE 1] Verifica Paywall Capibara (Piano Base) - Desktop 1280x800 ---")
    context_paywall = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_paywall = context_paywall.new_page()

    paywall_script = """
    const mockUserBase = {
        uid: 'user_base_unpaid',
        email: 'ospite.base@gmail.com',
        name: 'Ospite Base Non Abbonato',
        role: 'guest',
        plan: 'base',
        subscription: 'base',
        xp: 50
    };

    localStorage.setItem('pm_oratore_user', JSON.stringify(mockUserBase));

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
    """
    page_paywall.add_init_script(paywall_script)
    page_paywall.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_paywall.wait_for_timeout(2000)

    # L'utente con piano Base clicca su "Inizia Nuova Sfida"
    page_paywall.evaluate("""async () => {
        if (window.App && typeof window.App.startSetupFlow === 'function') {
            await window.App.startSetupFlow();
        }
    }""")
    page_paywall.wait_for_timeout(1000)

    # Verifica che il Capibara sia regolarmente attivo a protezione del gioco
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

    shot_paywall = os.path.join(ARTIFACTS_DIR, "oratore_capibara_paywall_attivo.png")
    page_paywall.screenshot(path=shot_paywall, full_page=False)
    print(f"-> Screenshot Paywall salvato: {shot_paywall}")
    context_paywall.close()

    # =========================================================================
    # FASE 2: DOCENTE SU CATTEDRA LIM (Piano docente_ecosistema)
    # Flusso completo: Setup -> Round Categoria -> Discorso 2 Min -> Valutazione -> Tabellone HD
    # =========================================================================
    print("\n--- [FASE 2] Docente su Cattedra LIM (1920x1080) - Modalità PROIBITE ---")
    context_docente = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page_docente = context_docente.new_page()

    docente_script = """
    const mockUserDocente = {
        uid: 'doc_oratore_eco',
        email: 'prof.beatrice@liceoclassico.edu.it',
        name: 'Prof.ssa Beatrice',
        displayName: 'Prof.ssa Beatrice',
        role: 'docente',
        plan: 'docente_ecosistema',
        subscription: 'docente_ecosistema',
        avatar: 'https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/avatars/6.png',
        xp: 450
    };

    localStorage.setItem('pm_oratore_user', JSON.stringify(mockUserDocente));

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
    """
    page_docente.add_init_script(docente_script)
    page_docente.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_docente.wait_for_timeout(2000)

    # 2.1 Verifica assenza del Capibara per il Docente Ecosistema
    doc_guard_check = page_docente.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const userName = document.getElementById('header-user-name')?.innerText || '';
        const userRole = document.getElementById('header-user-role')?.innerText || '';
        return { isBlocked: !!isBlocked, userName: userName, userRole: userRole };
    }""")
    print(f"2.1 Accesso Docente Ecosistema: {doc_guard_check}")
    assert not doc_guard_check['isBlocked'], "ERRORE: Il Capibara blocca illegittimamente il Docente Ecosistema!"
    assert "BEATRICE" in doc_guard_check['userName'], f"Nome docente non sincronizzato: {doc_guard_check['userName']}"
    assert "DOCENTE" in doc_guard_check['userRole'], f"Ruolo docente non riconosciuto: {doc_guard_check['userRole']}"

    # 2.2 Avvio Setup Partita a 2 Squadre
    page_docente.evaluate("""() => {
        App.startSetupFlow();
    }""")
    page_docente.wait_for_timeout(500)

    # Step 1: Scelta 2 Squadre
    page_docente.evaluate("""() => {
        App.selectTeamsCount(2);
    }""")
    page_docente.wait_for_timeout(500)

    # Step 2: Assegnazione Pedine e Nomi Squadra ("I Filosofi" vs "I Sofisti")
    page_docente.evaluate("""() => {
        // Squadra 1 (Rossa)
        App.selectedSetup.teams[0].name = "I Filosofi";
        App.selectPawnCandidate('assets/pedine/1.png');
        // Squadra 2 (Blu)
        App.selectedSetup.teams[1].name = "I Sofisti";
        App.selectPawnCandidate('assets/pedine/2.png');
    }""")
    page_docente.wait_for_timeout(500)

    # Step 3: Scelta Modalità "Parole Proibite"
    page_docente.evaluate("""() => {
        App.selectMode('PROIBITE');
    }""")
    page_docente.wait_for_timeout(500)

    # Step 4: Scelta Livello QCER B1 ("L'Oratore della Piazza")
    page_docente.evaluate("""() => {
        App.selectLevel('b1');
    }""")
    page_docente.wait_for_timeout(800)

    # 2.3 Scelta Categoria Round: "Mito & Epica Classica"
    round_cat_check = page_docente.evaluate("""() => {
        const catHeader = document.getElementById('round-category-header')?.innerText || '';
        return {
            currentView: App.currentView,
            header: catHeader
        };
    }""")
    print(f"2.3 Schermata Categoria Round: {round_cat_check}")
    assert round_cat_check['currentView'] == 'view-round-select-category', "Non si è aperta la scelta della categoria round!"

    page_docente.evaluate("""() => {
        GameEngine.selectRoundDeck('epica');
    }""")
    page_docente.wait_for_timeout(1000)

    # 2.4 Schermata Sfida Oratoria (Full Focus)
    card_check = page_docente.evaluate("""() => {
        const cardTitle = document.getElementById('card-title')?.innerText || '';
        const cardDeck = document.getElementById('card-deck-tag')?.innerText || '';
        const words = Array.from(document.querySelectorAll('#card-words-grid .word-chip span')).map(s => s.innerText);
        const timerDigits = document.getElementById('timer-digits')?.innerText || '';
        return {
            currentView: App.currentView,
            title: cardTitle,
            deck: cardDeck,
            wordsCount: words.length,
            timer: timerDigits
        };
    }""")
    print(f"2.4 Carta Oratoria Caricata: {card_check}")
    assert card_check['currentView'] == 'view-game', "Non si è aperta la vista di gioco!"
    assert card_check['wordsCount'] == 5, f"Le parole vietate devono essere 5, trovate: {card_check['wordsCount']}"
    assert card_check['timer'] == '02:00', f"Il timer iniziale deve essere 02:00, trovato: {card_check['timer']}"

    shot_cattedra = os.path.join(ARTIFACTS_DIR, "oratore_cattedra_docente_lim.png")
    page_docente.screenshot(path=shot_cattedra, full_page=False)
    print(f"-> Screenshot Cattedra LIM salvato: {shot_cattedra}")

    # 2.5 Azione Buzzer Penalità (La giuria segnala 1 errore)
    page_docente.evaluate("""() => {
        GameEngine.triggerBuzzer();
    }""")
    page_docente.wait_for_timeout(500)
    buzzer_val = page_docente.evaluate("document.getElementById('buzzer-count-badge')?.innerText")
    assert buzzer_val == '1', f"Buzzer counter errato: {buzzer_val}"

    # 2.6 Conclusione Turno -> Passaggio a Valutazione Docente (view-summary)
    page_docente.evaluate("""() => {
        GameEngine.finishTurn();
    }""")
    page_docente.wait_for_timeout(800)

    # 2.7 Valutazione Docente: Seleziona "Grande Oratore" (+3 passi base - 1 penalità = +2 passi finali)
    page_docente.evaluate("""() => {
        GameEngine.selectOratorLevel(3);
    }""")
    page_docente.wait_for_timeout(600)

    summary_check = page_docente.evaluate("""() => {
        const stepsText = document.querySelector('.summary-steps-highlight')?.innerText || '';
        const currentSteps = GameEngine.gameState.stepsGainedThisTurn;
        return {
            currentView: App.currentView,
            stepsText: stepsText,
            stepsGained: currentSteps
        };
    }""")
    print(f"2.7 Valutazione Docente Summary: {summary_check}")
    assert summary_check['currentView'] == 'view-summary', "Non siamo nella vista summary!"
    assert summary_check['stepsGained'] == 2, f"I passi calcolati devono essere 2 (3 base - 1 penalità), trovati: {summary_check['stepsGained']}"

    shot_valutazione = os.path.join(ARTIFACTS_DIR, "oratore_valutazione_docente.png")
    page_docente.screenshot(path=shot_valutazione, full_page=False)
    print(f"-> Screenshot Valutazione salvato: {shot_valutazione}")

    # 2.8 Conferma Avanzamento sul Tabellone HD
    page_docente.evaluate("""() => {
        GameEngine.goToBoard();
    }""")
    page_docente.wait_for_timeout(1500)

    board_check = page_docente.evaluate("""() => {
        const team1 = GameEngine.gameState.teams[0];
        const pawnEl = document.getElementById('pawn-team-team_1');
        const posText = team1.position;
        return {
            currentView: App.currentView,
            pawnFound: !!pawnEl,
            teamPosition: posText
        };
    }""")
    print(f"2.8 Posizione Pedina sul Tabellone: {board_check}")
    assert board_check['currentView'] == 'view-game-board', "Non siamo nella vista tabellone!"
    assert board_check['teamPosition'] == 3, f"La pedina doveva avanzare alla casella 3, si trova alla: {board_check['teamPosition']}"

    shot_tabellone = os.path.join(ARTIFACTS_DIR, "oratore_tabellone_hd_lim.png")
    page_docente.screenshot(path=shot_tabellone, full_page=False)
    print(f"-> Screenshot Tabellone HD salvato: {shot_tabellone}")
    context_docente.close()

    # =========================================================================
    # FASE 3: VERIFICA MODALITÀ "PAROLE DA USARE" (Studio & Lessico)
    # =========================================================================
    print("\n--- [FASE 3] Verifica Meccanica 'Parole da Usare' (Studio & Lessico) ---")
    context_usare = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_usare = context_usare.new_page()
    page_usare.add_init_script(docente_script)
    page_usare.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_usare.wait_for_timeout(1500)

    usare_res = page_usare.evaluate("""() => {
        App.selectedSetup = {
            teamsCount: 2,
            teams: [
                { id: 'team_1', name: 'Squadra Rossa', color: '#ef4444', avatar: 'assets/pedine/1.png', position: 1 },
                { id: 'team_2', name: 'Squadra Blu', color: '#3b82f6', avatar: 'assets/pedine/2.png', position: 1 }
            ],
            mode: 'USARE',
            level: 'b2'
        };
        GameEngine.initGame(App.selectedSetup.teams, 'USARE', 'b2');
        GameEngine.selectRoundDeck('letteratura');
        
        // Simula selezione di tutte e 5 le parole inserite con successo
        GameEngine.toggleWord(0);
        GameEngine.toggleWord(1);
        GameEngine.toggleWord(2);
        GameEngine.toggleWord(3);
        GameEngine.toggleWord(4);

        GameEngine.finishTurn();
        GameEngine.selectOratorLevel(3); // Grande oratore (+3 base + 1 bonus 5 parole = 4 passi)

        return {
            mode: GameEngine.gameState.mode,
            wordsHit: GameEngine.gameState.wordsHitThisTurn,
            steps: GameEngine.gameState.stepsGainedThisTurn
        };
    }""")
    print(f"3.1 Esito Modalità Lessico (Parole da Usare): {usare_res}")
    assert usare_res['mode'] == 'USARE', "Modalità USARE non impostata correttamente!"
    assert all(usare_res['wordsHit']), "Tutte le 5 parole dovevano risultare spuntate!"
    assert usare_res['steps'] == 4, f"I passi con bonus lessicale completo dovevano essere 4, trovati: {usare_res['steps']}"
    context_usare.close()

    # =========================================================================
    # FASE 4: VIANDANTE LIBERO (Tablet 810x1080) - Modalità Party & Creatività
    # =========================================================================
    print("\n--- [FASE 4] Viandante Libero (Tablet 810x1080) - Mazzo Party tra Amici ---")
    context_viandante = browser.new_context(viewport={'width': 810, 'height': 1080})
    page_viandante = context_viandante.new_page()

    viandante_script = """
    const mockUserViandante = {
        uid: 'viandante_oratore_01',
        email: 'viandante.solitario@gmail.com',
        name: 'Marco Viandante',
        displayName: 'Marco Viandante',
        role: 'viandante',
        plan: 'viandante',
        subscription: 'viandante',
        avatar: 'https://prof-memmo.github.io/prof-memmo-gestione-siti/shared/assets/avatars/7.png',
        xp: 280
    };

    localStorage.setItem('pm_oratore_user', JSON.stringify(mockUserViandante));

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
    """
    page_viandante.add_init_script(viandante_script)
    page_viandante.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_viandante.wait_for_timeout(2000)

    # 4.1 Verifica autorizzazione Viandante (Capibara assente e header profilato)
    vian_check = page_viandante.evaluate("""() => {
        if (window.Auth && typeof window.Auth.updateUI === 'function') {
            window.Auth.updateUI();
        }
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const userName = document.getElementById('header-user-name')?.innerText || '';
        const userRole = document.getElementById('header-user-role')?.innerText || '';
        const authRole = window.Auth?.role || '';
        const authPlan = window.Auth?.plan || '';
        return { isBlocked: !!isBlocked, userName: userName, userRole: userRole, authRole: authRole, authPlan: authPlan };
    }""")
    print(f"4.1 Accesso Viandante Tablet: {vian_check}")
    assert not vian_check['isBlocked'], "ERRORE: Il Capibara blocca illegittimamente il Viandante!"
    assert "MARCO" in vian_check['userName'], f"Nome viandante non allineato: {vian_check['userName']}"
    assert vian_check['authRole'] == 'viandante' or "VIANDANTE" in vian_check['userRole'], f"Ruolo viandante non riconosciuto: {vian_check}"

    # 4.2 Svolgimento Partita tra Amici con Mazzo "Viaggi, Esplorazioni & Avventura"
    page_viandante.evaluate("""() => {
        App.selectedSetup = {
            teamsCount: 2,
            teams: [
                { id: 'team_1', name: 'I Viandanti', color: '#10b981', avatar: 'assets/pedine/6.png', position: 1 },
                { id: 'team_2', name: 'Gli Erranti', color: '#f59e0b', avatar: 'assets/pedine/7.png', position: 1 }
            ],
            mode: 'PROIBITE',
            level: 'b1'
        };
        GameEngine.initGame(App.selectedSetup.teams, 'PROIBITE', 'b1');
        GameEngine.selectRoundDeck('avventura');
    }""")
    page_viandante.wait_for_timeout(1000)

    party_check = page_viandante.evaluate("""() => {
        const cardDeck = document.getElementById('card-deck-tag')?.innerText || '';
        const cardTitle = document.getElementById('card-title')?.innerText || '';
        const teamPill = document.getElementById('turn-team-name')?.innerText || '';
        return {
            currentView: App.currentView,
            deck: cardDeck,
            title: cardTitle,
            team: teamPill
        };
    }""")
    print(f"4.2 Schermata Sfida Avventura Viandante: {party_check}")
    assert party_check['currentView'] == 'view-game', "La vista di gioco non si è aperta!"
    assert "AVVENTURA" in party_check['deck'].upper() or "VIAGGI" in party_check['deck'].upper(), f"Mazzo inatteso: {party_check['deck']}"
    assert "I Viandanti" in party_check['team'], f"Squadra di turno inattesa: {party_check['team']}"

    shot_viandante = os.path.join(ARTIFACTS_DIR, "oratore_viandante_party_tablet.png")
    page_viandante.screenshot(path=shot_viandante, full_page=False)
    print(f"-> Screenshot Viandante Party salvato: {shot_viandante}")
    context_viandante.close()

    browser.close()

print("\n==========================================================================")
print(" COLLAUDO TOTALE L'ORATORE COMPLETATO CON SUCCESSO SENZA ERRORI!")
print("==========================================================================\n")
