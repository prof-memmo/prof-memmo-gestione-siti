#!/usr/bin/env python3
"""
PROF. MEMMO — MASTER RUNNER SIMULAZIONI GAMEPLAY ECOSISTEMA (v1.0)
==================================================================
Conforme alle Regole Operative di Sicurezza (Art. 8, Art. 13, Art. 15).

Orchestratore modulare per le simulazioni realistiche del ciclo di vita dei giochi:
- Esegue simulazioni end-to-end con asserzioni di stato reali nel DOM.
- Supporta esecuzione singola (--game <nome>) o globale (--all).
- Supporta porte personalizzate ed esportazione report.

Uso:
    python3 tools/simula_ecosistema_gameplay.py --all
    python3 tools/simula_ecosistema_gameplay.py --game historygram
    python3 tools/simula_ecosistema_gameplay.py --game fantaletteratura
"""

import sys
import os
import argparse
import time

# Aggiungi cartella simulazioni al PYTHONPATH
SIM_DIR = os.path.join(os.path.dirname(__file__), "simulazioni")
if SIM_DIR not in sys.path:
    sys.path.insert(0, SIM_DIR)

AVAILABLE_GAMES = {
    "historygram": {
        "module": "simula_historygram",
        "name": "HistoryGram (Social Didattico)"
    },
    "fantaletteratura": {
        "module": "simula_fantaletteratura",
        "name": "FantaLetteratura (Lega Letteraria)"
    }
}

def main():
    parser = argparse.ArgumentParser(description="Master Runner Simulazioni Gameplay Ecosistema Prof. Memmo")
    parser.add_argument("--all", action="store_true", help="Esegui tutte le simulazioni disponibili")
    parser.add_argument("--game", type=str, choices=list(AVAILABLE_GAMES.keys()), help="Esegui la simulazione per un gioco specifico")
    parser.add_argument("--headed", action="store_true", help="Mostra il browser durante l'esecuzione")
    parser.add_argument("--artifacts", type=str, default=None, help="Directory per salvare screenshot di evidenza")
    args = parser.parse_args()

    target_games = []
    if args.game:
        target_games = [args.game]
    else:
        target_games = list(AVAILABLE_GAMES.keys())

    print("\n" + "="*70)
    print("MASTER SUITE SIMULAZIONI GAMEPLAY — ECOSISTEMA PROF. MEMMO")
    print(f"Target: {len(target_games)} simulazioni ({', '.join(target_games)})")
    print("="*70)

    summary = []
    total_start = time.time()

    for g_key in target_games:
        cfg = AVAILABLE_GAMES[g_key]
        print(f"\n>>> AVVIO SIMULAZIONE: {cfg['name']} [{g_key}]")
        g_start = time.time()
        try:
            mod = __import__(cfg["module"])
            result = mod.run_simulation(artifacts_dir=args.artifacts, headless=not args.headed)
            duration = round(time.time() - g_start, 2)
            summary.append({
                "game": g_key,
                "name": cfg["name"],
                "status": "PASS",
                "duration": f"{duration}s",
                "details": result
            })
        except Exception as e:
            duration = round(time.time() - g_start, 2)
            summary.append({
                "game": g_key,
                "name": cfg["name"],
                "status": "FAIL",
                "duration": f"{duration}s",
                "error": str(e)
            })
            print(f"  [ERRORE] Simulazione {g_key} fallita: {e}")

    total_duration = round(time.time() - total_start, 2)

    print("\n" + "="*70)
    print("RIEPILOGO FINALE SIMULAZIONI GAMEPLAY ECOSISTEMA")
    print("="*70)
    all_ok = True
    for item in summary:
        status_badge = "✅ PASS" if item["status"] == "PASS" else "❌ FAIL"
        if item["status"] != "PASS":
            all_ok = False
        print(f"• {status_badge} | {item['name']:<35} | {item['duration']:<6} | {item.get('details', item.get('error'))}")
    print("="*70)
    print(f"Tempo totale: {total_duration}s — Esito complessivo: {'SUCCESSO (100% PASS)' if all_ok else 'ATTENZIONE: ERRORI RILEVATI'}")
    print("="*70 + "\n")

    if not all_ok:
        sys.exit(1)

if __name__ == "__main__":
    main()

