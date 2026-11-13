# Nest application and backend review

> Historical review, not a verification of current main. During the November 13 UI merge, the separate backend tests below failed and repository-wide TypeScript checks reported errors in unchanged backend/configuration files. The fixes and passing checks recorded in this November 12 review are not all present in current main. Keep this document and `scripts/backend.test.mts` as follow-up evidence; see `src/nest/README.md` for the merged UI validation.

Reviewed November 12, 2026. This covers source inspection, automated checks and live database reads, not a full interactive device test.

## Architecture

1. `App.js` is the Expo/React Native Facebook shell. `src/api.js` uses the public Supabase client for feeds, groups, likes, marketplace, notifications and the fixed mock user.
2. The menu opens `src/nest/Nest.js`. `Intake.js` collects a search; `screens.js` and `components.js` render homes, roommates, community and detail sheets.
3. `src/nest/service.js` resolves the API address and calls setup, interpretation and search. AsyncStorage stores goals, saved IDs and preferences.
4. `server/index.mts` is a separate HTTP server, normally on port 8787. `setup.ts` derives cities/groups/defaults from Supabase; `interpret.ts` asks Muse for a structured goal; `search.ts` filters extracted records with the shared home matcher and server roommate matcher.
5. `services/ingestion/run.ts` reads mock `fb_posts`, calls AI, deduplicates results and writes `nest_ingested_posts`, `nest_listings` and `nest_roommates`. Startup/timer, Realtime, search, CLI and API routes can trigger ingestion.
6. `services/ai/muse.ts` handles model calls; `validate.ts` normalizes extracted posts. Failed Muse post analysis falls back to `mock-ai.ts`. This fallback does not implement natural-language search interpretation.

The brief describes Next.js; the implementation is Expo plus a Node HTTP service. No migration was attempted.

## Fixed

- Windows dev startup now launches Node entry points directly and terminates its own child process trees. The old npm/cmd wrappers could leave servers alive after stopping. Failed children now cause a nonzero dev exit.
- Occupied API ports produce an actionable message rather than an unhandled error. Background ingestion starts after a successful bind. Both client and server support `EXPO_PUBLIC_NEST_API_PORT`.
- `/api/listings` database errors are caught. Invalid JSON/search goals return 400; bodies exceeding 1 MB return 413. Normal shutdown clears timers and unsubscribes Realtime.
- TypeScript now loads Node/React types. Database result types and validator callback types were corrected.
- Reprocessing a post no longer marks it as a duplicate of itself.
- Roommate requests are no longer mapped into available housing listings.
- Feed fallback now catches asynchronous decoration failures.
- Post creation reports missing seeded authors instead of accessing `undefined.id`.

Existing extracted rows were not rewritten. Mapping fixes apply on subsequent processing. `npm run ingest -- --rebuild` replaces derived listings using stored analysis without calling Muse; this was not run during review.

## Remaining findings

| Priority | Finding | Impact |
| --- | --- | --- |
| High | `server/interpret.ts` requires Muse. Mock extraction never sets `available_to`. | Full search flow is not reliable without Muse; mock listings generally fail date coverage. |
| High | Service-role API write routes lack user authentication; ingest secret is optional and mock database policies allow anonymous writes. | Keep this a controlled mock environment until authentication/authorization is implemented. Client-supplied user IDs are not verified identities. |
| High | Ingestion deletes derived rows for every attempted post, including failed analysis; it saves completion markers before derived records. | Failed analysis/partial writes can remove valid listings or mark incomplete processing as finished. Use atomic persistence and retain prior results on failure. |
| Medium | Concurrent ingestion callers await the current run while another is merely queued; queued options are lost. | New post creation may return before its analysis; a concurrent full reprocess may not perform the requested work. |
| Medium | Saved homes/people resolve only against the latest in-memory results. | Saved entries can disappear from the screen after a different search or restart. Resolve saved IDs independently. |
| Medium | Exact dedupe key can use neighborhood/rent/bedrooms/type without an address. | Separate apartments with similar attributes can be collapsed. Require stronger identifying evidence. |
| Medium | Search ignores housing type and household size; roommate criteria do not implement full lifestyle matching. Missing home start dates can pass string comparison if an end date exists. | Some visible preferences and unknown dates are not handled correctly. |
| Medium | Muse interpretation JSON is not runtime-validated; retries can take several minutes. | Invalid model output can fail intake; slow requests can leave users waiting. |
| Medium | Catalog and ingestion reads are not paginated. | Larger datasets can be truncated by Supabase's configured row limit. |
| Product gap | Community uses fixtures, contact is a local preview, maps are illustrative and notification schedules are local preferences. | Actual attendance, connection delivery, real maps and durable household formation remain unimplemented. |

## Verification

- TypeScript: passed (`npm run typecheck`).
- Matching: 8 tests passed (`npm run test:nest`).
- Backend: 3 tests passed (`npm run test:backend`), covering reprocessing, roommate exclusion, occupied ports/dev failure cleanup, invalid requests and survival after database failure.
- Web production export: passed (`npx expo export --platform web`).
- Read-only Supabase check: 209 listings, 61 roommate profiles, 12 sources and 5 cities returned successfully.
- No listener occupied port 8787 when inspected, so the original process could not be identified retrospectively.

No live Muse calls, seed runs, database rebuilds or full browser/native interaction tests were performed. Existing package changes were preserved.
