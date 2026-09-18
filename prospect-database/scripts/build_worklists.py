#!/usr/bin/env python3
"""Generate ready-to-hand sales worklists from data/master.json.

Outputs into output/worklists/:
  1. worklist_whatsapp.csv     — every WhatsApp-reachable prospect (UK mobile),
                                 vape-shops first. Fastest-ROI channel.
  2. worklist_key_accounts.csv — the multi-site brands aggregated (one row per
                                 parent company), largest first. Land-and-expand.
  3. worklist_landline_routes.csv — landline-only prospects, ordered
                                 region -> category -> town for rep day-routes.
  4. worklist_email.csv        — prospects with a genuinely published email.

Every list is derived from the same durable master, so re-running after any
data change keeps them in sync.
"""

import csv
import json
import re
from collections import defaultdict
from pathlib import Path
import sys

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / "scripts"))
from merge_dedupe import lead_priority

OUT = BASE / "output" / "worklists"
PW = {"High": 0, "Medium": 1, "Low": 2, "Unclassified": 3}
# core categories first (ARKHAM's best fit), then the rest
CATW = {c: i for i, c in enumerate([
    "Vape Shop", "Smoke / Shisha Shop", "Tobacco Specialist", "Off-Licence",
    "Convenience Store", "Independent Supermarket", "Newsagent",
    "Petrol Station / Forecourt", "Cash & Carry", "Other Relevant Retail"])}


def norm(p):
    d = re.sub(r"\D", "", p or "")
    if d.startswith("0044"):
        d = "0" + d[4:]
    elif d.startswith("44"):
        d = "0" + d[2:]
    return d


def is_mob(r):
    d = norm(r.get("phone"))
    return d.startswith("07") and len(d) == 11


def emails(r):
    return [e for e in [r.get("email"), r.get("sales_email"), r.get("purchasing_email")] if e]


def write_csv(path, cols, rows):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    recs = json.load(open(BASE / "data" / "master.json"))
    for r in recs:
        r["_prio"], r["_reasons"] = lead_priority(r)

    # 1) WhatsApp -----------------------------------------------------------
    wa = [r for r in recs if is_mob(r)]
    wa.sort(key=lambda r: (CATW.get(r.get("category"), 9), PW.get(r["_prio"], 3), r["business_name"]))
    write_csv(OUT / "worklist_whatsapp.csv",
              ["Priority", "Business Name", "Category", "Town", "County", "Region",
               "Mobile", "WhatsApp Link", "Website", "Data Confidence", "Notes", "Record ID"],
              [{"Priority": r["_prio"], "Business Name": r["business_name"], "Category": r.get("category", ""),
                "Town": r.get("town", ""), "County": r.get("county", ""), "Region": r.get("region", ""),
                "Mobile": r.get("phone", ""), "WhatsApp Link": "https://wa.me/44" + norm(r["phone"])[1:],
                "Website": r.get("website", ""), "Data Confidence": r.get("data_confidence", "Low"),
                "Notes": (r.get("notes", "") or "")[:160], "Record ID": r["record_id"]} for r in wa])

    # 2) Key accounts (multi-site brands) ----------------------------------
    brands = defaultdict(list)
    for r in recs:
        p = (r.get("parent_company") or "").strip()
        if p:
            brands[p].append(r)
    ka = []
    for p, rs in brands.items():
        if len(rs) < 2:
            continue  # a "key account" needs >1 location
        cats = sorted({x.get("category", "") for x in rs if x.get("category")})
        regs = sorted({x.get("region", "") for x in rs if x.get("region")})
        towns = sorted({x.get("town", "") for x in rs if x.get("town")})
        em = next((e for x in rs for e in emails(x)), "")
        ph = next((x.get("phone") for x in rs if x.get("phone")), "")
        web = next((x.get("website") for x in rs if x.get("website")), "")
        ioc = next((x.get("independent_or_chain") for x in rs if x.get("independent_or_chain")), "")
        ka.append({"Parent Company": p, "Locations in DB": len(rs), "Type": ioc,
                   "Categories": "; ".join(cats), "Regions": "; ".join(regs),
                   "Sample Towns": "; ".join(towns[:6]) + ("…" if len(towns) > 6 else ""),
                   "Entry Email": em, "Entry Phone": ph, "Website": web})
    ka.sort(key=lambda x: (-x["Locations in DB"], x["Parent Company"]))
    write_csv(OUT / "worklist_key_accounts.csv",
              ["Parent Company", "Locations in DB", "Type", "Categories", "Regions",
               "Sample Towns", "Entry Email", "Entry Phone", "Website"], ka)

    # 3) Landline routes (landline-only) -----------------------------------
    land = [r for r in recs if r.get("phone") and not is_mob(r) and not emails(r)]
    land.sort(key=lambda r: (r.get("region", ""), CATW.get(r.get("category"), 9),
                             r.get("town", ""), r["business_name"]))
    write_csv(OUT / "worklist_landline_routes.csv",
              ["Region", "Category", "Priority", "Business Name", "Town", "County",
               "Postcode", "Landline", "Website", "Data Confidence", "Record ID"],
              [{"Region": r.get("region", ""), "Category": r.get("category", ""), "Priority": r["_prio"],
                "Business Name": r["business_name"], "Town": r.get("town", ""), "County": r.get("county", ""),
                "Postcode": r.get("postcode", ""), "Landline": r.get("phone", ""),
                "Website": r.get("website", ""), "Data Confidence": r.get("data_confidence", "Low"),
                "Record ID": r["record_id"]} for r in land])

    # 3b) Landline split per region (one file per rep patch) ---------------
    region_dir = OUT / "landline_by_region"
    region_dir.mkdir(exist_ok=True)
    land_cols = ["Region", "Category", "Priority", "Business Name", "Town", "County",
                 "Postcode", "Landline", "Website", "Data Confidence", "Record ID"]
    by_region = defaultdict(list)
    for r in land:
        by_region[r.get("region", "") or "Unknown"].append(r)

    def slug(s):
        return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

    region_counts = []
    for region, rs in sorted(by_region.items()):
        rows = [{"Region": r.get("region", ""), "Category": r.get("category", ""), "Priority": r["_prio"],
                 "Business Name": r["business_name"], "Town": r.get("town", ""), "County": r.get("county", ""),
                 "Postcode": r.get("postcode", ""), "Landline": r.get("phone", ""),
                 "Website": r.get("website", ""), "Data Confidence": r.get("data_confidence", "Low"),
                 "Record ID": r["record_id"]} for r in rs]
        write_csv(region_dir / f"landline_{slug(region)}.csv", land_cols, rows)
        region_counts.append((region, len(rs)))

    # 4) Email --------------------------------------------------------------
    eml = [r for r in recs if emails(r)]
    eml.sort(key=lambda r: (CATW.get(r.get("category"), 9), PW.get(r["_prio"], 3), r["business_name"]))
    write_csv(OUT / "worklist_email.csv",
              ["Priority", "Business Name", "Category", "Town", "Region", "Email",
               "Other Emails", "Phone", "Website", "Record ID"],
              [{"Priority": r["_prio"], "Business Name": r["business_name"], "Category": r.get("category", ""),
                "Town": r.get("town", ""), "Region": r.get("region", ""), "Email": emails(r)[0],
                "Other Emails": "; ".join(emails(r)[1:]), "Phone": r.get("phone", ""),
                "Website": r.get("website", ""), "Record ID": r["record_id"]} for r in eml])

    print(f"WhatsApp:      {len(wa)}")
    print(f"Key accounts:  {len(ka)} brands ({sum(x['Locations in DB'] for x in ka)} locations)")
    print(f"Landline:      {len(land)}  (split into {len(region_counts)} per-region files)")
    for region, c in sorted(region_counts, key=lambda x: -x[1]):
        print(f"    {region}: {c}")
    print(f"Email:         {len(eml)}")
    print(f"Wrote worklists to {OUT}")


if __name__ == "__main__":
    main()
