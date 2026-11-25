# Deploy Codka Bulshada for free (public test before AWS)

This gets the **whole website live on a public HTTPS URL** at no cost and with no credit card, using the same Docker image you'll later run on AWS ECS. It's the best faithful test before committing to AWS.

**Stack:** Render (app, free) + MongoDB Atlas M0 (database, free) + GridFS (images, in Mongo) + console email.

You do 3 things that need your own login (I can't create accounts or sign in as you); everything else is already prepared in this repo (`Dockerfile`, `render.yaml`).

Total time: ~15 minutes, mostly waiting for the first build.

---

## Step 1 — MongoDB Atlas (free database, ~5 min)

1. Go to <https://www.mongodb.com/cloud/atlas/register> and sign up (free, no card).
2. **Create a cluster** → choose **M0 (Free)**. Pick a region near you (e.g. Frankfurt/Ireland). Create.
3. **Database Access** → Add New Database User → username + a strong password → Role: **Read and write to any database** (or just `codka_bulshada`). Save the password.
4. **Network Access** → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`). *(Fine for a test; for production you'd restrict this.)*
5. **Connect** → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<password>` with the real password. Keep this string handy — it's the `MONGODB_URI`.

> M0 is a 3-node replica set, so database transactions work exactly like production.

---

## Step 2 — Put this project on GitHub (~3 min)

The repo is already committed locally. Create an empty GitHub repo (no README), then from this folder:

```bash
git remote add origin https://github.com/<your-username>/codka-shacabka.git
git push -u origin main
```

(If `origin` already exists, use `git remote set-url origin <url>` instead.)

Nothing secret is pushed — `.env.local` and all `.env*` files are gitignored (only `.env.example` ships).

---

## Step 3 — Render (free hosting, ~5 min + build)

1. Go to <https://render.com> → sign up with your GitHub account (free, no card).
2. **New** → **Blueprint** → select your `codka-shacabka` repo. Render detects `render.yaml`.
3. It will ask for the two secret values:
   - **MONGODB_URI** → paste the Atlas string from Step 1.
   - **APP_URL** → your service URL. It will be `https://codka-bulshada.onrender.com` (or Render shows the exact name). If unsure, put `https://codka-bulshada.onrender.com` now and correct it in Step 4 if the real URL differs.
4. **Apply** → Render builds the Docker image and deploys. First build takes ~3–6 min.

---

## Step 4 — Finish setup (~2 min)

1. When the service is live, open its URL. If it differs from what you set, go to the service → **Environment** → fix `APP_URL` to the exact `https://…onrender.com` URL → save (it redeploys).
2. **Seed the database and create your admin.** In the Render dashboard, open your service → **Shell** tab, and run:
   ```bash
   npm run db:indexes && npm run db:seed
   npm run admin:create -- --email abdallah@gmail.com --name "Abdallah" --allow-weak-password
   ```
   (Set `ADMIN_PASSWORD` first if you want a specific password: `ADMIN_PASSWORD=70078117 npm run admin:create -- --email abdallah@gmail.com --name "Abdallah" --allow-weak-password`. It prints a generated one otherwise.)

   *Alternatively*, run these from your own machine against Atlas before deploying:
   ```bash
   # local, pointing at Atlas
   MONGODB_URI="<your atlas string>" APP_ENV=development APP_URL=https://codka-bulshada.onrender.com npm run db:indexes
   MONGODB_URI="<your atlas string>" APP_ENV=development APP_URL=https://codka-bulshada.onrender.com npm run db:seed
   MONGODB_URI="<your atlas string>" APP_ENV=development APP_URL=https://codka-bulshada.onrender.com ADMIN_PASSWORD=70078117 npm run admin:create -- --email abdallah@gmail.com --name "Abdallah" --allow-weak-password
   ```

3. Done. Visit your URL, register, post a complaint with photos, and log in as admin to moderate.

---

## Notes & limits (it's a free tier)

- **Cold starts:** the free Render service sleeps after ~15 min idle; the next request takes ~30s to wake. Normal for free hosting.
- **Email:** `EMAIL_TRANSPORT=console`, so password-reset / invite / (optional) verification links appear in the Render **Logs** tab, not a real inbox. Verification is off, so normal posting doesn't need it.
- **Images:** stored in MongoDB (Atlas M0 has 512 MB free — plenty for testing). Large photos are re-encoded to small WebP in the browser first.
- **This is a test deployment, not production.** For AWS, use `docs/DEPLOYMENT.md` (ECS + S3 + SES + CloudFront). The only differences there: `APP_ENV=production`, `STORAGE_DRIVER=s3`, and real SES email.

---

## Even faster alternative: Vercel

If you'd rather use the Vercel CLI (one command, no GitHub step):

```bash
npx vercel            # logs you in via browser, then deploys
# set env vars when prompted or in the dashboard:
#   MONGODB_URI, APP_URL=https://<project>.vercel.app, APP_ENV=development,
#   STORAGE_DRIVER=mongodb, EMAIL_TRANSPORT=console,
#   REQUIRE_EMAIL_VERIFICATION=false, TRUSTED_PROXY_HOPS=1
```

Caveat: Vercel serverless caps request bodies at **4.5 MB**, just under the app's 5 MB image limit — typical re-encoded photos are far smaller so uploads usually work, but a near-5 MB image could fail. Render has no such limit, which is why it's the recommended path.
