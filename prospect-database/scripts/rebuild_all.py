#!/usr/bin/env python3
"""One command to rebuild every artifact after collecting a new region.

Order matters:
  1. merge_dedupe   — rebuild master.json from all raw batches (stable Record IDs)
  2. merge_enrichment — re-apply every enrichment patch (merge_dedupe rebuilds from
                        raw, so enrichment applied to master.json must be re-applied)
  3. export_master_csv, build_workbook, build_outreach, build_seed

Run from anywhere: python3 scripts/rebuild_all.py
"""

import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
SCRIPTS = BASE / "scripts"


def run(mod, *args):
    print(f"\n=== {mod} {' '.join(args)} ===")
    r = subprocess.run([sys.executable, str(SCRIPTS / mod), *args], cwd=str(BASE))
    if r.returncode != 0:
        sys.exit(f"{mod} failed")


def main():
    run("merge_dedupe.py")
    for patch in sorted((BASE / "data" / "regions").glob("*/enrichment_patch.json")):
        run("merge_enrichment.py", str(patch))
    run("export_master_csv.py")
    run("build_workbook.py")
    run("build_outreach.py")
    run("build_seed.py")
    print("\nAll artifacts rebuilt.")


if __name__ == "__main__":
    main()
