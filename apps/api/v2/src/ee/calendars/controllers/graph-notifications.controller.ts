import { Body, Controller, Post, BadRequestException } from "@nestjs/common";
import { OutlookCacheService } from "../services/outlook-cache.service";
import { OutlookSubscriptionService } from "../services/outlook-subscription.service";

@Controller({
  path: "/v2/calendars/microsoft-notifications",
  version: "2",
})
export class GraphNotificationsController {
  constructor(
    private readonly outlookCacheService: OutlookCacheService,
    private readonly outlookSubscriptionService: OutlookSubscriptionService
  ) {}

  @Post("/")
  async handleNotification(@Body() notification: any) {
    // Microsoft Graph validation handshake
    if (notification && notification.validationToken) {
      return notification.validationToken;
    }
    // Security: Validate clientState for all notifications
    if (notification && notification.value) {
      for (const change of notification.value) {
        // Validate clientState if present
        if (change.clientState && !await this.outlookSubscriptionService.isValidClientState(change.clientState)) {
          throw new BadRequestException("Invalid clientState in Microsoft Graph notification");
        }
        // Invalidate cache for the resource
        await this.outlookCacheService.invalidateCacheByResource(change.resource);
      }
    }
    return { received: true };
  }

  @Post("/subscriptions/renew")
  async renewSubscriptions() {
    // Find expiring subscriptions and renew them
    // This should be called by a background worker or cron
    // ...implementation placeholder...
    return { renewed: true };
  }
}
