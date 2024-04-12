import { z } from "zod";

export const OAuth2UniversalSchema = z.object({
  scope: z.string(),
  expiry_date: z.number(),
  //   token_type: z.literal("Bearer"),
  token_type: z.string(),
  access_token: z.string(),
  refresh_token: z.string(),
  /**
   * Deprecated, there for backward compatibility
   */
  expires_in: z.number().optional(),
});

export const OAuth2UniversalSchemaWithCalcomBackwardCompatibility = OAuth2UniversalSchema.extend({
  /**
   * Deprecated, there for backward compatibility
   */
  expires_in: z.number().optional(),
});
