# Technical Design Document: Sahyog

**GitHub:** https://github.com/aydee-akash/sahyog  
**Live app:** _added after deploy_  
**Brief:** NGO's donation platform with a women's schemes finder on the home page (Company A, Bhopal)  
**Author:** Akash Deep

---

## 1. What I built

The CORE BUILD slice works end to end: schemes on the home page, eligibility finder, scheme admin, donation flow with test payment, and an instant 80G receipt PDF. On top of that I built most of the optional MUST HAVE list and a few features chosen for this client's users.

| Brief item | Status |
|---|---|
| Home page led by schemes, browse by need and district | Done |
| Scheme page: benefits, documents, how to apply, nearest help centre, source link, last-checked date | Done, plus **read aloud** and **WhatsApp share** |
| Eligibility finder, 5–6 questions | Done: 6 questions, shows the rules used, call-back request |
| Finder takes a question **typed or spoken in Hindi** | Done: AI reads it into answers the woman confirms; a keyword reader takes over when AI is unavailable |
| Donation: one-time and monthly (test mode), campaign pages, PAN, instant receipt + 80G | Done |
| Monthly giving | Done: mandate starts on first payment; donor can pause, resume or stop; a receipt per instalment |
| Donor account with history and certificates | Done: sign-up with an email code; past guest donations are linked; history grouped by financial year |
| Admin CMS for schemes and campaigns, Hindi and English, review before publish | Done (static pages: not built) |
| AI: plain-Hindi scheme summary drafts | Done: Hindi + English drafts, editor approval, "not found in notice" flags |
| Accounts reports by campaign + Form 10BD export | Done: campaign totals, search, filters, receipt cancellation, 10BD CSV |
| Trust staff tools beyond the brief | Dashboard, call-back inbox, mock email outbox, audit log |

**Why these priorities.** The brief costs the problem at ₹79 lakh a year. Each part maps to a feature:

| Cost line | Amount | What addresses it |
|---|---|---|
| Manual receipting | ₹9 lakh | Every receipt and 80G certificate is automatic, including monthly instalments |
| Lost repeat donors (22% → 32% target) | ₹60 lakh | Monthly giving that donors control themselves, an account with all certificates, sharing |
| Helpline scheme calls (target: down 40%) | ₹10 lakh | A finder that understands her own words, read-aloud scheme pages, and a call-back queue instead of a phone wait |

The success metric "50,000 finder uses in year one" is counted anonymously and shown on the dashboard.

## 2. Assumptions (all labelled)

| # | Assumption | Why |
|---|---|---|
| A1 | The trust's PAN (`AAATC0000X`) and 80G registration number are placeholders | Not given in the brief |
| A2 | The 9 districts are Bhopal, Sehore, Raisen, Vidisha, Rajgarh, Narmadapuram, Betul, Harda, Dewas | The brief says "9 districts of MP" without naming them |
| A3 | SCH-014/022/031 are from the brief. The other 6 schemes, notices, source URLs (`notices.example.org`), help centres, phone numbers and campaigns are illustrative | Realistic sample data, clearly not real government data |
| A4 | Receipt numbers restart each Indian financial year (1 April, IST): `CAT/80G/2026-27/000123` | Accounting practice; Form 10BD is filed per FY |
| A5 | PAN is required for every donation | The 80G certificate and Form 10BD both need it |
| A6 | Online donations are ₹100 to ₹10 lakh | Larger gifts go through staff |
| A7 | The gateway reports a card's issuing country; simulated with test BINs | Needed to block foreign cards (FCRA) |
| A8 | Email and SMS are mocked: every message goes to an outbox page. In test mode the sign-up code is also shown on screen | The brief says to mock messages |
| A9 | The 10BD CSV follows the bulk-upload template in spirit; exact headers must be checked against the Income Tax portal | Template not given |
| A10 | Monthly instalments are charged by a daily job; in the demo an admin button runs it | No scheduler in test mode |
| A11 | Voice input uses the browser's speech recognition (Chrome on Android supports Hindi). The mic button is hidden where unsupported | Avoids paying for speech-to-text in phase 1 |

## 3. Architecture

```
Phone browser (Hindi first, 3G)
   │  server-rendered HTML; small JS islands: ask box, finder, donate stepper, admin editor
   ▼
Next.js 15 App Router: one deployable
   ├─ Server components   public pages, account, admin pages      ─┐
   ├─ Server actions      donate, pay, finder, understand, sign-up,  ├─ Prisma ─► Postgres
   │                      mandates, CMS, call-backs, campaigns       │
   ├─ API routes          /api/receipts/:id (PDF) · /api/payments/webhook (HMAC) · /api/admin/form10bd
   ├─ middleware          signed-cookie check for /admin and /account
   └─ src/lib             receipts · mandates · eligibility · questionParser · ai · payments · pdf · outbox · rateLimit · i18n
                                 │
                       Anthropic API, Claude Haiku 5.5 (scheme drafts for staff; reading a woman's question)
```

**Why this shape:**
- **Server-rendered.** Women on cheap phones get readable HTML before any JavaScript. Public pages load about 106–122 kB of JS, most of it the shared React runtime. I kept the donate page small by keeping the validation library out of the browser bundle (it went from 17.9 kB to 4.4 kB).
- **Postgres.** The hard part is a concurrency guarantee, and row locks and transactions give it directly. Migrations live in the repo.
- **One codebase, one deploy.** This suits a ₹9 lakh, 8-week budget and a small team. Server actions give typed calls without a separate API layer, and every one validates its input with zod.
- **Mocked edges behind a single function each.** `chargeMock` (payments), `sendMock` (email/SMS), `runDueInstalments` (scheduler) are the places a real gateway, email provider or cron would plug in.

## 4. Data model

| Table | Key fields | Notes |
|---|---|---|
| `User` | email, bcrypt hash, role DONOR/ADMIN | |
| `Scheme` | code, need, districts[], Hindi + English content, `rules` JSON, notice text, source URL, last checked, status DRAFT/IN_REVIEW/PUBLISHED, aiDrafted, reviewedBy | Only PUBLISHED is public |
| `HelpCentre` | district, name, phone, address | |
| `Campaign` | slug, Hindi/English title and description, goal, active | |
| `Donation` | **idempotencyKey (unique)**, amount, donor name/email/PAN/address, frequency, status, **mandateStatus**, **nextChargeAt**, **parentId** (instalment → mandate) | |
| `ReceiptCounter` | **fy (PK)**, lastNo | One row per financial year |
| `Receipt` | **number (unique)**, fy, seq (`@@unique([fy, seq])`), donationId (unique), **cancelledAt / reason / by** | Never deleted |
| `CallbackRequest` | phone, district, schemes, handled, note, handledBy | Consent required |
| `Outbox` | channel, to, subject, body, **dedupeKey (unique)** | Mock messages, sent once |
| `OtpCode` | email, code hash, expiry, attempts | Sign-up verification |
| `LoginAttempt` | email, ok, time | Rate limiting |
| `FinderUse` | via (QUESTIONS / AI_TEXT / VOICE), match count | No answers stored |
| `AuditLog` | actor, action, entity, detail | Every admin change |

## 5. Main flows

### 5.1 Receipt numbering under load (the hard part)

`confirmPayment(donationId)` runs in one transaction:

```sql
UPDATE "Donation" SET status='PAID' WHERE id=$1 AND status='PENDING';    -- 0 rows → return the existing receipt
INSERT INTO "ReceiptCounter"(fy,"lastNo") VALUES ($fy,1)
  ON CONFLICT (fy) DO UPDATE SET "lastNo" = "ReceiptCounter"."lastNo" + 1 RETURNING "lastNo";
INSERT INTO "Receipt"(number, fy, seq, donationId) ...;
```

- **Gapless, not just unique.** A Postgres `SEQUENCE` leaves gaps on rollback, and auditors read gaps as missing receipts. The counter row only moves inside the committing transaction.
- **Idempotent.** A double click, a webhook retry and the redirect can all race; exactly one receipt is issued. Follow-ups (starting the mandate, the receipt email) are idempotent too: the email has a unique dedupe key.
- **Cancellation never reuses a number.** The receipt is stamped CANCELLED (on the PDF too), keeps its number, and is left out of Form 10BD.
- **Measured.** `npm run load-test` confirms **5,000 donations at 50 concurrent in 1.95 s (about 2,500 receipts/s), p95 61 ms, numbers 1…5,000 with no gaps**. The brief's campaign day is 5,000 in a few hours, about 1 per second. This was run against local Postgres; a hosted database adds a few ms per statement and still leaves headroom of more than 100×.

### 5.2 Donation (3 steps) and monthly giving

1. Amount + one-time or monthly.
2. Name, email, PAN, address. The donation is upserted by an idempotency key made once per page load, so a 3G retry never creates two donations.
3. Test UPI or card. A foreign card gets a calm FCRA notice.

After payment: the success page shows the receipt number and PDF, an outbox email is sent, and guests get a signed link (no account needed).

**Monthly:** the first payment starts an ACTIVE mandate with `nextChargeAt`. `runDueInstalments()` charges every month that is due. Each instalment's idempotency key is `mandateId:dueDate`, so running the job twice never double-charges; this is tested. Paused and stopped mandates are skipped. The donor pauses, resumes or stops from the account page; ownership is part of the database WHERE clause.

### 5.3 Finder: her own words → confirmed answers → fixed rules

1. She types or speaks, e.g. "मैं 45 साल की विधवा हूँ, भोपाल में रहती हूँ, BPL कार्ड है" (I'm a 45-year-old widow living in Bhopal with a BPL card).
2. `understandQuestion()` asks Claude to fill only facts that are clearly stated (forced tool call, `null` for anything else). The output is validated by zod. A keyword reader (`questionParser.ts`: Hindi, Hinglish, English, Devanagari digits, negations) fills gaps and is used alone when AI is off or fails.
3. The **"हमने यह समझा"** (what we understood) screen lists every value with a "बदलें" (change) button, labelled "AI से समझा" (read by AI) or "शब्दों से समझा" (read by keywords).
4. Only the **missing** questions are asked.
5. The rules engine (`eligibility.ts`) decides: NO / MAYBE / LIKELY, with each rule shown as ✓ or ?. Results say "संभावित" (possible), carry a not-a-promise notice, and offer a consented call-back.

### 5.4 Scheme CMS and review

The official notice sits beside editable Hindi and English tabs. "AI draft" fills both languages and lists what the notice doesn't say. **Draft → In review → Published** is enforced on the server. Any edit sends a scheme back to Draft. Sending for review is blocked while sections are empty. Every step is audit-logged. Schemes not checked for 90 days are flagged red.

### 5.5 Staff tools

- **Dashboard:**
  - FY total and receipts
  - unique donors by PAN
  - active mandates
  - finder use (30 days, by method)
  - open call-backs
  - schemes in review
  - 14-day donation chart
  - "run monthly charges"
  - recent activity
- **Call-backs:** oldest first, tap to call, note, mark done or reopen.
- **Campaigns:** create, edit, close.
- **Donations:** search by name, PAN, email or receipt number; filter by campaign or type; cancel with a reason; 10BD CSV.
- **Outbox:** every mock email; receipt link tokens are masked.

## 6. AI: where it's used and what happens when it's wrong

| Use | Model call | When it is wrong or unsure |
|---|---|---|
| Scheme summary drafts (staff) | Structured output (`output_config.format`, zod schema) → Hindi + English fields + `notFound[]` | Only a draft, badged "AI ड्राफ़्ट" (AI draft), next to the source notice. It cannot be published without a human approving it (server-enforced). Missing facts are listed for the editor |
| Reading a woman's question | Structured output → partial answers, `null` if not stated | Every value is shown back for her to confirm or change before matching. The fixed rules engine decides eligibility, never the model |
| Both: API down, timeout, bad output or no key | 15–30 s timeout, 1 retry, zod validation | Drafts: a clear Hindi error and the editor writes by hand. Finder: falls back to the keyword reader and says so. Failures are audit-logged |
| Public over-trust | — | Source link + last-checked date on every scheme; "possible, not a promise" wording; helpline call-back |

## 7. UI and design decisions

The design starts from the women's own world, not from a template.

- **Colour (4 + 2):**
  - **neel indigo** `#26346E`: indigo dyeing is an Indian textile tradition; used for text, headings and buttons
  - **haldi yellow** `#F2B705`: turmeric, and the colour of the BPL ration card these women carry
  - **white** page, with `#F5F6FA` for quiet panels
  - **green** `#256B42` only means "matches" or "paid"
  - **red** `#B4322A` only means a problem
  - Colour carries meaning, so haldi always marks *her own words / AI*.
- **Type:** **Eczar** for headings, a typeface designed for Devanagari with a sturdy printed feel. **Mukta** for body text (18 px base, line-height 1.6). Two clearly different families, each with one job.
- **One bold element:** the haldi "अपनी बात लिखें या बोलें" (type or speak your situation) card on the home page. Everything around it is quiet.
- **A register, not a brochure:** schemes are a list with rows and dividers, like a ration register. Each row shows the scheme name, then what she gets in indigo, then one line of why. Cards appear only where a block really is one object (a campaign).
- **Headline as a question in her voice:** "आपके लिए कौन सी सरकारी योजना है?" (Which government scheme is for you?), in one colour, with no label above it.
- **Hindi first, two-option language switch:** **हिंदी | English** is always visible in the header with the current language highlighted. It is a plain form post, so it works before JavaScript loads, and the choice is remembered on every page.
- **Phone first:**
  - bottom tab bar
  - sticky header
  - buttons at least 44–56 px
  - one question per screen
  - no horizontal scrolling on any page at 375 px (checked automatically, in Hindi and English)
  - app manifest
- **For low literacy:** read aloud with the phone's own Hindi voice, WhatsApp share, tap-to-call help centres.
- **Motion only answers an action:** a result, the next question or a confirmation fades in. Nothing animates on its own, and reduced-motion settings are respected.
- **Copy:** plain verbs, and buttons say what happens ("योजनाएँ खोजें" find schemes, "₹1,000 दान करें" donate ₹1,000). An empty search shows a hint instead of a disabled button.
- **Generic defaults I deliberately removed:**
  - a cream-and-terracotta palette
  - a coloured phrase inside the headline
  - labels above headings
  - stats strips
  - gradient and "AI glow" effects
  - arrows appended to buttons
  - "A · B" separators
  - a grid of identical cards
- **States everywhere:** skeleton loading, a bilingual error page with retry, not-found, empty states, and pending labels on every button.
- **Accessibility, verified:** axe-core reports **no WCAG 2.1 A/AA violations** on home, finder results, scheme, donate, account and the admin dashboard, donations, call-backs and outbox pages. Also built in: skip link, focus rings, labelled inputs with `aria-invalid`, live regions.

## 8. Security and privacy

- **Secrets:** none in the repo; `.env.example` lists names only.
- **Auth:**
  - bcrypt hashes
  - HS256 signed httpOnly cookie
  - middleware *and* per-action role checks
  - same-site redirects only
  - **login rate limit** (5 failures in 15 minutes per email, stored in the database so it holds across servers)
  - sign-up needs a **6-digit emailed code** (hashed, 10-minute expiry, 5 tries)
  - guest donations are linked only after the email is verified
- **Validation:** zod on every action and route (PAN with holder type, whole-rupee amounts, email, Indian mobile, enums, slugs).
- **Access control:**
  - receipts are visible to the owner, an admin, or a signed 30-day link
  - drafts are never public
  - mandate changes include the owner in the WHERE clause
  - 10BD export is admin-only
- **CSV injection** is neutralised in the 10BD export. Receipt-link tokens are masked in the admin outbox.
- **DPDP Act 2023:**
  - donor data is used only for receipts and 10BD, as stated on the form
  - finder answers are never stored, only an anonymous count
  - call-backs need explicit consent
  - no trackers or ads

## 9. Testing and evidence

- **Unit and integration tests (`npm test`):** 29 tests, all passing. They cover:
  - **Eligibility:** boundaries, MAYBE vs NO, districts
  - **Keyword reader:** Hindi, English, Devanagari digits, negations, never guessing
  - **Validation:** PAN, amounts, financial-year rollover at IST midnight, Indian-system amount in words
  - **Mock gateway:** FCRA block
  - **Against real Postgres:**
    - 200 concurrent confirmations give gapless numbers
    - replays are idempotent
    - numbering resets each FY
    - FAILED donations are never receipted
    - missed instalments are charged once, and a re-run charges nothing
    - paused mandates are skipped
    - cancellation keeps the number, can't happen twice, and the next number continues
- **Load:** `npm run load-test` → 5,000 receipts, gapless, about 2,500/s (§5.1).
- **End to end in headless Chrome at phone width, from a fresh seed:**
  - AI ask → confirm → only the missing questions → results
  - English switch
  - guest monthly donation → receipt
  - sign-up with wrong then right code → guest donation linked
  - pause and resume
  - login rate limit
  - admin: run monthly charges twice (second run charges nothing), cancel a receipt, search, call-back done, campaign edit, AI draft error state, fill → review → publish → the scheme goes public
  - no console errors

## 10. What I cut, and what's next

- **Hindi inside the PDF.** pdf-lib can't shape Devanagari, so the certificate is in English. Next: HTML → PDF with headless Chromium and Noto Sans Devanagari, on a worker.
- **Real gateway, email/SMS and scheduler.** Each sits behind one function (§3). Next: Razorpay subscriptions and webhooks, an email provider, and a daily cron calling `runDueInstalments`.
- **AI: tested live on Claude Haiku 5.5** (cheapest current model). Hindi, Hinglish and "not sure" answers were extracted correctly in 1–2 s, and "मदद चाहिए" ("I need help") filled nothing; a scheme draft takes about 4 s. Next: a small evaluation set of real (anonymised) questions to measure accuracy.
- **Database is Neon (Singapore).** The office network's DNS cannot resolve `*.neon.tech`, so on that laptop the app looks the host up through public DNS (`DNS_SERVERS`); TLS still verifies the real hostname. Not needed when deployed.
- **No global loading skeleton.** A root `loading.tsx` made page updates after a server action hang whenever the database answered slowly (found in testing on Neon: receipt cancel and the language switch failed every time). Removing it fixed both. Buttons show their own pending states.
- **`npm audit`:** the remaining findings are in build-time tools (Next's CSS processor, the Prisma CLI). The runtime validation library (zod) was upgraded to v4.6.7 to fix its finding.
- **Server validation messages are Hindi-only** even in English mode. Next: move them into the dictionary.
- **Static pages CMS and scheme version history with diffs** are not built. Today an edit returns a scheme to Draft, which takes it offline until it is re-approved.
- **Admin links have prefetch turned off.** Next.js prefetching sometimes cancelled navigation on the heavier admin pages in testing. Turning it off fixed it (5 of 5 runs, versus 2 of 4 before) at the cost of a few ms per admin click.
- **Next phases:**
  1. Real payments and messages.
  2. Hindi PDF and Form 10BE.
  3. WhatsApp entry to the finder.
  4. Lapsed-donor nudges driven by the retention metric.
