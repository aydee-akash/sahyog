# deployment.md: Sahyog

**Repository:** https://github.com/aydee-akash/sahyog
**Live app:** _added after deploy_

## Demo logins

| Role | Email | Password | What to try |
|---|---|---|---|
| Trust admin | `admin@demo.org` | `Demo@1234` | Schemes → open **SCH-063** (draft) → "AI से सरल हिंदी ड्राफ़्ट बनाएँ" (generate Hindi draft) → save → send for review → approve and publish. Then see **दान और रसीदें** (donations and receipts) and the Form 10BD CSV |
| Donor | `donor@demo.org` | `Demo@1234` | **मेरा खाता** (my account): history and 80G PDFs. Donate while logged in and the donation appears here |
| Visitor | (no login) | | Home → filter schemes → finder → donate as a guest (the receipt comes back as a signed link) |

**Test payments** (nothing real is charged):

| Method | Value | Result |
|---|---|---|
| UPI | `success@testupi` | Paid |
| UPI | `failure@testupi` | Declined |
| Card | `4111 1111 1111 1111` | Paid |
| Card | `4000 0000 0000 0002` | Declined |
| Card | `4000 0566 5566 5556` | Foreign card blocked (FCRA notice) |

## Run locally

Prerequisites: Node 20+ and a Postgres 14+ database (local, Docker or a free Neon project).

```bash
git clone https://github.com/aydee-akash/sahyog.git
cd sahyog
npm install                      # also runs prisma generate
cp .env.example .env             # then fill in the values (see below)
npx prisma migrate deploy        # create tables
npm run db:seed                  # sample schemes, campaigns, donors, receipts
npm run dev                      # http://localhost:3000
```

Tests need a separate, disposable database:

```bash
createdb sahyog_test             # or any empty Postgres DB
# set TEST_DATABASE_URL in .env
npm test
```

## Environment variables (names only)

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `SESSION_SECRET` | yes | 32+ random characters; signs session cookies and guest receipt links |
| `ANTHROPIC_API_KEY` | no | Enables AI Hindi drafts. Without it the admin sees a clear error and writes the summary by hand |
| `ANTHROPIC_MODEL` | no | Overrides the model (default `claude-sonnet-5-5`) |
| `PAYMENT_WEBHOOK_SECRET` | no | HMAC secret for `POST /api/payments/webhook` |
| `TEST_DATABASE_URL` | tests only | Database the integration tests wipe and reuse |

No secrets are committed. `.env*` is git-ignored except `.env.example`.

## How it is deployed

- **App:** Vercel, as a Next.js preset. Build command: `npm run build` (runs `prisma generate && next build`). Every page is server-rendered on request.
- **Database:** Neon serverless Postgres in the Singapore region (closest to India).
- **Schema changes:** `npx prisma migrate deploy` runs against the production `DATABASE_URL` before each deploy that changes the schema. The seed runs once.

Steps:
1. Create a Neon project and copy its pooled connection string.
2. Locally, set `DATABASE_URL=<neon url>`, then run `npx prisma migrate deploy && npm run db:seed`.
3. On Vercel, choose New Project → import the GitHub repo → add the env vars above → Deploy.
4. Open the URL and log in with the demo accounts.
