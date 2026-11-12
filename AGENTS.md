# AGENTS.md

# NEST — Project Instructions

## 1. Project Overview

**Product:** Nest
**Tagline:** Find your people. Find your place.
**Hackathon prompt:** Make Facebook valuable for young adults (Meta invite-only hackathon).

Nest is an AI-powered local discovery network for young adults moving to new cities. It transforms fragmented Facebook communities into an organized ecosystem where users can discover:

- Housing and apartment listings.
- Furniture and household items.
- Compatible roommates.
- Friends and people nearby.
- People attending the same university or working at the same company.
- Relevant local communities and resources.

**Core idea:** Help young adults find not just a place to live, but everything and everyone they need to feel at home in a new city. Housing is the entry point; local discovery and meaningful connections are the broader vision.

## 2. Product Principles

Always prioritize:

1. A polished, intuitive consumer-facing experience.
2. Functional end-to-end workflows over static mockups.
3. AI-powered discovery rather than a generic chatbot.
4. Community-driven information and recommendations.
5. Relevant, explainable matches.
6. A cohesive experience across housing, items, people, and communities.
7. Hackathon feasibility. Avoid unnecessary complexity.

Do not build a generic admin dashboard. Do not build a separate housing moderation product. Do not make roommate matching the only discovery feature.

## 3. Core Product Features

### A. Unified Housing Feed

- Aggregate housing posts from connected mock Facebook communities.
- Use Muse to extract structured information from messy posts.
- Display standardized housing cards.
- Search/filter by location, keywords, budget, move-in date, listing type, and amenities.
- Show the original source post and source community (the UI must make clear listings originate from community posts).
- Allow users to save listings, open details, and contact the poster via a link or mock interaction.

Example: "Looking for someone to take over my lease! $1400 plus hydro, W/D in unit, available June 1, SLU. DM me!" becomes: rent $1,400/mo, South Lake Union (Seattle), available June 1, lease takeover, hydro excluded, in-unit W/D, source Seattle Housing Group.

### B. Local Discovery & Connections

The key differentiator. Users describe what they need in natural language. The system must understand the request, identify intent, extract filters, search records, rank results, and explain recommendations.

**Items** — beds, desks, furniture, household supplies, free/secondhand items, bikes.
**People** — roommates (compare budget, location, move-in date, lifestyle, cleanliness, sleep schedule, commute), friends, students, interns, young professionals, people moving to the same city (match on company, location, dates, university, interests).
**Communities** — university Groups, company/internship communities, neighborhood and local-interest Groups.

Example requests:

- "Find me a bed near my apartment." (use the selected apartment's location)
- "Find someone looking for a roommate with a similar budget and move-in date."
- "Find other Amazon interns moving to Seattle in June."
- "Find UBC students living near South Lake Union."
- "I'm moving to Seattle in June. Which communities should I join?"

Discovery should feel like a personalized search engine, not a chatbot. Results are cards by type (housing, items, people, communities), each with a "why this matches" explanation.

**Privacy:** people discovery is mutual and opt-in. Never expose private user information or auto-share personal details. Only users who opted into discovery appear in results.

## 4. Technology Stack

- Next.js, React, TypeScript
- Tailwind CSS, shadcn/ui, Lucide icons
- Next.js API routes / server actions for the backend
- Supabase PostgreSQL (+ Auth if needed, Storage for images)
- Meta Muse API (server-side only)
- Vercel for deployment

Avoid introducing additional frameworks or services unless genuinely necessary.

## 5. AI Architecture

Meta Muse is the intelligence layer, used behind the scenes by the backend. Users never talk to Muse directly.

Use Muse server-side for:

- Understanding unstructured community posts.
- Extracting housing and item information.
- Classifying posts (housing, furniture, roommate request, social connection, irrelevant, etc.).
- Understanding screenshots/images where supported.
- Flagging missing or ambiguous listing details.
- Understanding natural-language discovery requests and extracting filters.
- Helping rank results and explaining matches.

**Rules:**

- **Never invent Muse API endpoints, auth methods, or capabilities.** Use the official hackathon documentation and credentials only. If docs are unavailable, ask the user.
- Keep AI behind a service abstraction:
  - `services/ai/muse.ts` — real Muse client
  - `services/ai/mock-ai.ts` — realistic mock implementation
  - `services/ai/index.ts` — selects implementation (mock when no credentials)
- The app must remain fully functional without live Muse credentials. Mock outputs must be realistic structured data, not generic placeholders.
- Never expose API keys in frontend code.

Keep separate service modules for AI, ingestion, and matching.

## 6. Mock Facebook Environment

The demo uses a simulated Facebook. We are NOT building a real scraper, and Muse does not automatically have access to Facebook Groups — real integrations require supported, authorized Facebook permissions.

- Keep it separate from the Nest user experience (isolated section/route group). It is a data source, not the primary product.
- Facebook-inspired UI: view Groups, browse posts, post details, comments, images, and optionally add new mock posts.
- Groups: Seattle Housing, Sublets & Roommates; UBC Students Housing Network; Seattle Intern Housing Summer 2027; Seattle Furniture Marketplace; Young Professionals in Seattle; Amazon Interns 2027.
- Seed **at least 50** realistic posts with authors, dates, comments, and images, covering: apartment listings, lease takeovers, roommate requests, furniture sales, free items, friend-seeking, internship intros, community recommendations, and irrelevant posts.
- Include messy language and edge cases: missing rent, ambiguous locations, duplicate listings, screenshots, abbreviations (SLU, W/D), multiple listings in one post.

### Ingestion pipeline

1. Retrieve mock posts.
2. Pass content to the AI layer.
3. Convert relevant info into structured records.
4. Save raw post + extracted data to Supabase.
5. Avoid duplicate records.

Always keep the original source post linked to its extracted listing so users can trace info back to the community.

## 7. Data Architecture

Supabase is the primary database. Keep raw source data separate from AI-processed records, and preserve source-post references for everything extracted.

Suggested tables (modify if needed, keep relationships clear, avoid duplication):

- `users` — id, name, email, profile_image, university, company, current_location, bio, created_at
- `communities` — id, name, description, location, category, image, created_at
- `raw_posts` — id, community_id, author_id, original_content, image_url, post_category, original_post_url, created_at
- `housing_listings` — id, raw_post_id, title, description, rent, location, latitude, longitude, move_in_date, lease_duration, listing_type, amenities, availability, created_at
- `items` — id, raw_post_id, title, description, category, price, location, image_url, created_at
- `user_preferences` — id, user_id, budget_min, budget_max, preferred_locations, move_in_date, lifestyle_preferences, interests, company, university
- `connections` — id, user_id, connected_user_id, connection_type, status, created_at
- `saved_listings` — id, user_id, listing_id, created_at (extend to support saving items and people, per the Saved screen)

Add indexes for location, category, rent/price, and dates.

## 8. Frontend Structure

**Shell:** responsive sidebar (Home, Housing, Discover, My Connections, Saved, Profile) and top nav (search, notifications, profile avatar).

- **Home** — personalized: welcome, destination city, relevant housing, suggested people, nearby items, recent community opportunities, quick discovery search.
- **Housing** — listing cards, search, filters, optional map/location view, detail view showing the original post.
- **Discover** — prominent NL search ("What are you looking for in your new city?") with prompt chips: Find a bed near my apartment / Find roommates within my budget / Meet other Amazon interns in Seattle / Find affordable furniture nearby / Discover communities near me.
- **My Connections** — suggested people, potential roommates, same company/university/city, pending requests, compatibility explanations.
- **Saved** — saved housing, items, and people.

## 9. UI/UX Guidelines

UI quality is extremely important. Aim for a premium consumer-startup feel, not an admin dashboard.

- Minimalist, modern, welcoming; strong typography; generous spacing.
- Rounded cards, subtle shadows, restrained palette, clear hierarchy.
- Smooth transitions, thoughtful loading states, beautiful empty states.
- Responsive layouts; one cohesive design system and component library.

Avoid: generic AI chatbot layouts, excessive gradients, too many colors, cluttered dashboards, excessive borders/dividers, inconsistent spacing, placeholder-looking cards.

All major buttons and interactions must work.

## 10. Development Conventions

- TypeScript throughout; prefer reusable components.
- Keep business logic outside UI components; keep frontend, backend, database, and AI logic separated.
- Validate user inputs; handle loading, error, and empty states.
- Server-side access for secrets; never ship keys to the client.
- Keep database queries organized; keep functions small and readable.
- Don't duplicate business logic; avoid unnecessary dependencies.
- Don't hardcode the interface with static cards — connect UI to real database records.
- Don't use fake success states for unfinished actions.
- Inspect the existing codebase and follow its conventions before implementing; don't overwrite working code unnecessarily.

## 11. Demo Scenario

A university student is moving to Seattle for an Amazon internship in June. Profile: destination Seattle, company Amazon, move-in June 1, budget $1,200–$1,700/month, preferred location South Lake Union, interests technology, fitness, social activities.

They use Nest to:

1. Find an apartment in South Lake Union (structured from a messy group post).
2. Select it and ask for an affordable bed nearby.
3. Ask for a roommate with a similar budget and move-in date.
4. Find other Amazon interns moving to Seattle.
5. Discover relevant communities.
6. View profiles and send connection requests.

This must work end-to-end with seeded data.

## 12. Implementation Priorities

Build incrementally and keep the app runnable after each phase:

1. **Foundation** — Next.js, Tailwind, shadcn/ui, Supabase, schema, mock groups/posts, seed data.
2. **AI & ingestion** — ingestion service, Muse integration (where docs/credentials permit), mock fallback, structured extraction saved to Supabase.
3. **Main UI** — shell, Home, Housing feed, listing details, Discover, My Connections.
4. **Discovery** — intent understanding, location/preference filters, item discovery, roommate compatibility, people and community recommendations.
5. **Polish** — wire everything to real records, loading/error/empty states, test the full demo, animations, responsiveness.

## 13. Agent Working Rules

Before making changes: inspect the repository, read this file, understand the existing architecture, identify relevant files, and propose a short plan for substantial changes.

After making changes: run relevant checks, fix TypeScript errors, test affected workflows, summarize what changed, and flag anything unfinished.

Do not claim a feature is complete unless it actually works. When requirements are ambiguous, ask before making major architectural assumptions.

## 14. Definition of Done

- A functioning mock Facebook environment with realistic posts.
- AI-powered post extraction and a unified housing feed.
- Natural-language local discovery: items, roommates, friends, communities.
- Supabase persistence.
- A polished, cohesive, responsive frontend.
- A complete end-to-end demo of the scenario above.

**Nest is more than a housing application. It is an intelligent network that helps young adults find housing, resources, people, and communities when starting somewhere new.**

Find your people. Find your place.
