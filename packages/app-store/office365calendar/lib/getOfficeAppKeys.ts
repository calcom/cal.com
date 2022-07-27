import getParsedAppKeysFromSlug from "_utils/getParsedAppKeysFromSlug";
import { z } from "zod";

const officeAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const getOfficeAppKeys = async () => {
  return getParsedAppKeysFromSlug("office365-calendar", officeAppKeysSchema);
};
