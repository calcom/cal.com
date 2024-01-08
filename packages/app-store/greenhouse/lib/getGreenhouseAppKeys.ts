import { z } from "zod";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";

const greenhouseAppKeysSchema = z.object({
  api_key: z.string(),
  user_id: z.string(),
});

export const getGreenhouseAppKeys = async () => {
  return getParsedAppKeysFromSlug("greenhouse", greenhouseAppKeysSchema);
};
