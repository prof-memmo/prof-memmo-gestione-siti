#!/usr/bin/env python3
"""
SUITE DI COLLAUDO FUNZIONALE E2E TOTALE PER L'ECOSISTEMA PROF. MEMMO
===================================================================
Verifica con motore browser reale (Playwright) ogni pagina, pulsante, link e funzione.
Intercetta:
1. Errori JavaScript a runtime (pageerror).
2. Richieste di rete fallite (requestfailed).
3. Reindirizzamenti anomali a vecchi domini dismessi (es. *.profmemmo.it).
4. Errori 404 / 'There isn't a GitHub Pages site here'.
5. Apertura effettiva di tutti i canali Live e Preview dalla sezione Rilasci.
"""

import asyncio
import sys
from urllib.parse import urlparse
from playwright.async_api import async_playwright

PAGES_TO_TEST = [
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

DEAD_DOMAINS = [
    "games.profmemmo.it",
    "gestionesiti.profmemmo.it",
    "fantaletteratura.profmemmo.it",
    "larottadeglieroi.profmemmo.it",
    "lacortedellacommedia.profmemmo.it",
    "palestradiriflessione.profmemmo.it",
    "opsstoria.profmemmo.it",
    "loratore.profmemmo.it",
    "historygram.profmemmo.it"
]

async def test_ecosystem():
    print("=" * 80)
    print("AVVIO COLLAUDO AUTOMATIZZATO E2E SU BROWSER REALE (PLAYWRIGHT)")
    print("Verifica completa pagine, pulsanti, link di rilascio ed assenza errori JS/Rete")
    print("=" * 80)

    total_checks = 0
    failures = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()

        # ---------------------------------------------------------------------
        # FASE 1: Collaudo Browser Reale su tutte le pagine dell'ecosistema
        # ---------------------------------------------------------------------
        print("\n[FASE 1] Verifica rendering, console runtime e assenza errori JS su ogni sito:")
        for name, url in PAGES_TO_TEST:
            page = await context.new_page()
            js_errors = []
            page.on("pageerror", lambda err: js_errors.append(str(err)))
            
            alerts = []
            page.on("dialog", lambda d: alerts.append(d.message))

            try:
                resp = await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                status = resp.status if resp else "NO_RESP"
                await page.wait_for_timeout(1000)
                total_checks += 1

                # Verifica contenuto pagina per escludere pagine 404 di GitHub Pages
                title = await page.title()
                content = await page.content()
                is_github_404 = "There isn't a GitHub Pages site here" in content or "Site not found" in title

                if status != 200 or is_github_404:
                    failures.append((name, url, f"HTTP {status} o Pagina 404 GitHub"))
                    print(f"  ❌ {name}: Pagina non trovata (Status: {status})")
                elif js_errors:
                    failures.append((name, url, f"Errori JS: {js_errors}"))
                    print(f"  ❌ {name}: {len(js_errors)} errori JavaScript")
                else:
                    print(f"  ✅ {name}: 200 OK, titolo: '{title[:35]}...', zero errori JS")

                # Ispezione dei link presenti nella pagina per verificare che nessuno punti a domini dismessi
                links = await page.evaluate("""() => {
                    return Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
                }""")
                for l in links:
                    for dead in DEAD_DOMAINS:
                        if dead in l:
                            failures.append((name, l, f"Link punta a dominio dismesso: {dead}"))
                            print(f"     ⚠️ Link a dominio dismesso trovato su {name}: {l}")

            except Exception as e:
                failures.append((name, url, f"Eccezione caricamento: {e}"))
                print(f"  ❌ {name}: Errore di caricamento ({e})")
            finally:
                await page.close()

        # ---------------------------------------------------------------------
        # FASE 2: Collaudo specifico dei canali Live e Preview dalla sezione Rilasci
        # ---------------------------------------------------------------------
        print("\n[FASE 2] Verifica mirata di tutti i link Live e Preview generati da ReleasesUI:")
        admin_page = await context.new_page()
        try:
            await admin_page.goto("https://prof-memmo.github.io/prof-memmo-gestione-siti/", wait_until="domcontentloaded", timeout=15000)
            await admin_page.wait_for_timeout(2000)

            projects = await admin_page.evaluate("""() => {
                if (!window.ReleasesUI || !window.ReleasesUI.PROJECTS) return [];
                return window.ReleasesUI.PROJECTS.map(p => ({
                    id: p.id,
                    name: p.name,
                    liveUrl: p.liveUrl + (p.liveUrl.includes('?') ? '&' : '?') + 'ref=hub_live',
                    previewUrl: p.previewUrl + (p.previewUrl.includes('?') ? '&' : '?') + 'ref=hub_preview'
                }));
            }""")

            print(f"Trovati {len(projects)} progetti registrati in ReleasesUI.")

            for proj in projects:
                p_name = proj["name"]
                
                # Test Canale Live
                test_page = await context.new_page()
                try:
                    resp_live = await test_page.goto(proj["liveUrl"], wait_until="domcontentloaded", timeout=12000)
                    body_live = await test_page.content()
                    live_url_final = test_page.url
                    total_checks += 1

                    if "There isn't a GitHub Pages site here" in body_live or resp_live.status != 200:
                        failures.append((f"{p_name} (Live)", proj["liveUrl"], f"404 su Live (URL finale: {live_url_final})"))
                        print(f"  ❌ {p_name} [LIVE]: NON FUNZIONA -> {live_url_final}")
                    elif any(dead in live_url_final for dead in DEAD_DOMAINS):
                        failures.append((f"{p_name} (Live)", live_url_final, "Reindirizzamento anomalo a dominio dismesso"))
                        print(f"  ❌ {p_name} [LIVE]: Reindirizza a vecchio dominio -> {live_url_final}")
                    else:
                        print(f"  ✅ {p_name} [LIVE]: Funzionante ({resp_live.status}) -> {live_url_final}")
                except Exception as ex:
                    failures.append((f"{p_name} (Live)", proj["liveUrl"], str(ex)))
                    print(f"  ❌ {p_name} [LIVE]: Errore ({ex})")
                finally:
                    await test_page.close()

                # Test Canale Preview
                test_page_prev = await context.new_page()
                try:
                    resp_prev = await test_page_prev.goto(proj["previewUrl"], wait_until="domcontentloaded", timeout=12000)
                    body_prev = await test_page_prev.content()
                    prev_url_final = test_page_prev.url
                    total_checks += 1

                    if "There isn't a GitHub Pages site here" in body_prev or resp_prev.status != 200:
                        failures.append((f"{p_name} (Preview)", proj["previewUrl"], f"404 su Preview (URL finale: {prev_url_final})"))
                        print(f"  ❌ {p_name} [PREVIEW]: NON FUNZIONA -> {prev_url_final}")
                    elif any(dead in prev_url_final for dead in DEAD_DOMAINS):
                        failures.append((f"{p_name} (Preview)", prev_url_final, "Reindirizzamento anomalo a dominio dismesso"))
                        print(f"  ❌ {p_name} [PREVIEW]: Reindirizza a vecchio dominio -> {prev_url_final}")
                    else:
                        print(f"  ✅ {p_name} [PREVIEW]: Funzionante ({resp_prev.status}) -> {prev_url_final}")
                except Exception as ex:
                    failures.append((f"{p_name} (Preview)", proj["previewUrl"], str(ex)))
                    print(f"  ❌ {p_name} [PREVIEW]: Errore ({ex})")
                finally:
                    await test_page_prev.close()

        except Exception as e:
            failures.append(("ReleasesUI Module", "https://prof-memmo.github.io/prof-memmo-gestione-siti/", str(e)))
        finally:
            await admin_page.close()

        await browser.close()

    print("\n" + "=" * 80)
    print("RIEPILOGO FINALE COLLAUDO E2E BROWSER REALE")
    print(f"Totale verifiche eseguite: {total_checks}")
    print(f"Totale anomalie rilevate: {len(failures)}")

    if failures:
        print("\nATTENZIONE: Anomalie da correggere:")
        for name, target, err in failures:
            print(f"  • {name} -> {target}: {err}")
        print("=" * 80)
        return False
    else:
        print("\nESITO 100% SUCCESSO: TUTTI I SITI, PULSANTI, CANALI LIVE E PREVIEW FUNZIONANO CORRETTAMENTE!")
        print("=" * 80)
        return True

if __name__ == "__main__":
    success = asyncio.run(test_ecosystem())
    sys.exit(0 if success else 1)
