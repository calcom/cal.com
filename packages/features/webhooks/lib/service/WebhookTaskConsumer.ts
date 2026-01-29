import type { BookingForCalEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { WebhookEventDTO, WebhookSubscriber } from "../dto/types";
import type { PayloadBuilderFactory } from "../factory/versioned/PayloadBuilderFactory";
import type { IWebhookDataFetcher } from "../interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "../interface/IWebhookRepository";
import { DEFAULT_WEBHOOK_VERSION } from "../interface/IWebhookRepository";
import type { ILogger } from "../interface/infrastructure";
import type { IWebhookService } from "../interface/services";
import type {
  BookingWebhookTaskPayload,
  PaymentWebhookTaskPayload,
  WebhookTaskPayload,
} from "../types/webhookTask";

/**
 * Webhook Task Consumer
 *
 * Processes webhook delivery tasks from the queue:
 * 1. Fetches webhook subscribers
 * 2. Fetches event-specific data from database (via injected data fetchers)
 * 3. Builds and sends webhook payloads
 *
 * Architecture:
 * - Uses Strategy Pattern: Data fetchers are injected, consumer orchestrates
 * - Open/Closed: Add new webhook types by registering fetchers, no code modification
 * - Single Responsibility: Consumer orchestrates, fetchers handle domain logic
 * - Dependency Inversion: Depends on IWebhookDataFetcher interface
 */
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
      // Step 1: Get the appropriate data fetcher for this trigger event
      const fetcher = this.getDataFetcher(payload.triggerEvent);

      if (!fetcher) {
        this.log.error("No data fetcher found for trigger event", {
          operationId: payload.operationId,
          triggerEvent: payload.triggerEvent,
        });
        throw new Error(`No data fetcher registered for trigger event: ${payload.triggerEvent}`);
      }

      // Step 2: Fetch webhook subscribers
      const subscriberContext = fetcher.getSubscriberContext(payload);
      const subscribers = await this.webhookRepository.getSubscribers(subscriberContext);

      if (subscribers.length === 0) {
        this.log.debug("No webhook subscribers found", { operationId: payload.operationId });
        return;
      }

      this.log.debug(`Found ${subscribers.length} webhook subscriber(s)`, {
        operationId: payload.operationId,
      });

      // Step 3: Fetch event-specific data via data fetcher
      const eventData = await fetcher.fetchEventData(payload);

      if (!eventData) {
        this.log.warn("Event data not found", {
          operationId: payload.operationId,
          triggerEvent: payload.triggerEvent,
        });
        return;
      }

      // Step 4: Build and send webhooks to each subscriber
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
   * Get the appropriate data fetcher for the trigger event.
   *
   * Uses polymorphism via canHandle() method - each fetcher knows which events it handles.
   */
  private getDataFetcher(triggerEvent: string): IWebhookDataFetcher | null {
    return this.dataFetchers.find((fetcher) => fetcher.canHandle(triggerEvent as never)) || null;
  }

  /**
   * Build webhook payloads and send to each subscriber via WebhookService.
   *
   * Uses proper DI flow: WebhookService.processWebhooks() for HTTP delivery.
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
      // Build DTO from fetched data
      const dto = this.buildDTO(eventData, payload);

      if (!dto) {
        this.log.warn("Failed to build DTO for webhook", {
          triggerEvent: payload.triggerEvent,
          operationId: payload.operationId,
        });
        return;
      }

      // Build versioned payload using PayloadBuilderFactory
      const builder = this.payloadBuilderFactory.getBuilder(DEFAULT_WEBHOOK_VERSION, dto.triggerEvent);
      const webhookPayload = builder.build(dto);

      // Send via WebhookService (proper DI, no legacy sendPayload)
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
    const { triggerEvent, timestamp } = payload;

    // Extract common fields from event data
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

    // Transform DB eventType shape to EventTypeInfo shape expected by PayloadBuilder
    // DB has: title, description, price, currency, length, requiresConfirmation
    // PayloadBuilder expects: eventTitle, eventDescription, price, currency, length, requiresConfirmation
    const eventTypeInfo = {
      id: eventType.id,
      eventTitle: eventType.title,
      eventDescription: eventType.description,
      requiresConfirmation: eventType.requiresConfirmation,
      price: eventType.price,
      currency: eventType.currency,
      length: eventType.length,
    };

    // Build DTO based on trigger event type
    const bookingPayload = payload as BookingWebhookTaskPayload;
    const baseDTO = {
      createdAt: timestamp,
      bookingId: booking.id,
      eventTypeId: eventType.id,
      userId: booking.user?.id ?? null,
      teamId: bookingPayload.teamId ?? null,
      orgId: bookingPayload.orgId,
      platformClientId: bookingPayload.oAuthClientId,
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
      case WebhookTriggerEvents.BOOKING_CREATED: {
        // Platform fields are already on CalendarEvent (built by BookingWebhookDataFetcher)
        // and will be included in final payload when payload builder spreads ...params.evt
        // This matches legacy behavior where platform fields were flat fields on the payload
        return {
          ...baseDTO,
          triggerEvent,
          status: "ACCEPTED",
          metadata: bookingPayload.metadata,
        } as WebhookEventDTO;
      }
      case WebhookTriggerEvents.BOOKING_REQUESTED:
      case WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED:
        return {
          ...baseDTO,
          triggerEvent,
        } as WebhookEventDTO;

      case WebhookTriggerEvents.BOOKING_CANCELLED:
        return {
          ...baseDTO,
          triggerEvent,
          cancelledBy: bookingPayload.cancelledBy,
          cancellationReason: bookingPayload.cancellationReason,
          requestReschedule: bookingPayload.requestReschedule ?? false,
        } as WebhookEventDTO;

      case WebhookTriggerEvents.BOOKING_RESCHEDULED:
        return {
          ...baseDTO,
          triggerEvent,
          rescheduleId: bookingPayload.rescheduleId,
          rescheduleUid: bookingPayload.rescheduleUid,
          rescheduleStartTime: bookingPayload.rescheduleStartTime,
          rescheduleEndTime: bookingPayload.rescheduleEndTime,
          rescheduledBy: bookingPayload.rescheduledBy,
          metadata: bookingPayload.metadata,
        } as WebhookEventDTO;

      case WebhookTriggerEvents.BOOKING_REJECTED:
        return {
          ...baseDTO,
          triggerEvent,
          status: "REJECTED",
          rejectionReason: bookingPayload.rejectionReason,
        } as WebhookEventDTO;

      case WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED:
      case WebhookTriggerEvents.BOOKING_PAID: {
        const paymentPayload = payload as PaymentWebhookTaskPayload;
        return {
          ...baseDTO,
          triggerEvent,
          paymentId: paymentPayload.paymentId,
        } as WebhookEventDTO;
      }

      default:
        this.log.warn("Unsupported trigger event for DTO building", { triggerEvent });
        return null;
    }
  }
}
