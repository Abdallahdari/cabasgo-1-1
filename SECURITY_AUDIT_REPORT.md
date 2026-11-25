# Codka Bulshada — Security Audit Report

**Assessment type:** authorized grey-box penetration test + source review of the owner's own application
**Environment:** local Docker stack (`docker compose`): Next.js 16 app container + MongoDB 8 replica set, `http://localhost:3000`
**Date:** 2026-11-24
**Tester role:** application security / QA
**Scope:** the Codka Bulshada application only. No external systems, no DoS, no uncontrolled brute force. All tests used dedicated throwaway accounts and test data.

> Companion file **SECURITY_TEST_RESULTS.md** lists every one of the 79 executed tests with its real HTTP response. The automated harness is committed at `security/pentest.mjs` and is re-runnable (`node security/pentest.mjs http://localhost:3000`).

---

## 1. Executive summary

A total of **79 attack probes were executed against the running application**, covering authentication, session management, authorization (vertical and horizontal / IDOR / BOLA), API hardening, file upload, injection, and security misconfiguration. After one defense-in-depth fix (below), **all 79 probes returned a secure result and 0 exploitable vulnerabilities were confirmed.**

Against the 10 attacker objectives in the brief, the application resisted every one:

| # | Attacker objective | Result |
|---|---|---|
| 1 | Register and become an administrator | **Blocked** — role is server-assigned; `role`/`status`/`emailVerifiedAt` in the request body are ignored; ADMIN is unreachable via any API. |
| 2 | Bypass login | **Blocked** — NoSQL operator injection, empty creds and malformed bodies are rejected at validation; invalid creds → 401. |
| 3 | Access protected pages & APIs | **Blocked** — every protected API returns 401/403; protected pages 307-redirect server-side. |
| 4 | Steal / manipulate another user's session | **Blocked** — opaque server-side tokens, HttpOnly/SameSite cookies, tampered tokens rejected, logout revokes server-side. |
| 5 | Reset another user's password | **Blocked** — single-use hashed tokens, forged/short/expired tokens rejected, no user enumeration. |
| 6 | Access another user's private data | **Blocked** — pending complaints 404 to non-owners; feed exposes no email/authorId; anonymous authors hidden even from admins. |
| 7 | Modify / delete unauthorized records | **Blocked** — edit/delete of another user's complaint → 404; ownership injection ignored. |
| 8 | Bypass role restrictions | **Blocked** — citizen→admin/editor APIs all 403; self-escalation 400. |
| 9 | Upload unauthorized files | **Blocked** — type/size/magic-byte validation; non-owner/anon uploads rejected; private media not publicly reachable; path traversal blocked. |
| 10 | Execute privileged operations without permission | **Blocked** — moderation/status/user-management all enforce the permission table server-side. |

**Final security score: A (Strong).** The application does not rely on the frontend for security; every control was verified to hold at the API layer.

### Findings fixed during the assessment

| ID | Severity | Title | Status |
|---|---|---|---|
| F-01 | Low (defense-in-depth) | `next` redirect parameter reflected into page before normalization | **Fixed & regression-tested** |

No High/Critical findings. F-01 was **not an exploitable open redirect** (the actual post-login navigation and the authenticated server redirect both already normalized the target to `/`); it was hardened so the raw value never enters the page at all.

---

## 2. Application architecture

- **Monolith**, Next.js 16 App Router (React Server Components). Frontend and backend are one deployable; the "backend" is the set of `/api/*` Route Handlers plus server-only services.
- **Data layer:** MongoDB + Mongoose. Transactions used for multi-document invariants.
- **Auth:** custom, server-side sessions. Passwords hashed with **Argon2id** (19 MiB, t=2). The session cookie holds a 256-bit random token; only its SHA-256 hash is stored. There is **no JWT** — so JWT algorithm-confusion / `alg:none` / signature-bypass classes are not applicable (verified: the token is opaque, not a three-part JWT).
- **Authorization:** a central permission table (`src/server/authz/permissions.ts`) mapping roles `CITIZEN | EDITOR | ADMIN` to capabilities. Every privileged route calls `requirePermission`.
- **Edge/middleware (`src/proxy.ts`):** per-request nonce CSP, an Origin/Sec-Fetch CSRF check on all state-changing `/api` requests, and optimistic auth redirects for protected pages.
- **Storage:** pluggable — S3 (presigned POST, private bucket, CloudFront OAC) in production; MongoDB GridFS locally. Both enforce the same ownership/validation rules.
- **Rate limiting:** fixed-window counters in MongoDB, shared across all app containers.

Trust boundary: **all input from the browser is treated as hostile.** Validation is centralized in Zod schemas (`src/lib/validation`), and every query value is a parsed primitive/ObjectId before reaching Mongoose.

---

## 3. Authentication assessment

**Result: Strong.** 25 probes, all secure.

- **Injection:** NoSQL operator objects (`{$ne:null}`, `{$gt:""}`) in `email`/`password` are rejected with `400 VALIDATION_ERROR` — Zod requires strings, so operator injection never reaches the query. Empty/missing credentials → 400.
- **Credential handling:** invalid password → `401 INVALID_CREDENTIALS`. **No user enumeration** — the message and status are byte-identical for a known email with a wrong password and for an unknown email.
- **Timing:** unknown accounts are compared against a dummy Argon2 hash; measured average delta between known and unknown logins was **~8 ms** (no usable side channel).
- **Brute force / lockout:** per-account failures lock at the 6th attempt with `429` + `Retry-After`; the **correct** password is still blocked while locked (no lockout bypass). A separate per-IP limit also applies. (Confirmed working so robustly that re-runs from one IP throttled the harness itself.)
- **Password policy:** short, digit-only, and letter-only passwords are rejected.
- **Registration privilege escalation / mass assignment:** sending `role: "ADMIN"`, `status`, and `emailVerifiedAt` produced a **CITIZEN** account with `emailVerified=false` — all privileged fields ignored. Duplicate (case-insensitive) emails → 409.

---

## 4. Authorization assessment

**Result: Strong.** 30+ probes, all secure. Both vertical and horizontal escalation tested.

- **Unauthenticated access:** `/api/admin/*`, `/api/me/*`, `/api/notifications` → 401.
- **Vertical escalation:** a CITIZEN calling admin/editor endpoints (list users, audit logs, invitations, moderation, status change, hide) → **403** on every one.
- **Self-escalation / mass assignment:** `PATCH /api/me/profile` with `role:"ADMIN"` → 400 (strict schema); role unchanged. The admin user API itself **cannot grant ADMIN** (enum restricted to `CITIZEN|EDITOR`), and an admin **cannot modify their own** account.
- **Horizontal (IDOR / BOLA):**
  - Reading another user's **pending** complaint → 404 (existence hidden).
  - Editing / deleting another user's complaint → 404.
  - `authorId`/`_id` injection on create → 400 (unknown keys rejected); ownership is always the requester.
  - `mark-notifications-read` with another user's IDs → updates 0 (scoped to owner).
- **Privacy:** the public feed leaks no `email`, `authorId`, or `passwordHash`. An **anonymous** complaint's author is `null` even when fetched by an admin, and the author's name never appears in the response body.

---

## 5. API security assessment

**Result: Strong.**

- **Excessive data exposure:** none detected (see §4 privacy).
- **Injection via query string:** NoSQL operator injection in feed filters is neutralized (Zod coerces to string/ObjectId); no 500s.
- **HTTP method / content-type:** disallowed method → 405; non-JSON content-type → 400; **oversized body** (70 KB) → 400 (DoS guard); **malformed JSON** → 400 with **no stack trace leaked**.
- **CSRF:** cross-origin state-changing request → `403 CSRF_REJECTED`; cross-site request with no Origin and `Sec-Fetch-Site: cross-site` → 403; same-origin control write → 201.
- **CORS:** no `Access-Control-Allow-Origin` echoed for a hostile origin; not permissive.
- **Caching:** API responses are `Cache-Control: no-store`.

---

## 6. File upload & storage assessment

**Result: Strong.**

- **Type restriction:** `.exe`, SVG (stored-XSS vector), and HTML uploads → 400. Disallowed extensions rejected.
- **Server-generated keys:** double-extension (`shell.php.png`) and path-traversal filenames (`../../../etc/passwd.png`) do **not** influence the stored object key (a server-side UUID); no `..` or `.php` reaches storage.
- **Size:** >5 MB rejected at presign and re-checked on confirm.
- **Content/magic-byte validation:** an HTML payload uploaded with a declared `image/png` type is **rejected on confirm and deleted** — extensions and declared MIME are not trusted.
- **Authorization:** a non-owner cannot presign an upload to someone else's complaint (404); unauthenticated upload → 401.
- **Private delivery:** images of a pending complaint return 404 to anonymous and other-user requests; they become public only after approval. The media endpoint rejects path-traversal (`..%2f…`, `../`).

---

## 7. OWASP Top 10 (2021) mapping

| Category | Assessment |
|---|---|
| A01 Broken Access Control | **Pass.** Vertical + horizontal escalation, IDOR/BOLA, forced browsing, mass assignment all blocked server-side. |
| A02 Cryptographic Failures | **Pass.** Argon2id password hashing; 256-bit random session tokens stored only as SHA-256; cookies `Secure` + `__Host-` prefix on https; HSTS. |
| A03 Injection | **Pass.** NoSQL operator injection blocked by Zod typing in body and query; no SQL. Output is React-escaped; CSP with nonce + `object-src 'none'`. |
| A04 Insecure Design | **Pass.** Central permission table, server-assigned roles, invitation-only editor onboarding (single-use hashed tokens), moderation gate before public visibility. |
| A05 Security Misconfiguration | **Pass.** CSP (nonce, `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Referrer-Policy, Permissions-Policy; no `X-Powered-By`; container runs as non-root; errors don't leak stack traces. |
| A06 Vulnerable & Outdated Components | **Advisory.** `npm audit --omit=dev` is clean for shipped runtime deps; 4 *moderate* advisories exist only in the dev-only `shadcn` CLI's transitive `ts-morph`/`minimatch` and are not in the production image. Keep dependencies patched. |
| A07 Identification & Auth Failures | **Pass.** Enumeration-safe, rate-limited, strong hashing, server-side session revocation, no session fixation (new token per login), logout + logout-all. |
| A08 Software & Data Integrity Failures | **Pass.** Append-only audit log (Mongoose hooks block updates/deletes); pinned script sources; CSP `strict-dynamic`. |
| A09 Logging & Monitoring Failures | **Pass (app-level).** Structured JSON logs; privileged actions audited; CloudWatch alarms defined in IaC. Logs intentionally omit secrets. |
| A10 SSRF | **N/A.** The app makes no user-controlled outbound requests; image fetch keys are regex-validated. |

---

## 8. Vulnerability table

| ID | Title | Severity | CVSS 4.0 (est.) | Affected | Status |
|---|---|---|---|---|---|
| F-01 | `next` redirect value reflected into page prior to normalization (not an exploitable open redirect) | Low | ~2.3 (CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:P/VC:N/VI:L/VA:N/SC:N/SI:N/SA:N) | `/login?next=` | **Fixed** |

No Critical, High, or Medium findings.

### F-01 detail

- **Scenario:** an attacker crafts `…/login?next=https://evil.example` hoping the app redirects there after login.
- **Pre-existing reality (tested):** post-login navigation used `safeNext()` and the authenticated-user server `redirect()` already required a `/`-relative path, so `https://evil.example`, `//evil.example`, and `https:evil.example` all resolved to `/`. **No redirect to the attacker site occurred.** The only residue was the raw string being serialized (React-escaped) into the page's RSC payload.
- **Fix:** added `safeNextPath()` in `src/lib/validation` and applied it **server-side in the login page** so the value is normalized to a safe relative path (or `/`) before it ever becomes a prop; the client reuses the same function. Absolute, protocol-relative (`//`), backslash (`/\`), and scheme (`javascript:`) targets all collapse to `/`.
- **Verification:** re-run harness shows `external -> '/'`, `/admin -> '/admin'`; unit regressions in `tests/security-regression.test.ts`.

---

## 9. Remediation / hardening recommendations

All blocking items are resolved. Remaining items are hygiene:

1. **Dependencies:** run `npm audit` periodically; the current moderate advisories are dev-only (`shadcn` CLI) and excluded from the production image, but keep them patched.
2. **Production cookie/TLS posture:** confirmed by design — `Secure` + `__Host-` prefix activate when `APP_URL` is https. Ensure production sets `APP_ENV=production` (enforced: refuses to boot without SES, S3, and https).
3. **Rate-limit observability:** consider emitting a CloudWatch metric on 429s to detect credential-stuffing campaigns.
4. **Email verification:** currently optional by request (`REQUIRE_EMAIL_VERIFICATION=false`). If abuse appears, flip to `true` without code changes.

---

## 10. Fixed vs. remaining

- **Fixed during assessment:** F-01 (redirect-parameter hardening) — committed with regression tests.
- **Remaining exploitable vulnerabilities:** none identified.
- **Remaining advisory items:** dev-only dependency advisories (A06) — not in production artifact.

---

## 11. Final security score

**A (Strong) — 79/79 executed attack probes secure, 0 confirmed exploitable vulnerabilities.**

The application correctly refuses every one of the brief's 10 attacker objectives, enforces authorization at the API layer independent of the UI, and handles injection, CSRF, IDOR, mass assignment, and malicious uploads defensively. Evidence for every claim is in **SECURITY_TEST_RESULTS.md** and reproducible via `security/pentest.mjs`.
