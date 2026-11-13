# Supabase Community feed

The Community tab now reads `fb_posts`, joined groups, authors and images directly through the existing public Supabase client. This avoids dependence on a restarted local Community API route. `event-source.mjs` shares normalization and bounded reads between the app and the optional server endpoints. Service-role credentials remain server-only. It never substitutes fixture events on failure. No schema migration is required for events.

The deterministic adapter supports the existing corpus's dated activity invitations and explicit multiline `Event`, `City`, `Date`, `Timezone`, `Category`, `Interests`, optional `Time`, `End date`, `Venue`, `Price` and `Description` fields. Unsupported/undated formats are excluded; this is not general AI extraction. Post creation dates and evaluation artifacts are never event inputs. Missing venue, time and price remain unknown. Bellevue/Redmond invitations stay in those cities even when posted in a Seattle group. Duplicate posts retain source references.

The confirmed goal supplies city, inclusive stay dates and selected sources. Neighborhood and explicit interest tags rank eligible events. Housing rent budget does not imply an event spending budget; notification settings do not schedule or send anything here. Goal drafts do not change active results. Events may span the stay boundaries; calendar-only dates do not shift through UTC. Cancelled events are excluded.

The page supports search, categories, month/neighborhood/community filters, upcoming-only and saved-only views, recommended/soonest sorting, reset, refresh, editable stay, event details and original source text. People recommendations remain empty. Request generations prevent stale responses from replacing a new goal, while failed refreshes retain previous results. Tabs stay mounted to preserve browsing state.

Saved IDs remain in the existing device AsyncStorage, not a Supabase saves table. `POST /api/events/saved` resolves IDs directly from Supabase regardless of current feed/date filters. Unavailable records have a removable placeholder, failed reads have a retry instruction, and saved events outside an edited stay are labeled in details. Saving is not registration or attendance. The existing best-effort `nest_preferences` sync is unchanged; if that table is missing, the page uses the confirmed goal already available on the device.

## Validation

- `npm run test:events` tests normalization, date boundaries, city/source exclusion, timezones, multi-day overlap, filtering, ranking and deduplication. Existing housing matching tests run separately.
- Production export: `npx expo export --platform web --output-dir .tools/community-current`.
- `npm run check:community` renders that export at 375px and 390px against a snapshot read from Supabase. HTTP transport is intercepted; shared profile writes and housing AI searches are isolated. It checks search, category filtering, saving/reload, details, original source, confirmed stay edits, source-error/retry handling and empty people states. This is not native-device or tunnel verification.
- A live database read found 55 supported event posts, including June–August 2027, cancelled/outside-city/outside-stay examples. Existing data was reused without reseeding or replacing records.

Native safe areas, keyboards and screen readers still require device validation. Exact free-text date/location formats outside this documented mock adapter need a separate validated extraction integration.

The page displays the actual source error on failure. The November 12, 2026?January 5, 2027 stay has no matching events in the current summer 2027 corpus; this should show an empty state, not a failed-request state. Stay dates are never silently changed. Anonymous Supabase access was verified against 55 event records.
