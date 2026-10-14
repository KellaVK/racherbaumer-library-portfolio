> **Update (October 14):** The whole-catalog command is implemented. See [Automatic research](AUTOMATED-RESEARCH.md) for operation and the verified coverage limits. The first full pass accounted for all 637 DVDs but added no new reliable matches because matching DVD sources were unavailable.

# Source research and extraction

The research pipeline enriches DVD discovery without making AI calls during browsing. Code handles identity checks, structured extraction, caching and validation. An optional Claude call handles unstructured text. Every result requires human review before publication.

## Current coverage

The lookup inventory tracks all 637 catalog titles. Initial indexed searches covered 192 titles; 445 remain unsearched. Search candidates are not verified matches. The initial three examples have been expanded into a ten-DVD comparison pilot: seven reviewed catalog matches, 53 named contents, and three held records. See the DVD-by-DVD pilot section below. This is not complete catalog enrichment.

Conjuring Archive disallows automated access to its catalog for relevant crawlers. Retailer bulk requests were rejected during research. The program does not fetch pages or bypass restrictions. Supply permitted exports, manually captured permitted material, or concise research notes from accessible sources. A future acquisition adapter needs an allowed API/export or permission from the source.

## Free default run

From the repository root with Node 22:

```sh
npm run catalog:extract -- data/research/captures
```

Each JSON capture contains `dvdId`, HTTPS `url`, `pageTitle`, `creator`, `format`, `access`, and `text`. Access is `permitted_export`, `manual_capture`, or `research_notes`. Only the three requested source domains are accepted. The examples contain concise researcher notes, not copies of retailer descriptions.

Structured lines beginning `Trick:`, `Prop:`, `Setting:`, `Format:`, or `Technique:` are parsed without AI. Results include character offsets into the capture for review. Cache and per-run ledgers live in ignored `.cache/catalog-research`. Identical input/model/version combinations reuse cached results.

Title, creator, DVD format and volume checks identify likely matches. These checks do not prove identity. Review ambiguous sets, alternate editions, downloads, and title collisions manually. Never infer contents solely from a magician's reputation or another volume.

## Optional AI

Supply `--ai-config /path/to/config.json` and set `ANTHROPIC_API_KEY` in the environment. Do not commit the key. Config requires all of:

- `model`: an available Claude model identifier
- `inputUsdPerMillion`, `outputUsdPerMillion`: current provider prices, verified by the operator
- `maxUsd`: estimated budget for this run
- `maxCalls`: integer from 1 through 50
- `maxOutputTokens`: integer from 1 through 4000

AI runs only when structured extraction finds no facts and identity checks pass. Input is bounded, output tokens are capped, retries are disabled, and estimated spend is reserved and recorded before each request. A lock prevents simultaneous runs. Failed requests retain their reservation. A new run has a new budget; review previous ledgers before rerunning. Only remove a stale lock after confirming no extraction process is active.

The dollar limit is an estimate using operator-supplied rates, not a guaranteed provider billing cap. Use provider-side spending controls as well. No paid API call has been made to validate the optional provider integration; code-only extraction and budget logic are tested.

## Review and publish

Inspect every extracted fact against its source span and actual source. Valid offsets alone do not prove a paraphrase is accurate. Keep short factual descriptions and trick names; do not reproduce marketing copy or magic methods. Distinguish props mentioned from a complete supply list. Do not invent difficulty, reset time or audience suitability.

Approved records are entered into `src/data/external-enrichment.json` with exact catalog title/creator, `reviewed_source_match`, source URL, date, edition caveat, and `independentlyVerified: false`. This status means the source match was reviewed, not that someone watched the physical DVD. The extractor never publishes automatically.

Reviewed records feed normal search, topic shelves, related titles, and embedding preparation:

```sh
npm run catalog:prepare-embeddings
npm test
npm run build
```

Embedding files retain source provenance and exclude unreviewed AI summaries by default. No vector embedding API is called. Hashes allow later embedding only changed documents.

## Next batches

Prioritize titles with sparse descriptions and popular creators. Work in small reviewed batches, record unresolved editions in the lookup inventory, and expand trick-level coverage before paying for embeddings. Add a permitted acquisition adapter when source access allows it, then a review interface if the JSON queue becomes cumbersome. Evaluate search against known trick/title queries before introducing a vector service.

## DVD-by-DVD comparison pilot

`data/research/batches/pilot-01.json` is the reviewed input for the first ten DVDs. It keeps each source's scope, access method, named contents, props and lookup outcome separately. Seven records have usable reviewed matches; three remain on hold. The batch includes 53 named contents. Conjuring Archive searches returned no usable DVD contents for this batch (Ammar results were magazine-review references). No Archive catalog scraping was performed.

```sh
npm run catalog:research
# After factual and edition review, explicitly update the website overlay:
npm run catalog:research -- --publish
npm run catalog:prepare-embeddings
```

The default comparison run writes `data/research/compiled/comparison.json`, `review.html`, and `trick-documents.jsonl`. It does not publish. The HTML is a readable source-comparison report. The JSON retains the source evidence. The 53 trick documents are ready for future embeddings, each carrying a DVD ID, source URLs and a content hash; no embedding service is called. Description text remains blank when a listing only supplies a name. DVD-level prop mentions are not assigned to every trick.

The compiler deduplicates names conservatively, retains source-specific credits and holds conflicting creator credits for review. Missing entries are not contradictions. Two retailer URLs can repeat the same publisher description; their agreement does not establish independent accuracy. The publication flag updates only eligible records and preserves unrelated existing records. A newly held record does not remove an older published record automatically; inspect and remove outdated evidence explicitly when required.

### Import a saved product page

A local HTML importer is available for pages obtained through permitted access. It parses one explicitly chosen product section, strips scripts/navigation/forms, preserves list boundaries and executes no page scripts. It does not fetch pages, bypass restrictions, or select product facts automatically.

```sh
npm run catalog:import-html -- /path/to/saved-page.html /path/to/metadata.json
npm run catalog:extract -- .cache/catalog-research/captures
```

Metadata must contain `dvdId`, `url`, `pageTitle`, `creator`, `format`, and a `selector` identifying exactly one product-description section. Keep the original source heading in `pageTitle`; do not replace it with the desired catalog title to force a match. Captures stay in ignored cache storage. Extraction output still requires review into the batch schema; it is not an automatic source of approved website facts.

Automated network acquisition remains unfinished because the requested sites restricted direct scraping. Next work should obtain an allowed export/API or permission, then add a slow cached acquisition adapter. Until then, use targeted indexed product-page research or permitted saved HTML, and record every missing or ambiguous source. Do not present this ten-DVD pilot as a complete research pass over 637 DVDs.
