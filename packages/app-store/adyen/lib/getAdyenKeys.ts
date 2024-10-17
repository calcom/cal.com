import { z } from "zod";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

export const getAdyenKeys = async () => {
  const appKeys = await getAppKeysFromSlug("adyen");
  return appKeysSchema.parse(appKeys);
};

const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});
