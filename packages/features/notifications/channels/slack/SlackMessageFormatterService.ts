import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { NotificationEvent } from "../../types/NotificationChannel";

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: { type: string; text: string }[];
  elements?: { type: string; text?: { type: string; text: string }; url?: string }[];
}

export interface SlackMessage {
  text: string;
  blocks: SlackBlock[];
}

const TRIGGER_LABELS: Record<string, string> = {
  BOOKING_CREATED: "New Booking Created",
  BOOKING_CANCELLED: "Booking Cancelled",
  BOOKING_RESCHEDULED: "Booking Rescheduled",
  BOOKING_REQUESTED: "Booking Requested",
  BOOKING_REJECTED: "Booking Rejected",
  BOOKING_PAID: "Booking Payment Received",
  BOOKING_PAYMENT_INITIATED: "Booking Payment Initiated",
  BOOKING_NO_SHOW_UPDATED: "No-Show Status Updated",
  MEETING_STARTED: "Meeting Started",
  MEETING_ENDED: "Meeting Ended",
  RECORDING_READY: "Recording Ready",
  RECORDING_TRANSCRIPTION_GENERATED: "Transcription Generated",
  INSTANT_MEETING: "Instant Meeting",
  OOO_CREATED: "Out of Office Created",
  FORM_SUBMITTED: "Form Submitted",
  FORM_SUBMITTED_NO_EVENT: "Form Submitted (No Event)",
  AFTER_HOSTS_CAL_VIDEO_NO_SHOW: "Host No-Show Detected",
  AFTER_GUESTS_CAL_VIDEO_NO_SHOW: "Guest No-Show Detected",
  DELEGATION_CREDENTIAL_ERROR: "Delegation Credential Error",
  WRONG_ASSIGNMENT_REPORT: "Wrong Assignment Report",
};

export class SlackMessageFormatterService {
  format(triggerEvent: WebhookTriggerEvents, payload: Record<string, unknown>): SlackMessage {
    const label = TRIGGER_LABELS[triggerEvent] || triggerEvent;
    const fallbackText = `Cal.com: ${label}`;
    const fields = this.extractFields(triggerEvent, payload);

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: { type: "plain_text", text: label, emoji: true },
      },
    ];

    if (fields.length > 0) {
      blocks.push({
        type: "section",
        fields: fields.map((f) => ({ type: "mrkdwn", text: f })),
      });
    }

    return { text: fallbackText, blocks };
  }

  private extractFields(triggerEvent: WebhookTriggerEvents, payload: Record<string, unknown>): string[] {
    const fields: string[] = [];
    const evt = payload.evt as Record<string, unknown> | undefined;
    const booking = payload.booking as Record<string, unknown> | undefined;

    if (evt) {
      if (evt.title) fields.push(`*Event:* ${String(evt.title)}`);
      if (evt.startTime) fields.push(`*When:* ${String(evt.startTime)}`);

      const attendees = evt.attendees as Array<{ name?: string; email?: string }> | undefined;
      if (attendees && attendees.length > 0) {
        fields.push(`*Attendee:* ${attendees[0].name || attendees[0].email || "Unknown"}`);
      }
    }

    if (booking) {
      if (booking.title) fields.push(`*Booking:* ${String(booking.title)}`);
      if (booking.id) fields.push(`*Booking ID:* ${String(booking.id)}`);
    }

    if (payload.status) {
      fields.push(`*Status:* ${String(payload.status)}`);
    }

    const triggerStr = String(triggerEvent);
    if (triggerStr === "OOO_CREATED") {
      const oooEntry = payload.oooEntry as Record<string, unknown> | undefined;
      if (oooEntry) {
        if (oooEntry.start) fields.push(`*From:* ${String(oooEntry.start)}`);
        if (oooEntry.end) fields.push(`*Until:* ${String(oooEntry.end)}`);
      }
    }

    if (triggerStr === "FORM_SUBMITTED" || triggerStr === "FORM_SUBMITTED_NO_EVENT") {
      const form = payload.form as Record<string, unknown> | undefined;
      if (form?.name) fields.push(`*Form:* ${String(form.name)}`);
    }

    return fields;
  }
}
