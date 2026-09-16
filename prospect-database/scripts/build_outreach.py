#!/usr/bin/env python3
"""Build output/outreach_plan.csv from data/master.json.

An action list for sales: every prospect with a usable direct contact channel,
ordered WhatsApp (UK mobile) first, then email, then landline. Each row keeps
all channels it has, plus a wa.me click-to-chat link for mobiles.
"""

import csv
import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / "scripts"))
from merge_dedupe import lead_priority  # reuse the factual priority logic

PW = {"High": 0, "Medium": 1, "Low": 2, "Unclassified": 3}


def norm(p):
    d = re.sub(r"\D", "", p or "")
    if d.startswith("0044"):
        d = "0" + d[4:]
    elif d.startswith("44"):
        d = "0" + d[2:]
    return d


def main():
    recs = json.load(open(BASE / "data" / "master.json"))
    rows = []
    for r in recs:
        prio, _ = lead_priority(r)
        d = norm(r.get("phone"))
        is_mob = d.startswith("07") and len(d) == 11
        emails = [e for e in [r.get("email"), r.get("sales_email"),
                              r.get("purchasing_email")] if e]
        if is_mob:
            channel, ch = "WhatsApp", 0
        elif emails:
            channel, ch = "Email", 1
        elif r.get("phone"):
            channel, ch = "Phone (landline)", 2
        else:
            continue  # no direct channel — not an outreach target
        rows.append({
            "_ch": ch, "_prio": PW.get(prio, 4),
            "Outreach Channel": channel, "Lead Priority": prio,
            "Business Name": r["business_name"], "Category": r["category"],
            "Town": r.get("town", ""), "Postcode": r.get("postcode", ""),
            "Mobile (WhatsApp)": r.get("phone", "") if is_mob else "",
            "WhatsApp Link": ("https://wa.me/44" + d[1:]) if is_mob else "",
            "Landline": r.get("phone", "") if (r.get("phone") and not is_mob) else "",
            "Email": emails[0] if emails else "",
            "Other Emails": "; ".join(emails[1:]) if len(emails) > 1 else "",
            "Website": r.get("website", ""),
            "Data Confidence": r.get("data_confidence", "Low"),
            "Notes": (r.get("notes", "") or "")[:200],
            "Record ID": r["record_id"],
        })
    rows.sort(key=lambda x: (x["_ch"], x["_prio"], x["Business Name"]))
    cols = ["Outreach Channel", "Lead Priority", "Business Name", "Category", "Town",
            "Postcode", "Mobile (WhatsApp)", "WhatsApp Link", "Landline", "Email",
            "Other Emails", "Website", "Data Confidence", "Notes", "Record ID"]
    out = BASE / "output" / "outreach_plan.csv"
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    from collections import Counter
    c = Counter(x["Outreach Channel"] for x in rows)
    print(f"Wrote {out} — {len(rows)} contactable prospects "
          f"(WhatsApp {c.get('WhatsApp',0)}, Email {c.get('Email',0)}, "
          f"Landline {c.get('Phone (landline)',0)})")


if __name__ == "__main__":
    main()
