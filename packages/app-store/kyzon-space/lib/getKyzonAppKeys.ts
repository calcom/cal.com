import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import config from "../config.json";
import { appKeysSchema as kyzonSpaceAppKeysSchema } from "../zod";

export const getKyzonAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug(config.slug);
  return kyzonSpaceAppKeysSchema.parse(appKeys);
};
