import { nextEventsCollectApi } from "next-collect/server";

import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";

export default nextEventsCollectApi({
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
