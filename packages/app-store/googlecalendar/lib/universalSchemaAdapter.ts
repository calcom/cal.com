import type { OAuth2BareMinimumUniversalSchema } from "_auth/universalSchema";
import type { z } from "zod";

export const adapt = async (tokenResponse: z.infer<typeof OAuth2BareMinimumUniversalSchema>) => {
  return {
    ...tokenResponse,
    ...(tokenResponse.expiry_date === undefined && typeof tokenResponse.expires_in === "number"
      ? {
          expiry_date: Math.round(Date.now() + tokenResponse.expires_in * 1000),
        }
      : null),
  };
};
