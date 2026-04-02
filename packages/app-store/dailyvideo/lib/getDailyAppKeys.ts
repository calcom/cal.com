import { z } from "zod";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const dailyAppKeysSchema = z.object({
  api_key: z.string(),
  scale_plan: z.string().default("false"),
});

export const getDailyAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("daily-video");
  return dailyAppKeysSchema.parse(appKeys);
};
