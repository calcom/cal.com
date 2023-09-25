import { sendEmailVerificationByCode } from "@calcom/features/auth/lib/verifyEmail";

import type { TSendVerifyEmailCodeSchema } from "./sendVerifyEmailCode.schema";

type SendVerifyEmailCode = {
  input: TSendVerifyEmailCodeSchema;
};

export const sendVerifyEmailCodeHandler = async ({ input }: SendVerifyEmailCode) => {
  const email = await sendEmailVerificationByCode({
    email: input.email,
    username: input.username,
    language: input.language,
  });

  return email;
};
