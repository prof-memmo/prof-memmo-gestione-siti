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

PORT = 8100
WORKSPACE_DIR = "/Users/guglielmopiersanti/.gemini/antigravity-ide/scratch/palestra-di-riflessione"
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
print(f"[TEST] Server HTTP attivo su porta {PORT} per Palestra di Riflessione")

with sync_playwright() as p:
    print("\n==========================================================================")
    print(" COLLAUDO TOTALE ESPERIENZA DI GIOCO: PALESTRA DI RIFLESSIONE")
    print(" 1. PAYWALL CAPIBARA (PIANO BASE) | 2. DOCENTE LIM | 3. STUDENTE MOBILE | 4. VIANDANTE TABLET")
    print("==========================================================================\n")

    browser = p.chromium.launch(headless=True)

    # =========================================================================
    # FASE 1: TEST DI SICUREZZA PAYWALL (Utente non abbonato con Piano Base)
    # =========================================================================
    print("--- [FASE 1] Verifica Paywall Capibara (Piano Base) - Desktop 1280x800 ---")
    context_paywall = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_paywall = context_paywall.new_page()

    paywall_script = """
    const mockUserBase = {
        uid: 'user_base_unpaid',
        email: 'docente.base@scuola.it',
        name: 'Prof. Base Non Abbonato',
        displayName: 'Prof. Base Non Abbonato',
        role: 'docente',
        subscription: 'base',
        plan: 'base',
        piano: 'base',
        setupComplete: true
    };

    localStorage.setItem('palestra_user', JSON.stringify(mockUserBase));
    localStorage.setItem('palestra_user_plan', 'base');
    localStorage.setItem('hub_user', JSON.stringify(mockUserBase));

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
                }),
                where: () => ({
                    get: async () => ({ empty: true, docs: [], forEach: () => {} })
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

    # Tentativo di accedere alla sezione protetta 'riflessione' con utente loggato a piano Base
    page_paywall.evaluate("""async () => {
        const mockUserBase = {
            uid: 'user_base_unpaid',
            email: 'docente.base@scuola.it',
            name: 'Prof. Base Non Abbonato',
            displayName: 'Prof. Base Non Abbonato',
            role: 'docente',
            subscription: 'base',
            plan: 'base',
            piano: 'base',
            setupComplete: true
        };
        if (window.Auth) {
            window.Auth._user = mockUserBase;
            window.Auth.isLoggedIn = () => true;
            window.Auth.getUser = () => mockUserBase;
        }
        if (typeof navigateTo === 'function') {
            await navigateTo('riflessione');
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

    shot_paywall = os.path.join(ARTIFACTS_DIR, "palestra_capibara_paywall_attivo.png")
    page_paywall.screenshot(path=shot_paywall, full_page=False)
    print(f"-> Screenshot Paywall salvato: {shot_paywall}")
    context_paywall.close()

    # =========================================================================
    # FASE 2: DOCENTE SU CATTEDRA LIM (Piano docente_ecosistema, 1920x1080)
    # =========================================================================
    print("\n--- [FASE 2] Docente su Cattedra LIM (1920x1080) - Classe PAL-GRAM1 ---")
    context_docente = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page_docente = context_docente.new_page()

    docente_script = """
    const mockUserDocente = {
        uid: 'doc_palestra_eco_01',
        email: 'prof.aurora@liceo.edu.it',
        name: 'Prof.ssa Aurora',
        displayName: 'Prof.ssa Aurora',
        role: 'docente',
        plan: 'docente_ecosistema',
        subscription: 'docente_ecosistema',
        piano: 'docente_ecosistema',
        setupComplete: true
    };

    localStorage.setItem('palestra_user', JSON.stringify(mockUserDocente));
    localStorage.setItem('palestra_user_plan', 'docente_ecosistema');
    localStorage.setItem('hub_user', JSON.stringify(mockUserDocente));

    const mockClassPalestra = {
        id: 'class_pal_1',
        code: 'PAL-GRAM1',
        name: '2°B - Analisi e Sintassi',
        teacherEmail: mockUserDocente.email,
        teacherId: mockUserDocente.uid,
        teacherIds: [mockUserDocente.uid]
    };

    localStorage.setItem('palestra_classes', JSON.stringify([mockClassPalestra]));

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
            if (colName === 'hub_classes') {
                return {
                    where: () => ({
                        get: async () => ({
                            forEach: (cb) => {
                                cb({ id: mockClassPalestra.id, data: () => mockClassPalestra });
                            }
                        })
                    }),
                    doc: () => ({
                        get: async () => ({
                            exists: true,
                            data: () => mockClassPalestra
                        })
                    })
                };
            }
            return {
                doc: () => ({
                    get: async () => ({ exists: false, data: () => ({}) }),
                    set: async () => {},
                    update: async () => {}
                }),
                where: () => ({
                    get: async () => ({
                        size: 1,
                        docs: [{ id: mockUserDocente.uid, data: () => mockUserDocente }],
                        forEach: (cb) => cb({ id: mockUserDocente.uid, data: () => mockUserDocente })
                    })
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

    # 2.1 Apertura pannello Cattedra del Docente ('profilo')
    page_docente.evaluate("""async () => {
        const mockUserDocente = {
            uid: 'doc_palestra_eco_01',
            email: 'prof.aurora@liceo.edu.it',
            name: 'Prof.ssa Aurora',
            displayName: 'Prof.ssa Aurora',
            role: 'docente',
            plan: 'docente_ecosistema',
            subscription: 'docente_ecosistema',
            piano: 'docente_ecosistema',
            setupComplete: true
        };
        if (window.Auth) {
            window.Auth._user = mockUserDocente;
            window.Auth.isLoggedIn = () => true;
            window.Auth.getUser = () => mockUserDocente;
        }
        if (typeof renderProfiloPage === 'function') {
            await renderProfiloPage();
        } else if (typeof navigateTo === 'function') {
            await navigateTo('profilo');
        }
    }""")
    page_docente.wait_for_timeout(1000)

    doc_res = page_docente.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const profileName = document.querySelector('.profile-name')?.innerText || '';
        const roleBadge = document.querySelector('.profile-badges .badge.role')?.innerText || '';
        const selectClassVal = document.getElementById('select-teacher-class')?.value || '';
        const codePill = document.getElementById('display-selected-code')?.innerText || '';

        return {
            isBlocked: !!isBlocked,
            profileName: profileName,
            roleBadge: roleBadge,
            selectClass: selectClassVal,
            codePill: codePill
        };
    }""")
    print(f"2.1 Esito Cattedra Docente LIM: {doc_res}")
    assert not doc_res['isBlocked'], "ERRORE: Il Capibara blocca illegittimamente il Docente Ecosistema!"
    assert "AURORA" in doc_res['profileName'].upper(), f"Nome docente non sincronizzato: {doc_res['profileName']}"
    assert "DOCENTE" in doc_res['roleBadge'].upper(), f"Ruolo docente non riconosciuto: {doc_res['roleBadge']}"
    assert "PAL-GRAM1" in doc_res['selectClass'] or "PAL-GRAM1" in doc_res['codePill'], f"Codice classe inatteso: {doc_res}"

    shot_cattedra = os.path.join(ARTIFACTS_DIR, "palestra_cattedra_docente_lim.png")
    page_docente.screenshot(path=shot_cattedra, full_page=False)
    print(f"-> Screenshot Cattedra LIM salvato: {shot_cattedra}")
    context_docente.close()

    # =========================================================================
    # FASE 3: STUDENTE MOBILE (390x844) ED ESERCIZIO INTERATTIVO
    # =========================================================================
    print("\n--- [FASE 3] Studente Mobile (390x844) - Profilo e Allenamento ---")
    context_studente = browser.new_context(viewport={'width': 390, 'height': 844})
    page_studente = context_studente.new_page()

    studente_script = """
    const mockUserStudente = {
        uid: 'stud_palestra_01',
        email: 'mario.rossi@studenti.it',
        name: 'Mario Rossi',
        displayName: 'Mario Rossi',
        role: 'studente',
        classCode: 'PAL-GRAM1',
        teacherEmail: 'prof.aurora@liceo.edu.it',
        teacherId: 'doc_palestra_eco_01',
        subscription: 'docente_ecosistema',
        piano: 'docente_ecosistema',
        setupComplete: true
    };

    localStorage.setItem('palestra_user', JSON.stringify(mockUserStudente));
    localStorage.setItem('palestra_student_class_code', 'PAL-GRAM1');
    localStorage.setItem('palestra_user_plan', 'docente_ecosistema');
    localStorage.setItem('hub_user', JSON.stringify(mockUserStudente));

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
                            data: () => mockUserStudente
                        })
                    })
                };
            }
            return {
                doc: () => ({
                    get: async () => ({ exists: false, data: () => ({}) }),
                    set: async () => {},
                    update: async () => {}
                }),
                where: () => ({
                    get: async () => ({ empty: true, docs: [], forEach: () => {} })
                })
            };
        }
    };

    Object.defineProperty(window, 'db', { get: () => mockDbStudente, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbStudente, set: () => {}, configurable: true });
    """
    page_studente.add_init_script(studente_script)
    page_studente.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_studente.wait_for_timeout(2000)

    # 3.1 Apertura Profilo Studente Mobile con Codice Classe Attivo
    page_studente.evaluate("""async () => {
        const mockUserStudente = {
            uid: 'stud_palestra_01',
            email: 'mario.rossi@studenti.it',
            name: 'Mario Rossi',
            displayName: 'Mario Rossi',
            role: 'studente',
            classCode: 'PAL-GRAM1',
            teacherEmail: 'prof.aurora@liceo.edu.it',
            teacherId: 'doc_palestra_eco_01',
            subscription: 'docente_ecosistema',
            piano: 'docente_ecosistema',
            setupComplete: true
        };
        if (window.Auth) {
            window.Auth._user = mockUserStudente;
            window.Auth.isLoggedIn = () => true;
            window.Auth.getUser = () => mockUserStudente;
        }
        if (typeof renderProfiloPage === 'function') {
            await renderProfiloPage();
        } else if (typeof navigateTo === 'function') {
            await navigateTo('profilo');
        }
    }""")
    page_studente.wait_for_timeout(1000)

    stud_res = page_studente.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const profileName = document.querySelector('.profile-name')?.innerText || '';
        const roleBadge = document.querySelector('.profile-badges .badge.role')?.innerText || '';
        const activeClassBox = document.querySelector('.student-area')?.innerText || '';

        return {
            isBlocked: !!isBlocked,
            profileName: profileName,
            roleBadge: roleBadge,
            hasClassCode: activeClassBox.includes('PAL-GRAM1')
        };
    }""")
    print(f"3.1 Esito Profilo Studente Mobile: {stud_res}")
    assert not stud_res['isBlocked'], "ERRORE: Lo studente con classe è bloccato dal Capibara!"
    assert "MARIO" in stud_res['profileName'].upper(), f"Nome studente inatteso: {stud_res['profileName']}"
    assert stud_res['hasClassCode'], "Codice classe PAL-GRAM1 non visualizzato nel profilo studente!"

    # 3.2 Navigazione nella Palestra di Riflessione sulla Lingua
    page_studente.evaluate("""async () => {
        if (typeof navigateTo === 'function') {
            await navigateTo('riflessione');
        }
    }""")
    page_studente.wait_for_timeout(1000)

    riflessione_check = page_studente.evaluate("""() => {
        const appText = document.getElementById('app')?.innerText || '';
        return {
            hasGrammatica: appText.includes('Grammatica') || appText.includes('RIFLESSIONE') || appText.includes('Analisi')
        };
    }""")
    print(f"3.2 Navigazione Palestra Grammatica: {riflessione_check}")
    assert riflessione_check['hasGrammatica'], "Sezione grammatica non visualizzata correttamente!"

    # Ritorno al profilo per screenshot riepilogativo
    page_studente.evaluate("""async () => {
        await navigateTo('profilo');
    }""")
    page_studente.wait_for_timeout(500)

    shot_studente = os.path.join(ARTIFACTS_DIR, "palestra_studente_mobile_profilo.png")
    page_studente.screenshot(path=shot_studente, full_page=False)
    print(f"-> Screenshot Studente salvato: {shot_studente}")
    context_studente.close()

    # =========================================================================
    # FASE 4: VIANDANTE LIBERO / AMICO DEL PROF. (Tablet 810x1080)
    # =========================================================================
    print("\n--- [FASE 4] Viandante / Amico del Prof. (Tablet 810x1080) - Allenamento Libero ---")
    context_viandante = browser.new_context(viewport={'width': 810, 'height': 1080})
    page_viandante = context_viandante.new_page()

    viandante_script = """
    const mockUserViandante = {
        uid: 'viandante_pal_01',
        email: 'viandante.libero@gmail.com',
        name: 'Marco Viandante',
        displayName: 'Marco Viandante',
        role: 'amico',
        subscription: 'viandante',
        plan: 'viandante',
        piano: 'viandante',
        setupComplete: true
    };

    localStorage.setItem('palestra_user', JSON.stringify(mockUserViandante));
    localStorage.setItem('palestra_user_plan', 'viandante');
    localStorage.setItem('hub_user', JSON.stringify(mockUserViandante));

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
                }),
                where: () => ({
                    get: async () => ({ empty: true, docs: [], forEach: () => {} })
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

    # 4.1 Accesso al Profilo Viandante (senza codice classe, allenamento libero)
    page_viandante.evaluate("""async () => {
        const mockUserViandante = {
            uid: 'viandante_pal_01',
            email: 'viandante.libero@gmail.com',
            name: 'Marco Viandante',
            displayName: 'Marco Viandante',
            role: 'amico',
            subscription: 'viandante',
            plan: 'viandante',
            piano: 'viandante',
            setupComplete: true
        };
        if (window.Auth) {
            window.Auth._user = mockUserViandante;
            window.Auth.isLoggedIn = () => true;
            window.Auth.getUser = () => mockUserViandante;
        }
        if (typeof renderProfiloPage === 'function') {
            await renderProfiloPage();
        } else if (typeof navigateTo === 'function') {
            await navigateTo('profilo');
        }
    }""")
    page_viandante.wait_for_timeout(1000)

    vian_res = page_viandante.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const profileName = document.querySelector('.profile-name')?.innerText || '';
        const roleBadge = document.querySelector('.profile-badges .badge.role')?.innerText || '';

        return {
            isBlocked: !!isBlocked,
            profileName: profileName,
            roleBadge: roleBadge
        };
    }""")
    print(f"4.1 Esito Profilo Viandante Tablet: {vian_res}")
    assert not vian_res['isBlocked'], "ERRORE: Il Capibara blocca illegittimamente il Viandante/Amico!"
    assert "MARCO" in vian_res['profileName'].upper(), f"Nome viandante inatteso: {vian_res['profileName']}"

    # 4.2 Navigazione Libera nella Palestra di Cultura Generale
    page_viandante.evaluate("""async () => {
        if (typeof navigateTo === 'function') {
            await navigateTo('culturagenerale');
        }
    }""")
    page_viandante.wait_for_timeout(1000)

    cg_check = page_viandante.evaluate("""() => {
        const appText = document.getElementById('app')?.innerText || '';
        return {
            hasCultura: appText.includes('Cultura') || appText.includes('Generale') || appText.includes('Test')
        };
    }""")
    print(f"4.2 Navigazione Cultura Generale Viandante: {cg_check}")
    assert cg_check['hasCultura'], "Sezione Cultura Generale non visualizzata!"

    shot_viandante = os.path.join(ARTIFACTS_DIR, "palestra_viandante_amico_tablet.png")
    page_viandante.screenshot(path=shot_viandante, full_page=False)
    print(f"-> Screenshot Viandante salvato: {shot_viandante}")
    context_viandante.close()

    browser.close()

print("\n==========================================================================")
print(" COLLAUDO TOTALE PALESTRA DI RIFLESSIONE COMPLETATO CON SUCCESSO SENZA ERRORI!")
print("==========================================================================\n")
