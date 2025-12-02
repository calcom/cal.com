import { z } from "zod";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";

const appKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  redirect_uris: z.array(z.string()),
});

export const getWhatsAppBusinessAppKeys = async () => {
  return getParsedAppKeysFromSlug("whatsapp-business", appKeysSchema);
};
