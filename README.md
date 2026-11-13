# Nest

**Find your people. Find your place.**

Nest helps young adults moving to a new city find housing, compatible roommates, and local experiences with people from their communities. Built for the Meta hackathon prompt: make Facebook valuable for young adults.

See [AGENTS.md](./AGENTS.md) for the full product brief and requirements.

## Current application

The repository currently contains a mobile Facebook UI skeleton built with:

- Expo (~58)
- React (^19.3) and React Native (^0.88.1)
- JavaScript and JSX
- React Native `StyleSheet` for styling
- `@expo/vector-icons` (Ionicons, Feather, and MaterialCommunityIcons)
- React Native Web for browser previews
- Local React state for navigation and interactions

All screens, sample data, and styles currently live in [App.js](./App.js). The skeleton includes Home, Reels, Marketplace, a Marketplace inbox, Groups, Notifications, and Profile. Tab switching, group subtabs, and inbox navigation work; most other actions are visual placeholders. Data is hardcoded, and no database, authentication, AI service, or ingestion pipeline is implemented yet.

### Stack decision

The product brief specifies Next.js, TypeScript, Tailwind CSS, shadcn/ui, Lucide, Supabase, and server-side Meta Muse integration. That is the planned architecture in the brief, not the current implementation. Resolve whether to retain the Expo app or migrate before producing implementation code. Designs can proceed against the existing mobile shell in the meantime.

## Launching the app

1. Install dependencies and create your env file (fill in the Supabase URL and anon key):

   ```sh
   npm install
   cp .env.example .env
   ```

2. Start the app and scan the QR code with your phone's camera (requires the Expo Go app):

   ```sh
   npx expo start --tunnel --clear
   ```

   `--tunnel` works on any network, including campus or venue Wi-Fi that blocks device-to-device traffic. If your phone and computer share a home network or a phone hotspot, `npx expo start --lan --clear` is faster.

Other targets:

```sh
npm run web      # browser preview
npm run ios      # iOS simulator (macOS only)
npm run android  # Android emulator
```

On branches that include the Nest API server (`server/`), use `npm run dev -- --tunnel --clear` instead: it starts the API and Expo together.

If Expo Go shows "The request timed out", the phone cannot reach your computer: make sure the dev server is still running and use `--tunnel`. The Windows-only `npm run start:tunnel` script expects a project-local Node runtime at `.tools/node-v22.23.5-win-x64`.

## UI planning

Plan a clear entry into Nest from the Facebook shell. Nest's primary destinations are Home, Housing, Roommates, Discover, My Connections, Saved, and Profile; mobile navigation may group secondary destinations rather than display seven bottom tabs.

### Core demo screens

1. **Nest entry and onboarding:** destination, move-in date, budget, university/company, interests, and optional community connections. Explain how preferences support recommendations.
2. **Nest Home:** personalized overview with housing, roommate suggestions, upcoming activities, and community updates.
3. **Housing browse:** search, listing cards, budget/location/date filters, and save actions. Include listing type, lease duration, and amenities in expanded filters.
4. **Housing detail:** photos, rent, availability, lease terms, amenities, contact action, and original source post.
5. **Roommate preferences:** housing requirements, lifestyle, sleep schedule, cleanliness, pets, commute, and whether the user needs a room or has one available.
6. **Roommate matches and profile:** compatibility criteria, shared preferences and communities, connection requests, and housing suited to a potential household.
7. **Discover:** natural-language search, local places, activities, community meetups, and recommendations that explain relevance.
8. **Place/activity detail:** location, time where applicable, source, opted-in interested people, save, and explicit join/interest actions. Keep place details distinct from scheduled activity details.
9. **My Connections:** pending requests, accepted connections, roommate prospects, and activity connections.
10. **Saved:** housing, people, places, activities, and furniture/items.
11. **Profile and settings:** editable preferences and controls for personalized notifications and activity visibility.
12. **Notifications:** relevant housing, matches, invitations, and community activities, each linking to its destination.

### Supporting demo surfaces

- **Furniture discovery and item detail:** nearby items, price, location, seller/contact action, save, and source post; reuse Marketplace where appropriate.
- **Mock Group feed and post detail:** original posts, images, comments, and source references. Use these to show where Nest's structured recommendations came from.
- **Household flow:** select compatible people and see housing matching their combined requirements.
- **Activity creation/invitation:** a simple form and explicit recipient/join choices.

Filters, request confirmation, join confirmation, and invitation forms can be sheets or dialogs rather than separate full screens. Plan loading, empty, error, saved, requested, joined, and cancellation states alongside the primary layouts. Never invent attendance counts or expose people who have not opted in.

## Demo story

A UBC student moves to Seattle for an Amazon internship in June 2027. They find a South Lake Union apartment, meet a compatible roommate, find a nearby bed, discover other interns, and join a local activity with people who have opted in. Future recommendations help them continue building a social life.

## UI handoff checklist

For each screen, provide layout/reference images, entry and exit navigation, reusable components, content/data fields, interaction behavior, and loading/empty/error states. Include shared typography, colors, spacing, and responsive behavior. State explicitly whether the implementation targets the existing Expo/React Native skeleton or the proposed Next.js stack.

Use realistic mock data and preserve original community sources. Keep API keys server-side, validate AI outputs, and provide a mock AI fallback when live Muse access is unavailable.
