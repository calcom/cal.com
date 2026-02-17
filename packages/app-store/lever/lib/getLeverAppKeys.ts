import { z } from "zod";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const leverAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const getLeverAppKey = async () => {
  const appKeys = await getAppKeysFromSlug("lever");
  return leverAppKeysSchema.parse(appKeys);
};
