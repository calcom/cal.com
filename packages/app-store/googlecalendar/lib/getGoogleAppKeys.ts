import { z } from "zod";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";

const googleAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  redirect_uris: z.array(z.string()),
});

export const getGoogleAppKeys = async () => {
  try {
    return await getParsedAppKeysFromSlug(
      "google-calendar",
      googleAppKeysSchema
    );
  } catch (error) {
    const envCredentials = process.env.GOOGLE_API_CREDENTIALS;

    if (!envCredentials) {
      throw error;
    }

    const parsed = JSON.parse(envCredentials);
    return googleAppKeysSchema.parse(parsed);
  }
};
