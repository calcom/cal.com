import { z } from "zod";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";

const officeAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const getOfficeAppKeys = async () => {
  return getParsedAppKeysFromSlug("office365-calendar", officeAppKeysSchema);
};
