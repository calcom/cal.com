/**
 * Base payload builder classes.
 *
 * These provide shared logic that version-specific builders can extend.
 * 
 * When creating a new webhook version:
 * 1. Create a new directory: versioned/v{NEW_VERSION}/
 * 2. Extend base builders and override methods that need changes
 * 3. Register the new version in registry.tsregistry.ts
 */
export { BaseBookingPayloadBuilder } from "./BaseBookingPayloadBuilder";
export { BaseFormPayloadBuilder } from "./BaseFormPayloadBuilder";
export { BaseMeetingPayloadBuilder } from "./BaseMeetingPayloadBuilder";
export { BaseRecordingPayloadBuilder } from "./BaseRecordingPayloadBuilder";
export { BaseOOOPayloadBuilder } from "./BaseOOOPayloadBuilder";
export { BaseInstantMeetingBuilder } from "./BaseInstantMeetingBuilder";

export type { BookingExtraDataMap, BookingPayloadParams } from "./BaseBookingPayloadBuilder";
