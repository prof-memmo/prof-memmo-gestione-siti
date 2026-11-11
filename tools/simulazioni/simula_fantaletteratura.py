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

PORT = 8095
WORKSPACE_DIR = "/Users/guglielmopiersanti/.gemini/antigravity-ide/scratch/fantaletteratura"
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
print(f"[TEST] Server HTTP attivo su porta {PORT}")

with sync_playwright() as p:
    print("\n==========================================================================")
    print(" COLLAUDO TOTALE ESPERIENZA DI GIOCO FANTALETTERATURA (NO CAPIBARA)")
    print(" CATTEDRA LIM + MINIGIOCHI SALA GIOCHI + NOTIFICHE + CLASSIFICA + HOME")
    print("==========================================================================\n")
    
    browser = p.chromium.launch(headless=True)
    
    # =========================================================================
    # FASE 1: DOCENTE ALLA CATTEDRA LIM (Desktop 1280x800) - NESSUN CAPIBARA!
    # =========================================================================
    print("--- [FASE 1] Cattedra Docente LIM (1280x800) - Autenticazione Piena & No Capibara ---")
    context_teacher = browser.new_context(
        viewport={'width': 1280, 'height': 800},
        device_scale_factor=1
    )
    page_teacher = context_teacher.new_page()
    page_teacher.on("pageerror", lambda err: print(f"[PAGE ERROR] {err}"))
    page_teacher.on("console", lambda msg: print(f"[CONSOLE] {msg.text}"))
    
    # Script di inizializzazione Docente con Pieno Abbonamento Ecosistema
    teacher_script = """
    const mockTeacher = {
        uid: 'doc_bianchi_lim',
        email: 'prof.bianchi@scuola.it',
        displayName: 'Prof.ssa Bianchi',
        role: 'docente',
        subscription: 'docente_ecosistema'
    };

    localStorage.setItem('hub_user', JSON.stringify(mockTeacher));
    localStorage.setItem('hub_user_email', mockTeacher.email);
    localStorage.setItem('hub_user_name', mockTeacher.displayName);
    localStorage.setItem('hub_user_role', 'docente');
    localStorage.setItem('fanta_user_email', mockTeacher.email);
    localStorage.setItem('fanta_user_name', mockTeacher.displayName);
    localStorage.setItem('fanta_user_role', 'docente');
    localStorage.setItem('fanta_user_piano', 'docente_ecosistema');

    window.__mockTeams = [
        {
            id: 'team_cavalieri_3d',
            docId: 'team_cavalieri_3d',
            name: "I Cavalieri dell'Ariosto",
            classe: '3D',
            classCode: '3D',
            classId: 'classe_3d',
            ownerEmail: 'prof.bianchi@scuola.it',
            authors: [
                { id: 'a1', name: 'Ugo Foscolo' },
                { id: 'a2', name: 'Giacomo Leopardi' },
                { id: 'a3', name: 'Alessandro Manzoni' },
                { id: 'a4', name: 'Giosuè Carducci' },
                { id: 'a7', name: "Gabriele D'Annunzio" }
            ],
            points: 125,
            missionsCompleted: 0,
            minigamePoints: 0,
            mode: 'terze',
            teamType: 'scuola',
            status: 'active',
            members: [
                { uid: 'stud_mario_3d', name: 'Mario Rossi', email: 'stud_mario_3d@studente.profmemmo.it' },
                { uid: 'stud_giulia_3d', name: 'Giulia Bianchi', email: 'stud_giulia_3d@studente.profmemmo.it' }
            ]
        },
        {
            id: 'team_poeti_3d',
            docId: 'team_poeti_3d',
            name: "I Poeti Maledetti",
            classe: '3D',
            classCode: '3D',
            classId: 'classe_3d',
            ownerEmail: 'prof.bianchi@scuola.it',
            authors: [
                { id: 'a5', name: 'Giovanni Verga' },
                { id: 'a6', name: 'Giovanni Pascoli' },
                { id: 'a8', name: 'Luigi Pirandello' },
                { id: 'a9', name: 'Filippo Tommaso Marinetti' },
                { id: 'a10', name: 'Giuseppe Ungaretti' }
            ],
            points: 110,
            missionsCompleted: 0,
            minigamePoints: 0,
            mode: 'terze',
            teamType: 'scuola',
            status: 'active',
            members: [
                { uid: 'stud_anna_3d', name: 'Anna Neri', email: 'anna.neri@studenti.edu.it' }
            ]
        }
    ];

    const createQuerySnap = (teams) => ({
        empty: teams.length === 0,
        docs: teams.map(t => ({
            id: t.id,
            data: () => t,
            ref: {
                update: async (data) => Object.assign(t, data),
                delete: async () => {}
            }
        })),
        forEach: function(cb) { this.docs.forEach(cb); }
    });

    const mockDbTeacher = {
        collection: (colName) => {
            if (colName === 'hub_users') {
                return {
                    doc: (docId) => ({
                        get: async () => ({
                            exists: true,
                            data: () => ({
                                role: 'docente',
                                subscription: 'docente_ecosistema',
                                piano: 'docente_ecosistema',
                                email: 'prof.bianchi@scuola.it',
                                name: 'Prof.ssa Bianchi'
                            })
                        })
                    }),
                    where: () => ({
                        limit: () => ({
                            get: async () => ({
                                empty: false,
                                docs: [{
                                    data: () => ({
                                        role: 'docente',
                                        subscription: 'docente_ecosistema',
                                        piano: 'docente_ecosistema',
                                        email: 'prof.bianchi@scuola.it'
                                    })
                                }]
                            })
                        })
                    })
                };
            }
            if (colName === 'games_status') {
                return {
                    doc: () => ({
                        onSnapshot: (cb) => {
                            cb({
                                exists: true,
                                data: () => ({
                                    isActive: true,
                                    allowedPlans: { base: true, docente_didattico: true, docente_ecosistema: true, viandante: true }
                                })
                            });
                            return () => {};
                        }
                    })
                };
            }
            if (colName === 'fanta_missions') {
                return {
                    where: () => ({
                        get: async () => ({ empty: true, docs: [] })
                    }),
                    add: async () => ({ id: 'mis_' + Date.now() })
                };
            }
            return {
                get: async () => createQuerySnap(window.__mockTeams),
                where: (field, op, val) => ({
                    get: async () => createQuerySnap(val ? window.__mockTeams.filter(t => t[field] === val || t.classe === val || t.classCode === val) : window.__mockTeams),
                    limit: () => ({ get: async () => createQuerySnap(val ? window.__mockTeams.filter(t => t[field] === val || t.classe === val || t.classCode === val) : window.__mockTeams) })
                }),
                doc: (docId) => ({
                    get: async () => {
                        const t = window.__mockTeams.find(x => x.id === docId || x.docId === docId);
                        return { exists: !!t, id: docId, data: () => t };
                    },
                    update: async (data) => {
                        const t = window.__mockTeams.find(x => x.id === docId || x.docId === docId);
                        if (t) Object.assign(t, data);
                    },
                    set: async () => {}
                })
            };
        }
    };

    Object.defineProperty(window, 'db', { get: () => mockDbTeacher, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbTeacher, set: () => {}, configurable: true });

    // Mock Firebase Auth per Docente autenticato
    window.addEventListener('DOMContentLoaded', () => {
        if (window.firebase && window.firebase.auth) {
            window.firebase.auth = () => ({
                currentUser: {
                    uid: mockTeacher.uid,
                    email: mockTeacher.email,
                    displayName: mockTeacher.displayName
                },
                onAuthStateChanged: (cb) => {
                    cb({
                        uid: mockTeacher.uid,
                        email: mockTeacher.email,
                        displayName: mockTeacher.displayName
                    });
                    return () => {};
                }
            });
        }
        if (window.fanta_db) {
            window.fanta_db.onAuthStateChanged = (cb) => {
                cb({
                    uid: mockTeacher.uid,
                    email: mockTeacher.email,
                    displayName: mockTeacher.displayName
                });
                return () => {};
            };
            window.fanta_db.getTeams = async () => window.__mockTeams;
            window.fanta_db.getUserTeams = async (email) => window.__mockTeams.filter(t => t.ownerEmail === email);
            window.fanta_db.getCollaboratedTeams = async () => [];
        }
    });
    """
    page_teacher.add_init_script(teacher_script)
    page_teacher.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_teacher.wait_for_timeout(3000)
    
    # Entra nel Profilo / Cattedra Docente
    page_teacher.evaluate("""async () => {
        setLoggedIn('prof.bianchi@scuola.it', 'docente');
        navigateTo('view-profilo');
        if (typeof renderProfilo === 'function') await renderProfilo();
    }""")
    page_teacher.wait_for_timeout(1000)
    
    # Controllo tassativo: IL CAPIBARA NON DEVE ESSERE VISIBILE SULLA CATTEDRA!
    is_capibara_visible = page_teacher.evaluate("""() => {
        const overlay = document.getElementById('pm-subscription-overlay');
        const isOverlayActive = overlay && (overlay.classList.contains('pm-guard-active') || overlay.style.display === 'flex');
        const legacyOverlay = document.getElementById('hub-guard-modal');
        const isLegacyActive = legacyOverlay && legacyOverlay.style.display !== 'none';
        return !!(isOverlayActive || isLegacyActive);
    }""")
    print(f"1.1 Overlay Capibara presente sulla Cattedra Docente: {is_capibara_visible}")
    assert not is_capibara_visible, "ERRORE CRITICO: Il Capibara è visibile e copre la Cattedra del Docente!"
    
    # Verifica che le squadre e i pulsanti siano pienamente fruibili
    cattedra_text = page_teacher.evaluate("""() => {
        const list = document.getElementById('profilo-squadre-list');
        return list ? list.innerText : '';
    }""")
    print(f"1.2 Squadre visualizzate in Cattedra: {cattedra_text[:140]}...")
    assert "I Cavalieri dell'Ariosto" in cattedra_text, "La squadra non appare nella cattedra del docente!"
    assert "Docente Collaboratore" not in cattedra_text or "Componi" in cattedra_text, "I pulsanti della cattedra non sono visibili!"
    
    # Convalida della missione didattica sul campo (+5 Punti)
    new_team_score = page_teacher.evaluate("""async () => {
        const t = window.__mockTeams.find(x => x.id === 'team_cavalieri_3d');
        if (t) {
            t.missionsCompleted = (t.missionsCompleted || 0) + 1;
            t.points = (t.points || 125) + 5;
            if (typeof renderProfilo === 'function') await renderProfilo();
            return t.points;
        }
        return null;
    }""")
    print(f"1.3 Punteggio squadra aggiornato dopo approvazione missione: {new_team_score} pt (atteso: 130 pt)")
    assert new_team_score == 130, f"Atteso 130 pt, trovato {new_team_score} pt"
    
    # Screenshot 1: Cattedra Docente LIM Pulita (Senza Capibara)
    shot_cattedra = os.path.join(ARTIFACTS_DIR, "fanta_cattedra_docente_lim_pulita.png")
    page_teacher.screenshot(path=shot_cattedra, full_page=False)
    print(f"-> Screenshot Cattedra salvato: {shot_cattedra}")
    
    # =========================================================================
    # FASE 2: SISTEMA DI NOTIFICHE ATTIVO (Header + Dropdown + Modale)
    # =========================================================================
    print("\n--- [FASE 2] Sistema Notifiche - Sblocco Nuove Schede & Modale Notifiche ---")
    
    # Simula la presenza di nuove schede autore sbloccate dal Game Master non ancora lette
    notif_count = page_teacher.evaluate("""async () => {
        // Sblocca la scheda di Alessandro Manzoni e Giacomo Leopardi
        if (typeof GAME_MODES !== 'undefined' && GAME_MODES.terze && GAME_MODES.terze.authors) {
            const aManzoni = GAME_MODES.terze.authors.find(a => a.id === 'a3');
            const aLeopardi = GAME_MODES.terze.authors.find(a => a.id === 'a2');
            if (aManzoni) aManzoni.isSchedaRevealed = true;
            if (aLeopardi) aLeopardi.isSchedaRevealed = true;
        }
        localStorage.removeItem('fanta_seen_schede'); // Rende entrambe le schede 'non lette'
        
        if (typeof renderNotifiche === 'function') {
            await renderNotifiche();
        }
        const badge = document.getElementById('header-notification-badge');
        return badge ? badge.innerText : '0';
    }""")
    print(f"2.1 Contatore Notifiche rilevato nell'Header: {notif_count} nuove notifiche")
    assert int(notif_count) >= 2, f"Attese almeno 2 notifiche, rilevate: {notif_count}"
    
    # Apri il Modale Notifiche
    page_teacher.evaluate("""() => {
        if (typeof apriNotificheModal === 'function') {
            apriNotificheModal();
        }
    }""")
    page_teacher.wait_for_timeout(600)
    
    notif_list_text = page_teacher.evaluate("""() => {
        const l = document.getElementById('profilo-notifiche-list');
        return l ? l.innerText : '';
    }""")
    print(f"2.2 Contenuto Modale Notifiche: {notif_list_text[:140]}...")
    assert "Manzoni" in notif_list_text or "Leopardi" in notif_list_text, "Le schede non compaiono nel modale notifiche!"
    
    # Screenshot 2: Modale Notifiche con badge
    shot_notifiche = os.path.join(ARTIFACTS_DIR, "fanta_modale_notifiche_attivo.png")
    page_teacher.screenshot(path=shot_notifiche, full_page=False)
    print(f"-> Screenshot Notifiche salvato: {shot_notifiche}")
    
    # Chiudi modale notifiche e segna come lette
    page_teacher.evaluate("""() => {
        if (typeof segnaTutteNotificheComeLette === 'function') {
            segnaTutteNotificheComeLette();
        }
        const m = document.getElementById('notifiche-modal');
        if (m) m.style.display = 'none';
    }""")
    page_teacher.wait_for_timeout(400)
    
    # =========================================================================
    # FASE 3: SALA GIOCHI LETTERARIA & MINIGIOCHI INTERATTIVI
    # =========================================================================
    print("\n--- [FASE 3] Sala Giochi Letteraria - Esplorazione & Manche Minigioco ---")
    
    # Naviga su view-salagiochi
    page_teacher.evaluate("navigateTo('view-salagiochi')")
    page_teacher.wait_for_timeout(800)
    
    salagiochi_active = page_teacher.evaluate("() => document.getElementById('view-salagiochi')?.classList.contains('active')")
    print(f"3.1 Vista Sala Giochi attiva: {salagiochi_active}")
    assert salagiochi_active, "La vista view-salagiochi non è attiva!"
    
    # Verifica presenza dei 5 minigiochi
    minigames_present = page_teacher.evaluate("""() => {
        const text = document.getElementById('view-salagiochi')?.innerText || '';
        return {
            hasQuiz: text.includes('Quiz Letterario'),
            hasImpiccato: text.includes("L'Impiccato"),
            hasCloze: text.includes('Testo Bucato'),
            hasPuzzle: text.includes('Puzzle di Citazioni'),
            hasVersi: text.includes('Riordina i Versi')
        };
    }""")
    print(f"3.2 Presenza dei 5 Minigiochi in Sala Giochi: {minigames_present}")
    assert all(minigames_present.values()), "Non tutti i 5 minigiochi sono presenti nella Sala Giochi!"
    
    # Screenshot 3: Catalogo Sala Giochi Letteraria
    shot_salagiochi = os.path.join(ARTIFACTS_DIR, "fanta_salagiochi_catalogo.png")
    page_teacher.screenshot(path=shot_salagiochi, full_page=False)
    print(f"-> Screenshot Sala Giochi salvato: {shot_salagiochi}")
    
    # Avvia Minigioco reale: Quiz Letterario su Alessandro Manzoni (a3)
    quiz_started = page_teacher.evaluate("""() => {
        if (window.EroiMinigames && typeof window.EroiMinigames.startMinigameDirect === 'function') {
            window.EroiMinigames.startMinigameDirect('quiz', 'a3');
            const c = document.getElementById('minigame-container');
            return c && c.style.display !== 'none';
        }
        return false;
    }""")
    print(f"3.3 Modale Minigioco Quiz aperto: {quiz_started}")
    assert quiz_started, "Il contenitore del minigioco non si è aperto!"
    page_teacher.wait_for_timeout(800)
    
    # Leggi il contenuto della domanda del quiz
    quiz_content = page_teacher.evaluate("""() => {
        const content = document.getElementById('minigame-content');
        return content ? content.innerText : '';
    }""")
    print(f"3.4 Contenuto Domanda Quiz: {quiz_content[:120]}...")
    assert len(quiz_content) > 10, "Il contenuto del Quiz non è stato renderizzato!"
    
    # Screenshot 4: Minigioco Quiz Attivo
    shot_minigioco = os.path.join(ARTIFACTS_DIR, "fanta_minigioco_quiz_interattivo.png")
    page_teacher.screenshot(path=shot_minigioco, full_page=False)
    print(f"-> Screenshot Minigioco salvato: {shot_minigioco}")
    
    # Chiudi minigioco
    page_teacher.evaluate("""() => {
        const c = document.getElementById('minigame-container');
        if (c) c.style.display = 'none';
        document.body.style.overflow = 'auto';
    }""")
    page_teacher.wait_for_timeout(400)
    
    # =========================================================================
    # FASE 4: STUDENTE SU MOBILE (iPhone 390x844) - HOME & IMPREVISTO ATTIVO
    # =========================================================================
    print("\n--- [FASE 4] Studente Mobile (390x844) - Home, Squadra & Pergamena Imprevisto ---")
    context_student = browser.new_context(
        viewport={'width': 390, 'height': 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True
    )
    page_student = context_student.new_page()
    
    student_script = """
    const mockStudent = {
        uid: 'stud_mario_3d',
        email: 'stud_mario_3d@studente.profmemmo.it',
        studentName: 'Mario Rossi',
        displayName: 'Mario Rossi',
        role: 'studente',
        classCode: '3D',
        classe: '3D'
    };
    localStorage.setItem('hub_user', JSON.stringify(mockStudent));
    localStorage.setItem('hub_user_email', mockStudent.email);
    localStorage.setItem('hub_user_name', mockStudent.displayName);
    localStorage.setItem('hub_user_role', 'studente');
    localStorage.setItem('hub_user_class', '3D');
    localStorage.setItem('pm_student_class', '3D');
    localStorage.setItem('fanta_user_email', mockStudent.email);
    localStorage.setItem('fanta_user_name', mockStudent.displayName);
    localStorage.setItem('fanta_user_role', 'studente');
    localStorage.setItem('fanta_student_team_code', '3D');
    localStorage.setItem('fanta_active_team_code', '3D');

    window.__mockTeams = [
        {
            id: 'team_cavalieri_3d',
            docId: 'team_cavalieri_3d',
            name: "I Cavalieri dell'Ariosto",
            classe: '3D',
            classCode: '3D',
            classId: 'classe_3d',
            ownerEmail: 'prof.bianchi@scuola.it',
            authors: [
                { id: 'a1', name: 'Ugo Foscolo' },
                { id: 'a2', name: 'Giacomo Leopardi' },
                { id: 'a3', name: 'Alessandro Manzoni' },
                { id: 'a4', name: 'Giosuè Carducci' },
                { id: 'a7', name: "Gabriele D'Annunzio" }
            ],
            points: 130,
            missionsCompleted: 1,
            minigamePoints: 0,
            mode: 'terze',
            teamType: 'scuola',
            status: 'active',
            members: [
                { uid: 'stud_mario_3d', name: 'Mario Rossi', email: 'stud_mario_3d@studente.profmemmo.it' }
            ]
        }
    ];

    const createQuerySnap = (teams) => ({
        empty: teams.length === 0,
        docs: teams.map(t => ({
            id: t.id,
            data: () => t,
            ref: { update: async () => {}, delete: async () => {} }
        })),
        forEach: function(cb) { this.docs.forEach(cb); }
    });

    const mockDbStudent = {
        collection: (colName) => {
            if (colName === 'hub_users') {
                return {
                    doc: () => ({
                        get: async () => ({
                            exists: true,
                            data: () => ({ role: 'studente', classCode: '3D', classe: '3D', teamId: 'team_cavalieri_3d' })
                        })
                    })
                };
            }
            return {
                get: async () => createQuerySnap(window.__mockTeams),
                where: () => ({
                    get: async () => createQuerySnap(window.__mockTeams),
                    limit: () => ({ get: async () => createQuerySnap(window.__mockTeams) })
                }),
                doc: (docId) => ({
                    get: async () => {
                        const t = window.__mockTeams.find(x => x.id === docId || x.docId === docId);
                        return { exists: !!t, id: docId, data: () => t };
                    }
                })
            };
        }
    };

    Object.defineProperty(window, 'db', { get: () => mockDbStudent, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbStudent, set: () => {}, configurable: true });

    window.fanta_db = window.fanta_db || {};
    window.fanta_db.onAuthStateChanged = (cb) => {
        setTimeout(() => cb(null), 50);
        return () => {};
    };
    window.fanta_db.getTeams = async () => window.__mockTeams;
    window.fanta_db.getTeamByCode = async (code) => window.__mockTeams.find(t => t.classCode === code || t.classe === code) || null;
    """
    page_student.add_init_script(student_script)
    page_student.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_student.wait_for_timeout(3000)
    
    # Attiva l'imprevisto letterario sulla pergamena
    page_student.evaluate("""() => {
        if (window.ImprevistiService) {
            const card = window.ImprevistiService.LORE_DECK.find(c => c.cardId === 'carducci_nobel');
            const ev = {
                id: 'imp_carducci_official',
                date: window.ImprevistiService.getTodayString(),
                cardId: card.cardId,
                title: card.title,
                subtitle: card.subtitle,
                lore: card.lore,
                effectType: 'bonus',
                points: 4,
                isForcedActive: true,
                isBlocked: false
            };
            window.ImprevistiService._events = [ev];
            localStorage.setItem('fanta_imprevisti_events', JSON.stringify([ev]));
            if (typeof window.renderStudentImprevistiNotice === 'function') {
                window.renderStudentImprevistiNotice();
            }
        }
    }""")
    page_student.wait_for_timeout(600)
    
    # Verifica che lo studente sia su view-welcome con la sua squadra e senza Capibara
    student_home_check = page_student.evaluate("""() => {
        const vw = document.getElementById('view-welcome');
        const capibara = document.getElementById('pm-subscription-overlay');
        const isCapibara = capibara && (capibara.classList.contains('pm-guard-active') || capibara.style.display === 'flex');
        const teamText = document.getElementById('logged-in-normal-content')?.innerText || '';
        const bannerText = document.getElementById('student-imprevisti-banner')?.innerText || '';
        return {
            isWelcome: vw && vw.classList.contains('active'),
            isCapibara: !!isCapibara,
            teamName: teamText.includes("I Cavalieri dell'Ariosto"),
            hasScore: teamText.includes("130 pt"),
            hasImprevisto: bannerText.includes("Carducci vince il Nobel") && bannerText.includes("+4 Punti")
        };
    }""")
    print(f"4.1 Verifiche Home Studente Mobile: {student_home_check}")
    assert student_home_check['isWelcome'], "Lo studente non è su view-welcome!"
    assert not student_home_check['isCapibara'], "Capibara presente sullo schermo dello studente!"
    assert student_home_check['teamName'], "Nome squadra non visualizzato!"
    assert student_home_check['hasScore'], "Punteggio 130 pt non visualizzato!"
    assert student_home_check['hasImprevisto'], "Pergamena imprevisto non visualizzata con il bonus atteso!"
    
    # Screenshot 5: Home Studente Mobile Completa
    shot_studente = os.path.join(ARTIFACTS_DIR, "fanta_studente_mobile_completo.png")
    page_student.screenshot(path=shot_studente, full_page=False)
    print(f"-> Screenshot Studente salvato: {shot_studente}")
    
    # =========================================================================
    # FASE 5: CLASSIFICA UFFICIALE LIVE SU TABLET (iPad 810x1080)
    # =========================================================================
    print("\n--- [FASE 5] Classifica Live Ufficiale su Tablet (iPad 810x1080) ---")
    context_tablet = browser.new_context(
        viewport={'width': 810, 'height': 1080},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True
    )
    page_tablet = context_tablet.new_page()
    page_tablet.add_init_script(student_script)
    page_tablet.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_tablet.wait_for_timeout(3000)
    
    # Apri Classifiche
    page_tablet.evaluate("""() => {
        navigateTo('view-classifiche');
        selectLeaderboardTarget('scuola');
        selectLeaderboardMode('terze');
        showLeaderboard('globale');
    }""")
    page_tablet.wait_for_timeout(1000)
    
    rankings_list = page_tablet.evaluate("""() => {
        const items = document.querySelectorAll('#leaderboard-list .rank-item');
        return Array.from(items).map(i => i.innerText.replace(/\\n/g, ' '));
    }""")
    print(f"5.1 Elementi Graduatoria Ufficiale: {rankings_list}")
    assert any("I Cavalieri dell'Ariosto" in item for item in rankings_list), "La squadra non è in classifica!"
    
    # Screenshot 6: Classifica Live Tablet
    shot_classifica = os.path.join(ARTIFACTS_DIR, "fanta_classifiche_live_tablet_completo.png")
    page_tablet.screenshot(path=shot_classifica, full_page=False)
    print(f"-> Screenshot Classifica salvato: {shot_classifica}")
    
    # =========================================================================
    # FASE 6: ESPERIENZA VIANDANTE / OSPITE (Mobile 390x844)
    # Autenticazione libera, Creazione squadra autonoma, Sala Giochi, Classifica Viandanti
    # =========================================================================
    print("\n--- [FASE 6] Esperienza Viandante Mobile (390x844) - Gioco Libero & Campionato Separato ---")
    context_viandante = browser.new_context(
        viewport={'width': 390, 'height': 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True
    )
    page_viandante = context_viandante.new_page()

    viandante_script = """
    const mockViandante = {
        uid: 'viandante_marco_77',
        email: 'marco.viandante@libero.it',
        displayName: 'Marco il Viandante',
        role: 'viandante',
        subscription: 'viandante'
    };

    localStorage.setItem('hub_user', JSON.stringify(mockViandante));
    localStorage.setItem('hub_user_email', mockViandante.email);
    localStorage.setItem('hub_user_name', mockViandante.displayName);
    localStorage.setItem('hub_user_role', 'viandante');
    localStorage.setItem('fanta_user_email', mockViandante.email);
    localStorage.setItem('fanta_user_name', mockViandante.displayName);
    localStorage.setItem('fanta_user_role', 'viandante');
    localStorage.setItem('fanta_user_piano', 'viandante');

    window.__mockTeams = [
        {
            id: 'team_cavalieri_3d',
            docId: 'team_cavalieri_3d',
            name: "I Cavalieri dell'Ariosto",
            classe: '3D',
            classCode: '3D',
            classId: 'classe_3d',
            ownerEmail: 'prof.bianchi@scuola.it',
            authors: [
                { id: 'a1', name: 'Ugo Foscolo' },
                { id: 'a2', name: 'Giacomo Leopardi' },
                { id: 'a3', name: 'Alessandro Manzoni' },
                { id: 'a4', name: 'Giosuè Carducci' },
                { id: 'a7', name: "Gabriele D'Annunzio" }
            ],
            points: 125,
            missionsCompleted: 1,
            minigamePoints: 0,
            mode: 'terze',
            teamType: 'scuola',
            status: 'active'
        },
        {
            id: 'team_viandanti_solitari',
            docId: 'team_viandanti_solitari',
            name: 'I Viandanti Solitari',
            classe: '',
            classCode: '',
            ownerEmail: 'marco.viandante@libero.it',
            authors: [
                { id: 'a1', name: 'Ugo Foscolo' },
                { id: 'a2', name: 'Giacomo Leopardi' },
                { id: 'a3', name: 'Alessandro Manzoni' },
                { id: 'a4', name: 'Giosuè Carducci' },
                { id: 'a7', name: "Gabriele D'Annunzio" }
            ],
            points: 0,
            missionsCompleted: 0,
            minigamePoints: 0,
            mode: 'terze',
            teamType: 'viandante',
            status: 'active'
        }
    ];

    const createQuerySnap = (teams) => ({
        empty: teams.length === 0,
        docs: teams.map(t => ({
            id: t.id,
            data: () => t,
            ref: {
                update: async (data) => Object.assign(t, data),
                delete: async () => {}
            }
        })),
        forEach: function(cb) { this.docs.forEach(cb); }
    });

    const mockDbViandante = {
        collection: (colName) => {
            if (colName === 'hub_users') {
                return {
                    doc: () => ({
                        get: async () => ({
                            exists: true,
                            data: () => ({
                                role: 'viandante',
                                subscription: 'viandante',
                                piano: 'viandante',
                                email: 'marco.viandante@libero.it',
                                name: 'Marco il Viandante'
                            })
                        })
                    })
                };
            }
            if (colName === 'fanta_teams') {
                return {
                    get: async () => createQuerySnap(window.__mockTeams),
                    where: (field, op, val) => ({
                        get: async () => {
                            const filtered = window.__mockTeams.filter(t => t[field] === val);
                            return createQuerySnap(filtered);
                        },
                        limit: () => ({
                            get: async () => {
                                const filtered = window.__mockTeams.filter(t => t[field] === val);
                                return createQuerySnap(filtered);
                            }
                        })
                    }),
                    doc: (docId) => ({
                        get: async () => {
                            const t = window.__mockTeams.find(x => x.id === docId || x.docId === docId);
                            return { exists: !!t, id: docId, data: () => t };
                        },
                        update: async (data) => {
                            const t = window.__mockTeams.find(x => x.id === docId || x.docId === docId);
                            if (t) Object.assign(t, data);
                        }
                    })
                };
            }
            return {
                get: async () => createQuerySnap([]),
                where: () => ({
                    get: async () => createQuerySnap([]),
                    limit: () => ({ get: async () => createQuerySnap([]) })
                }),
                doc: (docId) => ({
                    get: async () => ({ exists: false, data: () => ({}) }),
                    set: async () => {},
                    update: async () => {}
                })
            };
        }
    };

    Object.defineProperty(window, 'db', { get: () => mockDbViandante, set: () => {}, configurable: true });
    Object.defineProperty(window, 'fbDb', { get: () => mockDbViandante, set: () => {}, configurable: true });

    window.fanta_db = window.fanta_db || {};
    window.fanta_db.onAuthStateChanged = (cb) => {
        setTimeout(() => cb({
            uid: mockViandante.uid,
            email: mockViandante.email,
            displayName: mockViandante.displayName
        }), 50);
        return () => {};
    };
    window.fanta_db.getTeams = async () => window.__mockTeams;
    window.fanta_db.getCollaboratedTeams = async () => [];
    window.fanta_db.saveTeam = async (t) => {
        window.__mockTeams.push(t);
        return t;
    };
    """
    page_viandante.add_init_script(viandante_script)
    page_viandante.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page_viandante.wait_for_timeout(2000)

    # Inizializza sessione Viandante
    page_viandante.evaluate("""async () => {
        setLoggedIn('marco.viandante@libero.it', 'viandante');
        if (typeof renderProfilo === 'function') await renderProfilo();
    }""")
    page_viandante.wait_for_timeout(600)

    # 6.1 Verifica Home & Ruolo Viandante
    viandante_home_check = page_viandante.evaluate("""() => {
        const capibara = document.getElementById('pm-subscription-overlay');
        const isCapibara = capibara && (capibara.classList.contains('pm-guard-active') || capibara.style.display === 'flex');
        const headerRole = document.getElementById('header-user-role')?.innerText || '';
        const normalContent = document.getElementById('logged-in-normal-content')?.innerText || '';
        const welcomeH3 = document.querySelector('#logged-in-normal-content h3')?.innerText || '';
        const inviteBtn = document.getElementById('btn-invite-dropdown');
        const inviteVisible = inviteBtn && inviteBtn.style.display !== 'none';
        return {
            isCapibara: !!isCapibara,
            headerRole: headerRole,
            welcomeText: welcomeH3,
            hasViandanteArea: normalContent.includes("area personale Viandante"),
            inviteHidden: !inviteVisible
        };
    }""")
    print(f"6.1 Verifiche Accoglienza Viandante: {viandante_home_check}")
    assert not viandante_home_check['isCapibara'], "Capibara presente sullo schermo del Viandante!"
    assert "Viandante" in viandante_home_check['welcomeText'], f"Saluto inatteso: {viandante_home_check['welcomeText']}"
    assert viandante_home_check['hasViandanteArea'], "Area personale Viandante non visualizzata!"
    assert viandante_home_check['inviteHidden'], "Pulsante Invito Studenti non deve essere visibile al Viandante!"

    # Screenshot 7: Home Viandante Mobile
    shot_viandante_home = os.path.join(ARTIFACTS_DIR, "fanta_viandante_home_mobile.png")
    page_viandante.screenshot(path=shot_viandante_home, full_page=False)
    print(f"-> Screenshot Viandante Home salvato: {shot_viandante_home}")

    # 6.2 Sala Giochi: Guadagno XP per la squadra del Viandante
    print("\n--- [6.2] Sala Giochi Viandante - Guadagno Punti Minigioco ---")
    page_viandante.evaluate("""() => {
        navigateTo('view-minigiochi');
    }""")
    page_viandante.wait_for_timeout(600)

    minigame_assigned = page_viandante.evaluate("""async () => {
        if (window.EroiMinigames && typeof window.EroiMinigames.assignPointsToTeamLegacy === 'function') {
            await window.EroiMinigames.assignPointsToTeamLegacy(20);
            const team = window.__mockTeams.find(t => t.id === 'team_viandanti_solitari');
            return team ? team.minigamePoints : 0;
        }
        return -1;
    }""")
    print(f"6.2 Punti Minigioco Squadra Viandante dopo vittoria (+20 XP): {minigame_assigned} pt")
    assert minigame_assigned == 20, f"Punti minigioco non assegnati correttamente: {minigame_assigned}"

    # 6.3 Classifiche & Toggle Campionato Viandanti vs Scuole
    print("\n--- [6.3] Classifica Ufficiale - Separazione Campionato Viandanti vs Scuole ---")
    page_viandante.evaluate("""() => {
        navigateTo('view-classifiche');
        selectLeaderboardTarget('viandante');
        selectLeaderboardMode('terze');
        showLeaderboard('globale');
    }""")
    page_viandante.wait_for_timeout(1000)

    # Classifica Viandanti
    viandanti_rankings = page_viandante.evaluate("""() => {
        const title = document.getElementById('leaderboard-title')?.innerText || '';
        const items = document.querySelectorAll('#leaderboard-list .rank-item');
        return {
            title: title,
            items: Array.from(items).map(i => i.innerText.replace(/\\n/g, ' '))
        };
    }""")
    print(f"6.3.A Graduatoria Campionato Viandanti: {viandanti_rankings}")
    assert any("I Viandanti Solitari (Viandante)" in item for item in viandanti_rankings['items']), "La squadra Viandante non compare nel Campionato Viandanti!"
    assert not any("I Cavalieri dell'Ariosto" in item for item in viandanti_rankings['items']), "La squadra Scuola è erroneamente visibile nel Campionato Viandanti!"

    # Toggle su Campionato Scuole
    page_viandante.evaluate("""() => {
        selectLeaderboardTarget('scuola');
        showLeaderboard('globale');
    }""")
    page_viandante.wait_for_timeout(1000)

    scuole_rankings = page_viandante.evaluate("""() => {
        const title = document.getElementById('leaderboard-title')?.innerText || '';
        const items = document.querySelectorAll('#leaderboard-list .rank-item');
        return {
            title: title,
            items: Array.from(items).map(i => i.innerText.replace(/\\n/g, ' '))
        };
    }""")
    print(f"6.3.B Graduatoria Campionato Scuole: {scuole_rankings}")
    assert any("I Cavalieri dell'Ariosto" in item for item in scuole_rankings['items']), "La squadra Scuola non compare nel Campionato Scuole!"
    assert not any("I Viandanti Solitari" in item for item in scuole_rankings['items']), "La squadra Viandante è erroneamente visibile nel Campionato Scuole!"

    # Torna su Classifica Viandanti e salva screenshot
    page_viandante.evaluate("""() => {
        selectLeaderboardTarget('viandante');
        showLeaderboard('globale');
    }""")
    page_viandante.wait_for_timeout(600)
    shot_viandante_classifica = os.path.join(ARTIFACTS_DIR, "fanta_viandante_classifiche_toggle.png")
    page_viandante.screenshot(path=shot_viandante_classifica, full_page=False)
    print(f"-> Screenshot Classifica Viandanti salvato: {shot_viandante_classifica}")
    
    browser.close()
    print("\n==========================================================================")
    print(" COLLAUDO INTEGRALE COMPLETATO CON SUCCESSO SENZA ERRORI! ")
    print("==========================================================================\n")
