import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { WebhookNotifier } from "../notifier/WebhookNotifier";
import { BaseWebhookService } from "./BaseWebhookService";

// Recording-specific DTOs
export interface RecordingReadyDTO {
  triggerEvent: typeof WebhookTriggerEvents.RECORDING_READY;
  createdAt: string;
  bookingId?: number;
  eventTypeId?: number | null;
  userId?: number | null;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string | null;
  evt: CalendarEvent;
  downloadLink: string;
}

export interface TranscriptionGeneratedDTO {
  triggerEvent: typeof WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED;
  createdAt: string;
  bookingId?: number;
  eventTypeId?: number | null;
  userId?: number | null;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string | null;
  evt: CalendarEvent;
  transcriptionUrl: string;
}

/**
 * Service for creating recording-related webhook DTOs and emitting webhook events
 * Handles RECORDING_READY and RECORDING_TRANSCRIPTION_GENERATED webhooks
 */
export class RecordingWebhookService extends BaseWebhookService {
  /**
   * Emits a recording ready webhook
   */
  static async emitRecordingReady(params: {
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

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.RECORDING_READY, dto, params.isDryRun);
  }

  /**
   * Emits a transcription generated webhook
   */
  static async emitTranscriptionGenerated(params: {
    evt: CalendarEvent;
    transcriptionUrl: string;
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
      transcriptionUrl: params.transcriptionUrl,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED, dto, params.isDryRun);
  }
}
