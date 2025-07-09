// packages/app-store/office365calendar/lib/SubscriptionService.ts
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";

import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { getTokenObjectFromCredential } from "../../_utils/oauth/getTokenObjectFromCredential";
import { oAuthManagerHelper } from "../../_utils/oauth/oAuthManagerHelper";
import metadata from "../_metadata";
import { getOfficeAppKeys } from "./getOfficeAppKeys";

export interface SubscriptionResponse {
  id: string;
  resource: string;
  applicationId: string;
  changeType: string;
  clientState?: string;
  notificationUrl: string;
  expirationDateTime: string;
  creatorId: string;
}

interface CreateSubscriptionParams {
  calendarId: string;
  changeTypes?: string[];
  expirationMinutes?: number;
  clientState?: string;
}

export class Office365SubscriptionService {
  private auth: OAuthManager;
  private apiGraphUrl = "https://graph.microsoft.com/v1.0";
  private credential: CredentialForCalendarServiceWithTenantId;
  private log: typeof logger;

  constructor(credential: CredentialForCalendarServiceWithTenantId) {
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
        const isDelegated = Boolean(credential?.delegatedTo);

        if (!isDelegated && !refreshToken) {
          return null;
        }

        const { client_id, client_secret } = await this.getAuthCredentials(isDelegated);
        const url = this.getAuthUrl(isDelegated, credential?.delegatedTo?.serviceAccountKey?.tenant_id);

        const bodyParams = {
          scope: isDelegated
            ? "https://graph.microsoft.com/.default"
            : "User.Read Calendars.Read Calendars.ReadWrite",
          client_id,
          client_secret,
          grant_type: isDelegated ? "client_credentials" : "refresh_token",
          ...(isDelegated ? {} : { refresh_token: refreshToken ?? "" }),
        };

        return fetch(url, {
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
        if (!Boolean(credential.delegatedTo)) {
          return oAuthManagerHelper.updateTokenObject({ tokenObject, credentialId: credential.id });
        }
        return Promise.resolve();
      },
    });

    this.credential = credential;
    this.log = logger.getSubLogger({ prefix: ["Office365SubscriptionService"] });
  }

  private getAuthUrl(delegatedTo: boolean, tenantId?: string): string {
    if (delegatedTo) {
      if (!tenantId) {
        throw new Error("Invalid DelegationCredential Settings: tenantId is missing");
      }
      return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    }
    return "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  }

  private async getAuthCredentials(isDelegated: boolean) {
    if (isDelegated) {
      const client_id = this.credential?.delegatedTo?.serviceAccountKey?.client_id;
      const client_secret = this.credential?.delegatedTo?.serviceAccountKey?.private_key;

      if (!client_id || !client_secret) {
        throw new Error("Delegation credential without clientId or Secret");
      }

      return { client_id, client_secret };
    }

    return getOfficeAppKeys();
  }

  private async getUserEndpoint(): Promise<string> {
    // For subscriptions, we typically use /me instead of specific user IDs
    return "/me";
  }

  private async fetcher(endpoint: string, init?: RequestInit | undefined) {
    return this.auth.requestRaw({
      url: `${this.apiGraphUrl}${endpoint}`,
      options: {
        method: "GET",
        ...init,
      },
    });
  }

  /**
   * Creates a subscription for calendar events
   * @param params Subscription parameters
   * @returns Promise<SubscriptionResponse>
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResponse> {
    const {
      calendarId,
      changeTypes = ["created", "updated", "deleted"],
      expirationMinutes = 4230,
      clientState = process.env.OFFICE365_WEBHOOK_CLIENT_STATE,
    } = params;

    const expirationDateTime = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const subscriptionPayload = {
      changeType: changeTypes.join(","),
      // notificationUrl: `${WEBAPP_URL}/api/integrations/office365calendar/webhook`,
      notificationUrl: `https://48f99acb71be.ngrok-free.app/api/integrations/office365calendar/webhook`,
      resource:
        calendarId === "primary"
          ? `${await this.getUserEndpoint()}/calendar/events`
          : `${await this.getUserEndpoint()}/calendars/${calendarId}/events`,
      expirationDateTime: expirationDateTime.toISOString(),
      ...(clientState && { clientState }),
    };

    this.log.debug(
      "Creating subscription",
      safeStringify({
        calendarId,
        resource: subscriptionPayload.resource,
        expirationDateTime: subscriptionPayload.expirationDateTime,
      })
    );

    try {
      const response = await this.fetcher("/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscriptionPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.log.error(
          "Failed to create subscription",
          safeStringify({
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          })
        );
        throw new Error(`Failed to create subscription: ${response.status} ${response.statusText}`);
      }

      const subscriptionResponse: SubscriptionResponse = await response.json();

      this.log.info(
        "Successfully created subscription",
        safeStringify({
          subscriptionId: subscriptionResponse.id,
          calendarId,
          expirationDateTime: subscriptionResponse.expirationDateTime,
        })
      );

      return subscriptionResponse;
    } catch (error) {
      this.log.error("Error creating subscription", safeStringify({ error, calendarId }));
      throw error;
    }
  }

  /**
   * Deletes a subscription
   * @param subscriptionId The subscription ID to delete
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    this.log.debug("Deleting subscription", safeStringify({ subscriptionId }));

    try {
      const response = await this.fetcher(`/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        this.log.error(
          "Failed to delete subscription",
          safeStringify({
            subscriptionId,
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          })
        );
        throw new Error(`Failed to delete subscription: ${response.status} ${response.statusText}`);
      }

      this.log.info("Successfully deleted subscription", safeStringify({ subscriptionId }));
    } catch (error) {
      this.log.error("Error deleting subscription", safeStringify({ error, subscriptionId }));
      throw error;
    }
  }

  /**
   * Renews an existing subscription
   * @param subscriptionId The subscription ID to renew
   * @param expirationMinutes Minutes until expiration (max 4230)
   */
  async renewSubscription(subscriptionId: string, expirationMinutes = 4230): Promise<SubscriptionResponse> {
    const expirationDateTime = new Date(Date.now() + expirationMinutes * 60 * 1000);

    this.log.debug(
      "Renewing subscription",
      safeStringify({
        subscriptionId,
        expirationDateTime: expirationDateTime.toISOString(),
      })
    );

    try {
      const response = await this.fetcher(`/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expirationDateTime: expirationDateTime.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.log.error(
          "Failed to renew subscription",
          safeStringify({
            subscriptionId,
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          })
        );
        throw new Error(`Failed to renew subscription: ${response.status} ${response.statusText}`);
      }

      const subscriptionResponse: SubscriptionResponse = await response.json();

      this.log.info(
        "Successfully renewed subscription",
        safeStringify({
          subscriptionId: subscriptionResponse.id,
          expirationDateTime: subscriptionResponse.expirationDateTime,
        })
      );

      return subscriptionResponse;
    } catch (error) {
      this.log.error("Error renewing subscription", safeStringify({ error, subscriptionId }));
      throw error;
    }
  }

  /**
   * Lists all subscriptions for the current user
   */
  async listSubscriptions(): Promise<SubscriptionResponse[]> {
    this.log.debug("Listing subscriptions");

    try {
      const response = await this.fetcher("/subscriptions");

      if (!response.ok) {
        const errorText = await response.text();
        this.log.error(
          "Failed to list subscriptions",
          safeStringify({
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          })
        );
        throw new Error(`Failed to list subscriptions: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const subscriptions: SubscriptionResponse[] = data.value || [];

      this.log.debug(
        "Successfully listed subscriptions",
        safeStringify({
          count: subscriptions.length,
        })
      );

      return subscriptions;
    } catch (error) {
      this.log.error("Error listing subscriptions", safeStringify({ error }));
      throw error;
    }
  }
}
