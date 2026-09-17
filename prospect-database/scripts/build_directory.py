#!/usr/bin/env python3
"""Regenerate output/prospects_directory.html from data/master.json.

The directory is a single self-contained page: a JSON payload in
<script id="data"> plus the render/filter JS. This script keeps the existing
CSS/JS design intact and refreshes only (a) the embedded data payload and
(b) the header/footer labels, so the browsable directory always matches the
current master dataset (UK-wide) rather than the original pilot.
"""

import datetime
import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / "scripts"))
from merge_dedupe import lead_priority


def norm(p):
    d = re.sub(r"\D", "", p or "")
    if d.startswith("0044"):
        d = "0" + d[4:]
    elif d.startswith("44"):
        d = "0" + d[2:]
    return d


def to_card(r):
    d = norm(r.get("phone"))
    is_mob = d.startswith("07") and len(d) == 11
    prio, reasons = lead_priority(r)
    emails = [e for e in [r.get("email"), r.get("sales_email"),
                          r.get("purchasing_email")] if e]
    addr = ", ".join(a for a in [r.get("address1"), r.get("address2")] if a)
    srcs = r.get("sources") or []
    return {
        "id": r["record_id"], "name": r["business_name"], "cat": r.get("category", ""),
        "sub": r.get("subcategory", ""), "ioc": r.get("independent_or_chain", ""),
        "parent": r.get("parent_company", ""), "town": r.get("town", ""),
        "pc": r.get("postcode", ""), "addr": addr, "county": r.get("county", ""),
        "region": r.get("region", ""), "phone": r.get("phone", ""),
        "phst": r.get("phone_status", ""), "mobile": is_mob,
        "wa": ("https://wa.me/44" + d[1:]) if is_mob else "",
        "emails": emails, "emst": r.get("email_status", ""),
        "web": r.get("website", ""), "fb": r.get("facebook", ""),
        "ig": r.get("instagram", ""), "contact": r.get("contact_name", ""),
        "cpos": r.get("contact_position", ""), "ch": r.get("companies_house_number", ""),
        "chname": r.get("registered_company_name", ""), "chstatus": r.get("company_status", ""),
        "conf": r.get("data_confidence", "Low"), "prio": prio, "reasons": reasons,
        "notes": r.get("notes", ""), "prods": r.get("product_categories", ""),
        "nsrc": len(srcs), "src": (srcs[0].get("url", "") if srcs else ""),
    }


def main():
    recs = json.load(open(BASE / "data" / "master.json"))
    cards = [to_card(r) for r in recs]
    payload = json.dumps(cards, ensure_ascii=False)

    html_path = BASE / "output" / "prospects_directory.html"
    html = html_path.read_text(encoding="utf-8")

    # 1) swap the embedded data payload
    html = re.sub(
        r'(<script id="data" type="application/json">).*?(</script>)',
        lambda m: m.group(1) + payload + m.group(2),
        html, count=1, flags=re.DOTALL)

    # 2) header labels: pilot -> UK-wide
    regions = sorted({c["region"] for c in cards if c["region"]})
    html = re.sub(r'<span class="sub">[^<]*</span>',
                  '<span class="sub">UK-wide · B2B retail prospecting</span>', html, count=1)
    html = re.sub(r'<span class="badge-region">[^<]*</span>',
                  f'<span class="badge-region">United Kingdom · {len(regions)} regions</span>', html, count=1)

    # 3) footer count + date
    today = datetime.date.today().isoformat()
    contactable = sum(1 for c in cards if c["mobile"] or c["emails"] or c["phone"])
    html = re.sub(
        r'(<footer><div class="wrap">\s*<span>).*?(</span>)',
        lambda m: (m.group(1) + f"{len(cards)} unique prospects across the UK · "
                   f"{contactable} contactable · sources recorded per record · "
                   f"data current {today}. Contact details are from public sources; "
                   f"verify before B2B outreach (see notes &amp; confidence)." + m.group(2)),
        html, count=1, flags=re.DOTALL)

    html_path.write_text(html, encoding="utf-8")
    print(f"Wrote {html_path} — {len(cards)} prospects, {contactable} contactable, {len(regions)} regions")


if __name__ == "__main__":
    main()
