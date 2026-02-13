import { z } from "zod";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const lyraAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const getLyraAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("lyra");
  return lyraAppKeysSchema.parse(appKeys);
};
