# Codka Bulshada

**Codka Bulshada** ("the voice of the community") is a Somali-first civic complaint platform. Citizens report problems with public services, publicly or **anonymously**. Editors moderate the reports and track them to resolution, and everyone following a complaint is notified as its status changes.

- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · MongoDB Atlas + Mongoose · Zod · AWS (S3, SES, ECS Fargate, ECR, ALB, CloudFront, Route 53, Secrets Manager, CloudWatch)
- **Architecture:** a modular monolith.

## Roles

| Role | Can do |
|---|---|
| `CITIZEN` | Register; submit complaints (named or anonymous) with up to 5 photos; edit or delete own complaint while pending; like, follow, comment and report |
| `EDITOR` | Everything a citizen can, plus: approve, reject, hide or restore complaints; change status; post official responses; hide comments; review content reports |
| `ADMIN` | Everything an editor can, plus: invite editors; suspend or reactivate users; demote editors; manage categories; read the audit log |

- Self-registration always creates a `CITIZEN`.
- `EDITOR` is granted **only** through an admin invitation. Invitations use a 256-bit random token, store only its SHA-256 hash, expire after 72 h, and are single-use (consumed atomically).
- `ADMIN` is created **only** by the CLI bootstrap (`npm run admin:create`). No API can assign it.
- Nobody can change their own role or status. Admin accounts cannot be modified through the API.

## Project layout

```
src/
  app/                    Next.js routes
    (main)/               feed, complaint pages, my complaints, notifications, settings, admin
    (auth)/               login, register, password reset, email verification, invitation acceptance
    api/                  JSON route handlers (thin: parse → authorise → call a service)
  components/             UI (shadcn/ui in components/ui). No business logic.
  lib/                    client-safe code: constants, Zod validation, API client, formatting
  server/                 server-only code
    db/                   connection, transactions, Mongoose models
    auth/                 Argon2id passwords, sessions, tokens, rate limiting, current user
    authz/                role → permission table
    services/             business logic (complaints, comments, uploads, invitations, …)
    storage/              S3 (presigned POST/GET, validation, CloudFront URLs)
    email/                SES client + Somali templates
    http/                 route wrapper, errors, cookies, request metadata
  proxy.ts                CSRF origin check, nonce-based CSP, optimistic auth redirects
  types/                  DTOs shared by server and client
scripts/                  ops CLIs: db:check, db:indexes, db:seed, admin:create, jobs:cleanup-orphans
tests/                    Vitest suites (real mongod replica set; S3/SES mocked)
infra/                    CloudFormation (ECR + app stack), deploy script, parameter example
```

## Local development

Requirements: Node 20.9+ (22 recommended), and either Docker or a MongoDB replica set.

```bash
cp .env.example .env.local          # then edit MONGODB_URI
npm install
npm run db:check                    # verifies connectivity + transaction support
npm run db:indexes && npm run db:seed
npm run admin:create -- --email you@example.org --name "Magacaaga"
npm run dev                         # http://localhost:3000
```

With `EMAIL_TRANSPORT=console`, emails such as verification, reset and invitation links are printed to the server log instead of being sent.

Photo uploads need an S3 bucket. Set `S3_BUCKET` and use an AWS profile (`AWS_PROFILE`). Without one, the upload controls explain that storage is not configured.

### With Docker Compose

```bash
docker compose up --build           # MongoDB replica set + indexes/seed + the production image
docker compose run --rm tools npm run admin:create -- --email you@example.org --name "Magaca"
```

## Quality gates

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Vitest: auth, roles, invitations, privacy, uploads, proxy, env
npm run build       # production build (standalone output)
npm run verify      # all of the above
```

## Security notes

- **Passwords:** Argon2id (19 MiB, t=2). Login runs in constant time for unknown accounts.
- **Rate limits:** per-IP and per-account limits on failed logins, stored in MongoDB so they hold across containers.
- **Sessions:** server-side. The cookie (`__Host-cb_session` on https) is HttpOnly, Secure and SameSite=Lax, and holds a random token whose hash is stored in the database. Sessions expire through a TTL index and are revoked on logout, "log out everywhere", password reset/change and account suspension. Roles are re-read from the database on every request.
- **CSRF:** SameSite cookies, plus an Origin check on every state-changing `/api` request in `src/proxy.ts`.
- **CSP:** a per-request nonce with `strict-dynamic`, `frame-ancestors 'none'`, HSTS and nosniff.
- **Privacy:** every complaint response goes through one whitelisting serializer (`server/services/serializers.ts`). Emails and author IDs are never returned. For anonymous complaints the author is `null` for everyone, including editors and admins, and the owner's own comments on that complaint are anonymised too. Photos are re-encoded in the browser to strip EXIF/GPS metadata before upload.
- **Uploads:**
  - The server authorises the request: the caller must own the complaint and it must still be pending.
  - An atomic slot reservation enforces the 5-image cap, even under concurrent requests.
  - The browser gets a **presigned POST** whose policy makes S3 itself enforce the 5 MB limit and pin the Content-Type.
  - The server-generated key is a UUID; client file names are never used.
  - On confirmation the server checks the object's size, type and magic bytes. Invalid files are deleted.
  - Unconfirmed uploads are removed by the hourly cleanup job.
  - The bucket is private. Published images are delivered by CloudFront using Origin Access Control; unpublished images use short-lived presigned GET URLs.
- **Audit log:** append-only, enforced by Mongoose hooks. It records moderation, status changes, report resolutions, user changes, invitations and category changes.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the AWS deployment.
