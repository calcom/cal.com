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
    const { triggerEvent, timestamp } = payload;

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
        } as WebhookEventDTO;
      default:
        this.log.warn("Unsupported trigger event for DTO building", { triggerEvent });
        return null;
    }
  }
}
