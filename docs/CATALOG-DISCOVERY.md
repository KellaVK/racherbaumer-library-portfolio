# Search and preference discovery

## What changed

The catalog now combines title/creator lookup, typo tolerance, multiword matching,
domain concept expansion, and descriptive spreadsheet notes. Matches show their
source and a short excerpt. DVD detail pages expose additional collection notes
with the source tab/row so users can inspect the information behind a result.

The “Find something for you” panel ranks titles using chosen interests, experience
level, performance setting, and an optional favorite DVD. Preferences are local
to the browser and can be reset. They are ranking hints, not guaranteed suitability
filters. Suggestions obey the structured catalog filters, including current
availability; the search query does not constrain this separate discovery panel.
No account or checkout writes are introduced.

## Data collected and reconciled

On October 14, 2026 the live public catalog contained 637 records and 397 nonempty
AI summaries. The detailed spreadsheet tabs were DVD List, CD List, and In Progress
Additions. Master List Order, Sheet8, and the public list were inspected to understand
duplicated title lists. Only descriptive columns A:F from the detailed tabs were
retained: title, magician, notes, type, producer, and other performers/features.
Borrower names/contact details, personal opinions, interest flags, storage locations,
and checkout columns are not part of the new data files or preference index.

The sanitized source snapshot contains 654 titled rows (including unknown-title
placeholders). Of these, 617 rows enrich 598 distinct catalog titles. Seven rows
lack a reviewed identity match and 30 have creator disagreements. Those rows are
reported, not merged. All 637 live titles remain searchable; records without safe
sheet matches still use their current live metadata and descriptions.

Examples needing review:

- `Resturuant Magic - Vol.1` in the sheet is attributed to Alain Iannone, while
  the similar live title belongs to Dan Fleshman; they were not merged.
- `The Daniel Garcia Project 3` has no corresponding live volume in the snapshot.
- `Remarkable Coin Magic`, `Revolution`, and `Basic Coin Magic` have differing
  creator attributions. Neither source is silently declared correct.
- Some creator differences are likely spelling variants. They are still withheld
  until reviewed rather than using a general fuzzy identity merge.

See `catalog-reconciliation.json` for every unmatched/conflicting source row.
The overlay is joined by document ID and observed normalized title. It never replaces
live titles, IDs, AI summaries, or availability. New records work without an overlay;
renamed titles with a different normalized identity do not inherit stale notes.

## Search and recommendation methods

`src/utils/discovery.js` builds a local index once per catalog update. Direct title
and creator matches receive the strongest weights, followed by notes and featured
performers. AI descriptions receive lower weight. Query groups permit word-order
variation, common domain synonyms, and bounded spelling corrections. Queries are
limited to 240 normalized characters and 16 ordinary tokens plus concept groups.

Recommendations use explicit concept matches and, for the optional favorite DVD,
cosine similarity over field-weighted, inverse-document-frequency word vectors.
These are **lexical vectors, not neural embeddings**. No embedding service, new model,
or external search API is called. This is a low-cost, explainable first step for a
637-item collection, not unrestricted natural-language understanding.

The existing `A Master of Muscle Pass` AI description misidentifies coin material
as card magic while the catalog notes identify coins. When direct card/coin evidence
and a summary clearly disagree in this way, that summary is omitted from the search
index. The original description remains visible with an AI caveat and is not edited.
This narrow safeguard is not a general fact checker. Other inaccurate summaries and
ambiguous skill-level wording remain possible.

## Reproduce and refresh

```bash
npm test
npm run test:search
npm run build
npm run catalog:reconcile
```

`tests/fixtures/catalog-snapshot.json` is a frozen descriptive-only copy of the
public catalog used for reproducible evaluation. It is not imported by the app.
The app always uses live Firestore records and the small generated sheet overlay.

To refresh, export only the six descriptive source columns into the row schema in
`scripts/catalog-source.json` and obtain an up-to-date descriptive catalog JSON
array (same allowlisted fields as the fixture). Then run:

```bash
node scripts/buildCatalogEnrichment.js scripts/catalog-source.json /path/to/catalog.json
node scripts/evaluateSearch.js /path/to/catalog.json
```

Review `docs/catalog-reconciliation.json` and the resulting diff. Add only verified
title-to-ID aliases to `src/data/catalog-aliases.json`; never resolve a volume or
creator mismatch merely to increase coverage. The scripts write local artifacts
only. They do not modify Sheets, Firestore, or any deployed service.

## Evaluation and limits

The 20 developer-curated diagnostic queries retrieve the intended title in the top
five in 20/20 cases, compared with 10/20 using the prior Fuse configuration. All 637
display-title queries retrieve their record in the top five (duplicates can share a
display title). `search-evaluation.json` records per-query rankings and local timings.
The diagnostic cases informed bug fixes, so they are a regression suite, **not an
independent test set or a claim of 100% general search accuracy**. User testing and
a separately labeled query set are appropriate before drawing broader conclusions.

The new index took roughly 0.1–0.2 seconds to build locally, and diagnostic queries
ran in tens of milliseconds or less in Node; browser/device timings will vary.
Neural embeddings may improve paraphrase recall, but would need a separate labeled
comparison, a refresh strategy, and protected server-side credentials. They were
not necessary to demonstrate the measured improvements here.

Other limits: no logical negation parser; no broad natural-language constraint
solver; experience level can be inferred from wording rather than verified labels;
recommendations are content-based and do not learn from clicks or other members.
The sheet snapshot needs an explicit rebuild to reflect later sheet edits. Original
borrower flows and authorization rules were not changed.

## Release and rollback

This implementation is on a review branch in the portfolio repository. Production
is independent of it. Review the source and local preview before deciding to deploy.
No data migration is required: release the frontend build through the existing
Cloudflare Pages process. Roll back to the previous frontend build to undo it;
there are no new Firestore fields, writes, or account migrations to reverse.

See [the verification record](DISCOVERY-VERIFICATION.md) for requirement-by-requirement evidence and browser checks.


### Suggestion browsing

Each suggestion is a full clickable link to its DVD detail page, including its
performer and match explanations. The panel shows up to three suggestions. Subject and setting are soft preferences:
matching both ranks ahead of matching one, then evidence strength breaks ties.
Experience level carries less weight and can supply partial matches when metadata
is sparse. Hard catalog filters such as availability still apply. Categories and notes remain unverified, so matches are
browsing aids rather than guarantees of suitability. Source row provenance stays in
the data for maintenance, but is not displayed in the reader-facing notes disclaimer.
