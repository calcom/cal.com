import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { appKeysSchema } from "../zod";

export const getCalAiAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("cal-ai");
  return appKeysSchema.parse(appKeys);
};
