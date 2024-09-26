import { z } from "zod";

/**
 * We should be able to work with just the access token.
 * access_token allows us to access the resources
 */
export const OAuth2BareMinimumUniversalSchema = z
  .object({
    access_token: z.string(),
    /**
     * It is usually 'Bearer'
     */
    token_type: z.string().optional(),
  })
  // We want any other property to be passed through and stay there.
  .passthrough();

export const OAuth2UniversalSchema = OAuth2BareMinimumUniversalSchema.extend({
  /**
   * If we aren't sent refresh_token, it means that the party syncing us the credentials don't want us to ever refresh the token.
   * They would be responsible to send us the access_token before it expires.
   */
  refresh_token: z.string().optional(),

  /**
   * It is only needed when connecting to the API for the first time. So, it is okay if the party syncing us the credentials don't send it as then it is responsible to provide us the access_token already
   */
  scope: z.string().optional(),

  /**
   * Absolute expiration time in milliseconds
   */
  expiry_date: z.number().optional(),
});

export const OAuth2UniversalSchemaWithCalcomBackwardCompatibility = OAuth2UniversalSchema.extend({
  /**
   * Time in seconds until the token expires
   * Either this or expiry_date should be provided
   */
  expires_in: z.number().optional(),
});

export const OAuth2TokenResponseInDbWhenExistsSchema = OAuth2UniversalSchemaWithCalcomBackwardCompatibility;
export const OAuth2TokenResponseInDbSchema = OAuth2UniversalSchemaWithCalcomBackwardCompatibility.nullable();
