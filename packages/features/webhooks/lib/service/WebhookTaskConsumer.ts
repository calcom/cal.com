import type { BookingForCalEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type {
  BookingCreatedDTO,
  BookingNoShowDTO,
  BookingRejectedDTO,
  BookingRequestedDTO,
  BookingRescheduledDTO,
  OOOCreatedDTO,
  RoutingFormFallbackHitDTO,
  WebhookEventDTO,
  WebhookSubscriber,
  WrongAssignmentReportDTO,
} from "../dto/types";
import type { WebhookPayload } from "../factory/types";
import type { PayloadBuilderFactory } from "../factory/versioned/PayloadBuilderFactory";
import type { IWebhookDataFetcher } from "../interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "../interface/IWebhookRepository";
import { DEFAULT_WEBHOOK_VERSION } from "../interface/IWebhookRepository";
import type { ILogger } from "../interface/infrastructure";
import type { IWebhookService } from "../interface/services";
import type {
  BookingWebhookTaskPayload,
  RoutingFormFallbackHitWebhookTaskPayload,
  WrongAssignmentMetadata,
  WebhookTaskPayload,
} from "../types/webhookTask";
import {
  noShowEventDataSchema,
  oooEntrySchema,
  routingFormFallbackHitEventDataSchema,
} from "../types/webhookTask";

export class WebhookTaskConsumer {
  private readonly log: ILogger;

  constructor(
    private readonly webhookRepository: IWebhookRepository,
    private readonly dataFetchers: IWebhookDataFetcher[],
    private readonly payloadBuilderFactory: PayloadBuilderFactory,
    private readonly webhookService: IWebhookService,
    logger: ILogger
  ) {
    this.log = logger.getSubLogger({ prefix: ["[WebhookTaskConsumer]"] });
  }

  /**
   * Main entry point for processing webhook delivery tasks.
   */
  async processWebhookTask(payload: WebhookTaskPayload, taskId: string): Promise<void> {
    this.log.debug("Processing webhook delivery task", {
      operationId: payload.operationId,
      taskId,
      triggerEvent: payload.triggerEvent,
    });

    try {
      const fetcher = this.getDataFetcher(payload.triggerEvent);

      if (!fetcher) {
        this.log.error("No data fetcher found for trigger event", {
          operationId: payload.operationId,
          triggerEvent: payload.triggerEvent,
        });
        throw new Error(`No data fetcher registered for trigger event: ${payload.triggerEvent}`);
      }

      const subscriberContext = fetcher.getSubscriberContext(payload);
      const subscribers = await this.webhookRepository.getSubscribers(subscriberContext);

      if (subscribers.length === 0) {
        this.log.debug("No webhook subscribers found", { operationId: payload.operationId });
        return;
      }

      this.log.debug(`Found ${subscribers.length} webhook subscriber(s)`, {
        operationId: payload.operationId,
      });

      const eventData = await fetcher.fetchEventData(payload);

      if (!eventData) {
        this.log.warn("Event data not found", {
          operationId: payload.operationId,
          triggerEvent: payload.triggerEvent,
        });
        return;
      }

      await this.sendWebhooksToSubscribers(subscribers, eventData, payload);

      this.log.debug("Webhook delivery task completed", {
        operationId: payload.operationId,
        subscriberCount: subscribers.length,
      });
    } catch (error) {
      this.log.error("Failed to process webhook delivery task", {
        operationId: payload.operationId,
        taskId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Prepare webhook delivery data without sending.
   * Returns subscribers and the built webhook payload so the caller can
   * control per-subscriber delivery (e.g. with per-subscriber retries).
   */
  async prepareWebhookDelivery(
    payload: WebhookTaskPayload,
    taskId: string
  ): Promise<{
    subscribers: WebhookSubscriber[];
    triggerEvent: WebhookTriggerEvents;
    webhookPayload: WebhookPayload;
  } | null> {
    this.log.debug("Preparing webhook delivery", {
      operationId: payload.operationId,
      taskId,
      triggerEvent: payload.triggerEvent,
    });

    const fetcher = this.getDataFetcher(payload.triggerEvent);

    if (!fetcher) {
      throw new Error(`No data fetcher registered for trigger event: ${payload.triggerEvent}`);
    }

    const subscriberContext = fetcher.getSubscriberContext(payload);
    const subscribers = await this.webhookRepository.getSubscribers(subscriberContext);

    if (subscribers.length === 0) {
      this.log.debug("No webhook subscribers found", { operationId: payload.operationId });
      return null;
    }

    const eventData = await fetcher.fetchEventData(payload);

    if (!eventData) {
      this.log.warn("Event data not found", {
        operationId: payload.operationId,
        triggerEvent: payload.triggerEvent,
      });
      return null;
    }

    const dto = this.buildDTO(eventData, payload);

    if (!dto) {
      this.log.warn("Failed to build DTO for webhook", {
        triggerEvent: payload.triggerEvent,
        operationId: payload.operationId,
      });
      return null;
    }

    const builder = this.payloadBuilderFactory.getBuilder(DEFAULT_WEBHOOK_VERSION, dto.triggerEvent);
    const webhookPayload = builder.build(dto);

    return { subscribers, triggerEvent: dto.triggerEvent, webhookPayload };
  }

  /**
   * Get the appropriate data fetcher for the trigger event.
   *
   * Uses polymorphism via canHandle() method - each fetcher knows which events it handles.
   */
  private getDataFetcher(triggerEvent: string): IWebhookDataFetcher | null {
    return this.dataFetchers.find((fetcher) => fetcher.canHandle(triggerEvent as never)) || null;
  }

  /**
   * Build webhook payloads and send to each subscriber via WebhookService.
   * Uses WebhookService.processWebhooks() for HTTP delivery.
   */
  private async sendWebhooksToSubscribers(
    subscribers: WebhookSubscriber[],
    eventData: Record<string, unknown>,
    payload: WebhookTaskPayload
  ): Promise<void> {
    if (subscribers.length === 0) {
      this.log.debug("No subscribers to send webhooks to");
      return;
    }

    try {
      const dto = this.buildDTO(eventData, payload);

      if (!dto) {
        this.log.warn("Failed to build DTO for webhook", {
          triggerEvent: payload.triggerEvent,
          operationId: payload.operationId,
        });
        return;
      }

      const builder = this.payloadBuilderFactory.getBuilder(DEFAULT_WEBHOOK_VERSION, dto.triggerEvent);
      const webhookPayload = builder.build(dto);

      await this.webhookService.processWebhooks(dto.triggerEvent, webhookPayload, subscribers);

      this.log.debug("Webhook sending completed", {
        subscriberCount: subscribers.length,
        triggerEvent: payload.triggerEvent,
        operationId: payload.operationId,
      });
    } catch (error) {
      this.log.error("Error in sendWebhooksToSubscribers", {
        error: error instanceof Error ? error.message : String(error),
        triggerEvent: payload.triggerEvent,
      });
      throw error;
    }
  }
  /**
   * Build WebhookEventDTO from fetched event data.
   *
   * This method maps the data fetched from DB into the DTO structure
   * expected by PayloadBuilders.
   */
  private buildDTO(eventData: Record<string, unknown>, payload: WebhookTaskPayload): WebhookEventDTO | null {
    if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED) {
      return this.buildNoShowDTO(eventData, payload);
    }

    const { triggerEvent, timestamp } = payload;

    if (triggerEvent === WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT) {
      return this.buildWrongAssignmentDTO(eventData, timestamp);
    }

    if (triggerEvent === WebhookTriggerEvents.OOO_CREATED) {
      return this.buildOOODTO(eventData, payload);
    }

    if (triggerEvent === WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT) {
      return this.buildRoutingFormFallbackHitDTO(
        eventData,
        payload as RoutingFormFallbackHitWebhookTaskPayload
      );
    }

    const calendarEvent = eventData.calendarEvent as CalendarEvent | undefined;
    const booking = eventData.booking as BookingForCalEventBuilder | undefined;
    const eventType = booking?.eventType;

    if (!calendarEvent || !booking || !eventType) {
      this.log.warn("Missing required data to build DTO", {
        hasCalendarEvent: !!calendarEvent,
        hasBooking: !!booking,
        hasEventType: !!eventType,
      });
      return null;
    }

    const eventTypeInfo = {
      id: eventType.id,
      eventTitle: eventType.title,
      eventDescription: eventType.description,
      requiresConfirmation: eventType.requiresConfirmation,
      price: eventType.price,
      currency: eventType.currency,
      length: eventType.length,
    };

    const bookingPayload = payload as BookingWebhookTaskPayload;
    const baseDTO = {
      createdAt: timestamp,
      bookingId: booking.id,
      eventTypeId: eventType.id,
      userId: booking.user?.id ?? null,
      teamId: bookingPayload.teamId ?? null,
      orgId: bookingPayload.orgId,
      platformClientId: bookingPayload.platformClientId ?? bookingPayload.oAuthClientId,
      evt: calendarEvent,
      eventType: eventTypeInfo,
      booking: {
        id: booking.id,
        eventTypeId: booking.eventTypeId,
        userId: booking.userId,
        startTime: booking.startTime,
        smsReminderNumber: booking.smsReminderNumber,
        iCalSequence: booking.iCalSequence,
        // Raw assignmentReason from DB for legacy format [{ reasonEnum, reasonString }]
        assignmentReason: booking.assignmentReason,
      },
    };

    switch (triggerEvent) {
      case WebhookTriggerEvents.BOOKING_CREATED:
        return {
          ...baseDTO,
          triggerEvent,
          status: "ACCEPTED",
          metadata: {
            ...(typeof booking.metadata === "object" &&
            booking.metadata !== null &&
            !Array.isArray(booking.metadata)
              ? booking.metadata
              : {}),
            ...(bookingPayload.metadata ?? {}),
          },
        } satisfies BookingCreatedDTO;
      case WebhookTriggerEvents.BOOKING_RESCHEDULED: {
        const previousBooking = eventData.previousBooking as
          | { id: number; uid: string; startTime: Date; endTime: Date; rescheduledBy: string | null }
          | undefined;
        return {
          ...baseDTO,
          triggerEvent,
          rescheduleId: previousBooking?.id,
          rescheduleUid: previousBooking?.uid,
          rescheduleStartTime: previousBooking?.startTime?.toISOString(),
          rescheduleEndTime: previousBooking?.endTime?.toISOString(),
          rescheduledBy: previousBooking?.rescheduledBy ?? undefined,
          metadata: {
            ...(typeof booking.metadata === "object" &&
            booking.metadata !== null &&
            !Array.isArray(booking.metadata)
              ? booking.metadata
              : {}),
            ...(bookingPayload.metadata ?? {}),
          },
        } satisfies BookingRescheduledDTO;
      }
      case WebhookTriggerEvents.BOOKING_REQUESTED:
        return {
          ...baseDTO,
          triggerEvent,
          metadata: {
            ...(typeof booking.metadata === "object" &&
            booking.metadata !== null &&
            !Array.isArray(booking.metadata)
              ? booking.metadata
              : {}),
            ...(bookingPayload.metadata ?? {}),
          },
        } satisfies BookingRequestedDTO;
      case WebhookTriggerEvents.BOOKING_REJECTED:
        return {
          ...baseDTO,
          triggerEvent,
          status: "REJECTED",
        } satisfies BookingRejectedDTO;
      default:
        this.log.warn("Unsupported trigger event for DTO building", { triggerEvent });
        return null;
    }
  }

  private buildWrongAssignmentDTO(
    eventData: Record<string, unknown>,
    timestamp: string
  ): WrongAssignmentReportDTO | null {
    if (!this.isWrongAssignmentMetadata(eventData)) {
      this.log.warn("Missing booking or report in wrong assignment event data");
      return null;
    }

    return {
      triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
      createdAt: timestamp,
      booking: eventData.booking,
      report: eventData.report,
    } satisfies WrongAssignmentReportDTO;
  }

  private isWrongAssignmentMetadata(data: Record<string, unknown>): data is WrongAssignmentMetadata {
    return (
      "booking" in data &&
      data.booking != null &&
      typeof data.booking === "object" &&
      "report" in data &&
      data.report != null &&
      typeof data.report === "object"
    );
  }

  private buildNoShowDTO(
    eventData: Record<string, unknown>,
    payload: BookingWebhookTaskPayload
  ): BookingNoShowDTO | null {
    const parsed = noShowEventDataSchema.safeParse(eventData);

    if (!parsed.success) {
      this.log.warn("Missing required fields for no-show DTO", {
        errors: parsed.error.issues.map((i) => i.message),
      });
      return null;
    }

    return {
      triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
      createdAt: payload.timestamp,
      bookingUid: parsed.data.bookingUid,
      bookingId: parsed.data.bookingId,
      message: parsed.data.noShowMessage,
      attendees: parsed.data.noShowAttendees,
      userId: payload.userId ?? null,
      teamId: payload.teamId ?? null,
      orgId: payload.orgId,
      platformClientId: payload.platformClientId ?? payload.oAuthClientId,
    } satisfies BookingNoShowDTO;
  }

  private buildRoutingFormFallbackHitDTO(
    eventData: Record<string, unknown>,
    payload: RoutingFormFallbackHitWebhookTaskPayload
  ): RoutingFormFallbackHitDTO | null {
    const parsed = routingFormFallbackHitEventDataSchema.safeParse(eventData);

    if (!parsed.success) {
      this.log.warn("Missing required fields for routing form fallback hit DTO", {
        errors: parsed.error.issues.map((i) => i.message),
      });
      return null;
    }

    return {
      triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
      createdAt: payload.timestamp,
      form: {
        id: parsed.data.formId,
        name: parsed.data.formName,
      },
      responseId: parsed.data.responseId,
      fallbackAction: parsed.data.fallbackAction,
      responses: parsed.data.responses,
      userId: payload.userId ?? null,
      teamId: payload.teamId ?? null,
      orgId: payload.orgId,
    } satisfies RoutingFormFallbackHitDTO;
  }

  private buildOOODTO(eventData: Record<string, unknown>, payload: WebhookTaskPayload): OOOCreatedDTO | null {
    if (payload.triggerEvent !== WebhookTriggerEvents.OOO_CREATED) {
      return null;
    }

    const entryParsed = oooEntrySchema.safeParse(eventData.oooEntry);
    if (!entryParsed.success) {
      this.log.warn("Missing oooEntry for OOO DTO");
      return null;
    }

    return {
      triggerEvent: WebhookTriggerEvents.OOO_CREATED,
      createdAt: payload.timestamp,
      oooEntry: entryParsed.data,
      userId: payload.userId ?? null,
      teamId: payload.teamId ?? null,
      orgId: payload.orgId ?? undefined,
    } satisfies OOOCreatedDTO;
  }
}
