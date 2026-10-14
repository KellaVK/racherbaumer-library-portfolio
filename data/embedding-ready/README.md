# Embedding-ready library catalog

Generated locally from the descriptive-only Google Sheets snapshot in
`scripts/catalog-source.json` (retrieved 2026-10-14), the sanitized catalog fixture,
and reviewed title aliases. The original Google Sheet and production catalog are
unchanged. This is a preparation dataset, not a generated vector index.

## Files

- `catalog.json`: 637 canonical, stable-ID records with display titles, creators,
  original and normalized notes, publishers, title aliases, series/volume when
  explicit, separate category dimensions, source references, and quality flags.
- `documents.jsonl`: one JSON object per embedding input chunk. Feed **text** to a
  future embedding model; keep documentId, dvdId and contentHash as metadata.
- `quality-report.json`: category coverage, records needing review, unmatched
  spreadsheet rows and creator conflicts. These rows are not silently merged.

## What changed

Whitespace and placeholder values are normalized. Duplicate descriptive values are
removed. A small explicit typo map fixes known misspellings in descriptions and search
aliases; proper names and display titles remain intact. Original notes are retained.

Categories are separated into subjects, performance settings, formats and levels.
Every tag includes its matching source field and phrase and is marked unverified.
Generic “ring” is not assumed to mean linking rings; a card prediction is not automatically
mentalism. Marketing title words like “expert” or “easy” do not establish skill level.
Absence of a tag means unknown, not unsuitable. These rules are conservative mention
extraction, not complete semantic understanding or human validation.

AI summaries are retained separately for review and excluded from default embedding
inputs. Borrower identifiers, contact fields, checkout history and personal preferences
are never copied. Read-only source references stay in metadata, not embedding text.

## Rebuild and use

Run `npm run catalog:prepare-embeddings` from the repository root. Run
`npm test -- scripts/lib/prepareEmbeddingCatalog.test.js` for transformation tests.
The rebuild is deterministic and uses the checked-in snapshot; it does not fetch live
Google Sheets, write Firestore, call an AI provider, or generate model embeddings.
Refresh and sanitize the source snapshots before rebuilding when the collection changes.

For a future local or batch embedding experiment:
1. Choose and version one embedding model.
2. Cache each vector by model version + document contentHash. Re-embed only changed text.
3. Store vectors against documentId and aggregate chunk results by dvdId, returning
   at most one suggestion per DVD.
4. Keep exact-title/creator matching and explicit availability filters alongside vectors.
5. Compare judged top-three usefulness against the current local recommender before
   enabling the new index. Unknown settings/levels must remain soft preferences.
6. Track deleted document IDs and remove stale vectors on rebuild.

Long descriptions are split into approximately 1,400-character body chunks with title
and creator context repeated. This is character-based, not a tokenizer guarantee; check
limits for the chosen model before embedding. Provenance-only edits do not invalidate
text hashes. Embedding model changes do invalidate the vector cache.

## First cleanup priorities

Review creator conflicts and unmatched rows first; then ambiguous titles and records
without descriptive notes. Have a club member add verified subjects, props required,
performance setting and teaching/performance format. Leave difficulty unknown until
supported by the material. Avoid generating lengthy descriptions solely to fill gaps.
