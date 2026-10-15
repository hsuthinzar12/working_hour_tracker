# Working Hour Tracker — Next.js + Supabase

Mobile-first worker timesheet + admin dashboard. Designed for workers using different Wi‑Fi/mobile-data connections.

## Included
- Worker mobile form (Worker ID, Name, Date, Place, Project, Hours)
- Worker monthly history
- Projects: Kingdao, Creative, Namhong
- Admin password login
- Admin month / project / place / worker filters
- Monthly worker summary
- Auto-refresh every 15 seconds
- Delete records
- CSV export (opens in Excel)
- Supabase PostgreSQL storage
- Vercel-ready Next.js App Router project

## 1. Create Supabase project
1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/schema.sql`.
4. In project settings copy:
   - Project URL
   - Service role key

Keep the service role key secret. It is used only by Next.js server routes.

## 2. Configure locally
Copy `.env.example` to `.env.local` and fill it in:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
ADMIN_PASSWORD=your-admin-password
ADMIN_SESSION_SECRET=a-long-random-secret-at-least-32-characters
```

Then:

```bash
npm install
npm run dev
```

Worker UI: `http://localhost:3000/`
Admin UI: `http://localhost:3000/admin`

## 3. Deploy to Vercel
1. Push this folder to GitHub.
2. Import the repo in Vercel.
3. Add the four environment variables above in Vercel Project Settings → Environment Variables.
4. Deploy.

After deployment, workers can open the public Vercel URL from any Wi‑Fi or mobile-data network and admin can open `/admin`.

## Important MVP security note
The database itself is protected behind server routes and the Supabase service-role key is never sent to the browser. However, worker identity is currently a simple Worker ID + Name saved on that phone. Before a larger company rollout, add a worker PIN/login so one worker cannot impersonate another or inspect another worker's history by guessing an ID.


## Clean dev-start behavior
This build does not call the admin entries API until you explicitly log in on `/admin`. This avoids the noisy `Failed to fetch` browser log that could appear during Turbopack startup/hot reload.
