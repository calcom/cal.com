import { v4 as uuidv4 } from "uuid";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";

import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { SelectedCalendarEventTypeIds } from "@calcom/features/calendar-cache/calendar-cache.repository.interface";

import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { getTokenObjectFromCredential } from "../../_utils/oauth/getTokenObjectFromCredential";
import { oAuthManagerHelper } from "../../_utils/oauth/oAuthManagerHelper";
import metadata from "../_metadata";

const log = logger.getSubLogger({ prefix: ["[[lib] office365_graph_subscriptions"] });

// The maximum expiration time for a subscription is 3 days (4230 minutes)
const SUBSCRIPTION_EXPIRATION_MINUTES = 3 * 24 * 60; // 3 days in minutes

export interface GraphSubscriptionResponse {
  id: string;
  resource: string;
  applicationId: string;
  changeType: string;
  clientState: string;
  notificationUrl: string;
  expirationDateTime: string;
  creatorId: string;
  lifecycleNotificationUrl: string;
}

export class MicrosoftGraphSubscriptionService {
  private credential: CredentialPayload;
  private auth: OAuthManager;

  constructor(credential: CredentialPayload) {
    this.credential = credential;
    const tokenResponse = getTokenObjectFromCredential(credential);
    this.auth = new OAuthManager({
      credentialSyncVariables: oAuthManagerHelper.credentialSyncVariables,
      resourceOwner: {
        type: "user",
        id: credential.userId,
      },
      appSlug: metadata.slug,
      currentTokenObject: tokenResponse,
      fetchNewTokenObject: async ({ refreshToken }: { refreshToken: string | null }) => {
        if (!refreshToken) {
          return null;
        }

        const { client_id, client_secret } = await this.getAuthCredentials();

        const bodyParams = {
          scope: "User.Read Calendars.Read Calendars.ReadWrite",
          client_id,
          client_secret,
          grant_type: "refresh_token",
          refresh_token: refreshToken ?? "",
        };

        return fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(bodyParams),
        });
      },
      isTokenObjectUnusable: async function () {
        return null;
      },
      isAccessTokenUnusable: async function () {
        return null;
      },
      invalidateTokenObject: () => oAuthManagerHelper.invalidateCredential(credential.id),
      expireAccessToken: () => oAuthManagerHelper.markTokenAsExpired(credential),
      updateTokenObject: (tokenObject) => {
        return oAuthManagerHelper.updateTokenObject({ tokenObject, credentialId: credential.id });
      },
    });
  }

  private async getAuthCredentials() {
    // Your app keys for Microsoft Graph API
    const client_id = process.env.MS_GRAPH_CLIENT_ID || "";
    const client_secret = process.env.MS_GRAPH_CLIENT_SECRET || "";
    return { client_id, client_secret };
  }

  private async fetcher(endpoint: string, init?: RequestInit): Promise<Response> {
    return this.auth.requestRaw({
      url: `https://graph.microsoft.com/v1.0${endpoint}`,
      options: {
        method: "get",
        ...init,
      },
    });
  }

  /**
   * Creates a subscription for calendar changes
   * @param calendarId The calendar to watch
   * @returns The subscription response
   */
  public async createSubscription(calendarId: string): Promise<GraphSubscriptionResponse> {
    // Generate a client state for validating webhook notifications
    const clientState = randomBytes(16).toString("hex");

    // Subscription expiration date (maximum is 3 days)
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + SUBSCRIPTION_EXPIRATION_MINUTES);

    // Create unique notificationUrl
    const notificationUrl = `${WEBAPP_URL}/api/integrations/office365calendar/webhook`;

    try {
      // The resource path to monitor
      const resource = `users/me/calendars/${calendarId}/events`;
      
      const response = await this.fetcher("/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changeType: "created,updated,deleted",
          notificationUrl,
          resource,
          expirationDateTime: expirationDate.toISOString(),
          clientState,
          lifecycleNotificationUrl: notificationUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        log.error("Failed to create Microsoft Graph subscription", errorData);
        throw new Error(`Failed to create subscription: ${JSON.stringify(errorData)}`);
      }

      const subscriptionData: GraphSubscriptionResponse = await response.json();
      
      // Store the subscription in database
      await this.storeSubscription(calendarId, subscriptionData, clientState);
      
      return subscriptionData;
    } catch (error) {
      log.error("Error creating Microsoft Graph subscription", error);
      throw error;
    }
  }

  /**
   * Renews an existing subscription
   * @param subscriptionId Microsoft Graph subscription ID
   * @returns The updated subscription
   */
  public async renewSubscription(subscriptionId: string): Promise<GraphSubscriptionResponse> {
    try {
      // Subscription expiration date (maximum is 3 days)
      const expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + SUBSCRIPTION_EXPIRATION_MINUTES);

      const response = await this.fetcher(`/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expirationDateTime: expirationDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        log.error(`Failed to renew subscription ${subscriptionId}`, errorData);
        throw new Error(`Failed to renew subscription: ${JSON.stringify(errorData)}`);
      }

      const subscriptionData: GraphSubscriptionResponse = await response.json();
      
      // Update the subscription in the database
      await prisma.selectedCalendar.updateMany({
        where: {
          msGraphSubscriptionId: subscriptionId,
          credentialId: this.credential.id,
        },
        data: {
          msGraphSubscriptionExpiry: new Date(subscriptionData.expirationDateTime),
        },
      });
      
      return subscriptionData;
    } catch (error) {
      log.error(`Error renewing subscription ${subscriptionId}`, error);
      throw error;
    }
  }

  /**
   * Deletes a subscription from Microsoft Graph
   * @param subscriptionId Microsoft Graph subscription ID
   */
  public async deleteSubscription(subscriptionId: string): Promise<void> {
    try {
      const response = await this.fetcher(`/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 404) {
        // 404 is acceptable as it means the subscription is already deleted
        const errorData = await response.json();
        log.error(`Failed to delete subscription ${subscriptionId}`, errorData);
        throw new Error(`Failed to delete subscription: ${JSON.stringify(errorData)}`);
      }
      
      // Remove the subscription from the database
      await prisma.selectedCalendar.updateMany({
        where: {
          msGraphSubscriptionId: subscriptionId,
          credentialId: this.credential.id,
        },
        data: {
          msGraphSubscriptionId: null,
          msGraphSubscriptionExpiry: null,
        },
      });
    } catch (error) {
      log.error(`Error deleting subscription ${subscriptionId}`, error);
      throw error;
    }
  }

  /**
   * Stores subscription information in the database
   */
  private async storeSubscription(
    calendarId: string, 
    subscription: GraphSubscriptionResponse, 
    clientState: string
  ): Promise<void> {
    try {
      await prisma.selectedCalendar.updateMany({
        where: {
          externalId: calendarId,
          credentialId: this.credential.id,
        },
        data: {
          msGraphSubscriptionId: subscription.id,
          msGraphSubscriptionExpiry: new Date(subscription.expirationDateTime),
          msGraphClientState: clientState,
        },
      });
    } catch (error) {
      log.error("Error storing subscription data", error);
      throw error;
    }
  }

  /**
   * Watches a calendar for changes
   * @param param0 Object containing calendarId and eventTypeIds
   */
  public async watchCalendar({ calendarId, eventTypeIds }: { calendarId: string, eventTypeIds: SelectedCalendarEventTypeIds }): Promise<any> {
    try {
      // Check if this calendar already has a subscription
      const existingSubscription = await prisma.selectedCalendar.findFirst({
        where: {
          externalId: calendarId,
          credentialId: this.credential.id,
          integration: "office365_calendar",
          msGraphSubscriptionId: {
            not: null,
          },
        },
        select: {
          msGraphSubscriptionId: true,
          msGraphSubscriptionExpiry: true,
        },
      });

      // If there's an existing subscription that's not expired, no need to recreate it
      if (existingSubscription?.msGraphSubscriptionId && 
          existingSubscription.msGraphSubscriptionExpiry && 
          existingSubscription.msGraphSubscriptionExpiry > new Date()) {
        // Ensure we add the event type associations
        await prisma.selectedCalendar.updateMany({
          where: {
            externalId: calendarId,
            credentialId: this.credential.id,
            integration: "office365_calendar",
          },
          data: {
            eventTypeId: eventTypeIds.eventTypeId || undefined,
            supportEventTypeIds: eventTypeIds.supportEventTypeIds || [],
          },
        });
        
        return existingSubscription.msGraphSubscriptionId;
      }

      // If the subscription exists but is expired, we need to renew it
      if (existingSubscription?.msGraphSubscriptionId) {
        try {
          const renewedSubscription = await this.renewSubscription(existingSubscription.msGraphSubscriptionId);
          
          // Update event type associations
          await prisma.selectedCalendar.updateMany({
            where: {
              externalId: calendarId,
              credentialId: this.credential.id,
              integration: "office365_calendar",
            },
            data: {
              eventTypeId: eventTypeIds.eventTypeId || undefined,
              supportEventTypeIds: eventTypeIds.supportEventTypeIds || [],
            },
          });
          
          return renewedSubscription.id;
        } catch (renewError) {
          // If renewal fails, we'll create a new subscription instead
          log.warn("Failed to renew subscription, creating new one", renewError);
          if (existingSubscription?.msGraphSubscriptionId) {
            try {
              await this.deleteSubscription(existingSubscription.msGraphSubscriptionId);
            } catch (deleteError) {
              log.error("Failed to delete expired subscription", deleteError);
              // Continue anyway to create new subscription
            }
          }
        }
      }

      // Create a new subscription
      const subscription = await this.createSubscription(calendarId);
      
      // Ensure calendar record has the correct event type associations
      await prisma.selectedCalendar.updateMany({
        where: {
          externalId: calendarId,
          credentialId: this.credential.id,
          integration: "office365_calendar",
        },
        data: {
          eventTypeId: eventTypeIds.eventTypeId || undefined,
          supportEventTypeIds: eventTypeIds.supportEventTypeIds || [],
        },
      });

      return subscription.id;
    } catch (error) {
      log.error(`Failed to watch calendar ${calendarId}`, error);
      throw error;
    }
  }

  /**
   * Unwatches a calendar
   * @param param0 Object containing calendarId and eventTypeIds
   */
  public async unwatchCalendar({ calendarId, eventTypeIds }: { calendarId: string, eventTypeIds: SelectedCalendarEventTypeIds }): Promise<void> {
    try {
      // Find the calendar record with its subscription
      const selectedCalendar = await prisma.selectedCalendar.findFirst({
        where: {
          externalId: calendarId,
          credentialId: this.credential.id,
          integration: "office365_calendar",
        },
        select: {
          msGraphSubscriptionId: true,
          eventTypeId: true,
          supportEventTypeIds: true,
        },
      });

      if (!selectedCalendar) {
        log.warn(`Calendar ${calendarId} not found for credential ${this.credential.id}`);
        return;
      }

      // Remove the specified event type from the calendar
      const supportEventTypeIds = selectedCalendar.supportEventTypeIds.filter((id) => {
        if (eventTypeIds.supportEventTypeIds) {
          return !eventTypeIds.supportEventTypeIds.includes(id);
        }
        return true;
      });

      // Check if we're removing the primary event type
      let newEventTypeId = selectedCalendar.eventTypeId;
      if (eventTypeIds.eventTypeId === selectedCalendar.eventTypeId) {
        newEventTypeId = null;
      }

      // Update the calendar record
      await prisma.selectedCalendar.updateMany({
        where: {
          externalId: calendarId,
          credentialId: this.credential.id,
          integration: "office365_calendar",
        },
        data: {
          eventTypeId: newEventTypeId,
          supportEventTypeIds,
        },
      });

      // If there are still event types associated with the calendar, don't remove the subscription
      if (newEventTypeId || supportEventTypeIds.length > 0) {
        return;
      }

      // If there's a subscription and no more event types, delete the subscription
      if (selectedCalendar.msGraphSubscriptionId) {
        await this.deleteSubscription(selectedCalendar.msGraphSubscriptionId);
      }

      // Delete calendar caches for this calendar
      await prisma.calendarCache.deleteMany({
        where: {
          credentialId: this.credential.id,
          key: {
            contains: calendarId,
          },
        },
      });

    } catch (error) {
      log.error(`Failed to unwatch calendar ${calendarId}`, error);
      throw error;
    }
  }
}