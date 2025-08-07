import { v4 as uuid } from "uuid";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";

import Office365CalendarService from "./CalendarService";

const log = logger.getSubLogger({ prefix: ["Office365CalendarSubscriptionService"] });

const ONE_MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;
const OFFICE365_WEBHOOK_URL_BASE = process.env.OFFICE365_WEBHOOK_URL || process.env.NEXT_PUBLIC_WEBAPP_URL;
const OFFICE365_WEBHOOK_URL = `${OFFICE365_WEBHOOK_URL_BASE}/api/webhook/office365-calendar-sql`;

export interface Office365SubscriptionProps {
  id?: string | null;
  resource?: string | null;
  changeType?: string | null;
  expirationDateTime?: string | null;
  notificationUrl?: string | null;
}

export class CalendarSubscriptionService {
  private credential: CredentialForCalendarServiceWithTenantId;
  private office365Service: Office365CalendarService;

  constructor(credential: CredentialForCalendarServiceWithTenantId) {
    this.credential = credential;
    this.office365Service = new Office365CalendarService(credential);
  }

  private async makeGraphRequest(url: string, options: RequestInit = {}) {
    const response = await this.office365Service["fetcher"](`${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Microsoft Graph API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async startWatchingCalendarInOffice365({
    calendarId,
  }: {
    calendarId: string;
  }): Promise<Office365SubscriptionProps> {
    log.debug(`Subscribing to Office365 calendar ${calendarId}`, safeStringify({ OFFICE365_WEBHOOK_URL }));

    const userEndpoint = await this.office365Service.getUserEndpoint();
    const resource =
      calendarId === "primary" || !calendarId
        ? `${userEndpoint}/events`
        : `${userEndpoint}/calendars/${calendarId}/events`;

    const expirationDateTime = new Date(Date.now() + ONE_MONTH_IN_MS).toISOString();

    const subscriptionData = {
      changeType: "created,updated,deleted",
      notificationUrl: OFFICE365_WEBHOOK_URL,
      resource: resource,
      expirationDateTime: expirationDateTime,
      clientState: process.env.OFFICE365_WEBHOOK_TOKEN || uuid(),
    };

    const subscription = await this.makeGraphRequest("/subscriptions", {
      method: "POST",
      body: JSON.stringify(subscriptionData),
    });

    return {
      id: subscription.id || null,
      resource: subscription.resource || null,
      changeType: subscription.changeType || null,
      expirationDateTime: subscription.expirationDateTime || null,
      notificationUrl: subscription.notificationUrl || null,
    };
  }

  async stopWatchingCalendarInOffice365(subscriptionId: string): Promise<void> {
    log.debug(`Unsubscribing from Office365 calendar subscription ${subscriptionId}`);

    await this.makeGraphRequest(`/subscriptions/${subscriptionId}`, {
      method: "DELETE",
    });
  }

  async watchCalendar(calendarId: string): Promise<Office365SubscriptionProps> {
    if (!process.env.OFFICE365_WEBHOOK_TOKEN) {
      log.warn("OFFICE365_WEBHOOK_TOKEN is not set, skipping watching calendar");
      throw new Error("OFFICE365_WEBHOOK_TOKEN is not set");
    }

    try {
      return await this.startWatchingCalendarInOffice365({ calendarId });
    } catch (error) {
      log.error(`Failed to watch Office365 calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }

  async unwatchCalendar(calendarId: string, subscriptionId: string, resourceId?: string): Promise<void> {
    try {
      await this.stopWatchingCalendarInOffice365(subscriptionId);
      log.info(`Successfully unwatched Office365 calendar ${calendarId}`);
    } catch (error) {
      log.error(`Failed to unwatch Office365 calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }
}
