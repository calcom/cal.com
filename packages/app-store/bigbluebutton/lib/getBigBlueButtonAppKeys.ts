import { z } from "zod";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const bigBlueButtonAppKeysSchema = z.object({
  bbb_url: z.string().url(),
  bbb_secret: z.string().min(1),
});

export const getBigBlueButtonAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("bigbluebutton");
  return bigBlueButtonAppKeysSchema.parse(appKeys);
};
