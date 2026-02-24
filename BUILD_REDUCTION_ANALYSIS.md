# Build Reduction Analysis

> **Last updated:** 2026-02-24
> **Scope:** `packages/app-store/`, `packages/features/`, `apps/web/public/app-store/`

This document catalogues every self-contained feature in the monorepo that can be removed to reduce build size, bundle weight, and npm dependency surface area. Each entry includes the exact file paths, measured sizes, external npm packages it introduces, coupling level to core booking, and the precise impact of removal.

---

## Baseline measurements

| Area | Measured size |
|------|--------------|
| `packages/app-store/` (all source) | 156 MB |
| `apps/web/public/app-store/` (static assets) | 144 MB |
| `packages/features/ee/` (Enterprise Edition) | 3.2 MB |
| `packages/features/calAIPhone/` | 496 KB |
| `packages/features/insights/` | 432 KB |
| TypeScript files in `packages/app-store/` | 913 files |

**Total estimated recoverable size across all tiers:** ~18 MB code + ~79 MB static assets + removal of 6 heavy npm dependency trees.

---

## How to measure before/after

```bash
# Source footprint
du -sh packages/app-store/ packages/features/ee/ apps/web/public/app-store/

# TypeScript file count
find packages/app-store -name "*.ts" -o -name "*.tsx" | wc -l

# Build output size
ANALYZE=true yarn workspace @calcom/web build
# opens webpack-bundle-analyzer in browser

# npm dependency graph size
du -sh node_modules
```

---

## Removal tiers

Features are grouped into three tiers by risk:

- **Tier 1** — Zero coupling to core booking. Remove without any functional regression.
- **Tier 2** — Isolated but potentially enabled for some users. Requires verifying no active credentials exist before removing.
- **Tier 3** — Do not remove. Deeply wired into the booking lifecycle.

---

## Tier 1 — Remove immediately (zero functional risk)

These are either pure dead weight (unserved assets, zero imports), behind env-var gates with no active users, or admin-only tools with no end-user impact.

---

### 1.1 Salesroom demo video

| Property | Value |
|----------|-------|
| **Path** | `packages/app-store/salesroom/` · `apps/web/public/app-store/salesroom/` |
| **Total size** | **38 MB** (38 MB is a single `.mp4` file; code is 3 TS files, ~4 KB) |
| **TS files** | 3 |
| **External npm deps** | None |
| **Env vars** | None |
| **Coupling** | None — the video is referenced only from the app's own `DESCRIPTION.md` |

**Impact of removal:** 38 MB vanishes from the repo, the public asset directory, and the Vercel upload package. The Salesroom integration itself (a video-calling overlay product) still functions if kept; only the bundled demo video is removed. To remove just the video: delete `salesroom-demo.mp4` and update the `DESCRIPTION.md` to remove or replace the `<video>` reference. To remove the integration entirely: delete the full `packages/app-store/salesroom/` directory and its entry in the generated files.

---

### 1.2 Template screenshot duplicates

| Property | Value |
|----------|-------|
| **Path** | `apps/web/public/app-store/templates/` · `packages/app-store/templates/` |
| **Total size** | **~30 MB** (29 MB assets, 23 TS files) |
| **External npm deps** | None |
| **Env vars** | None |
| **Coupling** | Low — used by the form-builder's template picker |

**Impact of removal:** The `templates/` directory contains 6 sub-templates, each shipping full-resolution screenshots that are near-identical duplicates (~4.9 MB each). Consolidating to one shared screenshot set or hosting them on a CDN recovers 15–20 MB without changing any functionality. Full removal of the templates feature removes the template-picker from the routing-forms UI.

---

### 1.3 Campfire integration

| Property | Value |
|----------|-------|
| **Path** | `packages/app-store/campfire/` · `apps/web/public/app-store/campfire/` |
| **Total size** | **14 MB** (assets dominate; 3 TS files) |
| **TS files** | 3 |
| **External npm deps** | None |
| **Env vars** | `BASECAMP3_CLIENT_ID`, `BASECAMP3_CLIENT_SECRET` (shared with Basecamp3) |
| **Coupling** | None beyond app-store registry |

**Impact of removal:** 14 MB of assets removed. Zero effect on booking. Campfire is a team messaging integration with no connection to scheduling logic.

---

### 1.4 Retell AI phone system

| Property | Value |
|----------|-------|
| **Paths** | `packages/features/calAIPhone/` · `packages/app-store/retell-ai/` · `apps/web/app/api/webhooks/retell-ai/` · `packages/features/tasker/tasks/executeAIPhoneCall.ts` · `packages/features/ee/workflows/lib/reminders/aiPhoneCallManager.ts` |
| **Total size** | ~496 KB code (45 TS files in calAIPhone) + 300 KB app-store (3 files) |
| **TS files** | 48 |
| **External npm deps** | None (calls Retell's REST API) |
| **Env vars** | `RETELL_AI_KEY` · `RETELL_AI_TEST_MODE` · `RETELL_AI_TEST_EVENT_TYPE_MAP` · `RETELL_AI_TEST_CAL_API_KEY` · `NEXT_PUBLIC_CAL_AI_PHONE_NUMBER_MONTHLY_PRICE` |
| **Coupling** | Medium — hooks into workflows and event-type settings, but only activates when `RETELL_AI_KEY` is set |

**Impact of removal:** Removes AI-powered phone-call booking. The workflow reminder engine (`packages/features/ee/workflows/`) must have the `aiPhoneCallManager` import and the `AI_PHONE_CALL` step type stripped out (approximately 3 call sites). No effect on any other booking flow. Also removes the `fonio-ai`, `millis-ai`, `bolna`, `telli`, `elevenlabs`, `synthflow`, `greetmate-ai`, `lindy`, `eightxeight`, and `monobot` AI-voice apps which all share the same pattern (3 files each, no external deps, purely API-key gated).

**AI voice apps summary (all safe to remove as a group):**

| App | Path | Size | Files |
|-----|------|------|-------|
| retell-ai | `packages/app-store/retell-ai/` | 300 KB | 3 |
| fonio-ai | `packages/app-store/fonio-ai/` | 660 KB | 3 |
| millis-ai | `packages/app-store/millis-ai/` | 1.2 MB | 3 |
| bolna | `packages/app-store/bolna/` | 984 KB | 3 |
| telli | `packages/app-store/telli/` | 504 KB | 3 |
| elevenlabs | `packages/app-store/elevenlabs/` | 216 KB | 3 |
| synthflow | `packages/app-store/synthflow/` | 208 KB | 3 |
| greetmate-ai | `packages/app-store/greetmate-ai/` | 292 KB | 3 |
| lindy | `packages/app-store/lindy/` | 316 KB | 3 |
| eightxeight | `packages/app-store/eightxeight/` | 316 KB | 3 |
| monobot | `packages/app-store/monobot/` | 1.3 MB | 3 |

**Total AI voice app removal:** ~6.3 MB assets + 496 KB calAIPhone feature code

---

### 1.5 Insights analytics

| Property | Value |
|----------|-------|
| **Path** | `packages/features/insights/` |
| **Size** | 432 KB · 27 TS files |
| **External npm deps** | None (uses internal Prisma queries against a separate DB) |
| **Env vars** | `INSIGHTS_DATABASE_URL` |
| **Coupling** | **Zero cross-imports found** — it is already an island |

**Impact of removal:** Removes the `/insights` dashboard page (booking analytics charts). No other feature references this package. If `INSIGHTS_DATABASE_URL` is not set the page already shows nothing. Safe to delete the directory and remove the route from `apps/web/app/`.

---

### 1.6 Vital (health/wearables)

| Property | Value |
|----------|-------|
| **Path** | `packages/app-store/vital/` · `apps/web/public/app-store/vital/` |
| **Size** | 176 KB code (15 TS files) |
| **External npm deps** | `@tryvital/vital-node@1.4.6` · `queue@6.0.2` |
| **Env vars** | `VITAL_API_KEY` · `VITAL_WEBHOOK_SECRET` · `VITAL_DEVELOPMENT_MODE` · `VITAL_REGION` |
| **Coupling** | Low — standalone integration with no scheduling logic dependencies |

**Impact of removal:** Removes wearable/health data sync. Drops `@tryvital/vital-node` and `queue` from the dependency tree. No booking flow impact.

---

### 1.7 EE: API Keys UI

| Property | Value |
|----------|-------|
| **Path** | `packages/features/ee/api-keys/` |
| **Size** | 52 KB · 6 TS files |
| **External npm deps** | None |
| **Coupling** | Low — the API key data model lives in Prisma; this is only the settings-page UI |

**Impact of removal:** Removes the `/settings/developer/api-keys` page. Existing API keys stored in the database are unaffected; they continue to work. Only the UI for creating/revoking keys is gone.

---

### 1.8 EE: Admin impersonation

| Property | Value |
|----------|-------|
| **Path** | `packages/features/ee/impersonation/` |
| **Size** | 32 KB · 2 TS files |
| **External npm deps** | None |
| **Coupling** | None — single-purpose admin tool |

**Impact of removal:** Removes the ability for admins to impersonate users for support purposes. Zero end-user impact.

---

### 1.9 EE: Deployment tracking

| Property | Value |
|----------|-------|
| **Path** | `packages/features/ee/deployment/` |
| **Size** | 28 KB · 4 TS files |
| **External npm deps** | None |
| **Coupling** | None — stores build metadata in the DB |

**Impact of removal:** Removes internal infrastructure metadata tracking. No user-facing functionality.

---

### Tier 1 totals

| Category | Code saved | Assets saved |
|----------|-----------|--------------|
| Salesroom video | ~4 KB | **38 MB** |
| Template duplicates | 0 | ~15–20 MB |
| Campfire | ~4 KB | **14 MB** |
| Retell AI + AI voice apps | ~6.8 MB | included |
| Insights | 432 KB | — |
| Vital | 176 KB | — |
| EE: API Keys, Impersonation, Deployment | 112 KB | — |
| **Tier 1 total** | **~7.5 MB** | **~67 MB** |

---

## Tier 2 — Remove if not actively used (low–medium risk)

Each feature here is self-contained, but may have active credentials stored in the database for real users. Before removing, verify no `Credential` rows exist for that app's slug.

```sql
-- Run against your database before removing any Tier 2 integration
SELECT "appId", COUNT(*) as credential_count
FROM "Credential"
WHERE "appId" IN ('hubspot', 'zohocrm', 'pipedrive', 'closecom', 'paypal', 'hitpay', 'btcpayserver', 'alby', 'zapier', 'make', 'n8n', 'huddle01video', 'webex', 'tandemvideo', 'jitsivideo', 'shimmervideo', 'vital')
GROUP BY "appId"
ORDER BY credential_count DESC;
```

---

### 2.1 Video conferencing providers (non-essential)

Cal.com ships 11 video conferencing integrations. In practice, most deployments use 1–3. Every provider is an isolated adapter implementing the same `VideoApiAdapter` interface — removing any of them has zero effect on the others or on booking logic.

**Recommended to keep:** Zoom, Google Meet (`googlevideo`), Daily.co (`dailyvideo`)

| Integration | Path | Size | TS files | External deps | Env vars |
|-------------|------|------|----------|--------------|----------|
| Huddle01 | `packages/app-store/huddle01video/` | **4.5 MB** | 8 | None | — |
| Office365 Video | `packages/app-store/office365video/` | 2.0 MB | 12 | None | `MS_GRAPH_CLIENT_ID` · `MS_GRAPH_CLIENT_SECRET` |
| WebEx | `packages/app-store/webex/` | 1.3 MB | 8 | None | — |
| Tandem | `packages/app-store/tandemvideo/` | 344 KB | 8 | None | `TANDEM_CLIENT_ID` · `TANDEM_CLIENT_SECRET` |
| Jitsi | `packages/app-store/jitsivideo/` | 200 KB | 7 | None | — |
| Shimmer | `packages/app-store/shimmervideo/` | 272 KB | 7 | None | — |
| Mirotalk | `packages/app-store/mirotalk/` | 300 KB | 3 | None | — |
| Element Call | `packages/app-store/element-call/` | 220 KB | 3 | None | — |
| Nextcloud Talk | `packages/app-store/nextcloudtalk/` | 600 KB | 7 | None | — |
| Sirius Video | `packages/app-store/sirius_video/` | 284 KB | 3 | None | — |
| Sylapsvideo | `packages/app-store/sylapsvideo/` | 180 KB | 5 | None | — |
| Jelly | `packages/app-store/jelly/` | 524 KB | 7 | None | — |
| Riverside | `packages/app-store/riverside/` | 152 KB | 4 | None | — |
| Horizon Workrooms | `packages/app-store/horizon-workrooms/` | 832 KB | 3 | None | — |

**Impact of removal (all non-essential video providers):** ~11 MB. Hosts who had credentials for a removed provider will see a broken integration — they need to reconnect to a remaining provider. Booking pages that used a removed provider will fall back to no video link until re-configured.

---

### 2.2 CRM integrations

Salesforce is listed separately in §2.2b because it has tentacle reach into routing and attribute sync.

**2.2a — Standalone CRMs (safe to remove independently):**

| Integration | Path | Size | TS files | External deps | Env vars |
|-------------|------|------|----------|--------------|----------|
| Intercom | `packages/app-store/intercom/` | **5.8 MB** (assets) | 13 | None | — |
| HubSpot | `packages/app-store/hubspot/` | 216 KB | 10 | **`@hubspot/api-client@6.0.1`** | `HUBSPOT_CLIENT_ID` · `HUBSPOT_CLIENT_SECRET` |
| Close.com | `packages/app-store/closecom/` | 652 KB | 11 | None | `CLOSECOM_CLIENT_ID` · `CLOSECOM_CLIENT_SECRET` |
| Pipedrive | `packages/app-store/pipedrive-crm/` | 156 KB | 9 | None | — |
| Zoho CRM | `packages/app-store/zohocrm/` | 424 KB | 9 | None | `ZOHOCRM_CLIENT_ID` · `ZOHOCRM_CLIENT_SECRET` |
| Zoho Bigin | `packages/app-store/zoho-bigin/` | 236 KB | 8 | None | — |
| Attio | `packages/app-store/attio/` | 572 KB | 3 | None | — |
| Basecamp3 | `packages/app-store/basecamp3/` | 1.4 MB | 14 | None | `BASECAMP3_CLIENT_ID` · `BASECAMP3_CLIENT_SECRET` |

**Impact:** ~9.3 MB total + drops `@hubspot/api-client` from the bundle. Users with active CRM connections will lose sync; no booking flow impact.

**2.2b — Salesforce (remove as a cluster):**

Salesforce has deeper coupling than other CRMs. It is referenced by `packages/features/ee/integration-attribute-sync/` and the CRM routing logic in `packages/app-store/routing-forms/lib/crmRouting/`. Removing Salesforce safely requires also removing `integration-attribute-sync` (§2.4).

| Property | Value |
|----------|-------|
| **Path** | `packages/app-store/salesforce/` |
| **Size** | 668 KB · 39 TS files |
| **External npm deps** | `@jsforce/jsforce-node@3.10.10` · `@urql/core@5.1.1` · `@urql/exchange-retry@2.0.0` · `@jetstreamapp/soql-parser-js@6.1.0` · `@graphql-codegen/cli@5.0.5` · `graphql-config@5.1.3` · `graphql-introspection-json-to-sdl@1.0.3` · `@parcel/watcher@2.5.1` |
| **Env vars** | `SALESFORCE_CONSUMER_KEY` · `SALESFORCE_CONSUMER_SECRET` · `SALESFORCE_GRAPHQL_DELAY_MS` · `SALESFORCE_GRAPHQL_MAX_DELAY_MS` · `SALESFORCE_GRAPHQL_MAX_RETRIES` |
| **Coupling** | Medium — remove alongside `ee/integration-attribute-sync/` |

**Impact:** Drops one of the heaviest npm dependency clusters in the repo (8 packages including GraphQL codegen toolchain). Removes Salesforce contact lookup in routing forms. Must remove `integration-attribute-sync` concurrently (see §2.4).

---

### 2.3 Alternative payment processors

Stripe is the core payment processor and must be kept. Every other payment integration is an independent adapter.

| Integration | Path | Size | TS files | External deps | Env vars |
|-------------|------|------|----------|--------------|----------|
| PayPal | `packages/app-store/paypal/` | 212 KB | 14 | None | — |
| HitPay | `packages/app-store/hitpay/` | 1.4 MB | 18 | None | `NEXT_PUBLIC_API_HITPAY_PRODUCTION` · `NEXT_PUBLIC_API_HITPAY_SANDBOX` |
| BTC Pay Server | `packages/app-store/btcpayserver/` | 1.5 MB | 13 | None | — |
| Alby (Lightning) | `packages/app-store/alby/` | 480 KB | 15 | None | — |
| Mock payment app | `packages/app-store/mock-payment-app/` | 68 KB | 7 | None | `MOCK_PAYMENT_APP_ENABLED` |

**Impact of removal:** ~3.7 MB. Hosts who configured one of these processors will need to switch to Stripe. No booking flow impact for Stripe users.

---

### 2.4 EE: Directory sync (SCIM) and integration attribute sync

These two features work together. DSync handles SCIM 2.0 provisioning (syncing users from an identity provider like Okta). Integration attribute sync maps CRM fields to Cal.com user attributes, which feeds into Salesforce routing rules.

| Feature | Path | Size | TS files | Coupling |
|---------|------|------|----------|---------|
| DSync (SCIM) | `packages/features/ee/dsync/` | 148 KB | 15 | References `@calcom/features/attributes` |
| Integration attribute sync | `packages/features/ee/integration-attribute-sync/` | 216 KB | 25 | References Salesforce app-store module |

**Impact of removal:** ~364 KB code. Removes enterprise SCIM directory sync and CRM-field-to-attribute mapping. Safe to remove if not using Okta/Azure AD provisioning or Salesforce routing rules. Remove together with Salesforce (§2.2b) to eliminate all dangling references.

---

### 2.5 EE: SAML SSO

| Property | Value |
|----------|-------|
| **Path** | `packages/features/ee/sso/` |
| **Size** | 20 KB · 3 TS files |
| **External npm deps** | `@boxyhq/saml-jackson` (already listed as `serverExternalPackages` in `next.config.ts`) |
| **Env vars** | `SAML_DATABASE_URL` · `SAML_ADMINS` · `SAML_CLIENT_SECRET_VERIFIER` |
| **Coupling** | Low — authentication bypass; does not affect booking |

**Impact of removal:** Removes enterprise SAML login. Users fall back to email/password and OAuth. `@boxyhq/saml-jackson` can be removed from `serverExternalPackages` in `next.config.ts`.

---

### 2.6 Automation connectors

Each connector is a pure webhook bridge with no scheduling logic.

| Integration | Path | Size | TS files | External deps |
|-------------|------|------|----------|--------------|
| Zapier | `packages/app-store/zapier/` | 264 KB | 14 | None |
| Make (Integromat) | `packages/app-store/make/` | 952 KB | 9 | None |
| N8N | `packages/app-store/n8n/` | 1.2 MB | 3 | None |
| Pipedream | `packages/app-store/pipedream/` | 248 KB | 3 | None |
| Linear | `packages/app-store/linear/` | 88 KB | 3 | None |

**Impact of removal:** ~2.7 MB. Users lose automation triggers from those platforms; Cal.com's native webhooks continue to work. No booking flow impact.

---

### 2.7 Analytics trackers

All analytics apps inject a script tag or pixel — none affect booking logic.

| Integration | Path | Size | TS files |
|-------------|------|------|----------|
| GA4 | `packages/app-store/ga4/` | 420 KB | 6 |
| GTM | `packages/app-store/gtm/` | 252 KB | 6 |
| Fathom | `packages/app-store/fathom/` | 228 KB | 6 |
| Plausible | `packages/app-store/plausible/` | 540 KB | 6 |
| PostHog | `packages/app-store/posthog/` | 280 KB | 5 |
| Matomo | `packages/app-store/matomo/` | 432 KB | 5 |
| Umami | `packages/app-store/umami/` | 160 KB | 2 |
| Twipla | `packages/app-store/twipla/` | 268 KB | 6 |
| Meta Pixel | `packages/app-store/metapixel/` | 576 KB | 6 |
| Databuddy | `packages/app-store/databuddy/` | 152 KB | 6 |

**Impact of removal:** ~3.3 MB. Removes the ability to inject those trackers from the Cal.com settings UI. If analytics are needed, they can be added via the site's `<head>` directly.

---

### 2.8 Communication / messaging integrations

Notification-only integrations with no booking logic.

| Integration | Path | Size | TS files |
|-------------|------|------|----------|
| Discord | `packages/app-store/discord/` | 916 KB | 3 |
| Telegram | `packages/app-store/telegram/` | 428 KB | 3 |
| WhatsApp | `packages/app-store/whatsapp/` | 360 KB | 3 |
| Signal | `packages/app-store/signal/` | 164 KB | 3 |
| Skype | `packages/app-store/skype/` | 456 KB | 3 |
| Whereby | `packages/app-store/whereby/` | 168 KB | 4 |

**Impact of removal:** ~2.5 MB. Users lose in-app notification routing to those platforms. Cal.com's email notifications continue to work.

---

### 2.9 Miscellaneous niche integrations

Small integrations with no external deps and no booking logic dependencies.

| Integration | Path | Size | Notes |
|-------------|------|------|-------|
| Giphy | `packages/app-store/giphy/` | 224 KB | GIF picker in booking form |
| Demodesk | `packages/app-store/demodesk/` | 3.1 MB | Video (asset-heavy) |
| Facetime | `packages/app-store/facetime/` | 1.7 MB | Static link integration |
| Vimcal | `packages/app-store/vimcal/` | 1.3 MB | Calendar app link |
| Clic | `packages/app-store/clic/` | 1.4 MB | Scheduling link tool |
| QR Code | `packages/app-store/qr_code/` | 64 KB | Booking QR generator |
| Weather | `packages/app-store/weather_in_your_calendar/` | 172 KB | Calendar weather overlay |
| Raycast | `packages/app-store/raycast/` | 572 KB | macOS launcher extension |
| DUB | `packages/app-store/dub/` | 672 KB | Link shortener |
| Roam | `packages/app-store/roam/` | 1.2 MB | Virtual office |
| Ping | `packages/app-store/ping/` | 1.0 MB | Async video messaging |
| Granola | `packages/app-store/granola/` | 840 KB | AI meeting notes |
| Wordpress | `packages/app-store/wordpress/` | 52 KB | Embed plugin link |
| Framer | `packages/app-store/framer/` | 480 KB | Embed for Framer sites |
| ChatBase | `packages/app-store/chatbase/` | 272 KB | AI chatbot integration |
| Cron | `packages/app-store/cron/` | 1.0 MB | Calendar app (asset-heavy) |
| Amie | `packages/app-store/amie/` | 740 KB | Calendar app |
| Deel | `packages/app-store/deel/` | 756 KB | HR platform |
| Autocheckin | `packages/app-store/autocheckin/` | 508 KB | Auto check-in tool |
| BAA for HIPAA | `packages/app-store/baa-for-hipaa/` | 556 KB | HIPAA compliance form |
| Dialpad | `packages/app-store/dialpad/` | 236 KB | Business phone |
| Wipe My Cal | `packages/app-store/wipemycalother/` | 128 KB | Calendar cleanup |

**Impact of removal:** ~16 MB total across the group. Each is fully isolated. No booking logic references any of them.

---

### Tier 2 totals

| Category | Code saved | Assets saved |
|----------|-----------|--------------|
| Non-essential video providers | ~5 MB | ~6 MB |
| Standalone CRMs | ~8.9 MB | — |
| Salesforce + deps | 668 KB | — (but drops 8 npm packages) |
| Alt payment processors | ~3.7 MB | — |
| DSync + attribute sync | 364 KB | — |
| SAML SSO | 20 KB | — |
| Automation connectors | ~2.7 MB | — |
| Analytics trackers | ~3.3 MB | — |
| Communication integrations | ~2.5 MB | — |
| Miscellaneous niche | ~16 MB | — |
| **Tier 2 total** | **~43 MB** | **~6 MB** |

---

## Tier 3 — Do not remove

These features are deeply wired into the booking lifecycle. Removing them would break core functionality.

| Feature | Path | Why it must stay |
|---------|------|-----------------|
| **Routing Forms** | `packages/app-store/routing-forms/` | 82 TS files; imported by 70+ files across `packages/features/`, `packages/trpc/`, and `apps/web/`. Drives CRM routing, form responses, and the round-robin assignment engine. |
| **Stripe** | `packages/app-store/stripepayment/` | Core payment processing. `packages/features/ee/billing/` and `packages/features/ee/payments/` are built on top of it. |
| **EE: Billing** | `packages/features/ee/billing/` | 916 KB; subscription management, org credits, payment lifecycle. |
| **EE: Workflows** | `packages/features/ee/workflows/` | 584 KB; booking confirmation emails, SMS reminders, and webhook dispatches are all workflow steps. |
| **EE: Organizations** | `packages/features/ee/organizations/` | 504 KB; multi-tenancy foundation. Org slug routing, member management, and SSO are all built on this. |
| **EE: Teams** | `packages/features/ee/teams/` | 224 KB; team permission layer used by round-robin, managed event types, and role-based access. |
| **EE: Round Robin** | `packages/features/ee/round-robin/` | 208 KB; team scheduling assignment logic. |
| **EE: Managed Event Types** | `packages/features/ee/managed-event-types/` | 176 KB; org-level event type propagation. |
| **Google Calendar** | `packages/app-store/googlecalendar/` | Primary calendar sync for the majority of users. |
| **Office365 Calendar** | `packages/app-store/office365calendar/` | Primary calendar for enterprise Microsoft users. |
| **Daily.co Video** | `packages/app-store/dailyvideo/` | Used by Cal Video (the built-in conferencing solution). |
| **Zoom Video** | `packages/app-store/zoomvideo/` | Most-used third-party video provider. |

---

## Cumulative savings summary

| Tier | Code reduction | Asset reduction | npm dep trees removed |
|------|---------------|-----------------|----------------------|
| Tier 1 | ~7.5 MB | **~67 MB** | `@tryvital/vital-node`, `queue` |
| Tier 2 | ~43 MB | ~6 MB | `@jsforce/jsforce-node`, `@urql/core`, `@jetstreamapp/soql-parser-js`, `@graphql-codegen/cli`, `@hubspot/api-client`, `@boxyhq/saml-jackson` |
| **Total** | **~50 MB** | **~73 MB** | **8 heavy dep trees** |

---

## Removal procedure for any integration

### 1. Verify no active credentials (Tier 2 only)

```sql
SELECT "appId", COUNT(*) as n FROM "Credential"
WHERE "appId" = '<app-slug>'
GROUP BY "appId";
```

If `n > 0`, notify affected users before removing.

### 2. Remove the app-store source directory

```bash
rm -rf packages/app-store/<app-name>/
```

### 3. Remove the public assets

```bash
rm -rf apps/web/public/app-store/<app-name>/
```

### 4. Regenerate the app-store generated files

The generated files (`*.generated.ts`, `*.generated.tsx`) in `packages/app-store/` are built by the CLI tool. After removing a directory, regenerate:

```bash
yarn workspace @calcom/app-store-cli build
```

This updates `apps.metadata.generated.ts`, `apps.server.generated.ts`, `apps.browser.generated.tsx`, and related files to remove the deleted integration's entries. **Do not manually edit generated files.**

### 5. Remove env vars

Remove the corresponding env var definitions from:
- `.env.example`
- `turbo.json` `globalEnv` array (if present)
- Any CI/CD secret stores

### 6. For `packages/features/` removals — remove tRPC routes

Features under `packages/features/ee/` or `packages/features/` may have registered tRPC routers. Search and remove:

```bash
grep -r "<feature-name>" packages/trpc/server/routers/ --include="*.ts" -l
```

### 7. Build and type-check

```bash
yarn type-check:ci --force
yarn biome check --write .
```

Fix any dangling imports the type-checker surfaces before committing.

---

## Quick-win execution order

If doing a phased reduction, this order maximises size recovered per hour of work:

1. **Delete `salesroom-demo.mp4`** — 38 MB in 30 seconds, zero risk.
2. **Delete all Tier 1 AI voice app directories** — ~6.3 MB, run `app-store-cli build`, done.
3. **Delete `packages/features/insights/`** — 432 KB, 0 imports, no tRPC routes to touch.
4. **Delete Tier 2 niche integrations** (Demodesk, Facetime, Cron, Vimcal, Clic, Roam, Ping, Campfire) — ~21 MB assets + code, 3 files each.
5. **Delete non-essential video providers** — ~11 MB, one `app-store-cli build`.
6. **Delete alt payment processors** — ~3.7 MB.
7. **Delete standalone CRMs** — ~9 MB + drops `@hubspot/api-client`.
8. **Delete Salesforce + DSync + integration-attribute-sync together** — clears the GraphQL codegen dep tree.
9. **Delete automation connectors + analytics trackers + communication integrations** — ~8.5 MB.
