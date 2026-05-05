# Inje_uri dev Branch Test Guide Plan

## 1. Purpose and Scope

This document defines the full-project test guide for the `dev` baseline on the local `test-ver1` branch.

Scope:

- Validate the current Next.js App Router application, Prisma schema, API routes, server services, repositories, and mobile-first UI flows.
- Provide a repeatable manual and command-based verification guide.
- Document current test gaps and risks before introducing automated test code.

Out of scope for this branch:

- Adding test runners, test files, fixtures, mocks, or CI jobs.
- Changing `package.json`, application code, Prisma schema, API behavior, or public types.
- Pushing `test-ver1` to a remote branch.

## 2. Environment Baseline

Required versions from `package.json` and `README.md`:

| Tool | Version |
| --- | --- |
| Node.js | `24.11.1` |
| npm | `11.6.2` |
| PostgreSQL | `17` |
| Next.js | `16.2.4` |
| React | `19.2.0` |
| Prisma | `7.8.0` |
| TypeScript | `5.9.3` |

Required environment variable:

```bash
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/injeuri?schema=public"
```

Recommended setup sequence:

```bash
npm install
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:dev
npm run prisma:seed
```

Local Docker PostgreSQL option matching `.env`:

```bash
docker run --name injeuri-postgres-test -e POSTGRES_PASSWORD=1234 -e POSTGRES_DB=injeuri -p 5432:5432 -d postgres:17
```

If the container already exists:

```bash
docker start injeuri-postgres-test
```

Run the app locally:

```bash
npm run dev
```

## 3. Baseline Verification Commands

Run these checks before feature-level QA:

| Check | Command | Expected Result |
| --- | --- | --- |
| Dependency install | `npm install` | Completes without dependency or engine errors |
| Prisma client generation | `npm run prisma:generate` | Generates Prisma client under `src/generated/prisma` |
| Prisma schema validation | `npm run prisma:validate` | Schema validates successfully |
| Database migration | `npm run prisma:migrate:dev` | Local DB reaches current migration state |
| Seed data | `npm run prisma:seed` | Baseline data is inserted without errors |
| Lint | `npm run lint` | ESLint completes without errors |
| Production build | `npm run build` | Next.js build completes successfully |

Security workflow parity:

- Review `.github/workflows/security.yml`.
- Confirm no executable binaries are committed outside excluded folders.
- Confirm no suspicious filenames match the workflow patterns, including names containing `chmod`, `curl`, `wget`, `bash`, or shell-like names.

Current limitation:

- There is no `test` script and no existing `*.test.*` or `*.spec.*` test suite. Automated unit, integration, and E2E testing must be introduced in a later branch.

## 4. Test Layers

| Layer | Target | Current Method |
| --- | --- | --- |
| Static checks | TypeScript, ESLint, Next build, Prisma schema | Command-based validation |
| Database integrity | Prisma migrations, relations, seed data | Local PostgreSQL verification |
| API behavior | `src/app/api/**/route.ts` | Manual HTTP/API client scenarios |
| Service behavior | `src/server/services/**` | API-driven verification with DB state checks |
| Repository behavior | `src/server/repositories/**` | API/service scenarios plus DB inspection |
| UI smoke | `src/app/**`, `src/components/**` | Manual browser verification on mobile viewport |
| Security workflow | `.github/workflows/security.yml` | Manual repository scan and CI review |

## 5. Domain Test Matrix

### Auth and Session

| Area | Scenarios | Expected Result |
| --- | --- | --- |
| Student verification | Valid student number and birth date | Pre-signup token/cookie is issued and next step is correct |
| Student verification failure | Invalid credentials or upstream failure | Stable validation or upstream error response |
| Registration | Valid pre-signup token and unique login/email/nickname | User is created and redirected to login flow |
| Registration validation | Missing token, duplicate login/email/nickname, birth mismatch | Correct error code and no partial user creation |
| Login | Valid login ID/password | Session row is created and session cookie is attached |
| Login failure | Wrong password, missing fields, withdrawn or banned account | Correct error code and no session cookie |
| Logout | Authenticated session | Session is deleted and auth cookies are cleared |
| Session lookup | Active, expired, missing, or invalid session | Authenticated summary or unauthorized result |
| Protected routes | No session cookie on protected app path | Redirects to `/` with `next` query when appropriate |

Notes:

- External Inje student verification should be mocked in future automated tests. Manual testing against the real upstream should be limited and documented.

### User and Profile

| Area | Scenarios | Expected Result |
| --- | --- | --- |
| Current profile | Authenticated `GET /api/users/me` | Returns user, profile images, and grouped keyword selections |
| Profile update | Valid nickname, bio, age, gender, department, year | Updates only provided fields |
| Profile validation | Empty nickname, duplicate nickname, invalid age/year, long bio | Returns validation error and preserves existing data |
| Keyword taxonomy | `GET /api/profile-taxonomy` | Returns categories and sorted keywords |
| Keyword update | Valid category and keyword combinations | Replaces selections atomically |
| Keyword constraints | Duplicate categories, wrong category-keyword pair, max count exceeded, single-select violation | Returns validation error |
| Onboarding completion | First transition to completed | Attempts recommendation generation for current KST date |
| Profile images | Upload, primary ordering, delete | Image count, primary image, and sort order remain valid |

### Recommendation, Interest, and Matching

| Area | Scenarios | Expected Result |
| --- | --- | --- |
| Today recommendations | Onboarded user with enough candidates | Returns 3 ranked candidates when available |
| No recommendations | Not generated and generation cannot produce candidates | Returns recommendation-not-generated error |
| Candidate filtering | Blocked users, same user, existing interest, matched users, recent dismiss/decline | Excluded from candidate pool |
| Recommendation settings | Age range, same department exclusion, same year reduction | Candidate pool follows settings and fallback relaxation |
| Select candidate | First valid selection of today's item | Creates interest, marks other items passed, stores selected candidate |
| Select candidate twice | Second selection attempt on same date | Returns already-selected error |
| Dismiss candidate | Valid non-selected item | Marks item passed and creates cooldown dismiss record |
| Send interest | Direct valid target | Creates pending interest unless duplicate or blocked |
| Accept interest | Receiver accepts valid pending interest | Creates reciprocal interest and match result |
| Decline interest | Receiver declines valid pending interest | Marks declined and returns delayed notification timestamp |
| Matching | Reciprocal interests exist | Creates chat room once and marks match state consistently |

### Chat

| Area | Scenarios | Expected Result |
| --- | --- | --- |
| Create room from interest | Valid source and two users | Creates room, two participants, system message, 24h expiry |
| Create room from comment | Valid source and two users | Creates room, two participants, system message, 2h expiry |
| Duplicate active room | Existing active room between users | Returns duplicate active room error |
| Rematch cooldown | Both users left less than 7 days ago | Returns rematch-too-soon error |
| List rooms | `tab=all` and `tab=unread` | Sorted by latest message, unread filter works |
| Room detail | Participant and non-participant requests | Participant can read, non-participant gets forbidden |
| Send message | Active participant sends text | Message is inserted and returned |
| Message validation | Empty message, non-participant, expired/blocked room | Correct error and no insert |
| Mark read | Participant marks latest message read | `last_read_message_id` and timestamp update |
| Leave room | One or both participants leave | `left_at` is set, room closes when all leave |
| Block room | Participant blocks chat room | Room status becomes blocked and blocker is recorded |
| Place suggestions | Create/list/update suggestion within room | Only participants can operate and status updates correctly |

### Feed and Comment

| Area | Scenarios | Expected Result |
| --- | --- | --- |
| Feed list | Active, unexpired feeds | Returns latest feeds excluding blocked and banned authors |
| Feed list filtering | Keyword and cursor | Returns matching page and correct next cursor |
| Create feed | Valid text and active keyword IDs | Creates feed with calculated expiry |
| Create feed validation | Empty text, invalid keyword IDs, existing active feed | Correct error and no partial create |
| Feed detail | Active visible feed | Returns author, keywords, images, comment count |
| Feed detail hidden cases | Banned author, expired feed, blocked relation, deleted/hidden status | Returns not-found or not-available style error |
| Update feed | Owner changes text and/or keywords | Updates atomically |
| Update feed validation | Non-owner, expired feed, invalid keywords | Correct error and no update |
| Delete feed | Owner deletes active feed | Soft-deletes feed |
| Record view | Valid viewer and feed | Upserts view idempotently |
| Create comment | Valid non-author comment | Creates one comment per user/feed |
| Comment validation | Own feed comment, blocked relation, duplicate comment, deleted feed | Correct error |
| List comments | Visible active comments | Excludes deleted comments and blocked/banned users |
| Comment select chat | Feed author selects a comment | Creates comment-sourced chat room |

### Safety and Place

| Area | Scenarios | Expected Result |
| --- | --- | --- |
| Report target | Feed, comment, chat room, message, or user target | Creates report for existing target |
| Report validation | Self-report, invalid target, invalid reason or description | Correct error and no report |
| Report with block | `alsoBlock=true` | Creates report and block in one flow |
| Block user | Valid target | Creates block and affects feed/recommendation/interest visibility |
| Block validation | Self-block, duplicate active block, missing user | Correct error |
| Unblock user | Active owned block | Sets `unblocked_at` |
| Phone block | Valid E.164 number | Stores hashed phone number |
| Place list | Category and tag filters | Returns active matching places |
| Place suggestions | Suggest place in room and update status | Suggestion lifecycle works for participants |

### UI Smoke

Use a mobile viewport first, then a narrow desktop-centered layout check.

| Route | Scenarios | Expected Result |
| --- | --- | --- |
| `/` | Initial entry | Loads without runtime error and routes appropriately |
| `/login` | Login form | Inputs, submit, validation, and errors render correctly |
| `/register` | Register form | Required fields and flow render correctly |
| `/match` | Protected route and recommendation UI | Redirects when unauthenticated, renders recommendation screen when authenticated |
| `/match/[id]` | Profile detail | Navigation context and back behavior work |
| `/interest` | Received/sent interest view | Cards, actions, empty states render |
| `/chat` | Chat list | Active/unread states and expiry notifier render |
| `/chat/[id]` | Chat room | Messages, input, read/leave/block actions render |
| `/self-date` | Feed list | Filters, cards, viewed/liked state render |
| `/self-date/[id]` | Feed detail | Story viewer and comments render |
| `/self-date/create` | Create flow | Text, keyword, image/crop UI states render |
| `/self-date/mine` | My feeds | Current user feed states render |
| `/my` | My page | Profile/settings navigation renders |
| `/my/profile` | Profile preview | Images, keywords, bio render |
| `/my/profile/edit` | Profile edit | Keyword selector constraints render |
| `/my/ideal-type` | Recommendation settings | Toggle/range fields persist as expected |
| `/my/posts` | My posts | Own feeds and commented feeds render |
| `/my/settings` | Settings | Recommendation settings UI state is stable |

## 6. Manual QA Data Checklist

Prepare local seed or manual DB records for these user states:

- Active onboarded users of different genders, departments, years, ages, and keyword selections.
- Users with and without profile images and bios.
- Banned, withdrawn, deleted, and inactive users.
- Existing pending interests in both directions.
- Accepted, declined, expired, and duplicate interest cases.
- Active, expired, blocked, and closed chat rooms.
- Rooms where one user left and where both users left within and beyond 7 days.
- Active, expired, deleted, hidden, and banned-author feeds.
- Feeds with comments, views, images, and multiple keywords.
- Block relations and phone block records.
- Places, place categories, place tags, and pending/accepted/dismissed suggestions.

## 7. Known Risks and Follow-up Items

- No automated tests currently exist, and `package.json` has no `test` script.
- Some UI pages still depend directly on `src/lib/data` mock data while APIs and services use the database.
- `src/lib/openapi.ts` and several Korean strings appear to have encoding or syntax corruption. The production build must catch syntax failures, and manual UI/API checks must catch user-facing text regressions.
- External Inje authentication calls should not be used directly in future automated tests. They need deterministic mocks.
- Prisma-generated files are configured under `src/generated/prisma`; generation must run before build and server-side verification.
- API route error responses are not always consistently typed between `ApiError`, `AppError`, and generic `fail` usage. Manual API checks should verify both status and response body.
- Date and time behavior uses KST logic in recommendation flows and expiry logic in chat/feed flows. Boundary testing around midnight and expiry times is required.

## 8. Future Automation Recommendation

When a later branch is allowed to add test tooling, introduce it in this order:

1. Add Vitest for pure utility and service-level tests with mocked repositories.
2. Add API route integration tests with isolated test database setup and seeded fixtures.
3. Add Playwright for mobile-first route smoke tests and protected-route redirects.
4. Add CI jobs for lint, build, Prisma validate, unit tests, integration tests, and Playwright smoke tests.
5. Add deterministic mocks for external Inje student verification and image/file APIs.
