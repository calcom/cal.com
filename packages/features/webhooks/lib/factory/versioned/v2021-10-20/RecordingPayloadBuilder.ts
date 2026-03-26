import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { RecordingReadyDTO, TranscriptionGeneratedDTO } from "../../../dto/types";
import type { WebhookPayload } from "../../types";
import { BaseRecordingPayloadBuilder } from "../../base/BaseRecordingPayloadBuilder";

/**
 * Recording payload builder for webhook version 2021-10-20.
 *
 * Matches the legacy payload shape: CalendarEvent fields spread flat
 * (minus assignmentReason) plus downloadLink / downloadLinks,
 * with utcOffset on organizer and attendees.
 */
export class RecordingPayloadBuilder extends BaseRecordingPayloadBuilder {
  build(dto: RecordingReadyDTO | TranscriptionGeneratedDTO): WebhookPayload {
    if (dto.triggerEvent === WebhookTriggerEvents.RECORDING_READY) {
      return this.buildRecordingReadyPayload(dto as RecordingReadyDTO);
    }

    return this.buildTranscriptionPayload(dto as TranscriptionGeneratedDTO);
  }

  private buildRecordingReadyPayload(dto: RecordingReadyDTO): WebhookPayload {
    const evtWithOffsets = this.addUTCOffsets(dto.evt);
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: {
        ...this.stripAssignmentReason(evtWithOffsets),
        downloadLink: dto.downloadLink,
      },
    };
  }

  private buildTranscriptionPayload(dto: TranscriptionGeneratedDTO): WebhookPayload {
    const evtWithOffsets = this.addUTCOffsets(dto.evt);
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: {
        ...this.stripAssignmentReason(evtWithOffsets),
        downloadLinks: dto.downloadLinks,
      },
    };
  }

  private addUTCOffsets(evt: CalendarEvent) {
    const organizer = evt.organizer
      ? {
          ...evt.organizer,
          utcOffset: getUTCOffsetByTimezone(evt.organizer.timeZone, evt.startTime),
        }
      : evt.organizer;

    const attendees =
      evt.attendees?.map((a) => ({
        ...a,
        utcOffset: getUTCOffsetByTimezone(a.timeZone, evt.startTime),
      })) ?? [];

    return { ...evt, organizer, attendees };
  }

  private stripAssignmentReason(evt: CalendarEvent): Omit<CalendarEvent, "assignmentReason"> {
    const { assignmentReason: _unused, ...rest } = evt;
    return rest;
  }
}
