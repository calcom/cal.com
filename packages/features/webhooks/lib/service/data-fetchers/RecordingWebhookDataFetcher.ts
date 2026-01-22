import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { IWebhookDataFetcher, SubscriberContext } from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type { RecordingWebhookTaskPayload } from "../../types/webhookTask";

export class RecordingWebhookDataFetcher implements IWebhookDataFetcher {
  private readonly RECORDING_TRIGGERS = new Set([
    WebhookTriggerEvents.RECORDING_READY,
    WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
  ]);

  constructor(private readonly logger: ILogger) {}

  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return this.RECORDING_TRIGGERS.has(triggerEvent as never);
  }

  async fetchEventData(payload: RecordingWebhookTaskPayload): Promise<Record<string, unknown> | null> {
    const { recordingId } = payload;

    if (!recordingId) {
      this.logger.warn("Missing recordingId for recording webhook");
      return null;
    }

    // TODO [Phase 1+]: Implement recording data fetching
    // Note: Recording files are stored by video providers. We receive recording_id from their webhook
    // and generate our own proxy download link (using generateVideoToken + our API endpoint).
    // This method fetches booking/event data from DB needed to build the webhook payload.
    //
    // Pattern: recordingId → booking → eventType → user → attendees
    // Then generate downloadLink: `${WEBAPP_URL}/api/video/recording?token=${generateVideoToken(recordingId)}`
    //
    // const booking = await this.bookingRepository.findByUid(payload.bookingUid);
    // const eventType = await this.eventTypeRepository.findById(booking.eventTypeId);
    // const user = await this.userRepository.findById(booking.userId);
    // const attendees = booking.attendees;
    // const token = generateVideoToken(recordingId);
    // const downloadLink = `${WEBAPP_URL}/api/video/recording?token=${token}`;
    // return { booking, eventType, user, attendees, downloadLink };

    this.logger.debug("Recording data fetch not implemented yet (Phase 0 scaffold)", { recordingId });
    return { recordingId, _scaffold: true };
  }

  getSubscriberContext(payload: RecordingWebhookTaskPayload): SubscriberContext {
    return {
      triggerEvent: payload.triggerEvent,
      userId: payload.userId,
      eventTypeId: payload.eventTypeId,
      teamId: payload.teamId,
      orgId: undefined,
      oAuthClientId: payload.oAuthClientId,
    };
  }
}
