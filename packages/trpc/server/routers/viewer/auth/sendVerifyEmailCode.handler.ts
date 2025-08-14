import type { NextApiRequest } from "next";

import { sendEmailVerificationByCode } from "@calcom/features/auth/lib/verifyEmail";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { hashEmail, piiHasher } from "@calcom/lib/server/PiiHasher";

import type { TRPCContext } from "../../../createContext";
import type { TSendVerifyEmailCodeSchema } from "./sendVerifyEmailCode.schema";

type SendVerifyEmailCode = {
  input: TSendVerifyEmailCodeSchema;
  req: TRPCContext["req"] | undefined;
};

export type SendVerifyEmailCodeInput = TSendVerifyEmailCodeSchema & {
  identifier?: string;
};

export const sendVerifyEmailCode = async (input: SendVerifyEmailCodeInput) => {
  const identifier = input.identifier || hashEmail(input.email);

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

export const sendVerifyEmailCodeHandler = async ({ input, req }: SendVerifyEmailCode) => {
  const identifier = req ? piiHasher.hash(getIP(req as NextApiRequest)) : hashEmail(input.email);

  return sendVerifyEmailCode({
    ...input,
    identifier,
  });
};
