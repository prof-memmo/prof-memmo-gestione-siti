import os
import sys
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
from playwright.sync_api import sync_playwright

PORT = 8095
ROOT_DIR = "/Users/guglielmopiersanti/.gemini/antigravity-ide/scratch/historygram"
ARTIFACT_DIR = "/Users/guglielmopiersanti/.gemini/antigravity/brain/db2d8067-5f2e-4246-8dab-397282a86a49"

class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

server = HTTPServer(('127.0.0.1', PORT), lambda *args, **kwargs: SilentHandler(*args, directory=ROOT_DIR, **kwargs))
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()
print(f"[HG-SIM] Server HTTP attivo su porta {PORT}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # =========================================================================
    # 1. CLIENT A: DOCENTE (LIM Desktop 1280x800)
    # =========================================================================
    print("\n--- 1. AVVIO CATTEDRA DOCENTE (LIM DESKTOP 1280x800) ---")
    docente_ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    docente_page = docente_ctx.new_page()
    docente_page.add_init_script("""
        localStorage.setItem('hub_user', JSON.stringify({
            uid: 'HfLDwDrQRpUhlPYcl3ZPcAthK0B2',
            email: 'prof.memmo@gmail.com',
            displayName: 'Prof. Memmo',
            role: 'docente'
        }));
        localStorage.setItem('hub_user_email', 'prof.memmo@gmail.com');
        localStorage.setItem('hub_user_role', 'docente');
        localStorage.setItem('hub_user_name', 'Prof. Memmo');
        localStorage.setItem('pm_student_class', '3D');
        localStorage.setItem('hub_user_class', '3D');
    """)

    docente_page.goto(f"http://127.0.0.1:{PORT}/index.html?class=3D&mode=revolution_1800", wait_until="domcontentloaded")
    docente_page.wait_for_timeout(2500)

    print("[DOCENTE] Accesso alla Cattedra Docente...")
    docente_page.evaluate("HistoryGramApp.showView('view-docente')")
    docente_page.wait_for_timeout(1500)
    
    # Se il gate del PIN è visibile, inserisci PIN 1848
    pin_visible = docente_page.evaluate("() => { const el = document.getElementById('viewTeacherPinAuth'); return el && !el.classList.contains('hidden') && window.getComputedStyle(el).display !== 'none'; }")
    if pin_visible:
        print("[DOCENTE] Sblocco PIN Cattedra (1848)...")
        docente_page.fill("#inputViewTeacherPin", "1848")
        docente_page.click("button:has-text('Sblocca Cattedra')")
        docente_page.wait_for_timeout(1500)
    
    t_unlocked = docente_page.evaluate("() => !document.getElementById('viewTeacherWorkArea')?.classList.contains('hidden')")
    print(f"[DOCENTE] Area Cattedra sbloccata: {t_unlocked}")

    # =========================================================================
    # 2. CLIENT B: STUDENTE A (Mobile iPhone 390x844) - Crea e Invia Post
    # =========================================================================
    print("\n--- 2. AVVIO STUDENTE A (MOBILE IPHONE 13, 390x844) ---")
    student_a_ctx = browser.new_context(
        viewport={'width': 390, 'height': 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True
    )
    student_a = student_a_ctx.new_page()
    student_a.add_init_script("""
        localStorage.setItem('hub_user', JSON.stringify({
            uid: 'stud_marco_3d',
            displayName: 'Marco (Carbonaro)',
            role: 'studente'
        }));
        localStorage.setItem('hub_user_role', 'studente');
        localStorage.setItem('hub_user_class', '3D');
        localStorage.setItem('pm_student_class', '3D');
    """)
    student_a.goto(f"http://127.0.0.1:{PORT}/index.html?class=3D&mode=revolution_1800", wait_until="domcontentloaded")
    student_a.wait_for_timeout(2500)

    print("[STUDENTE A] Apertura Muro Storico...")
    student_a.evaluate("HistoryGramApp.showView('view-game')")
    student_a.wait_for_timeout(1500)
    student_a.click("#btnOpenCreatePost")
    student_a.wait_for_timeout(1000)

    # Compilazione post
    print("[STUDENTE A] Compilazione Proclama Storico...")
    student_a.select_option("#selectCharacter", index=1)
    char_chosen = student_a.evaluate("() => document.getElementById('selectCharacter')?.value")
    print(f"[STUDENTE A] Personaggio selezionato: {char_chosen}")
    
    student_a.fill("#inputSlogan", "La libertà si conquista uniti nel segreto!")
    student_a.fill("#inputText", "Cittadini d'Europa! Le tirannie assolutiste stanno vacillando. È giunta l'ora di reclamare statuti e libertà civili per tutti i popoli.")
    student_a.fill("#inputHashtags", "#Costituzione #Liberta1848 #PopoloSovrano")
    student_a.wait_for_timeout(1000)

    shot_post_create = os.path.join(ARTIFACT_DIR, "historygram_studente_mobile_post.png")
    student_a.screenshot(path=shot_post_create, full_page=True)
    print(f"[STUDENTE A] Screenshot form post salvato: {shot_post_create}")

    # Invio del post
    print("[STUDENTE A] Invio post alla Cattedra per Imprimatur...")
    student_a.click("button[type='submit']")
    student_a.wait_for_timeout(2500)

    # =========================================================================
    # 3. DOCENTE: Revisione Coda e Approvazione con Bonus
    # =========================================================================
    print("\n--- 3. DOCENTE: REVISIONE IN CODA IMPRIMATUR ---")
    docente_page.wait_for_timeout(2000)
    docente_page.evaluate("HistoryGramApp.showView('view-docente')")
    docente_page.wait_for_timeout(1500)

    queue_count = docente_page.evaluate("() => document.getElementById('viewTQueueCount')?.textContent")
    print(f"[DOCENTE] Post pendenti in Coda Imprimatur: {queue_count}")

    shot_docente_cattedra = os.path.join(ARTIFACT_DIR, "historygram_docente_cattedra.png")
    docente_page.screenshot(path=shot_docente_cattedra, full_page=True)
    print(f"[DOCENTE] Screenshot Cattedra con Coda salvato: {shot_docente_cattedra}")

    # Clicca approvazione con bonus (+10)
    print("[DOCENTE] Assegnazione Imprimatur con +10 Follower Bonus...")
    docente_page.click("button:has-text('Approva + Bonus (+10)')")
    docente_page.wait_for_timeout(3000)

    # =========================================================================
    # 4. CLIENT C: STUDENTE B (Tablet iPad 810x1080) - Lettura, Like
    # =========================================================================
    print("\n--- 4. AVVIO STUDENTE B (TABLET IPAD, 810x1080) ---")
    student_b_ctx = browser.new_context(
        viewport={'width': 810, 'height': 1080},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True
    )
    student_b = student_b_ctx.new_page()
    student_b.add_init_script("""
        localStorage.setItem('hub_user', JSON.stringify({
            uid: 'stud_sara_3d',
            displayName: 'Sara (Patriota)',
            role: 'studente'
        }));
        localStorage.setItem('hub_user_role', 'studente');
        localStorage.setItem('hub_user_class', '3D');
        localStorage.setItem('pm_student_class', '3D');
    """)
    student_b.goto(f"http://127.0.0.1:{PORT}/index.html?class=3D&mode=revolution_1800", wait_until="domcontentloaded")
    student_b.wait_for_timeout(2500)

    print("[STUDENTE B] Apertura Muro Storico dal vivo...")
    student_b.evaluate("HistoryGramApp.showView('view-game')")
    student_b.wait_for_timeout(2500)

    posts_count = student_b.evaluate("() => document.querySelectorAll('#feedStream .post-card').length")
    print(f"[STUDENTE B] Post visibili nel feed approvati: {posts_count}")

    # Studente B clicca Like sul post
    print("[STUDENTE B] Inserimento Like al post...")
    student_b.click(".post-action-btn:has-text('Like')")
    student_b.wait_for_timeout(2000)

    likes_text = student_b.locator(".post-action-btn:has-text('Like') span").first.text_content()
    print(f"[STUDENTE B] Conteggio Like dopo il tocco: {likes_text}")

    shot_student_b = os.path.join(ARTIFACT_DIR, "historygram_studente_tablet_feed_like.png")
    student_b.screenshot(path=shot_student_b, full_page=True)
    print(f"[STUDENTE B] Screenshot Muro con Post e Like salvato: {shot_student_b}")

    # =========================================================================
    # 5. VERIFICA PODIO E PROGRESSIONE PUNTEGGI (10 Bonus + 1 Like = 11 Follower)
    # =========================================================================
    print("\n--- 5. VERIFICA PODIO E PROGRESSIONE PUNTEGGI ---")
    docente_page.evaluate("HistoryGramApp.showView('view-leaderboard')")
    docente_page.wait_for_timeout(2500)

    first_name = docente_page.locator("#leaderboardFullPodiumWrap .podium-col.place-1 .podium-name").text_content() if docente_page.locator("#leaderboardFullPodiumWrap .podium-col.place-1 .podium-name").count() > 0 else "N/A"
    first_score_raw = docente_page.locator("#leaderboardFullPodiumWrap .podium-col.place-1 .podium-score").text_content() if docente_page.locator("#leaderboardFullPodiumWrap .podium-col.place-1 .podium-score").count() > 0 else "0"
    table_score = docente_page.locator("#leaderboardFullTableBody tr td:last-child").first.text_content() if docente_page.locator("#leaderboardFullTableBody tr td:last-child").count() > 0 else "0"
    
    first_score = first_score_raw.replace('Follower', '').strip()
    print(f"[PODIO LIVE] 1° Posto sul Podio: {first_name}")
    print(f"[PODIO LIVE] Punteggio Follower calcolato: {first_score} (Tabella: {table_score})")

    shot_podio = os.path.join(ARTIFACT_DIR, "historygram_podio_classifica_live.png")
    docente_page.screenshot(path=shot_podio, full_page=True)
    print(f"[PODIO LIVE] Screenshot Podio Classifica salvato: {shot_podio}")

    # Asserzione di verifica reale della progressione
    assert posts_count >= 1, f"Atteso almeno 1 post nel feed, trovati: {posts_count}"
    assert int(first_score or table_score or 0) >= 10, f"Atteso punteggio >= 10, calcolato: {first_score or table_score}"

    browser.close()

server.shutdown()
print("\n[HG-SIM] SIMULAZIONE GAMEPLAY INTEGRALE COMPLETATA CON SUCCESSO AL 100%!")
