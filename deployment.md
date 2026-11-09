# deployment.md: Sahyog

**Repository:** https://github.com/aydee-akash/sahyog  
**Live app:** _added after deploy_

## Demo logins

| Role | Email | Password |
|---|---|---|
| Trust admin | `admin@demo.org` | `Demo@1234` |
| Donor | `donor@demo.org` | `Demo@1234` |
| Visitor | no login needed | |

You can also create a new donor account at `/signup`. Email is mocked, so in test mode the 6-digit code is shown on screen.

### 5-minute tour

1. **Home (visitor).** Type `मैं 45 साल की विधवा हूँ, भोपाल में रहती हूँ, BPL कार्ड है` ("I'm a 45-year-old widow in Bhopal with a BPL card") in the AI box, or tap **बोलें** (speak) in Chrome. Check the understood answers, answer the 2 remaining questions, and see the possible schemes with the rules used. Request a call-back.
2. **Scheme page.** Tap **सुनें** (listen) to hear it read aloud. Switch to **English** in the header.
3. **Donate.** Choose **हर महीने** (monthly) and pay with UPI `success@testupi`. Download the 80G PDF.
4. **Sign up** with the same email you donated with. The guest donation appears in **मेरा खाता** (my account), where you can pause or resume the monthly donation.
5. **Admin** (`admin@demo.org`):
   1. Dashboard → **run monthly charges** (an overdue instalment is issued; running it again charges nothing).
   2. **दान और रसीदें** (donations and receipts) → search, cancel a receipt, download the Form 10BD CSV.
   3. **कॉल-बैक** (call-backs) → mark one done.
   4. **योजनाएँ** (schemes) → **SCH-063** → AI draft (needs `ANTHROPIC_API_KEY`; without it you'll see the error state) → fill → send for review → approve and publish.
   5. **आउटबॉक्स** (outbox) shows every email the system "sent".

**Test payments** (nothing real is charged):

| Method | Value | Result |
|---|---|---|
| UPI | `success@testupi` | Paid |
| UPI | `failure@testupi` | Declined |
| Card | `4111 1111 1111 1111` | Paid |
| Card | `4000 0000 0000 0002` | Declined |
| Card | `4000 0566 5566 5556` | Foreign card blocked (FCRA notice) |

## Run locally

Prerequisites: Node 20+ and Postgres 14+ (local, Docker or a free Neon project).

```bash
git clone https://github.com/aydee-akash/sahyog.git
cd sahyog
npm install                      # also runs prisma generate
cp .env.example .env             # fill in the values (see below)
npx prisma migrate deploy        # create tables
npm run db:seed                  # sample schemes, campaigns, donors, receipts, call-backs
npm run dev                      # http://localhost:3000
```

Tests and the load test use a separate, disposable database:

```bash
createdb sahyog_test             # or any empty Postgres DB; set TEST_DATABASE_URL in .env
npm test                         # 29 unit + integration tests
npm run load-test -- 5000 50     # 5,000 donations at 50 concurrent; checks numbers are gapless
```

## Environment variables (names only)

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `SESSION_SECRET` | yes | 32+ random characters; signs session cookies and guest receipt links |
| `APP_URL` | recommended | Public base URL, used in WhatsApp share links and receipt emails |
| `ANTHROPIC_API_KEY` | no | Turns on AI scheme drafts and AI reading of finder questions. Without it, drafts show a clear error and the finder uses its keyword reader |
| `ANTHROPIC_MODEL` | no | Overrides the model (default `claude-sonnet-5-5`) |
| `PAYMENT_WEBHOOK_SECRET` | no | HMAC secret for `POST /api/payments/webhook` |
| `TEST_DATABASE_URL` | tests only | Database that the tests and load test wipe and reuse |

No secrets are committed. `.env*` is git-ignored except `.env.example`.

## How it is deployed

- **App:** Vercel, as a Next.js preset. Build command: `npm run build` (runs `prisma generate && next build`). Pages are server-rendered on request.
- **Database:** Neon serverless Postgres, Singapore region (closest to India).
- **Schema changes:** run `npx prisma migrate deploy` against the production `DATABASE_URL` before deploying a release that changes the schema. The seed runs once.
- **Monthly instalments:** the admin dashboard has a button for the demo. In production, a daily Vercel Cron would call the same `runDueInstalments()`.

Steps:
1. Create a Neon project and copy its pooled connection string.
2. Locally, set `DATABASE_URL=<neon url>`, then run `npx prisma migrate deploy && npm run db:seed`.
3. On Vercel, choose New Project → import the GitHub repo → add the env vars above (set `APP_URL` to the Vercel URL) → Deploy.
4. Open the URL and log in with the demo accounts.
