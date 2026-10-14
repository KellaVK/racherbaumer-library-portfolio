# Whole-catalog automated research pipeline

## Objective and operating decisions

Process every catalog DVD in one resumable command: acquire sources, resolve DVD identity, extract named contents/props/descriptions, compare claims, export usable research/embedding records, and update eligible website data. Kella explicitly reports permission from Conjuring Archive for automated access. Use a descriptive crawler user agent and a five-second per-host delay. Retailer access is separate: obey their robots rules, do not bypass 403s or challenges, record unavailable sources and continue.

No per-batch human approval is needed. Uncertain editions are quarantined automatically, not guessed. Machine matches are labeled as machine matches, never human-reviewed. Existing reviewed records are retained. No paid AI calls are required by the default pipeline. Existing optional AI extraction remains separately budgeted; unattended default must work without credentials.

## Implementation

1. Persistent workspace: configuration, cached HTTP responses, atomic progress and per-DVD results; exclusive process lock with safe stale-lock recovery; graceful interruption and restart. Per-host throttling, bounded retries, explicit failure classifications and circuit breakers.
2. Discovery: Conjuring Archive public publication index (following its own table-loading endpoints), product URLs already attached to the live public catalog and saved candidate inventory; retailer sitemap discovery where accessible. Avoid 637 blind trick searches. Record discovery coverage and blocked hosts.
3. Matching: normalize punctuation and volume markers, require title/creator/edition agreement; reject downloads, books and mixed-volume bundles unless an exact scoped section is available. A magazine review mentioning a DVD is not its contents.
4. Extraction: parse source-specific public DOM/structured data without executing scripts, retain source identity and provenance, preserve routine boundaries, extract only explicit props and short descriptions. Compare source claims and isolate contradictions.
5. Output: all-DVD status/report, structured comparison records, stable per-trick embedding documents with content hashes, and a separate machine-matched website overlay. Default run automatically exports eligible records; uncertain candidates remain in the report. No live Firestore catalog mutation.
6. Verification: parser and matching fixtures, HTTP/cache/retry behavior, interrupted-run resume and locking, full catalog run, second-run cache/no-repeat check, frontend search/build tests, operational documentation and GitHub delivery.

## Completion evidence required

- One command can account for all 637 current catalog records without manual batch requests.
- Every source outcome is explicit (matched, unmatched, blocked, error, ambiguous); blocked acquisition is not claimed as researched contents.
- Run can resume without losing completed work or repeating cached downloads.
- Machine facts are only published with exact identity evidence; reviewed records remain intact.
- Real permitted source requests and full run outputs inspected, not just synthetic tests.
- Source restrictions and any unresolved coverage clearly reported.
