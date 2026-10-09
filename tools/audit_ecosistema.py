#!/usr/bin/env python3
"""
Prof. Memmo — Audit E2E di Rete per l'Ecosistema Multidominio
============================================================
Articolo 8 delle Regole Operative di Sicurezza.
Scansiona TUTTI i siti e sottodomini dell'Ecosistema Prof. Memmo, verificando
che ogni risorsa (CSS, JS, immagini, font, video, manifest) risponda con HTTP 200 OK.

Zero-404 Tolerance.
"""

import sys
import urllib.request
import urllib.error
import re
from urllib.parse import urljoin, urlparse

# Elenco Ufficiale Completo e Inderogabile dei Siti dell'Ecosistema (Art. 8)
TARGET_PAGES = [
    ("Hub Gestione & Admin", "https://profmemmo.it"),
    ("Hub Portale Operativo", "https://profmemmo.it/portal.html"),
    ("Sito Vetrina - Home", "https://games.profmemmo.it"),
    ("Sito Vetrina - Giochi", "https://games.profmemmo.it/giochi.html"),
    ("Sito Vetrina - Prezzi", "https://games.profmemmo.it/prezzi.html"),
    ("Sito Vetrina - Profilo", "https://games.profmemmo.it/profilo.html"),
    ("Sito Vetrina - Accedi", "https://games.profmemmo.it/accedi.html"),
    ("FantaLetteratura", "https://fantaletteratura.profmemmo.it"),
    ("Palestra di Riflessione", "https://palestradiriflessione.profmemmo.it"),
    ("La Rotta degli Eroi", "https://larottadeglieroi.profmemmo.it"),
    ("La Corte della Commedia", "https://lacortedellacommedia.profmemmo.it"),
    ("L'Oratore", "https://loratore.profmemmo.it"),
    ("Ops! Storia", "https://opsstoria.profmemmo.it"),
    ("Supplenze App", "https://prof-memmo.github.io/supplenze-app/")
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 ProfMemmoAudit/2.1'
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

def run_audit():
    print("=" * 75)
    print("PROF. MEMMO — AUDIT AUTOMATICO E2E DI RETE (ARTICOLO 8)")
    print("Verifica dell'integrità dei domini e assenza totale di errori 404/500")
    print("=" * 75)

    total_pages = len(TARGET_PAGES)
    pages_ok = 0
    total_assets_checked = 0
    all_failures = []

    for name, page_url in TARGET_PAGES:
        print(f"\n[SCANSIONE] {name}: {page_url}")
        try:
            req = urllib.request.Request(page_url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=12) as resp:
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
        checked_on_page = set()
        page_failures = []

        for raw in found_raw:
            asset_url = clean_asset_url(raw, page_url)
            if not asset_url:
                continue

            parsed = urlparse(asset_url)
            # Controlla solo risorse ospitate sull'ecosistema o CDN interne
            is_internal = ('profmemmo.it' in parsed.netloc or 'prof-memmo.github.io' in parsed.netloc)
            if not is_internal:
                continue

            if asset_url in checked_on_page:
                continue
            checked_on_page.add(asset_url)
            total_assets_checked += 1

            try:
                areq = urllib.request.Request(asset_url, headers=HEADERS)
                with urllib.request.urlopen(areq, timeout=8) as aresp:
                    if aresp.status >= 400:
                        page_failures.append((asset_url, aresp.status))
            except urllib.error.HTTPError as he:
                page_failures.append((asset_url, he.code))
            except Exception as ex:
                page_failures.append((asset_url, f"ERR: {ex}"))

        if page_failures:
            print(f"  ❌ {len(page_failures)} ASSET ROTTI:")
            for fa, err in page_failures:
                print(f"     • [{err}] {fa}")
                all_failures.append((page_url, err, fa))
        else:
            print(f"  ✅ {len(checked_on_page)} asset interni verificati con successo (100% 200 OK).")

    print("\n" + "=" * 75)
    print("RIEPILOGO FINALE AUDIT E2E (ART. 8)")
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
        print("\nRISULTATO: TUTTI I SITI E ASSET SONO PERFETTAMENTE OPERATIVI (100% OK)!")
        print("=" * 75)
        return True

if __name__ == '__main__':
    success = run_audit()
    sys.exit(0 if success else 1)
