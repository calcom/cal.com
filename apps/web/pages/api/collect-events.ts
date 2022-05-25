import { nextEventsCollectApi } from "next-collect/server";

import { extendEventData, nextCollectBasicSettings } from "@lib/telemetry";

export default nextEventsCollectApi({
  ...nextCollectBasicSettings,
  extend: extendEventData,
});
