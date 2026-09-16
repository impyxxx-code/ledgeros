#!/usr/bin/env python3
"""Validate raw collection batches against RECORD_SCHEMA.md rules.

Usage: python3 validate_raw.py [file.json ...]   (default: all raw batches)
Reports — per file — record count, missing/invalid fields, vocabulary
violations, records without any source URL, and suspicious values.
Exit code 1 if any batch has fatal problems (unparseable / no sources).
"""

import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]

CATEGORIES = {
    "Vape Shop", "Convenience Store", "Petrol Station / Forecourt", "Off-Licence",
    "Tobacco Specialist", "Newsagent", "Independent Supermarket", "Smoke / Shisha Shop",
    "Cash & Carry", "Regional Retail Chain", "Multi-Site Independent", "Other Relevant Retail",
}
IOC = {"Independent", "Multi-Site Independent", "Regional Chain", "National Chain",
       "Franchise / Symbol Group", "Unknown", ""}
PHONE_STATUS = {"Verified on official website", "Verified directory", "Google Business",
                "Unverified", "Not Found", ""}
EMAIL_STATUS = {"Verified", "Publicly Listed", "Website Found", "Unverified", "Not Found", ""}
CONFIDENCE = {"High", "Medium", "Low", ""}
UK_POSTCODE = re.compile(r"^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$", re.I)

fatal = False
paths = [Path(p) for p in sys.argv[1:]] or sorted((BASE / "data").glob("regions/*/raw/*.json"))
for path in paths:
    print(f"\n=== {path.name} ===")
    try:
        batch = json.load(open(path))
    except Exception as e:
        print(f"  FATAL: cannot parse JSON: {e}")
        fatal = True
        continue
    if not isinstance(batch, list):
        print("  FATAL: not a JSON array")
        fatal = True
        continue
    issues = {}
    def add(k):
        issues[k] = issues.get(k, 0) + 1
    no_source = 0
    for r in batch:
        if not (r.get("business_name") or "").strip():
            add("missing business_name")
        if r.get("category") not in CATEGORIES:
            add(f"invalid category: {r.get('category')!r}")
        if r.get("independent_or_chain", "") not in IOC:
            add(f"invalid independent_or_chain: {r.get('independent_or_chain')!r}")
        if r.get("phone_status", "") not in PHONE_STATUS:
            add(f"invalid phone_status: {r.get('phone_status')!r}")
        if r.get("email_status", "") not in EMAIL_STATUS:
            add(f"invalid email_status: {r.get('email_status')!r}")
        if r.get("data_confidence", "") not in CONFIDENCE:
            add(f"invalid data_confidence: {r.get('data_confidence')!r}")
        if r.get("email_status") == "Verified":
            add("email_status 'Verified' used (collectors must not)")
        pc = (r.get("postcode") or "").strip()
        if pc and not UK_POSTCODE.match(pc):
            add(f"suspicious postcode: {pc!r}")
        if not (r.get("town") or "").strip():
            add("missing town")
        srcs = [s for s in r.get("sources", []) if (s.get("url") or "").startswith("http")]
        if not srcs:
            no_source += 1
        if (r.get("email") or "") and r.get("email_status") in ("", "Not Found"):
            add("email present but email_status empty/Not Found")
        if (r.get("phone") or "") and r.get("phone_status") in ("", "Not Found"):
            add("phone present but phone_status empty/Not Found")
    n = len(batch)
    with_web = sum(1 for r in batch if r.get("website"))
    with_phone = sum(1 for r in batch if r.get("phone"))
    with_email = sum(1 for r in batch if r.get("email") or r.get("sales_email"))
    with_ch = sum(1 for r in batch if r.get("companies_house_number"))
    print(f"  {n} records | website {with_web} | phone {with_phone} | email {with_email} | CH# {with_ch}")
    if no_source:
        print(f"  FATAL: {no_source} record(s) with no source URL")
        fatal = True
    for k, v in sorted(issues.items()):
        print(f"  WARN x{v}: {k}")
    if not issues and not no_source:
        print("  OK")

sys.exit(1 if fatal else 0)
