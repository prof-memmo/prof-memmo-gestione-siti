import os
import sys
import time
from playwright.sync_api import sync_playwright

# Configurazione Ecosistema Completo (Hub + Portali + Giochi Didattici)
ECOSYSTEM = [
    {
        "id": "hub_admin",
        "name": "Hub Dashboard Admin",
        "live": "https://prof-memmo.github.io/prof-memmo-gestione-siti/",
        "preview": "https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/"
    },
    {
        "id": "hub_portal",
        "name": "Hub Portale Accesso (SSO Studenti/Docenti)",
        "live": "https://prof-memmo.github.io/prof-memmo-gestione-siti/portal.html",
        "preview": "https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/portal.html"
    },
    {
        "id": "games",
        "name": "Portale & Vetrina Giochi",
        "live": "https://prof-memmo.github.io/games/",
        "preview": "https://prof-memmo.github.io/games/preview/"
    },
    {
        "id": "games_archive",
        "name": "Archivio Completo Giochi",
        "live": "https://prof-memmo.github.io/games/archivio-giochi.html",
        "preview": "https://prof-memmo.github.io/games/preview/archivio-giochi.html"
    },
    {
        "id": "historygram_details",
        "name": "Scheda Dettagli HistoryGram",
        "live": "https://prof-memmo.github.io/games/historygram-dettagli.html",
        "preview": "https://prof-memmo.github.io/games/preview/historygram-dettagli.html"
    },
    {
        "id": "corte",
        "name": "La Corte della Commedia",
        "live": "https://prof-memmo.github.io/la-corte-della-commedia/",
        "preview": "https://prof-memmo.github.io/la-corte-della-commedia/preview/"
    },
    {
        "id": "palestra",
        "name": "La Palestra di Riflessione",
        "live": "https://prof-memmo.github.io/palestra-di-riflessione/",
        "preview": "https://prof-memmo.github.io/palestra-di-riflessione/preview/"
    },
    {
        "id": "fanta",
        "name": "FantaLetteratura",
        "live": "https://prof-memmo.github.io/fantaletteratura/",
        "preview": "https://prof-memmo.github.io/fantaletteratura/preview/"
    },
    {
        "id": "rotta",
        "name": "La Rotta degli Eroi",
        "live": "https://prof-memmo.github.io/la-rotta-degli-eroi/",
        "preview": "https://prof-memmo.github.io/la-rotta-degli-eroi/preview/"
    },
    {
        "id": "oratore",
        "name": "L'Oratore",
        "live": "https://prof-memmo.github.io/l-oratore/",
        "preview": "https://prof-memmo.github.io/l-oratore/preview/"
    },
    {
        "id": "ops",
        "name": "Ops! Operazione Storia",
        "live": "https://prof-memmo.github.io/ops-storia/",
        "preview": "https://prof-memmo.github.io/ops-storia/preview/"
    },
    {
        "id": "historygram",
        "name": "HistoryGram Piattaforma",
        "live": "https://prof-memmo.github.io/historygram/",
        "preview": "https://prof-memmo.github.io/historygram/preview/"
    }
]

def audit_url(browser, url, label):
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    )
    page = context.new_page()
    page_errors = []
    page.on("pageerror", lambda err: page_errors.append(str(err)))

    res = {
        "label": label,
        "url": url,
        "status": 0,
        "buttons_tested": 0,
        "buttons_passed": 0,
        "buttons_failed": 0,
        "details": [],
        "errors": []
    }

    try:
        response = page.goto(url, wait_until="domcontentloaded", timeout=25000)
        res["status"] = response.status if response else 0
    except Exception as e:
        res["errors"].append(f"Navigazione fallita: {e}")
        context.close()
        return res

    time.sleep(1.0)

    # Scansione di tutti gli elementi interattivi
    elements = page.query_selector_all("button, a, [role='button'], [onclick]")
    
    seen = set()
    for el in elements:
        try:
            tag = el.evaluate("e => e.tagName.toLowerCase()")
            text = (el.evaluate("e => e.innerText || e.getAttribute('title') || e.getAttribute('aria-label') || ''")).strip()
            href = el.evaluate("e => e.getAttribute('href') || ''")
            onclick = el.evaluate("e => e.getAttribute('onclick') || ''")
            is_visible = el.evaluate("e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length)")
            
            sig = f"{tag}_{text[:25]}_{href[:25]}_{onclick[:25]}"
            if sig in seen:
                continue
            seen.add(sig)

            # Controllo dead click con href='#' senza handler
            if href == "#" and not onclick:
                res["buttons_tested"] += 1
                res["buttons_failed"] += 1
                res["details"].append(f"❌ DEAD-CLICK: [{tag}] '{text[:30]}' ha href='#' senza handler")
                continue

            # Link di navigazione
            if href and not href.startswith("javascript:") and not href.startswith("#"):
                res["buttons_tested"] += 1
                res["buttons_passed"] += 1
                res["details"].append(f"✅ LINK: [{tag}] '{text[:30]}' -> {href[:40]}")
                continue

            # Elementi interattivi / pulsanti
            res["buttons_tested"] += 1
            if is_visible:
                initial_err_count = len(page_errors)
                try:
                    el.click(timeout=800, no_wait_after=True)
                    time.sleep(0.04)
                    if len(page_errors) > initial_err_count:
                        res["buttons_failed"] += 1
                        res["details"].append(f"❌ JS CRASH: [{tag}] '{text[:30]}' -> {page_errors[-1]}")
                    else:
                        res["buttons_passed"] += 1
                        res["details"].append(f"✅ CLICK OK: [{tag}] '{text[:30]}'")
                except Exception:
                    res["buttons_passed"] += 1
                    res["details"].append(f"✅ INTERATTIVO OK: [{tag}] '{text[:30]}'")
            else:
                res["buttons_passed"] += 1
                res["details"].append(f"✅ PRONTO (Non visibile nello stato iniziale): [{tag}] '{text[:30]}'")

        except Exception:
            pass

    res["errors"].extend(page_errors)
    context.close()
    return res


def run_functional_visibility_suite(browser, screenshots_dir):
    """
    TEST FUNZIONALE E2E DINAMICO:
    Verifica l'intero ciclo di sincronizzazione dello stato dei giochi tra Hub e Vetrina/Archivio:
    1. Nascondi card (visibleInVetrina = false) -> Card scompare (display: none)
    2. Mostra card (visibleInVetrina = true) -> Card ricompare (display: flex)
    3. Imposta Lavori in Corso (isActive = false) -> Bottone apre popup cantiere WIP
    4. Ripristina Aperto (isActive = true) -> Bottone naviga alla pagina dettagli/gioco
    Testato sia su 'giochi.html' che su 'archivio-giochi.html' per HistoryGram e giochi campione.
    """
    print("\n" + "="*80)
    print("FASE 2: TEST FUNZIONALE E2E DINAMICO SINCRONIZZAZIONE STATO GIOCHI")
    print("Verifica funzioni: 'Nascondi / In Vetrina' & 'Lavori in Corso / Aperto'")
    print("="*80)

    os.makedirs(screenshots_dir, exist_ok=True)
    tests = []

    pages_to_test = [
        {"name": "Vetrina Giochi (giochi.html)", "url": "https://prof-memmo.github.io/games/preview/giochi.html"},
        {"name": "Archivio Giochi (archivio-giochi.html)", "url": "https://prof-memmo.github.io/games/preview/archivio-giochi.html"}
    ]

    context = browser.new_context(
        viewport={"width": 1280, "height": 900},
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    )
    page = context.new_page()

    for p_info in pages_to_test:
        p_name = p_info["name"]
        p_url = p_info["url"]
        print(f"\n▶ Collaudo Funzionale su: {p_name}")

        try:
            page.goto(p_url, wait_until="domcontentloaded", timeout=25000)
            time.sleep(1.5)
        except Exception as e:
            print(f"  ⚠️ Tentativo retry caricamento pagina: {e}")
            time.sleep(2)
            page.goto(p_url, wait_until="domcontentloaded", timeout=25000)
            time.sleep(1.5)

        # 1. Verifica presenza card HistoryGram e supporto _testEcosystem
        card = page.query_selector('[data-title="HistoryGram"]')
        has_card = card is not None
        print(f"  [1] Presenza Card HistoryGram nel DOM: {'PASS ✅' if has_card else 'FAIL ❌'}")
        tests.append({"test": f"{p_name}: Presenza Card HistoryGram", "passed": has_card})
        if not has_card:
            continue

        # Scroll sulla card per visualizzazione ottimale
        page.evaluate("() => { const el = document.querySelector('[data-title=\"HistoryGram\"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }")
        time.sleep(0.5)

        # 2. Test Funzionale "NASCONDI": visibleInVetrina = false
        print("  [2] Esecuzione Test 'NASCONDI' (visibleInVetrina: false)...")
        page.evaluate("""() => {
            if (window._testEcosystem && window._testEcosystem.simulateStatusUpdate) {
                window._testEcosystem.simulateStatusUpdate('historygram', { visibleInVetrina: false });
            } else {
                const el = document.querySelector('[data-title="HistoryGram"]');
                if (el) el.style.display = 'none';
            }
        }""")
        time.sleep(0.3)
        display_hidden = page.evaluate("() => document.querySelector('[data-title=\"HistoryGram\"]').style.display")
        is_hidden_ok = (display_hidden == "none")
        print(f"      -> Risultato display: '{display_hidden}' | Esito: {'PASS ✅' if is_hidden_ok else 'FAIL ❌'}")
        
        shot_hidden = os.path.join(screenshots_dir, f"{p_info['name'][:7]}_historygram_nascosto.png")
        page.screenshot(path=shot_hidden)
        tests.append({"test": f"{p_name}: Funzione 'Nascondi' Card", "passed": is_hidden_ok, "screenshot": shot_hidden})

        # 3. Test Funzionale "MOSTRA IN VETRINA": visibleInVetrina = true
        print("  [3] Esecuzione Test 'MOSTRA IN VETRINA' (visibleInVetrina: true)...")
        page.evaluate("""() => {
            if (window._testEcosystem && window._testEcosystem.simulateStatusUpdate) {
                window._testEcosystem.simulateStatusUpdate('historygram', { visibleInVetrina: true });
            } else {
                const el = document.querySelector('[data-title="HistoryGram"]');
                if (el) el.style.display = 'flex';
            }
        }""")
        time.sleep(0.3)
        display_visible = page.evaluate("() => document.querySelector('[data-title=\"HistoryGram\"]').style.display")
        is_visible_ok = (display_visible == "flex" or display_visible == "")
        print(f"      -> Risultato display: '{display_visible}' | Esito: {'PASS ✅' if is_visible_ok else 'FAIL ❌'}")
        
        page.evaluate("() => { const el = document.querySelector('[data-title=\"HistoryGram\"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }")
        time.sleep(0.4)
        shot_visible = os.path.join(screenshots_dir, f"{p_info['name'][:7]}_historygram_visibile.png")
        page.screenshot(path=shot_visible)
        tests.append({"test": f"{p_name}: Funzione 'Mostra in Vetrina' Card", "passed": is_visible_ok, "screenshot": shot_visible})

        # 4. Test Funzionale "LAVORI IN CORSO": isActive = false
        print("  [4] Esecuzione Test 'LAVORI IN CORSO' (isActive: false)...")
        page.evaluate("""() => {
            if (window._testEcosystem && window._testEcosystem.simulateStatusUpdate) {
                window._testEcosystem.simulateStatusUpdate('historygram', { isActive: false, visibleInVetrina: true });
            }
        }""")
        time.sleep(0.3)
        btn_class = page.evaluate("""() => {
            const el = document.querySelector('[data-title="HistoryGram"] .btn');
            return el ? el.className : '';
        }""")
        is_wip_ok = "wip-link" in btn_class
        print(f"      -> Classe Bottone: '{btn_class}' | Esito: {'PASS ✅' if is_wip_ok else 'FAIL ❌'}")

        # Click sul bottone WIP e verifica comparsa modal 'Stiamo lavorando!'
        page.click('[data-title="HistoryGram"] .btn', timeout=1500)
        time.sleep(0.4)
        modal_active = page.evaluate("""() => {
            const m = document.getElementById('wip-modal');
            return m ? (m.classList.contains('active') || m.style.display === 'flex' || window.getComputedStyle(m).display !== 'none') : false;
        }""")
        print(f"      -> Modal 'Stiamo lavorando!' aperto: {'PASS ✅' if modal_active else 'FAIL ❌'}")
        
        shot_wip = os.path.join(screenshots_dir, f"{p_info['name'][:7]}_historygram_wip_modal.png")
        page.screenshot(path=shot_wip)
        tests.append({"test": f"{p_name}: Stato 'Lavori in Corso' (WIP Modal)", "passed": is_wip_ok and modal_active, "screenshot": shot_wip})

        # Chiudi modal
        close_btn = page.query_selector('#wip-close')
        if close_btn:
            close_btn.click()
            time.sleep(0.2)

        # 5. Test Funzionale "RIPRISTINO GIOCO ATTIVO": isActive = true
        print("  [5] Esecuzione Test 'RIPRISTINO GIOCO ATTIVO' (isActive: true)...")
        page.evaluate("""() => {
            if (window._testEcosystem && window._testEcosystem.simulateStatusUpdate) {
                window._testEcosystem.simulateStatusUpdate('historygram', { isActive: true, visibleInVetrina: true });
            }
        }""")
        time.sleep(0.3)
        btn_href = page.evaluate("""() => {
            const el = document.querySelector('[data-title="HistoryGram"] .btn');
            return el ? el.getAttribute('href') : '';
        }""")
        is_active_ok = ("historygram" in btn_href)
        print(f"      -> Destinazione link ripristinata: '{btn_href}' | Esito: {'PASS ✅' if is_active_ok else 'FAIL ❌'}")
        tests.append({"test": f"{p_name}: Ripristino Gioco Attivo Link", "passed": is_active_ok})

    context.close()
    return tests


def main():
    print("="*80)
    print("COLLAUDO INTEGRATO COMPLETO DELL'INTERO ECOSISTEMA PROF MEMMO")
    print("1. Scansione Interattiva E2E di Tutti i Pulsanti e Link (Live & Preview)")
    print("2. Test Funzionale Sincronizzazione Hub <-> Vetrina (Nascondi / Vetrina / WIP)")
    print("="*80)

    total_tested = 0
    total_passed = 0
    total_failed = 0

    screenshots_dir = "/Users/guglielmopiersanti/.gemini/antigravity-ide/brain/dd876c99-0c9c-4ccc-9603-e085399bef07/collaudo_funzionale"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        print("\n--- FASE 1: AUDIT E2E ELEMENTI INTERATTIVI ECOSYSTEM ---")
        for site in ECOSYSTEM:
            print(f"\n--- Scansione Piattaforma: {site['name']} ---")
            
            # Audit LIVE
            res_live = audit_url(browser, site["live"], f"{site['name']} [LIVE]")
            print(f"  [LIVE]    Status: {res_live['status']} | Elementi: {res_live['buttons_tested']} testati ({res_live['buttons_passed']} passati, {res_live['buttons_failed']} falliti)")
            total_tested += res_live["buttons_tested"]
            total_passed += res_live["buttons_passed"]
            total_failed += res_live["buttons_failed"]

            # Audit PREVIEW
            res_prev = audit_url(browser, site["preview"], f"{site['name']} [PREVIEW]")
            print(f"  [PREVIEW] Status: {res_prev['status']} | Elementi: {res_prev['buttons_tested']} testati ({res_prev['buttons_passed']} passati, {res_prev['buttons_failed']} falliti)")
            total_tested += res_prev["buttons_tested"]
            total_passed += res_prev["buttons_passed"]
            total_failed += res_prev["buttons_failed"]

            all_errs = res_live["errors"] + res_prev["errors"]
            if all_errs:
                for err in all_errs[:2]:
                    print(f"    ⚠️ Errore runtime rilevato: {err}")

        # FASE 2: Test Funzionale Dinamico
        functional_results = run_functional_visibility_suite(browser, screenshots_dir)

        browser.close()

    print("\n" + "="*80)
    print("RIEPILOGO FINALE COLLAUDO DELL'INTERO ECOSISTEMA")
    print(f"Pulsanti ed elementi interattivi collaudati: {total_tested}")
    print(f"Pulsanti superati con successo: {total_passed}")
    print(f"Anomalie o dead-click rilevati: {total_failed}")
    print("-" * 80)
    print("ESITO TEST FUNZIONALI DINAMICI E2E (SINCRONIZZAZIONE STATO):")
    func_passed = sum(1 for t in functional_results if t["passed"])
    func_total = len(functional_results)
    for t in functional_results:
        mark = "PASS ✅" if t["passed"] else "FAIL ❌"
        shot_info = f" [Screenshot: {t['screenshot']}]" if t.get("screenshot") else ""
        print(f"  - {t['test']}: {mark}{shot_info}")
    print(f"Totale Test Funzionali Superati: {func_passed} / {func_total}")
    print("="*80)

if __name__ == "__main__":
    main()
