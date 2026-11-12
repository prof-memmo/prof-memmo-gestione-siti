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

PORT = 8099
WORKSPACE_DIR = "/Users/guglielmopiersanti/.gemini/antigravity-ide/scratch/la-corte-della-commedia"
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
print(f"[TEST] Server HTTP attivo su porta {PORT} per La Corte della Commedia")

with sync_playwright() as p:
    print("\n==========================================================================")
    print(" COLLAUDO TOTALE ESPERIENZA DI GIOCO: LA CORTE DELLA COMMEDIA")
    print(" 1. PAYWALL CAPIBARA (PIANO BASE) | 2. DOCENTE LIM | 3. STUDENTE PROCESSO | 4. PELLEGRINO TABLET")
    print("==========================================================================\n")

    browser = p.chromium.launch(headless=True)

    # =========================================================================
    # FASE 1: TEST DI SICUREZZA PAYWALL (Docente/Utente Piano Base non autorizzato)
    # =========================================================================
    print("--- [FASE 1] Verifica Paywall Capibara (Piano Base) - Desktop 1280x800 ---")
    context_paywall = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_paywall = context_paywall.new_page()

    paywall_script = """
    const mockUserBase = {
        uid: 'user_base_unpaid',
        email: 'docente.base@scuola.it',
        displayName: 'Prof. Base Non Abbonato',
        role: 'teacher',
        subscription: 'base',
        plan: 'base'
    };

    localStorage.setItem('currentUser', JSON.stringify(mockUserBase));
    localStorage.setItem('corte_user', JSON.stringify(mockUserBase));
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

    # Tentativo di accedere alla dashboard docente protetta
    page_paywall.evaluate("""async () => {
        if (window.EroiDB && window.EroiDB.cache) {
            window.EroiDB.cache.userProfile = {
                uid: 'user_base_unpaid',
                email: 'docente.base@scuola.it',
                role: 'teacher',
                plan: 'base',
                subscription: 'base'
            };
        }
        if (typeof window.showView === 'function') {
            await window.showView('view-teacher-dashboard');
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

    shot_paywall = os.path.join(ARTIFACTS_DIR, "corte_capibara_paywall_attivo.png")
    page_paywall.screenshot(path=shot_paywall, full_page=False)
    print(f"-> Screenshot Paywall salvato: {shot_paywall}")
    context_paywall.close()

    # =========================================================================
    # FASE 2: DOCENTE SU CATTEDRA LIM (Piano docente_ecosistema, 1920x1080)
    # =========================================================================
    print("\n--- [FASE 2] Docente su Cattedra LIM (1920x1080) - Classe COM-DANTE1 ---")
    context_docente = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page_docente = context_docente.new_page()

    docente_script = """
    const mockUserDocente = {
        uid: 'doc_corte_eco_01',
        email: 'prof.dante@liceoclassico.edu.it',
        name: 'Prof. Dante Alighieri',
        displayName: 'Prof. Dante Alighieri',
        role: 'teacher',
        plan: 'docente_ecosistema',
        subscription: 'docente_ecosistema'
    };

    localStorage.setItem('currentUser', JSON.stringify(mockUserDocente));
    localStorage.setItem('corte_user', JSON.stringify(mockUserDocente));
    localStorage.setItem('hub_user', JSON.stringify(mockUserDocente));
    localStorage.setItem('adminLoggedIn', 'false');

    const mockClassDante = {
        id: 'class_dante_1',
        code: 'COM-DANTE1',
        name: '3°A Classico - Divina Commedia',
        teacherEmail: mockUserDocente.email,
        teacherId: mockUserDocente.uid
    };

    const mockStudentsDante = [
        { uid: 's1', displayName: 'Guido Cavalcanti', email: 'guido@studenti.it', role: 'student', level: 2, xp: 420, fiorini: 80 },
        { uid: 's2', displayName: 'Lapo Gianni', email: 'lapo@studenti.it', role: 'student', level: 1, xp: 180, fiorini: 40 },
        { uid: 's3', displayName: 'Cino da Pistoia', email: 'cino@studenti.it', role: 'student', level: 3, xp: 750, fiorini: 120 }
    ];

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

    # Inizializza stato cattedra docente con classe e studenti mock
    doc_init_res = page_docente.evaluate("""async () => {
        if (window.EroiDB) {
            window.EroiDB.cache.userProfile = {
                uid: 'doc_corte_eco_01',
                email: 'prof.dante@liceoclassico.edu.it',
                displayName: 'Prof. Dante Alighieri',
                role: 'teacher',
                plan: 'docente_ecosistema',
                subscription: 'docente_ecosistema'
            };

            // Mock metodi database per la cattedra
            window.EroiDB.getTeacherClasses = async () => ([
                { id: 'class_dante_1', code: 'COM-DANTE1', name: '3°A Classico - Divina Commedia' }
            ]);

            window.EroiDB.getStudentsByClass = async () => ([
                { uid: 's1', displayName: 'Guido Cavalcanti', email: 'guido@studenti.it', role: 'student', level: 2, xp: 420 },
                { uid: 's2', displayName: 'Lapo Gianni', email: 'lapo@studenti.it', role: 'student', level: 1, xp: 180 },
                { uid: 's3', displayName: 'Cino da Pistoia', email: 'cino@studenti.it', role: 'student', level: 3, xp: 750 }
            ]);
        }

        if (typeof window.showView === 'function') {
            await window.showView('view-teacher-dashboard');
        }

        if (window.TeacherDashboard) {
            await window.TeacherDashboard.init();
        }

        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const activeView = document.querySelector('.view.active')?.id || '';
        const selectClassVal = document.getElementById('select-teacher-class')?.value || '';
        const codeBadge = document.getElementById('display-selected-code')?.innerText || '';

        return {
            isBlocked: !!isBlocked,
            activeView: activeView,
            selectClass: selectClassVal,
            codeBadge: codeBadge
        };
    }""")
    print(f"2.1 Esito Inizializzazione Cattedra Docente LIM: {doc_init_res}")
    assert not doc_init_res['isBlocked'], "ERRORE: Il Capibara blocca illegittimamente il Docente Ecosistema!"
    assert doc_init_res['activeView'] == 'view-teacher-dashboard', f"Vista attiva inattesa: {doc_init_res['activeView']}"

    # Verifica studenti caricati nella tabella
    page_docente.wait_for_timeout(1000)
    students_count = page_docente.evaluate("""() => {
        const rows = document.querySelectorAll('#teacher-students-tbody tr');
        return rows.length;
    }""")
    print(f"2.2 Studenti Caricati nella Tabella Cattedra: {students_count}")
    assert students_count >= 1, "Nessuno studente caricato nella tabella cattedra!"

    # Verifica Tab Nodi Mappa
    page_docente.evaluate("""() => {
        if (typeof window.switchTeacherTab === 'function') {
            window.switchTeacherTab('nodi');
        }
    }""")
    page_docente.wait_for_timeout(500)
    nodi_tab_active = page_docente.evaluate("document.getElementById('t-tab-nodi')?.style.display !== 'none'")
    assert nodi_tab_active, "Tab Nodi non attivato!"

    # Ripristina Tab Classi per la foto
    page_docente.evaluate("""() => {
        if (typeof window.switchTeacherTab === 'function') {
            window.switchTeacherTab('classi');
        }
    }""")
    page_docente.wait_for_timeout(500)

    shot_cattedra = os.path.join(ARTIFACTS_DIR, "corte_cattedra_docente_lim.png")
    page_docente.screenshot(path=shot_cattedra, full_page=False)
    print(f"-> Screenshot Cattedra LIM salvato: {shot_cattedra}")
    context_docente.close()

    # =========================================================================
    # FASE 3: STUDENTE MOBILE (390x844) E PROCESSO A PAOLO E FRANCESCA
    # =========================================================================
    print("\n--- [FASE 3] Studente Mobile (390x844) - Dashboard e Processo Dantesco ---")
    context_studente = browser.new_context(viewport={'width': 390, 'height': 844})
    page_studente = context_studente.new_page()

    studente_script = """
    const mockUserStudente = {
        uid: 's1',
        email: 'guido.cavalcanti@studenti.it',
        name: 'Guido Cavalcanti',
        displayName: 'Guido Cavalcanti',
        role: 'student',
        classCode: 'COM-DANTE1',
        teacherEmail: 'prof.dante@liceoclassico.edu.it',
        teacherId: 'doc_corte_eco_01',
        xp: 420,
        fiorini: 80,
        level: 2
    };

    localStorage.setItem('currentUser', JSON.stringify(mockUserStudente));
    localStorage.setItem('corte_user', JSON.stringify(mockUserStudente));
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
                            data: () => ({
                                ...mockUserStudente,
                                subscription: 'docente_ecosistema', // ereditato dal docente della classe
                                plan: 'docente_ecosistema'
                            })
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
    page_studente.wait_for_timeout(2000)

    # 3.1 Apertura Dashboard Studente con 4 Statistiche Dantesche e Fiorini
    stud_dash_res = page_studente.evaluate("""async () => {
        if (window.EroiDB) {
            window.EroiDB.cache.userProfile = {
                uid: 's1',
                email: 'guido.cavalcanti@studenti.it',
                displayName: 'Guido Cavalcanti',
                role: 'student',
                classCode: 'COM-DANTE1',
                teacherId: 'doc_corte_eco_01',
                teacherEmail: 'prof.dante@liceoclassico.edu.it',
                xp: 420,
                fiorini: 80,
                level: 2
            };
        }

        if (typeof window.showView === 'function') {
            await window.showView('view-student-dashboard');
        }

        if (typeof window.goToDashboard === 'function') {
            window.goToDashboard();
        }

        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const activeView = document.querySelector('.view.active')?.id || '';
        const fioriniText = document.getElementById('stud-dashboard-fiorini')?.innerText || '';
        const levelText = document.getElementById('stud-dashboard-level')?.innerText || '';
        const logicaVal = document.getElementById('stud-stat-logica')?.innerText || '';
        const retoricaVal = document.getElementById('stud-stat-retorica')?.innerText || '';

        return {
            isBlocked: !!isBlocked,
            activeView: activeView,
            fiorini: fioriniText,
            level: levelText,
            logica: logicaVal,
            retorica: retoricaVal
        };
    }""")
    print(f"3.1 Esito Dashboard Studente: {stud_dash_res}")
    assert not stud_dash_res['isBlocked'], "ERRORE: Lo studente con classe è bloccato dal Capibara!"
    assert "80" in stud_dash_res['fiorini'], f"Saldo fiorini inatteso: {stud_dash_res['fiorini']}"
    assert stud_dash_res['logica'] != '', "Statistica Logica non popolata!"

    # 3.2 Avvio Processo a Paolo e Francesca (Canto V, Lussuriosi)
    page_studente.evaluate("""async () => {
        const mockCase = {
            id: 'paolo_francesca',
            image: 'assets/cases/paolo_francesca.png',
            campaignId: 'inferno',
            characterName: 'Paolo e Francesca',
            canto: 'Canto V',
            cerchio: 'Lussuriosi',
            order: 1,
            active: true,
            phases: {
                intro: "Nel Secondo Cerchio dell'Inferno, dove il turbine incessante travolge le anime, due spiriti volano uniti, legati da una passione tragica. Sono Paolo Malatesta e Francesca da Polenta.",
                obiettivo: "Analizzare la differenza tra amore e lussuria, e comprendere quanto il cedere alla passione possa giustificare la trasgressione delle regole sacre.",
                facts: "Francesca da Polenta, data in sposa per motivi politici a Gianciotto Malatesta, si innamorò perdutamente del fratello di lui, l'affascinante Paolo.",
                tragedia: "Un giorno, mentre i due leggevano per diletto le avventure di Lancillotto e Ginevra, arrivarono al punto in cui l'eroe bacia la regina.",
                accusation: "Questi due spiriti hanno commesso il più vile dei tradimenti contro il sacro vincolo del matrimonio!",
                citazione: "Galeotto fu 'l libro e chi lo scrisse: quel giorno più non vi leggemmo avante.",
                contrappasso: "Come in vita furono travolti e trascinati dalla tempesta dei sensi, ora sono trascinati per l'eternità da una bufera infernale.",
                defense: "Vostro Onore, l'Amore è un signore potente e invincibile per i cuori gentili.",
                crossExamination: [
                    {
                        question: "Qual è il principio chiave su cui si basa l'accusa di Dante contro i due amanti?",
                        options: ["Hanno letto un libro proibito.", "Hanno sottomesso la ragione al desiderio.", "Hanno sfidato Gianciotto."],
                        correctIndex: 1,
                        explanation: "Per Dante, la lussuria è sottomissione della ragione al talento."
                    }
                ],
                reflection: "Ai miei tempi la lussuria era una tempesta fisica. Oggi vedo che il vostro mondo è dominato dagli schermi."
            }
        };

        if (window.EroiDB) {
            window.EroiDB.getCasesByCampaign = async () => [mockCase];
            if (window.EroiDB.cache) {
                window.EroiDB.cache.cases = [mockCase];
            }
        }

        if (window.EroiGame && typeof window.EroiGame.startTrial === 'function') {
            await window.EroiGame.startTrial('paolo_francesca');
        }
    }""")
    page_studente.wait_for_timeout(1000)

    trial_check = page_studente.evaluate("""() => {
        const title = document.getElementById('trial-title')?.innerText || '';
        const phase = document.getElementById('trial-phase-text')?.innerText || '';
        const content = document.getElementById('trial-content')?.innerText || '';
        const activeView = document.querySelector('.view.active')?.id || '';
        return {
            activeView: activeView,
            title: title,
            phase: phase,
            hasFrancesca: content.includes('Francesca') || content.includes('Paolo')
        };
    }""")
    print(f"3.2 Esito Avvio Processo Dantesco: {trial_check}")
    assert trial_check['activeView'] == 'view-trial', "Non siamo nella vista processo!"
    assert trial_check['hasFrancesca'], "Fascicolo di Paolo e Francesca non caricato!"

    shot_studente = os.path.join(ARTIFACTS_DIR, "corte_studente_mobile_processo.png")
    page_studente.screenshot(path=shot_studente, full_page=False)
    print(f"-> Screenshot Studente Processo salvato: {shot_studente}")
    context_studente.close()

    # =========================================================================
    # FASE 4: PELLEGRINO / VIANDANTE LIBERO (Tablet 810x1080)
    # =========================================================================
    print("\n--- [FASE 4] Pellegrino / Viandante Libero (Tablet 810x1080) - Mappa Oltremondana ---")
    context_pellegrino = browser.new_context(viewport={'width': 810, 'height': 1080})
    page_pellegrino = context_pellegrino.new_page()

    pellegrino_script = """
    const mockUserPellegrino = {
        uid: 'pellegrino_01',
        email: 'viaggiatore.libero@gmail.com',
        name: 'Marco Pellegrino',
        displayName: 'Marco Pellegrino',
        role: 'external',
        plan: 'viandante',
        subscription: 'viandante',
        xp: 310,
        fiorini: 150,
        level: 2
    };

    localStorage.setItem('currentUser', JSON.stringify(mockUserPellegrino));
    localStorage.setItem('corte_user', JSON.stringify(mockUserPellegrino));
    localStorage.setItem('hub_user', JSON.stringify(mockUserPellegrino));

    const mockDbPellegrino = {
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
                            data: () => mockUserPellegrino
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

    Object.defineProperty(window, 'db', { get: () => mockDbPellegrino, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbPellegrino, set: () => {}, configurable: true });
    """
    page_pellegrino.add_init_script(pellegrino_script)
    page_pellegrino.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_pellegrino.wait_for_timeout(2000)

    # 4.1 Apertura Rifugio dei Pellegrini (view-external-dashboard) senza Capibara
    pellegrino_res = page_pellegrino.evaluate("""async () => {
        if (window.EroiDB) {
            window.EroiDB.cache.userProfile = {
                uid: 'pellegrino_01',
                email: 'viaggiatore.libero@gmail.com',
                displayName: 'Marco Pellegrino',
                role: 'external',
                plan: 'viandante',
                subscription: 'viandante',
                xp: 310,
                fiorini: 150,
                level: 2
            };
        }

        if (typeof window.showView === 'function') {
            await window.showView('view-external-dashboard');
        }

        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const activeView = document.querySelector('.view.active')?.id || '';
        const titleText = document.querySelector('#view-external-dashboard h2')?.innerText || '';
        const descText = document.querySelector('#view-external-dashboard p')?.innerText || '';

        return {
            isBlocked: !!isBlocked,
            activeView: activeView,
            title: titleText,
            desc: descText
        };
    }""")
    print(f"4.1 Esito Rifugio dei Pellegrini: {pellegrino_res}")
    assert not pellegrino_res['isBlocked'], "ERRORE: Il Capibara blocca illegittimamente il Pellegrino/Viandante!"
    assert pellegrino_res['activeView'] == 'view-external-dashboard', f"Vista attiva inattesa: {pellegrino_res['activeView']}"
    assert "Pellegrini" in pellegrino_res['title'] or "Viaggiatore" in pellegrino_res['desc'], f"Titolo rifugio inatteso: {pellegrino_res}"

    # 4.2 Apertura Mappa dei Regni Oltremondani
    page_pellegrino.evaluate("""async () => {
        if (typeof window.showView === 'function') {
            await window.showView('view-map');
        }
        if (window.app && typeof window.app.switchMapTab === 'function') {
            window.app.switchMapTab('inferno');
        }
    }""")
    page_pellegrino.wait_for_timeout(1000)

    map_check = page_pellegrino.evaluate("""() => {
        const activeView = document.querySelector('.view.active')?.id || '';
        const mapTitle = document.querySelector('#view-map h2')?.innerText || '';
        const infernoVisible = document.getElementById('map-inferno')?.style.display !== 'none';
        return {
            activeView: activeView,
            mapTitle: mapTitle,
            infernoVisible: infernoVisible
        };
    }""")
    print(f"4.2 Esito Mappa Oltremondana: {map_check}")
    assert map_check['activeView'] == 'view-map', "Non siamo nella vista mappa!"
    assert "Regni" in map_check['mapTitle'] or "Oltremondani" in map_check['mapTitle'], f"Titolo mappa inatteso: {map_check['mapTitle']}"

    shot_pellegrino = os.path.join(ARTIFACTS_DIR, "corte_viandante_pellegrino_tablet.png")
    page_pellegrino.screenshot(path=shot_pellegrino, full_page=False)
    print(f"-> Screenshot Pellegrino Tablet salvato: {shot_pellegrino}")
    context_pellegrino.close()

    browser.close()

print("\n==========================================================================")
print(" COLLAUDO TOTALE LA CORTE DELLA COMMEDIA COMPLETATO CON SUCCESSO SENZA ERRORI!")
print("==========================================================================\n")
