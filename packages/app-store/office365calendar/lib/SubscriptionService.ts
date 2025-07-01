import { OutlookCacheService } from "./CacheService";
import { getOfficeAppKeys } from "./getOfficeAppKeys";

interface Subscription {
  id: string;
  resource: string;
  expirationDateTime: string;
  changeType: string;
  notificationUrl: string;
  clientState: string;
}

export class OutlookSubscriptionService {
  private cacheService: OutlookCacheService;
  private apiGraphUrl = "https://graph.microsoft.com/v1.0";

  constructor() {
    this.cacheService = new OutlookCacheService();
  }

  async createSubscription(
    userId: number,
    calendarId: string,
    accessToken: string
  ): Promise<Subscription> {
    const { client_id, client_secret } = await getOfficeAppKeys();
    const webhookUrl = `${process.env.WEBAPP_URL}/api/integrations/office365calendar/webhook`;

    // Calculate expiration date (3 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 3);

    const subscription = {
      changeType: "created,updated,deleted",
      notificationUrl: webhookUrl,
      resource: `users/${userId}/events`,
      expirationDateTime: expirationDate.toISOString(),
      clientState: client_secret, // Use client secret as state for validation
    };

    const response = await fetch(`${this.apiGraphUrl}/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });

    if (!response.ok) {
      throw new Error(`Failed to create subscription: ${response.statusText}`);
    }

    const createdSubscription = await response.json();
    await this.cacheService.setSubscriptionId(userId, calendarId, createdSubscription.id);

    return createdSubscription;
  }

  async renewSubscription(
    userId: number,
    calendarId: string,
    accessToken: string,
    subscriptionId: string
  ): Promise<Subscription> {
    const { client_id, client_secret } = await getOfficeAppKeys();

    // Calculate new expiration date (3 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 3);

    const response = await fetch(`${this.apiGraphUrl}/subscriptions/${subscriptionId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expirationDateTime: expirationDate.toISOString(),
        clientState: client_secret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to renew subscription: ${response.statusText}`);
    }

    const renewedSubscription = await response.json();
    await this.cacheService.setSubscriptionId(userId, calendarId, renewedSubscription.id);

    return renewedSubscription;
  }

  async deleteSubscription(
    userId: number,
    calendarId: string,
    accessToken: string,
    subscriptionId: string
  ): Promise<void> {
    const response = await fetch(`${this.apiGraphUrl}/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete subscription: ${response.statusText}`);
    }

    await this.cacheService.setSubscriptionId(userId, calendarId, null);
  }

  async checkAndRenewSubscriptions(userId: number, calendarId: string, accessToken: string): Promise<void> {
    const subscriptionId = await this.cacheService.getSubscriptionId(userId, calendarId);

    if (!subscriptionId) {
      // Create new subscription if none exists
      await this.createSubscription(userId, calendarId, accessToken);
      return;
    }

    // Check subscription status
    const response = await fetch(`${this.apiGraphUrl}/subscriptions/${subscriptionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Subscription not found, create a new one
        await this.createSubscription(userId, calendarId, accessToken);
      } else {
        throw new Error(`Failed to check subscription: ${response.statusText}`);
      }
      return;
    }

    const subscription = await response.json();
    const expirationDate = new Date(subscription.expirationDateTime);
    const now = new Date();

    // If subscription expires in less than 24 hours, renew it
    if (expirationDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      await this.renewSubscription(userId, calendarId, accessToken, subscriptionId);
    }
  }
} 