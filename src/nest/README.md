# Nest integration handoff

## Merged live backend (November 13, 2026)

The updated UI uses main?s live `/api/setup`, `/api/interpret`, and `/api/search` service. Supabase and Muse remain server-side behind the existing API; homes and roommates are not replaced by frontend fixture fallbacks. Community content remains a fixture. New profile/appearance edits remain local pending the `roommate_profiles` self-profile integration.

Merge validation: matching/profile and roommate unit tests pass; the service boundary regression checks API routing, search deduplication, retry, local profile migration and cloud failure reporting. iOS/Android/web bundles pass with `--no-bytecode`. Browser tests mock API responses and never mutate the connected database. Repository-wide TypeScript checks and the separate pre-existing backend-review tests have failures in unchanged main backend/configuration files; these are not certified by this merge.

## Profile and personality update

The header mascot opens ProfileScreen.js with a profile preview, introduction, About me, and Looking for fields. Saved is available through the profile link. Header Back and hardware Back share the profile close handler, including return to pending intake review. Squishy.js uses the clean alpha cutout on web only; native retains the approved original smiling periwinkle asset. Blueberry eyes, subtle rose/seafoam tint options, and icon accessories remain shared appearance features. Draft autosave remains separate from confirmed local Save. Visibility and discovery choices are intentions, not published profiles. See [PROFILE_BACKEND_CONTRACT.md](PROFILE_BACKEND_CONTRACT.md) for the payload and integration work.

Gallery.js continuously follows the finger with gentle rotations and interruptible spring settling. Memoized animation slots, threshold-based stacking, and stale-callback guards keep repeated drags continuous. PhotoFlight.js opens a measured photo overlay and measures the current hero again on dismissal; the reverse flight is skipped if the original image changed or is out of view. Opening clears previous transition references, and map-opened details return to the map. Reduced motion bypasses the flight. HomePhoto.js provides loading feedback and a labeled Sample photo fallback on error or timeout. NeighborhoodMap.js is a bright illustrated neighborhood with aqua waterfront, green shoreline/parks, cream land, pastel blocks, white roads, and a blue selected pin. Compact/expanded heights are 204/380 points; match qualification appears above the map. Squishy attaches to the selected pin and opens a guide sheet with selected home/neighborhood context and an Explore the map or View this home action. The expanded map includes a bottom photo/price/title/neighborhood preview. Its explicit sample-location caption is essential: no geographic provider or verified walking distances exist. HomeFit.js presents a small heading mascot, full-width evidence rows, sample status, mismatches including home-type/source constraints, and Still to confirm unknowns. Native haptics, gesture feel, keyboard behavior, and hardware Back still need device testing.

The implementation passed 13 matching/profile unit tests and all-platform Expo export with --no-bytecode. Mobile web captures at 375 and 390 pixels are in artifacts/nest/personality/. They do not establish native testing or pixel-exact reference fidelity.

Reported focused validation: scripts/nest-gallery-interruption.cjs passed at 375/390 pixels; scripts/nest-map-review.cjs passed at both widths, including sample-home mismatch criteria, with zero runtime errors. These are browser checks, not native validation.

## Intake and gesture refinement

`IntentSetup.js` makes the shared intake respond to its selected intent. Home exposes room/entire-home/either and furnishing; Roommate exposes existing-housing status, desired roommate count, and quiet-home preference; Both combines home and household controls. Hidden answers remain in the draft when switching modes. These choices persist through the existing goal adapter. Home type filters listings, and the selected intent controls which result sets are fetched. Roommate count is a requested household size, not proof of a formed household or group compatibility calculation.

`Gallery.js` replaces fade-and-replace paging with stable keyed cards, finger-following transforms, velocity-aware spring settling, circular paging, and short-swipe snap-back. Selection updates before storage is awaited; the selected ID still drives the map. Reduced motion skips the settling animation. The mascot is larger in the welcome/header, appears in intake guidance, and can be pressed to squish on the welcome screen.

Earlier refinement checks: nine matching unit tests; `node scripts/nest-refinements.cjs` covers all three modes, answer retention, mid-drag movement, stable card identity, circular navigation, map synchronization, and result routing at 375/390 widths. It stubs connected database requests rather than writing account data. Captures are in `artifacts/nest/refinements/`. Native swipe feel remains an Expo Go device check; web/iOS/Android JavaScript exports were checked without Hermes bytecode.

Nest is a contained Expo/React Native feature in the existing Facebook mock app. Open the Facebook menu, then **Nest**. One shared intake supports Home, Roommate, and Both; confirmed searches populate Homes and Roommates. Community uses the selected neighborhood and interests. Details, source posts, saved items with undo, map selection, and home-area confirmation are local interactions.

## Files

| File | Responsibility |
| --- | --- |
| `Nest.js` | Feature routes, tab state, async result state, persistence coordination, detail sheets |
| `Intake.js` | Shared writing/review sheet and focused preference editors |
| `screens.js` | Welcome, Homes, Roommates, Community, home/person details |
| `components.js` | Tokens, header/tabs, controls, sheets, circular gallery, illustrative map |
| `service.js` | Replaceable `nestService` adapter and AsyncStorage |
| `matching.js` | Pure interpretation, evidence evaluation, filtering, selection, saves |
| `fixtures.js` | Five homes, two roommates, one event, two community people, sources/default goal |
| `types.d.ts` | Domain shape declarations; runtime remains JavaScript |
| `assets.js`, `assets/` | Local generated image resolution and generated PNG assets |
| `assets/provenance.json` | Generated-asset prompts, methods, and illustrative-use notes |
| `matching.test.mjs` | Matching tests; profile.test.mjs covers profile validation |
| `DESIGN.md` | Feature-scoped visual contract and implementation notes |

## Run and inspect

From the repository root:

```powershell
npm install
npm run web -- --port 8085
npm run test:nest
npx expo export --platform web
npx expo export --platform all --no-bytecode
```

`npm run android` / `npm run ios` use the existing Expo workflow. With the web server running, `npm run capture:nest` runs `scripts/nest-capture.cjs`; `NEST_URL` overrides its default `http://localhost:8085`. The script currently expects Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe` and writes `artifacts/nest/*-375.png` and `*-390.png` (844px viewport height).

Run interaction checks with `node scripts/nest-interactions.cjs`; set `NEST_URL` to your server (this script defaults to port 8086), and optionally `CHROME_PATH` to your Chrome executable.

In development only (`__DEV__`), long-press the Nest wordmark for 700ms to select New user, Current results, Initial search loading, Refresh with existing results, No results, or Source error. These select presentation states; loading/refresh examples remain selected until another action. New user clears goal/draft, not all saved preferences. Production hides this selector.

## Service contract

All methods below return promises except `getSetup`. Domain names refer to `types.d.ts`. The concrete supporting shapes are:

```ts
type Saved = { homes: string[]; people: string[]; events: string[] };
type State = {
  goal: SearchGoal | null; draft: SearchGoal | null; saved: Saved;
  selectedId: string; mapMinimized: boolean; interests: string[];
  homeArea: string | null; communityArea: string | null;
};
type Source = { id: string; name: string };
type Setup = { defaultGoal: SearchGoal; sources: Source[]; cities: string[];
  areas: string[]; interests: string[] };
type RoommateMatch = RoommateProfile & {
  criteria: { criterionId: string; label: string;
    status: 'matched' | 'unknown'; explanation: string; evidence: string }[];
};
type SavedItem =
  | (HomeListing & { kind: 'home'; label: string })
  | ((RoommateProfile | CommunityPerson) & { kind: 'person'; label: string })
  | (CommunityEvent & { kind: 'event'; label: string });
```

| Method | Return type / behavior |
| --- | --- |
| `getSetup()` | `Setup` |
| `getState()` | `Promise<State>`; hydrates once |
| `interpretGoal(raw: string, base = setup.defaultGoal)` | `Promise<{ goal: SearchGoal; missing: string \| null }>` |
| `saveGoal(goal)` | `Promise<SearchGoal>`; stamps `updatedAt`, writes confirmed goal and draft |
| `getGoal()` | `Promise<SearchGoal \| null>` |
| `saveDraft(draft)` | `Promise<State>`; does not apply draft to active results |
| `getHomeMatches(goal)` | `Promise<HomeMatch[]>`; `{ listing, listingId, criteria, summaryReasons }` |
| `getRoommateMatches(goal)` | `Promise<RoommateMatch[]>` |
| `getCommunity(area, interests = [])` | `Promise<{ events: CommunityEvent[]; people: CommunityPerson[] }>` |
| `updateSearchSchedule(cadence, notificationsEnabled)` | `Promise<SearchGoal \| null>`; persists configuration only |
| `setSaved(kind, id)` | `Promise<State>`; toggles ID in `homes`, `people`, or `events` |
| `setHomeContext(area)` | `Promise<State>`; sets home area and clears community override |
| `updateState(values)` | `Promise<State>`; shallow state patch |
| `getSavedItems()` | `Promise<SavedItem[]>`; resolves saved IDs against the latest live results and community fixtures |

Home criteria include `criterionId`, `label`, `status` (`matched`, `not-matched`, `unknown`), `explanation`, and `evidence`. Roommate criteria use the same fields, with only matched/unknown statuses in the current adapter. Saving is separate from confirming a home area, and does not reserve a listing.

## Persistence and interpretation

`service.js` serializes state to AsyncStorage key **`nest.v2`**, with queued writes. It stores confirmed goal and draft separately, saved IDs, selected listing, map minimized preference, interests, home area, and community area override. Cadence and notifications preference live inside the goal. Results, result-fetch time, routes, loading states, and message drafts are not persisted. Malformed JSON resets to defaults; legacy `nest.demo.v1` profiles/drafts migrate without copying demo searches or listing IDs. Profiles and drafts are local. Goal saves attempt the existing nest_preferences upsert; cloud failure reports local-only and does not block local search. There is no retry queue. Store no secrets here.

Interpretation calls `/api/interpret`, which uses the existing server AI adapter. Setup defaults and sources come from Supabase through `/api/setup`.

Housing and roommate searches call `/api/search`; main?s server filtering, ingestion and roommate matching remain unchanged. Community events and people still use local fixtures. Demo matching helpers are retained for isolated tests, not used by the live service.

## Mock boundaries and API handoff

Housing and roommate content comes from server results with preserved source information. Community content is still fixture-backed. Local assets supply mascot art and labeled image fallbacks.

The live service is already integrated. The remaining profile handoff is to persist self-created profiles into `roommate_profiles` and include confirmed personal traits in matching. Current profile save does not publish a profile. Preserve server errors and empty results; do not silently substitute fixture matches.

Daily/weekly settings store user preferences. Main?s existing ingestion worker remains intact; the new UI does not add per-user notification delivery or scheduling. The UI result timestamp is the fetch completion time.

`NeighborhoodMap` draws illustrative streets and fixed pin positions; coordinates do not drive geographic placement, and there is no live map, geocoding, routing, or location permission integration. Contact opens an editable session-only preview: no message is sent or durably stored. Add an authorized messaging integration separately. Event details support saving, not real attendance, invitations, or joining; no attendance counts are fabricated.

## Validation status and limits

Thirteen matching/profile unit tests passed, covering preserved preferences, budget basis, shared gallery/map selection resolution, saved-state serialization/undo, unknown evidence, empty matches, unsupported prompts, and explicit neighborhoods. The unit save test is a pure serialization test; separate browser interaction checks verify actual saved-state persistence across reload.

Web production export passed. All-platform iOS/Android/web export with `--no-bytecode` also passed. Default all-platform export failed because the Windows Hermes bytecode compiler returned permission denied. The successful fallback verifies JavaScript bundles, not compiled Hermes bytecode or native runtime behavior.

Earlier implementation validation recorded that `scripts/nest-interactions.cjs` passed UI checks for Facebook menu/intake, gallery-map synchronization, selection after detail/back navigation, saved persistence across reload, minimized-map persistence, draft isolation, no-results behavior, and interests filtering. `scripts/nest-capture.cjs` captured all 15 states at both 375×844 and 390×844 with zero runtime errors; screenshots are under `artifacts/nest/`. These earlier captures are not evidence that the final personality update passed the same regression; the final personality regression is recorded below.

These browser checks exercise mobile web only. Native Expo Go validation remains for the user: software keyboards, safe areas, swipe gestures, and OS large text. Native emulator and screen-reader operation have not been validated. The supplied boards guided composition; generated substitute assets and lack of standalone reference files prevent a pixel-exact fidelity claim.

## Personality update verification (November 12, 2026)

- `npm run test:nest`: 13 tests pass for matching, profile separation, privacy normalization, and demo fallbacks.
- `npm run test:nest-ui`: passes at 375×844 and 390×844 with no runtime errors. Covers customization and profile persistence, explicit discovery preference, roommate save despite simulated cloud POST failure, correct result routing, drag and arrow navigation, map synchronization, map/detail return, one/two/five-card behavior, and a reduced-motion browser context.
- Final iOS/Android/web export passed using `--no-bytecode`. This checks bundling, not native execution.
- Rendered screenshots in `artifacts/nest/personality/` were inspected. Finish review cleared the four material issues after corrections. Native Expo Go motion, haptics, keyboard and hardware Back behavior still require on-device testing.
- Backend integration contract: `PROFILE_BACKEND_CONTRACT.md`. Profiles remain local and the map remains explicitly schematic.