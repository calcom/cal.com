import { WebhookVersion } from "@calcom/prisma/enums";

import { PayloadBuilderFactory } from "./PayloadBuilderFactory";
import * as V2021_10_20 from "./v2021-10-20";

/**
 * Default/fallback version - the oldest supported version for backward compatibility.
 * This is a configuration decision owned by the registry.
 */
export const DEFAULT_WEBHOOK_VERSION = WebhookVersion.V_2021_10_20;

/**
 * Create and initialize a PayloadBuilderFactory with all registered versions.
 *
 * This is the central registry (composition root) for all webhook versions.
 * The factory is fully configured here - consumers just use it.
 *
 * @returns Fully configured PayloadBuilderFactory instance
 *
 * @example Adding a new webhook version
 * ```ts
 * // 1. Create directory: versioned/v2024-12-01/
 * // 2. Implement builders in that directory
 * // 3. Import and register here:
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
  };

  const factory = new PayloadBuilderFactory(DEFAULT_WEBHOOK_VERSION, defaultBuilders);

  return factory;
}
