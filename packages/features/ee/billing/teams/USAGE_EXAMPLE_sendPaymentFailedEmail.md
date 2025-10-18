# Usage Example: InternalTeamBilling.sendPaymentFailedEmail()

This method sends a payment failure notification email to team/organization administrators with an automatically generated Stripe billing portal link.

## Basic Usage

```typescript
import { InternalTeamBilling } from "@calcom/features/ee/billing/teams/internal-team-billing";
import { getTranslation } from "@calcom/lib/server/i18n";

// Example: Stripe webhook handler for failed payments
async function handlePaymentFailed(subscriptionId: string) {
  // Find the team with this subscription
  const team = await prisma.team.findFirst({
    where: {
      metadata: {
        path: ["subscriptionId"],
        equals: subscriptionId,
      },
    },
    select: {
      id: true,
      name: true,
      parentId: true,
      metadata: true,
      isOrganization: true,
    },
  });

  if (!team) {
    console.error(`Team not found for subscription ${subscriptionId}`);
    return;
  }

  // Get team owner/admin email
  const owner = await prisma.membership.findFirst({
    where: {
      teamId: team.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: {
      user: {
        select: {
          email: true,
          locale: true,
        },
      },
    },
  });

  if (!owner) {
    console.error(`No owner found for team ${team.id}`);
    return;
  }

  // Get translation function for user's locale
  const t = await getTranslation(owner.user.locale ?? "en", "common");

  // Send the payment failed email
  const teamBilling = new InternalTeamBilling(team);
  await teamBilling.sendPaymentFailedEmail(owner.user.email, t);
}
```

## What the Method Does

1. **Retrieves subscription from Stripe** to get the customer ID
2. **Generates billing portal URL** using Stripe's billing portal API
3. **Sends email** using the generic subscription payment failed template
4. **Logs success/failure** for monitoring

## Email Content

The email sent includes:
- Team/organization name
- Notification that payment failed
- Link to Stripe billing portal to update payment method
- Support contact information

## Error Handling

```typescript
try {
  await teamBilling.sendPaymentFailedEmail(recipientEmail, t);
  console.log("Payment failed email sent successfully");
} catch (error) {
  // Error is logged internally and re-thrown
  console.error("Failed to send payment failed email:", error);
  // Handle error (e.g., notify internal team, retry later)
}
```

## Requirements

- Team must have a valid `subscriptionId` in metadata
- Subscription must exist in Stripe
- Translation function must be provided for email content

## Related

- Email template: `packages/emails/src/templates/SubscriptionPaymentFailedEmail.tsx`
- Email service: `packages/emails/email-manager.ts` (`sendSubscriptionPaymentFailedEmail`)
- Stripe billing service: `packages/features/ee/billing/stripe-billing-service.ts`
