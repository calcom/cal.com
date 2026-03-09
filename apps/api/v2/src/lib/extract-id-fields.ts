import { Logger } from "@nestjs/common";

const logger = new Logger("extractIdFields");

/**
 * Matches field names that are exactly "id" or "uid" (any casing),
 * or that end with Id/Uid/ID/UID after a lowercase letter (camelCase)
 * or underscore (snake_case).
 *
 * Examples that match: id, uid, userId, eventTypeId, bookingUid, rescheduleUid,
 *                      ID, UID, EventTypeID, bookingUID, user_id, booking_uid
 * Examples that do NOT match: hidden, video, provider, valid, grid, android
 */
const ID_FIELD_PATTERN = /^(id|uid|ID|UID|Id|Uid)$|[a-z](Id|Uid|ID|UID)$|_(id|uid|Id|Uid|ID|UID)$/;

/**
 * Extracts only fields whose names represent identifiers from a plain object.
 * This is used to reduce log volume and avoid logging PII while still
 * capturing useful identifiers for debugging.
 *
 * This function is wrapped in a try/catch so it never throws — in the worst
 * case it logs the error and returns an empty object.
 */
export function extractIdFields(obj: Record<string, unknown>): Record<string, unknown> {
  try {
    if (!obj || typeof obj !== "object") {
      return {};
    }

    const result: Record<string, unknown> = {};

    for (const key of Object.keys(obj)) {
      if (ID_FIELD_PATTERN.test(key)) {
        result[key] = obj[key];
      }
    }

    return result;
  } catch (error) {
    logger.error("Failed to extract id fields from object", { error });
    return {};
  }
}
