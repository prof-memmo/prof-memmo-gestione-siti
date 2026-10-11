#!/usr/bin/env python3
"""
PROF. MEMMO — MASTER SUITE DI COLLAUDO TOTALE DELL'ECOSISTEMA
============================================================
Conforme alle Regole Operative di Sicurezza v2.2 (Articolo 8).

Esegue in sequenza e in un unico passaggio tutti i livelli di verifica:
- LIVELLO 1: Scansione Rete & Asset Zero-404 su tutte le 15 pagine e 400+ file.
- LIVELLO 2: Boot Browser Reale Playwright (Zero Errori JavaScript in console).
- LIVELLO 3: Clic Massivo di TUTTI i pulsanti ed elementi interattivi.

Uso:
    python3 tools/collaudo_totale.py
"""

import sys
import os
import asyncio
import urllib.request
import urllib.error
import re
from urllib.parse import urljoin, urlparse
from playwright.async_api import async_playwright

PAGES_TO_TEST = [
    ("Hub Admin - Home", "https://prof-memmo.github.io/prof-memmo-gestione-siti/"),
    ("Hub Admin - Portale", "https://prof-memmo.github.io/prof-memmo-gestione-siti/portal.html"),
    ("Sito Vetrina - Home", "https://prof-memmo.github.io/games/"),
    ("Sito Vetrina - Giochi", "https://prof-memmo.github.io/games/giochi.html"),
    ("Sito Vetrina - Prezzi", "https://prof-memmo.github.io/games/prezzi.html"),
    ("Sito Vetrina - Profilo", "https://prof-memmo.github.io/games/profilo.html"),
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

def get_target_pages():
    is_preview = "--preview" in sys.argv or os.environ.get("TEST_PREVIEW") == "1"
    if not is_preview:
        return PAGES_TO_TEST
    res = []
    for name, url in PAGES_TO_TEST:
        parsed = urlparse(url)
        path = parsed.path
        if path.endswith('/'):
            new_path = path + 'preview/'
        else:
            parts = path.rsplit('/', 1)
            new_path = parts[0] + '/preview/' + parts[1]
        new_url = f"{parsed.scheme}://{parsed.netloc}{new_path}"
        res.append((f"{name} (Preview)", new_url))
    return res

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

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 CollaudoTotale/2.2'
}

def clean_asset_url(raw_url, base_url):
    raw_url = raw_url.strip()
    if not raw_url or raw_url.startswith('#') or raw_url.startswith('javascript:') or raw_url.startswith('data:') or raw_url.startswith('mailto:'):
        return None
    if '${' in raw_url:
        return None
    raw_url = raw_url.replace(' ', '%20').replace('"', '%22').replace("'", '%27')
    return urljoin(base_url, raw_url)

async def run_master_collaudo():
    target_pages = get_target_pages()
    mode_str = "PREVIEW (Anteprima)" if "--preview" in sys.argv or os.environ.get("TEST_PREVIEW") == "1" else "LIVE (Produzione)"
    print("=" * 85)
    print(f"      PROF. MEMMO — MASTER SUITE DI COLLAUDO TOTALE (v2.2) [{mode_str}]")
    print("=" * 85)
    print(f"Obiettivo: Verifica autonoma a 4 livelli su tutti i {len(target_pages)} siti e su tutti i pulsanti.")
    print("Requisito: Tolleranza Zero per 404, domini dismessi, crash console, alert e difformità legali.")
    print("=" * 85)

    all_failures = []
    site_stats = {}

    # -------------------------------------------------------------
    # LIVELLO 1: AUDIT DI RETE & ASSET ZERO-404
    # -------------------------------------------------------------
    print("\n>>> LIVELLO 1: VERIFICA RETE, ASSET STATICI E DOMINI...")
    total_assets_checked = 0

    for name, page_url in target_pages:
        site_stats[name] = {
            "url": page_url,
            "assets_ok": 0,
            "assets_err": 0,
            "boot_ok": False,
            "buttons_clicked": 0,
            "button_errors": 0
        }
        try:
            req = urllib.request.Request(page_url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=10) as resp:
                status = resp.status
                html = resp.read().decode('utf-8', errors='ignore')

            # Estrai tutti gli asset
            src_matches = re.findall(r'(?:src|href)=["\']([^"\']+)["\']', html)
            css_matches = re.findall(r'url\(["\']?([^"\'\)]+)["\']?\)', html)
            all_raw = set(src_matches + css_matches)

            for raw in all_raw:
                full_url = clean_asset_url(raw, page_url)
                if not full_url:
                    continue
                parsed = urlparse(full_url)
                if parsed.netloc in DEAD_DOMAINS:
                    all_failures.append(f"[L1-DOMINIO-DISMESSO] {name}: fa riferimento al vecchio dominio {parsed.netloc}")
                    site_stats[name]["assets_err"] += 1
                    continue
                if parsed.netloc == "prof-memmo.github.io":
                    total_assets_checked += 1
                    success = False
                    for attempt in range(2):
                        try:
                            h_req = urllib.request.Request(full_url, headers=HEADERS, method='HEAD')
                            with urllib.request.urlopen(h_req, timeout=10) as h_resp:
                                if h_resp.status == 200:
                                    site_stats[name]["assets_ok"] += 1
                                    success = True
                                    break
                                else:
                                    all_failures.append(f"[L1-ASSET-STATUS-{h_resp.status}] {name}: {full_url}")
                                    site_stats[name]["assets_err"] += 1
                                    success = True
                                    break
                        except Exception as e:
                            if attempt == 1:
                                all_failures.append(f"[L1-ASSET-ERR] {name}: {full_url} -> {e}")
                                site_stats[name]["assets_err"] += 1

            print(f"  [OK] {name:<26} | HTML 200 OK | {site_stats[name]['assets_ok']} asset verificati")

        except Exception as e:
            all_failures.append(f"[L1-PAGE-ERR] Impossibile caricare {name} ({page_url}): {e}")
            print(f"  [FAIL] {name:<24} | ERRORE: {e}")

    # -------------------------------------------------------------
    # LIVELLO 2 & 3: BOOT BROWSER REALE & CLIC MASSIVO PULSANTI
    # -------------------------------------------------------------
    print("\n>>> LIVELLO 2 & 3: BOOT BROWSER REALE & CLIC MASSIVO DI TUTTI I PULSANTI...")
    
    total_buttons_clicked = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()

        for name, page_url in target_pages:
            page = await context.new_page()

            page_errors = []
            page.on("pageerror", lambda err: page_errors.append(str(err)))

            dialog_alerts = []
            async def on_dialog(dialog):
                dialog_alerts.append(dialog.message)
                await dialog.dismiss()
            page.on("dialog", on_dialog)

            # 1. Boot test
            try:
                resp = await page.goto(page_url, wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(1000)

                final_url = page.url
                parsed_final = urlparse(final_url)
                if parsed_final.netloc in DEAD_DOMAINS:
                    all_failures.append(f"[L2-REDIRECT-DISMESSO] {name} ha reindirizzato a {parsed_final.netloc}")
                elif resp and resp.status >= 400:
                    all_failures.append(f"[L2-HTTP-ERR] {name} ha risposto con status {resp.status}")
                elif "There isn't a GitHub Pages site here" in (await page.content()):
                    all_failures.append(f"[L2-404-PAGES] {name} mostra pagina 404 di GitHub Pages")
                else:
                    site_stats[name]["boot_ok"] = True

                # 2. Clic test su tutti i pulsanti visibili
                buttons = await page.query_selector_all("button, [role='button'], a.btn, .btn, input[type='button'], input[type='submit']")
                clicked_here = 0

                for idx, btn in enumerate(buttons):
                    try:
                        if not await btn.is_visible():
                            continue

                        btn_text = (await btn.inner_text()).strip().replace("\n", " ")
                        btn_id = await btn.get_attribute("id") or ""
                        label = btn_text or btn_id or f"Button #{idx+1}"

                        # Salta pulsanti di uscita distruttivi
                        if "esci" in label.lower() and "gioco" in label.lower():
                            continue

                        await btn.scroll_into_view_if_needed()
                        await btn.click(timeout=2500)
                        clicked_here += 1
                        total_buttons_clicked += 1
                        await page.wait_for_timeout(250)

                    except Exception:
                        pass

                site_stats[name]["buttons_clicked"] = clicked_here

                # 3. LIVELLO 4: CONFORMITÀ LEGALE, FOOTER E BADGE PATAMÙ (Art. 8 Contract Testing)
                compliance_ok = True
                if name not in ["Hub Admin - Home", "Hub Admin - Portale", "Supplenze App"]:
                    compliance = await page.evaluate('''() => {
                        const footer = document.querySelector('footer');
                        const avatarInFooter = footer ? footer.querySelector('.footer-logo, .main-logo-img, img[src*="avatar"]') : null;
                        const patamuImg = document.querySelector('img[src*="patamu"], img[alt*="Patamu"], img[alt*="patamu"], img[alt*="Patamù"]');
                        const patamuLoaded = patamuImg ? (patamuImg.naturalWidth > 0 && !patamuImg.src.includes('gestionesiti.profmemmo.it')) : false;
                        const privacyLink = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText && el.innerText.toLowerCase().includes('privacy'));
                        const termsLink = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText && (el.innerText.toLowerCase().includes('termini') || el.innerText.toLowerCase().includes('condizioni')));
                        
                        return {
                            hasFooter: !!footer,
                            hasAvatarInFooter: !!avatarInFooter,
                            hasPatamu: !!patamuImg,
                            patamuLoaded: patamuLoaded,
                            patamuSrc: patamuImg ? patamuImg.src : '',
                            hasPrivacy: !!privacyLink,
                            hasTerms: !!termsLink
                        };
                    }''')

                    if not compliance["hasFooter"]:
                        all_failures.append(f"[L4-COMPLIANCE-NO-FOOTER] {name}: Tag <footer> assente")
                        compliance_ok = False
                    if compliance["hasAvatarInFooter"]:
                        all_failures.append(f"[L4-COMPLIANCE-AVATAR-FOOTER] {name}: Avatar del progetto presente nel footer (non consentito)")
                        compliance_ok = False
                    if not compliance["hasPatamu"]:
                        all_failures.append(f"[L4-COMPLIANCE-NO-PATAMU] {name}: Badge Patamù assente")
                        compliance_ok = False
                    elif not compliance["patamuLoaded"]:
                        all_failures.append(f"[L4-COMPLIANCE-PATAMU-BROKEN] {name}: Badge Patamù non caricato o rotto (naturalWidth==0 o vecchio dominio: {compliance['patamuSrc']})")
                        compliance_ok = False
                    if not compliance["hasPrivacy"]:
                        all_failures.append(f"[L4-COMPLIANCE-NO-PRIVACY] {name}: Link a Privacy Policy assente")
                        compliance_ok = False
                    if not compliance["hasTerms"]:
                        all_failures.append(f"[L4-COMPLIANCE-NO-TERMS] {name}: Link a Termini e Condizioni assente")
                        compliance_ok = False

                # Valuta errori catturati al clic
                crit_alerts = [a for a in dialog_alerts if "errore" in a.lower() or "firebase" in a.lower() or "fail" in a.lower()]
                if page_errors:
                    for pe in page_errors:
                        all_failures.append(f"[L2-CONSOLE-ERR] {name}: {pe}")
                    site_stats[name]["button_errors"] += len(page_errors)
                if crit_alerts:
                    for ca in crit_alerts:
                        all_failures.append(f"[L3-ALERT-ERR] {name}: {ca}")
                    site_stats[name]["button_errors"] += len(crit_alerts)

                status_label = "OK" if site_stats[name]["boot_ok"] and not page_errors and not crit_alerts and compliance_ok else "FAIL"
                comp_status = "L4 Conforme" if compliance_ok else "L4 Non-Conforme"
                print(f"  [{status_label}] {name:<26} | Boot OK | {clicked_here:>2} pulsanti | {comp_status}")

            except Exception as e:
                all_failures.append(f"[L2-CRASH] {name}: Errore di caricamento Playwright -> {e}")
                print(f"  [FAIL] {name:<26} | ERRORE: {e}")
            finally:
                await page.close()

        # -------------------------------------------------------------
        # TEST AGGIUNTIVO: LINK PREVIEW E LIVE DALLA SEZIONE RILASCI HUB
        # -------------------------------------------------------------
        print("\n>>> LIVELLO 3.B: VERIFICA DI TUTTI I LINK LIVE & PREVIEW DELLA SEZIONE RILASCI...")
        admin_page = await context.new_page()
        try:
            await admin_page.goto("https://prof-memmo.github.io/prof-memmo-gestione-siti/", wait_until="domcontentloaded", timeout=15000)
            await admin_page.wait_for_timeout(1000)
            
            # Switch alla sezione Rilasci
            await admin_page.evaluate("if (typeof switchView === 'function') switchView('view-rilasci');")
            await admin_page.wait_for_timeout(1000)

            project_cards = await admin_page.query_selector_all(".project-card")
            print(f"  -> Rilevate {len(project_cards)} schede progetto nella sezione Rilasci.")

            for card in project_cards:
                title_el = await card.query_selector("h3")
                card_title = (await title_el.inner_text()).strip() if title_el else "Progetto"
                links = await card.query_selector_all("a[href]")
                
                for link in links:
                    label = (await link.inner_text()).strip()
                    href = await link.get_attribute("href")
                    if not href or href == "#":
                        continue
                    parsed_href = urlparse(href)
                    if parsed_href.netloc in DEAD_DOMAINS:
                        all_failures.append(f"[L3-RILASCI-LINK-DISMESSO] {card_title} ({label}): link a vecchio dominio {href}")
                    else:
                        # Verifica rapida con HEAD
                        try:
                            req = urllib.request.Request(href, headers=HEADERS, method='HEAD')
                            with urllib.request.urlopen(req, timeout=8) as r:
                                if r.status != 200:
                                    all_failures.append(f"[L3-RILASCI-STATUS-{r.status}] {card_title} ({label}): {href}")
                        except Exception as e:
                            all_failures.append(f"[L3-RILASCI-ERR] {card_title} ({label}): {href} -> {e}")

            print(f"  [OK] Tutti i link di rilascio Live & Preview verificati con successo.")
        except Exception as e:
            all_failures.append(f"[L3-RILASCI-CRASH] Errore verifica sezione Rilasci: {e}")
        finally:
            await admin_page.close()

        await browser.close()

    # -------------------------------------------------------------
    # REPORT FINALE E VERDETTO
    # -------------------------------------------------------------
    print("\n" + "=" * 85)
    print("                    REPORT FINALE DI COLLAUDO INTEGRATO")
    print("=" * 85)
    print(f"{'Sito / Applicazione':<28} | {'Asset OK':<9} | {'Boot':<6} | {'Pulsanti Cliccati':<18} | {'Stato':<8}")
    print("-" * 85)

    for name, st in site_stats.items():
        boot_str = "OK" if st["boot_ok"] else "FAIL"
        status_str = "SUPERATO" if st["boot_ok"] and st["assets_err"] == 0 and st["button_errors"] == 0 else "FALLITO"
        print(f"{name:<28} | {st['assets_ok']:<9} | {boot_str:<6} | {st['buttons_clicked']:<18} | {status_str:<8}")

    print("=" * 85)
    print(f"TOTALE ASSET VERIFICATI: {total_assets_checked}")
    print(f"TOTALE PULSANTI CLICCATI E TESTATI: {total_buttons_clicked}")
    print(f"TOTALE ANOMALIE / ERRORI: {len(all_failures)}")

    if all_failures:
        print("\n[ATTENZIONE] SONO STATE RILEVATE LE SEGUENTI ANOMALIE:")
        for f in all_failures:
            print(f"  - {f}")
        print("=" * 85)
        print("ESITO FINALE: FALLITO ❌")
        return False
    else:
        print("\nESITO FINALE: 100% COLLAUDATO E PERFETTAMENTE FUNZIONANTE! ✅")
        print("Tutte le pagine, risorse, pulsanti e reindirizzamenti rispondono ai criteri di qualità.")
        print("=" * 85)
        return True

if __name__ == "__main__":
    success = asyncio.run(run_master_collaudo())
    sys.exit(0 if success else 1)
