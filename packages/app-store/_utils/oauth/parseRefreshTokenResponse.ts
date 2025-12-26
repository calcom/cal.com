import { z } from "zod";

import { APP_CREDENTIAL_SHARING_ENABLED } from "@calcom/lib/constants";

export const minimumTokenResponseSchema = z
  .object({
    access_token: z.string(),
  })
  .passthrough()
  .superRefine((tokenObject, ctx) => {
    if (!Object.values(tokenObject).some((value) => typeof value === "number")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Missing a field that defines a token expiry date. Check the specific app package to see how token expiry is defined.",
      });
    }
  });

export type ParseRefreshTokenResponse<S extends z.ZodTypeAny> =
  | z.infer<S>
  | z.infer<typeof minimumTokenResponseSchema>;

const parseRefreshTokenResponse = <S extends z.ZodTypeAny>(
  response: unknown,
  schema: S
): ParseRefreshTokenResponse<S> => {
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

  // In zod v4, safeParse with ZodTypeAny returns data as unknown, so we cast to the expected type
  const data = refreshTokenResponse.data as ParseRefreshTokenResponse<S>;
  if (!(data as Record<string, unknown>).refresh_token && credentialSyncingEnabled) {
    (data as Record<string, unknown>).refresh_token = "refresh_token";
  }

  return data;
};

export default parseRefreshTokenResponse;
