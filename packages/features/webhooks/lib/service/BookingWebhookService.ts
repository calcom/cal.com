import dayjs from "@calcom/dayjs";
import type { TimeUnit } from "@calcom/prisma/enums";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type {
  BookingCreatedDTO,
  BookingCancelledDTO,
  BookingRequestedDTO,
  BookingRescheduledDTO,
  BookingPaidDTO,
  BookingPaymentInitiatedDTO,
  BookingNoShowDTO,
  BookingRejectedDTO,
  WebhookSubscriber,
} from "../dto/types";
import type { IWebhookNotifier, IWebhookService, ITasker, IBookingWebhookService } from "../interface";
import type { ILogger } from "../interface/infrastructure";
import type {
  BookingCreatedParams,
  BookingCancelledParams,
  BookingRequestedParams,
  BookingRescheduledParams,
  BookingPaidParams,
  BookingPaymentInitiatedParams,
  BookingNoShowParams,
  BookingRejectedParams,
  ScheduleMeetingWebhooksParams,
  CancelScheduledMeetingWebhooksParams,
  ScheduleNoShowWebhooksParams,
} from "../types";

export class BookingWebhookService implements IBookingWebhookService {
  private readonly log: ILogger;

  constructor(
    private readonly webhookNotifier: IWebhookNotifier,
    private readonly webhookService: IWebhookService,
    private readonly tasker: ITasker,
    logger: ILogger
  ) {
    this.log = logger.getSubLogger({ prefix: ["[BookingWebhookService]"] });
  }

  private getTasker(): ITasker {
    return this.tasker;
  }

  async emitBookingPaymentInitiated(params: BookingPaymentInitiatedParams): Promise<void> {
    if (!params.eventType) {
      throw new Error("eventType is required for booking webhook events");
    }

    const dto: BookingPaymentInitiatedDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType.id,
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

    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  async emitBookingCreated(params: BookingCreatedParams): Promise<void> {
    if (!params.eventType) {
      throw new Error("eventType is required for booking webhook events");
    }

    const dto: BookingCreatedDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId ?? params.platformParams?.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: {
        ...params.booking,
        startTime: params.booking.startTime ?? new Date(params.evt.startTime),
      },
      status: params.status || "ACCEPTED",
      metadata: params.metadata,
      platformParams: params.platformParams,
    };

    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  async emitBookingCancelled(params: BookingCancelledParams): Promise<void> {
    if (!params.eventType) {
      throw new Error("eventType is required for booking webhook events");
    }

    const dto: BookingCancelledDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType.id,
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

    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  async emitBookingRequested(params: BookingRequestedParams): Promise<void> {
    if (!params.eventType) {
      throw new Error("eventType is required for booking webhook events");
    }

    const dto: BookingRequestedDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
    };
    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  async emitBookingRescheduled(params: BookingRescheduledParams): Promise<void> {
    if (!params.eventType) {
      throw new Error("eventType is required for booking webhook events");
    }

    const dto: BookingRescheduledDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType.id,
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

    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  async emitBookingPaid(params: BookingPaidParams): Promise<void> {
    if (!params.eventType) {
      throw new Error("eventType is required for booking webhook events");
    }

    const dto: BookingPaidDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType.id,
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

    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  async emitBookingNoShow(params: BookingNoShowParams): Promise<void> {
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

    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  async emitBookingRejected(params: BookingRejectedParams): Promise<void> {
    if (!params.eventType) {
      throw new Error("eventType is required for booking webhook events");
    }

    const dto: BookingRejectedDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_REJECTED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      status: "REJECTED",
      platformClientId: params.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
    };

    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  async scheduleMeetingWebhooks(params: ScheduleMeetingWebhooksParams): Promise<void> {
    const webhookService = this.webhookService;

    const subscribersMeetingStarted = await webhookService.getSubscribers({
      userId: params.booking.userId,
      eventTypeId: params.booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
      teamId: params.teamId,
      orgId: params.orgId,
      oAuthClientId: params.oAuthClientId,
    });

    const subscribersMeetingEnded = await webhookService.getSubscribers({
      userId: params.booking.userId,
      eventTypeId: params.booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
      teamId: params.teamId,
      orgId: params.orgId,
      oAuthClientId: params.oAuthClientId,
    });

    const schedulePromises: Promise<void>[] = [];

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
          params.evt as unknown as Record<string, unknown>,
          params.isDryRun
        )
      );
    }

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
          params.evt as unknown as Record<string, unknown>,
          params.isDryRun
        )
      );
    }

    // Use Promise.allSettled to prevent single webhook scheduling failure from killing entire processor
    const results = await Promise.allSettled(schedulePromises);

    // Log summary for monitoring
    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failureCount = results.filter((result) => result.status === "rejected").length;

    this.log.info(`Meeting webhook scheduling completed`, {
      bookingId: params.booking.id,
      totalWebhooks: schedulePromises.length,
      successful: successCount,
      failed: failureCount,
    });

    // Log individual failures for debugging
    if (failureCount > 0) {
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          this.log.error(`Meeting webhook scheduling failed`, {
            bookingId: params.booking.id,
            index,
            error: result.reason,
          });
        }
      });
    }
  }

  async cancelScheduledMeetingWebhooks(params: CancelScheduledMeetingWebhooksParams): Promise<void> {
    const webhookService = this.webhookService;
    await webhookService.cancelScheduledWebhooks(
      params.bookingId,
      [WebhookTriggerEvents.MEETING_STARTED, WebhookTriggerEvents.MEETING_ENDED],
      params.isDryRun
    );
  }

  async scheduleNoShowWebhooks(params: ScheduleNoShowWebhooksParams): Promise<void> {
    const webhookService = this.webhookService;

    try {
      const tasker = await this.getTasker();
      const noShowPromises: Promise<string | void>[] = [];

      const subscribersHostsNoShow = await webhookService.getSubscribers({
        userId: params.triggerForUser ? params.organizerUser.id : null,
        eventTypeId: params.booking.eventTypeId,
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        teamId: params.teamId,
        orgId: params.orgId,
        oAuthClientId: params.oAuthClientId,
      });

      noShowPromises.push(
        ...subscribersHostsNoShow.map((webhook: WebhookSubscriber) => {
          if (params.booking.startTime && webhook.time && webhook.timeUnit) {
            const scheduledAt = dayjs
              .utc(params.booking.startTime)
              .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
              .toDate();

            return tasker.create(
              "triggerHostNoShowWebhook",
              JSON.stringify({
                triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
                bookingId: params.booking.id,
                webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit as TimeUnit },
              }),
              { scheduledAt }
            );
          }
          return Promise.resolve();
        })
      );

      const subscribersGuestsNoShow = await webhookService.getSubscribers({
        userId: params.triggerForUser ? params.organizerUser.id : null,
        eventTypeId: params.booking.eventTypeId,
        triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
        teamId: params.teamId,
        orgId: params.orgId,
        oAuthClientId: params.oAuthClientId,
      });

      noShowPromises.push(
        ...subscribersGuestsNoShow.map((webhook: WebhookSubscriber) => {
          if (params.booking.startTime && webhook.time && webhook.timeUnit) {
            const scheduledAt = dayjs
              .utc(params.booking.startTime)
              .add(webhook.time, webhook.timeUnit.toLowerCase() as dayjs.ManipulateType)
              .toDate();

            return tasker.create(
              "triggerGuestNoShowWebhook",
              JSON.stringify({
                triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
                bookingId: params.booking.id,
                webhook: { ...webhook, time: webhook.time, timeUnit: webhook.timeUnit as TimeUnit },
              }),
              { scheduledAt }
            );
          }
          return Promise.resolve();
        })
      );

      // Use Promise.allSettled to prevent single webhook scheduling failure from killing entire processor
      const results = await Promise.allSettled(noShowPromises);

      // Log summary for monitoring
      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failureCount = results.filter((result) => result.status === "rejected").length;

      this.log.info(`No-show webhook scheduling completed`, {
        bookingId: params.booking.id,
        totalWebhooks: noShowPromises.length,
        successful: successCount,
        failed: failureCount,
      });

      // Log individual failures for debugging
      if (failureCount > 0) {
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            this.log.error(`No-show webhook scheduling failed`, {
              bookingId: params.booking.id,
              index,
              error: result.reason,
            });
          }
        });
      }
    } catch (error) {
      this.log.error("Failed to schedule no-show webhooks:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
