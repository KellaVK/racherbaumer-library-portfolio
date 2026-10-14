# My Library and recommendation controls

Members can save a DVD to Want to watch, star it as a favorite, or mark it watched.
These flags are independent and reversible. Saving never creates a checkout or reserves
an item. Personal shelves live at /library; existing loans and requests remain at /profile.

Guests save in localStorage on the current browser/origin. Signed-in accounts use
users/{uid}/library/{dvdId}. No guest data is silently copied into an account.
An entry contains boolean wantToWatch/favorite/watched/dismissed flags and updatedAt.
Firestore rules reject other fields, non-boolean flags, nonexistent DVDs, and cross-user
access (including access by an admin to someone else's personal shelf).

Recommendations exclude dismissed DVDs and, by default, watched DVDs. Explicit reference
DVDs take precedence over favorite seeds. Subject/setting remain soft preferences. The
system chooses up to three distinct suggestions and favors variety when scores are close.
Match reasons refer to the existing source evidence, not a claim of verified suitability.
More like this changes the reference. Not for me is reversible through Undo or Hidden
suggestions. Show three more excludes the currently shown set until Start over or a
preference change. None of these operations calls an AI API.

## Verification and release
- npm test: component, persistence, recommendation and service tests.
- npm run build: production bundle.
- node scripts/evaluateRecommendations.js: offline category coverage, not a quality benchmark.
- firebase emulators:exec --only firestore --project demo-library-test 'npm run test:rules':
  isolated security checks. Uses a demo project and never writes production data.
- Publish Firestore rules before the frontend; verify two separate accounts cannot read
  each other's shelves and test saves from two devices in staging.
- Existing admin summary generation is separate; this change does not invoke or alter it.

The meeting checklist is under Admin → Checkouts and contains private borrower names.
Printing is a deliberate admin action. Requested DVDs are labeled unapproved; active
loans are a return-check list. It does not assume all requests can be fulfilled.
