# Technical Design Document: Sahyog

**GitHub:** https://github.com/aydee-akash/sahyog
**Live app:** _added after deploy_
**Brief:** NGO's donation platform with a women's schemes finder on the home page (Company A, Bhopal)
**Author:** Akash Deep

---

## 1. What I built and why this slice

The brief's CORE BUILD is: a schemes section on the home page with an eligibility finder, a scheme admin, a donation flow with test payment, and an instant 80G receipt PDF. There are two roles, visitor/donor and trust admin. The hard part is **correct receipt numbering and 80G PDFs under load**. I built that slice end to end and added a little well-judged depth:

| Brief item | Status |
|---|---|
| Home page led by schemes, browse by need and district | Done |
| Scheme page: benefits, documents, how to apply, nearest help centre, source link, last-checked date | Done |
| Eligibility finder, 5–6 questions | Done (6 questions; shows rules used; offers a call-back) |
| Donation: one-time and monthly (test mode), campaign pages, PAN, instant receipt + 80G | Done (monthly is recorded as a mandate; see §9) |
| Donor account with history and certificates | Done |
| Admin CMS for schemes with review before publish | Done (schemes only; campaigns and pages are not editable) |
| AI: plain-Hindi scheme summary drafts | Done, with editor approval and "not found in notice" flags |
| Accounts report by campaign + Form 10BD export | Done, basic (optional depth) |
| Hindi or spoken question in the finder | Not done (see §9) |

**The business case behind the priorities.** The brief costs the problem at ₹79 lakh a year:
- ₹9 lakh of manual receipting, which instant numbered receipts remove entirely
- ₹60 lakh of lost repeat donors, which monthly giving and an account with certificates address
- ₹10 lakh of helpline time, which the finder and scheme pages address

So the receipt engine and the finder got the most care.

## 2. Assumptions (all labelled)

| # | Assumption | Why |
|---|---|---|
| A1 | The trust's PAN (`AAATC0000X`) and 80G registration number are placeholders | Not given in the brief |
| A2 | The 9 districts are Bhopal, Sehore, Raisen, Vidisha, Rajgarh, Narmadapuram, Betul, Harda, Dewas | The brief says "9 districts of MP" without naming them |
| A3 | SCH-014/022/031 are from the brief. The other 6 schemes, their notice texts, source URLs (`notices.example.org`), help-centre addresses and phone numbers are illustrative | Need realistic sample data; must not look like real government data |
| A4 | Receipt numbers restart each Indian financial year (1 April, IST) in the format `CAT/80G/2026-27/000123` | Accounting practice; Form 10BD is filed per FY |
| A5 | Every donor gives a PAN (required). The brief says "PAN capture" | 80G certificate and Form 10BD both need the donor's PAN |
| A6 | Minimum donation ₹100, maximum ₹10 lakh online | Keeps test data sane; large gifts go through staff |
| A7 | The payment gateway returns the card's issuing country. Simulated with test BINs | Needed to block foreign cards (FCRA) |
| A8 | One receipt per paid instalment; the receipt PDF is English | The PDF library cannot shape Devanagari (§9) |
| A9 | The 10BD CSV columns follow the spirit of the bulk-upload template; exact headers must be checked against the current Income Tax portal | Template not given |
| A10 | Email and SMS delivery are mocked (the success page says so) | The brief says to mock messages |

## 3. Architecture

```
Phone browser (Hindi, 3G)
      │  server-rendered HTML, small JS islands (finder, donate stepper, editor)
      ▼
Next.js 15 App Router  (one deployable: pages + server actions + API routes)
  ├─ Server components   home, scheme, account, admin lists   → Prisma → Postgres
  ├─ Server actions      createDonation, payDonation, findSchemes, saveScheme, transitionScheme, generateDraft
  ├─ API routes          /api/receipts/:id (PDF), /api/payments/webhook (HMAC), /api/admin/form10bd (CSV)
  ├─ middleware          cookie session check for /admin and /account
  └─ lib/                receipts (numbering), eligibility (rules), payments (mock gateway), pdf, ai, validation
                                       │
                         Anthropic API (admin only, drafts only)
```

**Why this shape:**
- **One Next.js app, server-rendered.** Hindi on cheap phones over 3G needs HTML that shows up without a large JS download. Public pages ship about 106 kB first-load JS, most of it the React runtime. The finder and donate stepper are the only interactive pieces. One deployable also suits a ₹9 lakh, 8-week budget and a small team.
- **Postgres.** The hard part is a concurrency guarantee, and Postgres row locks and transactions give it directly. Prisma keeps the schema and migrations in the repo.
- **Server actions plus a few API routes.** Forms post to typed server functions that validate everything with zod. PDF, webhook and CSV endpoints are plain routes because they return files or receive third-party calls.
- **No queue for PDFs.** The PDF is rendered on request from the stored receipt row (about 20 ms with pdf-lib). It is deterministic, so a re-download always matches. Only the receipt *number* has to be issued under load, and that is a single row update.

## 4. Data model

| Table | Key fields | Notes |
|---|---|---|
| `User` | email, passwordHash (bcrypt), role DONOR/ADMIN | Seeded demo users |
| `Scheme` | code, need, districts[], Hindi content fields, `rules` (JSON), sourceUrl, noticeText, lastChecked, status DRAFT/IN_REVIEW/PUBLISHED, aiDrafted, reviewedBy | Only PUBLISHED is public |
| `HelpCentre` | district, name, phone, address | One per district |
| `Campaign` | slug, titles, goal | Campaign pages at `/donate/:slug` |
| `Donation` | **idempotencyKey (unique)**, campaign, amount, donor name/email/PAN/address, frequency, status PENDING/PAID/FAILED, paymentRef | Guest or linked to a user |
| `ReceiptCounter` | **fy (PK)**, lastNo | One row per financial year |
| `Receipt` | **number (unique)**, fy, seq, **donationId (unique)**, issuedAt | `@@unique([fy, seq])` |
| `CallbackRequest` | phone, district, schemeCodes | Requires explicit consent |
| `AuditLog` | actor, action, entity, entityId | Every CMS save, AI draft and status change |

## 5. Main flows

### 5.1 Donation, three steps (hard part)

1. **Amount + one-time or monthly.**
2. **Details:** name, email, PAN, address. `createDonation` validates and **upserts by an idempotency key** that is generated once per page load. A double tap, the back button or a 3G retry all land on the same PENDING donation.
3. **Payment:** `payDonation` → mock gateway → on success, `confirmPayment()`.

`confirmPayment(donationId)` runs in **one transaction**:

```sql
UPDATE "Donation" SET status='PAID' WHERE id=$1 AND status='PENDING';    -- 0 rows → return existing receipt
INSERT INTO "ReceiptCounter"(fy,"lastNo") VALUES ($fy,1)
  ON CONFLICT (fy) DO UPDATE SET "lastNo" = "ReceiptCounter"."lastNo" + 1
  RETURNING "lastNo";                                                    -- row lock serialises issuers
INSERT INTO "Receipt"(number, fy, seq, donationId) ...;
```

**Why this design:**
- **Gapless, not just unique.** A Postgres `SEQUENCE` is fast but leaves gaps when a transaction rolls back, and auditors read gaps as missing receipts. The counter row is only incremented inside the committing transaction, so a rollback returns the number.
- **Idempotent.** The status guard plus the unique `donationId` mean the success page, a webhook retry and a double click can all race safely. Exactly one receipt is issued.
- **Load.** The brief expects 5,000 donations in a few hours: about 1–2 a second on average, maybe 20 a second at peak. The lock is held for one indexed update. The integration test confirms **200 concurrent payments in about 130 ms locally** with numbers 1…200 and no gaps or duplicates. In production, hosted-DB latency (a few ms per statement) still leaves headroom of more than 50× at peak.
- **Financial year in IST.** A donation at 11:30 pm on 31 March IST belongs to the old year. This is tested.

The same `confirmPayment` is used by the signed webhook (`/api/payments/webhook`, HMAC-SHA256, timing-safe compare), which a real gateway would call.

**Receipt access.** The PDF is served to:
- the logged-in owner,
- an admin,
- or a guest holding the **signed link** issued after payment (a JWT bound to the donation id, valid 30 days).

Anyone else gets 403.

**80G PDF content:**
- trust name, trust PAN, 80G registration number
- donor name, donor PAN, address
- amount in figures and in Indian-system words ("Twelve Lakh Thirty Four Thousand…")
- date, mode, payment reference, campaign
- the Section 80G / Form 10BD note
- a TEST MODE banner

### 5.2 Eligibility finder

The six questions are age, marital status, BPL card (yes / no / **don't know**), SHG member, pregnancy (first / later / no), and district. There is one question per screen with large buttons. Answers are never stored.

The rules are **fixed, editable data, not AI.** Each scheme has rules such as `{minAge, maxAge, marital[], bpl, shg, pregnancy[]}` plus districts. `evaluate()` returns, per scheme:
- `NO` if any rule fails
- `MAYBE` if a rule can't be checked (e.g. "don't know" about BPL)
- `LIKELY` otherwise
- and **the list of checks with ✓ or ?**

Results say "संभावित योजनाएँ" (possible schemes) and carry a "not a promise" banner. They link to the scheme page for that district and offer a consented helpline call-back.

### 5.3 Scheme CMS with review before publish

The admin creates a scheme from the official notice text and source URL. In the editor:
- the notice sits on the left and the editable Hindi fields on the right
- "AI से सरल हिंदी ड्राफ़्ट बनाएँ" (generate plain-Hindi draft) fills the fields
- the editor checks and saves

The workflow is enforced server-side by `canTransition()`: **Draft → In review → Published**, In review → Draft (reject), Published → Draft (unpublish to edit).
- Any save moves a scheme back to Draft, so **edited content is always re-reviewed**.
- Sending for review is blocked while any required section is empty.
- Every step is written to the audit log and shown on the page.
- The list flags schemes whose last-checked date is over 90 days old.

## 6. How the AI works and what happens when it is wrong

- **Where:** admin only, `lib/ai.ts`. The model is Claude (default `claude-sonnet-5-5`), called with a forced tool call whose JSON schema has `summaryHi`, `benefitHi`, `eligibilityHi`, `documentsHi[]`, `howToApplyHi` and **`notFound[]`**.
- **Prompt rules:** use only facts in the notice; plain words for someone educated to class 5; say "मिल सकता है" (may get), never "मिलेगा" (will get); list anything missing in `notFound`.

| Failure | What the system does |
|---|---|
| AI invents or misreads a fact | Output is only a **draft**. It sits next to the source notice, is badged "AI ड्राफ़्ट: संपादक की जाँच ज़रूरी" (AI draft: editor check needed), and cannot go public without a human approving it (server-enforced) |
| Notice is missing details | `notFound[]` is shown as a yellow "confirm with the department" list |
| Malformed output | Validated with zod; rejected with "AI का ड्राफ़्ट अधूरा था…" (the AI draft was incomplete) and nothing is overwritten |
| API down, timeout or no key | 30 s timeout, 1 retry, then a clear Hindi error; the editor writes by hand. Failure is audit-logged |
| Public reader over-trusts the page | Every scheme page shows the official source link, the last-checked date and a "rules can change" note. Finder results are "possible", show the rules used, and offer a call-back |

The finder itself uses no AI. Eligibility is a rules engine, so a woman is never told she qualifies because a model guessed.

## 7. UI and design decisions

- **Hindi first, large type:** Mukta (designed for Devanagari), 18 px base, line-height 1.6, `lang="hi"`. English appears only where donors or staff need it (PDF, admin English title).
- **Warm and restrained:** paper background `#fbf8f3`, a single terracotta accent `#8a3b12` (8:1 contrast on white), soft tints for states. No photos, per the brief. Icons are inline SVG line drawings, so there are no icon fonts to download.
- **Few choices per screen:** the home page leads with the schemes promise and *one* call-to-action ("मेरे लिए कौन सी योजना है?", which scheme is for me?). Then need chips, then scheme cards whose main line is the benefit amount. Donating is a quiet band at the bottom, because the brief says women come first.
- **Finder:** one question per screen, buttons at least 56 px tall, a progress bar, "back", and a "don't know" option, because women often don't know their card type.
- **Donate:** exactly 3 steps with a visible stepper. Amount presets plus a custom amount. The button shows the amount ("₹1,000 दान करें", donate ₹1,000). Field-level Hindi errors. PAN help text explains *why* we ask. The foreign-card block is shown as a calm notice, not an error.
- **States everywhere:**
  - skeleton `loading.tsx`
  - Hindi `error.tsx` with retry
  - `not-found`
  - empty states (no scheme for this district, no donations yet)
  - pending labels on every action button
- **Accessibility (WCAG 2.1 AA intent):**
  - skip link
  - visible focus ring
  - labelled inputs and `aria-invalid`/`aria-describedby` on errors
  - `aria-current` on chips and steps
  - status messages in `role=status`/`alert`
  - touch targets at least 44 px
  - progress bars with ARIA values
- **Low-end phones:**
  - server-rendered pages
  - the district filter is a plain GET form, so it works without JS
  - no tracking scripts (brief: no ad trackers on scheme pages)
  - fonts self-hosted by `next/font` with `display: swap`

**Key screens:**
1. Home / schemes
2. Scheme detail
3. Finder + results
4. Donate (3 steps)
5. Success + 80G PDF
6. Donor account
7. Admin scheme list
8. Admin scheme editor with AI draft
9. Admin donations + 10BD

## 8. Security and privacy

- **Secrets:** none in the repo; `.env.example` has names only.
- **Auth:**
  - bcrypt passwords
  - HS256-signed, httpOnly, SameSite=Lax session cookie (8 h)
  - middleware *and* a per-action `requireAdmin()` check
  - post-login redirect limited to same-site paths
- **Input validation:** zod on every server action and route, covering:
  - PAN format, including the holder-type character
  - amount bounds and whole rupees
  - email
  - Indian mobile numbers
  - enum-checked districts and needs
- **Access control:** receipts for owner, admin or signed link; 10BD export admin-only; drafts never served publicly (`status: PUBLISHED` filter); scheme status changes only along allowed transitions.
- **CSV injection:** 10BD cells starting with `= + - @` are neutralised and every cell is quoted.
- **DPDP Act 2023:**
  - donor data is used only for receipts and 10BD (stated on the form)
  - finder answers are not stored
  - a call-back needs an explicit consent tick
  - no third-party trackers

## 9. What I cut, and what I'd do next

**Cut (honest limits):**
- **Hindi in the PDF.** pdf-lib doesn't shape Devanagari conjuncts. Next: render the certificate from HTML with headless Chromium and Noto Sans Devanagari, on a worker.
- **Real recurring billing.** Monthly is stored as a mandate and shown on the account page. Next: gateway subscriptions, a receipt per instalment from the `subscription.charged` webhook, and failed-debit retry emails.
- **Spoken or typed Hindi question in the finder.** Next: the Web Speech API or a server STT, then an LLM maps free text onto the six structured answers, which the woman confirms before matching. The rules engine stays the decider.
- **CMS for campaigns and static pages, English versions of scheme pages, scheme versioning with a diff view.** Today the workflow re-reviews edits, but a published page goes offline while it is being edited.
- **Email delivery of receipts, donor self-signup and OTP login, receipt cancellation.** Cancellation would mark the receipt void, never reuse its number.
- **Live deployment load test.** Concurrency is proven in the integration test. Next: run k6 against staging at 20 donations a second for 30 minutes and watch p95.

**Next 8-week phases:**
1. Real gateway + subscriptions + emails.
2. HTML-to-PDF in Hindi, Form 10BE issue.
3. Hindi voice finder + analytics on finder use (privacy-preserving counts toward the 50,000-uses target).
4. Retention nudges for lapsed donors (the ₹60 lakh line item).

## 10. Testing

`npm test` (Vitest), 19 tests:
- **Eligibility:** LIKELY/MAYBE/NO, age boundaries 79/80, first vs later pregnancy, district restriction, NOT_MET beats UNKNOWN
- **Validation:** PAN normalise/reject, amount bounds and fractions, email lower-casing
- **Financial year:** rollover at IST midnight on 31 March / 1 April, receipt formatting
- **Money:** Indian-system words up to lakhs
- **Mock gateway:** foreign card blocked, decline, success
- **Integration against real Postgres:** 200 concurrent confirmations give gapless 1…200; triple replay gives exactly one receipt and counter = 1; new FY restarts at 000001; a FAILED donation can't be receipted

**Manual checks:** every route renders; drafts return the not-found page; the receipt PDF returns 403 without a token or with a bad one and 200 with a valid one; the 10BD export returns 403 without an admin session.
