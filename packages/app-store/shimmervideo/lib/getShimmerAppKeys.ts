import { z } from "zod";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const shimmerAppKeysSchema = z.object({
  api_key: z.string(),
  api_route: z.string(),
});

export const getShimmerAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("shimmer-video");
  console.log("🚀 ~ file: getShimmerAppKeys.ts:12 ~ getShimmerAppKeys ~ appKeys:", appKeys);
  return shimmerAppKeysSchema.parse(appKeys);
};
