# Library improvement roadmap

## Product direction
Help club members find something worth learning, remember it, and borrow it with
minimal effort. Keep the catalog page focused on search and three suggestions;
place personal organization in My Library and administration in the existing admin area.
These are planned improvements, not shipped features, except for the baseline below.

## Baseline shipped in this branch
- Spreadsheet-derived descriptive notes remain part of the search/recommendation index.
- Up to three clickable suggestions, with subject/setting treated as soft preferences.
- Both subject and setting matches rank first, followed by partial matches; experience
  is a lighter ranking signal. Availability and other explicit catalog filters still apply.
- Match reasons describe evidence actually present. No random padding when evidence is absent.
- Categories and notes are labeled as unverified without exposing spreadsheet row details.

## Phase 1: Make recommendations measurable and useful
1. Build a judged set of realistic member requests: beginner coins, walkaround material,
   family shows, advanced cards, similar to a favorite DVD, and sparse combinations.
   Ask two or more club members to judge the top three for usefulness. Keep a held-out set.
2. Measure useful results in the top three, empty-result rate, topic/venue coverage,
   duplicate volumes, and latency. Compare against the current lexical system.
3. Normalize metadata: distinguish props (cards, coins), venue (stage, close-up), format
   (lecture, performance, tutorial), and experience. Preserve unknown values rather than
   guessing. Retain internal provenance and allow admin corrections.
4. Prefer variety within the three slots when relevance is comparable: avoid three
   volumes of the same course or the same performer. Do not sacrifice a strong match
   solely for variety. Add a “Show three more” action that excludes already shown titles.
5. Add “More like this” and “Not for me” on suggestions. Use reversible actions and
   explain why a suggestion appeared. Favor explicit feedback over mere clicks.

Acceptance: stronger judged top-three usefulness without increasing empty results;
no hard-filter violations, fabricated match reasons, or duplicate IDs. Sparse metadata
must not imply that a DVD is unsuitable.

## Phase 2: My Library — wishlist and favorites
- “Want to watch”: a private wishlist of titles to explore or borrow later.
- “Star favorite”: a private liked-title signal, distinct from a five-star review rating.
- “Watched”: optional history and an easy way to exclude completed titles from suggestions.
- Put controls on the DVD detail page; add a small save control on catalog cards only
  if it does not make the page busy. Keep wishlist, favorites, and watched views together.
- Wishlist saves do not reserve a DVD, join a waitlist, or send a borrowing request.
  Keep “Request to borrow” a separate deliberate action.
- Start with existing DVDs. A later “Suggest a title for the collection” feature can
  support items the club does not own without mixing them into available stock.

Implementation outline: user-owned Firestore entries under users/{uid}/library/{dvdId},
with independent favorite, wantToWatch, watched flags and timestamps. Use stable DVD IDs,
not titles. Rules must enforce owner-only access, allowed fields/types, and valid title IDs.
Test cross-user denial, signed-out behavior, duplicate saves, deletion, and synchronization.
Private notes can follow later with an explicit length limit. Never put personal feedback
or borrowing identities into the public catalog or public enrichment files.

Acceptance: saves survive sign-in on another device, remain private, are reversible,
and never alter checkout availability. Favorites can seed recommendations and watched
items can be hidden without eliminating all discovery options.

## Phase 3: Hybrid semantic recommendations
Embeddings are a planned experiment, not currently implemented. The present related-title
feature uses lexical vectors; it does not use a neural embedding model.

- Embed sanitized title, performer, descriptive spreadsheet notes, contents, and reviewed
  tags. Keep AI summaries separately identified and lower-trust. Exclude borrower details,
  contact information, private comments, and account activity from catalog embeddings.
- Generate catalog vectors in a batch, keyed by content hash and embedding model version.
  Recompute only changed records. Retain a reproducible index snapshot and rollback path.
- Combine exact title/performer matches, lexical retrieval, concept matches, and semantic
  similarity. Exact queries should retain their known-title behavior.
- Retrieve a broader candidate pool, apply hard availability filters, rerank for preferences
  and confidence, diversify, and return only three. Semantic similarity alone must not be
  presented as proof that a DVD is suitable for children or a particular skill level.
- Use several favorites as recommendation seeds; allow users to reset personalization.
  Avoid collaborative filtering initially: the club has too little feedback to validate it.
- Benchmark a local and a hosted embedding option before selecting one. Record model,
  index size, cost, latency, and judged usefulness. For this small catalog, start with a
  simple stored vector index; do not assume a separate vector database is necessary.
- Keep provider credentials on a backend. If embedding free-form requests externally,
  disclose that processing and never include private account notes by default.

Acceptance: beat the lexical baseline on held-out top-three relevance while retaining exact
lookup quality, graceful offline/provider-failure fallback, and acceptable measured latency.
Adopt embeddings only if the improvement is worth the operational cost.

## Phase 4: Borrowing and collection quality
- My loans: current requests, checked-out items, and a clear pickup/return status.
- Admin meeting list: who requested which DVD, with private access and printable output.
- Availability reminders and waitlist notifications only with member opt-in; deduplicate
  messages and stop them when a request is canceled or fulfilled.
- Report incorrect information on a DVD; route corrections to an admin review queue.
- Identify missing descriptions, duplicate records, and conflicting category labels in an
  admin quality dashboard. Keep the original source alongside reviewed corrections.
- Document backup/export and restoration; rehearse a restore without overwriting production.
- Improve keyboard navigation, readable contrast, mobile tap targets, and clear empty states.
- Integrate authorized digital playback later with membership access and separate physical
  and digital availability. Do not show a watch action until playback is actually available.

## Suggested order
1. Judge and tune the three-result baseline; normalize the most useful metadata.
2. Ship wishlist and starred favorites with ownership rules and synchronization tests.
3. Add feedback, watched filtering, and recommendation diversity.
4. Benchmark hybrid embeddings against the held-out scenarios.
5. Improve meeting/loan workflows and collection correction tools based on member feedback.

Defer public ratings, social feeds, badges, and elaborate recommendation settings until
members demonstrate a need. They add clutter and have weak signal with a small user base.
