import { collectApiHandler } from "next-collect/server";

import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";

export default collectApiHandler({
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
