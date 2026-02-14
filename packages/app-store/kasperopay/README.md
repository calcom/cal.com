# KasperoPay - Cal.com Payment App

Accept Kaspa (KAS) payments for Cal.com bookings.

## File Structure

```
packages/app-store/kasperopay/
├── config.json                     # App metadata
├── package.json                    # Dependencies
├── index.ts                        # Main entry point
├── DESCRIPTION.md                  # App store description
├── api/
│   ├── index.ts                    # Export API routes
│   ├── add.ts                      # Install app handler
│   └── webhook.ts                  # Payment confirmation webhook
├── lib/
│   ├── index.ts                    # Export lib modules
│   ├── kasperopayCredentialKeysSchema.ts  # Zod schema
│   └── PaymentService.ts           # Core payment logic
├── components/
│   └── KasperoPriceComponent.tsx   # Price display component
└── static/
    └── icon.svg                    # App icon
```

## Installation (for Cal.com developers)

1. Copy the `kasperopay` folder to `packages/app-store/`
2. Run `yarn app-store` to register the app
3. Add to `.env.appStore`:
   ```
   KASPEROPAY_API_URL=https://kaspa-store.com
   ```
4. Run `yarn seed-app-store` to add to database

## How It Works

1. **User enables KasperoPay** on their Cal.com account
2. **User configures merchant ID** in app settings
3. **Customer books a paid event** → Cal.com calls `PaymentService.create()`
4. **PaymentService** calls KasperoPay `/pay/init` to create payment session
5. **Customer pays** via KasperoPay widget (any Kaspa wallet)
6. **KasperoPay sends webhook** to Cal.com `/api/integrations/kasperopay/webhook`
7. **Webhook handler** verifies payment and confirms booking

## KasperoPay Server Requirements

The KasperoPay server needs these endpoints:

### POST /pay/init
Creates a payment session. Already exists in your routes_pay.js.

**Request:**
```json
{
  "merchant_id": "kpm_abc123",
  "amount": 100,
  "currency": "KAS",
  "item": "60min Consultation",
  "metadata": {
    "appId": "cal.com",
    "referenceId": "uuid-here",
    "bookingUid": "booking-uid"
  }
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "ps_xxx",
  "token": "xxx",
  "expires_at": "2024-01-01T00:00:00Z",
  "amount_kas": 100
}
```

### POST /pay/webhook (outgoing)
When payment completes, KasperoPay calls the merchant's webhook URL.

**Payload:**
```json
{
  "event": "payment.completed",
  "timestamp": "2024-01-01T00:00:00Z",
  "merchant_id": "kpm_abc123",
  "payment_id": "pay_xxx",
  "amount_kas": "100",
  "transaction_id": "txid_xxx",
  "metadata": {
    "appId": "cal.com",
    "referenceId": "uuid-here",
    "bookingUid": "booking-uid"
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `KASPEROPAY_API_URL` | Base URL for KasperoPay API (default: https://kaspa-store.com) |

## Testing

1. Create a test merchant at kaspa-store.com/merchant
2. Install app in Cal.com
3. Configure merchant ID
4. Create a paid event type
5. Book the event and complete payment
6. Verify booking is confirmed

## License

MIT - Kaspero Labs
