#!/usr/bin/env python3
"""
Esecutore Master della Suite di Collaudo Ecosistema Prof. Memmo
Esegue tutti i collaudi Playwright dei 7 titoli didattici ufficiali:
1. HistoryGram
2. FantaLetteratura
3. La Rotta degli Eroi
4. L'Oratore
5. La Corte della Commedia
6. Palestra di Riflessione
7. La Ruota Geografica
"""

import os
import sys
import time
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SIMULATIONS = [
    ("HistoryGram", os.path.join(SCRIPT_DIR, "simula_historygram.py")),
    ("FantaLetteratura", os.path.join(SCRIPT_DIR, "simula_fantaletteratura.py")),
    ("La Rotta degli Eroi", os.path.join(SCRIPT_DIR, "simula_rotta_degli_eroi.py")),
    ("L'Oratore", os.path.join(SCRIPT_DIR, "simula_oratore.py")),
    ("La Corte della Commedia", os.path.join(SCRIPT_DIR, "simula_corte_commedia.py")),
    ("Palestra di Riflessione", os.path.join(SCRIPT_DIR, "simula_palestra.py")),
    ("La Ruota Geografica", os.path.join(SCRIPT_DIR, "simula_ruota_geografica.py")),
    ("OPS! - Storia", os.path.join(SCRIPT_DIR, "simula_ops_storia.py")),
]

def main():
    print("=" * 80)
    print("   SUITE DI COLLAUDO END-TO-END - ECOSISTEMA PROF. MEMMO")
    print("   Verifica Figure: Docente LIM, Studente Mobile, Viandante Tablet & Paywall")
    print("=" * 80)
    print(f"Data/Ora Inizio: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Totale Titoli in Verifica: {len(SIMULATIONS)}\n")

    results = []
    total_start = time.time()

    for idx, (title, script_path) in enumerate(SIMULATIONS, 1):
        if not os.path.exists(script_path):
            print(f"[{idx}/{len(SIMULATIONS)}] ❌ {title}: Script non trovato ({script_path})")
            results.append((title, False, 0.0, "Script mancante"))
            continue

        print(f"[{idx}/{len(SIMULATIONS)}] 🚀 Avvio simulazione per: {title} ...")
        t0 = time.time()
        res = subprocess.run([sys.executable, script_path], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        elapsed = round(time.time() - t0, 1)

        if res.returncode == 0:
            print(f"      ✅ {title} SUPERATO ({elapsed}s)")
            results.append((title, True, elapsed, "OK"))
        else:
            print(f"      ❌ {title} FALLITO ({elapsed}s)")
            # Mostra ultime 10 righe di output
            lines = res.stdout.strip().split("\n")
            tail = "\n".join(lines[-10:]) if len(lines) > 10 else "\n".join(lines)
            print(f"         Dettagli errore:\n{tail}\n")
            results.append((title, False, elapsed, "Errore"))

    total_elapsed = round(time.time() - total_start, 1)

    print("\n" + "=" * 80)
    print("   REPORT FINALE COLLAUDI ECOSISTEMA PROF. MEMMO")
    print("=" * 80)
    all_passed = True
    for title, passed, elapsed, status in results:
        sym = "✅ PASS" if passed else "❌ FAIL"
        if not passed:
            all_passed = False
        print(f" - {title:<30} {sym} ({elapsed}s)")

    print("-" * 80)
    print(f"Tempo Totale Esecuzione: {total_elapsed}s")
    if all_passed:
        print("🎉 TUTTI I COLLAUDI SONO STATI SUPERATI CON SUCCESSO SENZA ERRORI!")
        sys.exit(0)
    else:
        print("⚠️ ALCUNI COLLAUDI HANNO RISCONTRATO ERRORI.")
        sys.exit(1)

if __name__ == '__main__':
    main()

