#!/usr/bin/env python3
"""Apply an enrichment patch to data/master.json.

Patch: JSON array of objects keyed by record_id, carrying only newly found
public contact fields plus a source. Rules mirror the collection schema:
- never overwrite an existing non-empty value (fill blanks only)
- if the patch conflicts with an existing non-empty value, keep the original,
  record the conflict in notes, and flag the record for review
- always append the source; set the relevant *_checked flag
- never write an email/phone the patch didn't actually provide

Usage: python3 merge_enrichment.py <patch.json>
Then re-run merge is NOT needed (master is edited in place); regenerate outputs
with build_workbook.py / build_outreach.py / the directory build.
"""

import json
import re
import sys
from datetime import date
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
TODAY = date.today().isoformat()

FILL = ["email", "sales_email", "purchasing_email", "phone", "postcode",
        "address1", "facebook", "instagram", "other_social", "contact_name",
        "contact_position", "contact_source", "companies_house_number"]


def norm(s):
    return re.sub(r"\s+", "", (s or "").lower())


def main(patch_path):
    master = json.load(open(BASE / "data" / "master.json"))
    by_id = {r["record_id"]: r for r in master}
    patch = json.load(open(patch_path))
    filled = conflicts = added_src = 0
    for p in patch:
        rec = by_id.get(p.get("record_id"))
        if not rec:
            print(f"WARN: unknown record_id {p.get('record_id')!r}", file=sys.stderr)
            continue
        touched = []
        for f in FILL:
            nv = (p.get(f) or "").strip()
            if not nv:
                continue
            cur = (rec.get(f) or "").strip()
            if not cur:
                rec[f] = nv
                filled += 1
                touched.append(f)
            elif norm(cur) != norm(nv):
                rec["notes"] = ((rec.get("notes") or "") + " | " if rec.get("notes") else "") + \
                    f"ENRICH CONFLICT {f}: kept '{cur}', search found '{nv}'"
                rec["duplicate_review"] = "Duplicate Review Required"
                conflicts += 1
        # email/phone status + checked flags when we filled them
        if any(t in ("email", "sales_email", "purchasing_email") for t in touched):
            if not rec.get("email_status") or rec.get("email_status") == "Not Found":
                rec["email_status"] = "Publicly Listed"
            rec["email_checked"] = True
        if "phone" in touched and (not rec.get("phone_status") or rec.get("phone_status") == "Not Found"):
            rec["phone_status"] = p.get("phone_status") or "Verified directory"
        # source
        url = (p.get("source_url") or "").strip()
        if url and touched:
            srcs = rec.setdefault("sources", [])
            if url not in {s.get("url") for s in srcs}:
                srcs.append({"url": url, "type": p.get("source_type", "Directory"),
                             "date": TODAY, "info_obtained": p.get("info_obtained", ", ".join(touched))})
                added_src += 1
        if touched:
            rec["website_checked"] = rec.get("website_checked") or bool(p.get("website_checked"))
            # bump confidence one notch if we corroborated with a new source
            if url and rec.get("data_confidence") == "Low":
                rec["data_confidence"] = "Medium"
    json.dump(master, open(BASE / "data" / "master.json", "w"), indent=1, ensure_ascii=False)
    print(f"Applied patch: {filled} fields filled, {conflicts} conflicts flagged, {added_src} sources added")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: merge_enrichment.py <patch.json>")
    main(sys.argv[1])
