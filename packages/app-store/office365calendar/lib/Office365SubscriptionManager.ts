// packages/app-store/office365calendar/lib/Office365SubscriptionManager.ts
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type Office365CalendarService from "./CalendarService";
import { getWebhookToken, getWebhookUrl } from "./envValidation";

const log = logger.getSubLogger({ prefix: ["Office365SubscriptionManager"] });

export const MICROSOFT_SUBSCRIPTION_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

export class Office365SubscriptionManager {
  private calendarService: Office365CalendarService;

  constructor(calendarService: Office365CalendarService) {
    this.calendarService = calendarService;
  }

  /**
   * Returns the correct resource path for the subscription body
   */
  private async getResourcePath(calendarId: string): Promise<string> {
    const userEndpoint = await this.calendarService.getUserEndpoint();
    if (userEndpoint === "/me") {
      return `me/calendars/${calendarId}/events`;
    } else if (userEndpoint.startsWith("/users/")) {
      const userId = userEndpoint.replace("/users/", "");
      return `users/${userId}/calendars/${calendarId}/events`;
    } else {
      throw new Error(`Unexpected userEndpoint: ${userEndpoint}`);
    }
  }

  async createSubscription(calendarId: string) {
    try {
      // Always use the /subscriptions endpoint for Microsoft Graph
      const resource = await this.getResourcePath(calendarId);

      const requestBody = {
        changeType: "created,updated,deleted",
        notificationUrl: getWebhookUrl(),
        resource,
        expirationDateTime: new Date(Date.now() + MICROSOFT_SUBSCRIPTION_TTL).toISOString(), // 3 days
        clientState: getWebhookToken(), // For verifying webhook authenticity
      };

      log.debug(
        "Creating subscription with request body",
        safeStringify({ ...requestBody, clientState: "***REDACTED***" })
      );

      const response = await this.calendarService.fetcher(`/subscriptions`, {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorBody;
        try {
          errorBody = await response.text();
        } catch (e) {
          errorBody = "Unable to read error response";
        }
        log.error(
          `Failed to watch calendar ${calendarId}`,
          safeStringify({
            status: response.status,
            statusText: response.statusText,
            errorBody,
            resource,
          })
        );
        throw new Error(
          `Failed to create subscription: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const subscription = await response.json();
      log.debug("Created subscription", safeStringify({ subscription, calendarId }));
      return subscription;
    } catch (error) {
      log.error("Error creating subscription", safeStringify({ error, calendarId }));
      throw error;
    }
  }

  async renewSubscription(subscriptionId: string) {
    try {
      //const userEndpoint = await this.calendarService.getUserEndpoint();
      const response = await this.calendarService.fetcher(`/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        body: JSON.stringify({
          expirationDateTime: new Date(Date.now() + MICROSOFT_SUBSCRIPTION_TTL).toISOString(), // 3 days
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to renew subscription: ${response.status} ${response.statusText}`);
      }

      const subscription = await response.json();
      log.debug("Renewed subscription", safeStringify({ subscription, subscriptionId }));
      return subscription;
    } catch (error) {
      log.error("Error renewing subscription", safeStringify({ error, subscriptionId }));
      throw error;
    }
  }

  async deleteSubscription(subscriptionId: string) {
    try {
      //const userEndpoint = await this.calendarService.getUserEndpoint();
      const response = await this.calendarService.fetcher(`/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 404) {
        // 404 is ok, subscription already gone
        throw new Error(`Failed to delete subscription: ${response.status} ${response.statusText}`);
      }

      log.debug("Deleted subscription", safeStringify({ subscriptionId }));
      return true;
    } catch (error) {
      log.error("Error deleting subscription", safeStringify({ error, subscriptionId }));
      throw error;
    }
  }

  async getSubscriptionsForCredential() {
    try {
      //const userEndpoint = await this.calendarService.getUserEndpoint();
      const response = await this.calendarService.fetcher(`/subscriptions`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Failed to get subscriptions: ${response.status} ${response.statusText}`);
      }

      const subscriptions = await response.json();
      return subscriptions.value || [];
    } catch (error) {
      log.error("Error getting subscriptions", safeStringify({ error }));
      throw error;
    }
  }
}
