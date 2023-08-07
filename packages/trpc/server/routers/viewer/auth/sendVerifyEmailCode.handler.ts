import { sendEmailVerificationByCode } from "@calcom/features/auth/lib/verifyEmail";
import logger from "@calcom/lib/logger";

import type { TSendVerifyEmailCodeSchema } from "./sendVerifyEmailCode.schema";

type SendVerifyEmailCode = {
  input: TSendVerifyEmailCodeSchema;
};

const log = logger.getChildLogger({ prefix: [`[[Auth] `] });

export const sendVerifyEmailCodeHandler = async ({ input }: SendVerifyEmailCode) => {
  const email = await sendEmailVerificationByCode({
    email: input.email,
    username: input.username,
    language: input.language,
  });

  return email;
};
