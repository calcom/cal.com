import type { EventPayloadType } from "../../../dto/types";

/**
 * v2021-10-20 booking event payload.
 *
 * Overrides CalendarEvent's `assignmentReason` (which uses the transformed
 * `{ category, details }` shape) with the legacy webhook format: a raw array
 * of `[{ reasonEnum, reasonString }]` from the DB, or null.
 *
 * This keeps the webhook contract stable for v2021-10-20 subscribers.
 */
export type V20211020BookingEventPayload = Omit<EventPayloadType, "assignmentReason"> & {
  assignmentReason?: { reasonEnum: string; reasonString: string }[] | null;
};
