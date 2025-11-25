import { WebhookVersion } from "@calcom/prisma/enums";

import { PayloadBuilderFactory } from "./PayloadBuilderFactory";
import * as V2021_10_20 from "./v2021-10-20";

/**
 * Create and initialize a PayloadBuilderFactory with all registered versions
 *
 * This is the central registry for all webhook versions.
 * When adding a new version, import its builders and register them here.
 */
export function createPayloadBuilderFactory(): PayloadBuilderFactory {
  const factory = new PayloadBuilderFactory();

  // Register version 2021-10-20 (initial version)
  factory.registerVersion(WebhookVersion.V_2021_10_20, {
    booking: new V2021_10_20.BookingPayloadBuilder(),
    form: new V2021_10_20.FormPayloadBuilder(),
    ooo: new V2021_10_20.OOOPayloadBuilder(),
    recording: new V2021_10_20.RecordingPayloadBuilder(),
    meeting: new V2021_10_20.MeetingPayloadBuilder(),
    instantMeeting: new V2021_10_20.InstantMeetingBuilder(),
  });

  // Future versions will be registered here:
  // factory.registerVersion(WebhookVersion.V_2024_12_01, {
  //   booking: new V2024_12_01.BookingPayloadBuilder(),
  //   form: new V2024_12_01.FormPayloadBuilder(),
  //   // ...
  // });

  return factory;
}
