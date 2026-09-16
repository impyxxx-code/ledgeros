# West Yorkshire Pilot — Results & Process Analysis

Date: 2026-09-16 · Dataset: 198 raw records → **193 unique prospects** (5 merged, 3 flagged for duplicate review)

## What was collected

| Metric | Count |
|---|---|
| Total prospects | 193 |
| With phone | 84 (44%) |
| With published email | 15 (8%) |
| With website | 77 (40%) |
| Companies House number captured | 31 (16%) |
| Multi-site locations (with parent company) | 46 across 16 groups |
| High priority leads | 32 |
| Medium priority leads | 97 |

By category: Vape Shop 57 · Convenience 33 · Independent Supermarket 25 · Off-Licence 24 · Newsagent 15 · Petrol/Forecourt 14 · Cash & Carry 13 · Tobacco Specialist 8 · Smoke/Shisha 3 · Other 1.

Coverage: Leeds 34, Bradford 22, Halifax 18, Huddersfield 14, Dewsbury 12, Wakefield 11, plus 25+ smaller towns (Shipley, Batley, Keighley, Castleford, Brighouse, Pontefract, Normanton, Ossett, Mirfield, Holmfirth, Todmorden, Ilkley, Bingley…).

Notable multi-site groups captured: Abu Bakr Group (5 supermarkets), Valli Forecourts (16-site group, partially mapped), Vaparama (3), We Are Vapes (3), 420 Vape Shop (3), Mullaco (3), Worldwide Foods (3), TB Cash & Carry (2), WOW Vape (2), Totally Wicked (2, national).

## Data-quality posture (honest)

- **No High-confidence records yet.** All data came from search-result snippets because the
  environment's network policy blocked every direct website fetch (business sites, Yell,
  Companies House). `Website Checked` is honestly `No` nearly everywhere and confidence is
  capped at Medium (116 Medium / 77 Low).
- Emails are only recorded where actually seen published (15). None invented, none guessed.
- Known-closed businesses were excluded (SMKD's closed branches, TABlites Leeds); conflicting
  closure signals are flagged in notes rather than deleted (e.g. SMKD Halifax/Hebden Bridge).
- Businesses with revoked licences / illicit-trade findings were excluded outright.

## Process problems found (and fixes before the next region)

1. **Website enrichment blocked** — the egress proxy denies HTTPS to business domains and
   `find-and-update.company-information.service.gov.uk`. → **Fix: run collection in an
   environment with a permissive network policy** (Claude Code on the web → environment
   settings), or supply a Companies House API key. This alone lifts most records to High
   confidence and would multiply the email capture rate.
2. **Shared web-search budget (200/session) exhausted mid-collection** with 6 parallel
   collectors. → Fix: fewer parallel collectors per session (2–3), or one region per session;
   sequence Companies House lookups early.
3. **High-yield systematic sources identified for the next pass** (all blocked this session):
   symbol-group store locators (Premier/Londis/Nisa/SPAR/Best-one), FSA food hygiene register
   (ratings.food.gov.uk — authoritative trading addresses for convenience/newsagents), council
   licensing registers (e.g. licensing.wakefield.gov.uk for off-licences), Valli Forecourts and
   other groups' own site lists.
4. **Schema tweak for v2**: add an explicit `verification_needed` field (currently overloaded
   into `notes`) so the pipeline can drive a re-check queue.
5. **Dedupe improvement shipped during the pilot**: multi-site branches recorded by two
   collectors under slightly different names are now merged on parent + town + street-address
   containment (caught 3 Abu Bakr duplicates).

## Recommended next steps

1. Re-run a **West Yorkshire enrichment pass** with fetch access: visit the 77 known websites
   (contact/about/stores pages) to capture emails, verify phones, complete Companies House for
   the 31 known numbers + remaining ltd companies; upgrade confidence ratings.
2. Then expand to the rest of **Yorkshire & Humber** (South Yorkshire: Sheffield, Rotherham,
   Doncaster, Barnsley; North Yorkshire: York, Harrogate, Scarborough; Humber: Hull, Grimsby),
   2–3 collectors per session to respect the search budget.
3. Continue region-by-region per the rollout plan in README.md, committing raw batches and the
   regenerated master after each region.
