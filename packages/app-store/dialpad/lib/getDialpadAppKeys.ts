import { z } from "zod";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import config from "../config.json";

const dialpadAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const getDialpadAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug(config.slug);
  return dialpadAppKeysSchema.parse(appKeys);
};
