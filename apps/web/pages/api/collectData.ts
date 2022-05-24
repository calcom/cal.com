import { nextEventsCollectApi } from "next-collect/server";

import { extendEventData, nextCollectBasicSettings } from "@lib/nextCollect";

export default nextEventsCollectApi({
  ...nextCollectBasicSettings,
  extend: extendEventData,
});
