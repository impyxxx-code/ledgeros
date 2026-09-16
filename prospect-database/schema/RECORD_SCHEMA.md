# ARKHAM RETAIL — Prospect Record Schema (v1)

Every collected business is one JSON object. Collection agents write an array of
these objects to `data/regions/<region>/raw/<batch-slug>.json`.

## Hard rules (non-negotiable)

1. **Real businesses only.** Every record must trace to at least one real, visited source URL.
2. **Never invent** phone numbers, emails, postcodes, or company numbers. Unknown = empty string `""` or `null`.
3. **Never guess emails** (no `info@domain.com` unless actually seen published).
4. **Never turn a generic email into a named person's email.**
5. Contact people only when **publicly self-identified** (e.g. "About us: founded by...", Companies House officers for directors).
6. Record **every source URL used** in `sources`.
7. Trading name and legal company name are **different fields** — do not conflate.

## Controlled vocabularies

`category` (Business Category) — exactly one of:
- `Vape Shop`
- `Convenience Store`
- `Petrol Station / Forecourt`
- `Off-Licence`
- `Tobacco Specialist`
- `Newsagent`
- `Independent Supermarket`
- `Smoke / Shisha Shop`
- `Cash & Carry`
- `Regional Retail Chain`
- `Multi-Site Independent`
- `Other Relevant Retail`

Note: `Regional Retail Chain` / `Multi-Site Independent` are used in
`independent_or_chain`; for `category` prefer the product category (e.g. a
12-store vape chain is `category: Vape Shop`, `independent_or_chain: Regional Chain`).

`independent_or_chain` — one of: `Independent` | `Multi-Site Independent` | `Regional Chain` | `National Chain` | `Franchise / Symbol Group` | `Unknown`

`phone_status` — one of: `Verified on official website` | `Verified directory` | `Google Business` | `Unverified` | `Not Found`

`email_status` — one of: `Verified` | `Publicly Listed` | `Website Found` | `Unverified` | `Not Found`
(`Publicly Listed` = seen on the business's own website/social page. `Website Found` = site exists but no email published. `Verified` reserved for evidence of deliverability — collectors normally must NOT use it.)

`data_confidence` — `High` | `Medium` | `Low`
- High: official website visited + address/phone cross-checked in ≥2 sources
- Medium: single good source (own website OR Google Business OR directory with full details)
- Low: partial details, single directory listing

`source.type` — one of: `Official Website` | `Google Business` | `Yell` | `Directory` | `Companies House` | `Facebook` | `Instagram` | `News / Trade Press` | `Other`

`region` for this pilot: `Yorkshire & Humber`; `county`: `West Yorkshire`; `country`: `England`.

## Record JSON shape

```json
{
  "business_name": "The Vape Loft",
  "trading_name": "The Vape Loft",
  "legal_company_name": "",
  "category": "Vape Shop",
  "subcategory": "E-liquid specialist",
  "independent_or_chain": "Independent",
  "number_of_locations": 1,
  "parent_company": "",
  "website": "https://...",
  "facebook": "",
  "instagram": "",
  "other_social": "",
  "address1": "12 Example Street",
  "address2": "",
  "town": "Leeds",
  "county": "West Yorkshire",
  "postcode": "LS1 1AA",
  "region": "Yorkshire & Humber",
  "country": "England",
  "phone": "0113 000 0000",
  "phone_status": "Verified on official website",
  "email": "",
  "email_type": "",
  "email_status": "Not Found",
  "sales_email": "",
  "purchasing_email": "",
  "contact_name": "",
  "contact_position": "",
  "contact_source": "",
  "companies_house_number": "",
  "company_status": "",
  "registered_company_name": "",
  "registered_office": "",
  "incorporation_date": "",
  "existing_vape_brands": "",
  "product_categories": "vape hardware; e-liquids",
  "supplier_information": "",
  "notes": "",
  "sources": [
    {"url": "https://...", "type": "Official Website", "date": "2026-09-16", "info_obtained": "address, phone, email"}
  ],
  "website_checked": true,
  "phone_checked": false,
  "email_checked": false,
  "companies_house_checked": false,
  "data_confidence": "Medium"
}
```

All keys must be present in every record (empty string / null / false when unknown).
The example values above are illustrative only — never copy them into real records.

## Multi-site businesses

- One record per **physical location**, sharing the same `business_name` and
  `parent_company` (set `parent_company` to the company/brand name for every
  location record of a multi-site business).
- The merge script generates the company-level record and `Location ID`s.

## Derived downstream (do NOT collect)

Lead Status, Lead Priority, CRM fields, opt-out flags — added by the build
pipeline, defaulted, and maintained thereafter in the master dataset.
