# Deploying Kopa Circles

The app runs on **Vercel** (web app) with a **Neon** Postgres database. Sign-in
messages go through **Resend** (email) and **Africa's Talking** (SMS). Each has a
free tier that is enough for the pilot.

Every push to `main` deploys automatically once this is set up, and each deploy
applies any new database migrations before the app goes live.

## 1. Database: Neon

The project is already linked (`neon.ts`, `.neon`). `neon env pull` writes its
connection strings to `.env.local`:

- **Pooled** (host contains `-pooler`) → `DATABASE_URL`, used by the app
- **Direct** (no `-pooler`) → `DATABASE_URL_UNPOOLED`, used by migrations

Keep `.env` pointed at local Docker: tests and `pnpm db:seed` wipe whatever
database `.env` names. Use `.env.local` only when you mean to touch Neon.

## 2. Email: Resend

1. Sign up at https://resend.com and verify a domain you own (or use
   `onboarding@resend.dev` to send only to your own address while testing).
2. Create an API key → `RESEND_API_KEY`.
3. `EMAIL_FROM` is the sender, e.g. `Kopa Circles <hello@yourdomain.com>`.

## 3. SMS: Africa's Talking (for agent sign-in)

1. Sign up at https://africastalking.com. Start in the **sandbox** (free; texts go
   to the sandbox simulator), then go live with a Kenyan sender ID.
2. `AT_USERNAME` (`sandbox` while testing) and `AT_API_KEY`. `AT_SENDER_ID` is optional.

## 4. Web app: Vercel

1. Sign up at https://vercel.com with GitHub and **Add New → Project**, then pick
   `kopa-circles`.
2. Set **Root Directory** to `apps/web`. Vercel reads `apps/web/vercel.json` for
   the install and build commands.
3. Add these **Environment Variables** (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled connection string |
   | `DATABASE_URL_UNPOOLED` | Neon direct connection string |
   | `AUTH_SECRET` | output of `openssl rand -base64 48` |
   | `PII_HASH_SALT` | output of `openssl rand -base64 48`; **never change it** after real members are added, or duplicate checks stop working |
   | `APP_URL` | your Vercel address, e.g. `https://kopa-circles.vercel.app` |
   | `KES_PER_USD` | `129` (until a live rate feed exists) |
   | `RESEND_API_KEY`, `EMAIL_FROM` | from step 2 |
   | `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER_ID` | from step 3 |

   Do **not** set `DEV_LOGIN`. The account switcher and dev outbox are disabled
   in production builds regardless.
4. Deploy. The build runs the database migrations first.

## 5. First admin

From your computer, with the Neon **direct** URL:

```sh
cd packages/db
DATABASE_URL="<direct url>" DATABASE_URL_UNPOOLED="<direct url>" pnpm create-admin:prod you@example.com "Your Name"
```

Sign in at `<APP_URL>/signin` with that email. Then add field agents under
**Agents**, and they sign in at `<APP_URL>/signin/agent` with a texted code.

## Optional: fictional sample data on a demo deployment

Only for a demo database, never for the real pilot. It deletes everything first:

```sh
cd packages/db
DATABASE_URL="<direct url>" DATABASE_URL_UNPOOLED="<direct url>" pnpm exec tsx src/seed.ts
```

Then run the first-admin step again, since seeding replaces all users.

## Safety checks built in

- The app refuses to start sign-in with the development `AUTH_SECRET` or
  `PII_HASH_SALT`, and refuses to "send" sign-in codes if email or SMS isn't
  configured, rather than silently dropping them.
- Security headers (no framing, no MIME sniffing, HSTS) are set on every page.
