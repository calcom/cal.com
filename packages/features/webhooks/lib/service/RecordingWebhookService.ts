import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { RecordingReadyDTO, TranscriptionGeneratedDTO } from "../dto/types";
import { WebhookNotifier } from "../notifier/WebhookNotifier";
import { WebhookService } from "./WebhookService";

/**
 * Specialized service for recording and transcription webhook events.
 *
 * @description This service provides high-level methods for emitting recording-related
 * webhook events with proper DTO construction and validation. It handles the complexity
 * of mapping recording data to standardized webhook DTOs and coordinates with the
 * webhook notification system.
 *
 * @responsibilities
 * - Creates properly structured DTOs for recording-ready and transcription-generated events
 * - Handles optional parameter mapping and validation for recording webhooks
 * - Coordinates with WebhookNotifier for reliable event emission
 * - Supports dry-run testing for recording webhook flows
 *
 * @features
 * - Static methods for easy integration without instantiation
 * - Automatic timestamp generation for webhook events
 * - Support for both individual recordings and batch transcriptions
 * - Flexible parameter handling for various recording scenarios
 * - Built-in dry-run support for testing webhook flows
 *
 * @example Emitting a recording ready webhook
 * ```typescript
 * await RecordingWebhookService.emitRecordingReady({
 *   evt: calendarEvent,
 *   downloadLink: "https://example.com/recording.mp4",
 *   booking: { id: 123, userId: 456 },
 *   teamId: 789
 * });
 * ```
 *
 * @example Emitting a transcription generated webhook
 * ```typescript
 * await RecordingWebhookService.emitTranscriptionGenerated({
 *   evt: calendarEvent,
 *   downloadLinks: {
 *     transcription: [{ format: "vtt", link: "https://example.com/transcript.vtt" }],
 *     recording: "https://example.com/recording.mp4"
 *   },
 *   booking: { id: 123, userId: 456 },
 *   isDryRun: false
 * });
 * ```
 *
 * @see WebhookNotifier For the underlying webhook emission mechanism
 * @see RecordingReadyDTO For the recording ready event structure
 * @see TranscriptionGeneratedDTO For the transcription event structure
 */
export class RecordingWebhookService extends WebhookService {
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

  static async emitTranscriptionGenerated(params: {
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

    await WebhookNotifier.emitWebhook(
      WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
      dto,
      params.isDryRun
    );
  }
}
