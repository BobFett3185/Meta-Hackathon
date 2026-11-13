# Nest integration handoff

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
| `assets.js`, `assets/` | Local generated image resolution and seven PNG assets |
| `assets/provenance.json` | Generated-asset prompts, methods, and illustrative-use notes |
| `matching.test.mjs` | Eight focused pure-function tests |
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
type Setup = { demoGoal: SearchGoal; sources: Source[]; defaultPrompt: string;
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
| `interpretGoal(raw: string, base = demoGoal)` | `Promise<{ goal: SearchGoal; missing: string \| null }>` |
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
| `getSavedItems()` | `Promise<SavedItem[]>`; resolves saved IDs against fixtures |

Home criteria include `criterionId`, `label`, `status` (`matched`, `not-matched`, `unknown`), `explanation`, and `evidence`. Roommate criteria use the same fields, with only matched/unknown statuses in the current adapter. Saving is separate from confirming a home area, and does not reserve a listing.

## Persistence and interpretation

`service.js` serializes state to AsyncStorage key **`nest.demo.v1`**, with queued writes. It stores confirmed goal and draft separately, saved IDs, selected listing, map minimized preference, interests, home area, and community area override. Cadence and notifications preference live inside the goal. Results, result-fetch time, routes, loading states, and message drafts are not persisted. Malformed JSON resets to defaults; there is no schema migration or account synchronization. Store no secrets here.

The interpreter is a deterministic demo parser, not Muse or a general language model. It requires explicit Seattle, June and August, 2027, a numeric budget, and a basis (`per person`/`each` or `total`/`whole home`). Dates normalize to June 1–August 31. It recognizes South Lake Union/SLU and Capitol Hill, furnished/unfurnished wording, and quiet preference. Recognized unsupported neighborhoods request clarification; arbitrary geographic text is not comprehensively validated. Untouched fields inherit the supplied base; intent and other requirements are editable in review. Missing essentials preserve the raw input and return a clarification message.

Home filtering checks selected sources, budget **with identical rent basis**, full date coverage, neighborhood, and furnished requirement; it takes the first `maxResults` matches in fixture order. Preferences and utilities remain unknown when unsupported by source evidence. Other goal fields are not a complete production matching model. Roommate filtering requires the interns source, per-person budget, date coverage, and overlapping preferred areas. It does not calculate compatibility percentages. Community events rank by shared interests; people must explicitly have `openToMeeting` and match the area/interests. Capitol Hill currently has no results.

## Mock boundaries and API handoff

All listings, original post text, people, events, opt-in flags, and sources are fixtures. Source URLs are null, so original-post actions show local text. Local generated assets cover the mascot, one bedroom, market, and four portraits; their prompts and provenance are in `assets/provenance.json`. Four Unsplash bedroom URLs remain in galleries and need network access. These are substitute illustrations/photos, not exact board assets or verified real listings.

Replace `nestService` operations with authenticated API calls without importing fixture arrays into screens. Put real interpretation and search behind server endpoints, validate structured responses, preserve original post/source evidence, and keep credentials server-side. Introduce response metadata for server result timestamps and source-specific errors. Initial fetch must preserve the confirmed goal; refresh must retain existing results and their actual timestamp. Empty results must not loosen requirements. Unknown criteria must never become positive matches.

Daily/weekly settings currently store preferences only: no scraping, agent execution, cron, push delivery, or scheduled refresh occurs. Connect schedule changes to a server scheduler and notification-consent flow, and refetch on job completion/app resume. `Nest.js` currently obtains the timestamp when local result promises resolve; a real API must supply the relevant result freshness. Source-error demo copy identifies the mock source, but real errors need structured source attribution.

`MapAdapter` draws illustrative streets and fixed pin positions; coordinates do not drive geographic placement, and there is no live map, geocoding, routing, or location permission integration. Contact opens an editable session-only preview: no message is sent or durably stored. Add an authorized messaging integration separately. Event details support saving, not real attendance, invitations, or joining; no attendance counts are fabricated.

## Validation status and limits

Eight unit tests passed, covering preserved preferences, budget basis, shared gallery/map selection resolution, saved-state serialization/undo, unknown evidence, empty matches, unsupported prompts, and explicit neighborhoods. The unit save test is a pure serialization test; separate browser interaction checks verify actual saved-state persistence across reload.

Web production export passed. All-platform iOS/Android/web export with `--no-bytecode` also passed. Default all-platform export failed because the Windows Hermes bytecode compiler returned permission denied. The successful fallback verifies JavaScript bundles, not compiled Hermes bytecode or native runtime behavior.

`scripts/nest-interactions.cjs` passed actual UI checks for Facebook menu/intake, gallery-map synchronization, selection after detail/back navigation, saved persistence across reload, minimized-map persistence, draft isolation, no-results behavior, and interests filtering. `scripts/nest-capture.cjs` captured all 15 states at both 375×844 and 390×844 with zero runtime errors; screenshots are under `artifacts/nest/`.

These browser checks exercise mobile web only. Native Expo Go validation remains for the user: software keyboards, safe areas, swipe gestures, and OS large text. Native emulator and screen-reader operation have not been validated. The supplied boards guided composition; generated substitute assets and lack of standalone reference files prevent a pixel-exact fidelity claim.
