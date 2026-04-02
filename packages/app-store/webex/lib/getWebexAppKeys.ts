import { z } from "zod";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const webexAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const getWebexAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("webex");
  return webexAppKeysSchema.parse(appKeys);
};
