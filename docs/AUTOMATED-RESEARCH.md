# Automatic whole-catalog research

Run from the repository folder in VS Code's terminal, with Node 22 and dependencies installed:

```sh
npm run catalog:pipeline
```

This runs through **all 637 saved DVDs** without batch prompts. The terminal must remain running; the Mac must remain awake. It is not a hosted background service. If interrupted, run the same command again: completed DVD results and downloaded pages are reused. No paid AI service or API key is used.

## What it does

1. Uses the checked-in, sanitized catalog snapshot, avoiding repeated Firestore reads. `--refresh-catalog` explicitly requests the latest public catalog; failures leave the existing snapshot/cache intact.
2. Downloads Conjuring Archive's publication index, once per cache period, with five seconds between requests. Kella reports explicit permission for automated Conjuring Archive access. The crawler identifies itself and excludes trap links.
3. Discovers retailer product URLs from allowed sitemaps and previously collected candidate URLs. Retailer robots rules remain applicable; access errors stop further requests to that host. No challenge bypass or alternate identity is used.
4. Matches title, magician, volume and format. Books, magazine reviews, downloads, conflicting credits and different editions are withheld. A matching phrase alone does not establish that a trick is on your DVD.
5. Extracts supported contents lists and explicit prop requirements, retaining short descriptions, source URLs and evidence locations. Machine matches are labeled automatically matched, never human reviewed.
6. Writes a report for every DVD and per-trick embedding-ready JSONL. On a complete pass, eligible matches update `src/data/machine-enrichment.json`. Existing manually reviewed entries take precedence in the website and embedding exporter.

A **completed pass means all catalog rows have outcomes**, not that every DVD has researched contents. Missing candidates, access failures and uncertain identities remain explicit. The script does not upload vectors, call an AI model, modify live Firestore or deploy GitHub changes.

## Commands

```sh
# View saved progress
npm run catalog:pipeline -- --status

# Rebuild reports using only cached source pages
npm run catalog:pipeline -- --offline --no-publish

# Retry unavailable sources after their access problem has been resolved
npm run catalog:pipeline -- --retry-failed

# Rebuild the combined DVD-level embedding-ready catalog
npm run catalog:prepare-embeddings
```

The default full run publishes eligible data **locally**. Commit/push and the normal Cloudflare deployment are separate. `--no-publish` keeps the website overlay untouched. A partial run never replaces that overlay. The developer-only `--limit` option is not necessary for routine use.

## Outputs

- `data/research/automated/report.html`: open in a browser for every DVD and its source outcomes.
- `data/research/automated/results.json`: structured source comparisons and failure reasons.
- `data/research/automated/summary.json`: coverage counts.
- `data/research/automated/trick-documents.jsonl`: one document per newly eligible trick, with stable IDs, provenance and content hashes for future incremental embedding.
- `src/data/machine-enrichment.json`: eligible website contents; the existing search bar indexes these descriptions and trick names.
- `.cache/catalog-pipeline/`: local catalog copy, publication index, fetched pages, per-DVD checkpoints, source circuit breakers and process lock. Excluded from Git.

Do not delete a live process lock. A stale lock from a terminated process on the same computer is recovered automatically. Only one pipeline process can write to a workspace at once.

## Verified run: October 14, 2026

A full run accounted for 637 catalog DVDs and indexed 3,738 Conjuring Archive publications. Outcomes: 7 previously reviewed, 81 identity candidates needing review, 467 with no candidate from available inputs, and 82 with unavailable candidate sources. **Zero new reliable machine matches were found.** The retailer requests returned HTTP 403, and the archive publication index did not yield matching DVD editions. A cached repeat made zero network requests. These counts are not evidence that those DVDs have no online information.

The seven existing reviewed entries remain intact, including searchable named tricks such as Las Vegas Leaper. More reliable enrichment needs an accessible DVD source: for example, a permitted source export/API or retailer access/feed. A generic publication index is insufficient. The pipeline is implemented, but the source-coverage obstacle is unresolved.

## Limits and maintenance

The deterministic retailer parser supports explicit contents lists in product-description markup. Arbitrary prose, PDF catalogs and changed markup may yield no structured contents; it intentionally does not invent them. Conjuring Archive rows exclude reviews. Discovery checks up to 100 sitemap pages per run and records remaining work if that ceiling is reached. Existing cached successful pages are reused; failed pages are cached for a day and host denials persist until `--retry-failed`. The archive index is reconsidered after 30 days, using cached pages where available.

The input snapshot is a fixed catalog export; new DVDs require `--refresh-catalog` or an updated snapshot. Optional Claude extraction elsewhere in this repository is separate and is not invoked by this unattended pipeline.

## Source-coverage follow-up

Checked the public homepage and FAQ on October 14, 2026:

- https://www.conjuringarchive.com/ reports 3,738 publications, exactly matching the pipeline's 3,738 unique publication URLs. The downloaded index classifies 3,581 as books and 157 as magazines. This corroborates full public-index discovery; it does not prove that private or future DVD records do not exist.
- https://www.conjuringarchive.com/faqs states that no public API or database export is currently available. Kella's reported explicit permission remains the basis for the authorized archive access; the general public policy is not being treated as revoking that permission.
- A special dataset or access arrangement from the permission contact remains unconfirmed. Standard public API integration is therefore not an available next implementation step.

The outstanding requirement is successful DVD-source acquisition, followed by real-data validation of extracted contents and cross-source comparison. Green tests and an all-row outcome report do not prove that requirement complete. The draft PR is intentionally not deployed as a completed enrichment release.
