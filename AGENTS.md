# AGENTS.md — NEST

## 1. Project Overview

**Product:** Nest
**Tagline:** Find your people. Find your place.

**Hackathon prompt:** Make Facebook valuable for young adults.

Nest is an AI-powered platform that helps young adults transition into new cities by connecting them with housing, compatible roommates, and meaningful local experiences.

Moving somewhere new involves more than finding an apartment. Young adults need:
- A place to live.
- Compatible people to live with.
- Friends and social connections.
- Local activities and experiences.
- Communities where they feel they belong.

These opportunities are currently scattered across Facebook Groups and other online communities.

Nest uses Meta Muse to understand and organize community information, make personalized recommendations, and help users build meaningful connections.

**Core vision: Find housing, find your people, and feel at home in a new city.**

---

# 2. The Three Core Product Pillars

The entire application must be organized around these three features.

## PILLAR 1: HOUSING DATABASE

**Purpose:** Help young adults find housing through a centralized, intelligent database of community listings.

### How it works

1. Ingest posts from connected mock Facebook housing communities.
2. Process posts using Meta Muse.
3. Extract structured housing information.
4. Store the information in Supabase.
5. Display standardized, searchable listings.

### Functionality

Users should be able to:
- Browse housing listings.
- Search by city, neighborhood, and keywords.
- Filter by monthly budget.
- Filter by move-in date.
- Filter by lease duration and listing type.
- Filter by amenities.
- Save listings.
- View detailed listing information.
- View the original source Facebook post.
- Receive alerts when relevant listings become available.

### Listing information

Where available, extract:
- Rent.
- Location.
- Listing type.
- Availability.
- Move-in date.
- Lease duration.
- Number of bedrooms.
- Number of bathrooms.
- Amenities.
- Utilities.
- Images.
- Contact information.
- Original post and community.

Preserve the original source content alongside extracted data.

---

## PILLAR 2: ROOMMATE COMPATIBILITY & MATCHING

**Purpose:** Help young adults find compatible people to live with and form households.

This is more than a basic roommate directory. The goal is to identify people whose housing requirements and lifestyles align.

### User preferences

Collect relevant information such as:
- Budget.
- Preferred neighborhoods.
- Move-in date.
- Lease duration.
- Work or university location.
- Commute preferences.
- Cleanliness preferences.
- Sleep schedule.
- Lifestyle.
- Social preferences.
- Pets and other relevant living preferences.

### Functionality

Users should be able to:
- Create a roommate profile.
- Set housing and lifestyle preferences.
- Discover compatible roommates.
- View compatibility scores.
- Understand why someone is a good match.
- Send connection requests.
- View mutual preferences.
- Discover potential household combinations.
- Find housing that fits a combined household's requirements.

### Matching logic

Consider:
- Budget compatibility.
- Geographic compatibility.
- Move-in date compatibility.
- Lifestyle compatibility.
- Housing requirements.
- Shared preferences.

Do not rely on arbitrary compatibility scores. Use understandable matching criteria and explain recommendations.

The system should support both directions:
- People looking for roommates.
- People with an existing room looking for someone to fill it.

---

## PILLAR 3: LOCAL DISCOVERY & COMMUNITY ENGAGEMENT

**Purpose:** Help users build a social life and feel connected to their new city.

This is a major differentiator for Nest.

The first two pillars help users settle into a new home. The third gives them reasons to continue using Nest after they have moved.

Nest should proactively help users discover things to do, places to visit, and people to meet.

### A. Discover nearby experiences

Recommend relevant local activities and places based on:
- User location.
- Interests.
- Preferences.
- Community membership.
- Previous interactions.
- Time and availability.

Examples:
- Parks.
- Cafes.
- Restaurants.
- Hiking trails.
- Markets.
- Events.
- Fitness activities.
- Social gatherings.
- Local attractions.
- University events.

### B. Find people to experience things with

This is essential.

Nest should not just recommend a park or event. It should help users find other people who want to go too.

Examples:

A user receives a recommendation:

"There's a beautiful park near you. Three people from your Seattle Interns community are interested in visiting this weekend. Want to join?"

Other examples:
- Find someone to go hiking with.
- Meet other Amazon interns for coffee.
- Find people interested in attending a local event.
- Join a group exploring a new neighborhood.
- Meet students from the same university nearby.

Users must explicitly opt into activities and connections. Do not expose private information or assume people want to meet.

### C. Community-based recommendations

Use connected community information to identify relevant opportunities.

Examples:
- Other university students moving to the same city.
- People working at the same company.
- People from the same internship cohort.
- People with similar interests.
- People living in nearby neighborhoods.

### D. Personalized notifications

Nest should occasionally send relevant, personalized notifications to encourage users to explore their city and connect with others.

Examples:

**Local experience**
"There's a weekend market happening near you. Four people from your community have saved it."

**Social opportunity**
"Two other Amazon interns near South Lake Union are interested in grabbing coffee this week."

**Outdoor activity**
"Three people from your community want to explore a nearby hiking trail this Saturday."

**Community recommendation**
"A group of UBC students is organizing a Seattle meetup this weekend."

Notifications should:
- Be personalized.
- Be occasional, not excessive.
- Be based on actual user interests and location.
- Prioritize opportunities involving real people and shared interests.
- Allow users to control notification preferences.
- Never fabricate attendance or interest counts.

The goal is to foster genuine connections, not maximize notification volume.

### E. Engagement and retention

Build functionality that encourages users to return to Nest.

Potential features:
- Personalized activity recommendations.
- Upcoming events.
- Interested people lists.
- Group activity creation.
- Activity invitations.
- Community updates.
- Saved places.
- Personalized discovery feed.

The experience should evolve as the user settles into their new city.

---

# 3. User Journey

The application should support this journey:

### Stage 1: Before moving
The user discovers Nest, selects their destination, and finds housing.

### Stage 2: Preparing to move
The user creates a profile, sets preferences, and discovers compatible roommates.

### Stage 3: Arriving in the city
The user discovers nearby places, activities, and people with shared interests.

### Stage 4: Building a social life
Nest recommends activities, organizes connections, and helps users meet people.

### Stage 5: Long-term engagement
The user continues using Nest for community recommendations, events, local discovery, and new connections.

**The first two pillars help people move. The third helps people belong.**

---

# 4. Technology Stack

Use the following stack:

### Frontend
- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Lucide icons.

### Backend
- Next.js API routes and server-side functionality.
- TypeScript.
- Organized service modules.

### Database
- Supabase PostgreSQL.
- Supabase Storage.
- Supabase authentication if required.

### AI
- Meta Muse API.
- Server-side integration.
- Mock AI adapter as a fallback.

### Deployment
- Vercel.

Avoid unnecessary infrastructure and dependencies.

---

# 5. AI Architecture: Meta Muse

Muse is the intelligence layer powering Nest.

Users should interact with Nest's own interface, not directly with Muse.

Use Muse where supported for:

- Understanding informal Facebook posts.
- Extracting structured housing information.
- Extracting furniture and item information.
- Understanding screenshots and images.
- Classifying community content.
- Understanding natural-language discovery requests.
- Extracting user intent and search criteria.
- Supporting relevant recommendations.
- Explaining roommate compatibility.
- Understanding interests and community conversations.

### AI implementation requirements

- Keep all API keys server-side.
- Do not invent Muse endpoints or capabilities.
- Follow the official API documentation.
- Create a service abstraction for AI operations.
- Provide a realistic mock implementation if live API access is unavailable.
- Validate structured AI outputs before saving them.
- Keep original source posts available.

Suggested structure:

- `services/ai/muse.ts`
- `services/ai/mock-ai.ts`
- `services/ai/index.ts`

---

# 6. Mock Facebook Environment

For the hackathon, build a simulated Facebook environment.

We will demonstrate Nest using mock Facebook Groups and posts.

We are not building an unauthorized Facebook scraping system.

### Mock Groups

Create realistic Groups such as:

- Seattle Housing, Sublets & Roommates.
- UBC Students Housing Network.
- Seattle Intern Housing Summer 2027.
- Seattle Furniture Marketplace.
- Young Professionals in Seattle.
- Amazon Interns 2027.

### Mock post categories

Include:
- Housing listings.
- Lease takeovers.
- Roommate requests.
- Furniture sales.
- Free household items.
- People looking for friends.
- Internship introductions.
- Local event recommendations.
- Group activity invitations.
- Community discussions.

Create at least 50 realistic posts.

Include informal language, abbreviations, missing information, duplicates, and images.

### Mock Facebook functionality

Users should be able to:
- View Groups.
- Browse posts.
- Open post details.
- View comments.
- View images.
- Add mock posts if useful.

### Ingestion pipeline

1. Retrieve posts from the mock Facebook application.
2. Process posts using Muse or the mock AI service.
3. Identify the content category.
4. Extract relevant information.
5. Save raw and structured data in Supabase.
6. Avoid unnecessary duplicates.
7. Preserve source references.

For real Facebook integrations, only use supported and authorized content access.

---

# 7. Database Architecture

Use Supabase PostgreSQL.

Suggested tables:

### users
- id
- name
- email
- profile_image
- bio
- university
- company
- current_location
- destination_location
- interests
- created_at

### communities
- id
- name
- description
- location
- category
- image
- created_at

### raw_posts
- id
- community_id
- author_id
- original_content
- image_url
- post_category
- original_post_url
- created_at

### housing_listings
- id
- raw_post_id
- title
- description
- rent
- location
- latitude
- longitude
- move_in_date
- lease_duration
- listing_type
- amenities
- availability
- created_at

### items
- id
- raw_post_id
- title
- description
- category
- price
- location
- latitude
- longitude
- image_url
- created_at

### user_preferences
- id
- user_id
- budget_min
- budget_max
- preferred_locations
- move_in_date
- lifestyle_preferences
- sleep_schedule
- cleanliness_preferences
- interests
- company
- university
- notification_preferences

### connections
- id
- user_id
- connected_user_id
- connection_type
- status
- created_at

### saved_listings
- id
- user_id
- listing_id
- created_at

### places
- id
- name
- description
- category
- location
- latitude
- longitude
- image_url
- source
- created_at

### activities
- id
- place_id
- title
- description
- date_time
- created_by
- community_id
- created_at

### activity_interests
- id
- activity_id
- user_id
- status
- created_at

### notifications
- id
- user_id
- title
- message
- notification_type
- related_activity_id
- read_at
- created_at

Adjust the schema as necessary, but maintain clean relationships.

Use indexes for location, categories, dates, and relevant search fields.

---

# 8. Frontend Application Structure

Create a polished consumer-facing application.

### Navigation

- Home.
- Housing.
- Roommates.
- Discover.
- My Connections.
- Saved.
- Profile.

### Home

A personalized overview including:
- Recommended housing.
- Suggested roommates.
- Upcoming activities.
- Nearby places.
- Suggested people.
- Community updates.
- Relevant notifications.

### Housing

- Searchable listing feed.
- Budget filters.
- Location filters.
- Move-in date filters.
- Listing details.
- Original source posts.
- Save functionality.

### Roommates

- User preference profiles.
- Suggested compatible roommates.
- Compatibility explanations.
- Connection requests.
- Household formation suggestions.

### Discover

This should be a major product experience.

Show:
- Nearby places.
- Recommended activities.
- Community events.
- People interested in similar activities.
- Group meetups.
- Personalized recommendations.

Include a natural-language search experience with examples such as:

- "Find a park near me where I can meet people."
- "Find other Amazon interns who want to get coffee."
- "What is happening near my apartment this weekend?"
- "Find people interested in hiking."
- "Show me events near South Lake Union."

### My Connections

- Suggested people.
- Roommate matches.
- Shared interests.
- Mutual communities.
- Connection requests.
- Activity connections.

### Notifications

- New relevant housing listings.
- Roommate matches.
- Nearby events.
- Activity invitations.
- Community recommendations.

Allow users to manage notification preferences.

### Saved

Users should be able to save:
- Housing listings.
- Items.
- People.
- Places.
- Activities.

---

# 9. UI/UX Requirements

UI quality is extremely important for this hackathon.

The product should feel like a polished consumer startup, not a generic admin dashboard.

### Design direction

- Modern.
- Minimalist.
- Warm and welcoming.
- Premium visual quality.
- Strong typography.
- Generous spacing.
- Rounded cards.
- Subtle shadows.
- Cohesive color palette.
- Smooth transitions.
- Responsive layouts.

Avoid:
- Excessive gradients.
- Generic chatbot interfaces.
- Cluttered dashboards.
- Excessive borders.
- Inconsistent typography.
- Static placeholder cards.

Use reusable components and consistent design tokens.

Every major button and interaction should work.

---

# 10. Hackathon Demo Scenario

Build around this scenario:

A UBC student moves to Seattle for an Amazon internship in June.

They use Nest to:

1. Find an apartment in South Lake Union.
2. Find a compatible roommate.
3. Discover a bed or furniture near their apartment.
4. Find other Amazon interns moving to Seattle.
5. Discover a nearby park or social activity.
6. See that other people from their community want to attend.
7. Join the activity and connect with those people.
8. Receive personalized recommendations for future activities.

The demo should communicate that Nest helps someone transition into a new city and build a social life.

Use realistic seeded data so the complete journey works without relying on real external users.

---

# 11. Development Priorities

Build in this order:

### Phase 1: Foundation
- Set up Next.js.
- Configure Tailwind and shadcn/ui.
- Configure Supabase.
- Create database schema.
- Build mock Facebook application.
- Seed realistic data.

### Phase 2: AI and Ingestion
- Build ingestion pipeline.
- Integrate Muse.
- Implement mock AI fallback.
- Extract structured housing and item data.
- Store
