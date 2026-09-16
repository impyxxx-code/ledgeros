# ARKHAM RETAIL — UK Retail Prospect Database

A commercially usable, continuously expandable B2B prospect database of UK retail
businesses (vape, convenience, forecourt, off-licence, tobacco/shisha, independent
supermarket, newsagent, cash & carry, regional chains) for ARKHAM RETAIL / AR ERP.

**Current status: West Yorkshire pilot** (Leeds, Bradford, Kirklees, Calderdale,
Wakefield districts). See `output/` for the latest workbook.

## Principles

- Real businesses only — every record traces to source URLs that were actually visited.
- No invented phone numbers, emails, or company numbers. Missing = blank.
- Trading name ≠ legal company name; company ≠ individual store — separate fields.
- Verified vs unverified information is explicitly distinguished (`Phone Status`,
  `Email Status`, `Verification Status`, `Data Confidence`).
- One master record per business location; multi-site operators share a
  `Parent Company` and get per-location `Location ID`s.
- Source log is never discarded after enrichment.
- Opt-out / do-not-contact flags are never removed, even if the business is
  re-discovered in a later collection pass.

## Layout

```
prospect-database/
├── README.md                    ← this file
├── schema/RECORD_SCHEMA.md      ← collection schema + controlled vocabularies
├── data/
│   ├── regions/<region>/raw/    ← raw collection batches (JSON, per collector)
│   └── master.json              ← deduplicated master records (with sources)
├── scripts/
│   ├── merge_dedupe.py          ← raw batches → master.json + master.csv
│   └── build_workbook.py        ← master → 13-sheet XLSX
└── output/
    ├── master.csv               ← flat Excel-compatible CSV
    └── ARKHAM_RETAIL_prospects_<region>.xlsx
```

## Pipeline

```bash
python3 scripts/merge_dedupe.py     # merge + dedupe all raw batches
python3 scripts/build_workbook.py   # build the XLSX workbook
```

Both are idempotent: re-running after adding new raw batches rebuilds the master.
CRM edits belong in the CRM system of record (or a maintained copy of the CRM
sheet) — the generated workbook is a snapshot. When re-importing, opt-out and
do-not-contact rows must be carried forward, never dropped.

## Workbook sheets

DASHBOARD (live formula metrics) · ALL PROSPECTS · VAPE SHOPS · CONVENIENCE
(incl. newsagents) · PETROL - FORECOURTS · OFF LICENCES · TOBACCO - SMOKE -
SHISHA · SUPERMARKETS (incl. cash & carry) · CHAINS - MULTI-SITE · MISSING
CONTACT INFO · DUPLICATE REVIEW · SOURCE LOG · CRM - FOLLOW-UP

## Duplicate control

`merge_dedupe.py` matches on: Companies House number + postcode, normalised
name + postcode, website domain + postcode, phone + near-identical name.
Certain matches are merged (never overwriting non-empty values with empty ones;
higher-ranked sources win conflicts, both sources retained). Uncertain matches
are kept and flagged `Duplicate Review Required` — reviewed by a human, not
auto-deleted.

## Lead priority (factual, not subjective)

Score from observable characteristics only — multi-site, independent, core
category (vape/tobacco/shisha/cash & carry), public trade/sales email, website,
social presence, phone verified on official site. Thresholds: High ≥6,
Medium 3–5, Low 1–2, Unclassified 0. The contributing factors are kept in
`Priority Reasons`.

## GDPR / UK marketing compliance

Records are corporate/business contact points collected from public sources.
Fields provided: `Contact Type`, `Marketing Legal Basis`, `Opt-Out Status`,
`Do Not Contact`, `Date Collected`, plus full source provenance. B2B outreach
to corporate subscribers is generally permitted under PECR with legitimate
interest under UK GDPR, **but this must be assessed per campaign** — named
individuals and sole traders/partnerships have additional protections, and any
opt-out must be honoured permanently. Publicly listed ≠ automatically usable
for unrestricted marketing.

## Region rollout plan

1. ✅ **Yorkshire & Humber — West Yorkshire (pilot)**
2. Yorkshire & Humber — South/North Yorkshire, Humber
3. North West → North East → West Midlands → East Midlands →
   East of England → South West → South East → London
4. Wales → Scotland → Northern Ireland

Work region-by-region; commit raw batches + regenerated master after each region.
New raw batches go in `data/regions/<region>/raw/` following `RECORD_SCHEMA.md`.

## Sources used

Business official websites (preferred for contact details), Google Business
listings/search results, Yell and other UK directories (Cylex, Scoot, etc.),
Facebook/Instagram business pages, Companies House (company verification),
industry trade press (BetterRetailing, Convenience Store, Forecourt Trader).
