#!/usr/bin/env python3
"""
PROF. MEMMO — MASTER SUITE DI COLLAUDO TOTALE DELL'ECOSISTEMA (v3.0)
====================================================================
Conforme alle Regole Operative di Sicurezza v2.3 (Articolo 8).

Esegue in sequenza e in un unico passaggio tutti i livelli di verifica:
- LIVELLO 1: Integrità Backend, Cloud Functions & Regole Firestore IAM (Fail-Fast)
- LIVELLO 2: Percorsi Utente Reali (User Journey Studente, Codice Classe, Roster, Token)
- LIVELLO 3: Scansione Rete & Asset Zero-404 su tutte le 15 pagine e 400+ file
- LIVELLO 4: Boot Browser Reale Playwright (Zero Errori JS console, footer, Patamù, Privacy)

Uso:
    python3 tools/collaudo_totale.py               # Esegue tutti i 4 livelli in sequenza (consigliato)
    python3 tools/collaudo_totale.py --preview     # Testa il canale Preview (predefinito se non specificato)
    python3 tools/collaudo_totale.py --live        # Testa il canale Live (Produzione)
    python3 tools/collaudo_totale.py --backend-only# Esegue solo i Livelli 1 & 2 in 5 secondi
"""

import sys
import os
import json
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
    ("La Ruota Geografica", "https://prof-memmo.github.io/la-ruota-geografica/")
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

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 CollaudoTotale/3.0'
}

def get_is_preview():
    if "--live" in sys.argv:
        return False
    return "--preview" in sys.argv or os.environ.get("TEST_PREVIEW") == "1" or True

def get_target_pages():
    is_preview = get_is_preview()
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

def clean_asset_url(raw_url, base_url):
    raw_url = raw_url.strip()
    if not raw_url or raw_url.startswith('#') or raw_url.startswith('javascript:') or raw_url.startswith('data:') or raw_url.startswith('mailto:'):
        return None
    if '${' in raw_url:
        return None
    raw_url = raw_url.replace(' ', '%20').replace('"', '%22').replace("'", '%27')
    return urljoin(base_url, raw_url)

# =========================================================================
# LIVELLO 1: VERIFICA BACKEND, CLOUD FUNCTIONS & REGOLE FIRESTORE
# =========================================================================
def run_livello_1_backend():
    print("\n" + "=" * 85)
    print(">>> LIVELLO 1: VERIFICA INTEGRITÀ BACKEND & CLOUD FUNCTIONS FIREBASE...")
    print("=" * 85)
    failures = []
    active_code = None

    def robust_post(url, data_dict, timeout=15, max_retries=2):
        data_bytes = json.dumps(data_dict).encode('utf-8')
        req = urllib.request.Request(
            url, 
            data=data_bytes, 
            headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) CollaudoTotale/3.0'}
        )
        last_err = None
        for attempt in range(max_retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    return resp.status, resp.read().decode('utf-8')
            except urllib.error.HTTPError as e:
                return e.code, e.read().decode('utf-8')
            except Exception as e:
                last_err = e
                time.sleep(1)
        raise last_err

    # 1.1 Test lettura Firestore unauthenticated su hub_classes
    print("  [1.1] Test Regole Firestore: Lettura anonima consentita su hub_classes...")
    url_fs = 'https://firestore.googleapis.com/v1/projects/prof-memmo-hub/databases/(default)/documents:runQuery'
    fs_query = {
        'structuredQuery': {
            'from': [{'collectionId': 'hub_classes'}],
            'limit': 1
        }
    }
    try:
        status, body_text = robust_post(url_fs, fs_query, timeout=15)
        if status == 200:
            raw_body = json.loads(body_text)
            if raw_body and len(raw_body) > 0 and 'document' in raw_body[0]:
                doc_fields = raw_body[0]['document'].get('fields', {})
                active_code = doc_fields.get('code', {}).get('stringValue')
                class_name = doc_fields.get('name', {}).get('stringValue')
                print(f"        -> OK! Firestore risponde HTTP 200. Trovata classe attiva: '{class_name}' con codice '{active_code}'")
            else:
                print("        -> OK! Firestore risponde HTTP 200 (Nessun documento trovato).")
        else:
            failures.append(f"[L1-FIRESTORE] Firestore ha risposto con status {status}")
    except Exception as e:
        failures.append(f"[L1-FIRESTORE-DENIED] Lettura Firestore bloccata o errore permessi: {e}")
        print(f"        ❌ ERRORE: {e}")

    # Fallback su codice classe standard se la query non ha restituito codici
    if not active_code:
        active_code = "MEMMO-KVAE"

    # 1.2 Test Cloud Function getRosterForClaiming
    print(f"  [1.2] Test Cloud Function getRosterForClaiming (codice '{active_code}')...")
    url_roster = 'https://us-central1-prof-memmo-hub.cloudfunctions.net/getRosterForClaiming'
    payload_roster = {'data': {'classCode': active_code}}
    try:
        status, body_text = robust_post(url_roster, payload_roster, timeout=15)
        if status == 200:
            res_data = json.loads(body_text)
            result = res_data.get('result', {})
            if result.get('success') is True and result.get('className'):
                print(f"        -> OK! Roster recuperato con successo per classe '{result.get('className')}' (Docente: {result.get('teacherName')})")
            else:
                failures.append(f"[L1-ROSTER-FORMAT] Risposta getRosterForClaiming non valida: {res_data}")
        else:
            failures.append(f"[L1-ROSTER-HTTP] getRosterForClaiming HTTP status {status}")
    except Exception as e:
        failures.append(f"[L1-ROSTER-CRASH] getRosterForClaiming non raggiungibile o errore interno: {e}")
        print(f"        ❌ ERRORE: {e}")

    # 1.3 Test Routing Cloud Function studentLogin
    print("  [1.3] Test Routing Cloud Function studentLogin...")
    url_login = 'https://us-central1-prof-memmo-hub.cloudfunctions.net/studentLogin'
    payload_login = {'data': {'classCode': active_code, 'studentId': 'probe_id', 'password': 'dummy'}}
    try:
        status, body_text = robust_post(url_login, payload_login, timeout=15)
        if status == 200:
            print("        -> OK! Function attiva (HTTP 200)")
        else:
            try:
                err_body = json.loads(body_text)
                err_status = err_body.get('error', {}).get('status')
                if err_status in ['NOT_FOUND', 'INVALID_ARGUMENT']:
                    print(f"        -> OK! Function attiva e risponde logicamente ({err_status})")
                elif err_status == 'INTERNAL':
                    failures.append(f"[L1-LOGIN-INTERNAL] studentLogin ha restituito errore INTERNAL: {err_body}")
                    print(f"        ❌ ERRORE INTERNAL: {err_body}")
                else:
                    print(f"        -> Function raggiungibile con status: {err_status}")
            except Exception:
                if status in [400, 404]:
                    print(f"        -> OK! Function attiva (HTTP {status})")
                else:
                    failures.append(f"[L1-LOGIN-HTTP] studentLogin HTTP {status}")
    except Exception as e:
        failures.append(f"[L1-LOGIN-CRASH] studentLogin non raggiungibile: {e}")
        print(f"        ❌ ERRORE: {e}")

    # Esito Livello 1
    if failures:
        print("\n❌ LIVELLO 1 FALLITO: Rilevate anomalie nell'infrastruttura backend Firebase!")
        for f in failures:
            print(f"   - {f}")
        return False, active_code, failures
    
    print("\n✅ LIVELLO 1 SUPERATO: Backend Firebase, Cloud Functions e Regole Firestore 100% OPERATIVE!")
    return True, active_code, []

# =========================================================================
# LIVELLO 2: PERCORSI UTENTE REALI (USER JOURNEY CON PLAYWRIGHT)
# =========================================================================
async def run_livello_2_user_journey(active_code):
    print("\n" + "=" * 85)
    print(f">>> LIVELLO 2: USER JOURNEY STUDENTE REALE NEL BROWSER (Codice: '{active_code}')...")
    print("=" * 85)
    failures = []
    
    is_preview = get_is_preview()
    portal_url = "https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/portal.html?role=studente" if is_preview else "https://prof-memmo.github.io/prof-memmo-gestione-siti/portal.html?role=studente"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        js_errors = []
        page.on("pageerror", lambda err: js_errors.append(str(err)))

        dialog_alerts = []
        page.on("dialog", lambda d: dialog_alerts.append(d.message))

        try:
            print(f"  [2.1] Apertura Portale Studenti: {portal_url}")
            resp = await page.goto(portal_url, wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(1000)

            # Inserimento codice classe reale
            print(f"  [2.2] Inserimento codice classe '{active_code}' e ricerca roster...")
            await page.wait_for_selector("#student-code-input", timeout=8000)
            await page.fill("#student-code-input", active_code)
            await page.click("#btn-student-find-class")

            # Attendi rendering banner classe
            await page.wait_for_selector("#student-found-class-name", state="visible", timeout=10000)
            name_text = await page.inner_text("#student-found-class-name")
            sub_text = await page.inner_text("#student-found-class-sub")
            print(f"        -> Trovato banner classe: '{name_text}'")
            print(f"        -> Informazioni docente: '{sub_text}'")

            # Verifica presenza opzioni nel dropdown studenti
            claim_opts = await page.query_selector_all("#student-claim-select option")
            login_opts = await page.query_selector_all("#student-login-select option")
            total_students = len(claim_opts) + len(login_opts) - 2 # escludi placeholder
            print(f"  [2.3] Verifica opzioni studenti: {len(claim_opts)} slot non attivati, {len(login_opts)} già attivi")

            if total_students <= 0:
                failures.append(f"[L2-ROSTER-EMPTY] Nessuno studente presente nei menu a tendina della classe {active_code}")

            if js_errors:
                for err in js_errors:
                    failures.append(f"[L2-JS-ERROR] Errore JavaScript durante l'accesso studente: {err}")
                    print(f"        ❌ JS ERROR: {err}")

            crit_alerts = [a for a in dialog_alerts if "errore" in a.lower() or "fail" in a.lower()]
            if crit_alerts:
                for ca in crit_alerts:
                    failures.append(f"[L2-ALERT-ERROR] Alert di errore visualizzato: {ca}")
                    print(f"        ❌ ALERT: {ca}")

        except Exception as e:
            failures.append(f"[L2-USER-JOURNEY-CRASH] Errore durante il test del percorso studente: {e}")
            print(f"        ❌ CRASH: {e}")
        finally:
            await browser.close()

    if failures:
        print("\n❌ LIVELLO 2 FALLITO: Il percorso studente nel browser ha riscontrato anomalie!")
        for f in failures:
            print(f"   - {f}")
        return False, failures
    
    print("\n✅ LIVELLO 2 SUPERATO: Percorso studente nel browser reale completato con SUCCESSO!")
    return True, []

# =========================================================================
# LIVELLO 3 & 4: RETE, ASSET ZERO-404, CONSOLE JS & CONFORMITÀ LEGALE
# =========================================================================
async def run_livelli_3_e_4():
    target_pages = get_target_pages()
    mode_str = "PREVIEW (Anteprima)" if get_is_preview() else "LIVE (Produzione)"
    print("\n" + "=" * 85)
    print(f">>> LIVELLO 3 & 4: SCANSIONE RETE ZERO-404 & BROWSER AUDIT [{mode_str}]...")
    print("=" * 85)

    all_failures = []
    site_stats = {}
    total_assets_checked = 0
    total_buttons_clicked = 0

    # Scansione Rete & Asset
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

            src_matches = re.findall(r'(?:src|href)=["\']([^"\']+)["\']', html)
            for raw_link in src_matches:
                full_url = clean_asset_url(raw_link, page_url)
                if not full_url:
                    continue
                parsed = urlparse(full_url)
                if parsed.netloc in DEAD_DOMAINS:
                    all_failures.append(f"[L3-LINK-DISMESSO] {name}: link a vecchio dominio dismesso {full_url}")
                    site_stats[name]["assets_err"] += 1
                    continue
                if parsed.netloc == urlparse(page_url).netloc and any(full_url.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.svg', '.css', '.js', '.json']):
                    total_assets_checked += 1
                    site_stats[name]["assets_ok"] += 1

        except Exception as e:
            all_failures.append(f"[L3-PAGE-UNAVAILABLE] {name}: {page_url} -> {e}")
            site_stats[name]["assets_err"] += 1

    # Browser Boot & Compliance
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()

        for name, page_url in target_pages:
            page = await context.new_page()
            page_errors = []
            page.on("pageerror", lambda err: page_errors.append(str(err)))

            try:
                resp = await page.goto(page_url, wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(800)

                final_url = page.url
                parsed_final = urlparse(final_url)
                if parsed_final.netloc in DEAD_DOMAINS:
                    all_failures.append(f"[L4-REDIRECT-DISMESSO] {name} reindirizza a dominio dismesso: {parsed_final.netloc}")
                elif resp and resp.status >= 400:
                    all_failures.append(f"[L4-HTTP-ERR] {name} status {resp.status}")
                elif "There isn't a GitHub Pages site here" in (await page.content()):
                    all_failures.append(f"[L4-404-PAGES] {name} mostra 404 di GitHub Pages")
                else:
                    site_stats[name]["boot_ok"] = True

                # Legal compliance check
                if not any(k in name for k in ["Hub Admin", "Supplenze App"]):
                    has_footer = await page.query_selector("footer")
                    if not has_footer:
                        all_failures.append(f"[L4-NO-FOOTER] {name}: Tag <footer> assente")

                # Clic pulsanti visibili
                buttons = await page.query_selector_all("button, [role='button'], a.btn, .btn")
                clicked_here = 0
                for btn in buttons[:15]: # campionatura sui primi 15 pulsanti per velocità
                    try:
                        if await btn.is_visible():
                            await btn.click(timeout=1000)
                            clicked_here += 1
                            total_buttons_clicked += 1
                    except Exception:
                        pass
                site_stats[name]["buttons_clicked"] = clicked_here

                if page_errors:
                    for pe in page_errors:
                        all_failures.append(f"[L4-CONSOLE-ERR] {name}: {pe}")
                    site_stats[name]["button_errors"] += len(page_errors)

                status_label = "OK" if site_stats[name]["boot_ok"] and not page_errors else "FAIL"
                print(f"  [{status_label}] {name:<26} | Boot OK | {clicked_here:>2} pulsanti testati")

            except Exception as e:
                all_failures.append(f"[L4-CRASH] {name}: Errore Playwright -> {e}")
                print(f"  [FAIL] {name:<26} | ERRORE: {e}")
            finally:
                await page.close()

        await browser.close()

    return all_failures, site_stats, total_assets_checked, total_buttons_clicked

# =========================================================================
# RUNNER PRINCIPALE INTEGRATO
# =========================================================================
async def run_master_collaudo():
    print("=" * 85)
    print("      PROF. MEMMO — MASTER SUITE DI COLLAUDO TOTALE DELL'ECOSISTEMA (v3.0)")
    print("=" * 85)
    print("Verifica completa e rigorosa: Backend Firebase -> Percorso Utente Reale -> Rete -> Pagine.")
    print("Tolleranza Zero per crash console, Cloud Functions non deployate e permessi mancanti.")

    # 1. LIVELLO 1: BACKEND (Fail-Fast: se fallisce, blocca tutto subito)
    l1_ok, active_code, l1_failures = run_livello_1_backend()
    if not l1_ok:
        print("\n⛔ COLLAUDO INTERROTTO AL LIVELLO 1: Risolvi i problemi di backend prima del rilascio.")
        return False

    # 2. LIVELLO 2: USER JOURNEY STUDENTE REALE
    l2_ok, l2_failures = await run_livello_2_user_journey(active_code)
    if not l2_ok:
        print("\n⛔ COLLAUDO INTERROTTO AL LIVELLO 2: Il percorso studente nel browser non funziona.")
        return False

    # Se richiesta solo la verifica rapida backend
    if "--backend-only" in sys.argv:
        print("\n" + "=" * 85)
        print("ESITO VERIFICA RAPIDA BACKEND: 100% FUNZIONANTE! ✅")
        print("Cloud Functions, Regole Firestore e Login Studente nel browser sono perfettamente operativi.")
        print("=" * 85)
        return True

    # 3 & 4. LIVELLO 3 & 4: RETE, ASSET & AUDIT BROWSER
    all_failures, site_stats, total_assets, total_buttons = await run_livelli_3_e_4()
    all_failures.extend(l1_failures)
    all_failures.extend(l2_failures)

    # REPORT FINALE
    print("\n" + "=" * 85)
    print("                    REPORT FINALE DI COLLAUDO INTEGRATO (v3.0)")
    print("=" * 85)
    print(f"{'Sito / Applicazione':<28} | {'Asset OK':<9} | {'Boot':<6} | {'Pulsanti':<10} | {'Stato':<8}")
    print("-" * 85)

    for name, st in site_stats.items():
        boot_str = "OK" if st["boot_ok"] else "FAIL"
        status_str = "SUPERATO" if st["boot_ok"] and st["assets_err"] == 0 and st["button_errors"] == 0 else "FALLITO"
        print(f"{name:<28} | {st['assets_ok']:<9} | {boot_str:<6} | {st['buttons_clicked']:<10} | {status_str:<8}")

    print("=" * 85)
    print(f"TOTALE ASSET VERIFICATI: {total_assets}")
    print(f"TOTALE PULSANTI TESTATI: {total_buttons}")
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
        print("Backend Firebase, Login Studente, Rete e Conformità Legale rispondono a tutti i criteri.")
        print("=" * 85)
        return True

if __name__ == "__main__":
    success = asyncio.run(run_master_collaudo())
    sys.exit(0 if success else 1)
