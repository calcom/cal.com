import { usePostHog } from "posthog-js/react";

import logger from "../logger";

export interface BookingFunnelProperties {
  bookingUid?: string;
  eventTypeId?: number;
  userId?: number;
  teamId?: number;
  step?: string;
  duration?: number;
  isReschedule?: boolean;
  paymentRequired?: boolean;
}

export class BookingFunnelTracker {
  private posthog: any;
  private logger = logger.getSubLogger({ prefix: ["BookingFunnelTracker"] });

  constructor(posthogInstance?: any) {
    this.posthog = posthogInstance;
  }

  private isEnabled(): boolean {
    return !!this.posthog && !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
  }

  trackFunnelStep(
    step: "booking_started" | "form_filled" | "payment_initiated" | "booking_completed",
    properties: BookingFunnelProperties
  ) {
    if (!this.isEnabled()) return;

    this.posthog.capture(`booking_funnel_${step}`, {
      ...properties,
      step,
      timestamp: new Date().toISOString(),
      $set: {
        userId: properties.userId,
        teamId: properties.teamId,
      },
    });

    this.logger.info(`Tracked booking funnel step: ${step}`, properties);
  }

  trackBookingStarted(properties: BookingFunnelProperties) {
    this.trackFunnelStep("booking_started", properties);
  }

  trackFormFilled(properties: BookingFunnelProperties) {
    this.trackFunnelStep("form_filled", properties);
  }

  trackPaymentInitiated(properties: BookingFunnelProperties) {
    this.trackFunnelStep("payment_initiated", properties);
  }

  trackBookingCompleted(properties: BookingFunnelProperties) {
    this.trackFunnelStep("booking_completed", properties);
  }
}

export function useBookingFunnelTracker(): BookingFunnelTracker {
  const posthog = usePostHog();
  return new BookingFunnelTracker(posthog);
}
