/**
 * Base payload builder classes.
 *
 * These provide shared logic that version-specific builders can extend.
 * When creating a new webhook version:
 * 1. Extend the base class
 * 2. Override only the methods that need version-specific behavior
 * 3. Register in registry.ts
 */
export { BaseBookingPayloadBuilder } from "./BaseBookingPayloadBuilder";
export { BaseFormPayloadBuilder } from "./BaseFormPayloadBuilder";
export { BaseMeetingPayloadBuilder } from "./BaseMeetingPayloadBuilder";
export { BaseRecordingPayloadBuilder } from "./BaseRecordingPayloadBuilder";
export { BaseOOOPayloadBuilder } from "./BaseOOOPayloadBuilder";
export { BaseInstantMeetingBuilder } from "./BaseInstantMeetingBuilder";

export type { BookingExtraDataMap, BookingPayloadParams } from "./BaseBookingPayloadBuilder";
