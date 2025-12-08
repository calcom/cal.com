/**
 * Webhook Payload Builders for Version 2021-10-20
 *
 * This is the initial webhook version. All builders extend base classes
 * and use default implementations.
 *
 * When creating a new version:
 * 1. Create a new directory: versioned/v{NEW_VERSION}/
 * 2. Extend base builders and override methods that need changes
 * 3. Register the new version in registry.ts
 */

export { BookingPayloadBuilder } from "./BookingPayloadBuilder";
export { FormPayloadBuilder } from "./FormPayloadBuilder";
export { MeetingPayloadBuilder } from "./MeetingPayloadBuilder";
export { RecordingPayloadBuilder } from "./RecordingPayloadBuilder";
export { OOOPayloadBuilder } from "./OOOPayloadBuilder";
export { InstantMeetingBuilder } from "./InstantMeetingBuilder";
