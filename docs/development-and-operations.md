# Development and operations

## Environments

The application uses the same architecture locally and in production:

- Astro runs in standalone Node SSR mode.
- Browser requests use the Appwrite Web SDK.
- Server rendering uses the Appwrite Node SDK without an admin key for public
  reads.
- Privileged writes happen inside scoped Appwrite Functions.

During development, `astro.config.mjs` routes `/v1` through the local
ClassifiQA origin to the configured Appwrite upstream and rewrites the session
cookie domain.

## Environment variables

| Variable                            | Runtime            | Purpose                                |
| ----------------------------------- | ------------------ | -------------------------------------- |
| `PUBLIC_APPWRITE_PROJECT`           | Browser and server | Appwrite project ID                    |
| `PUBLIC_APPWRITE_ENDPOINT`          | Browser            | Appwrite HTTP endpoint                 |
| `PUBLIC_APPWRITE_REALTIME_ENDPOINT` | Browser            | Appwrite WebSocket endpoint            |
| `PUBLIC_DB_ID`                      | Browser and server | ClassifiQA TablesDB database ID        |
| `APPWRITE_SERVER_ENDPOINT`          | Astro server       | Server-side Appwrite endpoint override |

The development proxy overrides `PUBLIC_APPWRITE_ENDPOINT` while Astro is
running locally.

Appwrite injects Function runtime variables. Do not place execution keys or
other Function secrets in the web application's `.env`.

## Standard workflow

```bash
bun install
bun run dev
```

Before handing off a change:

```bash
./node_modules/.bin/tsc --noEmit
bun run build
bunx prettier --check .
git diff --check
```

The repository currently targets TypeScript 7. If `astro check` or ESLint
reports that a dependency does not yet support the TypeScript programmatic API,
use the native compiler and production build as the immediate checks, then
re-enable the affected command when its upstream dependency supports
TypeScript 7.

## Function development

Grade Function tests:

```bash
cd functions/grade-ownership
bun test
```

Official-source parser check:

```bash
cd functions/sync-members
bun test
bun run check
```

The parser check calls the live official sources and prints sample normalized
records. Treat source markup and feed data as untrusted input.

## Appwrite deployments

Authenticate and verify the selected project before changing remote resources:

```bash
appwrite whoami
appwrite functions get --function-id grade-ownership --json
```

Deploy and activate the grade Function from the repository root:

```bash
appwrite functions create-deployment \
  --function-id grade-ownership \
  --code functions/grade-ownership \
  --activate true \
  --entrypoint src/main.js \
  --commands "bun install --frozen-lockfile"
```

Poll the returned deployment until its status is `ready`, then confirm that the
function's active deployment ID and scopes match `appwrite/functions.json`.

Use the same pattern for `sync-members`, `content-reports` and
`account-erasure`, substituting the ID and source path. Deploy the
`content-reports` table before either Function that reads it. Do not use
`--with-variables` unless the explicit goal is to replace remote Function
variables.

After deploying moderation changes:

1. submit a valid report from a verified disposable account;
2. confirm that the returned reference matches a private `content-reports` row;
3. confirm that a duplicate is rejected;
4. confirm that guests and unverified accounts cannot execute the Function;
5. update the test row through the human-review states and delete the test row.

Before testing account erasure against production, create a disposable verified
test account, add one grade and one report, then verify that erasure deletes the
user and grade while anonymizing the report. Never test this workflow with an
operator account.

## Member synchronization

The scheduled sync:

1. discovers the current constitutional Government from its sitemap;
2. reads current minister details from official pages;
3. discovers the latest parliamentary legislature and JSON feed;
4. validates expected roster sizes;
5. creates or updates deterministic member rows;
6. marks missing officials inactive.

Run a dry execution before deploying parser changes. Never delete inactive
members solely because an upstream source temporarily omits them.

## Release checklist

1. Review the working tree and preserve unrelated changes.
2. Run focused tests for modified Functions.
3. Run TypeScript, production build, formatting, and diff checks.
4. Deploy backend changes before frontend code that depends on them.
5. Confirm the active Appwrite deployment and scopes.
6. Deploy the web application.
7. Verify public directory loading, sign-in, one member detail, and a
   non-mutating Function execution.
8. Review error logs and rollback to the previous Function deployment if the
   new execution path fails.

Legal and operational readiness is tracked separately in the
[legal pre-launch checklist](legal-launch-checklist.md).
