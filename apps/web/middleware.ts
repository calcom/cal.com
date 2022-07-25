import { collectEvents } from "next-collect/server";

import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";

export default collectEvents({
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
