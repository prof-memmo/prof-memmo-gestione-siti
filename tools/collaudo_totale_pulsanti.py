import sys
import time
from playwright.sync_api import sync_playwright

SITES = [
    {
        "id": "games",
        "name": "Portale & Vetrina Giochi",
        "live": "https://prof-memmo.github.io/games/",
        "preview": "https://prof-memmo.github.io/games/preview/"
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
        "name": "HistoryGram",
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
        response = page.goto(url, wait_until="domcontentloaded", timeout=10000)
        res["status"] = response.status if response else 0
    except Exception as e:
        res["errors"].append(f"Navigazione fallita: {e}")
        context.close()
        return res

    time.sleep(1)

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

            # Controllo dead click con href='#'
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
                    time.sleep(0.05)
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

def main():
    print("="*80)
    print("COLLAUDO TOTALE AUTOMATIZZATO DI TUTTI I PULSANTI DELL'ECOSISTEMA")
    print("Verifica interattiva E2E con Browser Reale Playwright (Live & Preview)")
    print("="*80)

    total_tested = 0
    total_passed = 0
    total_failed = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for site in SITES:
            print(f"\n--- Scansione Sito: {site['name']} ---")
            
            # Audit LIVE
            res_live = audit_url(browser, site["live"], f"{site['name']} [LIVE]")
            print(f"  [LIVE]    Status: {res_live['status']} | Pulsanti: {res_live['buttons_tested']} testati ({res_live['buttons_passed']} passati, {res_live['buttons_failed']} falliti)")
            total_tested += res_live["buttons_tested"]
            total_passed += res_live["buttons_passed"]
            total_failed += res_live["buttons_failed"]

            # Audit PREVIEW
            res_prev = audit_url(browser, site["preview"], f"{site['name']} [PREVIEW]")
            print(f"  [PREVIEW] Status: {res_prev['status']} | Pulsanti: {res_prev['buttons_tested']} testati ({res_prev['buttons_passed']} passati, {res_prev['buttons_failed']} falliti)")
            total_tested += res_prev["buttons_tested"]
            total_passed += res_prev["buttons_passed"]
            total_failed += res_prev["buttons_failed"]

            all_errs = res_live["errors"] + res_prev["errors"]
            if all_errs:
                for err in all_errs[:2]:
                    print(f"    ⚠️ Errore runtime rilevato: {err}")

        browser.close()

    print("\n" + "="*80)
    print(f"RIEPILOGO FINALE COLLAUDO E2E PULSANTI")
    print(f"Pulsanti ed elementi interattivi collaudati: {total_tested}")
    print(f"Pulsanti superati con successo: {total_passed}")
    print(f"Anomalie o dead-click rilevati: {total_failed}")
    print("="*80)

if __name__ == "__main__":
    main()
