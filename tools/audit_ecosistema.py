#!/usr/bin/env python3
"""
Prof. Memmo — Audit E2E di Rete per l'Ecosistema Multidominio
============================================================
Articolo 8 delle Regole Operative di Sicurezza v2.3.
Scansiona i 10 siti ufficiali dell'Ecosistema Prof. Memmo, verificando
che ogni risorsa (CSS, JS, immagini, font, video, manifest) risponda con HTTP 200 OK.

Zero-404 Tolerance.
Target predefinito: Ambienti Preview (Release Candidate)
Uso:
    python3 tools/audit_ecosistema.py           # Scansiona preview (predefinito)
    python3 tools/audit_ecosistema.py --live    # Scansiona live (produzione)
    python3 tools/audit_ecosistema.py --all     # Scansiona sia preview che live
"""

import sys
import urllib.request
import urllib.error
import re
from urllib.parse import urljoin, urlparse
import concurrent.futures

# Elenco Ufficiale dei 10 Progetti dell'Ecosistema (Canale Preview)
TARGET_PAGES_PREVIEW = [
    ("Hub Gestione & Admin (Preview)", "https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/"),
    ("Hub Portale Operativo (Preview)", "https://prof-memmo.github.io/prof-memmo-gestione-siti/preview/portal.html"),
    ("Sito Vetrina - Home (Preview)", "https://prof-memmo.github.io/games/preview/"),
    ("Sito Vetrina - Giochi (Preview)", "https://prof-memmo.github.io/games/preview/giochi.html"),
    ("Sito Vetrina - Prezzi (Preview)", "https://prof-memmo.github.io/games/preview/prezzi.html"),
    ("Sito Vetrina - Profilo (Preview)", "https://prof-memmo.github.io/games/preview/profilo.html"),
    ("Sito Vetrina - Accedi (Preview)", "https://prof-memmo.github.io/games/preview/accedi.html"),
    ("FantaLetteratura (Preview)", "https://prof-memmo.github.io/fantaletteratura/preview/"),
    ("Palestra di Riflessione (Preview)", "https://prof-memmo.github.io/palestra-di-riflessione/preview/"),
    ("La Rotta degli Eroi (Preview)", "https://prof-memmo.github.io/la-rotta-degli-eroi/preview/"),
    ("La Corte della Commedia (Preview)", "https://prof-memmo.github.io/la-corte-della-commedia/preview/"),
    ("L'Oratore (Preview)", "https://prof-memmo.github.io/l-oratore/preview/"),
    ("Ops! Storia (Preview)", "https://prof-memmo.github.io/ops-storia/preview/"),
    ("HistoryGram (Preview)", "https://prof-memmo.github.io/historygram/preview/"),
    ("La Ruota Geografica (Preview)", "https://prof-memmo.github.io/la-ruota-geografica/preview/")
]

# Elenco Canale Live (Produzione post-rilascio)
TARGET_PAGES_LIVE = [
    ("Hub Gestione & Admin (Live)", "https://prof-memmo.github.io/prof-memmo-gestione-siti/"),
    ("Hub Portale Operativo (Live)", "https://prof-memmo.github.io/prof-memmo-gestione-siti/portal.html"),
    ("Sito Vetrina - Home (Live)", "https://prof-memmo.github.io/games/"),
    ("Sito Vetrina - Giochi (Live)", "https://prof-memmo.github.io/games/giochi.html"),
    ("Sito Vetrina - Prezzi (Live)", "https://prof-memmo.github.io/games/prezzi.html"),
    ("Sito Vetrina - Profilo (Live)", "https://prof-memmo.github.io/games/profilo.html"),
    ("Sito Vetrina - Accedi (Live)", "https://prof-memmo.github.io/games/accedi.html"),
    ("FantaLetteratura (Live)", "https://prof-memmo.github.io/fantaletteratura/"),
    ("Palestra di Riflessione (Live)", "https://prof-memmo.github.io/palestra-di-riflessione/"),
    ("La Rotta degli Eroi (Live)", "https://prof-memmo.github.io/la-rotta-degli-eroi/"),
    ("La Corte della Commedia (Live)", "https://prof-memmo.github.io/la-corte-della-commedia/"),
    ("L'Oratore (Live)", "https://prof-memmo.github.io/l-oratore/"),
    ("Ops! Storia (Live)", "https://prof-memmo.github.io/ops-storia/"),
    ("HistoryGram (Live)", "https://prof-memmo.github.io/historygram/"),
    ("La Ruota Geografica (Live)", "https://prof-memmo.github.io/la-ruota-geografica/")
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 ProfMemmoAudit/2.3'
}

def clean_asset_url(raw_url, base_url):
    raw_url = raw_url.strip()
    if not raw_url or raw_url.startswith('#') or raw_url.startswith('javascript:') or raw_url.startswith('data:') or raw_url.startswith('mailto:'):
        return None
    # Ignora stringhe template JS letterali
    if '${' in raw_url:
        return None
    # Codifica spazi grezzi
    raw_url = raw_url.replace(' ', '%20').replace('"', '%22').replace("'", '%27')
    return urljoin(base_url, raw_url)

def run_audit(target_pages, mode_label="PREVIEW"):
    print("=" * 75)
    print(f"PROF. MEMMO — AUDIT E2E DI RETE [{mode_label.upper()}] (ARTICOLO 8)")
    print("Verifica dell'integrità dei domini e assenza totale di errori 404/500")
    print("=" * 75)

    total_pages = len(target_pages)
    pages_ok = 0
    total_assets_checked = 0
    all_failures = []

    for name, page_url in target_pages:
        print(f"\n[SCANSIONE] {name}: {page_url}")
        try:
            req = urllib.request.Request(page_url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as resp:
                status = resp.status
                html = resp.read().decode('utf-8', errors='ignore')
                print(f"  -> Pagina caricata con HTTP {status}")
                pages_ok += 1
        except Exception as e:
            print(f"  ❌ ERRORE CARICAMENTO PAGINA: {e}")
            all_failures.append((page_url, "PAGE_UNAVAILABLE", str(e)))
            continue

        # Estrai tutti i riferimenti ad asset (script, link, img, source, audio, video)
        found_raw = re.findall(r'(?:src|href)=["\']([^"\']+)["\']', html)
        assets_to_check = []
        seen = set()

        for raw in found_raw:
            asset_url = clean_asset_url(raw, page_url)
            if not asset_url or asset_url in seen:
                continue
            seen.add(asset_url)
            parsed = urlparse(asset_url)
            is_internal = ('profmemmo.it' in parsed.netloc or 'prof-memmo.github.io' in parsed.netloc)
            if is_internal:
                assets_to_check.append(asset_url)

        total_assets_checked += len(assets_to_check)
        page_failures = []

        def verify_single_asset(url):
            for attempt in range(2):
                try:
                    areq = urllib.request.Request(url, headers=HEADERS)
                    with urllib.request.urlopen(areq, timeout=10) as aresp:
                        if aresp.status < 400:
                            return None
                        return (url, aresp.status)
                except urllib.error.HTTPError as he:
                    return (url, he.code)
                except Exception as ex:
                    if attempt == 0:
                        import time
                        time.sleep(0.5)
                        continue
                    return (url, f"ERR: {ex}")
            return (url, "UNKNOWN")

        with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
            results = executor.map(verify_single_asset, assets_to_check)
            for res in results:
                if res is not None:
                    page_failures.append(res)

        if page_failures:
            print(f"  ❌ {len(page_failures)} ASSET ROTTI:")
            for fa, err in page_failures:
                print(f"     • [{err}] {fa}")
                all_failures.append((page_url, err, fa))
        else:
            print(f"  ✅ {len(assets_to_check)} asset interni verificati con successo (100% 200 OK).")

    print("\n" + "=" * 75)
    print(f"RIEPILOGO FINALE AUDIT E2E [{mode_label.upper()}] (ART. 8)")
    print(f"Pagine monitorate: {pages_ok}/{total_pages}")
    print(f"Totale asset verificati: {total_assets_checked}")
    print(f"Totale anomalie rilevate: {len(all_failures)}")

    if all_failures:
        print("\nATTENZIONE: L'audit ha rilevato errori bloccanti. Risolvere prima del rilascio:")
        for page, err, asset in all_failures:
            print(f"  - [{err}] su {page} -> {asset}")
        print("=" * 75)
        return False
    else:
        print(f"\nRISULTATO: TUTTI I SITI E ASSET [{mode_label.upper()}] SONO PERFETTAMENTE OPERATIVI (100% OK)!")
        print("=" * 75)
        return True

if __name__ == '__main__':
    args = sys.argv[1:]
    if '--all' in args:
        ok_preview = run_audit(TARGET_PAGES_PREVIEW, "PREVIEW")
        ok_live = run_audit(TARGET_PAGES_LIVE, "LIVE")
        sys.exit(0 if (ok_preview and ok_live) else 1)
    elif '--live' in args:
        ok = run_audit(TARGET_PAGES_LIVE, "LIVE")
        sys.exit(0 if ok else 1)
    else:
        # Predefinito: Canale Preview (Release Candidate)
        ok = run_audit(TARGET_PAGES_PREVIEW, "PREVIEW")
        sys.exit(0 if ok else 1)
