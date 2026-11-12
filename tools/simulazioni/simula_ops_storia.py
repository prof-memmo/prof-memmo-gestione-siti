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

PORT = 8102
WORKSPACE_DIR = "/Users/guglielmopiersanti/.gemini/antigravity-ide/scratch/ops- storia/ops-web/out"
SHARED_DIR = "/Users/guglielmopiersanti/.gemini/antigravity-ide/scratch/prof-memmo-admin-gestione-generale/shared"
ARTIFACTS_DIR = os.environ.get("ARTIFACTS_DIR", "/Users/guglielmopiersanti/.gemini/antigravity/brain/33706f47-51f8-4772-9423-8c984c6afda0")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

class NextStaticHTTPHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def translate_path(self, path):
        # Route shared CDN to local shared folder
        if path.startswith('/shared/'):
            rel_path = path[len('/shared/'):]
            return os.path.join(SHARED_DIR, rel_path.split('?')[0])

        clean_path = path.split('?')[0].split('#')[0]
        # Direct static file check
        candidate = super().translate_path(clean_path)
        if os.path.isfile(candidate):
            return candidate

        # Check if clean_path/index.html exists (e.g. /host -> /host/index.html)
        candidate_index = os.path.join(self.directory, clean_path.lstrip('/'), 'index.html')
        if os.path.isfile(candidate_index):
            return candidate_index

        # Check clean_path + .html (e.g. /host.html)
        candidate_html = os.path.join(self.directory, clean_path.lstrip('/') + '.html')
        if os.path.isfile(candidate_html):
            return candidate_html

        return candidate

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError):
            pass

server = HTTPServerBase(('127.0.0.1', PORT), lambda *args, **kwargs: NextStaticHTTPHandler(*args, directory=WORKSPACE_DIR, **kwargs))
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()
print(f"[TEST] Server HTTP attivo su porta {PORT} per OPS! - Storia")

with sync_playwright() as p:
    print("\n==========================================================================")
    print(" COLLAUDO TOTALE ESPERIENZA DI GIOCO: OPS! - STORIA")
    print(" 1. PAYWALL CAPIBARA (PIANO BASE) | 2. DOCENTE LIM | 3. STUDENTE CONTROLLER | 4. VIANDANTE TABLET")
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
    # FASE 1: TEST DI SICUREZZA PAYWALL (Docente con Piano Base non autorizzato)
    # =========================================================================
    print("--- [FASE 1] Verifica Paywall Capibara (Piano Base) - Desktop 1280x800 ---")
    context_paywall = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_paywall = context_paywall.new_page()
    setup_route_intercept(page_paywall)

    paywall_script = """
    const mockUserBase = {
        uid: 'user_base_ops',
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
    """
    page_paywall.add_init_script(paywall_script)
    page_paywall.goto(f"http://127.0.0.1:{PORT}/host", wait_until="domcontentloaded")
    page_paywall.wait_for_timeout(2000)

    # Verifica attivazione Capibara
    paywall_check = page_paywall.evaluate("""async () => {
        if (window.HubSubscriptionGuard && typeof window.HubSubscriptionGuard.verifyAccess === 'function') {
            await window.HubSubscriptionGuard.verifyAccess({
                user: { uid: 'user_base_ops', email: 'docente.base@scuola.it' },
                role: 'docente',
                isPublicView: false
            });
        }
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

    shot_paywall = os.path.join(ARTIFACTS_DIR, "ops_capibara_paywall_attivo.png")
    page_paywall.screenshot(path=shot_paywall, full_page=False)
    print(f"-> Screenshot Paywall salvato: {shot_paywall}")
    context_paywall.close()

    # =========================================================================
    # FASE 2: DOCENTE SU CATTEDRA LIM (1920x1080) - Stanza /host & Tabellone
    # =========================================================================
    print("\n--- [FASE 2] Docente su Cattedra LIM (1920x1080) - Stanza di Gioco ---")
    context_docente = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page_docente = context_docente.new_page()
    setup_route_intercept(page_docente)

    docente_script = """
    const mockUserDocente = {
        uid: 'docente_ops_lim_01',
        email: 'prof.storia@liceo.it',
        displayName: 'Prof.ssa Chiara Storia',
        role: 'docente',
        subscription: 'docente_ecosistema',
        plan: 'docente_ecosistema',
        stsTokenManager: {
            accessToken: 'mock_access_token_docente',
            expirationTime: Date.now() + 3600000
        }
    };

    const authKey = 'firebase:authUser:AIzaSyD-n2m-kYEuzGXPMKclZTggf4Y5Zm8_cdM:[DEFAULT]';
    localStorage.setItem(authKey, JSON.stringify(mockUserDocente));
    localStorage.setItem('currentUser', JSON.stringify(mockUserDocente));
    localStorage.setItem('hub_user', JSON.stringify(mockUserDocente));
    localStorage.setItem('hub_user_name', 'PROF.SSA CHIARA');
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
    """
    page_docente.add_init_script(docente_script)
    page_docente.goto(f"http://127.0.0.1:{PORT}/host", wait_until="domcontentloaded")
    page_docente.wait_for_timeout(2000)

    lim_host_check = page_docente.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && overlay.classList.contains('pm-guard-active');
        const headerRole = document.querySelector('#header-user-menu')?.innerText || '';
        const hasDecks = document.body.innerText.includes("Scegli l'Anno") || document.body.innerText.includes("Crea una nuova stanza") || document.body.innerText.includes("Host") || document.body.innerText.includes("Docente");
        return {
            isBlocked: !!isBlocked,
            headerHasUser: headerRole.length > 0,
            hasDecks: hasDecks
        };
    }""")
    print(f"2.1 Esito Accesso Host Docente LIM: {lim_host_check}")
    assert not lim_host_check['isBlocked'], "ERRORE: Docente bloccato dal paywall su /host!"

    shot_docente_lim = os.path.join(ARTIFACTS_DIR, "ops_cattedra_docente_lim.png")
    page_docente.screenshot(path=shot_docente_lim, full_page=False)
    print(f"-> Screenshot Cattedra LIM salvato: {shot_docente_lim}")

    # Salva anche screenshot tabellone o schermata completa
    shot_tabellone_lim = os.path.join(ARTIFACTS_DIR, "ops_tabellone_animato_lim.png")
    page_docente.screenshot(path=shot_tabellone_lim, full_page=True)
    print(f"-> Screenshot Tabellone LIM salvato: {shot_tabellone_lim}")
    context_docente.close()

    # =========================================================================
    # FASE 3: STUDENTE MOBILE CONTROLLER (390x844) - /play?mock_playing=true
    # =========================================================================
    print("\n--- [FASE 3] Studente Mobile Controller (390x844) - /play ---")
    context_studente = browser.new_context(
        viewport={'width': 390, 'height': 844},
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
    )
    page_studente = context_studente.new_page()
    setup_route_intercept(page_studente)

    page_studente.goto(f"http://127.0.0.1:{PORT}/play?mock_playing=true", wait_until="domcontentloaded")
    page_studente.wait_for_timeout(2000)

    studente_state = page_studente.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && overlay.classList.contains('pm-guard-active');
        const word = document.body.innerText.includes("FEUDALESIMO");
        const hasTaboo = document.body.innerText.includes("Vassallo") || document.body.innerText.includes("Castello");
        const hasTimer = document.body.innerText.includes("45") || document.body.innerText.includes("Tempo");
        return {
            isBlocked: !!isBlocked,
            hasFeudalesimo: word,
            hasTabooWords: hasTaboo,
            hasTimer: hasTimer
        };
    }""")
    print(f"3.1 Esito Controller Mobile Studente: {studente_state}")
    assert not studente_state['isBlocked'], "ERRORE: Lo studente è stato bloccato dal paywall!"
    assert studente_state['hasFeudalesimo'], "ERRORE: Carta FEUDALESIMO non trovata sul controller studente!"
    assert studente_state['hasTabooWords'], "ERRORE: Parole tabù non mostrate sul controller!"

    shot_studente_controller = os.path.join(ARTIFACTS_DIR, "ops_studente_mobile_controller.png")
    page_studente.screenshot(path=shot_studente_controller, full_page=False)
    print(f"-> Screenshot Studente Mobile salvato: {shot_studente_controller}")
    context_studente.close()

    # =========================================================================
    # FASE 4: VIANDANTE / PASSA E GIOCA (Tablet 810x1080) - /local
    # =========================================================================
    print("\n--- [FASE 4] Viandante / Passa e Gioca (Tablet 810x1080) - /local ---")
    context_viandante = browser.new_context(
        viewport={'width': 810, 'height': 1080},
        user_agent="Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15"
    )
    page_viandante = context_viandante.new_page()
    setup_route_intercept(page_viandante)

    viandante_script = """
    const mockUserViandante = {
        uid: 'viandante_ops_109',
        email: 'viandante.storia@gmail.com',
        displayName: 'Marco Viandante',
        role: 'viandante',
        subscription: 'viandante',
        plan: 'viandante',
        stsTokenManager: {
            accessToken: 'mock_access_token_viandante',
            expirationTime: Date.now() + 3600000
        }
    };

    const authKey = 'firebase:authUser:AIzaSyD-n2m-kYEuzGXPMKclZTggf4Y5Zm8_cdM:[DEFAULT]';
    localStorage.setItem(authKey, JSON.stringify(mockUserViandante));
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
    """
    page_viandante.add_init_script(viandante_script)
    page_viandante.goto(f"http://127.0.0.1:{PORT}/local", wait_until="domcontentloaded")
    page_viandante.wait_for_timeout(2000)

    viandante_state = page_viandante.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && overlay.classList.contains('pm-guard-active');
        const hasLocalPlay = document.body.innerText.includes("1 Dispositivo") || document.body.innerText.includes("Passa e Gioca") || document.body.innerText.includes("Scegli") || document.body.innerText.includes("Squadra");
        return {
            isBlocked: !!isBlocked,
            hasLocalPlay: hasLocalPlay
        };
    }""")
    print(f"4.1 Esito Viandante Tablet Passa e Gioca: {viandante_state}")
    assert not viandante_state['isBlocked'], "ERRORE: Il viandante è bloccato dal paywall!"

    shot_viandante = os.path.join(ARTIFACTS_DIR, "ops_viandante_passa_e_gioca_tablet.png")
    page_viandante.screenshot(path=shot_viandante, full_page=False)
    print(f"-> Screenshot Viandante Tablet salvato: {shot_viandante}")
    context_viandante.close()

    browser.close()

print("\n==========================================================================")
print(" COLLAUDO TOTALE OPS! - STORIA COMPLETATO CON SUCCESSO SENZA ERRORI!")
print("==========================================================================\n")
sys.exit(0)
