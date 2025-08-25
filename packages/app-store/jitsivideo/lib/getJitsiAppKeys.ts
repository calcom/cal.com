import { z } from "zod";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

export const appKeysSchema = z.object({
  jitsiHost: z.string().optional(),
  jitsiPathPattern: z.string().optional(),
});

export const getJitsiAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("jitsi");
  return appKeysSchema.parse(appKeys);
};
