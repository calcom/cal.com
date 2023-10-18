import { z } from "zod";

import { APP_CREDENTIAL_SHARING_ENABLED } from "@calcom/lib/constants";

const minimumTokenResponseSchema = z.object({
  access_token: z.string(),
  //   Assume that any property with a number is the expiry
  [z.string().toString()]: z.number(),
  //   Allow other properties in the token response
  [z.string().optional().toString()]: z.unknown().optional(),
});

export type ParseRefreshTokenResponse<S extends z.ZodTypeAny> =
  | z.infer<S>
  | z.infer<typeof minimumTokenResponseSchema>;

const parseRefreshTokenResponse = (response: any, schema: z.ZodTypeAny) => {
  let refreshTokenResponse;
  const credentialSyncingEnabled =
    APP_CREDENTIAL_SHARING_ENABLED && process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT;
  if (APP_CREDENTIAL_SHARING_ENABLED && process.env.CALCOM_CREDENTIAL_SYNC_ENDPOINT) {
    refreshTokenResponse = minimumTokenResponseSchema.safeParse(response);
  } else {
    refreshTokenResponse = schema.safeParse(response);
  }

  if (!refreshTokenResponse.success) {
    throw new Error("Invalid refreshed tokens were returned");
  }

  if (!refreshTokenResponse.data.refresh_token && credentialSyncingEnabled) {
    refreshTokenResponse.data.refresh_token = "refresh_token";
  }

  return refreshTokenResponse.data;
};

export default parseRefreshTokenResponse;
