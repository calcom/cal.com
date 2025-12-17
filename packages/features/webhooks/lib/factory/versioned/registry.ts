import { DEFAULT_WEBHOOK_VERSION } from "../../interface/IWebhookRepository";
import { PayloadBuilderFactory } from "./PayloadBuilderFactory";
import * as V2021_10_20 from "./v2021-10-20";

// Re-export for consumers
export { DEFAULT_WEBHOOK_VERSION } from "../../interface/IWebhookRepository";

/**
 * Create and initialize a PayloadBuilderFactory with all registered versions.
 *
 * This is the central registry (composition root) for all webhook versions.
 * The factory is fully configured here - consumers just use it.
 *
 * @returns Fully configured PayloadBuilderFactory instance
 *
 * @example Adding a new webhook version
 * 1. Create directory: versioned/v2024-12-01/
 * 2. Implement builders in that directory
 * 3. Import and register here:
 * ```ts
 *
 * import * as V2024_12_01 from "./v2024-12-01";
 *
 * factory.registerVersion(WebhookVersion.V_2024_12_01, {
 *   booking: new V2024_12_01.BookingPayloadBuilder(),
 *   form: new V2024_12_01.FormPayloadBuilder(),
 *   ooo: new V2024_12_01.OOOPayloadBuilder(),
 *   recording: new V2024_12_01.RecordingPayloadBuilder(),
 *   meeting: new V2024_12_01.MeetingPayloadBuilder(),
 *   instantMeeting: new V2024_12_01.InstantMeetingBuilder(),
 *   delegation: new V2024_12_01.DelegationPayloadBuilder(),
 * });
 * ```
 */
export function createPayloadBuilderFactory(): PayloadBuilderFactory {
  const defaultBuilders = {
    booking: new V2021_10_20.BookingPayloadBuilder(),
    form: new V2021_10_20.FormPayloadBuilder(),
    ooo: new V2021_10_20.OOOPayloadBuilder(),
    recording: new V2021_10_20.RecordingPayloadBuilder(),
    meeting: new V2021_10_20.MeetingPayloadBuilder(),
    instantMeeting: new V2021_10_20.InstantMeetingBuilder(),
    delegation: new V2021_10_20.DelegationPayloadBuilder(),
  };

  const factory = new PayloadBuilderFactory(DEFAULT_WEBHOOK_VERSION, defaultBuilders);

  return factory;
}
