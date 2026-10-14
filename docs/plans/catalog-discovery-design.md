# Catalog discovery: design and implementation plan

## Goal and authorization

Use Kella's messy Google Sheets and existing AI summaries to improve real library search and provide suggestions based on visitor preferences. The user explicitly requested autonomous planning and implementation while resting. Preserve the original sheets and checkout behavior. Work on the feature branch; validate before publishing code. Production deployment is a separate final review step if not already authorized.

## Evidence

The live public Firestore catalog has 637 records and 397 nonempty AI summaries (read October 14, 2026). Three detailed spreadsheet tabs contain 652 nonempty descriptive rows; normalization produces 638 exact row-to-catalog matches, with 14 rows requiring review. Multiple rows can describe the same catalog record. Other tabs mostly duplicate titles or track physical locations. Borrower/contact columns and personal interest/opinion columns are excluded. All public runtime data must contain only bibliographic/descriptive fields.

Current search is a single Fuse query with default location-sensitive matching, which penalizes useful terms deep in long descriptions. Some AI summaries contain factual errors. Metadata needs provenance and must not silently overwrite live titles, IDs, availability, or summaries.

## Options and choice

1. Enriched lexical search only: inexpensive and auditable but limited natural-language discovery.
2. Enriched hybrid local search: weighted exact/fuzzy matching, per-term matching, domain concept expansion, and content-based preference ranking. Uses existing descriptions with lower weight than catalog metadata. Fast and private for this small catalog; no network per query. **Selected first implementation**, assessed with real-catalog retrieval cases.
3. Hosted neural embeddings: stronger open-ended paraphrase handling, but adds API credentials, costs, embedding freshness and query endpoint operations. Optional future layer if evaluation shows material gaps; do not label lexical vectors as neural embeddings.

## Data design

Store a sanitized source snapshot containing only title, creator, notes, type, producer, and additional performers, with tab/row provenance. A repeatable reconciliation script matches exact normalized titles and explicitly reviewed aliases. Never auto-merge ambiguous volumes or unmatched records. Generate an overlay keyed by live document ID and anchored to its observed title. Merge descriptive fields for search without changing original catalog values. Report unmatched rows, duplicates, conflicting field values, and AI-summary warnings. Runtime joins validate identity; new live titles continue to work without sheet enrichment.

## Search behavior

Strong boosts for exact title/creator matches; tokenize multiword queries so word order and text position do not hide relevant results. Fuse handles spelling errors. Domain concepts connect terms such as mind reading/mentalism, restaurant/table hopping, linking rings/rings, rubber bands/elastic, beginner/easy/self-working. Avoid treating weak matches as exact answers; show a short matched source and snippet. Cap query length and work per keystroke. Structured filters still apply and URL search state remains shareable. Correct the existing before-1980 filter mismatch. No silent broadening when nothing matches.

## Preferences and recommendations

An accessible expandable discovery panel lets visitors select interests, preferred learning level, and performance setting; optional favorite DVD gives a similarity signal. Store preferences locally with safe parsing, a reset action, and no user-account writes. Unknown levels/settings are not presented as verified facts. Label summary-derived evidence and explain suggestions. Recommendations respect active availability and category filters and exclude a selected reference DVD. Display an honest empty state if evidence is insufficient. Browsing remains usable without preferences or enrichment.

## Implementation sequence

1. Finish reconciliation review; build sanitized snapshots and deterministic importer. Tests: duplicate aggregation, title aliases, volume mismatch, stale identity, unknown values, no contact/borrower fields.
2. Add pure search/ranking utilities and real-catalog evaluation fixtures. Test exact names, typo, long-summary term, multiple concepts, irrelevant queries, missing fields, summary-only evidence, filter invariants, deterministic ranking. Compare top-5 retrieval with current Fuse on the same cases.
3. Integrate query hook and reason snippets. Test query URL updates, metadata enrichment and structured filters together, old-era filtering.
4. Add preference persistence and recommendation panel. Test malformed/blocked storage, reset, insufficient evidence, exclusion of reference title, active availability filtering, keyboard-accessible controls.
5. Verify full tests/build, browser desktop/mobile search and recommendations, normal DVD details/checkout navigation, runtime data size and search latency. Document metrics, limitations, refresh command, and AI use. Publish a reviewable feature branch/PR and provide a preview if possible.

## Review focus

- Different volumes must not collapse during title matching (import tests).
- Stale overlays must not attach another work's notes to a renamed/replaced record (join tests).
- Explicit card/coin catalog evidence outranks contradictory AI claims (ranking tests).
- Storage failures must not block browsing (preference tests).
- Filters and recommendations must use live availability, never stale sheet borrower information (integration tests).

## Completion requirements

Evidence must demonstrate source data collected and reconciled, enriched search functioning in the app, preference suggestions with reasons, existing flows preserved, passing relevant tests/build, and a reviewable published implementation. Embeddings are optional and must be described accurately. Do not claim deployment or measured relevance improvements without direct evidence.

## Implementation evidence update

The final sanitizer retained 654 titled source rows, including unknown placeholders. Creator cross-checking withheld 30 rows and identity matching withheld 7; 617 accepted rows enrich 598 live titles. These final counts supersede the initial title-only exploration numbers above. The runtime implementation, source provenance, evaluation results, and limitations are documented in `docs/CATALOG-DISCOVERY.md`.
