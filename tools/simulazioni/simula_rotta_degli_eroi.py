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

PORT = 8097
WORKSPACE_DIR = "/Users/guglielmopiersanti/.gemini/antigravity-ide/scratch/la-rotta-degli-eroi"
ARTIFACTS_DIR = os.environ.get("ARTIFACTS_DIR", "/Users/guglielmopiersanti/.gemini/antigravity/brain/33706f47-51f8-4772-9423-8c984c6afda0")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError):
            pass

server = HTTPServerBase(('127.0.0.1', PORT), lambda *args, **kwargs: SilentHandler(*args, directory=WORKSPACE_DIR, **kwargs))
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()
print(f"[TEST] Server HTTP attivo su porta {PORT} per La Rotta degli Eroi")

with sync_playwright() as p:
    print("\n==========================================================================")
    print(" COLLAUDO TOTALE ESPERIENZA DI GIOCO: LA ROTTA DEGLI EROI")
    print(" 1. PAYWALL CAPIBARA (PIANO BASE) | 2. DOCENTE LIM | 3. STUDENTE | 4. VIANDANTE")
    print("==========================================================================\n")
    
    browser = p.chromium.launch(headless=True)
    
    # =========================================================================
    # FASE 1: TEST DI SICUREZZA PAYWALL (Docente con Piano Base / Non autorizzato)
    # Verifica che il Capibara SI ATTIVI correttamente a difesa del gioco premium
    # =========================================================================
    print("--- [FASE 1] Verifica Paywall Capibara (Docente Piano Base) - Desktop 1280x800 ---")
    context_paywall = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_paywall = context_paywall.new_page()
    
    paywall_script = """
    const mockUserBase = {
        uid: 'doc_base_unpaid',
        email: 'prof.base@scuola.it',
        name: 'Prof. Base Non Abbonato',
        displayName: 'Prof. Base Non Abbonato',
        role: 'docente',
        subscription: 'base',
        piano: 'base',
        setupComplete: true
    };

    localStorage.setItem('eroi_user', JSON.stringify(mockUserBase));
    localStorage.setItem('hub_user', JSON.stringify(mockUserBase));
    localStorage.setItem('hub_user_email', mockUserBase.email);
    localStorage.setItem('hub_user_role', 'docente');

    window.Auth = window.Auth || {};
    window.Auth._user = mockUserBase;
    window.Auth.getUser = () => mockUserBase;

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
                get: async () => ({ empty: true, docs: [] }),
                where: () => ({
                    get: async () => ({ empty: true, docs: [] }),
                    limit: () => ({ get: async () => ({ empty: true, docs: [] }) })
                })
            };
        }
    };

    Object.defineProperty(window, 'db', { get: () => mockDbBase, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbBase, set: () => {}, configurable: true });
    """
    page_paywall.add_init_script(paywall_script)
    page_paywall.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_paywall.wait_for_timeout(2500)
    
    # Prova ad accedere alla cattedra da utente non autorizzato
    page_paywall.evaluate("""async () => {
        if (window.Auth) {
            window.Auth._user = {
                uid: 'doc_base_unpaid',
                email: 'prof.base@scuola.it',
                name: 'Prof. Base Non Abbonato',
                role: 'docente',
                subscription: 'base',
                setupComplete: true
            };
            window.Auth.getUser = () => window.Auth._user;
        }
        if (window.EroiApp && typeof window.EroiApp.navigateTo === 'function') {
            await window.EroiApp.navigateTo('view-teacher-dashboard');
        }
    }""")
    page_paywall.wait_for_timeout(1000)
    
    # Verifica che il Capibara sia regolarmente attivo a protezione del paywall
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
    
    shot_paywall = os.path.join(ARTIFACTS_DIR, "rotta_capibara_paywall_attivo.png")
    page_paywall.screenshot(path=shot_paywall, full_page=False)
    print(f"-> Screenshot Paywall salvato: {shot_paywall}")
    
    # =========================================================================
    # FASE 2: CATTEDRA LIM DOCENTE ABBONATO (Piano docente_ecosistema)
    # Verifica che il Capibara NON si attivi e la Cattedra LIM funzioni regolarmente
    # =========================================================================
    print("\n--- [FASE 2] Cattedra LIM Docente Abbonato (docente_ecosistema) - Desktop 1280x800 ---")
    context_teacher = browser.new_context(viewport={'width': 1280, 'height': 800})
    page_teacher = context_teacher.new_page()
    
    teacher_script = """
    const mockTeacher = {
        uid: 'doc_bianchi_rotta',
        email: 'prof.bianchi@scuola.it',
        name: 'Prof.ssa Bianchi',
        displayName: 'Prof.ssa Bianchi',
        role: 'docente',
        subscription: 'docente_ecosistema',
        piano: 'docente_ecosistema',
        setupComplete: true
    };

    localStorage.setItem('eroi_user', JSON.stringify(mockTeacher));
    localStorage.setItem('hub_user', JSON.stringify(mockTeacher));
    localStorage.setItem('hub_user_email', mockTeacher.email);
    localStorage.setItem('hub_user_role', 'docente');

    const mockClass = {
        id: 'classe_1a',
        code: 'ER-MITO1',
        name: '1A Epica Classica',
        teacherEmail: 'prof.bianchi@scuola.it',
        teacherId: 'doc_bianchi_rotta'
    };

    const mockDbTeacher = {
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
                            data: () => mockTeacher
                        })
                    })
                };
            }
            if (colName === 'hub_classes' || colName === 'classes' || colName === 'eroi_classes') {
                return {
                    where: () => ({
                        limit: () => ({
                            get: async () => ({
                                empty: false,
                                docs: [{ id: 'classe_1a', data: () => mockClass }]
                            })
                        }),
                        get: async () => ({
                            empty: false,
                            docs: [{ id: 'classe_1a', data: () => mockClass }]
                        })
                    }),
                    doc: () => ({
                        get: async () => ({ exists: true, data: () => mockClass })
                    })
                };
            }
            return {
                doc: () => ({
                    get: async () => ({ exists: false, data: () => ({}) }),
                    set: async () => {},
                    update: async () => {}
                }),
                get: async () => ({ empty: true, docs: [] }),
                where: () => ({
                    get: async () => ({ empty: true, docs: [] }),
                    limit: () => ({ get: async () => ({ empty: true, docs: [] }) })
                })
            };
        }
    };

    Object.defineProperty(window, 'db', { get: () => mockDbTeacher, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbTeacher, set: () => {}, configurable: true });
    """
    page_teacher.add_init_script(teacher_script)
    page_teacher.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_teacher.wait_for_timeout(2500)
    
    # Inizializza Cattedra Docente
    page_teacher.evaluate("""async () => {
        if (window.EroiDB) {
            window.EroiDB.saveUser('prof.bianchi@scuola.it', {
                email: 'prof.bianchi@scuola.it',
                name: 'Prof.ssa Bianchi',
                role: 'docente'
            });
            window.EroiDB.saveClass('1A', {
                id: '1A',
                code: 'ER-MITO1',
                name: '1A Epica Classica',
                teacherEmail: 'prof.bianchi@scuola.it'
            });
        }
        if (window.Auth) {
            window.Auth._user = {
                uid: 'doc_bianchi_rotta',
                email: 'prof.bianchi@scuola.it',
                name: 'Prof.ssa Bianchi',
                role: 'docente',
                subscription: 'docente_ecosistema',
                setupComplete: true
            };
        }
        if (window.EroiApp && typeof window.EroiApp.navigateTo === 'function') {
            await window.EroiApp.navigateTo('view-teacher-dashboard');
        }
    }""")
    page_teacher.wait_for_timeout(1000)
    
    teacher_check = page_teacher.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const currentView = document.querySelector('.view.active')?.id || '';
        const userRoleText = document.getElementById('user-display-role')?.innerText || '';
        const userNameText = document.getElementById('user-display-name')?.innerText || '';
        const cattedraTitle = document.getElementById('teacher-view-title')?.innerText || '';
        return {
            isBlocked: !!isBlocked,
            currentView: currentView,
            userRole: userRoleText,
            userName: userNameText,
            cattedraTitle: cattedraTitle
        };
    }""")
    print(f"2.1 Verifiche Cattedra LIM Docente: {teacher_check}")
    assert not teacher_check['isBlocked'], "ERRORE: Il Capibara blocca il docente con abbonamento attivo!"
    assert teacher_check['currentView'] == 'view-teacher-dashboard', f"Vista cattedra non attiva: {teacher_check['currentView']}"
    
    shot_teacher = os.path.join(ARTIFACTS_DIR, "rotta_cattedra_docente_lim.png")
    page_teacher.screenshot(path=shot_teacher, full_page=False)
    print(f"-> Screenshot Cattedra LIM salvato: {shot_teacher}")
    
    # =========================================================================
    # FASE 3: STUDENTE IN CLASSE SU MOBILE (iPhone 390x844)
    # Codice classe ER-MITO1 collegato al docente abbonato, navigazione mappa e guide
    # =========================================================================
    print("\n--- [FASE 3] Studente con Classe su Mobile (iPhone 390x844) ---")
    context_student = browser.new_context(
        viewport={'width': 390, 'height': 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True
    )
    page_student = context_student.new_page()
    
    student_script = """
    const mockStudent = {
        uid: 'stud_mario_rotta',
        email: 'stud.mario@scuola.it',
        name: 'Mario Rossi',
        displayName: 'Mario Rossi',
        role: 'studente',
        classId: '1A',
        teacherId: 'doc_bianchi_rotta',
        setupComplete: true
    };

    localStorage.setItem('eroi_user', JSON.stringify(mockStudent));
    localStorage.setItem('hub_user', JSON.stringify(mockStudent));
    localStorage.setItem('hub_user_email', mockStudent.email);
    localStorage.setItem('hub_user_role', 'studente');
    localStorage.setItem('hub_user_class', 'ER-MITO1');
    localStorage.setItem('pm_student_class', 'ER-MITO1');

    const mockClass = {
        id: '1A',
        code: 'ER-MITO1',
        name: '1A Epica Classica',
        teacherEmail: 'prof.bianchi@scuola.it',
        teacherId: 'doc_bianchi_rotta'
    };

    const mockTeacherDoc = {
        uid: 'doc_bianchi_rotta',
        email: 'prof.bianchi@scuola.it',
        subscription: 'docente_ecosistema',
        piano: 'docente_ecosistema',
        role: 'docente'
    };

    const mockDbStudent = {
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
                    doc: (id) => ({
                        get: async () => ({
                            exists: true,
                            data: () => (id === 'doc_bianchi_rotta' ? mockTeacherDoc : mockStudent)
                        })
                    }),
                    where: (field, op, val) => ({
                        limit: () => ({
                            get: async () => ({
                                empty: false,
                                docs: [{ data: () => (val === 'prof.bianchi@scuola.it' ? mockTeacherDoc : mockStudent) }]
                            })
                        })
                    })
                };
            }
            if (colName === 'hub_classes' || colName === 'classes' || colName === 'eroi_classes') {
                return {
                    where: () => ({
                        limit: () => ({
                            get: async () => ({
                                empty: false,
                                docs: [{ id: '1A', data: () => mockClass }]
                            })
                        }),
                        get: async () => ({
                            empty: false,
                            docs: [{ id: '1A', data: () => mockClass }]
                        })
                    }),
                    doc: () => ({
                        get: async () => ({ exists: true, data: () => mockClass })
                    })
                };
            }
            return {
                doc: () => ({
                    get: async () => ({ exists: false, data: () => ({}) }),
                    set: async () => {},
                    update: async () => {}
                }),
                get: async () => ({ empty: true, docs: [] }),
                where: () => ({
                    get: async () => ({ empty: true, docs: [] }),
                    limit: () => ({ get: async () => ({ empty: true, docs: [] }) })
                })
            };
        }
    };

    Object.defineProperty(window, 'db', { get: () => mockDbStudent, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbStudent, set: () => {}, configurable: true });
    """
    page_student.add_init_script(student_script)
    page_student.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_student.wait_for_timeout(2500)
    
    # Inizializza stato studente
    page_student.evaluate("""async () => {
        if (window.EroiDB) {
            window.EroiDB.saveUser('stud.mario@scuola.it', {
                email: 'stud.mario@scuola.it',
                name: 'Mario Rossi',
                role: 'studente',
                classId: '1A'
            });
            window.EroiDB.saveClass('1A', {
                id: '1A',
                code: 'ER-MITO1',
                name: '1A Epica Classica',
                teacherEmail: 'prof.bianchi@scuola.it'
            });
            window.EroiDB.saveStudentProfile('stud.mario@scuola.it', {
                xp: 150,
                dracme: 35,
                level: 'Guerriero del Mare',
                stats: { coraggio: 14, astuzia: 18, sapienza: 12, onore: 10 },
                completedMissions: ['tappa_troia']
            });
        }
        if (window.Auth) {
            window.Auth._user = {
                uid: 'stud_mario_rotta',
                email: 'stud.mario@scuola.it',
                name: 'Mario Rossi',
                role: 'studente',
                classId: '1A',
                teacherId: 'doc_bianchi_rotta',
                setupComplete: true
            };
            window.Auth.getUser = () => window.Auth._user;
        }
        if (window.EroiApp && typeof window.EroiApp.navigateTo === 'function') {
            await window.EroiApp.navigateTo('view-student-dashboard');
        }
    }""")
    page_student.wait_for_timeout(1000)
    
    student_check = page_student.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const currentView = document.querySelector('.view.active')?.id || '';
        const classCodeText = document.getElementById('student-class-content')?.innerText || '';
        return {
            isBlocked: !!isBlocked,
            currentView: currentView,
            hasActiveCode: classCodeText.includes('ER-MITO1')
        };
    }""")
    print(f"3.1 Verifiche Dashboard Studente Mobile: {student_check}")
    assert not student_check['isBlocked'], "ERRORE: Il Capibara blocca lo studente con classe attiva!"
    assert student_check['currentView'] == 'view-student-dashboard', f"Vista studente non attiva: {student_check['currentView']}"
    assert student_check['hasActiveCode'], "Codice classe ER-MITO1 non rilevato nella dashboard studente!"
    
    shot_student = os.path.join(ARTIFACTS_DIR, "rotta_studente_dashboard_mobile.png")
    page_student.screenshot(path=shot_student, full_page=False)
    print(f"-> Screenshot Studente salvato: {shot_student}")
    
    # Navigazione Mappa delle Tappe
    page_student.evaluate("""async () => {
        if (window.EroiApp && typeof window.EroiApp.navigateTo === 'function') {
            await window.EroiApp.navigateTo('view-map');
        }
    }""")
    page_student.wait_for_timeout(800)
    is_map_active = page_student.evaluate("() => document.getElementById('view-map')?.classList.contains('active')")
    print(f"3.2 Navigazione Mappa del Viaggio Epico attiva: {is_map_active}")
    assert is_map_active, "La vista Mappa non si è attivata!"
    
    # =========================================================================
    # FASE 4: VIANDANTE / FORESTIERO (Viaggiatore Libero su Tablet 810x1080)
    # Nessun codice classe, badge Viaggiatore Libero, Guadagno XP/Dracme e Emporio
    # =========================================================================
    print("\n--- [FASE 4] Viandante / Forestiero (Viaggiatore Libero) - Tablet 810x1080 ---")
    context_viandante = browser.new_context(
        viewport={'width': 810, 'height': 1080},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True
    )
    page_viandante = context_viandante.new_page()
    
    viandante_script = """
    const mockViandante = {
        uid: 'viandante_epico_88',
        email: 'viandante.epico@libero.it',
        name: 'Ulisse il Viandante',
        displayName: 'Ulisse il Viandante',
        role: 'forestiero',
        subscription: 'viandante',
        piano: 'viandante',
        setupComplete: true
    };

    localStorage.setItem('eroi_user', JSON.stringify(mockViandante));
    localStorage.setItem('hub_user', JSON.stringify(mockViandante));
    localStorage.setItem('hub_user_email', mockViandante.email);
    localStorage.setItem('hub_user_role', 'forestiero');

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
                            data: () => mockViandante
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
                get: async () => ({ empty: true, docs: [] }),
                where: () => ({
                    get: async () => ({ empty: true, docs: [] }),
                    limit: () => ({ get: async () => ({ empty: true, docs: [] }) })
                })
            };
        }
    };

    Object.defineProperty(window, 'db', { get: () => mockDbViandante, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbViandante, set: () => {}, configurable: true });
    """
    page_viandante.add_init_script(viandante_script)
    page_viandante.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_viandante.wait_for_timeout(2500)
    
    # Inizializza profilo Viandante / Forestiero
    page_viandante.evaluate("""async () => {
        if (window.EroiDB) {
            window.EroiDB.saveUser('viandante.epico@libero.it', {
                email: 'viandante.epico@libero.it',
                name: 'Ulisse il Viandante',
                role: 'forestiero'
            });
            window.EroiDB.saveStudentProfile('viandante.epico@libero.it', {
                xp: 280,
                dracme: 40,
                level: 'Esploratore delle Onde',
                stats: { coraggio: 16, astuzia: 20, sapienza: 14, onore: 12 },
                completedMissions: []
            });
        }
        if (window.Auth) {
            window.Auth._user = {
                uid: 'viandante_epico_88',
                email: 'viandante.epico@libero.it',
                name: 'Ulisse il Viandante',
                role: 'forestiero',
                subscription: 'viandante',
                setupComplete: true
            };
            window.Auth.getUser = () => window.Auth._user;
        }
        if (window.EroiApp && typeof window.EroiApp.navigateTo === 'function') {
            await window.EroiApp.navigateTo('view-student-dashboard');
        }
    }""")
    page_viandante.wait_for_timeout(1000)
    
    viandante_check = page_viandante.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isBlocked = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const classContent = document.getElementById('student-class-content')?.innerText || '';
        const roleText = document.getElementById('user-display-role')?.innerText || '';
        return {
            isBlocked: !!isBlocked,
            isViaggiatoreLibero: classContent.includes('Viaggiatore Libero') && classContent.includes('senza i vincoli di una classe'),
            userRole: roleText
        };
    }""")
    print(f"4.1 Verifiche Viandante / Forestiero: {viandante_check}")
    assert not viandante_check['isBlocked'], "ERRORE: Il Capibara blocca il Viandante con piano autorizzato!"
    assert viandante_check['isViaggiatoreLibero'], "Badge 'Viaggiatore Libero' non visualizzato!"
    
    # Guadagno Punti XP e Dracme d'Oro
    reward_result = page_viandante.evaluate("""() => {
        if (window.EroiGame) {
            window.EroiGame.addXP('viandante.epico@libero.it', 30);
            window.EroiGame.addDracme('viandante.epico@libero.it', 20);
            const prof = window.EroiDB.getStudentProfile('viandante.epico@libero.it');
            return { xp: prof.xp, dracme: prof.dracme };
        }
        return null;
    }""")
    print(f"4.2 Saldo Viandante dopo vittoria (+30 XP, +20 Dracme): {reward_result}")
    assert reward_result and reward_result['xp'] == 310, f"XP attesi 310, rilevati: {reward_result}"
    assert reward_result and reward_result['dracme'] == 60, f"Dracme attese 60, rilevate: {reward_result}"
    
    # Navigazione Emporio (Shop)
    page_viandante.evaluate("""async () => {
        if (window.EroiApp && typeof window.EroiApp.navigateTo === 'function') {
            await window.EroiApp.navigateTo('view-shop');
        }
    }""")
    page_viandante.wait_for_timeout(800)
    is_shop_active = page_viandante.evaluate("() => document.getElementById('view-shop')?.classList.contains('active')")
    print(f"4.3 Navigazione Emporio Mitico attiva: {is_shop_active}")
    assert is_shop_active, "La vista Emporio non si è attivata!"
    
    shot_viandante = os.path.join(ARTIFACTS_DIR, "rotta_viandante_libero_tablet.png")
    page_viandante.screenshot(path=shot_viandante, full_page=False)
    print(f"-> Screenshot Viandante salvato: {shot_viandante}")
    
    browser.close()
    print("\n==========================================================================")
    print(" COLLAUDO ROTTA DEGLI EROI COMPLETATO CON SUCCESSO SENZA ERRORI! ")
    print("==========================================================================\n")
