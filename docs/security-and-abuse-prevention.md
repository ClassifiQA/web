# Security and abuse prevention

## Security model

ClassifiQA treats the browser as untrusted. Client-side checks improve the user
experience, but Appwrite Functions and database constraints make final
decisions about identity, ownership, validation, and write access.

The primary abuse risks are automated account creation, repeated grading,
high-volume grading across members, comment spam, ownership disclosure, and
direct calls that bypass the visible form.

## Grade submission controls

The `grade-ownership` Function currently enforces:

- authenticated execution only;
- active Appwrite user status;
- verified email before the first grade can be published;
- one grade per user/member through a unique database index;
- atomic ownership and grade creation through a TablesDB transaction;
- a 30-second cross-member submission cooldown;
- a maximum of 8 grades per rolling hour;
- a maximum of 30 grades per rolling 24 hours;
- grade values from 0 to 20 in increments of 0.5;
- comments up to 1,000 characters;
- rejection of links, control characters, excessive line breaks, invisible
  Unicode padding, and excessive repeated text;
- a server-checked honeypot field.

Cooldown-window ownership IDs are deterministic, so simultaneous requests in
the same window cannot bypass the cooldown through a race.

The React form mirrors the comment rules, keeps the submit action disabled
while a request is in flight, explains the email-verification requirement, and
includes the honeypot. These checks are supplementary; the Function repeats all
important validation.

## Account protections

Appwrite provides password hashing, session management, email verification, and
MFA. The profile area additionally supports:

- password changes requiring the current password where appropriate;
- inspection and termination of active sessions;
- termination of all other sessions;
- TOTP setup and recovery-code regeneration;
- permanent account erasure through a scoped server-side Function.

Never log passwords, session secrets, MFA codes, recovery codes, execution
keys, or raw authorization headers.

## Illegal-content report controls

The report form never writes the database directly. The `content-reports`
Function requires:

- an active Appwrite account with a verified email address;
- an exact ClassifiQA content URL;
- at least 30 characters of substantiation;
- an explicit good-faith and accuracy declaration;
- an empty server-checked honeypot;
- no invisible padding or repetitive flooding;
- a five-minute submission cooldown;
- no more than 5 reports per rolling 24 hours;
- no more than 20 reports per rolling 30 days;
- a unique reporter, URL and explanation combination.

These controls reduce automated and duplicate submissions. They do not decide
whether a notice is true or whether content is illegal. That remains a
documented human moderation action.

The monitored legal email remains the no-account fallback. Do not copy an
unverified email notice into Appwrite as `received` until a person has checked
that it contains the required elements.

## Data exposure

Public grade records intentionally omit the submitting account. Ownership data
is stored separately and read only by the scoped Function.

Comments are rendered as text by React. They are not interpreted as HTML.
Official image and source URLs originate from known institutional sources, but
source synchronization still validates structure and expected record counts.

## Rate-limit changes

Rate-limit constants and their tests live in:

- `functions/grade-ownership/src/anti-spam.js`
- `functions/grade-ownership/src/anti-spam.test.js`

Change limits only with:

1. a documented reason;
2. updated tests;
3. a production build;
4. a new Function deployment;
5. monitoring for false positives and abnormal execution volume.

Do not rely only on IP addresses. Shared networks can place schools, offices, or
mobile users behind one address, while determined attackers can rotate
addresses.

## Operational response

When investigating suspected abuse:

1. Preserve relevant Function and Appwrite security logs.
2. Avoid exporting public comments together with account identity unless
   strictly required and authorized.
3. Identify whether the database constraint, rate limit, or content rule fired.
4. Disable an abusive account when justified rather than altering public grade
   data without an audit trail.
5. Record moderation reasoning, actions, and any appeal.
6. Follow the retention and breach procedures referenced in the
   [legal pre-launch checklist](legal-launch-checklist.md).

Security reports and privacy concerns can be sent to
[legal@classifiqa.pt](mailto:legal@classifiqa.pt) or raised by phone at
[[REDACTED]](tel:[REDACTED]).

## Account erasure failure handling

Account erasure removes linked grades before deleting the Appwrite user. If an
execution fails, inspect its log and retry the same operation; the process
tolerates already-deleted rows. Do not manually delete the user first, because
that would remove the ownership key needed to locate their public grades.
