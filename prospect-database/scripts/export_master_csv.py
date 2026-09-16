#!/usr/bin/env python3
"""Regenerate output/master.csv from data/master.json.

Used after an enrichment patch edits master.json in place, so we refresh the
flat CSV (and therefore the workbook, which reads it) WITHOUT re-running
merge_dedupe.py — re-running dedupe would rebuild master.json from the raw
batches and discard enrichment.
"""

import csv
import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / "scripts"))
from merge_dedupe import MASTER_COLUMNS, to_row  # same row shape as the pipeline


def main():
    recs = json.load(open(BASE / "data" / "master.json"))
    rows = [to_row(r, r["record_id"], r["location_id"]) for r in recs]
    with open(BASE / "output" / "master.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=MASTER_COLUMNS)
        w.writeheader()
        w.writerows(rows)
    print(f"Regenerated output/master.csv from master.json ({len(rows)} rows)")


if __name__ == "__main__":
    main()
