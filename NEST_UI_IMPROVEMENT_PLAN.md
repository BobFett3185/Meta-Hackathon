# Nest UI improvement implementation brief

## Objective

Make Nest feel memorable, tactile, and personal while preserving the existing Facebook shell, screen designs, and Homes / Roommates / Community navigation.

Prioritize making Squishy the user's personal Nest avatar, then polish the gallery and map around it.

Main demo journey: Introduce yourself → personalize Squishy → review your roommate profile → find homes and people → explore your neighborhood.

Work within the existing Expo / React Native application. Inspect the current implementation before making changes. Preserve unrelated work and existing functionality.

## 1. Squishy becomes your Nest identity

### Appearance

- Default body: soft periwinkle.
- Eyes: deep blueberry.
- Preserve the rounded, squishy silhouette, tiny face, and soft shadow.
- Create consistent resting, pressed, happy, curious, and thinking expressions.
- Keep movement brief and intentional; avoid perpetual bouncing.

### Profile entry point

Make the header mascot a button that opens Your Nest profile, containing:

- Existing user name and photo.
- A larger personalized Squishy.
- Introduction.
- Destination, moving dates, and housing situation.
- Budget and desired roommate count.
- About me: the user's own living habits and interests.
- Looking for: desired roommate traits.
- Profile visibility and roommate-discovery opt-in.
- Edit profile and customize Squishy actions.

Squishy represents the profile; underlying data remains attached to the user's ID.

### Customization

- Periwinkle by default, plus a few curated body colors.
- Blueberry eyes across all variants.
- One optional accessory: headphones, leaf, or coffee cup.
- Live preview and a clear Save action.
- Store appearance separately from matching preferences. Colors and accessories must not affect compatibility.

### Profile creation flow

1. User writes an introduction and roommate preferences.
2. Nest presents a profile preview.
3. User reviews About me separately from Looking for.
4. User confirms what will be visible to potential roommates.
5. Update profile and find roommates saves the profile and starts matching.

Preserve original text. Unspecified habits remain unknown rather than becoming invented traits.

Use a profile service with local persistence for the demo and a clear Supabase adapter contract. Distinguish local demo saves from confirmed backend saves.

## 2. Give Squishy useful jobs

| Moment | Role |
| --- | --- |
| Welcome | Introduces the moving journey |
| Header tap | Opens the user's Nest profile |
| Profile saved | Brief happy squash |
| Searching | Thinking expression beside actual loading status |
| Match explanation | Accompanies reasons a result fits |
| No exact matches | Helps explain which requirements could be adjusted |
| Home selected | Welcomes the user into neighborhood discovery |

Use truthful progress messages. Do not simulate completed AI analysis or invent match reasons. Keep important actions understandable without relying on the mascot or animation.

## 3. Polish the circular housing gallery

Preserve the centered card and gently angled neighbors.

### Gesture behavior

- Cards track the finger continuously.
- Center card lifts subtly through scale and shadow.
- Neighboring cards stay visible with restrained angles.
- A short flick advances one card.
- A slow drag settles predictably.
- Small movements snap back without accidentally opening details.
- Rapid repeated swipes remain stable.
- Vertical scrolling works naturally.
- Circular navigation supports one, two, or many results.

### Feedback

- Light mobile haptic when a new card settles.
- Respect device support and reduced-motion settings.
- Price and neighborhood remain readable during movement.
- Card, pagination, and map pin share one selected listing ID.

### Detail transition

Animate the selected photo into the home-detail hero and reverse on return. Prototype in Expo Go first. If a true shared-image transition requires incompatible native dependencies, use a coordinated image overlay and fade with a reliable reduced-motion fallback.

## 4. Soft neighborhood map

### Visual treatment

- Warm ivory land and streets.
- Pale blue water.
- Muted green parks.
- Quiet secondary labels.
- White price pills with subtle shadows.
- Facebook blue selected price pin.
- Preserve the compact inline placement beneath the gallery.

### Interaction

- Swiping selects the corresponding pin after the card settles.
- Tapping a pin selects its gallery card.
- Selected pins lift slightly and receive a subtle halo.
- Pan only when needed to keep the selected pin visible.
- Avoid resetting zoom or moving the map on every small gesture.
- Expanded map preserves selection and viewport.
- Collapsing returns cleanly to the gallery.

### Geographic accuracy

Inspect the current renderer before selecting an implementation. Use real coordinates and an appropriate provider where available. If only a neighborhood is known, show and label an approximate location. Do not present decorative artwork as precise geography.

## 5. Roommate presentation

- Keep real profile photos prominent.
- Add each person's small Squishy as a secondary identity element.
- Show a concise introduction and confirmed living preferences.
- Separate shared preferences from unresolved questions.
- Explain compatibility with evidence, not arbitrary percentages.
- Show two Squishies together in the compatibility view with actual matching reasons beneath them.
- Make visibility and connection actions explicit.
- Do not automatically publish profiles or send connection requests.

## 6. Supporting interactions

- Card-shaped loading placeholders.
- Clear, recoverable error states.
- Bookmark animation, light haptic, and undo.
- Consistent photo crops and corner radii.
- Preserve selection and scroll position when returning from details.
- Gentle tab and sheet transitions.
- Keep sample homes visibly labeled when no exact demo matches exist.

## 7. Implementation order

1. Identity: periwinkle mascot, header profile entry, editable personality card, local persistence.
2. Personalization: color/accessory picker, profile preview, visibility controls.
3. Gallery: gesture refinement, stable snapping, haptics, selection synchronization.
4. Map: soft neighborhood styling, interactive pins, expanded-map continuity.
5. Transitions: card-to-detail photo animation, save feedback, purposeful mascot reactions.
6. Demo polish: loading/error states, backend contracts, device testing and visual review.

Complete and verify each phase before expanding scope. Start with Phase 1: Squishy should become meaningful before adding more animation around him.

## 8. Acceptance criteria

- Profile and appearance survive an app restart.
- About me and desired roommate traits stay separate.
- Customization never changes matching results.
- No personal text is lost when switching intake modes.
- Gallery and map always select the same listing.
- Swipes feel smooth on an actual phone in Expo Go.
- No accidental card opening after dragging.
- Reduced-motion mode preserves functionality.
- Every visible action works.
- Save status reflects whether persistence actually succeeded.
- Capture and visually inspect screens at 375- and 390-pixel widths.
- Test native gestures and haptics on-device; browser testing alone is not verification.

## Execution instructions

Treat this document as an implementation brief when explicitly asked to implement it. Saving this plan alone does not authorize starting the implementation.

Inspect existing code and backend contracts, implement in the phase order above, run appropriate checks, and report what was verified and what still needs native-device or backend testing. Do not claim visual fidelity without inspecting rendered screens.
