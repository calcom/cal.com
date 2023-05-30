import { z } from "zod";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

export const getBasecampKeys = async () => {
  const appKeys = await getAppKeysFromSlug("basecamp3");
  console.log("base camp app keys", appKeys);
  return appKeysSchema.parse(appKeys);
};

const appKeysSchema = z.object({ client_id: z.string().min(1), client_secret: z.string().min(1) });
