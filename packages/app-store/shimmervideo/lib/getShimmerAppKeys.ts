import { z } from "zod";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import config from "../config.json";

const shimmerAppKeysSchema = z.object({
  api_key: z.string(),
  api_route: z.string(),
});

export const getShimmerAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug(config.slug);
  return shimmerAppKeysSchema.parse(appKeys);
};
