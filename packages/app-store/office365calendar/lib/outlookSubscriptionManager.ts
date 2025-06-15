import { CalendarCache } from "@calcom/features/redis/calendarCache";
import logger from "@calcom/lib/logger";
import { getOffice365AppKeys } from "./getOfficeAppKeys";
import type { CredentialPayload } from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["outlookSubscriptionManager"] });

// Maximum subscription lifetime in minutes (3 days minus 1 hour for safety margin)
const MAX_SUBSCRIPTION_LIFETIME_MINUTES = 4140;

export class OutlookSubscriptionManager {
  private calendarCache: CalendarCache;

  constructor() {
    this.calendarCache = new CalendarCache();
  }

  async createSubscription(
    credential: CredentialPayload,
    calendarId: string,
    userId: number
  ): Promise<{ subscriptionId: string; expirationDateTime: string } | null> {
    try {
      const { client_id, client_secret } = await getOffice365AppKeys();
      const { token } = JSON.parse(credential.key as string);

      // Create subscription expiration date (3 days from now)
      const expirationDateTime = new Date();
      expirationDateTime.setMinutes(expirationDateTime.getMinutes() + MAX_SUBSCRIPTION_LIFETIME_MINUTES);

      const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.access_token}`,
        },
        body: JSON.stringify({
          changeType: "created,updated,deleted",
          notificationUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/office365calendar/webhook`,
          resource: `users/me/calendars/${calendarId}/events`,
          expirationDateTime: expirationDateTime.toISOString(),
          clientState: `userId_${userId}_credentialId_${credential.id}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create subscription: ${JSON.stringify(error)}`);
      }

      const subscription = await response.json();

      // Store subscription in cache
      await this.calendarCache.setSubscription(
        userId,
        credential.id,
        calendarId,
        subscription.id,
        subscription.expirationDateTime
      );

      return {
        subscriptionId: subscription.id,
        expirationDateTime: subscription.expirationDateTime,
      };
    } catch (error) {
      log.error("Error creating outlook subscription:", error);
      return null;
    }
  }

  async renewSubscription(
    credential: CredentialPayload,
    calendarId: string,
    userId: number
  ): Promise<boolean> {
    try {
      const subscription = await this.calendarCache.getSubscription(userId, credential.id, calendarId);
      if (!subscription) {
        // Create new subscription if none exists
        const newSubscription = await this.createSubscription(credential, calendarId, userId);
        return !!newSubscription;
      }

      // Check if subscription needs renewal (less than 12 hours until expiration)
      const expirationDate = new Date(subscription.expirationDateTime);
      const now = new Date();
      const hoursUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilExpiration < 12) {
        const { token } = JSON.parse(credential.key as string);
        const newExpirationDateTime = new Date();
        newExpirationDateTime.setMinutes(
          newExpirationDateTime.getMinutes() + MAX_SUBSCRIPTION_LIFETIME_MINUTES
        );

        const response = await fetch(
          `https://graph.microsoft.com/v1.0/subscriptions/${subscription.subscriptionId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token.access_token}`,
            },
            body: JSON.stringify({
              expirationDateTime: newExpirationDateTime.toISOString(),
            }),
          }
        );

        if (!response.ok) {
          // If renewal fails, try to create a new subscription
          await this.createSubscription(credential, calendarId, userId);
          return true;
        }

        const renewedSubscription = await response.json();
        await this.calendarCache.setSubscription(
          userId,
          credential.id,
          calendarId,
          renewedSubscription.id,
          renewedSubscription.expirationDateTime
        );
      }

      return true;
    } catch (error) {
      log.error("Error renewing outlook subscription:", error);
      return false;
    }
  }

  async deleteSubscription(
    credential: CredentialPayload,
    calendarId: string,
    userId: number
  ): Promise<boolean> {
    try {
      const subscription = await this.calendarCache.getSubscription(userId, credential.id, calendarId);
      if (!subscription) return true;

      const { token } = JSON.parse(credential.key as string);

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/subscriptions/${subscription.subscriptionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      log.error("Error deleting outlook subscription:", error);
      return false;
    }
  }
}