# Verification record — October 14, 2026

## Requirement evidence

| Requirement | Evidence |
| --- | --- |
| Collect and understand messy sheet data | Sanitized `scripts/catalog-source.json`; tab/row provenance; `docs/catalog-reconciliation.json`; source sheets unchanged |
| Reconcile the different live app catalog | 637-record descriptive snapshot; 617 source rows joined to 598 titles; 7 unmatched and 30 creator-conflict rows withheld |
| Improve search using notes and AI descriptions | `src/utils/discovery.js`, generated enrichment, query-hook integration, source snippets, detail-page notes |
| Suggest titles based on preferences | Browser-local interests, level, setting, reference-title controls; content-based ranking and reasons; storage/reset tests |
| Plan then implement | `docs/plans/catalog-discovery-design.md` records design, options, implementation sequence and evolving evidence |
| Consider embeddings accurately | Lexical vectors implemented for similarity; neural embeddings assessed as a future option, not claimed as implemented |
| Preserve library operations | Existing service tests pass; no checkout/auth/schema modifications; sign-in-to-borrow link verified on the detail page |

## Automated checks

- `npm test`: 41 tests passed across 13 files.
- `npm run test:search`: intended title in top five for 20/20 curated cases,
  compared with 10/20 for the prior Fuse configuration. Exact-display-title audit:
  all 637 catalog records retrieved in the top five. Cases informed development;
  they are not a held-out user evaluation.
- `npm run build`: production frontend build passed.
- Descriptive data checked for contact-patterns and excluded personal/borrower fields.
- New reconciliation tests cover duplicate aggregation, creator conflicts, unknown
  values, ambiguous titles, volume separation, explicit aliases and stale-title joins.
- Query and UI tests cover old-era filtering, live availability constraints,
  preference resets, malformed/blocked storage, and source-note display.

## Browser checks

Local preview connected read-only to the live public DVD collection:

- Loaded all 637 titles.
- “coin purse routine” found Neo Purse Frame Routine.
- “card case changes bill business card” found M-Case with a catalog-notes snippet.
- Opening M-Case displayed the new collection note and `In Progress Additions,
  row 2` provenance, its existing AI summary, and its sign-in-to-borrow entry point.
- Back-to-library link retained the originating search query.
- Coins + Beginner preferences produced explained suggestions; adding Close-up
  changed the ranking and labeled AI-description evidence where used.
- Preferences survived a page reload; the reset action is covered by the UI test.
- Phone viewport 390 × 844 showed stacked controls, wrapping interest choices,
  and no horizontal overflow (document width 386 versus viewport width 390).
- Browser console had no captured errors in the final preview checks.

## Boundaries

No sheet, Firestore record, checkout, account, or production deployment was changed.
No paid model/embedding requests were made. Actual authenticated checkout submission
was not exercised; existing mocked checkout service tests passed. Source conflicts
and incorrect AI descriptions remain visible in the review report and must not be
mistaken for verified catalog facts. The feature branch is ready for code review
and a separate production release decision.
