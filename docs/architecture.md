# Architecture

## System overview

ClassifiQA is an Astro server-rendered application with React islands for
interactive areas. Appwrite is the system of record for identity, public-member
data, grades, ownership records, private content reports, user preferences, and
real-time grade events.

The application is deliberately split into three boundaries:

1. Astro renders public routes and fetches public member data on the server.
2. React handles browser-only interaction such as authentication, search,
   filtering, pagination, grading dialogs, profile settings, and live updates.
3. Appwrite Functions perform operations that must not trust the browser,
   including grade ownership, active-member enforcement, reporting, account
   erasure, rate limits, and official-source synchronization.

## Request and data flow

### Public directory

1. An Astro route calls `createServerMembers()`.
2. The server-side Appwrite client reads active rows from `govt-members`.
3. Astro serializes the selected records into the relevant React island.
4. The browser performs local search, source filtering, and pagination without
   sending member data back to the server.

The directory route uses short shared-cache headers when data is available and
disables caching when the backend request fails.

### Member detail

1. Astro requests one active member and its related public grades.
2. `MemberDetail` restores the current Appwrite session in the browser.
3. The `grade-ownership` Function checks whether that account already graded
   the member.
4. Appwrite Realtime delivers grade create, update, and delete events so the
   aggregate and activity list can update without a page refresh.

### Grade submission

1. The React dialog performs immediate validation and blocks duplicate clicks.
2. The browser executes the authenticated `grade-ownership` Function.
3. The Function validates the user, member, grade, comment, ownership, and rate
   limits.
4. A TablesDB transaction creates the private ownership row and public grade
   row together.
5. The Function returns only the submitting user's grade details; ownership
   data is never exposed through the public UI.

### Content reporting

1. A comment-level or footer link opens `/denunciar` with the exact content URL.
2. The React form restores the Appwrite session and requires a verified email.
3. `content-reports` derives the identity from Appwrite, validates and
   rate-limits the notice, then writes a private row.
4. The Function returns the row ID as the acknowledgement reference.
5. The operator performs the legal and moderation decision manually.

### Account erasure

1. The profile dialog requires the exact destructive confirmation.
2. `account-erasure` locates grades through private ownership rows.
3. It deletes grades/comments and ownership rows, then anonymizes retained
   moderation reports.
4. The Appwrite account, preferences, authenticators and sessions are deleted
   last.

## Rendering boundaries

- `.astro` components are preferred for static structure, page metadata, and
  server-fetched content.
- React components are used where browser state, Appwrite client sessions, or
  interaction is required.
- `client:load` is reserved for controls needed immediately.
- `client:idle` is used for non-blocking interactive content.
- Server SDK clients and Function execution keys must never enter client
  bundles.

## Routes

| Route                  | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `/`                    | Landing page and featured active members          |
| `/classificacoes`      | Searchable, filterable member directory           |
| `/classificacoes/[id]` | Member details, grade aggregate, and comments     |
| `/perfil`              | Account, security, sessions, MFA, and preferences |
| `/perfil/verificar`    | Email-verification callback                       |
| `/denunciar`           | Verified structured illegal-content reporting     |
| `/legal/termos`        | Terms and conditions                              |
| `/legal/privacidade`   | Privacy policy                                    |
| `/api/auth/verify`     | Authentication verification support               |

## Responsive behavior

The shared layout constrains the application to the dynamic viewport while
individual content regions own their scrolling:

- Mobile member cards scroll independently from directory controls and
  pagination.
- Member-detail content scrolls within the page shell so all grades remain
  reachable.
- Profile navigation becomes a compact horizontal tab set on smaller screens.
- Dialogs use viewport-aware maximum heights and internal scrolling.

`src/lib/hooks/mobile.ts` provides hydration-safe media-query state for behavior
that cannot be expressed through CSS alone.

## Source organization

- `src/components/ui`: reusable UI primitives.
- `src/components/custom`: ClassifiQA-specific product components.
- `src/lib/hooks/backend/client`: browser Appwrite services.
- `src/lib/hooks/backend/server`: Astro server Appwrite services.
- `src/lib/store`: cross-component client state.
- `src/lib/data`: shared IDs, types, labels, and route helpers.
- `functions`: independently deployable Appwrite Functions.

Keep business rules at the narrowest authoritative boundary. Presentation rules
belong in components; data integrity and abuse controls belong in Appwrite.
