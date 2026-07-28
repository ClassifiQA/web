# ClassifiQA - legal launch checklist

Reviewed against the law in force on 26 July 2026. This checklist records
launch work that legal copy cannot perform by itself. It is not a substitute
for advice from a Portuguese lawyer who knows the operator and the final
service.

Tick an item only after recording the completion date, owner and supporting
evidence in the relevant operational or legal record.

The Terms and Privacy Policy already publish the declared processors, retention
periods, cookie/storage technologies, rights channels and notice requirements.
The operational items below are not requests to repeat that text. They require
evidence that production matches it: signed agreements, configured retention,
tested procedures and recorded assessments.

## Blocking before publication

- [x] Activate and monitor `legal@classifiqa.pt` and the work number
      `[REDACTED]`. Confirmed by the operator on 28 July 2026.
- [ ] Document the secure triage, identity-verification, access and response
      procedure for requests from users, the CNPD, ANACOM, courts and other
      competent authorities.
- [ ] Have Portuguese counsel validate the independent-worker disclosures,
      minor-user flow, consumer-law status and the legal basis for processing party
      affiliation and public-official data.
- [x] Publish the controller identity and direct contact details. `Daniel Querido`,
      `legal@classifiqa.pt` and `[REDACTED]` are identified in the Terms and
      Privacy Policy. Confirmed by the operator on 28 July 2026.
- [x] Deploy and verify the implemented `account-erasure` Function. A disposable
      verified account was tested in production on 28 July 2026: its account,
      rating, comment and ownership row were removed, while its retained report
      was anonymised.
- [ ] Verify that deleted account data ages out of weekly backups through the
      documented two-version rotation, and retain evidence of the test.
- [ ] Configure and verify the stated retention controls: technical and security
      logs up to 12 months, final moderation records for 6 months and closed support
      or privacy correspondence for up to 24 months, subject to documented legal
      exceptions.
- [x] Deploy and verify the structured illegal-content notice intake. A
      disposable verified account submitted a production notice on 28 July 2026;
      the Function returned an acknowledgement reference, kept the row private,
      rate-limited an immediate repeat and anonymised the retained notice when
      the account was deleted.
- [ ] Test the complete human moderation and appeal procedure, including a
      reasoned decision record and the monitored email fallback.
- [ ] Accept and archive Article 28 GDPR data-processing agreements with Hostinger
      and Cloudflare. Record where their support staff and subprocessors can access
      data, and document the transfer assessment for Cloudflare's global network and
      any Hostinger access outside the EEA.
- [ ] Inventory the exact production cookies, local-storage keys and lifetimes.
      Strictly necessary Appwrite, Cloudflare and theme technologies do not require
      a marketing-style consent choice, but must remain accurately disclosed.
      Obtain prior consent before adding analytics, advertising or any other
      non-essential access to a user's device. Any banner must not falsely suggest
      that necessary cookies can be rejected.
- [ ] Keep weekly summaries and product marketing disabled until the feature,
      consent evidence, unsubscribe route and legal copy are ready.
- [ ] Implement the promised profile visibility controls. Role, school and the
      username must remain private by default. A specific, informed user action is
      required before any of those values accompany public comments or replies.
- [ ] Document a legitimate-interest assessment for security, moderation and the
      public directory. Document the Article 37 DPO assessment and assess whether a
      DPIA is required before large-scale monitoring, profiling or special-category
      processing.
- [ ] Maintain a record of processing activities, access-control review,
      data-subject request procedure and personal-data breach procedure.
- [x] Deploy and verify the `grade-ownership` active-member guard. A direct
      authenticated production Function call against a disposable inactive
      office-holder returned HTTP 409 on 28 July 2026, and no rating was created.
- [x] Complete the wider rating privacy verification: confirm one rating per
      account and active office-holder, anonymous public presentation and
      aggregate-only identity handling throughout production.

## Before enabling planned services

- [ ] Before reCAPTCHA, complete the Google Cloud data-processing terms, assess the
      transfer and cookie implications, add Google to the privacy notice and collect
      consent if the final implementation is not strictly necessary.
- [ ] Before self-hosted GlitchTip or uptime monitoring, document the data collected,
      remove sensitive payloads, set retention and access controls and update the
      policy before collection starts.
- [ ] Before Stripe or Buy Me a Coffee donations, update the Terms and privacy
      policy with the live provider, payment data flow, international transfers and
      fiscal retention. Confirm whether this changes consumer-law or electronic
      complaints-book duties.
- [ ] Before automated moderation, document the system, error and bias controls,
      human review and appeal workflow, then update the policy before processing.

## Ongoing reassessment

- [ ] If ClassifiQA ceases to qualify as a micro or small enterprise, implement the
      additional Digital Services Act transparency and online-platform duties.
      Record the basis for any exemption rather than assuming it.
- [ ] Reassess the age threshold and parental-authorisation mechanism before
      actively targeting schools or minors.
- [ ] Complete a DPIA before any likely high-risk, large-scale processing of
      political opinions, behaviour or systematic monitoring.

## Authoritative references

- [GDPR - Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [Digital Services Act - Regulation (EU) 2022/2065](https://eur-lex.europa.eu/eli/reg/2022/2065/oj)
- [Portuguese GDPR implementation - Law 58/2019](https://diariodarepublica.pt/dr/detalhe/lei/58-2019-123815982)
- [Portuguese electronic-commerce law - Decree-Law 7/2004, consolidated Article 10](https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2004-73199154-73197494)
- [Portuguese cookies/e-privacy law - Law 41/2004](https://diariodarepublica.pt/dr/detalhe/lei/41-2004-480710)
- [Portuguese Digital Services Act implementation - Law 12-A/2026](https://diariodarepublica.pt/dr/detalhe/lei/12-a-2026-1086140524)
- [Consumer ADR information duties - Law 144/2015](https://diariodarepublica.pt/dr/detalhe/lei/144-2015-70215248)
- [CNPD complaint and public contact information](https://www.cnpd.pt/cnpd/atendimento-ao-publico/)
- [Repeal of the former EU ODR platform - Regulation (EU) 2024/3228](https://eur-lex.europa.eu/eli/reg/2024/3228/oj)
