import { getBatchProcessorJobAccessLink } from "@calcom/app-store/dailyvideo/lib";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { generateVideoToken } from "@calcom/lib/videoTokens";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { IWebhookDataFetcher, SubscriberContext } from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type { RecordingWebhookTaskPayload } from "../../types/webhookTask";

export class RecordingWebhookDataFetcher implements IWebhookDataFetcher {
  private readonly RECORDING_TRIGGERS = new Set([
    WebhookTriggerEvents.RECORDING_READY,
    WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
  ]);

  constructor(
    private readonly logger: ILogger,
    private readonly bookingRepository: BookingRepository
  ) {}

  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return this.RECORDING_TRIGGERS.has(triggerEvent as never);
  }

  async fetchEventData(payload: RecordingWebhookTaskPayload): Promise<Record<string, unknown> | null> {
    const { recordingId, bookingUid } = payload;

    if (!recordingId || !bookingUid) {
      this.logger.warn("Missing recordingId or bookingUid for recording webhook", {
        recordingId,
        bookingUid,
      });
      return null;
    }

    try {
      const booking = await this.bookingRepository.getBookingForCalEventBuilderFromUid(bookingUid);

      if (!booking) {
        this.logger.warn("Booking not found for recording webhook", { bookingUid });
        return null;
      }

      const calendarEvent = await CalendarEventBuilder.fromBookingWithOptionalRelations(booking);

      if (
        payload.triggerEvent === WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED &&
        payload.batchProcessorJobId
      ) {
        const [accessLink, recordingLink] = await Promise.all([
          getBatchProcessorJobAccessLink(payload.batchProcessorJobId),
          Promise.resolve(this.generateDownloadLink(recordingId)),
        ]);

        return {
          calendarEvent,
          booking,
          downloadLinks: {
            transcription: accessLink.transcription,
            recording: recordingLink,
          },
        };
      }

      const downloadLink = this.generateDownloadLink(recordingId);
      return { calendarEvent, booking, downloadLink };
    } catch (error) {
      this.logger.error("Error fetching recording data for webhook", {
        recordingId,
        bookingUid,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  getSubscriberContext(payload: RecordingWebhookTaskPayload): SubscriberContext {
    return {
      triggerEvent: payload.triggerEvent,
      userId: payload.userId,
      eventTypeId: payload.eventTypeId,
      teamId: payload.teamId,
      orgId: payload.orgId,
      oAuthClientId: payload.oAuthClientId,
    };
  }

  private generateDownloadLink(recordingId: string): string {
    const token = generateVideoToken(recordingId);
    return `${WEBAPP_URL}/api/video/recording?token=${token}`;
  }
}
