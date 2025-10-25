# Team Subscription Payment Failed Email

This email template is used to notify team/organization administrators when their subscription payment has failed.

## Usage Example

```typescript
import { sendTeamSubscriptionPaymentFailedEmail } from "@calcom/emails/email-manager";

// Example: Sending email when Stripe webhook receives payment_intent.payment_failed
async function handleSubscriptionPaymentFailed(
  teamId: number,
  adminEmail: string,
  teamName: string,
  stripeCustomerId: string
) {
  // Generate billing portal URL for the customer
  const billingPortalUrl = await createStripeBillingPortalSession(stripeCustomerId);
  
  // Get the admin's language preferences
  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { locale: true }
  });
  
  const t = await getTranslation(admin?.locale || "en", "common");
  
  // Send the email
  await sendTeamSubscriptionPaymentFailedEmail({
    teamName,
    billingPortalUrl,
    to: adminEmail,
    language: {
      translate: t
    }
  });
}
```

## Email Data Interface

```typescript
interface TeamSubscriptionPaymentFailedEmailData {
  teamName: string;           // Name of the team/organization
  billingPortalUrl: string;   // URL to Stripe billing portal
  to: string;                 // Email address to send to
  language: {
    translate: (key: string, variables?: Record<string, string | number>) => string;
  };
}
```

## Integration Points

This email should be sent when:
1. Stripe webhook receives `invoice.payment_failed` for a subscription
2. Payment method charge fails for a team/organization subscription
3. Scheduled retry of failed payment also fails

## Billing Portal URL Generation

To generate the billing portal URL, you can use the Stripe Billing Service:

```typescript
import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billing-service";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY!);

async function createBillingPortalUrl(customerId: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/settings/billing`,
  });
  
  return session.url;
}
```

## Translation Keys Used

- `team_subscription_payment_failed_subject`: Email subject
- `team_subscription_payment_failed_title`: Email title
- `team_subscription_payment_failed_description`: Main description text
- `team_subscription_payment_failed_next_steps`: Next steps text
- `team_subscription_payment_failed_contact_support`: Support contact text
- `update_payment_method`: CTA button text

All translations are in `/apps/web/public/static/locales/{locale}/common.json`
