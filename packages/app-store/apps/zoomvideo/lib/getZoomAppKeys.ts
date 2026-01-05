import { z } from "zod";

import getAppKeysFromSlug from "@calcom/app-store/src/_utils/getAppKeysFromSlug";

const zoomAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const getZoomAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("zoom");
  return zoomAppKeysSchema.parse(appKeys);
};
