import { collectEvents } from "next-collect/server";

import { extendEventData, nextCollectBasicSettings } from "@lib/telemetry";

export default collectEvents({
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
