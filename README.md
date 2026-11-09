# सहयोग (Sahyog): women's schemes finder + 80G donations

A Hindi-first site for a Bhopal women's-welfare trust. Women type or speak their situation and see the government schemes they may qualify for. Donors give in three steps and get an 80G receipt instantly, once or every month. Trust staff run schemes, campaigns, receipts and call-backs from one admin.

- **Design doc:** [docs/TDD.md](docs/TDD.md)
- **Run, deploy and demo logins:** [deployment.md](deployment.md)

## Highlights
- **AI finder.** Type or speak in Hindi. AI (with a keyword fallback) turns the message into answers she confirms; a fixed rules engine shows *possible* matches and the rules it checked.
- **Scheme pages.** Benefits, documents, how to apply, nearest help centre, source link and last-checked date. Read aloud, WhatsApp share, Hindi/English.
- **Donations.** One-time or monthly (pause, resume, stop), PAN capture, FCRA foreign-card block, instant 80G PDF, receipt email (mocked).
- **Receipt engine.** Gapless per-financial-year numbering, idempotent under retries; tested with 5,000 donations in under 2 s. Cancelled receipts keep their number.
- **Admin:**
  - dashboard
  - scheme CMS with AI Hindi + English drafts and Draft → Review → Publish
  - campaigns
  - donations search and cancellation
  - Form 10BD CSV
  - call-back inbox
  - mock email outbox
  - audit log
- **Quality:**
  - 29 tests (unit + Postgres integration)
  - load test
  - axe: no WCAG 2.1 A/AA violations on key screens
  - login rate limit
  - verified sign-up
  - no trackers

## Stack
Next.js 15 (App Router, server-rendered) · TypeScript · Tailwind v4 · Lucide icons · Postgres + Prisma · `jose` sessions · `pdf-lib` · Anthropic API · Vitest.
