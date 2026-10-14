# Source research and extraction

The research pipeline enriches DVD discovery without making AI calls during browsing. Code handles identity checks, structured extraction, caching and validation. An optional Claude call handles unstructured text. Every result requires human review before publication.

## Current coverage

The lookup inventory tracks all 637 catalog titles. Initial indexed searches covered 192 titles; 445 remain unsearched. Search candidates are not verified matches. Three reviewed source matches demonstrate the full workflow: Three Ring Concerto, An Extension of Me, and Easy to Master Card Miracles Vol.1. This is a pilot, not complete catalog enrichment.

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
