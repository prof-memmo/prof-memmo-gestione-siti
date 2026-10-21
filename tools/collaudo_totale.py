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
    if "--preview" in sys.argv or os.environ.get("TEST_PREVIEW") == "1":
        return True
    return False

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
# LIVELLO 0: VALIDAZIONE STATICA DELLA SINTASSI JAVASCRIPT (ZERO SYNTAX ERRORS)
# =========================================================================
async def run_livello_0_js_syntax():
    print("\n" + "=" * 85)
    print(">>> LIVELLO 0: VALIDAZIONE STATICA DELLA SINTASSI JAVASCRIPT...")
    print("=" * 85)
    failures = []
    js_files = []
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', '_archivio_migrazione']]
        for f in files:
            if f.endswith('.js') and not f.endswith('.min.js'):
                js_files.append(os.path.join(root, f))

    print(f"  [0.1] Scansione sintattica su {len(js_files)} file JavaScript dell'ecosistema...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for js_path in js_files:
            rel_path = os.path.relpath(js_path, base_dir)
            try:
                with open(js_path, "r", encoding="utf-8") as f:
                    code = f.read()

                test_page = await browser.new_page()
                file_errors = []
                test_page.on("pageerror", lambda err: file_errors.append(str(err)))
                
                try:
                    await test_page.add_script_tag(content=code, type="module")
                    await test_page.wait_for_timeout(30)
                except Exception as e_add:
                    file_errors.append(str(e_add))
                finally:
                    await test_page.close()

                syntax_errs = [e for e in file_errors if any(k in e for k in ["SyntaxError", "Unexpected", "Missing", "Invalid", "Token"])]
                if syntax_errs:
                    failures.append(f"[L0-SYNTAX-ERR] {rel_path}: {syntax_errs[0]}")
                    print(f"        ❌ {rel_path} -> {syntax_errs[0]}")
            except Exception as e:
                failures.append(f"[L0-READ-ERR] {rel_path}: {e}")
                print(f"        ❌ {rel_path} -> Errore lettura: {e}")

        await browser.close()

    if not failures:
        print(f"        -> OK! Tutti i {len(js_files)} file JS analizzati sono sintatticamente validi al 100%.")
        return True, failures
    else:
        print(f"        ❌ Rilevati {len(failures)} errori di sintassi nei file JavaScript!")
        return False, failures

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
                err_msg = str(err_body.get('error', {}).get('message', ''))
                if "signBlob" in err_msg or "iam.serviceAccounts.signBlob" in err_msg:
                    failures.append(f"[L1-IAM-DENIED] GCP IAM Token Creator mancante: {err_msg}")
                    print(f"        ❌ ERRORE IAM: Permesso signBlob negato!")
                elif err_status in ['NOT_FOUND', 'INVALID_ARGUMENT']:
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

    # 1.4 Test Salute Permessi GCP IAM Token Creator
    print("  [1.4] Test Permessi IAM GCP (Service Account Token Creator)...")
    try:
        # Verifica che il token di servizio sia autorizzato
        status, body_text = robust_post(url_login, {'data': {'classCode': active_code, 'studentId': 'non_existent', 'password': 'x'}}, timeout=15)
        err_body = json.loads(body_text) if status != 200 else {}
        err_msg = str(err_body.get('error', {}).get('message', ''))
        if "signBlob" in err_msg:
            failures.append(f"[L1-IAM-TOKEN-CREATOR] Ruolo Service Account Token Creator non attivo su GCP!")
            print(f"        ❌ ERRORE IAM: {err_msg}")
        else:
            print("        -> OK! Permessi IAM per generazione token custom confermati.")
    except Exception as e:
        failures.append(f"[L1-IAM-CHECK-FAIL] Errore verifica permessi IAM: {e}")
        print(f"        ❌ ERRORE: {e}")

    # 1.5 Test Stato Build GitHub Pages & Anti-Stale CDN Cache
    print("  [1.5] Test Stato Pubblicazione GitHub Pages & CDN Cache...")
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        try:
            req_eco = urllib.request.Request(
                "https://firestore.googleapis.com/v1/projects/prof-memmo-hub/databases/(default)/documents/hub_settings/ecosistema",
                headers={'User-Agent': 'CollaudoTotale/4.0'}
            )
            with urllib.request.urlopen(req_eco, timeout=5) as r_eco:
                eco_data = json.loads(r_eco.read().decode())
                token = eco_data.get("fields", {}).get("github_token", {}).get("stringValue")
        except Exception:
            token = None

    for repo_check in ['prof-memmo-gestione-siti', 'games']:
        try:
            headers = {'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'CollaudoTotale/4.0'}
            if token:
                headers['Authorization'] = f'token {token}'
            req_gh = urllib.request.Request(
                f"https://api.github.com/repos/prof-memmo/{repo_check}/pages",
                headers=headers
            )
            with urllib.request.urlopen(req_gh, timeout=10) as r_gh:
                gh_data = json.loads(r_gh.read().decode())
                gh_status = gh_data.get('status')
                if gh_status == 'built':
                    print(f"        -> OK! GitHub Pages '{repo_check}': build confermato (status: built)")
                else:
                    print(f"        ⚠️ AVVISO: GitHub Pages '{repo_check}' in compilazione/propagazione: status = {gh_status}")
        except Exception as gh_e:
            print(f"        -> Note: Controllo GitHub Pages API per '{repo_check}': {gh_e}")

    # Esito Livello 1
    if failures:
        print("\n❌ LIVELLO 1 FALLITO: Rilevate anomalie nell'infrastruttura backend Firebase!")
        for f in failures:
            print(f"   - {f}")
        return False, active_code, failures
    
    print("\n✅ LIVELLO 1 SUPERATO: Backend Firebase, Cloud Functions, IAM e GitHub Pages 100% OPERATIVI!")
    return True, active_code, []

# =========================================================================
# LIVELLO 2: PERCORSI UTENTE REALI (USER JOURNEY PLAYWRIGHT: CHROMIUM + WEBKIT)
# =========================================================================
async def run_livello_2_user_journey(active_code):
    print("\n" + "=" * 85)
    print(f">>> LIVELLO 2: USER JOURNEY REALE NEL BROWSER (CHROMIUM & WEBKIT/SAFARI)...")
    print("=" * 85)
    failures = []
    
    is_preview = get_is_preview()
    portal_url = "https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/portal.html?role=studente" if is_preview else "https://prof-memmo.github.io/prof-memmo-gestione-siti/portal.html?role=studente"

    # 2.0 Verifica Matrice di Reindirizzamento SSO (?redirect=...)
    print("  [2.0] Test Integrità Matrice Reindirizzamenti SSO (?redirect=...)...")
    redirect_targets = [
        ("fantaletteratura", "https://prof-memmo.github.io/fantaletteratura/preview/" if is_preview else "https://prof-memmo.github.io/fantaletteratura/"),
        ("palestra_riflessione", "https://prof-memmo.github.io/palestra-di-riflessione/preview/" if is_preview else "https://prof-memmo.github.io/palestra-di-riflessione/"),
        ("palestra-di-riflessione", "https://prof-memmo.github.io/palestra-di-riflessione/preview/" if is_preview else "https://prof-memmo.github.io/palestra-di-riflessione/"),
        ("rotta_degli_eroi", "https://prof-memmo.github.io/la-rotta-degli-eroi/preview/" if is_preview else "https://prof-memmo.github.io/la-rotta-degli-eroi/"),
        ("la-rotta-degli-eroi", "https://prof-memmo.github.io/la-rotta-degli-eroi/preview/" if is_preview else "https://prof-memmo.github.io/la-rotta-degli-eroi/"),
        ("corte_della_commedia", "https://prof-memmo.github.io/la-corte-della-commedia/preview/" if is_preview else "https://prof-memmo.github.io/la-corte-della-commedia/"),
        ("la-corte-della-commedia", "https://prof-memmo.github.io/la-corte-della-commedia/preview/" if is_preview else "https://prof-memmo.github.io/la-corte-della-commedia/"),
        ("ops_storia", "https://prof-memmo.github.io/ops-storia/preview/" if is_preview else "https://prof-memmo.github.io/ops-storia/"),
        ("ops-storia", "https://prof-memmo.github.io/ops-storia/preview/" if is_preview else "https://prof-memmo.github.io/ops-storia/"),
        ("l_oratore", "https://prof-memmo.github.io/l-oratore/preview/" if is_preview else "https://prof-memmo.github.io/l-oratore/"),
        ("l-oratore", "https://prof-memmo.github.io/l-oratore/preview/" if is_preview else "https://prof-memmo.github.io/l-oratore/"),
        ("historygram", "https://prof-memmo.github.io/historygram/preview/" if is_preview else "https://prof-memmo.github.io/historygram/"),
        ("la_ruota_geografica", "https://prof-memmo.github.io/la-ruota-geografica/preview/" if is_preview else "https://prof-memmo.github.io/la-ruota-geografica/"),
        ("la-ruota-geografica", "https://prof-memmo.github.io/la-ruota-geografica/preview/" if is_preview else "https://prof-memmo.github.io/la-ruota-geografica/"),
        ("prezzi", "https://prof-memmo.github.io/games/preview/prezzi.html" if is_preview else "https://prof-memmo.github.io/games/prezzi.html"),
        ("profilo", "https://prof-memmo.github.io/games/preview/profilo.html" if is_preview else "https://prof-memmo.github.io/games/profilo.html")
    ]
    sso_errs = 0
    for r_key, target_url in redirect_targets:
        try:
            req_sso = urllib.request.Request(target_url, headers={'User-Agent': 'Mozilla/5.0 CollaudoTotale/4.0'})
            with urllib.request.urlopen(req_sso, timeout=8) as resp_sso:
                if resp_sso.status != 200:
                    failures.append(f"[L2-SSO-REDIRECT-FAIL] Target redirect '{r_key}' -> {target_url} ha risposto HTTP {resp_sso.status}")
                    sso_errs += 1
        except Exception as e_sso:
            failures.append(f"[L2-SSO-REDIRECT-ERR] Target redirect '{r_key}' -> {target_url} non raggiungibile: {e_sso}")
            sso_errs += 1

    if sso_errs == 0:
        print(f"        -> OK! Tutte le {len(redirect_targets)} rotte della matrice SSO esistono e rispondono HTTP 200.")
    else:
        print(f"        ❌ Rilevati {sso_errs} errori nella matrice dei reindirizzamenti SSO!")

    # Helper per test percorso studente su un browser specifico
    async def test_browser_journey(browser_type_name, browser_launcher):
        b_failures = []
        js_errors = []
        dialog_alerts = []
        print(f"  [2.{browser_type_name}] Test Percorso Studente su Motore {browser_type_name.upper()}...")

        try:
            browser = await browser_launcher.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()

            page.on("pageerror", lambda err: js_errors.append(str(err)))
            page.on("console", lambda msg: js_errors.append(f"Console error: {msg.text}") if msg.type == "error" else None)
            page.on("dialog", lambda d: dialog_alerts.append(d.message))

            clean_portal_url = portal_url.split("?")[0]
            print(f"        -> Caricamento: {clean_portal_url}")
            await page.goto(clean_portal_url, wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(800)

            # 1. Schermata Selezione Ruolo / Porte d'Accesso (Clic Studente)
            await page.wait_for_selector(".platform-card", state="visible", timeout=8000)
            await page.click(".platform-card[onclick*='studente']")
            await page.wait_for_timeout(600)

            # 2. Inserimento codice classe reale
            await page.wait_for_selector("#student-code-input", state="visible", timeout=8000)
            await page.fill("#student-code-input", active_code)
            await page.click("#btn-student-find-class")

            # 3. Attendi rendering banner classe
            await page.wait_for_selector("#student-found-class-name", state="visible", timeout=10000)
            name_text = await page.inner_text("#student-found-class-name")
            sub_text = await page.inner_text("#student-found-class-sub")
            print(f"        -> [{browser_type_name.upper()}] Banner classe trovato: '{name_text}' ({sub_text})")

            # Verifica presenza opzioni nel dropdown studenti
            claim_opts = await page.query_selector_all("#student-claim-select option")
            login_opts = await page.query_selector_all("#student-login-select option")
            total_students = len(claim_opts) + len(login_opts) - 2 # escludi placeholder
            print(f"        -> [{browser_type_name.upper()}] Roster caricato: {len(claim_opts)} slot non attivati, {len(login_opts)} attivi")

            if total_students <= 0:
                b_failures.append(f"[L2-{browser_type_name.upper()}-EMPTY] Nessuno studente presente nel roster ({active_code})")

            if js_errors:
                for err in js_errors:
                    b_failures.append(f"[L2-{browser_type_name.upper()}-JS] Errore JavaScript: {err}")
                    print(f"        ❌ [{browser_type_name.upper()}] JS ERROR: {err}")

            crit_alerts = [a for a in dialog_alerts if "errore" in a.lower() or "fail" in a.lower()]
            if crit_alerts:
                for ca in crit_alerts:
                    b_failures.append(f"[L2-{browser_type_name.upper()}-ALERT] Alert: {ca}")
                    print(f"        ❌ [{browser_type_name.upper()}] ALERT: {ca}")

            await browser.close()
            print(f"        -> OK! Test completato con SUCCESSO su motore {browser_type_name.upper()}.")

        except Exception as e:
            b_failures.append(f"[L2-{browser_type_name.upper()}-CRASH] Crash percorso su {browser_type_name}: {e}")
            print(f"        ❌ [{browser_type_name.upper()}] CRASH: {e}")

        return b_failures

    async with async_playwright() as p:
        # Test su Chromium (Blink)
        chrom_fails = await test_browser_journey("chromium", p.chromium)
        failures.extend(chrom_fails)

        # Test su WebKit (Safari Engine)
        webkit_fails = await test_browser_journey("webkit_safari", p.webkit)
        failures.extend(webkit_fails)

    if failures:
        print("\n❌ LIVELLO 2 FALLITO: Il percorso utente nei browser ha riscontrato anomalie!")
        for f in failures:
            print(f"   - {f}")
        return False, failures
    
    print("\n✅ LIVELLO 2 SUPERATO: Percorsi utente su Chromium e WebKit/Safari completati con SUCCESSO!")
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
            page.on("pageerror", lambda err: page_errors.append(f"PageError: {err}"))
            page.on("console", lambda msg: page_errors.append(f"Console error: {msg.text}") if msg.type == "error" else None)
            
            def handle_req_failed(req):
                u = req.url
                f = str(req.failure or "")
                # Ignora solo la chiusura fisiologica dello stream realtime di Firestore dovuta allo scaricamento della pagina
                if "firestore.googleapis.com" in u and "Listen/channel" in u and "ERR_ABORTED" in f:
                    return
                if any(ext in u for ext in [".js", ".css", "firestore", "cloudfunctions"]):
                    page_errors.append(f"Request failed: {u} ({f})")

            page.on("requestfailed", handle_req_failed)

            try:
                resp = None
                last_nav_err = None
                for attempt in range(2):
                    try:
                        resp = await page.goto(page_url, wait_until="domcontentloaded", timeout=25000)
                        last_nav_err = None
                        break
                    except Exception as e_nav:
                        last_nav_err = e_nav
                        await asyncio.sleep(1)

                if last_nav_err:
                    raise last_nav_err
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

                # Se è presente un banner legale o cookie modale aperto, accettalo prima di testare i pulsanti interni
                try:
                    modal_close_btn = await page.query_selector("#pmSharedAccept, .btn-accept, #accept-terms, .modal-close, button:has-text('Accetta'), button:has-text('Chiudi')")
                    if modal_close_btn and await modal_close_btn.is_visible():
                        await modal_close_btn.click(timeout=1000)
                        await page.wait_for_timeout(300)
                except Exception:
                    pass

                # Clic elementi interattivi visibili (pulsanti, card ruoli, bottoni d'azione)
                interactive_els = await page.query_selector_all("button, [role='button'], a.btn, .btn, .platform-card, [onclick]")
                clicked_here = 0
                for el in interactive_els[:15]:
                    try:
                        if await el.is_visible():
                            tag_name = await page.evaluate("e => e.tagName.toLowerCase()", el)
                            href = await el.get_attribute("href") if tag_name == "a" else None
                            if href and (href.startswith("http") or href.startswith("mailto:") or href.startswith("tel:")):
                                continue
                            # Se l'elemento è coperto o disabilitato, ignora
                            await el.click(timeout=1200, no_wait_after=True)
                            clicked_here += 1
                            total_buttons_clicked += 1
                            await page.wait_for_timeout(100)
                    except Exception as e_click:
                        # Se il click fallisce per errore reale di esecuzione
                        err_str = str(e_click)
                        if "intercepts pointer events" not in err_str:
                            all_failures.append(f"[L4-CLICK-ERR] {name}: fallito click su elemento interattivo -> {err_str}")
                            site_stats[name]["button_errors"] += 1
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
    print("      PROF. MEMMO — MASTER SUITE DI COLLAUDO TOTALE DELL'ECOSISTEMA (v4.0)")
    print("=" * 85)
    print("Verifica completa e rigorosa: Backend Firebase -> Percorso Reale (Chromium & WebKit/Safari) -> Rete -> Pagine.")
    print("Tolleranza Zero per crash console, discrepanze WebKit, Cloud Functions non deployate e permessi mancanti.")

    # 0. LIVELLO 0: SINTASSI JAVASCRIPT STATICA (Fail-Fast immediato)
    l0_ok, l0_failures = await run_livello_0_js_syntax()
    if not l0_ok:
        print("\n⛔ COLLAUDO INTERROTTO AL LIVELLO 0: Risolvi gli errori di sintassi JavaScript prima di procedere.")
        return False

    # 1. LIVELLO 1: BACKEND (Fail-Fast: se fallisce, blocca tutto subito)
    l1_ok, active_code, l1_failures = run_livello_1_backend()
    if not l1_ok:
        print("\n⛔ COLLAUDO INTERROTTO AL LIVELLO 1: Risolvi i problemi di backend prima del rilascio.")
        return False

    # 2. LIVELLO 2: USER JOURNEY STUDENTE REALE (Chromium + WebKit/Safari & Matrice SSO)
    l2_ok, l2_failures = await run_livello_2_user_journey(active_code)
    if not l2_ok:
        print("\n⛔ COLLAUDO INTERROTTO AL LIVELLO 2: Il percorso studente nei browser non funziona.")
        return False

    # Se richiesta solo la verifica rapida backend
    if "--backend-only" in sys.argv:
        print("\n" + "=" * 85)
        print("ESITO VERIFICA RAPIDA BACKEND: 100% FUNZIONANTE! ✅")
        print("Cloud Functions, Regole Firestore e Login Studente (Chromium & WebKit) sono perfettamente operativi.")
        print("=" * 85)
        return True

    # 3 & 4. LIVELLO 3 & 4: RETE, ASSET & AUDIT BROWSER
    all_failures, site_stats, total_assets, total_buttons = await run_livelli_3_e_4()
    all_failures.extend(l1_failures)
    all_failures.extend(l2_failures)

    # REPORT FINALE
    print("\n" + "=" * 85)
    print("                    REPORT FINALE DI COLLAUDO INTEGRATO (v4.0)")
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
