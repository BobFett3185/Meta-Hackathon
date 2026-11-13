# Nest profile and matching integration

The merged UI uses main?s Supabase/Muse search flow; the new personal profile remains local. `nestService.saveProfile` validates and persists profiles using AsyncStorage; it does not publish profiles or update `fb_users`. Profile visibility and discovery opt-in are saved intentions, not a claim that a profile is already discoverable.

## Profile payload (version 1)

| Field | Meaning |
| --- | --- |
| userId | Existing mock Facebook user ID returned by getMe |
| introduction | User-authored introduction; required, trimmed on save |
| aboutMe | User-authored habits and interests; unknown when blank |
| lookingFor | Desired roommate traits; separate from personal habits |
| originalText | Original moving goal, preserved verbatim |
| desiredPreferences | Goal preferences such as Quiet home; not personal traits |
| housing | city, neighborhoods[], startDate, endDate, budgetAmount, budgetBasis, roommateCount, alreadyHasHome |
| appearance | color: periwinkle/rose/seafoam; accessory: none/headphones/leaf/coffee |
| visibility | private or roommates |
| discoveryOptIn | Explicit boolean; forced false for private profiles |
| updatedAt | ISO timestamp |
| persistence | Currently local; backend adapter should report acknowledged sync separately |

Appearance must never enter matching. Do not infer self-description from desired traits. Unknown values must remain unknown. The original text and personal fields are not sent to an AI by this UI.

## Service boundary

- `getState()` hydrates profile, profileDraft, goal, selections, and saved items.
- `getIdentity()` reads the existing mock identity.
- `saveProfile(profile)` returns the confirmed locally stored payload. Replace/extend this with an authenticated Supabase upsert keyed by userId when available. Return the actual persistence outcome; update visibility copy only once publishing exists.
- `saveGoal(goal)` saves locally and attempts the existing nest_preferences upsert. A cloud failure returns persistence=local-only instead of blocking the demo. It is surfaced in the UI. No cloud retry queue exists yet.
- `getHomeMatches(goal)` and `getRoommateMatches(goal)` call the existing `/api/search` endpoint. They preserve main?s live results, errors, and empty states.
- New profile drafts autosave separately from the confirmed profile. They never imply discovery consent or publication.

## Integration tasks

1. Provide authenticated profile storage with ownership policies; do not rely on the mock user's name lookup in production.
2. Enforce visibility AND explicit discoveryOptIn before returning profiles to others.
3. Parse natural-language traits into proposed fields, validate them, and get user confirmation; preserve raw text.
4. Extend the existing `roommate_profiles` table for introduction/aboutMe/lookingFor and upsert a `source: self` profile. Preserve main?s source-grounded search; no separate competing profile store is needed.
5. Return actual compatibility evidence and unknowns; do not invent scores.
6. Connect profile publishing and report failures without mislabeling local persistence as cloud success.
7. Replace the clearly labeled schematic map with a geographic provider before displaying real addresses. Map and gallery share listing IDs; current pins are illustrative positions.

## Validation

`node --test src/nest/matching.test.mjs src/nest/profile.test.mjs`

`node scripts/nest-personality.cjs` against the production web preview verifies local profile persistence, appearance, explicit discovery opt-in, roommate results despite a simulated cloud 503, map/gallery selection, and detail return at 375 and 390 pixels. REST calls are mocked; no connected database is mutated by these checks.

Native Expo Go remains the authority for gesture feel, haptics, keyboard behavior, and hardware Back. Web captures do not verify those.
