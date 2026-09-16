#!/usr/bin/env python3
"""Generate supabase/seed_prospects.sql from data/master.json.

Idempotent (on conflict do nothing, keyed on external_ref). Contacts are
de-duplicated per prospect on (kind, value) so linking can't violate the
(prospect_id, kind, value) unique constraint. Re-running the seed after a new
region is collected inserts only the new prospects/contacts.
"""

import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
SUPA = BASE.parent / "supabase"
sys.path.insert(0, str(BASE / "scripts"))
from merge_dedupe import lead_priority

PCOLS = ["external_ref", "business_name", "trading_name", "legal_company_name", "category",
         "subcategory", "independent_or_chain", "number_of_locations", "parent_company", "website",
         "address1", "address2", "town", "county", "postcode", "region", "country",
         "companies_house_number", "company_status", "registered_company_name", "incorporation_date",
         "product_categories", "existing_vape_brands", "notes", "data_confidence", "lead_priority",
         "stage", "source_url"]


def q(s):
    if s is None or s == "":
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def norm(p):
    d = re.sub(r"\D", "", p or "")
    if d.startswith("0044"):
        d = "0" + d[4:]
    elif d.startswith("44"):
        d = "0" + d[2:]
    return d


def main():
    recs = json.load(open(BASE / "data" / "master.json"))
    L = ["-- Seed: UK retail prospects (generated from master.json by build_seed.py)",
         "-- Idempotent: keyed on external_ref. Contacts de-duped per prospect on (kind, value).",
         "-- Re-run after collecting a new region to insert only the new rows.",
         "begin;"]
    for r in recs:
        d = norm(r.get("phone")); is_mob = d.startswith("07") and len(d) == 11
        p, _ = lead_priority(r)
        src = (r.get("sources") or [{}])[0].get("url", "")
        v = {c: r.get(c, "") for c in PCOLS}
        v.update({"external_ref": r["record_id"], "trading_name": r.get("trading_name") or r["business_name"],
                  "legal_company_name": r.get("legal_company_name") or r.get("registered_company_name", ""),
                  "county": r.get("county", ""), "region": r.get("region", ""),
                  "country": r.get("country", "England"), "lead_priority": p, "stage": "New", "source_url": src})

        def cell(c):
            val = v.get(c, "")
            if c == "number_of_locations":
                return str(val) if (val and str(val).isdigit()) else "NULL"
            if c == "incorporation_date":
                return q(val) if val else "NULL"
            return q(val)
        L.append(f"insert into public.prospects ({', '.join(PCOLS)}) values "
                 f"({', '.join(cell(c) for c in PCOLS)}) on conflict (external_ref) do nothing;")
        seen, contacts = set(), []
        for kind, val_, label in [("phone", r.get("phone"), "mobile" if is_mob else "landline"),
                                  ("email", r.get("sales_email"), "sales"),
                                  ("email", r.get("purchasing_email"), "purchasing"),
                                  ("email", r.get("email"), "general"),
                                  ("facebook", r.get("facebook"), "facebook"),
                                  ("instagram", r.get("instagram"), "instagram")]:
            if not val_:
                continue
            key = (kind, val_.strip().lower())
            if key in seen:
                continue
            seen.add(key); contacts.append((kind, label, val_))
        for kind, label, val_ in contacts:
            L.append(f"insert into public.prospect_contacts (prospect_ref, kind, label, value) values "
                     f"({q(r['record_id'])}, {q(kind)}, {q(label)}, {q(val_)}) on conflict do nothing;")
    L += ["select public.link_prospect_contacts();", "commit;"]
    SUPA.mkdir(exist_ok=True)
    open(SUPA / "seed_prospects.sql", "w").write("\n".join(L) + "\n")
    print(f"Wrote supabase/seed_prospects.sql ({len(recs)} prospects)")


if __name__ == "__main__":
    main()
