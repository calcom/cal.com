/**
 * Webhook Payload Builders for Version 2021-10-20
 *
 * This is the initial webhook version. All current payload builders
 * are aliased here for version 2021-10-20.
 *
 * When creating a new version:
 * 1. Copy this directory structure
 * 2. Modify the builders to match the new version's payload structure
 * 3. Register the new version in PayloadBuilderFactory
 */

// Re-export current builders as v2021-10-20 implementation
export { BookingPayloadBuilder } from "../../BookingPayloadBuilder";
export { FormPayloadBuilder } from "../../FormPayloadBuilder";
export { OOOPayloadBuilder } from "../../OOOPayloadBuilder";
export { RecordingPayloadBuilder } from "../../RecordingPayloadBuilder";
export { MeetingPayloadBuilder } from "../../MeetingPayloadBuilder";
export { InstantMeetingBuilder } from "../../InstantMeetingBuilder";
