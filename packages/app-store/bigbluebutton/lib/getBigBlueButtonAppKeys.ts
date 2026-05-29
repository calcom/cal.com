import { z } from "zod";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const bigbluebuttonAppKeysSchema = z.object({
  bbbUrl: z.string().min(1),
  bbbSecret: z.string().min(1),
});

export const getBigBlueButtonAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("bigbluebutton");
  return bigbluebuttonAppKeysSchema.parse(appKeys);
};
