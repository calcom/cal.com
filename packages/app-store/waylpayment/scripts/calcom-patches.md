# Cal.com Monorepo — Integration Steps

After copying `waylpayment/` to `packages/app-store/waylpayment/`, follow these steps.

---

## The short version

```bash
# 1. Copy app into monorepo
cp -r waylpayment  cal.com/packages/app-store/waylpayment

# 2. In the monorepo — regenerate all app-store files
cd cal.com
yarn app-store:build

# 3. Seed the database
# ⚠ Verify DATABASE_URL points to your LOCAL dev database before running
psql --set=ON_ERROR_STOP=1 $DATABASE_URL -f packages/app-store/waylpayment/scripts/db-seed.sql

# 4. Start dev server (keep app-store:watch running in a second terminal)
yarn app-store:watch &
yarn dev
```

That's it. `yarn app-store:watch` automatically generates and keeps up to date:
- `packages/app-store/apps.metadata.generated.ts`
- `packages/app-store/apps.schemas.generated.ts`
- `packages/app-store/payment.services.generated.ts`

You do **not** need to manually edit any of those files.

---

## Only one file needs a manual edit

### packages/app-store/index.ts

Add one line alongside the other payment app exports:

```ts
export * as waylpayment from "./waylpayment";
```

---

## Environment variables

Add to your Cal.com `.env`:

```
NEXT_PUBLIC_WEBAPP_URL=https://your-cal-domain.com
CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY=<run: openssl rand -base64 32>
```

No `WAYL_*` variables needed globally — the API key is stored per-user in
the database (encrypted), and the webhook secret is generated per-booking.

---

## Verifying it works

1. `yarn dev` → open http://localhost:3000
2. Go to **App Store** → search "Wayl" → click **Install**
3. Paste your Wayl Merchant Token → **Connect**
4. Open any event type → **Payment** tab → enable **Require Payment** → set price in IQD
5. Open your booking link → fill the form → you should be redirected to `link.thewayl.com`
6. Complete a test payment → booking should be confirmed automatically
