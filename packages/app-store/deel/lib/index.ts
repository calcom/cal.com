import z from "zod";

export const deelCredentialKeysSchema = z.object({
  deel_api_key: z.string(),
  hris_profile_id: z.string(),
});
