import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { appKeysSchema } from "../zod";

export const getLyraAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("lyra");
  return appKeysSchema.parse(appKeys);
};
