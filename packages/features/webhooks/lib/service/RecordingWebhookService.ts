import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { RecordingReadyDTO, TranscriptionGeneratedDTO } from "../dto/types";
import type { IRecordingWebhookService } from "../interface/services";
import type { IWebhookNotifier } from "../interface/webhook";

export class RecordingWebhookService implements IRecordingWebhookService {
  constructor(private readonly webhookNotifier: IWebhookNotifier) {}

  async emitRecordingReady(params: {
    evt: CalendarEvent;
    downloadLink: string;
    booking?: {
      id: number;
      eventTypeId?: number | null;
      userId?: number | null;
    };
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: RecordingReadyDTO = {
      triggerEvent: WebhookTriggerEvents.RECORDING_READY,
      createdAt: new Date().toISOString(),
      bookingId: params.booking?.id,
      eventTypeId: params.booking?.eventTypeId,
      userId: params.booking?.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      downloadLink: params.downloadLink,
    };
    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  async emitTranscriptionGenerated(params: {
    evt: CalendarEvent;
    downloadLinks?: {
      transcription?: Array<{
        format: string;
        link: string;
      }>;
      recording?: string;
    };
    booking?: {
      id: number;
      eventTypeId?: number | null;
      userId?: number | null;
    };
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: TranscriptionGeneratedDTO = {
      triggerEvent: WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking?.id,
      eventTypeId: params.booking?.eventTypeId,
      userId: params.booking?.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      downloadLinks: params.downloadLinks,
    };

    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }
}
