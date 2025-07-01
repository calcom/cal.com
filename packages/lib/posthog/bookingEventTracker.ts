import { FeaturesRepository } from "@calcom/features/flags/features.repository";

import logger from "../logger";

export interface BookingEventProperties {
  bookingId?: number;
  bookingUid?: string;
  eventTypeId?: number | null;
  userId?: number;
  teamId?: number | null;
  duration?: number;
  isReschedule?: boolean;
  isTeamEvent?: boolean;
  paymentRequired?: boolean;
  calendarIntegrations?: string[];
  error?: string;
  errorCode?: string;
  webhookType?: string;
  paymentId?: number;
}

export class PostHogBookingTracker {
  private posthog: any;
  private logger = logger.getSubLogger({ prefix: ["PostHogBookingTracker"] });
  private featuresRepository = new FeaturesRepository();

  constructor(posthogInstance?: any) {
    this.posthog = posthogInstance;
  }

  private isEnabled(): boolean {
    return !!this.posthog && !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
  }

  private async isFeatureEnabledForTeam(teamId?: number): Promise<boolean> {
    if (!teamId) return false;
    try {
      return await this.featuresRepository.checkIfTeamHasFeature(teamId, "posthog-booking-tracking");
    } catch (error) {
      this.logger.error("Failed to check team feature flag", { teamId, error });
      return false;
    }
  }

  async trackBookingStarted(properties: BookingEventProperties) {
    if (!this.isEnabled()) return;

    if (properties.teamId) {
      const isFeatureEnabled = await this.isFeatureEnabledForTeam(properties.teamId);
      if (!isFeatureEnabled) {
        this.logger.debug("PostHog tracking disabled for team", { teamId: properties.teamId });
        return;
      }
    }

    this.posthog.capture("booking_started", {
      ...properties,
      timestamp: new Date().toISOString(),
    });

    this.logger.info("Tracked booking_started event", properties);
  }

  async trackBookingCompleted(properties: BookingEventProperties) {
    if (!this.isEnabled()) return;

    if (properties.teamId) {
      const isFeatureEnabled = await this.isFeatureEnabledForTeam(properties.teamId);
      if (!isFeatureEnabled) {
        this.logger.debug("PostHog tracking disabled for team", { teamId: properties.teamId });
        return;
      }
    }

    this.posthog.capture("booking_completed", {
      ...properties,
      timestamp: new Date().toISOString(),
    });

    this.logger.info("Tracked booking_completed event", properties);
  }

  async trackBookingFailed(properties: BookingEventProperties) {
    if (!this.isEnabled()) return;

    if (properties.teamId) {
      const isFeatureEnabled = await this.isFeatureEnabledForTeam(properties.teamId);
      if (!isFeatureEnabled) {
        this.logger.debug("PostHog tracking disabled for team", { teamId: properties.teamId });
        return;
      }
    }

    this.posthog.capture("booking_failed", {
      ...properties,
      timestamp: new Date().toISOString(),
    });

    this.logger.error("Tracked booking_failed event", properties);
  }

  async trackCalendarEventCreated(properties: BookingEventProperties) {
    if (!this.isEnabled()) return;

    if (properties.teamId) {
      const isFeatureEnabled = await this.isFeatureEnabledForTeam(properties.teamId);
      if (!isFeatureEnabled) {
        this.logger.debug("PostHog tracking disabled for team", { teamId: properties.teamId });
        return;
      }
    }

    this.posthog.capture("calendar_event_created", {
      ...properties,
      timestamp: new Date().toISOString(),
    });

    this.logger.info("Tracked calendar_event_created event", properties);
  }

  async trackCalendarEventFailed(properties: BookingEventProperties) {
    if (!this.isEnabled()) return;

    if (properties.teamId) {
      const isFeatureEnabled = await this.isFeatureEnabledForTeam(properties.teamId);
      if (!isFeatureEnabled) {
        this.logger.debug("PostHog tracking disabled for team", { teamId: properties.teamId });
        return;
      }
    }

    this.posthog.capture("calendar_event_failed", {
      ...properties,
      timestamp: new Date().toISOString(),
    });

    this.logger.error("Tracked calendar_event_failed event", properties);
  }

  async trackPaymentProcessed(properties: BookingEventProperties) {
    if (!this.isEnabled()) return;

    if (properties.teamId) {
      const isFeatureEnabled = await this.isFeatureEnabledForTeam(properties.teamId);
      if (!isFeatureEnabled) {
        this.logger.debug("PostHog tracking disabled for team", { teamId: properties.teamId });
        return;
      }
    }

    this.posthog.capture("payment_processed", {
      ...properties,
      timestamp: new Date().toISOString(),
    });

    this.logger.info("Tracked payment_processed event", properties);
  }

  async trackWebhookScheduled(properties: BookingEventProperties) {
    if (!this.isEnabled()) return;

    if (properties.teamId) {
      const isFeatureEnabled = await this.isFeatureEnabledForTeam(properties.teamId);
      if (!isFeatureEnabled) {
        this.logger.debug("PostHog tracking disabled for team", { teamId: properties.teamId });
        return;
      }
    }

    this.posthog.capture("webhook_scheduled", {
      ...properties,
      timestamp: new Date().toISOString(),
    });

    this.logger.info("Tracked webhook_scheduled event", properties);
  }

  async trackWebhookExecuted(properties: BookingEventProperties) {
    if (!this.isEnabled()) return;

    if (properties.teamId) {
      const isFeatureEnabled = await this.isFeatureEnabledForTeam(properties.teamId);
      if (!isFeatureEnabled) {
        this.logger.debug("PostHog tracking disabled for team", { teamId: properties.teamId });
        return;
      }
    }

    this.posthog.capture("webhook_executed", {
      ...properties,
      timestamp: new Date().toISOString(),
    });

    this.logger.info("Tracked webhook_executed event", properties);
  }

  async trackWebhookFailed(properties: BookingEventProperties) {
    if (!this.isEnabled()) return;

    if (properties.teamId) {
      const isFeatureEnabled = await this.isFeatureEnabledForTeam(properties.teamId);
      if (!isFeatureEnabled) {
        this.logger.debug("PostHog tracking disabled for team", { teamId: properties.teamId });
        return;
      }
    }

    this.posthog.capture("webhook_failed", {
      ...properties,
      timestamp: new Date().toISOString(),
    });

    this.logger.error("Tracked webhook_failed event", properties);
  }
}

export class ServerPostHogBookingTracker {
  private logger = logger.getSubLogger({ prefix: ["ServerPostHogBookingTracker"] });
  private featuresRepository = new FeaturesRepository();

  private isEnabled(): boolean {
    return !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
  }

  private async isFeatureEnabledForTeam(teamId?: number): Promise<boolean> {
    if (!teamId) return false;
    try {
      return await this.featuresRepository.checkIfTeamHasFeature(teamId, "posthog-booking-tracking");
    } catch (error) {
      this.logger.error("Failed to check team feature flag", { teamId, error });
      return false;
    }
  }

  async trackServerEvent(eventName: string, properties: BookingEventProperties) {
    if (!this.isEnabled()) return;

    if (properties.teamId) {
      const isFeatureEnabled = await this.isFeatureEnabledForTeam(properties.teamId);
      if (!isFeatureEnabled) {
        this.logger.debug("PostHog tracking disabled for team", { teamId: properties.teamId });
        return;
      }
    }

    try {
      const { PostHog } = await import("posthog-node");
      const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      });

      posthog.capture({
        distinctId: `user_${properties.userId || "anonymous"}`,
        event: eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          source: "server",
        },
      });

      await posthog.shutdown();
      this.logger.info(`Tracked server event: ${eventName}`, properties);
    } catch (error) {
      this.logger.error("Failed to track server event", { eventName, error });
    }
  }

  async trackBookingStarted(properties: BookingEventProperties) {
    await this.trackServerEvent("booking_started", properties);
  }

  async trackBookingCompleted(properties: BookingEventProperties) {
    await this.trackServerEvent("booking_completed", properties);
  }

  async trackBookingFailed(properties: BookingEventProperties) {
    await this.trackServerEvent("booking_failed", properties);
  }

  async trackCalendarEventCreated(properties: BookingEventProperties) {
    await this.trackServerEvent("calendar_event_created", properties);
  }

  async trackCalendarEventFailed(properties: BookingEventProperties) {
    await this.trackServerEvent("calendar_event_failed", properties);
  }

  async trackPaymentProcessed(properties: BookingEventProperties) {
    await this.trackServerEvent("payment_processed", properties);
  }

  async trackWebhookScheduled(properties: BookingEventProperties) {
    await this.trackServerEvent("webhook_scheduled", properties);
  }

  async trackWebhookExecuted(properties: BookingEventProperties) {
    await this.trackServerEvent("webhook_executed", properties);
  }

  async trackWebhookFailed(properties: BookingEventProperties) {
    await this.trackServerEvent("webhook_failed", properties);
  }
}

export function createPostHogBookingTracker(posthogInstance?: any): PostHogBookingTracker {
  return new PostHogBookingTracker(posthogInstance);
}

export function createServerPostHogBookingTracker(): ServerPostHogBookingTracker {
  return new ServerPostHogBookingTracker();
}
