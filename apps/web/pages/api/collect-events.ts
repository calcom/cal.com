import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";
import { collectApiHandler } from "next-collect/server";

export default collectApiHandler({
  ...nextCollectBasicSettings,
  cookieName: "__clnds",
  extend: extendEventData,
});
