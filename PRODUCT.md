# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Citizens** in Somali cities, mostly on Android phones over mobile data. They report problems with public services (water, roads, electricity, sanitation, health, security), publicly or anonymously, and follow complaints until they are resolved.
- **Editors and admins** who moderate on laptops. They approve, reject, or hide complaints, change status, post official responses, review content reports, invite editors, and read the audit log.

Phone and desktop get equal care.

## Product Purpose

Codka Bulshada ("the voice of the community") is a Somali-first civic complaint platform. A citizen files a complaint, an editor approves and tracks it, and everyone following it is notified at each status change, all the way to resolution. Success: complaints are visibly moved from *filed* to *resolved*, in public.

## Positioning

A **public accountability record** first, with social features second. Every complaint has a reference code, a location (region → city → district), a category, and a status trail (pending → published → in progress → resolved / rejected). The trail from report to resolution is the core truth. Likes, follows, and comments are there to amplify a complaint; they are not what the product is.

## Operating Context

- Feed of published complaints, filterable by category, region, search, and status tabs (all / most supported / in progress / resolved).
- Complaint detail with images (up to 5), official responses, comments, and status history.
- Composer for new complaints (named or anonymous), plus "my complaints", following, notifications, and settings.
- Admin area: moderation queue, reports, users, invitations, categories, and audit log.
- Auth: login, register, password reset, email verification, and invitation acceptance.

## Capabilities and Constraints

- Next.js 16 App Router, Tailwind v4, shadcn/ui (radix), lucide icons, sonner toasts.
- Strict nonce-based CSP. Fonts are self-hosted via @fontsource, with no Google Fonts at runtime.
- Categories carry their own admin-defined `color` and `icon`.
- Light theme only.

## Brand Commitments

- The name **Codka Bulshada** is fixed.
- All existing Somali UI copy is kept as written. The UI language is Somali (`lang="so"`).
- The megaphone mark is *not* binding, so a new mark is allowed.

## Evidence on Hand

Real data comes from the database (complaints, stats, regions, categories). There are no testimonials, partner logos, or government endorsements, and none may be fabricated.

## Product Principles

1. The record is the product: reference code, place, status, and dates are first-class, not metadata.
2. Visible progress: the path from filed to resolved should read at a glance.
3. Anonymity is a protected, normal choice, never second-class.
4. It has to work on a cheap phone on a slow connection.
5. Moderation is fast and unambiguous for staff.

## Accessibility & Inclusion

Somali-language UI. Many users are on low-end Android devices with variable connectivity, so keep the page weight low and contrast high.

## Standing Preference

The user explicitly chose the familiar social-feed convention: the interface should feel as rich and dense as **Reddit and Facebook** (support/vote rail, category "communities", sort bar, threaded comments, three-column desktop layout). Execute that convention at full craft, with no novelty worlds.
