import { z } from "zod";
import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";

const googleAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  redirect_uris: z.array(z.string()),
});

export const getGoogleAppKeys = async () => {
  return getParsedAppKeysFromSlug("google-calendar", googleAppKeysSchema);
};
