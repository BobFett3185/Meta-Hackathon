# Expanded Facebook mock corpus

These are fictional people, listings, and community posts for the Nest demo. They are source data for future AI ingestion, not real offers or extracted AI recommendations.

## Commands

```sh
npm run db:inventory
npm run seed:preview
npm run test:corpus
npm run seed:expand
```

The database commands use the existing `.env` URL and server-side service-role key. Do not place that key in the app. `seed:expand` only inserts absent deterministic IDs; it never deletes or updates existing rows. It can resume after a partial failure and skips existing rows on reruns. Existing group memberships retain their roles and pinned status. Batches are not a single transaction.

The older `npm run seed` remains a destructive baseline reset. Use `seed:expand` to add this corpus to an already seeded database. If intentionally rebuilding the whole demo from scratch, run the baseline seed first and expansion second.

## Added by version 1

| Records | Count | Contents |
| --- | ---: | --- |
| People | 120 | Fictional names; university, company, living preferences and interests are explicitly stated in source posts |
| Housing group posts | 132 | 120 units plus 12 deliberate duplicate/cross-post examples |
| Roommate posts | 72 | Existing-room offers and people seeking a household; explicit willingness to connect |
| Community posts | 48 | 24 activity invitations and 24 introductions; explicit social opt-in |
| Item group posts | 40 | Furniture, household goods, free items, pickup/delivery details |
| Discussion posts | 20 | Negative examples that should not become housing listings |
| Marketplace listings | 180 | 90 housing cross-posts and 90 furniture/household/sports items |

Images, comments, memberships, and reactions have real linked rows. Pictures are illustrative external stock/sample URLs, reused across fictional records; missing images are intentional. There are no fabricated attendee lists. `birthday` is left unknown for the new people. No new friendships or messages are automatically created.

## Extraction and matching cases

- Twelve furnished South Lake Union rooms cover June–August 2027 at $1,200–$1,475 per person.
- Other records vary neighborhoods, move-in dates, summer versus year-long leases, studios, rooms, whole apartments, furnishing, laundry, pets, and utility inclusion.
- Seattle neighborhoods, Bellevue, Redmond, and Vancouver provide location distractors. USD and CAD remain distinct.
- Whole-home rent is distinct from per-person rent; some posts give an explicitly conditional equal-share estimate.
- Missing prices, ambiguous rent basis, unknown utilities, sold/pending/unavailable records, and author price corrections in comments test uncertainty handling.
- Canonical unit IDs link group duplicates and Marketplace cross-posts for deduplication evaluation. Preserve every raw source when clustering them.
- Membership does not imply compatibility or willingness to meet. Use explicit roommate/social source statements.

`artifacts/mock-data/nest-expansion-v1-expected.json` contains evaluation labels and source IDs. Keep these separate from the input sent to the future extraction model: they are expected answers, not extracted facts to feed back into the model. Source-level rent stays as posted; `commentCorrection` separately records a later author correction. A Marketplace source may need its linked group post/comments to discover that correction.

`artifacts/mock-data/nest-expansion-v1-initial-run.json` records the first insertion; `nest-expansion-v1-latest-run.json` records the most recent verified application. The runner verifies every inserted entity and relationship after writing.

## Application boundary

The Facebook Groups/feed and Marketplace read these Supabase tables. Nest's recommendation adapter still uses its small local fixture arrays in `src/nest/fixtures.js`; connecting AI extraction/search to this expanded corpus is the next integration step. User intake/preferences are not altered by this expansion.
