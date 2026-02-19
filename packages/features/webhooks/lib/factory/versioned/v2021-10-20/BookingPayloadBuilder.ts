import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalEventResponses } from "@calcom/types/Calendar";
import type { BookingWebhookEventDTO } from "../../../dto/types";
import {
  BaseBookingPayloadBuilder,
  type BookingExtraDataMap,
  type BookingPayloadParams,
} from "../../base/BaseBookingPayloadBuilder";
import type { WebhookPayload } from "../../types";
import type { V20211020BookingEventPayload } from "./types";

/** Default labels for system booking fields (form-builder / E2E expectation) */
const SYSTEM_FIELD_DEFAULT_LABELS: Record<string, string> = {
  name: "your_name",
  email: "email_address",
};

/**
 * Normalize responses so system fields use default labels when label equals field name.
 * getCalEventResponses uses field name as label when bookingFields is missing; E2E expects default labels.
 */
function normalizeResponses(responses: CalEventResponses | null | undefined): CalEventResponses | undefined {
  if (!responses || typeof responses !== "object") return undefined;
  const out: CalEventResponses = {};
  for (const [name, entry] of Object.entries(responses)) {
    if (!entry || typeof entry !== "object") continue;
    const defaultLabel = SYSTEM_FIELD_DEFAULT_LABELS[name];
    const label =
      defaultLabel && (entry.label === name || entry.label === undefined)
        ? defaultLabel
        : (entry.label ?? name);
    out[name] = { ...entry, label };
  }
  return out;
}

/** Derive firstName/lastName from name for legacy payload parity (attendees[].firstName, attendees[].lastName). */
function nameToFirstAndLast(name: string): { firstName: string; lastName: string } {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, firstSpace),
    lastName: trimmed.slice(firstSpace + 1).trim(),
  };
}

/**
 * Booking payload builder for webhook version 2021-10-20.
 *
 * This is the initial webhook payload format. It includes:
 * - Full CalendarEvent data spread into payload
 * - UTC offset calculations for organizer and attendees
 * - Event type metadata (title, description, price, etc.)
 * - Trigger-specific extra fields (cancellation reason, reschedule info, etc.)
 */
export class BookingPayloadBuilder extends BaseBookingPayloadBuilder {
  /**
   * Build the complete booking webhook payload for v2021-10-20.
   */
  build(dto: BookingWebhookEventDTO): WebhookPayload {
    switch (dto.triggerEvent) {
      case WebhookTriggerEvents.BOOKING_CREATED:
        return this.buildBookingPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.ACCEPTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
        });

      case WebhookTriggerEvents.BOOKING_CANCELLED:
        return this.buildBookingPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.CANCELLED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
          extra: {
            cancelledBy: dto.cancelledBy,
            cancellationReason: dto.cancellationReason,
            requestReschedule: dto.requestReschedule ?? false,
          },
        });

      case WebhookTriggerEvents.BOOKING_REQUESTED:
        return this.buildBookingPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.PENDING,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
          extra: {
            metadata: (dto.metadata ?? {}) as { [key: string]: string | number | boolean | null },
          },
        });

      case WebhookTriggerEvents.BOOKING_REJECTED:
        return this.buildBookingPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.REJECTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
        });

      case WebhookTriggerEvents.BOOKING_RESCHEDULED:
        return this.buildBookingPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.ACCEPTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
          extra: {
            rescheduleId: dto.rescheduleId,
            rescheduleUid: dto.rescheduleUid,
            rescheduleStartTime: dto.rescheduleStartTime,
            rescheduleEndTime: dto.rescheduleEndTime,
            rescheduledBy: dto.rescheduledBy,
          },
        });

      case WebhookTriggerEvents.BOOKING_PAID:
        return this.buildBookingPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.ACCEPTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
          extra: {
            paymentId: dto.paymentId,
            paymentData: dto.paymentData,
          },
        });

      case WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED:
        return this.buildBookingPayload({
          booking: dto.booking,
          eventType: dto.eventType,
          evt: dto.evt,
          status: BookingStatus.ACCEPTED,
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
          extra: {
            paymentId: dto.paymentId,
            paymentData: dto.paymentData,
          },
        });

      case WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED:
        return this.buildNoShowPayload(dto);

      default: {
        const _exhaustiveCheck: never = dto;
        throw new Error(`Unsupported booking trigger: ${JSON.stringify(_exhaustiveCheck)}`);
      }
    }
  }

  /**
   * Build the standard booking payload structure for v2021-10-20.
   */
  private buildBookingPayload<T extends keyof BookingExtraDataMap>(
    params: BookingPayloadParams<T>
  ): WebhookPayload {
    const utcOffsetOrganizer = getUTCOffsetByTimezone(params.evt.organizer?.timeZone, params.evt.startTime);
    const organizer = {
      ...params.evt.organizer,
      utcOffset: utcOffsetOrganizer,
      usernameInOrg: params.evt.organizer?.usernameInOrg,
    };

    const attendeesWithLegacyFields =
      params.evt.attendees?.map((a) => {
        const utcOffset = getUTCOffsetByTimezone(a.timeZone, params.evt.startTime);
        const nameParts =
          "firstName" in a && "lastName" in a
            ? {
                firstName: (a as { firstName?: string }).firstName ?? "",
                lastName: (a as { lastName?: string }).lastName ?? "",
              }
            : nameToFirstAndLast(a.name ?? "");
        return {
          ...a,
          utcOffset,
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
        };
      }) ?? [];

    // Destructure assignmentReason out of evt so it doesn't leak via the
    // spread — this version uses its own legacy-shaped field instead.
    const { assignmentReason: _evtAssignmentReason, ...evtWithoutAssignmentReason } = params.evt;

    const payload: V20211020BookingEventPayload = {
      ...evtWithoutAssignmentReason,
      bookingId: params.booking.id,
      startTime: params.evt.startTime,
      endTime: params.evt.endTime,
      title: params.evt.title,
      type: params.evt.type,
      hashedLink: params.evt.hashedLink ?? null,
      conferenceData: params.evt.conferenceData,
      organizer,
      attendees: attendeesWithLegacyFields,
      location: params.evt.location,
      uid: params.evt.uid,
      customInputs: params.evt.customInputs,
      responses: normalizeResponses(params.evt.responses) ?? params.evt.responses,
      userFieldsResponses: params.evt.userFieldsResponses,
      status: params.status,
      eventTitle: params.eventType?.eventTitle,
      eventDescription: params.eventType?.eventDescription ?? null,
      requiresConfirmation: params.eventType?.requiresConfirmation ?? null,
      price: params.eventType?.price ?? 0,
      currency: params.eventType?.currency ?? "usd",
      length: params.eventType?.length ?? null,
      smsReminderNumber: params.booking.smsReminderNumber || undefined,
      additionalNotes: params.evt.additionalNotes ?? "",
      description: params.evt.description ?? params.evt.additionalNotes ?? "",
      assignmentReason: params.booking.assignmentReason ?? null,
      destinationCalendar: params.evt.destinationCalendar ?? null,
      ...(params.extra || {}),
    };

    return {
      triggerEvent: params.triggerEvent,
      createdAt: params.createdAt,
      payload: payload as WebhookPayload["payload"],
    };
  }

  /**
   * Build the no-show updated payload for v2021-10-20.
   */
  private buildNoShowPayload(dto: BookingWebhookEventDTO): WebhookPayload {
    if (dto.triggerEvent !== WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED) {
      throw new Error("Invalid trigger event for no-show payload");
    }
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: {
        bookingUid: dto.bookingUid,
        bookingId: dto.bookingId,
        attendees: dto.attendees,
        message: dto.message,
      },
    };
  }
}
