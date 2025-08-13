import type { NextApiRequest } from "next";

import { sendEmailVerificationByCode } from "@calcom/features/auth/lib/verifyEmail";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";

import type { TRPCContext } from "../../../createContext";
import type { TSendVerifyEmailCodeSchema } from "./sendVerifyEmailCode.schema";
import { hashEmail, piiHasher } from "@calcom/lib/server/PiiHasher";

type SendVerifyEmailCode = {
  input: TSendVerifyEmailCodeSchema;
  req: TRPCContext["req"] | undefined;
};

export const sendVerifyEmailCodeHandler = async ({ input, req }: SendVerifyEmailCode) => {
  const identifier = req ? piiHasher.hash(getIP(req as NextApiRequest)) : hashEmail(input.email);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `emailVerifyByCode.${identifier}`,
  });

  const email = await sendEmailVerificationByCode({
    email: input.email,
    username: input.username,
    language: input.language,
    isVerifyingEmail: input.isVerifyingEmail,
  });

  return email;
};
