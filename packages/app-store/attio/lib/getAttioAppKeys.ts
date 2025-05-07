import { z } from "zod";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";

const attioAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const getAttioAppKeys = async () => {
  return getParsedAppKeysFromSlug("attio", attioAppKeysSchema);
};
