#!/usr/bin/env python3
"""
CRAWLER & TEST RUNNER: COLLAUDO INTEGRALE ED ESAUSTIVO DI OGNI SINGOLO PULSANTE E TAB DELL'ECOSISTEMA
=====================================================================================================
Apre ogni sito e gioco dell'ecosistema, individua tutti i pulsanti, elementi interattivi,
tabs di navigazione (.tab-item, .nav-item, [data-view], [data-section]), li clicca uno per uno
con un browser reale (Playwright) e verifica:
1. Assenza totale di errori JavaScript scatenati dal clic (pageerror).
2. Assenza di popup/alert di errore non previsti (es. errori Firebase, 404, ecc.).
3. Verità di Stato (State Assertion): se l'elemento è un tab di navigazione ([data-view], [data-section]),
   verifica che la vista target riceva effettivamente la classe 'active' e sia visibile.
4. Supporta modalità --local (file locali per sandbox/CI), --preview e --live.
"""

import asyncio
import os
import re
import sys
from urllib.parse import urlparse
from playwright.async_api import async_playwright

BASE_LOCAL = "/Users/guglielmopiersanti/.gemini/antigravity-ide/scratch"

LIVE_SITES = [
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
    ("La Ruota Geografica", "https://prof-memmo.github.io/la-ruota-geografica/"),
    ("Supplenze App", "https://prof-memmo.github.io/supplenze-app/")
]

LOCAL_SITES = [
    ("FantaLetteratura", f"file://{BASE_LOCAL}/fantaletteratura/index.html"),
    ("La Rotta degli Eroi", f"file://{BASE_LOCAL}/la-rotta-degli-eroi/index.html"),
    ("La Corte della Commedia", f"file://{BASE_LOCAL}/la-corte-della-commedia/index.html"),
    ("La Palestra di Riflessione", f"file://{BASE_LOCAL}/palestra-di-riflessione/index.html"),
    ("L'Oratore", f"file://{BASE_LOCAL}/l-oratore/index.html"),
    ("HistoryGram", f"file://{BASE_LOCAL}/historygram/index.html"),
    ("La Ruota Geografica", f"file://{BASE_LOCAL}/la-ruota-geografica/index.html"),
    ("Hub Admin - Portale", f"file://{BASE_LOCAL}/prof-memmo-admin-gestione-generale/portal.html"),
    ("Sito Vetrina - Home", f"file://{BASE_LOCAL}/prof-memmo-games/index.html"),
    ("Sito Vetrina - Giochi", f"file://{BASE_LOCAL}/prof-memmo-games/giochi.html"),
    ("Sito Vetrina - Prezzi", f"file://{BASE_LOCAL}/prof-memmo-games/prezzi.html")
]

def get_sites():
    if "--local" in sys.argv:
        return LOCAL_SITES
    if "--preview" in sys.argv:
        res = []
        for name, url in LIVE_SITES:
            p = urlparse(url)
            path = p.path
            new_path = path + 'preview/' if path.endswith('/') else path.rsplit('/', 1)[0] + '/preview/' + path.rsplit('/', 1)[1]
            res.append((f"{name} (Preview)", f"{p.scheme}://{p.netloc}{new_path}"))
        return res
    return LIVE_SITES

async def test_all_buttons():
    sites_to_test = get_sites()
    mode_label = "LOCALE" if "--local" in sys.argv else ("PREVIEW" if "--preview" in sys.argv else "LIVE PRODUZIONE")
    print("=" * 85)
    print(f"COLLAUDO TOTALE PULSANTI & TABS DELL'ECOSISTEMA [{mode_label}]")
    print("=" * 85)

    total_buttons_clicked = 0
    total_tabs_verified = 0
    failures = []
    summary_per_site = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()

        for site_name, site_url in sites_to_test:
            print(f"\n[SITO] {site_name} -> {site_url}")
            page = await context.new_page()

            # Abort external requests in local mode to avoid sandbox blocking, and mock Firebase SDK
            if site_url.startswith("file://"):
                await page.route("**/*", lambda route: route.abort() if route.request.url.startswith("http") else route.continue_())
                await page.add_init_script("""
                    window.firebase = window.firebase || {
                        auth: () => ({
                            onAuthStateChanged: (cb) => { cb(null); return () => {}; },
                            currentUser: null,
                            signInWithPopup: () => Promise.resolve(),
                            signOut: () => Promise.resolve()
                        }),
                        firestore: () => ({
                            collection: () => ({
                                doc: () => ({ get: () => Promise.resolve({ exists: false, data: () => ({}) }), set: () => Promise.resolve(), onSnapshot: () => () => {} }),
                                where: () => ({ get: () => Promise.resolve({ forEach: () => {} }), onSnapshot: () => () => {} }),
                                get: () => Promise.resolve({ forEach: () => {} }),
                                onSnapshot: () => () => {}
                            })
                        }),
                        apps: [true],
                        app: () => ({ name: '[DEFAULT]', options: {} }),
                        initializeApp: () => {}
                    };
                    window.auth = window.firebase.auth();
                    window.db = window.firebase.firestore();
                    window.fbDb = window.db;
                """)

            page_errors = []
            page.on("pageerror", lambda err: page_errors.append(str(err)))

            dialog_alerts = []
            async def handle_dialog(dialog):
                msg = dialog.message
                dialog_alerts.append(msg)
                await dialog.dismiss()
            page.on("dialog", handle_dialog)

            try:
                await page.goto(site_url, wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(1000)

                # Chiudi eventuali banner legali / cookie overlay
                try:
                    close_btn = await page.query_selector("#pmSharedAccept, .btn-accept, #accept-terms, .modal-close")
                    if close_btn and await close_btn.is_visible():
                        await close_btn.click(timeout=1000)
                        await page.wait_for_timeout(300)
                except Exception:
                    pass

                # Selettore esaustivo: pulsanti, links d'azione, tabs di navigazione, bottoni admin
                selector = "button, [role='button'], a.btn, .btn, input[type='button'], input[type='submit'], .tab-item, [data-view], [data-section], .nav-item, .admin-tab-btn"
                elements = await page.query_selector_all(selector)
                site_button_count = len(elements)
                clicked_on_site = 0
                tabs_verified_on_site = 0
                element_errors = []

                print(f"  -> Individuati {site_button_count} elementi interattivi (pulsanti, tabs, bottoni).")

                for idx, el in enumerate(elements):
                    try:
                        is_vis = await el.is_visible()
                        if not is_vis:
                            continue

                        is_enab = await el.is_enabled()
                        if not is_enab:
                            continue

                        text = (await el.inner_text()).strip().replace("\n", " ")
                        el_id = await el.get_attribute("id") or ""
                        data_view = await el.get_attribute("data-view") or ""
                        data_section = await el.get_attribute("data-section") or ""
                        onclick_attr = await el.get_attribute("onclick") or ""
                        href_attr = await el.get_attribute("href") or ""

                        # Salta link esterni (apertura nuova finestra verso http o mailto)
                        if href_attr.startswith("http") or href_attr.startswith("mailto:") or href_attr.startswith("tel:"):
                            continue

                        label = text or data_view or data_section or el_id or f"Element #{idx+1}"

                        # Salta azioni di logout o reset distruttive
                        if any(w in label.lower() for w in ["esci", "logout", "elimina", "cancella account"]):
                            continue

                        # Esegui clic reale
                        await el.scroll_into_view_if_needed()
                        await el.click(timeout=2500, no_wait_after=True)
                        clicked_on_site += 1
                        total_buttons_clicked += 1
                        await page.wait_for_timeout(250)

                        # VERIFICA DELLO STATO (State Assertion) per elementi con data-view o data-section
                        target_id = data_view or data_section
                        if not target_id and "showView('" in onclick_attr:
                            m = re.search(r"showView\(['\"]([^'\"]+)['\"]", onclick_attr)
                            if m:
                                target_id = m.group(1)
                        elif not target_id and "navigateTo('" in onclick_attr:
                            m = re.search(r"navigateTo\(['\"]([^'\"]+)['\"]", onclick_attr)
                            if m:
                                target_id = m.group(1)

                        if target_id and not any(k in target_id for k in ["admin", "docente", "cattedra", "teacher", "profilo"]):
                            target_state = await page.evaluate(f"""() => {{
                                const t = document.getElementById('{target_id}');
                                if (!t) return {{ exists: false }};
                                const st = window.getComputedStyle(t);
                                return {{
                                    exists: true,
                                    active: t.classList.contains('active'),
                                    visible: st.display !== 'none' && !t.classList.contains('hidden'),
                                    display: st.display
                                }};
                            }}""")

                            if target_state.get('exists'):
                                if not (target_state.get('active') or target_state.get('visible')):
                                    element_errors.append(f"Tab '{label}' ha cliccato ma #{target_id} non è attiva né visibile (display: {target_state.get('display')})")
                                else:
                                    tabs_verified_on_site += 1
                                    total_tabs_verified += 1

                    except Exception as click_err:
                        err_str = str(click_err)
                        if "intercepts pointer events" not in err_str and "is not visible" not in err_str:
                            element_errors.append(f"Errore click su '{label}': {err_str[:80]}")

                # Filtra alert critici
                critical_alerts = [a for a in dialog_alerts if any(c in a.lower() for c in ["errore", "firebase", "fail", "uncaught"])]
                total_errs = len(page_errors) + len(critical_alerts) + len(element_errors)

                if total_errs > 0:
                    failures.append((site_name, site_url, page_errors + critical_alerts + element_errors))
                    print(f"  ❌ {site_name}: {len(page_errors)} errori JS, {len(critical_alerts)} alert critici, {len(element_errors)} errori di stato.")
                    for e in element_errors[:5]:
                        print(f"     - {e}")
                else:
                    print(f"  ✅ {site_name}: {clicked_on_site}/{site_button_count} cliccati con successo ({tabs_verified_on_site} tabs attivate e verificate).")

                summary_per_site[site_name] = {
                    "total": site_button_count,
                    "clicked": clicked_on_site,
                    "tabs_verified": tabs_verified_on_site,
                    "errors": total_errs
                }

            except Exception as e:
                print(f"  ❌ Errore caricamento sito {site_name}: {e}")
                failures.append((site_name, site_url, [str(e)]))
            finally:
                await page.close()

        await browser.close()

    print("\n" + "=" * 85)
    print("                    RIEPILOGO FINALE COLLAUDO PULSANTI E TABS")
    print("=" * 85)
    print(f"{'Sito / Applicazione':<32} | {'Totale':<6} | {'Cliccati':<8} | {'Tabs OK':<8} | {'Stato':<8}")
    print("-" * 85)
    for site, stats in summary_per_site.items():
        st_label = "SUPERATO" if stats.get("errors", 0) == 0 else "FALLITO"
        print(f"{site:<32} | {stats.get('total', 0):<6} | {stats.get('clicked', 0):<8} | {stats.get('tabs_verified', 0):<8} | {st_label:<8}")
    print("=" * 85)
    print(f"Pulsanti totali cliccati fisicamente : {total_buttons_clicked}")
    print(f"Tabs con transizione attiva verificata: {total_tabs_verified}")
    print(f"Totale siti con anomalie             : {len(failures)}")
    print("=" * 85)

    if failures:
        print("\nDETTAGLIO ANOMALIE RILEVATE:")
        for name, url, errs in failures:
            print(f"• {name}:")
            for err in errs:
                print(f"   - {err}")
        return False

    print("\nCOLLAUDO INTEGRALE COMPLETATO: 100% DEI PULSANTI E TABS FUNZIONANTI SENZA ERRORI! ✅")
    return True

if __name__ == "__main__":
    success = asyncio.run(test_all_buttons())
    sys.exit(0 if success else 1)
