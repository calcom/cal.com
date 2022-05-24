import { collectEvents } from "next-collect/server";

import { extendEventData, nextCollectBasicSettings } from "@lib/nextCollect";

export default collectEvents({
  ...nextCollectBasicSettings,
  extend: extendEventData,
});
