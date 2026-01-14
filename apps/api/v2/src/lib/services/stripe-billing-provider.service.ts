import { StripeBillingService } from "@calcom/platform-libraries";
import type { IBillingProviderService } from "@calcom/platform-libraries/organizations";
import { Injectable } from "@nestjs/common";
import { StripeService } from "@/modules/stripe/stripe.service";

@Injectable()
export class StripeBillingProviderService
  extends StripeBillingService
  implements Pick<IBillingProviderService, "createSubscriptionUsageRecord">
{
  constructor(readonly stripeService: StripeService) {
    super(stripeService.getStripe());
  }
}
