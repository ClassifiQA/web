# ClassifiQA

ClassifiQA is an independent Portuguese civic platform where people can browse
current members of the Government and Assembleia da República, consult their
public roles, and submit an anonymous grade from 0 to 20.

The project combines a public, server-rendered directory with authenticated
participation. Official member data is synchronized from Portuguese government
and parliament sources, while Appwrite manages accounts, profile preferences,
grades, real-time updates, and server-side submission controls.

ClassifiQA is not an official government service, a scientific poll, or a
statement of fact about the people listed.

## Main scope

- Maintain a current directory of active Government and Parliament members.
- Make public-office information searchable and filterable by institution,
  position, and party.
- Allow one anonymous grade per account and office-holder.
- Present aggregate grades and anonymous public comments.
- Provide account, profile, email-verification, MFA, session, and notification
  controls.
- Keep legal, privacy, moderation, and launch requirements explicit.
- Prevent automated or high-volume grading through client and Appwrite-side
  controls.
- Accept structured illegal-content reports with verified identity, private
  storage, rate limits, and human review.
- Let users erase their account and linked participation data.

## Stack

| Area             | Technology                                       |
| ---------------- | ------------------------------------------------ |
| Web framework    | Astro 7 with standalone Node SSR                 |
| Interactive UI   | React 19 and TypeScript                          |
| Styling          | Tailwind CSS 4 and shadcn/ui primitives          |
| UI foundations   | Radix UI, Lucide icons, Recharts, Sonner         |
| Client state     | Zustand                                          |
| Backend          | Appwrite Auth, TablesDB, Realtime, and Functions |
| Function runtime | Bun 1.3                                          |
| Package manager  | Bun                                              |
| Data sources     | Governo de Portugal and Assembleia da República  |

## Project structure

```text
src/
  components/       Astro and React UI
  config/           Public legal and operational configuration
  layouts/          Shared page shell
  lib/              Appwrite clients, services, hooks, state, and data types
  pages/            Astro routes and API handlers
  styles/           Global Tailwind theme
functions/
  account-erasure/  Account and linked participation erasure
  content-reports/  Private report intake and anti-abuse controls
  grade-ownership/  Authoritative grade submission and anti-spam controls
  sync-members/     Scheduled official-source synchronization
appwrite/
  functions.json    Function configuration managed by the Appwrite CLI
docs/               Architecture, backend, security, operations, and launch docs
```

## Local development

Requirements:

- Node.js 22.12 or newer
- Bun 1.3
- An Appwrite project with the expected tables and functions

Install dependencies and start the development server:

```bash
bun install
bun run dev
```

The development command uses Portless and the Astro development proxy, so
Appwrite requests are routed through the local ClassifiQA origin.

Create a local `.env` with the values for your environment:

```dotenv
PUBLIC_APPWRITE_PROJECT=classifiqa
PUBLIC_APPWRITE_ENDPOINT=https://backend.classifiqa.pt/v1
PUBLIC_APPWRITE_REALTIME_ENDPOINT=wss://backend.classifiqa.pt/v1
PUBLIC_DB_ID=<appwrite-database-id>
APPWRITE_SERVER_ENDPOINT=https://backend.classifiqa.pt/v1
```

Do not commit credentials, session secrets, API keys, or production-only
variables.

## Useful commands

```bash
bun run dev        # Start local development
bun run build      # Build the standalone Astro server
bun run start      # Start the built server
bun run typecheck  # Run Astro diagnostics
bun run lint       # Run ESLint
bun run format     # Format TypeScript, React, and Astro files
```

Function-specific checks:

```bash
cd functions/grade-ownership && bun test
cd functions/content-reports && bun test
cd functions/sync-members && bun run check
```

## Documentation

- [Architecture](docs/architecture.md)
- [Appwrite backend and data](docs/appwrite-backend.md)
- [Security and abuse prevention](docs/security-and-abuse-prevention.md)
- [Development and operations](docs/development-and-operations.md)
- [Legal pre-launch checklist](docs/legal-launch-checklist.md)

## Public contact

- Legal and privacy: [legal@classifiqa.pt](mailto:legal@classifiqa.pt)
- Work phone: [[REDACTED]](tel:[REDACTED])

## License

See [LICENSE](LICENSE).
