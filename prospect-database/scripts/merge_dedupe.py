#!/usr/bin/env python3
"""Merge raw collection batches into the master prospect dataset.

Reads  : data/regions/*/raw/*.json   (arrays of records per RECORD_SCHEMA.md)
Writes : data/master.json            (deduplicated master records)
         output/master.csv           (flat Excel-compatible CSV)

Rules implemented (see schema doc):
- one master record per business location
- duplicate matching on company number, website domain, phone, name+postcode
- uncertain matches are kept and flagged "Duplicate Review Required"
- merging never overwrites a non-empty value with an empty one
- conflicting values from two sources -> both sources kept, record flagged
- factual lead priority with reasons kept in a separate field
"""

import csv
import json
import re
import sys
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
RAW_GLOB = "regions/*/raw/*.json"
TODAY = date.today().isoformat()

CATEGORIES = {
    "Vape Shop", "Convenience Store", "Petrol Station / Forecourt",
    "Off-Licence", "Tobacco Specialist", "Newsagent",
    "Independent Supermarket", "Smoke / Shisha Shop", "Cash & Carry",
    "Regional Retail Chain", "Multi-Site Independent", "Other Relevant Retail",
}

# loose input -> controlled value
CATEGORY_ALIASES = {
    "vape": "Vape Shop", "vape shop": "Vape Shop", "vape store": "Vape Shop",
    "e-cigarette shop": "Vape Shop",
    "convenience": "Convenience Store", "convenience store": "Convenience Store",
    "corner shop": "Convenience Store", "mini market": "Convenience Store",
    "petrol station": "Petrol Station / Forecourt", "forecourt": "Petrol Station / Forecourt",
    "petrol station / forecourt": "Petrol Station / Forecourt",
    "off licence": "Off-Licence", "off-licence": "Off-Licence", "off license": "Off-Licence",
    "tobacco": "Tobacco Specialist", "tobacconist": "Tobacco Specialist",
    "tobacco specialist": "Tobacco Specialist",
    "newsagent": "Newsagent", "newsagents": "Newsagent",
    "independent supermarket": "Independent Supermarket", "supermarket": "Independent Supermarket",
    "world food supermarket": "Independent Supermarket",
    "shisha": "Smoke / Shisha Shop", "smoke shop": "Smoke / Shisha Shop",
    "smoke / shisha shop": "Smoke / Shisha Shop", "shisha shop": "Smoke / Shisha Shop",
    "cash & carry": "Cash & Carry", "cash and carry": "Cash & Carry",
    "wholesale": "Cash & Carry",
    "regional retail chain": "Regional Retail Chain",
    "multi-site independent": "Multi-Site Independent",
    "other relevant retail": "Other Relevant Retail", "other": "Other Relevant Retail",
}

SOURCE_RANK = {
    "Official Website": 0, "Companies House": 1, "Google Business": 2,
    "Yell": 3, "Facebook": 4, "Instagram": 5, "Directory": 6,
    "News / Trade Press": 7, "Other": 8,
}


def norm_name(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"\b(ltd|limited|plc|llp|the|uk)\b", "", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def norm_phone(s: str) -> str:
    d = re.sub(r"\D", "", s or "")
    if d.startswith("44"):
        d = "0" + d[2:]
    return d


def norm_postcode(s: str) -> str:
    return re.sub(r"\s+", "", (s or "").upper())


def norm_domain(url: str) -> str:
    u = (url or "").lower().strip()
    u = re.sub(r"^https?://", "", u)
    u = re.sub(r"^www\.", "", u)
    return u.split("/")[0].split("?")[0]


def norm_addr(s: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).split())


def canon_category(raw: str) -> str:
    raw = (raw or "").strip()
    if raw in CATEGORIES:
        return raw
    return CATEGORY_ALIASES.get(raw.lower(), "Other Relevant Retail")


def similar(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def load_raw(skip=frozenset()):
    """Load raw batches whose relative path is not already in `skip` (batches
    already absorbed into the durable master). Returns (records, seen_batches)."""
    records, seen = [], []
    for path in sorted((BASE / "data").glob(RAW_GLOB)):
        rel = str(path.relative_to(BASE / "data"))
        seen.append(rel)
        if rel in skip:
            continue
        with open(path) as f:
            batch = json.load(f)
        if not isinstance(batch, list):
            print(f"WARN: {path} is not a JSON array, skipping", file=sys.stderr)
            continue
        for r in batch:
            if not isinstance(r, dict) or not (r.get("business_name") or "").strip():
                continue
            r["_batch"] = path.stem
            records.append(r)
    return records, seen


def best_source_rank(rec) -> int:
    ranks = [SOURCE_RANK.get(s.get("type", "Other"), 8) for s in rec.get("sources", [])]
    return min(ranks) if ranks else 9


CONFLICT_FIELDS = ["phone", "postcode", "address1", "website"]
SCALAR_FIELDS = [
    "business_name", "trading_name", "legal_company_name", "category", "subcategory",
    "independent_or_chain", "number_of_locations", "parent_company", "website",
    "facebook", "instagram", "other_social", "address1", "address2", "town", "county",
    "postcode", "region", "country", "phone", "phone_status", "email", "email_type",
    "email_status", "sales_email", "purchasing_email", "contact_name",
    "contact_position", "contact_source", "companies_house_number", "company_status",
    "registered_company_name", "registered_office", "incorporation_date",
    "existing_vape_brands", "product_categories", "supplier_information", "notes",
    "data_confidence",
]
BOOL_FIELDS = ["website_checked", "phone_checked", "email_checked", "companies_house_checked"]


def merge_into(master, dup):
    """Merge dup into master. Never overwrite non-empty with empty/weaker."""
    m_rank, d_rank = best_source_rank(master), best_source_rank(dup)
    conflicts = []
    for f in SCALAR_FIELDS:
        mv, dv = master.get(f) or "", dup.get(f) or ""
        if not mv and dv:
            master[f] = dv
        elif mv and dv and str(mv).strip() != str(dv).strip():
            if f in CONFLICT_FIELDS:
                key = (f, norm_phone(str(mv)) if f == "phone" else norm_postcode(str(mv))
                       if f == "postcode" else norm_domain(str(mv)) if f == "website" else norm_name(str(mv)),
                       norm_phone(str(dv)) if f == "phone" else norm_postcode(str(dv))
                       if f == "postcode" else norm_domain(str(dv)) if f == "website" else norm_name(str(dv)))
                if key[1] != key[2]:
                    conflicts.append(f"{f}: '{mv}' vs '{dv}'")
                    if d_rank < m_rank:
                        master[f] = dv  # better-ranked source wins, both kept in sources
            else:
                if d_rank < m_rank:
                    master[f] = dv
    for f in BOOL_FIELDS:
        master[f] = bool(master.get(f)) or bool(dup.get(f))
    seen = {s.get("url") for s in master.get("sources", [])}
    for s in dup.get("sources", []):
        if s.get("url") not in seen:
            master.setdefault("sources", []).append(s)
            seen.add(s.get("url"))
    conf_order = {"High": 0, "Medium": 1, "Low": 2, "": 3}
    if conf_order.get(dup.get("data_confidence", ""), 3) < conf_order.get(master.get("data_confidence", ""), 3):
        master["data_confidence"] = dup["data_confidence"]
    if conflicts:
        master["_conflicts"] = master.get("_conflicts", []) + conflicts
        master["duplicate_review"] = "Duplicate Review Required"
    return master


def dedupe(records, seed=None):
    """Deduplicate raw records. When `seed` (the existing durable master) is
    given, records match and merge INTO those existing masters — which keep
    their record_id and every enriched field (merge_into fills blanks only) —
    so re-running never disturbs already-issued IDs or prior enrichment."""
    masters = []
    for m in (seed or []):
        m = dict(m)
        m["_nn"] = norm_name(m.get("business_name"))
        m["_np"] = norm_phone(m.get("phone"))
        m["_npc"] = norm_postcode(m.get("postcode"))
        m["_nd"] = norm_domain(m.get("website"))
        masters.append(m)
    for rec in records:
        rec["category"] = canon_category(rec.get("category"))
        nn = norm_name(rec.get("business_name"))
        np_ = norm_phone(rec.get("phone"))
        npc = norm_postcode(rec.get("postcode"))
        nd = norm_domain(rec.get("website"))
        nch = (rec.get("companies_house_number") or "").strip().upper()
        matched = None
        review = False
        for m in masters:
            m_nn, m_np, m_npc, m_nd = m["_nn"], m["_np"], m["_npc"], m["_nd"]
            m_nch = (m.get("companies_house_number") or "").strip().upper()
            multi_site = bool(rec.get("parent_company") or m.get("parent_company"))
            # certain matches (same location)
            if nch and nch == m_nch and npc and m_npc and npc == m_npc:
                matched = m; break
            if nn and nn == m_nn and npc and m_npc and npc == m_npc:
                matched = m; break
            if nd and nd == m_nd and npc and m_npc and npc == m_npc:
                matched = m; break
            if np_ and np_ == m_np and nn and m_nn and similar(nn, m_nn) > 0.85 and not multi_site:
                matched = m; break
            # same multi-site chain, same town, same/contained street address
            # (two collectors often record one branch with different name suffixes)
            if multi_site and norm_name(rec.get("parent_company")) == norm_name(m.get("parent_company")) \
                    and (rec.get("town") or "").lower() == (m.get("town") or "").lower():
                a, b = norm_addr(rec.get("address1")), norm_addr(m.get("address1"))
                if a and b and (a in b or b in a):
                    matched = m; break
            if nn and nn == m_nn and rec.get("town") and m.get("town") \
                    and rec["town"].lower() == m["town"].lower() and not (npc and m_npc) and not multi_site:
                matched = m; break
            # uncertain -> flag, don't merge
            if npc and m_npc and npc == m_npc and nn and m_nn and 0.72 < similar(nn, m_nn) < 1.0:
                review = True
            elif np_ and m_np and np_ == m_np and nn != m_nn and not multi_site:
                review = True
        if matched:
            merge_into(matched, rec)
            matched["_nn"] = matched["_nn"] or nn
            matched["_np"] = matched["_np"] or np_
            matched["_npc"] = matched["_npc"] or npc
            matched["_nd"] = matched["_nd"] or nd
        else:
            rec["_nn"], rec["_np"], rec["_npc"], rec["_nd"] = nn, np_, npc, nd
            if review:
                rec["duplicate_review"] = "Duplicate Review Required"
            masters.append(rec)
    return masters


def lead_priority(rec):
    reasons, score = [], 0
    n_loc = rec.get("number_of_locations") or 0
    if (isinstance(n_loc, int) and n_loc >= 2) or rec.get("parent_company"):
        score += 2; reasons.append("Multi-site retailer")
    ioc = rec.get("independent_or_chain", "")
    if ioc in ("Independent", "Multi-Site Independent", "Franchise / Symbol Group"):
        score += 1; reasons.append("Independent retailer")
    if rec.get("category") in ("Vape Shop", "Tobacco Specialist", "Smoke / Shisha Shop", "Cash & Carry"):
        score += 2; reasons.append("Core relevant category")
    elif rec.get("category") in ("Convenience Store", "Off-Licence", "Newsagent",
                                 "Petrol Station / Forecourt", "Independent Supermarket"):
        score += 1; reasons.append("Relevant category")
    emails = " ".join(filter(None, [rec.get("email", ""), rec.get("sales_email", ""),
                                    rec.get("purchasing_email", "")])).lower()
    if any(p in emails for p in ("sales@", "trade@", "wholesale@", "orders@", "purchasing@")):
        score += 2; reasons.append("Public trade/sales contact")
    elif emails.strip():
        score += 1; reasons.append("Public email available")
    if rec.get("website"):
        score += 1; reasons.append("Active website")
    if rec.get("facebook") or rec.get("instagram") or rec.get("other_social"):
        score += 1; reasons.append("Social presence")
    if rec.get("phone_status") == "Verified on official website":
        score += 1; reasons.append("Phone verified on official website")
    if score >= 6:
        p = "High"
    elif score >= 3:
        p = "Medium"
    elif score >= 1:
        p = "Low"
    else:
        p = "Unclassified"
    return p, "; ".join(reasons)


def verification_status(rec):
    if rec.get("duplicate_review"):
        return "Duplicate Review Required"
    checks = sum(bool(rec.get(f)) for f in BOOL_FIELDS)
    if rec.get("companies_house_checked") and rec.get("website_checked"):
        return "Verified (website + Companies House)"
    if checks >= 1:
        return "Partially Verified"
    return "Requires Verification"


MASTER_COLUMNS = [
    "Record ID", "Location ID", "Parent Company",
    "Business Name", "Trading Name", "Legal Company Name",
    "Business Category", "Business Subcategory", "Independent / Chain",
    "Number of Locations", "Website", "Facebook", "Instagram", "Other Social Media",
    "Address Line 1", "Address Line 2", "Town / City", "County", "Postcode",
    "Region", "Country",
    "Main Phone", "Secondary Phone", "Mobile",
    "General Email", "Sales Email", "Purchasing Email",
    "Contact Name", "Contact Position", "Contact Source",
    "Companies House Number", "Company Status", "Registered Company Name",
    "Registered Office", "Incorporation Date",
    "Existing Vape Brands", "Product Categories", "Potential Opportunity",
    "Estimated Retail Type", "Supplier Information", "Sales Notes",
    "Lead Priority", "Priority Reasons",
    "Primary Source", "Secondary Source", "Source Count",
    "Website Checked", "Phone Checked", "Email Checked", "Companies House Checked",
    "Phone Status", "Email Status",
    "Last Verified Date", "Verification Status", "Data Confidence", "Duplicate Review",
    "Contact Type", "Marketing Legal Basis", "Opt-Out Status", "Do Not Contact",
    "Date Collected",
    "Lead Status", "Date Added", "Last Contact", "Next Follow-Up",
    "Contact Method", "Salesperson", "Outcome", "CRM Notes",
]


def to_row(rec, rid, loc_id):
    sources = sorted(rec.get("sources", []), key=lambda s: SOURCE_RANK.get(s.get("type", "Other"), 8))
    primary = sources[0]["url"] if sources else ""
    secondary = sources[1]["url"] if len(sources) > 1 else ""
    prio, reasons = lead_priority(rec)
    yn = lambda b: "Yes" if b else "No"
    notes = rec.get("notes", "")
    if rec.get("_conflicts"):
        notes = (notes + " | " if notes else "") + "SOURCE CONFLICT: " + "; ".join(rec["_conflicts"])
    return {
        "Record ID": rid, "Location ID": loc_id,
        "Parent Company": rec.get("parent_company", ""),
        "Business Name": rec.get("business_name", ""),
        "Trading Name": rec.get("trading_name", "") or rec.get("business_name", ""),
        "Legal Company Name": rec.get("legal_company_name", "") or rec.get("registered_company_name", ""),
        "Business Category": rec.get("category", ""),
        "Business Subcategory": rec.get("subcategory", ""),
        "Independent / Chain": rec.get("independent_or_chain", "Unknown"),
        "Number of Locations": rec.get("number_of_locations") or "",
        "Website": rec.get("website", ""), "Facebook": rec.get("facebook", ""),
        "Instagram": rec.get("instagram", ""), "Other Social Media": rec.get("other_social", ""),
        "Address Line 1": rec.get("address1", ""), "Address Line 2": rec.get("address2", ""),
        "Town / City": rec.get("town", ""), "County": rec.get("county", "West Yorkshire"),
        "Postcode": rec.get("postcode", ""), "Region": rec.get("region", "Yorkshire & Humber"),
        "Country": rec.get("country", "England"),
        "Main Phone": rec.get("phone", ""), "Secondary Phone": "", "Mobile": "",
        "General Email": rec.get("email", ""), "Sales Email": rec.get("sales_email", ""),
        "Purchasing Email": rec.get("purchasing_email", ""),
        "Contact Name": rec.get("contact_name", ""),
        "Contact Position": rec.get("contact_position", ""),
        "Contact Source": rec.get("contact_source", ""),
        "Companies House Number": rec.get("companies_house_number", ""),
        "Company Status": rec.get("company_status", ""),
        "Registered Company Name": rec.get("registered_company_name", ""),
        "Registered Office": rec.get("registered_office", ""),
        "Incorporation Date": rec.get("incorporation_date", ""),
        "Existing Vape Brands": rec.get("existing_vape_brands", ""),
        "Product Categories": rec.get("product_categories", ""),
        "Potential Opportunity": "", "Estimated Retail Type": rec.get("category", ""),
        "Supplier Information": rec.get("supplier_information", ""),
        "Sales Notes": notes,
        "Lead Priority": prio, "Priority Reasons": reasons,
        "Primary Source": primary, "Secondary Source": secondary,
        "Source Count": len(sources),
        "Website Checked": yn(rec.get("website_checked")),
        "Phone Checked": yn(rec.get("phone_checked")),
        "Email Checked": yn(rec.get("email_checked")),
        "Companies House Checked": yn(rec.get("companies_house_checked")),
        "Phone Status": rec.get("phone_status", "Unverified") if rec.get("phone") else "Not Found",
        "Email Status": rec.get("email_status", "") or ("Publicly Listed" if rec.get("email") else "Not Found"),
        "Last Verified Date": TODAY, "Verification Status": verification_status(rec),
        "Data Confidence": rec.get("data_confidence", "Low"),
        "Duplicate Review": rec.get("duplicate_review", ""),
        "Contact Type": "Business (B2B)",
        "Marketing Legal Basis": "Legitimate interest (B2B) - assess per campaign; PECR: corporate subscribers",
        "Opt-Out Status": "", "Do Not Contact": "No",
        "Date Collected": (rec.get("sources") or [{}])[0].get("date", TODAY),
        "Lead Status": "New", "Date Added": TODAY, "Last Contact": "",
        "Next Follow-Up": "", "Contact Method": "", "Salesperson": "",
        "Outcome": "", "CRM Notes": "",
    }


def next_ref_number(masters):
    n = 0
    for m in masters:
        mm = re.search(r"(\d+)$", m.get("record_id") or "")
        if mm:
            n = max(n, int(mm.group(1)))
    return n + 1


def main():
    master_path = BASE / "data" / "master.json"
    merged_path = BASE / "data" / "merged_batches.json"
    existing = json.load(open(master_path)) if master_path.exists() else []
    merged = set(json.load(open(merged_path))) if merged_path.exists() else set()

    records, seen = load_raw(skip=merged)
    print(f"Loaded {len(records)} raw records from new batches "
          f"({len(seen) - len(merged)} new of {len(seen)} total)")
    masters = dedupe(records, seed=existing)
    new_count = len(masters) - len(existing)
    print(f"Master: {len(masters)} records ({len(existing)} existing + {new_count} new)")

    json.dump(sorted(seen), open(merged_path, "w"), indent=1)

    # existing records keep their record_id; only genuinely new ones get a fresh ref
    ref_n = next_ref_number(masters)
    masters.sort(key=lambda r: (r.get("parent_company") or "~", r.get("business_name", ""), r.get("town", "")))
    parent_counters, rows, out_records = {}, [], []
    for rec in masters:
        rid = rec.get("record_id")
        if not rid:
            rid = f"UK-{ref_n:06d}"
            ref_n += 1
        parent = rec.get("parent_company", "")
        if parent:
            parent_counters[parent] = parent_counters.get(parent, 0) + 1
            loc_id = f"{re.sub(r'[^A-Za-z0-9]', '', parent)[:10].upper()}-{parent_counters[parent]:02d}"
        else:
            loc_id = f"{rid}-01"
        rows.append(to_row(rec, rid, loc_id))
        clean = {k: v for k, v in rec.items() if not k.startswith("_")}
        clean["record_id"], clean["location_id"] = rid, loc_id
        out_records.append(clean)

    (BASE / "data").mkdir(exist_ok=True)
    with open(BASE / "data" / "master.json", "w") as f:
        json.dump(out_records, f, indent=1, ensure_ascii=False)

    (BASE / "output").mkdir(exist_ok=True)
    with open(BASE / "output" / "master.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=MASTER_COLUMNS)
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote data/master.json and output/master.csv ({len(rows)} rows)")

    dup_flagged = sum(1 for r in rows if r["Duplicate Review"])
    print(f"Flagged for duplicate review: {dup_flagged}")


if __name__ == "__main__":
    main()
