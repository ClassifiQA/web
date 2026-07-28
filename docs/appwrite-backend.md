# Appwrite backend and data

## Services in use

ClassifiQA uses the following Appwrite services:

- **Auth** for email/password accounts, email verification, MFA, sessions, and
  account preferences.
- **TablesDB** for members, grades, private grade ownership, and content reports.
- **Functions** for member synchronization, authoritative grade operations,
  structured content reports, and account erasure.
- **Realtime** for live grade activity on member pages.

The web client uses the Appwrite Web SDK. Astro server code and Functions use
the Node SDK. Function-generated execution keys are scoped in
`appwrite/functions.json`.

## Tables

### `govt-members`

Stores people sourced from the Government of Portugal and Assembleia da
República.

Important fields include:

- source and source-specific external ID;
- name, current position, party, and party name;
- image URL when the official source provides one;
- active status and source update time;
- relationship to public grade rows.

Inactive rows are retained as historical records but are excluded from public
directory and detail queries.

### `grades`

Stores the public portion of a classification:

- member relationship;
- numeric grade from 0 to 20 in half-point increments;
- optional anonymous comment;
- Appwrite creation metadata.

The public model deliberately contains no account or ownership identifier.

### `grade-ownerships`

Privately maps an Appwrite user and member to the public grade ID. Unique
indexes enforce:

- one ownership record per user/member pair;
- one ownership record per public grade.

The ownership row and grade row are created in the same transaction. A failure
rolls back both operations.

### `content-reports`

Stores private illegal-content notices submitted through the structured report
flow. The table has no client permissions. It contains the verified reporter
identity, exact ClassifiQA URL, substantiation, good-faith declaration,
duplicate-detection hash, review status and eventual decision.

Account erasure removes the reporter identity while retaining the moderation
record for the period stated in the Privacy Policy. Operators review these
records only through Appwrite Console or another privileged, audited
server-side path.

## Functions

### `sync-members`

- Runs daily at `03:00` through Appwrite scheduling.
- Reads official Government and Parliament sources.
- Validates plausible roster sizes before writing.
- Uses deterministic member IDs based on source and official external ID.
- Creates new members, updates changed records, and marks missing records
  inactive instead of deleting history.
- Supports a dry-run mode for operational verification.

Required execution scopes: `rows.read`, `rows.write`.

### `grade-ownership`

- Can be executed only by authenticated Appwrite users.
- Reads the caller identity from Appwrite-provided Function headers.
- Returns the caller's existing grade without revealing ownership rows.
- Requires an active, email-verified account before creating a grade.
- Validates grade values, comments, ownership, and rate limits.
- Reads the referenced member row and rejects anyone whose `active` value is
  not exactly `true`.
- Creates the ownership and public grade rows transactionally.

Required execution scopes: `rows.read`, `rows.write`, `users.read`.

See [Security and abuse prevention](security-and-abuse-prevention.md) for the
enforced limits.

### `content-reports`

- Can be executed only by authenticated Appwrite users.
- Requires an active account with a verified email address.
- Derives reporter name and email from Appwrite rather than trusting form data.
- Restricts reported URLs to ClassifiQA.
- Enforces substantiation, good-faith, honeypot, duplicate and rate-limit rules.
- Returns the private report row ID as an acknowledgement reference.

Required execution scopes: `rows.read`, `rows.write`, `users.read`.

The monitored legal email remains the no-account fallback and covers statutory
exceptions where a reporter does not have to identify themselves.

### `account-erasure`

- Requires an authenticated account and the exact confirmation `ELIMINAR`.
- Deletes every grade/comment linked through private ownership rows.
- Deletes the ownership rows.
- Removes the reporter identity from retained moderation reports.
- Deletes the Appwrite user, preferences, authenticators and sessions last.
- Is retryable if an intermediate operation fails.

Required execution scopes: `rows.read`, `rows.write`, `users.read`,
`users.write`.

## Authentication and preferences

The Zustand auth store holds only the current browser-session representation.
Appwrite remains authoritative.

User preferences currently include:

- optional private profile role and institution;
- notification preferences;
- accepted Terms version and timestamp;
- acknowledged Privacy Policy version.

Email verification is required for grading. MFA is optional and can be
configured with an authenticator application and recovery codes.

## Public and private boundaries

Public:

- active member details;
- aggregate grade data;
- anonymous comments and timestamps.

Private:

- account identity and email;
- profile fields unless a future explicit visibility control is implemented;
- notification and legal preferences;
- ownership links between accounts and grades;
- content reports and reporter identity;
- sessions, MFA factors, and recovery material.

Do not add account IDs to grade rows or public API responses. Any future
moderation tooling that needs ownership data must run through a privileged,
audited server boundary.

## Configuration

`appwrite.config.json` references function definitions from
`appwrite/functions.json`. Paths in the included file are relative to the
`appwrite` directory.

Function runtime variables such as `APPWRITE_FUNCTION_API_ENDPOINT`,
`APPWRITE_FUNCTION_PROJECT_ID`, and the scoped execution key are injected by
Appwrite. They must not be copied into repository files.
