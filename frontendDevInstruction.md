
Build Facebook Nest inside my existing Facebook mock mobile app.

Act as a senior React Native engineer and product designer. Implement the screens and interactions described below using the attached approved mockups. Build working UI, navigation, local state, and deterministic mock data. Do not stop at a plan.

Read this entire specification before editing code.

1. SCOPE AND SOURCE OF TRUTH

The app uses an existing Expo/React Native mobile shell. Inspect the repository first and preserve its routing, package manager, existing Facebook screens, and conventions.

Nest is a feature inside Facebook that helps users:

- Find housing.
- Find roommates.
- Discover community events and people around their chosen neighborhood.

One shared intake powers housing and roommate searches.

Use the three attached image boards:
A. Welcome and shared intake.
B. Housing dashboard with centered circular gallery, compact map, and minimized-map state.
C. Home details, roommate matches, and community.

These images are visual references, not backgrounds to place behind fake buttons. Build actual components.

The written specification controls behavior. The images control visual composition. Exact tokens below take precedence over colors or proportions inferred from raster images.

Do not reproduce presentation-board titles, blue canvas backgrounds, phone frames, status bars, or “sample data” footers inside the app. Native safe areas and system bars come from the shell.

Do not redesign the approved experience. In particular:

- Keep the squishy cream mascot.
- Keep the centered circular housing gallery.
- Keep neighboring cards visible on BOTH sides.
- Keep the compact map on the housing dashboard by default.
- Do not substitute a flat left-aligned horizontal list.
- Do not create separate housing and roommate intake forms.
- Do not add new onboarding pages.

2. REPOSITORY INSPECTION

Before implementation:

- Read applicable AGENTS.md instructions.
- Identify the app entry point, navigator, Facebook hamburger/menu implementation, theme, icon library, storage, and existing map/image components.
- Reuse installed compatible dependencies.
- Preserve existing Facebook navigation.
- Use TypeScript if the repository already uses it.
- Do not migrate frameworks, routing systems, or package managers.

Implement Nest in a contained feature directory following the repository’s naming conventions. Separate screens, reusable components, state, mock fixtures, and service adapters.

3. DESIGN TOKENS

All dimensions below are React Native logical points.

Colors:

- App background: #FAF9F6
- Surface / sheet / gallery cards: #FFFFFF
- Primary Facebook blue: #0866FF
- Pressed primary: #0757D9
- Primary text: #16181C
- Secondary text: #656B73
- Divider: #E6E8EB
- Input background: #F0F1F3
- Selected pale blue: #EAF2FF
- Unknown / needs confirmation: #996000
- Backdrop: rgba(0,0,0,0.32)

Typography:

- Use the native system sans-serif: SF Pro on iOS, Roboto on Android.
- Nest wordmark: 24/29, weight 700.
- Welcome headline: 30/36, weight 700.
- Screen heading: 24/30, weight 700.
- Section heading: 20/25, weight 700.
- Listing price: 26/31, weight 700.
- Body and buttons: 16/22.
- Secondary metadata: 14/20.
- Small source text: 13/18.
- Do not shrink essential text below 13.
- Support OS text scaling without truncating important information.

Spacing:

- Horizontal content padding: 20.
- Spacing scale: 4, 8, 12, 16, 24, 32.
- Separate major sections with 24 points.
- Minimum interactive target: 44 x 44.
- Primary button height: 48 minimum, radius 16.
- Text input radius: 16.
- Photos and gallery cards: radius 22.
- Bottom sheet top corners: radius 28.
- Divider thickness: 1.

Use borders only for meaningful separation. Do not wrap every section in a bordered card. Shadows belong primarily to the circular gallery and bottom sheet; keep other content flat.

Gallery shadow:

- iOS shadowColor #000, opacity 0.10, radius 10, offset {width:0,height:4}.
- Android elevation approximately 3.
- Do not render an oval platform beneath the gallery.

4. SHARED HEADER AND NAVIGATION

Main Nest screens have:

- Back chevron returning to Facebook.
- Existing Facebook brand icon if available.
- “Nest” wordmark.
- Small cream squishy mascot, approximately 36 x 32, where shown.

Below the header:
Homes | Roommates | Community

Use plain text tabs with a blue underline under the active tab:

- Tab row height: 48.
- Each tab gets equal width.
- Active text weight: 700.
- Inactive text weight: 500.
- Underline: 3 points high, rounded, approximately 56 points wide.
- No pill-shaped backgrounds or icon chips.

Keep these tabs on main Nest destinations. Detail screens and expanded map use back navigation instead.

Switching tabs preserves each tab’s scroll position and selected item.

The mascot is a cream-colored, rounded, squishy pebble with two tiny black oval eyes and a soft shadow. No mouth or elaborate limbs. Reuse a supplied standalone asset if available. Otherwise create a small reusable local graphic approximating the reference. Never use an entire screenshot as the mascot asset.

5. ENTRY AND WELCOME

Add Nest to the existing Facebook hamburger menu:

- Name: Nest
- Subtitle: “Find your people. Find your place.”
- Tap opens Nest.

Do not put a duplicate Facebook menu inside Nest content.

If no confirmed search exists, show the welcome state:

- Main tabs remain visible.
- Homes selected initially.
- Centered mascot approximately 120 x 100.
- Headline: “Tell us about your move.”
- Supporting text: “A home, a roommate, or both.”
- Full-width blue “Add a goal” button.
- Two plain text example shortcuts:
  “A furnished room for the summer”
  “A roommate for my internship”

Examples are text rows with a trailing chevron, not boxed buttons.

Add a goal opens the shared intake sheet.
An example opens that sheet with an appropriate editable draft.
Opening from Roommates preselects Roommate; it still uses the SAME component.

6. SHARED HOME + ROOMMATE INTAKE

Use one bottom sheet with:

- Drag handle.
- Close button.
- Heading: “What are you looking for?”
- Three choices: Home | Roommate | Both.
- Both selected for the default demo example.
- Large multiline text field.
- Must-haves.
- Preferences.
- Collapsed Options.
- Sticky “Find my matches” primary action.

The text field:

- Minimum height 144.
- Padding 16.
- Font 16/24.
- Top-aligned text.
- Placeholder: “Tell Nest where you’re moving, when, your budget, and what matters to you.”
- Keep enough empty writing space.

Default example:
“I’m moving to Seattle June–August 2027. Find a furnished room under $1,500 per person and someone to share with.”

Intake has two states within the SAME sheet:
A. Writing: prompt and search type.
B. Review: interpreted must-haves and preferences visible below the prompt.

Use “Review preferences” while the draft has not been interpreted.
Use “Find my matches” after interpretation.
The attached reference shows the review state.

Must-haves use editable text rows, not dense pill clusters:

- Seattle · Jun–Aug 2027
- $1,500 per person · Furnished

Preferences:

- Quiet home · Near Amazon

Tapping an edit pencil opens a focused editor for that row.
Budget must explicitly distinguish per-person budget from total-home budget.
Do not silently treat those as equivalent.

For Both, also capture:

- Desired number of roommates.
- Whether the user already has housing.
  Only ask these if missing and needed. Use one focused inline question at a time.

Options is collapsed by default. Expanding reveals:

- Marketplace source toggle.
- Selected joined groups.
- Maximum results, default 5.
- Search cadence: Manual / Daily / Weekly.
- Notifications preference.

Keep search intent, raw prompt, interpreted requirements, sources, and cadence in one shared search object.

If the user edits an existing search:

- Prefill all existing values.
- Preserve untouched preferences.
- Do not replace the active search until they confirm.
- Closing retains an unsaved draft without applying it.

Keyboard:

- Sheet expands to a keyboard-safe near-full-height layout.
- Content scrolls.
- Primary action remains reachable above the keyboard.
- First Android back dismisses keyboard; next closes sheet.
- Review dismisses the keyboard.
- Do not allow the keyboard to obscure the field or button.

7. HOMES DASHBOARD

Once a confirmed search exists, replace welcome content with the dashboard.

Top summary:

- “Seattle this summer” with an edit pencil.
- “Up to $1,500 · Jun–Aug”
- “Current results · Check daily” with settings affordance.

These are compact text rows, not a large card or many chips.

Then:

- “Your housing matches”
- Centered circular gallery.
- Source and pagination.
- Compact inline map.
- Primary “View home” button.

Use five distinct mock listings by default. If fewer qualify, show fewer. Never invent matches to fill the requested count.

8. CIRCULAR GALLERY — IMPORTANT

Match the final, gentler-angle reference.

The selected card:

- Centered exactly on the available screen width.
- Front-facing.
- Largest and fully readable.
- Contains photo, price, neighborhood, and short matching reason.

Neighboring cards:

- Visible on BOTH left and right.
- Smaller and recessed.
- Gently angled, not dramatically tilted.
- Show distinct photos and their prices.
- Symmetrical positioning around the selected card.

Geometry:

- Let W be the full gallery viewport width.
- Center card width: min(250, W * 0.64).
- Center card height: approximately 250.
- Photo height: approximately 155.
- Center position: W / 2.
- Center scale: 1.
- Neighbor horizontal offsets: ±0.64 * centerCardWidth.
- Neighbor vertical offset: 12.
- Neighbor scale: 0.84.
- Perspective: 1000.
- Neighbor rotateY magnitude: 10 degrees.
- Neighbor rotateZ magnitude: 1.5 degrees.
- Angle neighbors gently toward the center.
- Center z-index above neighbors.
- Clip only at the gallery viewport boundaries.

Use a circular index when there are at least three results so both sides remain populated at the first/last result.
With two results, show each item once; do not duplicate the same neighbor on both sides.
With one result, show one centered card and no pagination arrows.

Interactions:

- Swipe changes the selected listing.
- Tap a side card brings it to the center.
- Tap the center card opens home details.
- Pagination arrows also change selection.
- Display “1 of 5” for the current fixture.
- Preserve selection when returning from details.
- A bookmark action saves without navigating.

Animate selection in approximately 280 ms with ease-out.
Do not auto-rotate.
Respect reduced motion: remove perspective animation and use a short fade or immediate change.

Avoid horizontal gestures stealing normal vertical scrolling. Activate the gallery pan only after clear horizontal intent.

9. INLINE MAP

The map stays directly BELOW the gallery by default.

Above it:

- “Around South Lake Union”
- Collapse chevron.

Compact map:

- Height 150.
- Radius 20.
- Light neutral streets, pale blue water, muted green parks.
- Five price pins matching the five listings.
- Selected listing pin: blue with white text.
- Other pins: white with dark text.
- Expand button in upper-right.

Behavior:

- Swiping gallery updates the selected map pin.
- Tapping a pin selects the matching gallery card.
- Selection is one shared listing ID, not two separate states.
- Collapsing replaces the map with a 48-point row:
  “Show map · 5 locations”
- Expanding that row restores the compact map.
- Full-map button opens a larger map view with selected-listing preview and View home.
- Back returns to the same dashboard selection.
- Persist compact/minimized preference.

Reuse an existing native map dependency if available.
Do not add web-only mapcn directly to React Native.
If no working map provider exists, implement a bundled illustrative map surface with genuinely tappable positioned pins behind a replaceable MapAdapter. Document it as a mock map. Do not block the demo on API keys.

10. HOME DETAILS

Tapping the selected card or View home opens home details.

Layout:

- Back “Your matches”.
- Bookmark icon top-right.
- Swipeable photo gallery with small “1/4” count.
- Large rent.
- Listing title.
- Furnishing and date metadata.
- “Why it fits” with small mascot.
- Three matching reasons.
- “See all criteria”.
- Missing-information note.
- Source and View original post.
- Nearby event preview.
- Sticky bottom Contact button.

Example:
$1,350 / month
Sunny room in South Lake Union
Furnished room · Jun–Aug 2027

Three visible reasons:

- Within your budget
- Available for your dates
- In your preferred neighborhood

Unknown:
“Utilities and deposit need confirmation”

See all criteria opens an accessible sheet containing:

- Each requested criterion.
- Matched / Not matched / Unknown.
- The supporting listing fact or excerpt.

Do not invent a percentage compatibility score.
Do not count unknown information as matched.
A matching explanation must correspond to the fixture data.

Source:
Seattle Intern Housing
View original post

If a valid URL exists, open it using the platform linking behavior.
If the fixture has no real URL, show the original mock post in an in-app sheet. Never use a broken or fabricated external URL.

Contact opens the existing messaging flow if suitable.
Otherwise show a local conversation preview with the listing context and editable draft.
Do not send a real external message from the mock implementation.
Make local-only messaging behavior clear inside that preview.

Bookmark persists the listing in Saved.
Saving a listing does NOT mark it as the user’s home.

A secondary action lower on the detail page, “I’ve found my place”, confirms the selected home area and activates its community context. Keep it visually secondary to Contact.

11. ROOMMATE MATCHES

Use the approved roommate screen, not a housing carousel with faces.

Layout:

- Shared Nest header and top tabs, Roommates active.
- Compact shared goal with edit pencil.
- Budget per person and dates.
- “Current results · Check daily”.
- “Your roommate matches”.
- Featured person with photo, name, introduction, bookmark.
- Three relevant reasons.
- See all criteria.
- Source.
- Blue View profile.
- Additional people in simple rows.

Example:
Alex
Moving to Seattle in June

Reasons:

- Your dates overlap
- Similar housing budget
- Also prefers a quiet home

Source:
Seattle Intern Housing · Roommate post

Second row:
Jordan
Looking near South Lake Union

View profile opens a person detail variant with:

- Photo and name.
- Self-written introduction.
- Move dates, budget, preferred areas.
- Explicitly shared household preferences.
- Matching explanations and unknowns.
- Original roommate-seeking post.
- Bookmark.
- Contact action.

Reuse the home detail typography and spacing; do not invent a new visual system.

Only use people who explicitly posted seeking roommates or opted into matching.
Do not infer willingness from arbitrary Facebook membership.
Do not show precise live locations of people.
Do not infer sensitive traits from photos.

For Both searches:

- Share location, dates, and per-person budget.
- Homes may include individual rooms and whole apartments.
- Clearly identify lease type.
- A whole apartment’s total rent and per-person estimate must be distinct.
- Label per-person values as estimates when occupancy is assumed.
- A potential roommate is a suggestion, not an accepted match or confirmed co-tenant.

12. COMMUNITY

Use the approved Community screen.

Layout:

- Shared header and tabs, Community active.
- Compact neighborhood selector.
- Edit interests text action.
- “Around your neighborhood”.
- One featured event with large rounded image.
- Event name, day/time, bookmark.
- Blue View event.
- “People open to meeting up”.
- Simple person rows with circular avatar, name, shared interests, source, chevron.

Example event:
Neighborhood farmers market
Saturday · 10 AM

Example people:
Maya — Tennis and weekend coffee
Leo — Hiking and board games
Source: Seattle Newcomers

Neighborhood selector:

- Defaults to confirmed home area.
- Before a home is confirmed, uses preferred search area.
- Allow choosing a mock supported area.
- Do not force users to claim a home before browsing.

Edit interests opens a small sheet with selectable interests and Save.
Persist selected interests.
Use them to deterministically filter/rank fixture events and introductions.

View event opens a detail sheet with description, date/time, area, source, bookmark.
A person row opens their explicit introduction and Contact action.
Do not auto-message anyone.

13. STATE AND DATA MODEL

Use typed entities rather than hardcoding content in JSX.

At minimum:
SearchGoal:
id, rawPrompt, intent, city, preferredNeighborhoods,
startDate, endDate, budgetAmount, budgetBasis,
housingType, furnishedRequirement, roommateCount,
alreadyHasHome, mustHaves, preferences, sourceIds,
maxResults, cadence, notificationsEnabled, updatedAt.

HomeListing:
id, title, photoUrls, monthlyRent, currency, rentBasis,
leaseType, neighborhood, latitude, longitude,
availableFrom, availableTo, furnished,
bedrooms, availableRooms, sourceId, sourceName,
sourceUrl, originalPostText, facts, unknowns.

CriterionEvaluation:
criterionId, label, status, explanation, evidence.

HomeMatch:
listingId, criteria, summaryReasons.

RoommateProfile:
id, name, photoUrl, introduction, dates, budgetPerPerson,
preferredAreas, explicitLivingPreferences,
sourceName, sourceUrl, originalPostText, seekingRoommates.

CommunityEvent:
id, title, imageUrl, startsAt, timezone,
neighborhood, description, interests, sourceUrl.

CommunityPerson:
id, name, avatarUrl, introduction, neighborhood,
interests, sourceName, openToMeeting.

Persist:

- Confirmed search and draft separately.
- Saved home/person/event IDs.
- Selected listing ID.
- Map minimized preference.
- Interests.
- Confirmed home area.
- Search cadence preference.

Use existing repository persistence if present; otherwise use the existing compatible local-storage solution. Never persist secrets in UI storage.

14. SERVICE BOUNDARY AND MOCK BEHAVIOR

Screens must call service adapters, not import fixture arrays directly.

Provide interfaces for:

- interpretGoal
- saveGoal
- getGoal
- getHomeMatches
- getRoommateMatches
- getCommunity
- updateSearchSchedule
- setSaved
- setHomeContext

Implement these with deterministic local fixtures for this build.
The adapter can later be replaced by an API implementation without rewriting screens.

Do not claim the frontend has implemented actual scraping, agent execution, background cron, or push delivery.
“Current results · Check daily” is the chosen product UI; daily settings are persisted configuration in the mock build.

Expose a developer-only demo state selector for:

- New user
- Current results
- Initial search loading
- Refresh with existing results
- No results
- Source error

Do not put demo controls in the main user flow.
Do not stage a fake multi-step AI progress performance.
Initial loading can show a real pending-state indicator while the adapter promise resolves.

Natural-language interpretation:

- Use an existing endpoint if already provided.
- Otherwise implement a limited deterministic demo interpreter for supported fixtures and explicitly document its limits.
- Always show editable confirmation.
- Never pretend an unrecognized prompt was successfully understood.
- Preserve raw input and request the missing essential field.

15. EMPTY, ERROR, AND SAVED STATES

Initial search:

- Preserve confirmed goal.
- Show a compact loading message and indicator.
- No invented post counts or progress stages.

Refreshing:

- Keep previous results visible.
- Mark them with their actual last-updated time.
- Show refresh state separately.

No results:
“No listings meet all your must-haves.”
Actions: Edit search and Retry.
Do not silently increase the budget or alter dates.

Source error:

- Keep previous results if available.
- Explain which mock source failed.
- Retry and Edit search.
- Unknown values remain unknown.

Saved:

- Filled bookmark.
- Immediate visual feedback.
- Undo available.
- Saved items accessible through a header action or sheet.
- Saving and choosing a home remain separate actions.

16. MOTION AND ACCESSIBILITY

- Sheet transition: approximately 250 ms.
- Tab content transition: subtle 150 ms fade.
- Map collapse: approximately 220 ms.
- Press feedback: opacity or slight color change.
- No perpetual bouncing mascot.
- No unsolicited autoplay.
- Respect reduced motion.

Every icon-only action needs an accessibility label.
Announce gallery selection meaningfully, e.g. “Home 2 of 5, $1,425 per month.”
Provide arrow controls as an alternative to swiping.
Use real Pressable elements.
Support screen readers, keyboard dismissal, safe areas, and Android back.
Do not rely on color alone to communicate match status.

17. IMPLEMENTATION ORDER
18. Inspect existing shell and dependencies.
19. Add Nest entry and contained navigation.
20. Define tokens and shared header/tabs/buttons/mascot.
21. Define typed data, fixtures, services, and persistent state.
22. Implement welcome and shared intake.
23. Implement homes dashboard and circular gallery.
24. Connect selected listing to compact, collapsed, and expanded map.
25. Implement home details and save/contact behavior.
26. Implement roommate results and person details.
27. Implement community and detail sheets.
28. Implement loading, errors, empty results, and demo controls.
29. Verify on small and normal phone sizes.
30. Write integration notes and summarize completion.
31. VALIDATION AND ACCEPTANCE

Use the repository’s existing checks and test framework.
Add focused tests for:

- Shared goal updates preserving untouched preferences.
- Budget basis: per-person versus total.
- Gallery selection synchronizing with map pins.
- Saved state persistence.
- Unknown criteria not counted as matched.
- No-results behavior.

Manually or through available UI automation verify:

- Facebook menu → Nest → intake → confirm → results.
- Both intent populates Homes and Roommates.
- Circular gallery is centered with both neighbors visible.
- Side cards have the gentle angle from the FINAL reference.
- Map stays on the same dashboard by default.
- Map collapse and expand work.
- Card tap → detail → back preserves selection.
- Roommates → profile works.
- Community → event/person works.
- Keyboard never hides the intake action.
- No text overlaps or clipped controls at 375-point and 390-point widths.
- Larger text can scroll without losing actions.

Capture screenshots of the completed screens and compare against the attached images. Correct meaningful discrepancies before finishing.

19. API HANDOFF README

Add a concise repo-local integration README for the next engineer.
Document:

- Feature file structure.
- How to run the demo.
- Service interfaces and their concrete return types.
- Which data is mocked.
- Where real interpretation/search APIs plug in.
- How goal persistence is currently implemented.
- How real scheduling, result refresh, and notifications should connect.
- Required loading, error, and unknown-data behavior.
- Any missing map or messaging integration.
- Tests/checks run and known limitations.

Do not overwrite unrelated project documentation.

Finish with:

- What was implemented.
- Screenshots or paths to screenshots.
- Checks run.
- Remaining real API integrations.

Proceed with implementation. Ask questions only if an essential repository constraint prevents progress; otherwise follow this specification.
