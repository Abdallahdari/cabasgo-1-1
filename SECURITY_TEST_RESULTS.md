# Codka Bulshada — Security Test Results

**Target:** http://localhost:3000 (local Docker: Next.js app + MongoDB replica set)
**Executed:** 2026-11-24T14:11:33.066Z
**Method:** automated attack harness (`security/pentest.mjs`) firing real HTTP requests with dedicated test accounts.
**Admin-side tests executed:** yes

**Totals:** 79 tests — 79 SECURE, 0 VULNERABLE, 0 INFO.

Every row below was executed against the running application; the "Actual result / evidence" column is the real HTTP outcome.

## Auth

| # | Test | Attack expectation | Actual result / evidence | Verdict |
|---|------|--------|--------|--------|
| T001 | NoSQL operator injection {"$ne":null} | 400 validation error, no auth | 400 VALIDATION_ERROR | ✅ SECURE |
| T002 | NoSQL operator injection {"$gt":""} | 400 validation error, no auth | 400 VALIDATION_ERROR | ✅ SECURE |
| T003 | NoSQL operator injection {"$ne":"x"} | 400 validation error, no auth | 400 VALIDATION_ERROR | ✅ SECURE |
| T004 | Empty/missing credentials {} | 400 | 400 | ✅ SECURE |
| T005 | Empty/missing credentials {"email":"","password":""} | 400 | 400 | ✅ SECURE |
| T006 | Empty/missing credentials {"email":"pt.a.1795529490041@example.test"} | 400 | 400 | ✅ SECURE |
| T007 | Invalid password rejected | 401 | 401 INVALID_CREDENTIALS | ✅ SECURE |
| T008 | Email enumeration via login message | same error for known & unknown | known='Email-ka ama furaha sirta ah waa khalad.' unknown='Email-ka ama furaha sirta ah waa khalad.' | ✅ SECURE |
| T009 | Login timing side-channel (avg ms delta) | small delta (dummy-hash verify on unknown) | knownAvg=37.1ms unknownAvg=39.5ms delta=2.4ms | ✅ SECURE |
| T010 | Weak password rejected: "short" | 400 for no-letter/no-digit/short | 400 | ✅ SECURE |
| T011 | Weak password rejected: "1234567890" | 400 for no-letter/no-digit/short | 400 | ✅ SECURE |
| T012 | Weak password rejected: "abcdefghij" | 400 for no-letter/no-digit/short | 400 | ✅ SECURE |
| T013 | Weak password rejected: "password" | 400 for no-letter/no-digit/short | 400 | ✅ SECURE |
| T014 | Role injection at registration (role=ADMIN) | account created as CITIZEN | 201 role=CITIZEN | ✅ SECURE |
| T015 | emailVerified mass-assignment at registration | emailVerified=false (server ignores client field) | emailVerified=false | ✅ SECURE |
| T016 | Duplicate account (case-insensitive email) | 409 conflict | 409 | ✅ SECURE |
| T017 | Per-account login rate limiting (controlled) | 429 after ~5 failures, Retry-After set | locked after 6 attempts, Retry-After=209 | ✅ SECURE |
| T018 | Correct password blocked during lockout (no bypass) | 429 even with correct password | 429 | ✅ SECURE |
| T019 | Password reset user enumeration | identical status+body | exist=200:{"ok":true} ghost=200:{"ok":true} | ✅ SECURE |
| T020 | Forged reset token rejected: "123456" | 400 or 410, never 200 | 400 VALIDATION_ERROR | ✅ SECURE |
| T021 | Forged reset token rejected: "aaaaaaaaaaaaaaaa" | 400 or 410, never 200 | 410 GONE | ✅ SECURE |
| T022 | Forged reset token rejected: "../../etc" | 400 or 410, never 200 | 400 VALIDATION_ERROR | ✅ SECURE |
| T023 | Forged reset token rejected: "null" | 400 or 410, never 200 | 400 VALIDATION_ERROR | ✅ SECURE |
| T024 | Forged reset token rejected: "undefined" | 400 or 410, never 200 | 400 VALIDATION_ERROR | ✅ SECURE |
| T025 | Forged email-verification token rejected | 410 gone | 410 GONE | ✅ SECURE |

## Session

| # | Test | Attack expectation | Actual result / evidence | Verdict |
|---|------|--------|--------|--------|
| T026 | Session cookie flags (HttpOnly/SameSite/Path) | HttpOnly + SameSite + Path=/ | cb_session=NjQu6rYht1lfayKynKY0VwxDSriq1z_ajOy4Cq9mzfY; Path=/; Expires=Tue, 08 Dec 2026 14:11:31 GMT; HttpOnly; SameSite=lax | ✅ SECURE |
| T027 | Token is opaque random (not a forgeable JWT) | random base64url, server-side lookup | opaque length=43 | ✅ SECURE |
| T028 | Tampered session token rejected | user=null | me.user=null | ✅ SECURE |
| T029 | Logout invalidates session server-side (not just cookie) | authenticated before, null after reusing same token | before=sess.1795529490041.aalquxkvl68@example.test after=null | ✅ SECURE |

## CSRF

| # | Test | Attack expectation | Actual result / evidence | Verdict |
|---|------|--------|--------|--------|
| T030 | Cross-origin state-changing request blocked | 403 CSRF_REJECTED | 403 CSRF_REJECTED | ✅ SECURE |
| T031 | Cross-site request without Origin blocked | 403 | 403 CSRF_REJECTED | ✅ SECURE |
| T032 | Same-origin write permitted (control) | 201 | 201 | ✅ SECURE |

## AuthZ

| # | Test | Attack expectation | Actual result / evidence | Verdict |
|---|------|--------|--------|--------|
| T033 | Unauthenticated GET /api/admin/users | 401 | 401 | ✅ SECURE |
| T034 | Unauthenticated GET /api/admin/invitations | 401 | 401 | ✅ SECURE |
| T035 | Unauthenticated GET /api/admin/audit-logs | 401 | 401 | ✅ SECURE |
| T036 | Unauthenticated GET /api/admin/moderation | 401 | 401 | ✅ SECURE |
| T037 | Unauthenticated GET /api/notifications | 401 | 401 | ✅ SECURE |
| T038 | Unauthenticated GET /api/me/profile | 401 | 401 | ✅ SECURE |
| T039 | Unauthenticated GET /api/me/complaints | 401 | 401 | ✅ SECURE |
| T040 | Citizen GET /api/admin/users | 403 | 403 FORBIDDEN | ✅ SECURE |
| T041 | Citizen GET /api/admin/audit-logs | 403 | 403 FORBIDDEN | ✅ SECURE |
| T042 | Citizen GET /api/admin/invitations | 403 | 403 FORBIDDEN | ✅ SECURE |
| T043 | Citizen POST /api/admin/invitations | 403 | 403 FORBIDDEN | ✅ SECURE |
| T044 | Citizen GET /api/admin/moderation | 403 | 403 FORBIDDEN | ✅ SECURE |
| T045 | Citizen POST /api/complaints/6b059b124dfb087ad4ad26e3/moderate | 403 | 403 FORBIDDEN | ✅ SECURE |
| T046 | Citizen POST /api/complaints/6b059b124dfb087ad4ad26e3/status | 403 | 403 FORBIDDEN | ✅ SECURE |
| T047 | Self role escalation via profile mass-assignment | 400 (strict schema) and role stays CITIZEN | patch=400 role=CITIZEN | ✅ SECURE |
| T048 | Citizen promoting another user via admin API | 403 | 403 | ✅ SECURE |
| T049 | Admin API refuses to grant ADMIN role | 400 (enum CITIZEN|EDITOR only) | 400 | ✅ SECURE |
| T050 | Admin cannot suspend/modify own account via API | 403 | 403 | ✅ SECURE |
| T051 | Read another user's pending complaint (BOLA) | 404 (hidden from non-owner) | 404 | ✅ SECURE |
| T052 | Edit another user's complaint (BOLA) | 403/404 | 404 | ✅ SECURE |
| T053 | Delete another user's complaint (BOLA) | 403/404 | 404 | ✅ SECURE |
| T054 | authorId/_id injection on complaint create | ignored; owner = requester | status 400 | ✅ SECURE |
| T055 | Mark-notifications-read scoped to owner | updates 0 (ids not owned) | 200 updated=0 | ✅ SECURE |
| T078 | Protected page redirects unauthenticated (server-side) | 307 -> /login | 307 -> /login?next=%2Fadmin | ✅ SECURE |

## API

| # | Test | Attack expectation | Actual result / evidence | Verdict |
|---|------|--------|--------|--------|
| T056 | Public feed excessive data exposure | no email/authorId/passwordHash | no sensitive fields | ✅ SECURE |
| T057 | Anonymous author hidden even from admin | author=null, name absent | author=null | ✅ SECURE |
| T058 | Disallowed HTTP method on /api/auth/login | 405 | 405 | ✅ SECURE |
| T059 | Oversized request body rejected (DoS guard) | 400 | 400 BAD_REQUEST | ✅ SECURE |
| T060 | Non-JSON content-type rejected on JSON endpoint | 400 | 400 BAD_REQUEST | ✅ SECURE |
| T061 | Malformed JSON handled cleanly (no 500/stack) | 400, no stack trace | 400 BAD_JSON | ✅ SECURE |
| T062 | NoSQL operator injection via query string | 400 or ignored (Zod coerces to string) | 200 ok | ✅ SECURE |
| T063 | No permissive CORS on API | no ACAO: * or echoed evil origin | ACAO=(none) | ✅ SECURE |
| T064 | API responses are no-store | no-store | cache-control=no-store | ✅ SECURE |

## Upload

| # | Test | Attack expectation | Actual result / evidence | Verdict |
|---|------|--------|--------|--------|
| T065 | Reject executable (shell.exe) | 400/409 or server-generated safe key | 400 VALIDATION_ERROR  | ✅ SECURE |
| T066 | Reject SVG (XSS vector) (x.svg) | 400/409 or server-generated safe key | 400 VALIDATION_ERROR  | ✅ SECURE |
| T067 | Reject HTML (x.html) | 400/409 or server-generated safe key | 400 VALIDATION_ERROR  | ✅ SECURE |
| T068 | Reject double extension (shell.php.png) | 400/409 or server-generated safe key | 201  /api/uploads/6b059b144dfb087ad4ad26f8/file | ✅ SECURE |
| T069 | Reject path traversal filename (../../../etc/passwd.png) | 400/409 or server-generated safe key | 201  /api/uploads/6b059b144dfb087ad4ad26f9/file | ✅ SECURE |
| T070 | Reject oversized (big.png) | 400/409 or server-generated safe key | 400 VALIDATION_ERROR  | ✅ SECURE |
| T071 | Non-owner cannot upload to another's complaint | 404 | 404 | ✅ SECURE |
| T072 | Unauthenticated upload rejected | 401 | 401 | ✅ SECURE |
| T073 | Magic-byte validation rejects disguised HTML-as-PNG | 400 on confirm; object deleted | 400 BAD_REQUEST | ✅ SECURE |
| T074 | Media endpoint path traversal blocked | 404 (strict key regex) | enc=404 dotdot=404 | ✅ SECURE |
| T075 | Pending-complaint image is private (no public/other-user access) | 404 for anon & non-owner while pending | anon=404 bob=404 | ✅ SECURE |

## Misconfig

| # | Test | Attack expectation | Actual result / evidence | Verdict |
|---|------|--------|--------|--------|
| T076 | Security headers on HTML responses | CSP+XFO+nosniff+HSTS+Referrer | all present | ✅ SECURE |
| T077 | No X-Powered-By version disclosure | absent | x-powered-by=(none) | ✅ SECURE |
| T079 | Open redirect via login ?next= (actual redirect target) | external/protocol-relative next -> '/'; relative preserved | external->'/', /admin->'/admin' | ✅ SECURE |

