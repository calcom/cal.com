/**
 * Abstract base payload builder classes.
 *
 * These define the interfaces that version-specific builders must implement.
 * They do NOT contain version-specific payload logic - that belongs in
 * the versioned/ directory.
 *
 * When creating a new webhook version:
 * 1. Create a new directory: versioned/v{NEW_VERSION}/
 * 2. Create concrete builder classes that extend these base classes
 * 3. Implement the abstract build() method with version-specific payload logic
 * 4. Register the new version in registry.ts
 */

export type { BookingExtraDataMap, BookingPayloadParams } from "./BaseBookingPayloadBuilder";
export { BaseBookingPayloadBuilder } from "./BaseBookingPayloadBuilder";
export { BaseDelegationPayloadBuilder } from "./BaseDelegationPayloadBuilder";
export { BaseFormPayloadBuilder } from "./BaseFormPayloadBuilder";
export { BaseInstantMeetingBuilder } from "./BaseInstantMeetingBuilder";
export { BaseMeetingPayloadBuilder } from "./BaseMeetingPayloadBuilder";
export { BaseOOOPayloadBuilder } from "./BaseOOOPayloadBuilder";
export { BaseRecordingPayloadBuilder } from "./BaseRecordingPayloadBuilder";
