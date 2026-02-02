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

    // TODO: Fetch booking data and generate download link (Phase 1+)
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
