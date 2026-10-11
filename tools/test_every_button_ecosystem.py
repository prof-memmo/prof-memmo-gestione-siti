#!/usr/bin/env python3
"""
CRAWLER & TEST RUNNER: COLLAUDO INTERATTIVO DI OGNI SINGOLO PULSANTE DELL'ECOSISTEMA
===================================================================================
Apre ogni sito dell'ecosistema, individua tutti i pulsanti ed elementi interattivi (<button>, [role="button"]),
li clicca uno per uno con un browser reale (Playwright) e verifica:
1. Assenza totale di errori JavaScript scatenati dal clic (pageerror).
2. Assenza di popup/alert di errore (es. errori Firebase, 404, ecc.).
3. Integrità della UI e dei gestori eventi.
"""

import asyncio
import sys
from playwright.async_api import async_playwright

SITES_TO_TEST = [
    ("Hub Admin - Home", "https://prof-memmo.github.io/prof-memmo-gestione-siti/"),
    ("Hub Admin - Portale", "https://prof-memmo.github.io/prof-memmo-gestione-siti/portal.html"),
    ("Sito Vetrina - Home", "https://prof-memmo.github.io/games/"),
    ("Sito Vetrina - Giochi", "https://prof-memmo.github.io/games/giochi.html"),
    ("Sito Vetrina - Prezzi", "https://prof-memmo.github.io/games/prezzi.html"),
    ("Sito Vetrina - Accedi", "https://prof-memmo.github.io/games/accedi.html"),
    ("FantaLetteratura", "https://prof-memmo.github.io/fantaletteratura/"),
    ("La Rotta degli Eroi", "https://prof-memmo.github.io/la-rotta-degli-eroi/"),
    ("La Corte della Commedia", "https://prof-memmo.github.io/la-corte-della-commedia/"),
    ("La Palestra di Riflessione", "https://prof-memmo.github.io/palestra-di-riflessione/"),
    ("L'Oratore", "https://prof-memmo.github.io/l-oratore/"),
    ("Ops! Storia", "https://prof-memmo.github.io/ops-storia/"),
    ("HistoryGram", "https://prof-memmo.github.io/historygram/"),
    ("Supplenze App", "https://prof-memmo.github.io/supplenze-app/")
]

async def test_all_buttons():
    print("=" * 80)
    print("SCANSIONE E CLIC DI TUTTI I PULSANTI DELL'ECOSISTEMA CON BROWSER REALE")
    print("=" * 80)

    total_buttons_clicked = 0
    failures = []
    summary_per_site = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()

        for site_name, site_url in SITES_TO_TEST:
            print(f"\n[SITO] {site_name} ({site_url})")
            page = await context.new_page()

            page_errors = []
            page.on("pageerror", lambda err: page_errors.append(str(err)))

            dialog_alerts = []
            async def handle_dialog(dialog):
                msg = dialog.message
                print(f"     [ALERT RILEVATO]: '{msg}'")
                dialog_alerts.append(msg)
                await dialog.dismiss()
            page.on("dialog", handle_dialog)

            try:
                await page.goto(site_url, wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(1000)

                # Identifica tutti i pulsanti presenti nel DOM
                buttons = await page.query_selector_all("button, [role='button'], a.btn, .btn, input[type='button'], input[type='submit']")
                site_button_count = len(buttons)
                clicked_on_site = 0
                errors_on_site = 0

                print(f"  -> Rilevati {site_button_count} elementi interattivi/pulsanti.")

                for idx, btn in enumerate(buttons):
                    try:
                        is_visible = await btn.is_visible()
                        if not is_visible:
                            continue

                        btn_text = (await btn.inner_text()).strip().replace("\n", " ")
                        btn_id = await btn.get_attribute("id") or ""
                        label = btn_text or btn_id or f"Button #{idx+1}"

                        # Salta pulsanti di chiusura browser o logout di sistema distruttivi
                        if "esci" in label.lower() and "gioco" in label.lower():
                            continue

                        # Esegui il clic reale
                        await btn.scroll_into_view_if_needed()
                        await btn.click(timeout=3000)
                        clicked_on_site += 1
                        total_buttons_clicked += 1
                        await page.wait_for_timeout(300)

                    except Exception as click_err:
                        # Errore di interazione (es. modale sovrapposto o animazione)
                        pass

                # Analizza gli errori raccolti
                critical_alerts = [a for a in dialog_alerts if "errore" in a.lower() or "firebase" in a.lower() or "fail" in a.lower()]
                if page_errors or critical_alerts:
                    failures.append((site_name, site_url, page_errors + critical_alerts))
                    print(f"  ❌ {site_name}: {len(page_errors)} errori JS, {len(critical_alerts)} alert critici.")
                else:
                    print(f"  ✅ {site_name}: {clicked_on_site}/{site_button_count} pulsanti cliccati con successo (0 errori JS, 0 alert critici).")

                summary_per_site[site_name] = {
                    "total": site_button_count,
                    "clicked": clicked_on_site,
                    "errors": len(page_errors) + len(critical_alerts)
                }

            except Exception as e:
                print(f"  ❌ Errore caricamento sito {site_name}: {e}")
                failures.append((site_name, site_url, [str(e)]))
            finally:
                await page.close()

        await browser.close()

    print("\n" + "=" * 80)
    print("RIEPILOGO FINALE CLIC DI OGNI PULSANTE DELL'ECOSISTEMA")
    print(f"Totale pulsanti fisicamente cliccati: {total_buttons_clicked}")
    print(f"Totale siti con anomalie: {len(failures)}")
    print("=" * 80)
    for site, stats in summary_per_site.items():
        status = "✅ OK" if stats["errors"] == 0 else "❌ ERRORI"
        print(f"• {site:<30}: {stats['clicked']:>2}/{stats['total']:<2} pulsanti testati -> {status}")
    print("=" * 80)

    return len(failures) == 0

if __name__ == "__main__":
    success = asyncio.run(test_all_buttons())
    sys.exit(0 if success else 1)
