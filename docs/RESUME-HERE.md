> **Update (October 14):** The whole-catalog command is implemented. See [Automatic research](AUTOMATED-RESEARCH.md) for operation and the verified coverage limits. The first full pass accounted for all 637 DVDs but added no new reliable matches because matching DVD sources were unavailable.

# Current checkpoint — source-comparison pilot

The first ten-DVD batch is in `data/research/batches/pilot-01.json`: seven reviewed matches, 53 named contents and three held records (Magic Farm and Extreme Dean volumes 1/2). Conjuring Archive has no usable DVD contents in this pilot; magazine review references are not contents evidence. No paid AI calls or neural embeddings were generated.

Run `npm run catalog:research` to regenerate the readable `data/research/compiled/review.html`, comparison JSON and 53 trick-level embedding documents. Use `-- --publish` only after review to update the website overlay, then regenerate catalog embeddings. A saved-page HTML importer now preserves product-section list boundaries without executing scripts or fetching remote pages. See `docs/SOURCE-RESEARCH.md` for commands and limitations.

Reviewed trick names/descriptions feed ordinary search and the existing Contents & props disclosure, including multiple source links. Reviewed source URLs override known-wrong legacy vendor URLs (the original Mirage Et Trois previously linked to 2.0). No production deployment has been performed.

Next: finish edition checks for the three held DVDs, obtain permitted source acquisition access before adding bulk fetching, then extend in small reviewed batches. Physical disc completeness, local props, and potentially stale legacy producer/AI-summary fields still need checking. Do not infer prop requirements from visible effect counts or publisher contents from creator reputation. Current acquisition uses indexed-page research or permitted saved HTML; fully automatic network scraping is not implemented.

---

# Stopping point — October 14, 2026

Paused at the user's request to conserve usage. Changes are on `feat/catalog-discovery`. The user subsequently requested this checkpoint be committed and pushed to the existing PR; merging and deployment remain pending. Existing PR: https://github.com/KellaVK/racherbaumer-library-portfolio/pull/1.

## Implemented locally

- Dark-and-gold streaming-style topic and magician shelves, optional collection views, nonalphabetical browse order, related DVDs on detail pages.
- Three reviewed source matches with source links, edition caveats, selected tricks and props. Normal search finds these facts (browser confirmed Las Vegas Leaper returns Ammar Vol.1).
- Extraction pipeline in `scripts/research`: capture validation, title/creator/volume checks, rule-based extraction, optional Claude extraction, caches, run lock, call/token/estimated-dollar limits, human-review output. No automatic publication.
- `docs/SOURCE-RESEARCH.md` documents operation, budget limitations, source access restrictions and review requirements.
- Reviewed source facts integrated into embedding-ready export schema 1.2; regenerated 637 records/documents with provenance. No paid AI calls or neural embeddings generated.
- Lookup ledger covers all 637 titles: 192 initially searched, 445 unsearched. Candidates are not verified facts. Only three source records are approved; full catalog enrichment remains unfinished.

## Validation at pause

- Latest full suite: 63 passed, 1 emulator-only test skipped.
- Production build passed; git diff whitespace check passed.
- Code-only extraction pilot completed with zero AI calls.
- Desktop/mobile shelves visually inspected; viewport override reset. Final detail/related navigation check incomplete after browser locator failures and user interruption. Current user tab is Ammar Vol.1 detail.

## Next steps, in order

1. Finish one focused browser check: contents disclosure, related-title navigation, View all collection navigation, mobile top-of-page layout. Related cards now say View DVD rather than showing cached availability. Capture a final screenshot and run the Impeccable detector on changed UI targets.
2. Review the current diff, especially extraction budget validation, source identity checks and new external-data integration. Optional AI API integration has not been live-tested; keep it off unless a model and budget are explicitly configured.
3. Update existing PR #1 with honest coverage and validation after final review. Do not deploy as part of this checkpoint.
4. Continue enrichment in small reviewed batches. Source acquisition is currently manual/permitted exports or research notes; the program does not fetch blocked retailer/Conjuring Archive pages. Seek a permitted acquisition interface before automating collection. Prioritize sparse records and resolve edition mismatches.
5. Evaluate search/recommendations with known trick queries before spending on vector embeddings. Keep browsing API-free and uncluttered.

## Local commands

Use Node 22 (`/opt/homebrew/opt/node@22/bin` first in PATH).

```sh
npm run dev
npm run catalog:extract -- data/research/captures
npm run catalog:prepare-embeddings
npm test
npm run build
```

The existing local preview was running at http://127.0.0.1:5173/. Preserve ignored environment credentials and research cache; never publish keys or user data.
