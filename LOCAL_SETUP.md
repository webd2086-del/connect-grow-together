# Running OutreachOS locally

1. `bun install` (or `npm install`)
2. `cp .env.example .env` and fill in `RESEND_API_KEY`
3. `bun run dev` → http://localhost:8080

## Resend
- `RESEND_MODE=direct` sends straight to api.resend.com with your own key — no Lovable services involved.
- One Resend account is enough. Verify your domain once (Resend dashboard → Domains, or the Email Accounts page in the app), then any address on it can send.
- In the app, add each address under Email Accounts → "Use Resend for this address", then choose it per campaign in **Send from**.

## Database
- Uses the same database as the live app via the public URL + publishable key in `.env.example`. Row-level security keeps each user's data private.
- Schema lives in `supabase/migrations` and `drizzle/migrations` if you ever move to your own database project.
- Email open tracking uses the `record_email_open` database function, so it needs no admin key.

## What still depends on Lovable
- **Gmail connect** (the "Connect Gmail" OAuth button) uses Lovable's connector gateway — it won't work locally. Use Resend.
- **SMTP mailbox storage** needs `SUPABASE_SERVICE_ROLE_KEY`, which Lovable Cloud doesn't expose.
- **Google sign-in** locally falls back to the database's own Google login; email + password always works.
- To remove these limits entirely, create your own Supabase project, run the migrations, and put its keys in `.env`.
