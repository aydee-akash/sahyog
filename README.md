# सहयोग (Sahyog): women's schemes finder + 80G donations

A Hindi-first site for a Bhopal women's-welfare trust. Women and field workers find the government schemes they can use. Donors give in three steps and get an 80G receipt instantly. The trust edits scheme pages through an AI-drafted, human-reviewed workflow.

- **Design doc:** [docs/TDD.md](docs/TDD.md)
- **Run and deploy:** [deployment.md](deployment.md)

## What works
- **Home page:** published schemes, filterable by need and district, in large-type Hindi
- **Scheme page:** benefits, documents, how to apply, nearest help centre, official source link and last-checked date
- **Eligibility finder:** 6 questions. Shows *possible* matches with the rules it checked, plus a consented call-back request
- **Donation in 3 steps:** one-time or monthly, PAN capture, mock gateway (test UPI and cards; foreign cards are blocked with an FCRA notice)
- **Instant receipt:** gapless, per-financial-year receipt number and 80G PDF
- **Donor account:** history and certificate downloads
- **Admin:**
  - scheme CMS: AI drafts plain-Hindi summaries from the official notice → an editor checks them → Draft → In review → Published, with an audit log
  - donations by campaign
  - Form 10BD CSV export

## Stack
Next.js 15 (App Router, server-rendered), TypeScript, Tailwind v4, Postgres + Prisma, `jose` sessions, `pdf-lib`, Anthropic API, Vitest.

## Tests
`npm test` covers:
- eligibility rules
- PAN, amount and financial-year validation
- the mock gateway
- an integration test: 200 concurrent payment confirmations produce 200 unique, gapless receipt numbers, and replayed confirmations stay idempotent
