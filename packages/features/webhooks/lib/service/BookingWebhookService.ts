import { WebhookTriggerEvents, TimeUnit } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";
import dayjs from "@calcom/dayjs";

import type {
  BookingCreatedDTO,
  BookingCancelledDTO,
  BookingRejectedDTO,
  BookingRequestedDTO,
  BookingRescheduledDTO,
  BookingPaidDTO,
  BookingPaymentInitiatedDTO,
  BookingNoShowDTO,
} from "../dto/types";
import { WebhookNotifier } from "../notifier/WebhookNotifier";
import { WebhookService } from "./WebhookService";

// Simplified interface for webhook trigger args
export interface WebhookTriggerArgs {
  trigger: WebhookTriggerEvents;
  evt: CalendarEvent;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    startTime?: Date;
    smsReminderNumber?: string | null;
  };
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
    teamId?: number | null;
  } | null;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string;
  isDryRun?: boolean;
  status?: "ACCEPTED" | "PENDING";
  metadata?: { [key: string]: any };
  platformParams?: {
    platformClientId?: string;
    platformRescheduleUrl?: string;
    platformCancelUrl?: string;
    platformBookingUrl?: string;
  };
  cancelledBy?: string;
  cancellationReason?: string;
  rescheduleId?: number;
  rescheduleUid?: string;
  rescheduleStartTime?: string;
  rescheduleEndTime?: string;
  rescheduledBy?: string;
  paymentId?: number;
  paymentData?: any;
}

/**
 * Service for creating booking-related webhook DTOs and emitting webhook events
 * This is the layer that business logic should interact with
 */
export class BookingWebhookService {
  /**
   * Simplified method to emit booking created webhook from WebhookTriggerArgs
   */
  static async emitBookingCreatedFromArgs(args: WebhookTriggerArgs): Promise<void> {
    return this.emitBookingCreated({
      evt: args.evt,
      booking: {
        ...args.booking,
        startTime: args.booking.startTime || new Date(),
      },
      eventType: args.eventType,
      status: args.status,
      metadata: args.metadata,
      platformParams: args.platformParams,
      teamId: args.teamId,
      orgId: args.orgId,
      isDryRun: args.isDryRun,
    });
  }

  /**
   * Simplified method to emit booking cancelled webhook from WebhookTriggerArgs
   */
  static async emitBookingCancelledFromArgs(args: WebhookTriggerArgs): Promise<void> {
    return this.emitBookingCancelled({
      evt: args.evt,
      booking: args.booking,
      eventType: args.eventType,
      cancelledBy: args.cancelledBy,
      cancellationReason: args.cancellationReason,
      teamId: args.teamId,
      orgId: args.orgId,
      platformClientId: args.platformClientId,
      isDryRun: args.isDryRun,
    });
  }

  /**
   * Simplified method to emit booking requested webhook from WebhookTriggerArgs
   */
  static async emitBookingRequestedFromArgs(args: WebhookTriggerArgs): Promise<void> {
    return this.emitBookingRequested({
      evt: args.evt,
      booking: args.booking,
      eventType: args.eventType,
      teamId: args.teamId,
      orgId: args.orgId,
      platformClientId: args.platformClientId,
      isDryRun: args.isDryRun,
    });
  }

  /**
   * Simplified method to emit booking rescheduled webhook from WebhookTriggerArgs
   */
  static async emitBookingRescheduledFromArgs(args: WebhookTriggerArgs): Promise<void> {
    return this.emitBookingRescheduled({
      evt: args.evt,
      booking: args.booking,
      eventType: args.eventType,
      rescheduleId: args.rescheduleId,
      rescheduleUid: args.rescheduleUid,
      rescheduleStartTime: args.rescheduleStartTime,
      rescheduleEndTime: args.rescheduleEndTime,
      rescheduledBy: args.rescheduledBy,
      teamId: args.teamId,
      orgId: args.orgId,
      platformClientId: args.platformClientId,
      isDryRun: args.isDryRun,
    });
  }

  /**
   * Simplified method to emit booking paid webhook from WebhookTriggerArgs
   */
  static async emitBookingPaidFromArgs(args: WebhookTriggerArgs): Promise<void> {
    return this.emitBookingPaid({
      evt: args.evt,
      booking: args.booking,
      eventType: args.eventType,
      paymentId: args.paymentId,
      paymentData: args.paymentData,
      teamId: args.teamId,
      orgId: args.orgId,
      platformClientId: args.platformClientId,
      isDryRun: args.isDryRun,
    });
  }

  /**
   * Emits a booking payment initiated webhook
   */
  static async emitBookingPaymentInitiated(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    paymentId?: number;
    paymentData?: any;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingPaymentInitiatedDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
      paymentId: params.paymentId,
      paymentData: params.paymentData,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED, dto, params.isDryRun);
  }
  /**
   * Emits a booking created webhook
   */
  static async emitBookingCreated(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
      startTime: Date;
      smsReminderNumber?: string | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    status?: "ACCEPTED" | "PENDING";
    metadata?: { [key: string]: any };
    platformParams?: {
      platformClientId?: string;
      platformRescheduleUrl?: string;
      platformCancelUrl?: string;
      platformBookingUrl?: string;
    };
    teamId?: number | null;
    orgId?: number | null;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingCreatedDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformParams?.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
      status: params.status || "ACCEPTED",
      metadata: params.metadata,
      platformParams: params.platformParams,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_CREATED, dto, params.isDryRun);
  }

  /**
   * Emits a booking cancelled webhook
   */
  static async emitBookingCancelled(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
      smsReminderNumber?: string | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    cancelledBy?: string;
    cancellationReason?: string;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingCancelledDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
      cancelledBy: params.cancelledBy,
      cancellationReason: params.cancellationReason,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_CANCELLED, dto, params.isDryRun);
  }

  /**
   * Emits a booking requested webhook
   */
  static async emitBookingRequested(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingRequestedDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_REQUESTED, dto, params.isDryRun);
  }

  /**
   * Emits a booking rescheduled webhook
   */
  static async emitBookingRescheduled(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
      smsReminderNumber?: string | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    rescheduleId?: number;
    rescheduleUid?: string;
    rescheduleStartTime?: string;
    rescheduleEndTime?: string;
    rescheduledBy?: string;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingRescheduledDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
      rescheduleId: params.rescheduleId,
      rescheduleUid: params.rescheduleUid,
      rescheduleStartTime: params.rescheduleStartTime,
      rescheduleEndTime: params.rescheduleEndTime,
      rescheduledBy: params.rescheduledBy,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_RESCHEDULED, dto, params.isDryRun);
  }

  /**
   * Emits a booking paid webhook
   */
  static async emitBookingPaid(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    paymentId?: number;
    paymentData?: any;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingPaidDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
      paymentId: params.paymentId,
      paymentData: params.paymentData,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_PAID, dto, params.isDryRun);
  }

  /**
   * Emits a booking no show webhook
   */
  static async emitBookingNoShow(params: {
    message: string;
    bookingUid: string;
    bookingId?: number;
    attendees: { email: string; noShow: boolean }[];
    userId?: number | null;
    eventTypeId?: number | null;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingNoShowDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
      createdAt: new Date().toISOString(),
      bookingId: params.bookingId,
      eventTypeId: params.eventTypeId,
      userId: params.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      message: params.message,
      bookingUid: params.bookingUid,
      attendees: params.attendees,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED, dto, params.isDryRun);
  }

  /**
   * Emits a booking rejected webhook
   */
  static async emitBookingRejected(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
      smsReminderNumber?: string | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    teamId?: number | null;
    orgId?: number | null;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingCancelledDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: undefined,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_REJECTED, dto, params.isDryRun);
  }

  /**
   * Schedules meeting lifecycle webhooks (MEETING_STARTED, MEETING_ENDED)
   * Replaces legacy scheduleTrigger usage
   */
  static async scheduleMeetingWebhooks(params: {
    booking: {
      id: number;
      uid: string;
      eventTypeId: number | null;
      userId: number | null;
      startTime: Date;
      endTime: Date;
      responses?: any;
    };
    evt: CalendarEvent;
    teamId?: number | null;
    orgId?: number | null;
    oAuthClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const webhookService = new WebhookService();

    // Get subscribers for MEETING_STARTED
    const subscribersMeetingStarted = await webhookService.getSubscribers({
      userId: params.booking.userId,
      eventTypeId: params.booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
      teamId: params.teamId,
      orgId: params.orgId,
      oAuthClientId: params.oAuthClientId,
    });

    // Get subscribers for MEETING_ENDED  
    const subscribersMeetingEnded = await webhookService.getSubscribers({
      userId: params.booking.userId,
      eventTypeId: params.booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
      teamId: params.teamId,
      orgId: params.orgId,
      oAuthClientId: params.oAuthClientId,
    });

    const schedulePromises: Promise<void>[] = [];

    // Schedule MEETING_STARTED webhooks
    for (const subscriber of subscribersMeetingStarted) {
      schedulePromises.push(
        webhookService.scheduleTimeBasedWebhook(
          WebhookTriggerEvents.MEETING_STARTED,
          params.booking.startTime,
          {
            id: params.booking.id,
            uid: params.booking.uid,
            eventTypeId: params.booking.eventTypeId,
            userId: params.booking.userId,
            teamId: params.teamId,
            responses: params.booking.responses,
          },
          subscriber,
          params.evt,
          params.isDryRun
        )
      );
    }

    // Schedule MEETING_ENDED webhooks
    for (const subscriber of subscribersMeetingEnded) {
      schedulePromises.push(
        webhookService.scheduleTimeBasedWebhook(
          WebhookTriggerEvents.MEETING_ENDED,
          params.booking.endTime,
          {
            id: params.booking.id,
            uid: params.booking.uid,
            eventTypeId: params.booking.eventTypeId,
            userId: params.booking.userId,
            teamId: params.teamId,
            responses: params.booking.responses,
          },
          subscriber,
          params.evt,
          params.isDryRun
        )
      );
    }

    await Promise.all(schedulePromises);
  }

  /**
   * Cancels scheduled meeting webhooks for a booking
   * Replaces legacy deleteWebhookScheduledTriggers usage
   */
  static async cancelScheduledMeetingWebhooks(params: {
    bookingId: number;
    isDryRun?: boolean;
  }): Promise<void> {
    const webhookService = new WebhookService();
    await webhookService.cancelScheduledWebhooks(
      params.bookingId,
      [WebhookTriggerEvents.MEETING_STARTED, WebhookTriggerEvents.MEETING_ENDED],
      params.isDryRun
    );
  }

  /**
   * Schedules no-show webhooks for hosts and guests
   * Replaces legacy scheduleNoShowTriggers functionality
   */
  static async scheduleNoShowWebhooks(params: {
    booking: {
      id: number;
      startTime: Date;
      eventTypeId: number | null;
      userId: number | null;
      uid: string;
    };
    organizerUser: {
      id: number;
      username: string | null;
    };
    eventType?: {
      teamId?: number | null;
    };
    teamId?: number | null;
    orgId?: number | null;
    oAuthClientId?: string;
    triggerForUser?: boolean;
  }): Promise<void> {
    const webhookService = new WebhookService();
    
    try {
      const tasker = (await import("@calcom/features/tasker")).default;
      const noShowPromises: Promise<string | void>[] = [];

      // Get subscribers for host no-show webhooks
      const subscribersHostsNoShow = await webhookService.getSubscribers({
        userId: params.triggerForUser ? params.organizerUser.id : null,
        eventTypeId: params.booking.eventTypeId,
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        teamId: params.teamId,
        orgId: params.orgId,
        oAuthClientId: params.oAuthClientId,
      });

      // Schedule host no-show webhooks
      noShowPromises.push(
        ...subscribersHostsNoShow.map((webhook) => {
          if (params.booking.startTime && webhook.time && webhook.timeUnit) {
            const dayjs = require("@calcom/dayjs").default;
            const scheduledAt = dayjs(params.booking.startTime)
              .add(webhook.time, webhook.timeUnit.toLowerCase())
              .toDate();
            
            return tasker.create(
              "triggerHostNoShowWebhook",
              {
                triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
                bookingId: params.booking.id,
                webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit as TimeUnit },
              },
              { scheduledAt }
            );
          }
          return Promise.resolve();
        })
      );

      // Get subscribers for guest no-show webhooks
      const subscribersGuestsNoShow = await webhookService.getSubscribers({
        userId: params.triggerForUser ? params.organizerUser.id : null,
        eventTypeId: params.booking.eventTypeId,
        triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
        teamId: params.teamId,
        orgId: params.orgId,
        oAuthClientId: params.oAuthClientId,
      });

      // Schedule guest no-show webhooks
      noShowPromises.push(
        ...subscribersGuestsNoShow.map((webhook) => {
          if (params.booking.startTime && webhook.time && webhook.timeUnit) {
            const dayjs = require("@calcom/dayjs").default;
            const scheduledAt = dayjs(params.booking.startTime)
              .add(webhook.time, webhook.timeUnit.toLowerCase())
              .toDate();
            
            return tasker.create(
              "triggerGuestNoShowWebhook",
              {
                triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
                bookingId: params.booking.id,
                webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit as TimeUnit },
              },
              { scheduledAt }
            );
          }
          return Promise.resolve();
        })
      );

      await Promise.all(noShowPromises);
    } catch (error) {
      console.error("Failed to schedule no-show webhooks:", error);
    }
  }
}
