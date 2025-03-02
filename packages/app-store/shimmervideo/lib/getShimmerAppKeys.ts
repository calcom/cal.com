import { z } from "zod";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../metadata.generated";

const shimmerAppKeysSchema = z.object({
  api_key: z.string(),
  api_route: z.string(),
});

export const getShimmerAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug(metadata.slug);
  return shimmerAppKeysSchema.parse(appKeys);
};
